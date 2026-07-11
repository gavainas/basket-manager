import type { GameState } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { formatMoney } from './helpers';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function PreseasonEndScreen({ state, dispatch }: Props) {
  const summary = state.preseason?.summary;
  if (!summary) return null;

  return (
    <div className="season-end">
      <div className="outcome">
        <div style={{ fontSize: '3rem' }}>📋</div>
        <h1>Plantel inscripto</h1>
        <p>La lista quedó cerrada y el club está inscripto en la liga.</p>
        <p className="muted">Temporada {state.seasonNumber} · {summary.rosterNames.length} jugadores</p>
        <p style={{ marginTop: '0.8rem' }}>
          <span className="chip accent">Gastado en pretemporada: {formatMoney(summary.moneySpent)}</span>{' '}
          <span className={`chip ${state.club.money >= 0 ? 'good' : 'bad'}`}>Caja: {formatMoney(state.club.money)}</span>{' '}
          <span className="chip">
            Cuotas: ${summary.projectedWeeklyFees}/sem vs gastos ${summary.projectedWeeklyCosts}/sem
          </span>{' '}
          {summary.scholarships > 0 && <span className="chip accent">Becas otorgadas: {summary.scholarships}</span>}
        </p>
      </div>

      {summary.consequences.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--bad)' }}>
          <h3>Consecuencias del cierre</h3>
          <ul className="reason-list">
            {summary.consequences.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid cols-2">
        <div className="card">
          <h3>Plantel final ({summary.rosterNames.length})</h3>
          <ul className="reason-list">
            {summary.rosterNames.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {summary.emergencyNames.length > 0 && (
            <p className="muted">De emergencia: {summary.emergencyNames.join(', ')}.</p>
          )}
        </div>
        <div className="card">
          {summary.signedNames.length > 0 && (
            <>
              <h3>Fichajes</h3>
              <ul className="reason-list">
                {summary.signedNames.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </>
          )}
          <h3>No siguieron</h3>
          {summary.lostNames.length === 0 ? (
            <p className="muted">Nadie se fue: el grupo entero sigue.</p>
          ) : (
            <ul className="reason-list">
              {summary.lostNames.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {summary.promises.length > 0 && (
        <div className="card">
          <h3>Promesas del club</h3>
          <ul className="reason-list">
            {summary.promises.map((p, i) => (
              <li key={i}>🤝 {p}</li>
            ))}
          </ul>
          <p className="muted" style={{ marginBottom: 0 }}>
            Ojo: los jugadores se acuerdan de lo que se les prometió.
          </p>
        </div>
      )}

      <div className="grid cols-2">
        <div className="card">
          <h3>Fortalezas del plantel</h3>
          {summary.strengths.length === 0 ? (
            <p className="muted">Pocas certezas: habrá que demostrarlo en la cancha.</p>
          ) : (
            <ul className="reason-list">
              {summary.strengths.map((s, i) => (
                <li key={i}>💪 {s}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>Riesgos</h3>
          {summary.risks.length === 0 ? (
            <p className="muted">No se ven riesgos graves. Eso también da un poco de miedo.</p>
          ) : (
            <ul className="reason-list">
              {summary.risks.map((r, i) => (
                <li key={i}>⚠ {r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="confirm-bar" style={{ justifyContent: 'center' }}>
        <button className="primary" onClick={() => dispatch({ type: 'START_SEASON' })}>
          🏀 Comenzar la temporada {state.seasonNumber} →
        </button>
      </div>
    </div>
  );
}
