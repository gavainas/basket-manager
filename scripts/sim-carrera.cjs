// Harness del modo Carrera: juega la primera pretemporada del club desde cero
// (la libreta de contactos, el favor, la bola de nieve, el corte de los ocho)
// con distintas políticas de pedir favores y reporta cuántas carreras llegan
// a inscribirse. Es una herramienta de desarrollo: no forma parte del juego.
//
// El roadmap pedía medir "cuántas carreras llegan a inscribirse sin gestión".
// Sin gestión, en la Carrera, no hay club: nadie firma si no le pedís. Así
// que el piso se mide con políticas mecánicas —pedir a todos, pedir sólo a
// la libreta del arranque, pedir primero a los que ya tienen un amigo
// adentro— y lo que se mira es que ninguna sea un paseo ni un muro.
//
// Uso:  npm run sim:carrera          (60 carreras por política)
//       npm run sim:carrera -- 30    (menos corridas, más rápido)
//
// Compila src/game + src/data a CommonJS en scripts/.sim-out (git-ignorado)
// y corre la simulación sobre ese código, igual que `npm run sim`.

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

const {
  createCareerNewGame,
  openNegotiation,
  resolveNegotiation,
  advancePreseasonWeek,
  closePreseason,
  confirmedPlayers,
} = require(path.join(OUT, 'game', 'preseason.js'));
const { resolvePreseasonEvent } = require(path.join(OUT, 'game', 'preseasonEvents.js'));
const { BALANCE } = require(path.join(OUT, 'game', 'balance.js'));
const { Rng } = require(path.join(OUT, 'game', 'rng.js'));

const MIN = BALANCE.preseason.minPlayers;

/** Cierra eventos y modales pendientes, siempre con la primera opción. */
function limpiar(s) {
  let guard = 0;
  while (s.preseason && (s.preseason.pendingEvent || s.preseason.actionOutcome || s.preseason.eventOutcome)) {
    if (++guard > 10) throw new Error('modales sin fin');
    if (s.preseason.pendingEvent) s = resolvePreseasonEvent(s, 0);
    if (s.preseason) s.preseason.actionOutcome = null;
    if (s.preseason) s.preseason.eventOutcome = null;
  }
  return s;
}

/** Le pide el favor a un contacto: abre la negociación y acepta lo que pide. */
function pedir(s, id) {
  s = openNegotiation(s, id, true);
  s = resolveNegotiation(s, 'accept');
  return limpiar(s);
}

const disponibles = (s) => s.preseason.market.filter((m) => m.status === 'disponible');
const enElPlantel = (s, nombre) => s.players.some((p) => !p.leftClub && p.name === nombre);

// Políticas: a quién le pedís el favor con las tres gestiones de cada semana.
// Cada una devuelve el próximo contacto a llamar, o null para no llamar más.
const POLITICAS = {
  // El piso de verdad: no llamás a nadie. Sin gestión no hay club.
  sinGestion: () => null,
  // A todos, en cualquier orden: la política "mecánica" de referencia.
  pedirATodos: (s, rng) => {
    const d = disponibles(s);
    return d.length ? rng.pick(d) : null;
  },
  // Sólo a tu libreta del arranque: ignora la bola de nieve (mide cuánto vale).
  soloLibreta: (s, rng) => {
    const d = disponibles(s).filter((m) => m.viaDe === 'vos');
    return d.length ? rng.pick(d) : null;
  },
  // Con cabeza: el íntimo primero, después los que ya tienen a su amigo
  // adentro (el favor es más fácil), y recién ahí el resto. No insiste con el
  // que ya dudó una vez mientras haya otros por llamar.
  conCabeza: (s) => {
    const d = disponibles(s);
    if (!d.length) return null;
    const puntaje = (m) =>
      (m.knowledge === 'muy_conocido' && m.viaDe === 'vos' ? 100 : 0) +
      (m.viaDe && m.viaDe !== 'vos' && enElPlantel(s, m.viaDe) ? 20 : 0) +
      (m.viaDe === 'vos' ? 5 : 0) -
      (m.dudas || 0) * 10;
    return [...d].sort((a, b) => puntaje(b) - puntaje(a))[0];
  },
};

/** Una carrera: la pretemporada entera con la política dada. */
function jugarPretemporada(seed, politica, dificultad) {
  let s = createCareerNewGame(seed, dificultad, { clubName: 'Club de Prueba', colors: ['#111111', '#eeeeee'] });
  const rng = new Rng(seed * 31 + 7);
  const libretaInicial = s.preseason.market.length;
  let pedidos = 0;
  let noes = 0;
  let guard = 0;
  while (s.phase === 'preseason') {
    if (++guard > 60) throw new Error('la pretemporada no termina');
    s = limpiar(s);
    const ps = s.preseason;
    const proximo = ps.gestionesLeft > 0 ? POLITICAS[politica](s, rng) : null;
    if (proximo) {
      const antes = confirmedPlayers(s).length;
      s = pedir(s, proximo.id);
      pedidos += 1;
      if (confirmedPlayers(s).length === antes) noes += 1;
      continue;
    }
    s = ps.week >= ps.totalWeeks ? closePreseason(s) : advancePreseasonWeek(s);
  }
  const plantel = s.players.filter((p) => !p.leftClub).length;
  return {
    llego: s.phase === 'preseasonEnd',
    plantel,
    contactos: s.preseason ? s.preseason.market.length : libretaInicial,
    libretaInicial,
    pedidos,
    noes,
    caja: s.club.money,
    fiado: !!(s.inscriptionDebt && s.inscriptionDebt.remaining > 0),
  };
}

const RUNS = Math.max(5, parseInt(process.argv[2], 10) || 60);
const DIFICULTAD = process.argv[3] || 'medio';
console.log(`Simulando ${RUNS} carreras por política (primera pretemporada del club desde cero, dificultad ${DIFICULTAD})…`);
console.log(`La liga pide ${MIN} para inscribirse; hay ${BALANCE.preseason.weeks} semanas y ${BALANCE.preseason.gestionesPerWeek} gestiones por semana.\n`);

const resumen = {};
for (const politica of Object.keys(POLITICAS)) {
  const a = { llegan: 0, planteles: {}, plantel: 0, contactos: 0, pedidos: 0, noes: 0, caja: 0, fiados: 0 };
  for (let i = 0; i < RUNS; i++) {
    const r = jugarPretemporada(1000 + i * 7919, politica, DIFICULTAD);
    if (r.llego) a.llegan += 1;
    a.planteles[r.plantel] = (a.planteles[r.plantel] || 0) + 1;
    a.plantel += r.plantel;
    a.contactos += r.contactos;
    a.pedidos += r.pedidos;
    a.noes += r.noes;
    a.caja += r.caja;
    if (r.fiado) a.fiados += 1;
  }
  const pct = ((a.llegan / RUNS) * 100).toFixed(0);
  resumen[politica] = pct;
  console.log(`=== ${politica} (${RUNS} carreras) ===`);
  console.log(`Llegan a inscribirse: ${a.llegan}/${RUNS} (${pct}%)  ·  Plantel al cierre: ${(a.plantel / RUNS).toFixed(1)} de media`);
  console.log(
    `Plantel al cierre, por tamaño: ${Object.entries(a.planteles)
      .sort((x, y) => Number(x[0]) - Number(y[0]))
      .map(([n, c]) => `${n}→${c}`)
      .join('  ')}`
  );
  console.log(
    `Contactos que llegó a tener la libreta: ${(a.contactos / RUNS).toFixed(1)}  ·  Favores pedidos: ${(a.pedidos / RUNS).toFixed(1)} (${a.pedidos ? ((a.noes / a.pedidos) * 100).toFixed(0) : 0}% dijeron que no)`
  );
  console.log(`Caja al cierre: $${Math.round(a.caja / RUNS)}  ·  Se inscribieron de fiado: ${a.fiados}/${a.llegan}\n`);
}

// Lo que se pide del modo (ver design/BALANCE.md): que se pueda perder y que
// se pueda ganar. Si pedir a todos llega siempre, la libreta es un paseo; si
// con cabeza no llega casi nunca, es un muro.
const problemas = [];
if (Number(resumen.sinGestion) !== 0) problemas.push('sin gestión hay carreras que llegan: el corte de los ocho no está cortando');
if (Number(resumen.pedirATodos) >= 100) problemas.push('pidiendo a todos se llega siempre: la pretemporada de la Carrera es un paseo');
if (Number(resumen.conCabeza) <= 20) problemas.push('ni con cabeza se llega: la pretemporada de la Carrera es un muro');
if (problemas.length === 0) {
  console.log('✓ La Carrera se puede perder y se puede ganar.');
} else {
  console.log(`✕ ${problemas.length} problema(s):`);
  for (const p of problemas) console.log(`  - ${p}`);
  process.exitCode = 1;
}
