import { useState } from 'react';
import type { GameState, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { activePlayers } from '../game/match';
import { CoachCard } from './CoachCard';
import { RosterList } from './RosterList';
import { PlayerLink } from './PlayerLink';
import { RosterSheet } from './RosterSheet';
import { VestuarioCard } from './VestuarioCard';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

/** Preferencia de vista del plantel (del dispositivo, no de la partida). */
const VIEW_KEY = 'bm-roster-view';

type RosterViewMode = 'fichas' | 'planilla';

export function RosterView({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const [view, setView] = useState<RosterViewMode>(() =>
    localStorage.getItem(VIEW_KEY) === 'planilla' ? 'planilla' : 'fichas'
  );
  const choose = (v: RosterViewMode) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const active = [...activePlayers(state.players)].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || b.visibleRating - a.visibleRating
  );
  const gone = state.players.filter((p) => p.leftClub);

  return (
    <div>
      {/* Anclas de los tiles del inicio (ver ui/nav.ts): entrar por "Vestuario"
          tiene que dejarte en el vestuario, no arriba de la pantalla. */}
      <div data-focus="cuerpo-tecnico">
        <CoachCard state={state} dispatch={dispatch} />
      </div>
      <div data-focus="vestuario">
        <VestuarioCard state={state} />
      </div>
      <div className="roster-head">
        <p className="muted sobre-lienzo" style={{ marginTop: 0 }}>
          La valoración (≈) es una estimación: el rendimiento real depende del físico, la motivación, la confianza y el
          encaje en el equipo. Nadie muestra todas sus cartas.
        </p>
        <div className="view-toggle">
          {/* "Fichas" pasó a ser la planilla de la dirección D: sigue siendo la
              vista humana (retrato, frase y el "por qué"), pero en renglones.
              La otra es la tabla densa y ordenable de siempre, que contesta otra
              pregunta — minutos, faltas, último partido. */}
          <button className={view === 'fichas' ? 'active' : ''} onClick={() => choose('fichas')}>
            Plantel
          </button>
          <button className={view === 'planilla' ? 'active' : ''} onClick={() => choose('planilla')}>
            Estadísticas
          </button>
        </div>
      </div>
      {view === 'planilla' ? (
        <RosterSheet state={state} />
      ) : (
        <RosterList state={state} players={active} />
      )}
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
    </div>
  );
}
