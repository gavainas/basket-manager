// Harness de la pirámide: juega carreras completas (varias temporadas
// seguidas, con playoffs y pretemporada) y verifica que las ligas, las
// divisionales y los ascensos/descensos aguanten el paso del tiempo.
//
// Es una herramienta de desarrollo: no forma parte del juego que ve el
// jugador. Lo que mide:
//   - que cada divisional conserve su cantidad de equipos temporada a temporada
//   - que no se dupliquen clubes ni personas al moverse entre categorías
//   - que el club suba y baje de verdad (y cuántas veces, en promedio)
//   - que cambiar de liga deje el mundo consistente (fechas, tabla, fixture)
//
// Uso:  npm run sim:ligas            (12 carreras × 8 temporadas)
//       npm run sim:ligas -- 6 12    (6 carreras × 12 temporadas)

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
  suggestStarters,
  suggestRotation,
  matchAbsentIds,
} = require(path.join(OUT, 'game', 'match.js'));
const { startPreseason, closePreseason, startSeasonFromPreseason, inscriptionOffer } = require(
  path.join(OUT, 'game', 'preseason.js')
);
const { Rng } = require(path.join(OUT, 'game', 'rng.js'));
const { WORLD_DIVISION_IDS, DIVISION_SEEDS, DIVISIONS } = require(path.join(OUT, 'data', 'worldData.js'));

const divisionName = (id) => DIVISIONS.find((d) => d.id === id)?.name ?? id;
const leagueOf = (id) => DIVISIONS.find((d) => d.id === id)?.leagueId ?? '?';

/** Total de equipos del mundo (todas las divisionales) + el club del usuario. */
const TOTAL_TEAMS = WORLD_DIVISION_IDS.reduce((n, id) => n + DIVISION_SEEDS[id].length, 0) + 1;

const problems = [];
function check(cond, msg) {
  if (!cond) problems.push(msg);
}

/** Invariantes que tienen que valer en cualquier momento de cualquier partida. */
function auditWorld(s, label) {
  const divisions = s.worldDivisions ?? {};
  const total = Object.values(divisions).reduce((n, teams) => n + teams.length, 0) + s.rivals.length + 1;
  check(total === TOTAL_TEAMS, `${label}: el mundo tiene ${total} equipos y deberían ser ${TOTAL_TEAMS}`);

  check(!divisions[s.divisionId], `${label}: la divisional del club (${s.divisionId}) también figura en el mundo`);
  for (const id of WORLD_DIVISION_IDS) {
    if (id === s.divisionId) continue;
    check(Array.isArray(divisions[id]), `${label}: falta la divisional ${id} en el mundo`);
  }

  // Ids únicos dentro de cada divisional, nombres únicos en todo el mundo.
  const names = new Map();
  const addName = (name, where) => {
    if (names.has(name)) problems.push(`${label}: "${name}" aparece en ${names.get(name)} y en ${where}`);
    names.set(name, where);
  };
  addName(s.club.name, 'el club del usuario');
  for (const r of s.rivals) addName(r.name, divisionName(s.divisionId));
  for (const [id, teams] of Object.entries(divisions)) {
    const ids = new Set(teams.map((t) => t.id));
    check(ids.size === teams.length, `${label}: ${id} tiene ids repetidos`);
    for (const t of teams) addName(t.name, divisionName(id));
  }

  // La temporada del club: rivales, fechas y tabla tienen que cerrar.
  check(
    s.seasonLength === s.rivals.length,
    `${label}: ${s.rivals.length} rivales pero ${s.seasonLength} fechas`
  );
  check(
    s.schedule.length === s.seasonLength,
    `${label}: el fixture tiene ${s.schedule.length} fechas y la temporada ${s.seasonLength}`
  );
  const rivalIds = new Set(s.rivals.map((r) => r.id));
  for (const id of s.schedule) check(rivalIds.has(id), `${label}: el fixture juega contra ${id}, que no está en la liga`);
  check(
    s.standings.length === s.rivals.length + 1,
    `${label}: la tabla tiene ${s.standings.length} filas y la divisional ${s.rivals.length + 1} equipos`
  );

  // Las personas del mundo no se duplican ni quedan sin club conocido.
  const people = new Map();
  for (const p of s.world.players ?? []) {
    if (people.has(p.id)) problems.push(`${label}: la persona ${p.id} está dos veces en el mundo`);
    people.set(p.id, p);
  }
}

/**
 * La caja se rellena a propósito al arrancar cada temporada: este harness mide
 * la pirámide, no la economía. Un manager que no hace NADA (ni sponsors, ni
 * acciones, ni mercado) funde el club en la 2ª temporada y no habría carrera
 * larga que auditar. La economía se mide con `npm run sim`.
 */
function fundClub(s) {
  return { ...s, club: { ...s.club, money: Math.max(s.club.money, 3000) } };
}

/** Juega una temporada completa (fase regular + playoffs) sin gestión del manager. */
function playSeason(s) {
  let guard = 0;
  while (s.phase !== 'gameOver' && s.phase !== 'seasonEnd') {
    if (guard++ > 40) throw new Error('la temporada no termina nunca');
    s = { ...s, pendingEvent: null, actionsChosen: [] };
    s = confirmActions(s);
    const absent = matchAbsentIds(s);
    const starters = suggestStarters(s.players, absent);
    s = { ...s, phase: 'lineup', starters, rotation: suggestRotation(s.players, starters, absent) };
    let rng = new Rng(s.seed);
    s = startLiveMatch({ ...s, seed: rng.nextSeed() }, rng);
    if (s.phase === 'match') {
      while (s.live && !s.live.finished) {
        s = { ...s, live: { ...s.live, defense: 'hombre', attack: 'equipo', pendingIncident: null } };
        rng = new Rng(s.seed);
        s = playQuarter({ ...s, seed: rng.nextSeed() }, rng);
      }
      rng = new Rng(s.seed);
      s = finishLiveMatch({ ...s, seed: rng.nextSeed() }, rng);
    }
    s = advanceWeek(s);
  }
  return s;
}

/**
 * Una carrera: N temporadas seguidas. `pickLeague` decide dónde anotarse en
 * cada pretemporada (null = quedarse donde está).
 */
function playCareer(seed, seasons, pickLeague) {
  let s = createNewGame(seed);
  const track = [];
  for (let n = 0; n < seasons; n++) {
    auditWorld(s, `semilla ${seed}, temporada ${s.seasonNumber}`);
    const from = s.divisionId;
    s = playSeason(fundClub(s));
    if (s.phase === 'gameOver') return { track, gameOver: true, reason: s.gameOverReason };
    const position = [...s.standings]
      .sort((a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst))
      .findIndex((r) => r.teamId === 'club') + 1;
    s = startPreseason(s);
    const offer = inscriptionOffer(s);
    const chosen = pickLeague ? pickLeague(s, offer, n) : null;
    if (chosen) s = { ...s, preseason: { ...s.preseason, chosenDivisionId: chosen } };
    s = closePreseason(s);
    s = startSeasonFromPreseason(s);
    track.push({
      season: n + 1,
      from,
      to: s.divisionId,
      position,
      offer: offer.length,
      weeks: s.seasonLength,
    });
    auditWorld(s, `semilla ${seed}, arranque de la temporada ${s.seasonNumber}`);
  }
  return { track, gameOver: false, state: s };
}

const CAREERS = Math.max(1, parseInt(process.argv[2], 10) || 12);
const SEASONS = Math.max(2, parseInt(process.argv[3], 10) || 8);

console.log(`Simulando ${CAREERS} carreras × ${SEASONS} temporadas…`);
console.log(`El mundo son ${WORLD_DIVISION_IDS.length} divisionales y ${TOTAL_TEAMS} equipos.\n`);

const moves = { ascenso: 0, descenso: 0, quieto: 0 };
const reasons = {};
const visited = {};
let gameOvers = 0;

for (let i = 0; i < CAREERS; i++) {
  const seed = 4000 + i * 7919;
  const { track, gameOver, reason } = playCareer(seed, SEASONS, null);
  if (gameOver) {
    gameOvers += 1;
    reasons[reason] = (reasons[reason] || 0) + 1;
  }
  for (const t of track) {
    visited[t.to] = (visited[t.to] || 0) + 1;
    const levelFrom = DIVISIONS.find((d) => d.id === t.from)?.level ?? 0;
    const levelTo = DIVISIONS.find((d) => d.id === t.to)?.level ?? 0;
    if (levelTo < levelFrom) moves.ascenso += 1;
    else if (levelTo > levelFrom) moves.descenso += 1;
    else moves.quieto += 1;
  }
}

console.log('=== Carrera quedándose siempre en su liga ===');
console.log(`Ascensos: ${moves.ascenso}  ·  Descensos: ${moves.descenso}  ·  Sin moverse: ${moves.quieto}`);
console.log(
  'Temporadas por divisional: ' +
    Object.entries(visited)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${divisionName(id)} ${n}`)
      .join(' · ')
);
if (gameOvers) {
  console.log(`Carreras que terminaron en game over: ${gameOvers}/${CAREERS}`);
  for (const [r, n] of Object.entries(reasons)) console.log(`  · ${n}× ${r}`);
}

// --- Carreras que cambian de liga: ejercitan la inscripción y los lugares guardados ---
console.log('\n=== Carreras cambiando de liga (la oferta, elegida a propósito) ===');
const tours = [];
for (let i = 0; i < Math.max(3, Math.floor(CAREERS / 2)); i++) {
  const seed = 9000 + i * 6151;
  const { track, gameOver } = playCareer(seed, Math.max(4, SEASONS), (s, offer, n) => {
    // Va rotando por toda la oferta: liga nueva, vuelta al lugar guardado, etc.
    const options = offer.filter((o) => !o.locked);
    return options[(n + 1) % options.length].divisionId;
  });
  if (gameOver) continue;
  tours.push(track);
}
for (const track of tours.slice(0, 3)) {
  console.log(
    '  ' +
      track
        .map((t) => `T${t.season}: ${divisionName(t.to)} (${leagueOf(t.to).replace('lg_', '')}, ${t.weeks} fechas)`)
        .join(' → ')
  );
}

console.log('');
if (problems.length === 0) {
  console.log('✓ Sin problemas: el mundo cierra en todas las temporadas simuladas.');
} else {
  console.log(`✕ ${problems.length} problema(s):`);
  for (const p of problems.slice(0, 25)) console.log(`  - ${p}`);
  process.exitCode = 1;
}
