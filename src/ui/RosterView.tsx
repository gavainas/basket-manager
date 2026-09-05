import { useEffect, useState } from 'react';
import type { GameState, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { activePlayers } from '../game/match';
import { CoachCard } from './CoachCard';
import { RosterList } from './RosterList';
import { PlayerLink } from './PlayerLink';
import { RosterSheet } from './RosterSheet';
import { VestuarioCard } from './VestuarioCard';
import type { AppFocus } from './nav';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

/** Preferencia de vista del plantel (del dispositivo, no de la partida). */
const VIEW_KEY = 'bm-roster-view';

/**
 * Cuatro pestañas, no cuatro secciones apiladas (tanda D del marco fijo).
 *
 * Antes esta pantalla era una tira vertical de 2048 px: el panel de contratar DT
 * primero, después el vestuario con su cabecera ilustrada, y recién ahí el
 * plantel — o sea que "Plantilla" abría con todo menos la plantilla, y a 720p
 * había que scrollear dos pantallas y media para ver a un jugador.
 *
 * Son cuatro preguntas distintas sobre el mismo plantel y ninguna necesita a las
 * otras a la vista. Contratar DT, además, es una decisión que se toma una vez por
 * temporada: no puede ocupar el primer tercio de la pantalla todas las semanas.
 */
type RosterTab = 'fichas' | 'planilla' | 'vestuario' | 'cuerpo';

const TABS: { id: RosterTab; label: string; hint: string }[] = [
  { id: 'fichas', label: 'Plantel', hint: 'Quién es cada uno y cómo está' },
  { id: 'planilla', label: 'Estadísticas', hint: 'Minutos, faltas y último partido, ordenable' },
  { id: 'vestuario', label: 'Vestuario', hint: 'Los grupos, los puentes y los roces' },
  { id: 'cuerpo', label: 'Cuerpo técnico', hint: 'Quién dirige' },
];

/** El tile del inicio promete algo concreto: acá se traduce a su pestaña. */
const FOCUS_TAB: Partial<Record<AppFocus, RosterTab>> = {
  vestuario: 'vestuario',
  'cuerpo-tecnico': 'cuerpo',
};

export function RosterView({
  state,
  dispatch,
  focus,
}: {
  state: GameState;
  dispatch: (action: GameAction) => void;
  focus?: AppFocus | null;
}) {
  const [tab, setTab] = useState<RosterTab>(() =>
    localStorage.getItem(VIEW_KEY) === 'planilla' ? 'planilla' : 'fichas'
  );

  // Entrar por el tile "Vestuario" tiene que dejarte en el vestuario.
  useEffect(() => {
    const t = focus ? FOCUS_TAB[focus] : undefined;
    if (t) setTab(t);
  }, [focus]);

  const choose = (v: RosterTab) => {
    setTab(v);
    // Sólo se recuerda la preferencia entre las dos vistas del plantel: volver a
    // entrar y caer en "Cuerpo técnico" sería recordar un viaje, no un gusto.
    if (v === 'fichas' || v === 'planilla') localStorage.setItem(VIEW_KEY, v);
  };

  const active = [...activePlayers(state.players)].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || b.visibleRating - a.visibleRating
  );
  const gone = state.players.filter((p) => p.leftClub);

  return (
    <div className="plantel-pantalla">
      <div className="roster-head">
        <div className="view-toggle">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} title={t.hint} onClick={() => choose(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="muted sobre-lienzo roster-nota">
          {tab === 'fichas' || tab === 'planilla'
            ? 'La valoración (≈) es una estimación: el rendimiento real depende del físico, la motivación, la confianza y el encaje en el equipo. Nadie muestra todas sus cartas.'
            : TABS.find((t) => t.id === tab)!.hint}
        </p>
      </div>

      <div className="plantel-cuerpo">
        {tab === 'fichas' && (
          <>
            <RosterList state={state} players={active} />
            {gone.length > 0 && (
              <>
                <h3 className="section-title">Se fueron del club</h3>
                <div className="muted sobre-lienzo">
                  {gone.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ' · '}
                      <PlayerLink id={p.id}>{p.name}</PlayerLink>
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
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
