import type { GameState } from './types';

/** Fechas relativas al partido: las gestiones se resuelven antes de pasar lista. */
export function weekTimeline(state: Pick<GameState, 'phase' | 'callUpTiming' | 'actionsChosen' | 'lastAsado' | 'week'>) {
  const callUpOffset = state.callUpTiming === 'tarde' ? 0 : -2;
  const todayOffset = state.phase === 'planning' ? -3 : state.phase === 'callUp' ? callUpOffset : 0;
  const asadoDone = state.lastAsado?.week === state.week;
  return {
    todayOffset,
    callUpOffset,
    callUpLabel: state.phase === 'planning' ? 'Pasar lista' : 'Lista enviada',
    asadoOffset: state.actionsChosen.includes('asado') || asadoDone ? -3 : null,
    asadoLabel: asadoDone ? 'Asado realizado' : 'Asado previsto',
  };
}
