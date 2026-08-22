// Harness de notas: juega temporadas con la lógica real y reporta la
// distribución de la nota del partido (1-10) por franja de minutos.
//
// Es la vara de la recalibración de computeRating: la nota tiene que decir
// la verdad (media ~6.5 para titulares, la banda 3-6 viva, el 10 raro).
//
// Uso:  npm run sim:notas          (30 temporadas)
//       npm run sim:notas -- 10    (menos corridas, más rápido)
//
// Compila igual que sim-balance.cjs (scripts/.sim-out, git-ignorado).

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, '.sim-out');

const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const tsc = spawnSync(process.execPath, [tscBin, '-p', path.join(__dirname, 'tsconfig.sim.json')], {
  stdio: 'inherit',
});
if (tsc.status !== 0) {
  console.error('La compilación de src/game falló: arreglá los errores de TypeScript primero.');
  process.exit(1);
}
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
const { Rng } = require(path.join(OUT, 'game', 'rng.js'));

const RUNS = Math.max(3, parseInt(process.argv[2], 10) || 30);
console.log(`Simulando ${RUNS} temporadas (rotando 2da unidad en el Q2, como una partida normal)…`);

// Franjas: titulares de carga completa, rotación y cameos.
const buckets = {
  '30+ min': { hist: Array(11).fill(0), sum: 0, n: 0 },
  '15-29 min': { hist: Array(11).fill(0), sum: 0, n: 0 },
  '1-14 min': { hist: Array(11).fill(0), sum: 0, n: 0 },
};

for (let i = 0; i < RUNS; i++) {
  let s = createNewGame(2000 + i * 7919);
  while (s.phase !== 'gameOver' && s.week <= s.seasonLength) {
    s = { ...s, pendingEvent: null, actionsChosen: [] };
    s = confirmActions(s);
    const absent = matchAbsentIds(s);
    const starters = suggestStarters(s.players, absent);
    s = { ...s, phase: 'lineup', starters, rotation: suggestRotation(s.players, starters, absent) };
    let rng = new Rng(s.seed);
    s = startLiveMatch({ ...s, seed: rng.nextSeed() }, rng);
    if (s.phase === 'match') {
      while (s.live && !s.live.finished) {
        const q = s.live.quarters.length;
        s = { ...s, live: { ...s.live, pendingIncident: null } };
        if (q === 1) s = applyLineupPreset(s, 'segunda');
        if (q === 2) s = applyLineupPreset(s, 'titulares');
        rng = new Rng(s.seed);
        s = playQuarter({ ...s, seed: rng.nextSeed() }, rng);
      }
      rng = new Rng(s.seed);
      s = finishLiveMatch({ ...s, seed: rng.nextSeed() }, rng);
      for (const line of s.lastMatch?.box ?? []) {
        const b = line.minutes >= 30 ? buckets['30+ min'] : line.minutes >= 15 ? buckets['15-29 min'] : buckets['1-14 min'];
        b.hist[line.rating] += 1;
        b.sum += line.rating;
        b.n += 1;
      }
    }
    s = advanceWeek(s);
  }
}

for (const [label, b] of Object.entries(buckets)) {
  if (b.n === 0) continue;
  const mean = (b.sum / b.n).toFixed(2);
  const pct = (k) => ((100 * k) / b.n).toFixed(1);
  const low = b.hist.slice(1, 6).reduce((a, x) => a + x, 0); // notas 1-5
  const high = b.hist.slice(9).reduce((a, x) => a + x, 0); // notas 9-10
  console.log(`\n=== ${label} (${b.n} actuaciones) ===`);
  console.log(`Media: ${mean}  ·  Notas 1-5: ${pct(low)}%  ·  Notas 9-10: ${pct(high)}%`);
  console.log(
    'Histograma:',
    b.hist
      .map((v, r) => (r === 0 ? null : `${r}:${pct(v)}%`))
      .filter(Boolean)
      .join('  ')
  );
}
