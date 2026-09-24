// Fuzz del reducer: juega partidas enteras por el mismo camino que la UI
// (gameReducer) eligiendo AL AZAR lo que un jugador puede elegir —acciones de
// la semana, gestiones de bajas, el DT, el segundo equipo, el quinteto a mano,
// cambios en vivo, incidencias, opciones de eventos, la pretemporada y la
// libreta de la Carrera— y revisa lo que ningún test escribe a mano:
//
//   - que el reducer nunca tire una excepción ni devuelva null;
//   - que el guardado no lleve NaN ni undefined (lo que rompería "Continuar");
//   - que los atributos sigan enteros y en 0-100, que nadie esté dos veces en
//     el plantel ni en el quinteto y la rotación a la vez;
//   - y que los textos que el juego escribe (noticias, historia, informe,
//     relato, eventos, incidencias, ánimos, pretemporada) no tengan errores
//     de armado: "1 jugadores", "de el DT", dobles espacios, "undefined"…
//
// Es una herramienta de desarrollo, como los sim-*. Encontró "Cambio de el
// DT", "silbatos de el Flaco Medina" y "Van 1 fechas" el día que nació.
//
// Uso:  npm run fuzz            (30 semillas, 2 temporadas cada una)
//       npm run fuzz -- 60 3    (más semillas, más temporadas)
//
// Sale con código 1 si encuentra algo. Compila src/game + src/data + src/state
// a CommonJS en scripts/.sim-out (git-ignorado), como los sim-*.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, '.sim-out');

const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const tsc = spawnSync(process.execPath, [tscBin, '-p', path.join(__dirname, 'tsconfig.sim.json')], { stdio: 'inherit' });
if (tsc.status !== 0) {
  console.error('La compilación de src/game falló: arreglá los errores de TypeScript primero.');
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, 'package.json'), '{"type":"commonjs"}\n');

const { createNewGame } = require(path.join(OUT, 'game', 'week.js'));
const { createPreseasonNewGame, createCareerNewGame } = require(path.join(OUT, 'game', 'preseason.js'));
const { ACTIONS } = require(path.join(OUT, 'game', 'actions.js'));
const { ABSENCE_ACTIONS } = require(path.join(OUT, 'game', 'absences.js'));
const { getEvent } = require(path.join(OUT, 'game', 'events.js'));
const { inscriptionOffer } = require(path.join(OUT, 'game', 'preseason.js'));
const { checkExpansion, eligibleForLeague } = require(path.join(OUT, 'game', 'secondTeam.js'));
const { gameReducer } = require(path.join(OUT, 'state', 'gameReducer.js'));

const semillas = Number(process.argv[2] ?? 30);
const temporadas = Number(process.argv[3] ?? 2);

// Azar propio y reproducible (no el del juego): la misma corrida encuentra lo mismo.
let rnd = 12345;
const rand = () => {
  rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;
  return rnd / 0x7fffffff;
};
const pick = (a) => a[Math.floor(rand() * a.length)];

const problemas = [];
const contexto = { seed: 0, temporada: 0, semana: 0, fase: '' };
const nota = (msg) => problemas.push(`[semilla ${contexto.seed} · T${contexto.temporada} · semana ${contexto.semana} · ${contexto.fase}] ${msg}`);

// --- Todos los textos que el juego escribe, con su origen ---
const textos = new Map();
const anotar = (origen, t) => {
  if (t && !textos.has(t)) textos.set(t, origen);
};
function cosechar(s) {
  for (const n of s.news.slice(0, 4)) anotar('noticia', n.text);
  for (const e of s.clubTimeline.slice(-3)) anotar('historia del club', e.text);
  for (const p of s.players) {
    const t = p.timeline[p.timeline.length - 1];
    if (t) anotar('ficha', t.text);
  }
  if (s.lastMatch) {
    anotar('informe', s.lastMatch.summary);
    for (const t of [...s.lastMatch.reasons, ...s.lastMatch.effects, ...s.lastMatch.lockerRoom, ...s.lastMatch.highlights]) anotar('informe', t);
    for (const m of s.lastMatch.moods ?? []) anotar('ánimo', `${m.label} · ${m.text}`);
    for (const l of s.lastMatch.box) anotar('nota planilla', l.comment);
  }
  if (s.eventOutcome) anotar('desenlace', s.eventOutcome);
  if (s.live && s.live.pendingIncident) {
    anotar('incidencia', s.live.pendingIncident.text);
    for (const o of s.live.pendingIncident.options) anotar('incidencia', `${o.label} · ${o.hint}`);
  }
  if (s.live) {
    for (const q of s.live.quarters) for (const n of q.notes) anotar('relato', n);
    for (const n of s.live.pendingSubNotes) anotar('relato', n);
  }
  if (s.preseason) {
    for (const l of s.preseason.log.slice(-3)) anotar('pretemporada', l);
    anotar('pretemporada', s.preseason.actionOutcome);
    anotar('pretemporada', s.preseason.eventOutcome);
  }
  if (s.weekBanter) for (const m of s.weekBanter.messages) anotar('previa', m.text);
  if (s.lastAsado) for (const h of s.lastAsado.highlights) anotar('asado', h);
  for (const c of s.callUp) anotar('convocatoria', c.reason);
}

function paso(s, a) {
  const next = gameReducer(s, a);
  if (!next) throw new Error(`el reducer devolvió null ante ${a.type}`);
  cosechar(next);
  // El duplicado se anota en la acción que lo mete, no al final de la semana.
  const ids = next.players.map((p) => p.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup && !(s && s.players.some((p, i) => s.players.findIndex((q) => q.id === p.id) !== i))) {
    nota(`jugador duplicado ${dup} recién metido por ${a.type} ${JSON.stringify({ ...a, state: undefined })}`);
  }
  const json = JSON.stringify(next);
  const i = json.indexOf('NaN') >= 0 ? json.indexOf('NaN') : json.indexOf('undefined');
  if (i >= 0) nota(`NaN/undefined en el guardado tras ${a.type}: …${json.slice(Math.max(0, i - 120), i + 40)}…`);
  return next;
}

function invariantes(s, donde) {
  if (!Number.isFinite(s.club.money)) nota(`caja no finita (${donde})`);
  for (const p of s.players) {
    for (const k of ['physical', 'motivation', 'commitment', 'social', 'technique', 'confidence']) {
      const v = p[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100 || Math.round(v) !== v) nota(`${p.name}.${k} = ${v} (${donde})`);
    }
    for (const m of p.matchLog) {
      if (m.minutes < 0 || m.minutes > 50 || m.points < 0) nota(`${p.name} matchLog raro: ${JSON.stringify(m)} (${donde})`);
    }
  }
  const activos = s.players.filter((p) => !p.leftClub).map((p) => p.id);
  const dup = activos.find((id, i) => activos.indexOf(id) !== i);
  if (dup) nota(`jugador duplicado ${dup} (${donde})`);
  const solapados = s.starters.filter((id) => s.rotation.includes(id));
  if (solapados.length) nota(`titular y rotación a la vez: ${solapados.join(',')} (${donde})`);
  // Al cierre puede quedar en el quinteto uno que se fue en la última semana:
  // se rearma al pasar a la alineación, y la UI filtra por disponibles.
  const fantasmas = donde === 'cierre' ? [] : [...s.starters, ...s.rotation].filter((id) => !activos.includes(id));
  if (fantasmas.length) nota(`en el quinteto/rotación alguien que no está: ${fantasmas.join(',')} (${donde})`);
}

function resolverEventos(s) {
  let guard = 0;
  while (s.pendingEvent || s.eventOutcome) {
    if (++guard > 12) throw new Error('los eventos no terminan');
    if (s.pendingEvent) {
      const def = getEvent(s.pendingEvent.defId);
      const texto = def.text(s, s.pendingEvent);
      const opts = def.options(s, s.pendingEvent);
      anotar(`evento ${def.id}`, texto);
      for (const o of opts) anotar(`evento ${def.id}`, `${o.label} · ${o.hint ?? ''}`);
      s = paso(s, { type: 'RESOLVE_EVENT', optionIndex: Math.floor(rand() * opts.length) });
    }
    if (s.eventOutcome) s = paso(s, { type: 'DISMISS_EVENT_OUTCOME' });
  }
  return s;
}

function jugarFecha(s) {
  s = resolverEventos(s);
  contexto.semana = s.week;
  contexto.fase = s.phase;
  if (s.phase !== 'planning') throw new Error(`esperaba planning, fase ${s.phase}`);
  // Acciones al azar (0 a 2), sólo las disponibles.
  const n = Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const disp = ACTIONS.filter((a) => a.available(s).ok && !s.actionsChosen.includes(a.id));
    if (disp.length) s = paso(s, { type: 'TOGGLE_ACTION', id: pick(disp).id });
  }
  if (s.asadoBet && s.asadoBet.week === s.week && s.asadoBet.status === 'propuesta' && rand() < 0.5) s = paso(s, { type: 'ASADO_BET', accept: rand() < 0.5 });
  // El cuerpo técnico y el segundo equipo, de vez en cuando.
  const r0 = rand();
  if (r0 < 0.1 && !s.coach && s.coachMarket.length) s = paso(s, { type: 'HIRE_COACH', coachId: pick(s.coachMarket).id });
  else if (r0 < 0.15 && !s.coach) s = paso(s, { type: 'APPOINT_PLAYER_COACH', playerId: pick(s.players.filter((p) => !p.leftClub)).id });
  else if (r0 < 0.2 && s.coach) s = paso(s, { type: 'FIRE_COACH' });
  else if (r0 < 0.25 && s.coach) s = paso(s, { type: 'SET_COACH_DIRECTIVE', directive: pick(['ganar', 'repartir']) });
  else if (r0 < 0.32) {
    for (const l of s.world.leagues) {
      if (checkExpansion(s, l.id).ok) {
        const ids = s.players.filter((p) => eligibleForLeague(p, l)).map((p) => p.id);
        s = paso(s, { type: 'REGISTER_SECOND_TEAM', leagueId: l.id, playerIds: ids });
        break;
      }
    }
  }
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: rand() < 0.5 ? 'temprana' : 'tarde' });
  s = resolverEventos(s);
  contexto.fase = s.phase;
  if (s.phase !== 'callUp') throw new Error(`esperaba callUp, fase ${s.phase}`);
  // Gestiones de bajas al azar, y el fundido que a veces descansa.
  for (const c of s.callUp) {
    if (c.status === 'ausente' && rand() < 0.5) s = paso(s, { type: 'CALLUP_ACTION', playerId: c.playerId, actionId: pick(Object.values(ABSENCE_ACTIONS)).id });
  }
  for (const c of s.callUp) {
    const p = s.players.find((x) => x.id === c.playerId);
    if (c.status === 'confirmado' && p && p.physical <= 35 && rand() < 0.5) s = paso(s, { type: 'CALLUP_EXHAUSTED', playerId: c.playerId, decision: rand() < 0.5 ? 'descansar' : 'jugar' });
  }
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  if (rand() < 0.3) {
    // Toquetear el quinteto a mano: sacar uno, meter otro, y a veces limpiar y volver a sugerir.
    const disponibles = s.players.filter((p) => !p.leftClub).map((p) => p.id);
    s = paso(s, { type: 'TOGGLE_STARTER', id: pick(disponibles) });
    s = paso(s, { type: 'TOGGLE_ROTATION', id: pick(disponibles) });
    if (rand() < 0.3) {
      s = paso(s, { type: 'CLEAR_LINEUP' });
      s = paso(s, { type: 'AUTO_LINEUP' });
    } else if (s.starters.length < 5 && rand() < 0.7) s = paso(s, { type: 'AUTO_LINEUP' });
  }
  if (rand() < 0.3) s = paso(s, { type: 'SET_MATCH_PLAN', plan: pick(['manual', 'rotar']) });
  if (rand() < 0.3) s = paso(s, { type: 'SET_TACTIC', defense: pick(['zona', 'hombre', 'presion']), attack: pick(['equipo', 'estrella', 'correr']) });
  invariantes(s, 'quinteto');
  s = paso(s, { type: 'START_MATCH' });
  if (s.phase === 'match') {
    let guard = 0;
    while (s.live && !s.live.finished) {
      if (++guard > 80) throw new Error('el partido no termina');
      if (s.live.pendingIncident) {
        const inc = s.live.pendingIncident;
        s = paso(s, { type: 'INCIDENT_CHOICE', index: Math.floor(rand() * inc.options.length) });
        continue;
      }
      const r = rand();
      if (r < 0.12) s = paso(s, { type: 'APPLY_PRESET', preset: pick(['titulares', 'segunda', 'frescos', 'cerradores']) });
      else if (r < 0.2 && !s.live.enCurso) s = paso(s, { type: 'PEDIR_MINUTO' });
      else if (r < 0.28) {
        const banco = s.live.squad.filter((id) => !s.live.onCourt.includes(id));
        if (banco.length) s = paso(s, { type: 'SUBSTITUTE', outId: pick(s.live.onCourt), inId: pick(banco) });
      } else if (r < 0.33) s = paso(s, { type: 'SET_STAR', playerId: pick(s.live.onCourt) });
      else if (r < 0.38) s = paso(s, { type: 'SET_AUTO_ROTATION', on: rand() < 0.5, directive: pick(['ganar', 'repartir']) });
      else if (r < 0.43) s = paso(s, { type: 'SET_TACTIC', defense: pick(['zona', 'hombre', 'presion']) });
      else if (r < 0.6) s = paso(s, { type: 'PLAY_TRAMO' });
      else s = paso(s, { type: 'PLAY_QUARTER' });
    }
    s = paso(s, { type: 'FINISH_MATCH' });
  }
  if (s.phase !== 'matchResult') throw new Error(`esperaba matchResult, fase ${s.phase}`);
  invariantes(s, 'informe');
  return paso(s, { type: 'NEXT_WEEK' });
}

/** La pretemporada al azar (la del club en marcha o la libreta de la Carrera) hasta cerrarla. */
function jugarPretemporada(s) {
  let guard = 0;
  while (s.phase === 'preseason' && ++guard < 60) {
    contexto.fase = 'preseason';
    contexto.semana = s.preseason ? s.preseason.week : 0;
    while (s.preseason && s.preseason.pendingEvent) {
      s = paso(s, { type: 'PS_RESOLVE_EVENT', optionIndex: Math.floor(rand() * 2) });
      if (s.preseason && s.preseason.eventOutcome) s = paso(s, { type: 'PS_DISMISS_EVENT_OUTCOME' });
    }
    if (s.preseason && s.preseason.negotiation) {
      s = paso(s, { type: 'PS_NEGOTIATE', decision: pick(['accept', 'reject', 'counter', 'later', 'priority']) });
      if (s.preseason && s.preseason.actionOutcome) s = paso(s, { type: 'PS_DISMISS_OUTCOME' });
      continue;
    }
    if (s.preseason && s.preseason.actionOutcome) {
      s = paso(s, { type: 'PS_DISMISS_OUTCOME' });
      continue;
    }
    const ps = s.preseason;
    if (ps.chosenDivisionId === null && rand() < 0.5) {
      const oferta = inscriptionOffer(s);
      if (oferta.length) s = paso(s, { type: 'PS_CHOOSE_LEAGUE', divisionId: pick(oferta).divisionId });
    }
    const r = rand();
    const ids = Object.keys(ps.continuity);
    if (r < 0.4 && ps.market.length) s = paso(s, { type: 'PS_OPEN_NEGOTIATION', id: pick(ps.market).id, isMarket: true });
    else if (r < 0.55 && ids.length) s = paso(s, { type: 'PS_TALK', id: pick(ids) });
    else if (r < 0.65 && ids.length) s = paso(s, { type: 'PS_OPEN_NEGOTIATION', id: pick(ids), isMarket: false });
    else if (ps.week < ps.totalWeeks) s = paso(s, { type: 'PS_ADVANCE' });
    else s = paso(s, { type: 'PS_CLOSE' });
  }
  if (s.phase === 'preseasonEnd') s = paso(s, { type: 'START_SEASON' });
  return s;
}

let jugadas = 0;
for (let seed = 1; seed <= semillas; seed++) {
  contexto.seed = seed;
  // Un tercio de las partidas arranca por la Carrera (la libreta), otro por la
  // pretemporada del club en marcha, otro directo a la fecha 1. Siempre con la
  // semilla del fuzz (las acciones NEW_GAME_* sortean la suya y la corrida
  // dejaría de ser reproducible).
  const modo = seed % 3;
  const inicial =
    modo === 0
      ? createCareerNewGame(seed, 'medio', { clubName: 'Club Fuzz', colors: ['#123456', '#abcdef'] })
      : modo === 1
        ? createPreseasonNewGame(seed)
        : createNewGame(seed);
  let s = paso(null, { type: 'LOAD', state: inicial });
  try {
    if (s.phase === 'preseason') {
      s = jugarPretemporada(s);
      if (s.phase === 'gameOver') {
        invariantes(s, 'cierre');
        continue;
      }
    }
    for (let t = 0; t < temporadas; t++) {
      contexto.temporada = s.seasonNumber;
      let guard = 0;
      while (s.phase !== 'seasonEnd' && s.phase !== 'gameOver') {
        if (++guard > 40) throw new Error('la temporada no termina');
        s = jugarFecha(s);
        jugadas++;
      }
      invariantes(s, 'cierre');
      if (s.phase === 'gameOver') break;
      s = paso(s, { type: 'NEW_SEASON' });
      s = jugarPretemporada(s);
      if (s.phase === 'gameOver') break;
    }
  } catch (e) {
    nota(`EXCEPCIÓN: ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`);
  }
}

// --- Errores de armado en los textos ---
const PALABRAS = 'jugadores|semanas|puntos|rebotes|asistencias|fechas|partidos|faltas|minutos|veces|avisos|gestiones|fichas|técnicas|ausencias';
const patrones = [
  ['"1 cosas" en plural', new RegExp(`\\b1 (${PALABRAS})\\b`)],
  ['"N cosa" en singular', /\b([2-9]|\d\d) (jugador|semana|punto|rebote|asistencia|fecha|partido|falta|minuto|vez|aviso|gestión|ficha|técnica|ausencia)\b(?!es)/],
  ['doble espacio', /\S  \S/],
  ['sin espacio tras dos puntos', /[a-záéíóúñ]:[A-Za-zÁÉÍÓÚÑáéíóúñ]/],
  ['espacio antes de coma o punto', / [,.;]/],
  ['tres puntos en vez de puntos suspensivos', /\.\.\./],
  ['paréntesis vacío o mal cerrado', /\(\s|\s\)|\(\)/],
  ['palabra repetida', /\b(\w{3,}) \1\b/i],
  ['undefined/NaN/object', /undefined|NaN|\[object/],
  ['plantilla sin resolver', /\{[a-z]+\}|\$\{/],
  ['"de el"/"a el"', /(^|[\s(])(de|a) el\b/],
  ['frase que empieza en minúscula con artículo', /^(el|la|los|las) [A-Z]/],
  ['punto sin espacio antes de mayúscula', /[a-záéíóúñ]\.[A-ZÁÉÍÓÚÑ]/],
];
let rotos = 0;
for (const [nombre, re] of patrones) {
  const hits = [...textos.entries()].filter(([t]) => re.test(t));
  if (hits.length === 0) continue;
  rotos += hits.length;
  console.log(`\n== ${nombre} (${hits.length}) ==`);
  for (const [t, origen] of hits.slice(0, 12)) console.log(`  [${origen}] ${t}`);
}

console.log(`\nfechas jugadas: ${jugadas} · problemas del motor: ${problemas.length} · textos distintos: ${textos.size} · textos rotos: ${rotos}`);
for (const p of [...new Set(problemas)].slice(0, 40)) console.log('- ' + p);
process.exit(problemas.length + rotos > 0 ? 1 : 0);
