import type { GameState } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { computeSeasonEvaluation } from '../game/evaluation';
import { objectiveStatus } from '../game/objectives';
import { BALANCE } from '../game/balance';
import { formatMoney } from './helpers';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function SeasonEndScreen({ state, dispatch }: Props) {
  const ev = computeSeasonEvaluation(state);
  const canContinue = !ev.isGameOver && state.club.money >= BALANCE.economy.inscriptionFee;

  return (
    <div className="season-end">
      <div className="outcome">
        <div style={{ fontSize: '3rem' }}>{ev.isGameOver ? '💥' : ev.position === 1 ? '🏆' : '🏀'}</div>
        <h1>{ev.outcomeTitle}</h1>
        <p>{ev.outcomeText}</p>
        <p className="muted">Temporada {state.seasonNumber}</p>
        <p style={{ marginTop: '0.8rem' }}>
          <span className="chip accent">Posición final: {ev.position}° de 10</span>{' '}
          <span className="chip">Récord: {ev.record}</span>{' '}
          <span className={`chip ${state.club.money >= 0 ? 'good' : 'bad'}`}>Caja: {formatMoney(state.club.money)}</span>
        </p>
      </div>

      <div className="card">
        <h3>Evaluación de la temporada</h3>
        {ev.dimensions.map((d) => {
          const cls = d.score >= 65 ? 'good' : d.score >= 40 ? 'warn' : 'bad';
          return (
            <div className="dim-row" key={d.key}>
              <div>
                <div style={{ fontWeight: 600 }}>{d.label}</div>
                <div className="muted">{d.detail}</div>
              </div>
              <div className="bar-track">
                <div className={`bar-fill ${cls}`} style={{ width: `${d.score}%` }} />
              </div>
              <div className={`dim-grade`} style={{ color: `var(--${cls})` }}>
                {d.grade}
              </div>
            </div>
          );
        })}
      </div>

      {state.objectives.length > 0 && (
        <div className="card">
          <h3>Objetivos de la comisión</h3>
          <ul className="news-list">
            {state.objectives.map((obj) => {
              const met = objectiveStatus(state, obj, true) === 'cumplido';
              return (
                <li key={obj.id}>
                  <span style={{ color: met ? 'var(--good)' : 'var(--bad)', minWidth: 16 }}>{met ? '✔' : '✘'}</span>
                  <span style={{ flex: 1 }}>{obj.label}</span>
                  <span className={`chip ${met ? 'good' : 'bad'}`}>{met ? 'Cumplido' : 'No cumplido'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {state.memorableMoments.length > 0 && (
        <div className="card">
          <h3>Momentos memorables</h3>
          <ul className="reason-list">
            {state.memorableMoments.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="confirm-bar" style={{ justifyContent: 'center' }}>
        {canContinue && (
          <button className="primary" onClick={() => dispatch({ type: 'NEW_SEASON' })}>
            ➡ Seguir con el club: temporada {state.seasonNumber + 1}
          </button>
        )}
        {!ev.isGameOver && !canContinue && (
          <span className="chip bad">
            No alcanza la caja para la inscripción (${BALANCE.economy.inscriptionFee}): el club no puede seguir.
          </span>
        )}
        <button className={canContinue ? '' : 'primary'} onClick={() => dispatch({ type: 'NEW_GAME' })}>
          🔄 Empezar de cero
        </button>
        <button onClick={() => dispatch({ type: 'QUIT_TO_MENU' })}>Volver al menú</button>
      </div>
    </div>
  );
}
