// Harness de balance: juega temporadas completas (fase regular) con la lógica
// real del juego y reporta victorias por táctica, remontadas, lesiones,
// ausencias y economía. Es una herramienta de desarrollo: no forma parte del
// juego que ve el jugador.
//
// Uso:  npm run sim          (80 temporadas por estrategia)
//       npm run sim -- 30    (menos corridas, más rápido)
//
// Compila src/game + src/data a CommonJS en scripts/.sim-out (git-ignorado)
// y corre la simulación sobre ese código. Cambiaste balance.ts → npm run sim.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, '.sim-out');

// --- Compilar la lógica del juego (siempre: tarda ~2s y evita usar código viejo) ---
const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const tsc = spawnSync(process.execPath, [tscBin, '-p', path.join(__dirname, 'tsconfig.sim.json')], {
  stdio: 'inherit',
});
if (tsc.status !== 0) {
  console.error('La compilación de src/game falló: arreglá los errores de TypeScript primero.');
  process.exit(1);
}
// El package.json raíz declara "type": "module"; este marcador devuelve
// la carpeta compilada a CommonJS para poder usar require().
fs.writeFileSync(path.join(OUT, 'package.json'), '{"type":"commonjs"}\n');

const { createNewGame, confirmActions, advanceWeek } = require(path.join(OUT, 'game', 'week.js'));
const {
  startLiveMatch,
  playQuarter,
  finishLiveMatch,
  applyLineupPreset,
  suggestStarters,
  suggestRotation,
  matchAbsentIds,
} = require(path.join(OUT, 'game', 'match.js'));
const { fragilityOf } = require(path.join(OUT, 'game', 'injuries.js'));
const { Rng } = require(path.join(OUT, 'game', 'rng.js'));

// Estrategias de referencia: si alguna domina por paliza, el balance cojea.
const STRATEGIES = {
  // Presión a toda cancha rotando piernas frescas (la ex-dominante).
  presionRotate: {
    tactics: () => ({ defense: 'presion', attack: 'equipo' }),
    rotate: 'frescos',
  },
  // Conservadora: zona y ataque de equipo, sin tocar el banco.
  zonaEquipo: {
    tactics: () => ({ defense: 'zona', attack: 'equipo' }),
    rotate: null,
  },
  // Mixta: hombre temprano, zona al final, cerradores en el último cuarto.
  mixta: {
    tactics: (s) => ({ defense: s.live.quarters.length < 2 ? 'hombre' : 'zona', attack: 'equipo' }),
    rotate: 'cerradores4',
  },
};

function playSeason(seed, strategy) {
  let s = createNewGame(seed);
  const st = {
    wins: 0,
    losses: 0,
    forfeits: 0,
    injuries: 0,
    comebacksFor: 0,
    comebacksAgainst: 0,
    trailOpps: 0,
    leadOpps: 0,
    absencesByPlayer: {},
    absenceCounts: [],
    moneyEnd: 0,
    gameOver: false,
  };

  while (s.phase !== 'gameOver' && s.week <= s.seasonLength) {
    // Sin acciones ni eventos: se mide el piso, sin gestión del manager.
    s = { ...s, pendingEvent: null, actionsChosen: [] };
    s = confirmActions(s);

    const outs = s.callUp.filter((c) => c.status !== 'confirmado');
    st.absenceCounts.push(outs.length);
    for (const c of outs) st.absencesByPlayer[c.playerName] = (st.absencesByPlayer[c.playerName] || 0) + 1;

    const absent = matchAbsentIds(s);
    const starters = suggestStarters(s.players, absent);
    s = { ...s, phase: 'lineup', starters, rotation: suggestRotation(s.players, starters, absent) };

    let rng = new Rng(s.seed);
    s = startLiveMatch({ ...s, seed: rng.nextSeed() }, rng);

    if (s.phase === 'match') {
      let trailedBy9 = false;
      let ledBy9 = false;
      while (s.live && !s.live.finished) {
        const q = s.live.quarters.length;
        const diff =
          s.live.quarters.reduce((t, x) => t + x.for, 0) - s.live.quarters.reduce((t, x) => t + x.against, 0);
        if (q > 0 && diff <= -9) trailedBy9 = true;
        if (q > 0 && diff >= 9) ledBy9 = true;
        s = { ...s, live: { ...s.live, ...STRATEGIES[strategy].tactics(s), pendingIncident: null } };
        const rot = STRATEGIES[strategy].rotate;
        if (rot === 'frescos' && q > 0) s = applyLineupPreset(s, 'frescos');
        if (rot === 'cerradores4' && q === 3) s = applyLineupPreset(s, 'cerradores');
        rng = new Rng(s.seed);
        s = playQuarter({ ...s, seed: rng.nextSeed() }, rng);
      }
      st.injuries += (s.live.injuries || []).length;
      rng = new Rng(s.seed);
      s = finishLiveMatch({ ...s, seed: rng.nextSeed() }, rng);
      const m = s.lastMatch;
      if (m) {
        if (trailedBy9) st.trailOpps += 1;
        if (ledBy9) st.leadOpps += 1;
        if (m.won && trailedBy9) st.comebacksFor += 1;
        if (!m.won && ledBy9) st.comebacksAgainst += 1;
      }
    }

    const m = s.lastMatch;
    if (m) {
      if (m.forfeit) st.forfeits += 1;
      if (m.won) st.wins += 1;
      else st.losses += 1;
    }
    s = advanceWeek(s);
  }

  st.moneyEnd = s.club.money;
  st.gameOver = s.phase === 'gameOver';
  return st;
}

const RUNS = Math.max(5, parseInt(process.argv[2], 10) || 80);
console.log(`Simulando ${RUNS} temporadas por estrategia (fase regular, sin acciones del manager)…`);

for (const strat of Object.keys(STRATEGIES)) {
  const a = {
    wins: 0,
    games: 0,
    injuries: 0,
    comebacksFor: 0,
    comebacksAgainst: 0,
    trailOpps: 0,
    leadOpps: 0,
    forfeits: 0,
    money: [],
    gameOvers: 0,
    absCounts: {},
    absByPlayer: {},
    seasons: 0,
  };
  for (let i = 0; i < RUNS; i++) {
    const st = playSeason(1000 + i * 7919, strat);
    a.seasons += 1;
    a.wins += st.wins;
    a.games += st.wins + st.losses;
    a.injuries += st.injuries;
    a.comebacksFor += st.comebacksFor;
    a.comebacksAgainst += st.comebacksAgainst;
    a.trailOpps += st.trailOpps;
    a.leadOpps += st.leadOpps;
    a.forfeits += st.forfeits;
    a.money.push(st.moneyEnd);
    if (st.gameOver) a.gameOvers += 1;
    for (const n of st.absenceCounts) a.absCounts[n] = (a.absCounts[n] || 0) + 1;
    for (const [name, c] of Object.entries(st.absencesByPlayer)) a.absByPlayer[name] = (a.absByPlayer[name] || 0) + c;
  }

  const winPct = ((a.wins / a.games) * 100).toFixed(1);
  const avgMoney = Math.round(a.money.reduce((x, y) => x + y, 0) / a.money.length);
  console.log(`\n=== ${strat} (${a.seasons} temporadas, ${a.games} partidos) ===`);
  console.log(
    `Victorias: ${winPct}%  ·  Remontadas propias: ${a.comebacksFor}/${a.trailOpps} veces abajo por 9+  ·  Nos remontaron: ${a.comebacksAgainst}/${a.leadOpps} veces arriba por 9+`
  );
  console.log(
    `Lesiones en partido/temporada: ${(a.injuries / a.seasons).toFixed(2)}  ·  Forfeits: ${a.forfeits}  ·  GameOvers (caja): ${a.gameOvers}`
  );
  console.log(`Caja final promedio: $${avgMoney} (arranca en $250, sin recaudar nada)`);
  console.log(`Ausencias por semana:`, JSON.stringify(a.absCounts));
  const top = Object.entries(a.absByPlayer)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 5);
  console.log(`Top faltadores:`, top.map(([n, c]) => `${n}: ${(c / a.seasons).toFixed(1)}/temp`).join('  ·  '));
}

// Fragilidad del plantel inicial: sirve para calibrar la pista de la ficha.
const s0 = createNewGame(42);
console.log('\n=== Fragilidad del plantel inicial ===');
for (const p of s0.players) console.log(`${p.name} (${p.age}): ${fragilityOf(p)}`);
