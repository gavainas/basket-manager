// Historias del juego: la de cada jugador y la del club.

import type { GameState, Player, TimelineEvent, TimelineKind } from './types';

/** Registra un momento en la historia de un jugador. */
export function logPlayerEvent(p: Player, season: number, week: number, kind: TimelineKind, text: string): void {
  p.timeline.push({ season, week, kind, text });
}

/** Registra un momento en la historia del club (semana 0 = pretemporada). */
export function logClubEvent(s: GameState, kind: TimelineKind, text: string, week?: number): void {
  const w = week ?? (s.preseason ? 0 : Math.min(s.week, s.seasonLength));
  s.clubTimeline.push({ season: s.seasonNumber, week: w, kind, text });
}

/** Los eventos de una historia, del más reciente al más viejo. */
export function timelineNewestFirst(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].reverse();
}
