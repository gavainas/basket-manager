/**
 * Cómo se juega una partida sin pantalla.
 *
 * Los tests recorren el juego por el mismo camino que la UI: despachan
 * acciones al reducer. Así, si una fase deja de aceptar la acción que la
 * sigue, el test se cae igual que se caería el jugador. Las funciones del
 * motor se llaman directo sólo cuando hace falta armar un estado a mano.
 */
import { createNewGame } from '../src/game/week';
import { gameReducer, type GameAction } from '../src/state/gameReducer';
import type { GameState } from '../src/game/types';

/** Despacha y exige que el estado siga existiendo (el reducer devuelve null sólo al salir al menú). */
export function paso(s: GameState, action: GameAction): GameState {
  const next = gameReducer(s, action);
  if (!next) throw new Error(`El reducer devolvió null ante ${action.type}`);
  return next;
}

/** Nueva partida con semilla fija, cargada como la cargaría "Continuar". */
export function partidaNueva(seed: number): GameState {
  return paso(null as unknown as GameState, { type: 'LOAD', state: createNewGame(seed) });
}

/** Cierra el evento pendiente (si hay) eligiendo siempre la primera opción. */
export function resolverEventos(s: GameState): GameState {
  let guard = 0;
  while (s.pendingEvent) {
    if (++guard > 10) throw new Error('los eventos no terminan nunca');
    s = paso(s, { type: 'RESOLVE_EVENT', optionIndex: 0 });
    s = paso(s, { type: 'DISMISS_EVENT_OUTCOME' });
  }
  return s;
}

/** Del partido en curso hasta el pitazo final, resolviendo las incidencias con la primera opción. */
export function jugarPartidoEntero(s: GameState): GameState {
  let guard = 0;
  while (s.live && !s.live.finished) {
    if (++guard > 40) throw new Error('el partido no termina nunca');
    s = s.live.pendingIncident ? paso(s, { type: 'INCIDENT_CHOICE', index: 0 }) : paso(s, { type: 'PLAY_QUARTER' });
  }
  return s;
}

/**
 * Una fecha completa, de la planificación al cierre de la semana: sin acciones
 * del club, quinteto sugerido, tácticas por defecto. Devuelve el estado en la
 * planificación de la semana siguiente (o en el cierre de temporada / game over).
 */
export function jugarFecha(s: GameState): GameState {
  s = resolverEventos(s);
  if (s.phase !== 'planning') throw new Error(`jugarFecha esperaba 'planning' y encontró '${s.phase}'`);
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  if (s.phase !== 'callUp') throw new Error(`después de confirmar esperaba 'callUp' y encontró '${s.phase}'`);
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  s = paso(s, { type: 'START_MATCH' });
  if (s.phase === 'match') {
    s = jugarPartidoEntero(s);
    s = paso(s, { type: 'FINISH_MATCH' });
  }
  if (s.phase !== 'matchResult') throw new Error(`después del partido esperaba 'matchResult' y encontró '${s.phase}'`);
  return paso(s, { type: 'NEXT_WEEK' });
}

/** La temporada entera (fase regular y playoffs) hasta el cierre o el game over. */
export function jugarTemporada(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== 'seasonEnd' && s.phase !== 'gameOver') {
    if (++guard > 40) throw new Error('la temporada no termina nunca');
    s = jugarFecha(s);
  }
  return s;
}
