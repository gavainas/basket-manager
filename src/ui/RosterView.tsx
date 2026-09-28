import { useEffect, useState, type ReactNode } from 'react';
import type { GameState, Player, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { activePlayers } from '../game/match';
import { CoachCard } from './CoachCard';
import { estadoPlantel, RosterList } from './RosterList';
import { PlayerLink } from './PlayerLink';
import { RosterSheet } from './RosterSheet';
import { VestuarioCard } from './VestuarioCard';
import type { AppFocus } from './nav';
import './plantel.css';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

/** Preferencia de vista del plantel (del dispositivo, no de la partida). */
const VIEW_KEY = 'bm-roster-view';

/**
 * El plantel (UI V1, sep 2026 — design/UI_V1_GUIA.md). Pasa en el vestuario:
 * la escena de fondo ya es el vestuario del club (ESCENA en App.tsx), así que
 * la pantalla no lleva caja propia ni cabecera ilustrada.
 *
 * Cuatro pestañas, no cuatro secciones apiladas (tanda D del marco fijo): son
 * cuatro preguntas distintas sobre el mismo plantel y ninguna necesita a las
 * otras a la vista. En la V1 las pestañas son texto display tranquilo, como el
 * eyebrow del Tablero, y no una placa de botones: el naranja sólo subraya la
 * elegida. Cada pestaña se arma igual que el Tablero: una planilla (el único
 * panel) y lo secundario escrito en frases sobre la escena.
 */
type RosterTab = 'fichas' | 'planilla' | 'vestuario' | 'cuerpo';

/* Los nombres son exactos a propósito: el script de capturas y los atajos
   los buscan por texto. */
const TABS: { id: RosterTab; label: string; hint: string }[] = [
  { id: 'fichas', label: 'Plantel', hint: 'Quién es cada uno y cómo está' },
  { id: 'planilla', label: 'Estadísticas', hint: 'Minutos, faltas y último partido, ordenable' },
  { id: 'vestuario', label: 'Vestuario', hint: 'Los grupos, los puentes y los roces' },
  { id: 'cuerpo', label: 'Cuerpo técnico', hint: 'Quién dirige' },
];

/** El aviso del Tablero promete algo concreto: acá se traduce a su pestaña. */
const FOCUS_TAB: Partial<Record<AppFocus, RosterTab>> = {
  vestuario: 'vestuario',
  'cuerpo-tecnico': 'cuerpo',
};

function leerVista(): RosterTab {
  try {
    return localStorage.getItem(VIEW_KEY) === 'planilla' ? 'planilla' : 'fichas';
  } catch {
    return 'fichas';
  }
}

export function RosterView({
  state,
  dispatch,
  focus,
}: {
  state: GameState;
  dispatch: (action: GameAction) => void;
  focus?: AppFocus | null;
}) {
  const [tab, setTab] = useState<RosterTab>(leerVista);

  // Entrar por el aviso "Vestuario" tiene que dejarte en el vestuario.
  useEffect(() => {
    const t = focus ? FOCUS_TAB[focus] : undefined;
    if (t) setTab(t);
  }, [focus]);

  const choose = (v: RosterTab) => {
    setTab(v);
    // Sólo se recuerda la preferencia entre las dos vistas del plantel: volver a
    // entrar y caer en "Cuerpo técnico" sería recordar un viaje, no un gusto.
    if (v === 'fichas' || v === 'planilla') {
      try {
        localStorage.setItem(VIEW_KEY, v);
      } catch {
        /* sin almacenamiento: la vista vuelve a la de siempre */
      }
    }
  };

  const active = [...activePlayers(state.players)].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || b.visibleRating - a.visibleRating
  );
  const gone = state.players.filter((p) => p.leftClub);

  return (
    <div className="plantel-pantalla">
      <nav className="plantel-pestanas" aria-label="Secciones del plantel">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`plantel-pestana${tab === t.id ? ' on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            title={t.hint}
            onClick={() => choose(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="plantel-cuerpo">
        {tab === 'fichas' && (
          <div className="pl-hoja">
            <RosterList state={state} players={active} />
            <aside className="pl-margen v1-hero" aria-label="El plantel en frases">
              <ResumenPlantel players={active} gone={gone} />
            </aside>
          </div>
        )}
        {tab === 'planilla' && <RosterSheet state={state} />}
        {tab === 'vestuario' && (
          <div data-focus="vestuario">
            <VestuarioCard state={state} />
          </div>
        )}
        {tab === 'cuerpo' && (
          <div data-focus="cuerpo-tecnico">
            <CoachCard state={state} dispatch={dispatch} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * El margen de la planilla: lo que diría alguien del club mirando la lista.
 * Cuántos son, qué esperan (si se creen titulares más de los que entran, de
 * ahí salen las quejas por minutos), cuántos tienen algo para resolver, el
 * descargo de la valoración y los que ya no están.
 */
function ResumenPlantel({ players, gone }: { players: Player[]; gone: Player[] }) {
  const cuenta = (r: Player['expectedRole']) => players.filter((p) => p.expectedRole === r).length;
  const tit = cuenta('titular');
  const rot = cuenta('rotación');
  const sup = cuenta('suplente');
  const problemas = players
    .map((p) => ({ p, est: estadoPlantel(p) }))
    .filter((x): x is { p: Player; est: NonNullable<ReturnType<typeof estadoPlantel>> } => !!x.est);
  const partes: ReactNode[] = [];
  if (tit) partes.push(<><b>{tit}</b> {tit === 1 ? 'se ve titular' : 'se ven titulares'}</>);
  if (rot) partes.push(<><b>{rot}</b> {rot === 1 ? 'espera minutos' : 'esperan minutos'}</>);
  if (sup) partes.push(<><b>{sup}</b> {sup === 1 ? 'viene a acompañar' : 'vienen a acompañar'}</>);

  return (
    <>
      <div className="v1-eyebrow">El plantel</div>
      <div className="v1-cifra">
        {players.length}
        <small>{players.length === 1 ? 'jugador' : 'jugadores'}</small>
      </div>
      <p className="v1-frase">
        {partes.map((x, i) => (
          <span key={i}>
            {i > 0 && (i === partes.length - 1 ? ' y ' : ', ')}
            {x}
          </span>
        ))}
        .{tit > 5 && <> En la cancha entran cinco: <b className="warn">{tit - 5}</b> van a mirar desde el banco.</>}
      </p>
      <p className="v1-frase">
        {problemas.length === 0 ? (
          <>Nadie con algo para resolver: ni lesiones, ni broncas, ni cuotas atrasadas.</>
        ) : (
          <>
            {problemas.length === 1 ? 'Hay algo para resolver: ' : <><b className="bad">{problemas.length}</b> con algo para resolver: </>}
            {problemas.map(({ p, est }, i) => (
              <span key={p.id}>
                {i > 0 && (i === problemas.length - 1 ? ' y ' : ', ')}
                <PlayerLink id={p.id}>{corto(p.name)}</PlayerLink>{' '}
                <span className={`pl-problema ${est.cls}`}>({est.label.toLowerCase()})</span>
              </span>
            ))}
            .
          </>
        )}
      </p>
      <p className="v1-frase pl-descargo">
        La <b>≈ valoración</b> es una estimación: lo que rinde depende del físico, las ganas y cómo encaja. Nadie
        muestra todas sus cartas.
      </p>
      {gone.length > 0 && (
        <p className="v1-frase">
          Se {gone.length === 1 ? 'fue' : 'fueron'} del club:{' '}
          {gone.map((p, i) => (
            <span key={p.id}>
              {i > 0 && (i === gone.length - 1 ? ' y ' : ', ')}
              <PlayerLink id={p.id}>{p.name}</PlayerLink>
            </span>
          ))}
          .
        </p>
      )}
    </>
  );
}

/** Apodo si tiene; si no, el apellido (como en la fila de pie del Tablero). */
function corto(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}
