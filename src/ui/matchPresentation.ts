import { createContext, type Dispatch, type SetStateAction } from 'react';
import { cuartosDe, marcador } from '../game/match';
import { arranqueDelCuarto, jugadasDelCuarto, largoDelTramo } from '../game/relato';
import type { GameState, LiveMatchState } from '../game/types';

/** Compartido por el partido y el pie global. No se guarda como estado de juego. */
export interface Reloj { q: number; t: number; pausa: boolean }
export const MatchClockContext = createContext<{
  reloj: Reloj | null;
  setReloj: Dispatch<SetStateAction<Reloj | null>>;
}>({ reloj: null, setReloj: () => {} });

export function visibleScore(state: GameState, live: LiveMatchState, reloj: Reloj | null) {
  if (!reloj) return marcador(live);
  const visible = jugadasDelCuarto(state, live, reloj.q).filter(j => j.t <= reloj.t);
  const last = visible[visible.length - 1];
  return last ? { f: last.f, a: last.a } : live.quarters.slice(0, reloj.q).reduce((v, q) => ({ f: v.f + q.for, a: v.a + q.against }), { f: 0, a: 0 });
}

/** Interpola sólo datos registrados; nunca aplica cálculos de juego en la UI. */
export function visibleVitals(live: LiveMatchState, reloj: Reloj | null) {
  const current = { minutes: live.minutes, playerFresh: live.playerFresh, rivalFreshness: live.rivalFreshness, onCourt: live.onCourt };
  if (!reloj) return current;
  const q = cuartosDe(live)[reloj.q];
  if (q?.overtime) {
    const remaining = Math.max(0, 5 - (reloj.t - arranqueDelCuarto(live, reloj.q)));
    return { ...current, minutes: Object.fromEntries(live.squad.map(id => [id, Math.max(0, (live.minutes[id] ?? 0) - ((q.onCourt ?? []).includes(id) ? remaining : 0))])) };
  }
  if (!q?.tramos?.length) return current; // cuartos antiguos sin instantáneas
  const relative = Math.max(0, reloj.t - arranqueDelCuarto(live, reloj.q));
  const length = largoDelTramo(q);
  const index = Math.min(q.tramos.length - 1, Math.floor(relative / length));
  const tramo = q.tramos[index];
  const fraction = Math.max(0, Math.min(1, (relative - index * length) / length));
  if (!tramo.presentation) return current;
  const { before, after } = tramo.presentation;
  const blend = (a: number, b: number) => a + (b - a) * fraction;
  const map = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(live.squad.map(id => [id, blend(a[id] ?? b[id] ?? 0, b[id] ?? a[id] ?? 0)]));
  return {
    minutes: map(before.minutes, after.minutes),
    playerFresh: map(before.playerFresh, after.playerFresh),
    rivalFreshness: blend(before.rivalFreshness, after.rivalFreshness),
    onCourt: fraction < 1 ? tramo.onCourt : live.onCourt,
  };
}
