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

/** Minutos de un jugador en el partido de la semana dada (0 si no jugó). */
function minutesInWeek(p: Player, season: number, week: number): number {
  const entry = p.matchLog.find((m) => m.season === season && m.week === week);
  return entry?.minutes ?? 0;
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
    case 'minutos':
      return p.weeksBenched >= 1 ? 'en_riesgo' : 'en_pie';
    case 'competitivo':
      return clubPosition(state) >= 5 ? 'en_riesgo' : 'en_pie';
    case 'ambiente':
      return state.club.socialClimate < 45 ? 'en_riesgo' : 'en_pie';
    default:
      return 'en_pie';
  }
}

/** ¿Se rompió la promesa esta semana? (evaluado tras el partido, antes de avanzar). */
function isBroken(s: GameState, pr: ClubPromise, p: Player): boolean {
  switch (pr.type) {
    case 'titularidad': {
      // Dos semanas seguidas sin cancha, o dos partidos seguidos con pocos minutos.
      if (p.weeksBenched >= 2) return true;
      const lastTwo = [s.week - 1, s.week].map((w) => minutesInWeek(p, s.seasonNumber, w));
      return s.week >= 2 && lastTwo.every((m) => m < 20) && lastTwo.some((m) => m > 0);
    }
    case 'minutos':
      // Le prometiste lugar en la rotación y lleva dos semanas sin entrar.
      return p.weeksBenched >= 2;
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
 * Evalúa las promesas de la temporada tras el partido de la semana.
 * Muta el estado recibido (un clon): rompe promesas y aplica reacciones.
 */
export function checkPromises(s: GameState): void {
  for (const pr of s.promises) {
    if (pr.broken || pr.season !== s.seasonNumber || !EVALUATED.has(pr.type)) continue;
    const p = s.players.find((x) => x.id === pr.playerId);
    if (!p || p.leftClub) continue;
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
  const absent = new Set(s.callUp.filter((c) => c.status !== 'confirmado').map((c) => c.playerId));
  for (const pr of s.promises) {
    if (pr.broken || pr.season !== s.seasonNumber) continue;
    if (pr.type !== 'titularidad' && pr.type !== 'minutos') continue;
    const p = s.players.find((x) => x.id === pr.playerId);
    if (!p || p.leftClub || p.status === 'lesionado' || absent.has(p.id)) continue;

    if (pr.type === 'titularidad' && !s.starters.includes(p.id)) {
      const breaksToday = p.weeksBenched >= 1;
      out.push({
        playerId: p.id,
        text: `Le prometiste titularidad a ${p.name} y no está en el quinteto.${breaksToday ? ' Si hoy tampoco arranca, la promesa se rompe.' : ''}`,
        breaksToday,
      });
    } else if (pr.type === 'minutos' && !s.starters.includes(p.id) && !s.rotation.includes(p.id)) {
      const breaksToday = p.weeksBenched >= 1;
      out.push({
        playerId: p.id,
        text: `${p.name} tiene prometido lugar en la rotación y quedó fuera de la pizarra.${breaksToday ? ' Otra semana afuera y la promesa se rompe.' : ''}`,
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
