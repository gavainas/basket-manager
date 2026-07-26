// Promesas con consecuencias: lo que aceptaste en la pretemporada se evalúa
// durante la temporada. Si no cumplís, el jugador lo cobra caro.

import { clamp } from './balance';
import { clubPosition } from './match';
import { groupStanding } from './relations';
import { logPlayerEvent } from './timeline';
import type { ClubPromise, GameState, Player } from './types';

export type PromiseHealth = 'en_pie' | 'en_riesgo' | 'rota' | 'cumplida';

/** Promesas que se evalúan semana a semana (las demás se cumplen al firmar). */
const EVALUATED = new Set(['titularidad', 'minutos', 'competitivo', 'ambiente']);

/**
 * Cuántos partidos seguidos en el banco rompen la promesa de titularidad.
 * Un banco no es nada, dos es una charla, tres es una traición… según quién.
 */
function benchTolerance(p: Player): number {
  if (p.personality === 'protagonista') return 2;
  if (p.personality === 'leal' || p.personality === 'cumplidor') return 4;
  return 3;
}

/** El registro de esta temporada (solo fechas en las que estuvo disponible). */
function seasonLog(s: GameState, p: Player): { started: boolean; inSquad: boolean }[] {
  return (p.promiseLog ?? []).filter((e) => e.season === s.seasonNumber);
}

/** Partidos seguidos sin arrancar, contando desde el último hacia atrás. */
function benchTail(log: { started: boolean }[]): number {
  let tail = 0;
  for (let i = log.length - 1; i >= 0 && !log[i].started; i--) tail++;
  return tail;
}

/** Fechas seguidas fuera de la convocatoria, desde la última hacia atrás. */
function outTail(log: { inSquad: boolean }[]): number {
  let tail = 0;
  for (let i = log.length - 1; i >= 0 && !log[i].inSquad; i--) tail++;
  return tail;
}

/**
 * Anota la fecha en el registro de los que tienen promesa de cancha.
 * Solo cuenta si el jugador estuvo disponible de verdad: las ausencias, las
 * lesiones, las suspensiones, el descanso que VOS le diste al fundido y las
 * llegadas al segundo tiempo no suman en contra de nadie.
 */
function recordPromiseWeeks(s: GameState): void {
  if (!s.lastMatch || s.lastMatch.week !== s.week || s.lastMatch.forfeit) return;
  for (const pr of s.promises) {
    if (pr.broken || pr.season !== s.seasonNumber) continue;
    if (pr.type !== 'titularidad' && pr.type !== 'minutos') continue;
    const p = s.players.find((x) => x.id === pr.playerId);
    if (!p || p.leftClub) continue;
    const entry = s.callUp.find((c) => c.playerId === p.id);
    if (!entry || entry.status !== 'confirmado' || entry.lateArrival) continue;
    if (!p.promiseLog) p.promiseLog = [];
    if (p.promiseLog.some((e) => e.season === s.seasonNumber && e.week === s.week)) continue;
    p.promiseLog.push({
      season: s.seasonNumber,
      week: s.week,
      started: s.starters.includes(p.id),
      inSquad: s.starters.includes(p.id) || s.rotation.includes(p.id),
    });
  }
}

/**
 * Estado de salud de una promesa, para mostrar en la UI.
 * No muta nada: la rotura efectiva la aplica checkPromises.
 */
export function promiseHealth(state: GameState, pr: ClubPromise): PromiseHealth {
  if (pr.broken) return 'rota';
  if (!EVALUATED.has(pr.type)) return 'cumplida';
  const p = state.players.find((x) => x.id === pr.playerId);
  if (!p || p.leftClub) return 'rota';
  switch (pr.type) {
    case 'titularidad':
      return benchTail(seasonLog(state, p)) >= 1 ? 'en_riesgo' : 'en_pie';
    case 'minutos':
      return outTail(seasonLog(state, p)) >= 1 ? 'en_riesgo' : 'en_pie';
    case 'competitivo':
      return clubPosition(state) >= 5 ? 'en_riesgo' : 'en_pie';
    case 'ambiente':
      return state.club.socialClimate < 45 ? 'en_riesgo' : 'en_pie';
    default:
      return 'en_pie';
  }
}

/** ¿Se rompió la promesa? El patrón manda: la racha en el banco o la dilución. */
function isBroken(s: GameState, pr: ClubPromise, p: Player): boolean {
  switch (pr.type) {
    case 'titularidad': {
      const log = seasonLog(s, p);
      if (benchTail(log) >= benchTolerance(p)) return true;
      // Bajarlo de a poco también cuenta: menos de la mitad de las últimas 5.
      const last5 = log.slice(-5);
      return last5.length >= 5 && last5.filter((e) => e.started).length <= 2;
    }
    case 'minutos': {
      // Lugar asegurado en la rotación: dos exclusiones en las últimas 5 fechas
      // disponibles ya son una promesa pisada.
      const log = seasonLog(s, p).slice(-5);
      return log.length >= 2 && log.filter((e) => !e.inSquad).length >= 2;
    }
    case 'competitivo':
      // Pasada la mitad de la temporada, el equipo no pelea nada.
      return s.week >= Math.ceil(s.seasonLength / 2) + 1 && clubPosition(s) >= 6;
    case 'ambiente':
      // Le vendiste buen clima y el vestuario es un velorio.
      return s.club.socialClimate < 32;
    default:
      return false;
  }
}

/**
 * La charla previa: antes de que la promesa se rompa, el jugador te encara.
 * Devuelve true si esta semana hubo reclamo (para no romper y reclamar junto).
 */
function maybeComplain(s: GameState, pr: ClubPromise, p: Player): boolean {
  if (pr.warned) return false;
  const log = seasonLog(s, p);
  let text: string | null = null;
  if (pr.type === 'titularidad') {
    const tail = benchTail(log);
    const last4Benches = log.slice(-4).filter((e) => !e.started).length;
    if (tail === benchTolerance(p) - 1 && tail >= 1) {
      text = `"${tail === 1 ? 'Otra vez al banco' : `Van ${tail} seguidos que no arranco`}, ¿me estás bajando? Lo hablamos y quedamos en otra cosa".`;
    } else if (tail >= 1 && last4Benches === 2 && log.length >= 3) {
      text = '"Una sí y una no no es ser titular, eh. Yo firmé otra cosa".';
    }
  } else if (pr.type === 'minutos' && outTail(log) === 1) {
    text = '"Quedé afuera de la lista y yo tengo lugar prometido. Avisame si cambió algo".';
  }
  if (!text) return false;
  pr.warned = true;
  p.motivation = clamp(p.motivation - 4);
  logPlayerEvent(p, s.seasonNumber, s.week, 'animo', `Reclamo por la promesa: ${text}`);
  s.news.unshift({ week: s.week, text: `${p.name} te encaró: ${text} La promesa cruje.`, tone: 'bad' });
  return true;
}

/**
 * Evalúa las promesas de la temporada tras el partido de la semana.
 * Muta el estado recibido (un clon): rompe promesas y aplica reacciones.
 */
export function checkPromises(s: GameState): void {
  recordPromiseWeeks(s);
  for (const pr of s.promises) {
    if (pr.broken || pr.season !== s.seasonNumber || !EVALUATED.has(pr.type)) continue;
    const p = s.players.find((x) => x.id === pr.playerId);
    if (!p || p.leftClub) continue;
    // Antes de romperse, el jugador avisa: la charla es la última salida.
    if (maybeComplain(s, pr, p)) continue;
    if (!isBroken(s, pr, p)) continue;

    pr.broken = true;
    p.motivation = clamp(p.motivation - 14);
    if (p.status === 'disponible') {
      p.status = 'molesto';
      p.weeksUpset = 0;
    }
    // El rencor queda anotado: pesa en la renegociación del año que viene.
    p.grudge = { season: s.seasonNumber, type: pr.type, label: pr.label };
    logPlayerEvent(p, s.seasonNumber, s.week, 'animo', `Promesa incumplida: "${pr.label}". No se olvida.`);
    s.news.unshift({
      week: s.week,
      text: `${p.name} te cruzó: "${promiseComplaint(pr)}". La promesa rota le pegó fuerte.`,
      tone: 'bad',
    });
    // Si el que quedó pagando pesa en el vestuario, el grupo se pone de su lado.
    const standing = groupStanding(p, s.players, s.seasonNumber, s.affinityBonus);
    if (standing >= 60) {
      s.club.socialClimate = clamp(s.club.socialClimate - 3);
      s.news.unshift({
        week: s.week,
        text: `El vestuario se puso del lado de ${p.name}: "así no se le falla a un compañero". El clima lo sintió.`,
        tone: 'bad',
      });
    }
  }
}

/**
 * Avisos ANTES de confirmar el quinteto: qué promesas quedan en el aire con
 * la pizarra actual. Romper una promesa tiene que ser una decisión, no un
 * descuido. Solo mira a los que están disponibles (al ausente no se lo puede
 * alinear, y eso no rompe nada que dependa de vos).
 */
export function lineupPromiseWarnings(s: GameState): { playerId: string; text: string; breaksToday: boolean }[] {
  const out: { playerId: string; text: string; breaksToday: boolean }[] = [];
  const absent = new Set(s.callUp.filter((c) => c.status !== 'confirmado' || c.lateArrival).map((c) => c.playerId));
  for (const pr of s.promises) {
    if (pr.broken || pr.season !== s.seasonNumber) continue;
    if (pr.type !== 'titularidad' && pr.type !== 'minutos') continue;
    const p = s.players.find((x) => x.id === pr.playerId);
    if (!p || p.leftClub || p.status === 'lesionado' || absent.has(p.id)) continue;
    const log = seasonLog(s, p);

    if (pr.type === 'titularidad' && !s.starters.includes(p.id)) {
      // ¿Qué pasa si HOY tampoco arranca? Se simula la fecha de hoy como banco.
      const wouldTail = benchTail(log) + 1;
      const tolerance = benchTolerance(p);
      const wouldLast5 = [...log.slice(-4).map((e) => e.started), false];
      const dilution = wouldLast5.length >= 5 && wouldLast5.filter(Boolean).length <= 2;
      const breaksToday = wouldTail >= tolerance || dilution;
      const text = breaksToday
        ? `Le prometiste titularidad a ${p.name} y no está en el quinteto. Si hoy tampoco arranca, la promesa se rompe.`
        : wouldTail === tolerance - 1
          ? `${p.name} no arranca hoy: ${wouldTail === 1 ? 'sería la primera' : `van a ser ${wouldTail} seguidas`} y se viene la charla. Tiene promesa de titularidad.`
          : `Le prometiste titularidad a ${p.name} y hoy no arranca. Una se banca; que no se haga costumbre.`;
      out.push({ playerId: p.id, text, breaksToday });
    } else if (pr.type === 'minutos' && !s.starters.includes(p.id) && !s.rotation.includes(p.id)) {
      const wouldOuts = log.slice(-4).filter((e) => !e.inSquad).length + 1;
      const breaksToday = log.length >= 1 && wouldOuts >= 2;
      out.push({
        playerId: p.id,
        text: breaksToday
          ? `${p.name} tiene prometido lugar en la rotación y quedó fuera de la pizarra otra vez. Hoy la promesa se rompe.`
          : `${p.name} tiene prometido lugar en la rotación y quedó fuera de la pizarra. Va a preguntar por qué.`,
        breaksToday,
      });
    }
  }
  return out;
}

function promiseComplaint(pr: ClubPromise): string {
  switch (pr.type) {
    case 'titularidad':
      return 'Vine porque me prometiste ser titular, y mirá dónde estoy';
    case 'minutos':
      return 'Quedamos en que iba a tener minutos. Dos semanas mirando de afuera';
    case 'competitivo':
      return 'Me dijiste que veníamos a pelear arriba. Esto es un papelón';
    case 'ambiente':
      return 'Me vendiste un grupo hermoso y esto es un velorio';
    default:
      return 'Lo que hablamos no se cumplió';
  }
}
