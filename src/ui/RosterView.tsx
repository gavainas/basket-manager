import type { GameState, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { activePlayers } from '../game/match';
import { CoachCard } from './CoachCard';
import { PlayerCard } from './PlayerCard';
import { PlayerLink } from './PlayerLink';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

export function RosterView({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const active = [...activePlayers(state.players)].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || b.visibleRating - a.visibleRating
  );
  const gone = state.players.filter((p) => p.leftClub);

  return (
    <div>
      <CoachCard state={state} dispatch={dispatch} />
      <p className="muted" style={{ marginTop: 0 }}>
        La valoración (≈) es una estimación: el rendimiento real depende del físico, la motivación, la confianza y el
        encaje en el equipo. Nadie muestra todas sus cartas.
      </p>
      <div className="player-grid">
        {active.map((p) => (
          <PlayerCard key={p.id} player={p} state={state} mvpCount={state.history.filter((m) => m.mvpId === p.id).length} />
        ))}
      </div>
      {gone.length > 0 && (
        <>
          <h3 className="section-title">Se fueron del club</h3>
          <div className="muted">
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
