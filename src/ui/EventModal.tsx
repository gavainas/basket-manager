import type { GameState, Player } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { getEvent } from '../game/events';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { PlayerLink } from './PlayerLink';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

// Ícono por familia de evento (ver design/SOCIAL_UI.md), del set de línea.
const EVENT_ICONS: Record<string, IconName> = {
  minutos: 'reloj',
  discusion: 'rayo',
  cuota_impaga: 'plata',
  sponsor_local: 'caja',
  camiseta_perdida: 'vestuario',
  amigo_talentoso: 'pelota',
  ausencia_clave: 'laburo',
  quiere_abandonar: 'salir',
  lesion_leve: 'enfermeria',
  donacion: 'plata',
  queja_organizacion: 'inscripcion',
  festejo_espontaneo: 'social',
  oferta_rival: 'chat',
  cancha_ocupada: 'gimnasio',
  arbitro_polemico: 'alerta',
  cumpleanos: 'destacado',
  periodista_barrial: 'historia',
  mudanza: 'salir',
  sobrino_socio: 'plantel',
  libreta_vuelve: 'chat',
  comision_aprieta: 'inscripcion',
  racha_barrio: 'social',
  racha_factura: 'historia',
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

/**
 * Debajo de la cara entra el apodo si lo tiene, y si no el apellido (la misma
 * regla que la tira del plantel): el nombre entero se recortaba a "Bruno Aco…"
 * en los 76 px de la ficha. El nombre completo queda en el título y en el
 * texto del evento, que siempre lo nombra.
 */
function nombreCorto(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.split(' ');
  return parts[parts.length - 1];
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
          personality={p.personality}
          seed={p.id}
          age={p.age}
          appearance={p.appearance}
          expressionOverride={expr}
          cap={wearsCap(p, !!festive)}
          title={p.name}
        />
      </div>
      <span title={p.name}><PlayerLink id={p.id}>{nombreCorto(p.name)}</PlayerLink></span>
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
            <div className="event-icon">
              <Icon name={EVENT_ICONS[def.id] ?? 'destacado'} size={30} />
            </div>
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
            <div className="event-icon">
              <Icon name="chat" size={30} />
            </div>
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
            {/* Con el foco puesto, Enter o Espacio siguen: el desenlace se lee y se pasa sin ir al mouse. */}
            <button className="primary" autoFocus onClick={() => dispatch({ type: 'DISMISS_EVENT_OUTCOME' })}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
