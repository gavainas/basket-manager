// Historias del juego: la de cada jugador y la del club.

import type { GameState, Player, TimelineEvent, TimelineKind } from './types';

/** Registra un momento en la historia de un jugador. */
export function logPlayerEvent(p: Player, season: number, week: number, kind: TimelineKind, text: string): void {
  p.timeline.push({ season, week, kind, text });
}

/**
 * La semana con la que se anota lo que pasa al cerrar la temporada (la
 * comisión liquida los objetivos, el club cierra el año): después de las
 * finales, así la historia lo muestra en su lugar y con su etiqueta
 * ("Cierre"), no como "Sem 9" debajo de la semifinal de la semana 10.
 */
export function semanaDeCierre(s: Pick<GameState, 'seasonLength'>): number {
  return s.seasonLength + 3;
}

/** Registra un momento en la historia del club (semana 0 = pretemporada; en los playoffs, su semana real). */
export function logClubEvent(s: GameState, kind: TimelineKind, text: string, week?: number): void {
  const w = week ?? (s.preseason ? 0 : Math.min(s.week, s.seasonLength + 2));
  s.clubTimeline.push({ season: s.seasonNumber, week: w, kind, text });
}

/**
 * La etiqueta corta de una semana en las historias ("Sem 4", "Semis",
 * "Final", "Cierre", "Pretemp."): la misma regla que `fechaLabel`, en corto.
 */
export function fechaCorta(week: number, seasonLength: number): string {
  if (week === 0) return 'Pretemp.';
  if (week <= seasonLength) return `Sem ${week}`;
  if (week === seasonLength + 1) return 'Semis';
  if (week === seasonLength + 2) return 'Final';
  return 'Cierre';
}

/**
 * El nombre de la fecha para un texto que se guarda: 'Semana 4', o
 * 'Semifinales' / 'Finales' en los playoffs. Es la misma regla que `weekLabel`
 * en la UI; acá vive para los momentos memorables, que se escriben una vez y
 * se releen en el cierre ("Semana 11: la ganamos en la hora" era la final).
 */
export function fechaLabel(s: Pick<GameState, 'week' | 'seasonLength'>): string {
  if (s.week <= s.seasonLength) return `Semana ${s.week}`;
  return s.week === s.seasonLength + 1 ? 'Semifinales' : 'Finales';
}

/** Los eventos de una historia, del más reciente al más viejo. */
export function timelineNewestFirst(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].reverse();
}
