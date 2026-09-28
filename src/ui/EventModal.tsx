import type { GameState, Player } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { getEvent } from '../game/events';
import { Avatar } from './Avatar';
import { Busto } from './Busto';
import { weekLabel } from './helpers';
import './modales.css';
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
  cena_propuesta: 'caja',
  cena_tarjetas: 'plata',
  cena_noche: 'asado',
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
 * regla que la fila del plantel del Tablero). El nombre completo queda en el
 * título y en el texto del evento, que siempre lo nombra.
 */
function nombreCorto(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

/**
 * La gente del evento, de pie sobre la línea del parquet (el busto de la fila
 * del Tablero, escala M). El nombre abre su ficha. La gorra de los festejos
 * era del retrato SVG de respaldo; el busto ilustrado es la foto fija.
 */
function Gente({ people, festive }: { people: Player[]; festive?: boolean }) {
  if (people.length === 0) return null;
  return (
    <div className={`evento-gente${people.length > 1 ? ' dos' : ''}`}>
      <span className="evento-gente-piso" aria-hidden="true" />
      {people.map((p) => (
        <div key={p.id} className="evento-persona" title={p.name}>
          {p.personality ? (
            <Busto seed={p.id} personality={p.personality} />
          ) : (
            <span className="evento-avatar">
              <Avatar seed={p.id} age={p.age} appearance={p.appearance} cap={wearsCap(p, !!festive)} title={p.name} size={84} />
            </span>
          )}
          <span className="depie-nom">
            <PlayerLink id={p.id}>{nombreCorto(p.name)}</PlayerLink>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Los eventos de la semana son momentos del mundo, no avisos del sistema: la
 * planilla pegada con cinta, el título escrito a mano, la gente del lío de pie
 * y las opciones como decisiones en renglones. Ninguna opción es «la
 * correcta», así que ninguna va en naranja; el único naranja es «Continuar»
 * después del desenlace.
 */
export function EventModal({ state, dispatch }: Props) {
  if (state.pendingEvent) {
    const ev = state.pendingEvent;
    const def = getEvent(ev.defId);
    const people = [ev.playerId, ev.playerId2]
      .map((id) => state.players.find((p) => p.id === id))
      .filter((p): p is Player => !!p);
    return (
      <div className="modal-backdrop">
        <div className="modal evento v1-planilla" role="dialog" aria-modal="true" aria-label={def.title}>
          <i className="v1-cinta a" />
          <i className="v1-cinta b" />
          <div className="v1-eyebrow evento-eyebrow">
            <Icon name={EVENT_ICONS[def.id] ?? 'destacado'} size={16} />
            Pasó en el club · <b>{weekLabel(state.week, state.seasonLength)}</b>
          </div>
          <h2 className="evento-titulo">{def.title}</h2>
          <div className={`evento-cuerpo${people.length > 0 ? ' con-gente' : ''}`}>
            <Gente people={people} festive={CAP_EVENTS.has(def.id)} />
            <p className="event-text">{def.text(state, ev)}</p>
          </div>
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
        <div className="modal evento desenlace v1-planilla" role="dialog" aria-modal="true" aria-label="Desenlace">
          <i className="v1-cinta a" />
          <div className="v1-eyebrow evento-eyebrow">
            <Icon name="chat" size={16} />
            Cómo terminó
          </div>
          <h2 className="evento-titulo">Desenlace</h2>
          <div className={`evento-cuerpo${people.length > 0 ? ' con-gente' : ''}`}>
            <Gente people={people} />
            <p className="event-text">{state.eventOutcome}</p>
          </div>
          <div className="options">
            {/* Con el foco puesto, Enter o Espacio siguen: el desenlace se lee y se pasa sin ir al mouse. */}
            <button className="primary" autoFocus onClick={() => dispatch({ type: 'DISMISS_EVENT_OUTCOME' })}>
              Continuar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
