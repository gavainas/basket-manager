// Diagnóstico de compresión del marcador: mide victorias y margen final contra
// rivales de distinta fuerza, con el motor real. Herramienta de desarrollo.
//
// Uso:  npm run sim:margenes        (400 partidos por fila)
//       npm run sim:margenes -- 100 (más rápido)
//
// Para qué existe: el objetivo de diseño es que un rival muy superior gane por
// ~20. Hoy no pasa (ver design/MOTOR_PARTIDO.md). Este script es la vara para
// medirlo cuando se toque el balance del partido o llegue el motor nuevo.

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

const { createNewGame, confirmActions } = require(path.join(OUT, 'game', 'week.js'));
const {
  startLiveMatch,
  playQuarter,
  suggestStarters,
  suggestRotation,
  matchAbsentIds,
  evaluateTeam,
} = require(path.join(OUT, 'game', 'match.js'));
const { Rng } = require(path.join(OUT, 'game', 'rng.js'));

/** Un partido contra un rival de fuerza forzada, con zona + ataque de equipo. */
function oneMatch(seed, rivalStrength) {
  let s = createNewGame(seed);
  s = confirmActions({ ...s, pendingEvent: null, actionsChosen: [] });
  const absent = matchAbsentIds(s);
  const starters = suggestStarters(s.players, absent);
  s = { ...s, phase: 'lineup', starters, rotation: suggestRotation(s.players, starters, absent) };

  const rivalId = s.schedule[s.week - 1];
  s = { ...s, rivals: s.rivals.map((r) => (r.id === rivalId ? { ...r, strength: rivalStrength } : r)) };
  const myEval = evaluateTeam(s, s.starters);

  let rng = new Rng(s.seed);
  s = startLiveMatch({ ...s, seed: rng.nextSeed() }, rng);
  if (s.phase !== 'match') return null; // forfeit: no cuenta

  while (s.live && !s.live.finished) {
    s = { ...s, live: { ...s.live, defense: 'zona', attack: 'equipo', pendingIncident: null } };
    rng = new Rng(s.seed);
    s = playQuarter({ ...s, seed: rng.nextSeed() }, rng);
  }
  const f = s.live.quarters.reduce((t, q) => t + q.for, 0);
  const a = s.live.quarters.reduce((t, q) => t + q.against, 0);
  return { for: f, against: a, myStrength: myEval.strength };
}

const N = Math.max(20, parseInt(process.argv[2], 10) || 400);
const STRENGTHS = [45, 55, 65, 75, 85, 95];
console.log(`Midiendo ${N} partidos por fuerza rival (zona + ataque de equipo, sin gestión del manager)…\n`);
console.log('fuerza rival | % victorias | margen medio | |margen|>=15 | |margen|>=20 | peor derrota');
console.log('-------------|-------------|--------------|-------------|-------------|-------------');

const totals = [];
let myStrength = 0;
let counted = 0;

for (const rs of STRENGTHS) {
  const margins = [];
  let wins = 0;
  for (let i = 0; i < N; i++) {
    const r = oneMatch(2000 + i * 7919, rs);
    if (!r) continue;
    margins.push(r.for - r.against);
    totals.push(r.for, r.against);
    myStrength += r.myStrength;
    counted += 1;
    if (r.for > r.against) wins += 1;
  }
  if (margins.length === 0) continue;
  margins.sort((x, y) => x - y);
  const mean = margins.reduce((t, v) => t + v, 0) / margins.length;
  const pct = (f) => `${((margins.filter(f).length / margins.length) * 100).toFixed(0)}%`;
  console.log(
    `${String(rs).padStart(12)} | ${`${((wins / margins.length) * 100).toFixed(0)}%`.padStart(11)} | ` +
      `${mean.toFixed(1).padStart(12)} | ${pct((m) => Math.abs(m) >= 15).padStart(11)} | ` +
      `${pct((m) => Math.abs(m) >= 20).padStart(11)} | ${String(margins[0]).padStart(12)}`
  );
}

totals.sort((a, b) => a - b);
const mean = totals.reduce((t, v) => t + v, 0) / totals.length;
console.log(`\nNuestra fuerza media: ${(myStrength / counted).toFixed(1)}`);
console.log(
  `Puntos por equipo por partido: media ${mean.toFixed(1)} | p10 ${totals[Math.floor(totals.length * 0.1)]} | ` +
    `p90 ${totals[Math.floor(totals.length * 0.9)]} | min ${totals[0]} | max ${totals[totals.length - 1]}`
);
console.log('\nObjetivo (design/MOTOR_PARTIDO.md): sostener ~63 puntos por equipo y que fuerza 95 gane por ~20.');
