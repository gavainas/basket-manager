import type { GameState } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { getEvent } from '../game/events';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function EventModal({ state, dispatch }: Props) {
  if (state.pendingEvent) {
    const def = getEvent(state.pendingEvent.defId);
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>📣 {def.title}</h2>
          <p className="event-text">{def.text(state, state.pendingEvent)}</p>
          <div className="options">
            {def.options(state, state.pendingEvent).map((opt, i) => (
              <button key={i} onClick={() => dispatch({ type: 'RESOLVE_EVENT', optionIndex: i })}>
                {opt.label}
                {opt.hint && <span className="opt-hint">{opt.hint}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state.eventOutcome) {
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>Desenlace</h2>
          <p className="event-text">{state.eventOutcome}</p>
          <div className="options">
            <button className="primary" onClick={() => dispatch({ type: 'DISMISS_EVENT_OUTCOME' })}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
