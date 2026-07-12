import type { GameState, Player } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { getEvent } from '../game/events';
import { Avatar } from './Avatar';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

// Ícono por familia de evento (ver design/SOCIAL_UI.md). Default: 📣.
const EVENT_ICONS: Record<string, string> = {
  minutos: '⏱',
  discusion: '🗯',
  cuota_impaga: '💸',
  sponsor_local: '🤝',
  camiseta_perdida: '👕',
  amigo_talentoso: '🏀',
  ausencia_clave: '📵',
  quiere_abandonar: '🚪',
  lesion_leve: '🩹',
  donacion: '🎁',
  queja_organizacion: '📋',
  festejo_espontaneo: '🍻',
  oferta_rival: '📞',
  cancha_ocupada: '🔒',
  arbitro_polemico: '🟨',
  cumpleanos: '🎂',
  periodista_barrial: '📰',
  mudanza: '📦',
  sobrino_socio: '🧒',
};

// Eventos festivos: acá la gorra está permitida (nunca en la ficha deportiva).
const CAP_EVENTS = new Set(['festejo_espontaneo', 'cumpleanos']);

/** Gorra sí/no determinística por jugador (~1 de cada 3 en eventos festivos). */
function wearsCap(p: Player, festive: boolean): boolean {
  if (!festive) return false;
  let sum = 0;
  for (let i = 0; i < p.id.length; i++) sum += p.id.charCodeAt(i);
  return sum % 3 === 0;
}

/** La cara del implicado, con la expresión que pide la situación. */
function EventPerson({ p, festive }: { p: Player; festive?: boolean }) {
  const expr = festive
    ? 1
    : p.status === 'molesto' || p.status === 'al_borde'
      ? 2
      : p.status === 'lesionado'
        ? 3
        : undefined;
  return (
    <div className="event-person">
      <div className="avatar">
        <Avatar
          seed={p.id}
          age={p.age}
          appearance={p.appearance}
          expressionOverride={expr}
          cap={wearsCap(p, !!festive)}
          title={p.name}
        />
      </div>
      <span>{p.name}</span>
    </div>
  );
}

export function EventModal({ state, dispatch }: Props) {
  if (state.pendingEvent) {
    const ev = state.pendingEvent;
    const def = getEvent(ev.defId);
    const people = [ev.playerId, ev.playerId2]
      .map((id) => state.players.find((p) => p.id === id))
      .filter((p): p is Player => !!p);
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="event-head">
            <div className="event-icon">{EVENT_ICONS[def.id] ?? '📣'}</div>
            <h2>{def.title}</h2>
          </div>
          {people.length > 0 && (
            <div className="event-people">
              {people.map((p) => (
                <EventPerson key={p.id} p={p} festive={CAP_EVENTS.has(def.id)} />
              ))}
            </div>
          )}
          <p className="event-text">{def.text(state, ev)}</p>
          <div className="options">
            {def.options(state, ev).map((opt, i) => (
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
    const people = (state.eventOutcomePeople ?? [])
      .map((id) => state.players.find((p) => p.id === id))
      .filter((p): p is Player => !!p);
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="event-head">
            <div className="event-icon">💬</div>
            <h2>Desenlace</h2>
          </div>
          {people.length > 0 && (
            <div className="event-people">
              {people.map((p) => (
                <EventPerson key={p.id} p={p} />
              ))}
            </div>
          )}
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
