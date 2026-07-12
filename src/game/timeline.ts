// Historia personal de los jugadores (y a futuro, del club y las temporadas).

import type { Player, TimelineEvent, TimelineKind } from './types';

/** Registra un momento en la historia de un jugador. */
export function logPlayerEvent(p: Player, season: number, week: number, kind: TimelineKind, text: string): void {
  p.timeline.push({ season, week, kind, text });
}

/** Los eventos de una historia, del más reciente al más viejo. */
export function timelineNewestFirst(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].reverse();
}
