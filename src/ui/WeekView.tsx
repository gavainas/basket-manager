import type { GameState, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { ACTIONS } from '../game/actions';
import { BALANCE } from '../game/balance';
import { evaluateTeam, isSelectable, minutesPlan } from '../game/match';
import { PlayerCard } from './PlayerCard';
import { rivalDifficulty } from './helpers';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

function Steps({ phase }: { phase: GameState['phase'] }) {
  const steps = [
    { key: 'planning', label: '1 · Decisiones' },
    { key: 'lineup', label: '2 · Quinteto' },
    { key: 'matchResult', label: '3 · Partido' },
  ];
  const order = ['planning', 'lineup', 'matchResult'];
  const current = order.indexOf(phase);
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <span key={s.key} className={`step ${i === current ? 'active' : i < current ? 'done' : ''}`}>
          {s.label}
        </span>
      ))}
    </div>
  );
}

function PlanningPanel({ state, dispatch }: Props) {
  const max = BALANCE.actions.maxPerWeek;
  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Elegí hasta {max} acciones para esta semana. Cada una tiene costos, beneficios y algún riesgo.
      </p>
      <div className="action-grid">
        {ACTIONS.map((a) => {
          const check = a.available(state);
          const selected = state.actionsChosen.includes(a.id);
          const blocked = !check.ok && !selected;
          const full = !selected && state.actionsChosen.length >= max;
          return (
            <div
              key={a.id}
              className={`action-card${selected ? ' selected' : ''}${blocked || full ? ' disabled' : ''}`}
              onClick={() => {
                if (!blocked && !full) dispatch({ type: 'TOGGLE_ACTION', id: a.id });
                else if (selected) dispatch({ type: 'TOGGLE_ACTION', id: a.id });
              }}
            >
              <div className="action-title">
                {a.icon} {a.name}
              </div>
              <div className="action-desc">{a.description}</div>
              {blocked ? (
                <div className="action-blocked">⛔ {check.reason}</div>
              ) : (
                <div className="action-cost">{a.costLabel}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="confirm-bar">
        <button className="primary" onClick={() => dispatch({ type: 'CONFIRM_ACTIONS' })}>
          {state.actionsChosen.length > 0
            ? `Confirmar ${state.actionsChosen.length === 1 ? '1 acción' : `${state.actionsChosen.length} acciones`} y armar quinteto →`
            : 'No hacer nada esta semana y armar quinteto →'}
        </button>
        <span className="hint">
          {state.actionsChosen.length}/{max} acciones elegidas
        </span>
      </div>
    </div>
  );
}

function LineupPanel({ state, dispatch }: Props) {
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1])!;
  const selectable = state.players.filter(isSelectable);
  const sorted = [...selectable].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || b.visibleRating - a.visibleRating
  );
  const count = state.starters.length;
  const canPlay = count === 5;
  const forfeitRisk = selectable.length < 5;

  const rotationIds = state.rotation.filter(
    (id) => !state.starters.includes(id) && selectable.some((p) => p.id === id)
  );
  const { starterMinutes, subMinutes } = minutesPlan(rotationIds.length);
  const maxRotation = BALANCE.rotation.maxPlayers;

  const covered = new Set(
    state.players.filter((p) => state.starters.includes(p.id)).map((p) => p.position)
  );
  const missing = POSITION_ORDER.filter((pos) => !covered.has(pos));

  const evalTeam = count > 0 ? evaluateTeam(state, state.starters) : null;
  const vibe =
    evalTeam === null
      ? ''
      : evalTeam.strength > rival.strength + 6
        ? 'El quinteto se ve superior al rival.'
        : evalTeam.strength > rival.strength - 6
          ? 'Se viene un partido parejo.'
          : 'El rival parece más fuerte: habrá que correr el doble.';

  return (
    <div>
      {state.actionsLog.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Resultado de tus decisiones</h3>
          <ul className="log-list">
            {state.actionsLog.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>
          Partido de la semana {state.week}: vs {rival.name}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
          <span className={`chip ${count === 5 ? 'good' : 'warn'}`}>Titulares: {count}/5</span>
          <span className={`chip ${rotationIds.length > 0 ? 'good' : 'warn'}`}>
            Rotación: {rotationIds.length}/{maxRotation}
          </span>
          <span className="chip">
            Minutos: titulares ~{starterMinutes}' {rotationIds.length > 0 ? `· rotación ~${subMinutes}'` : ''}
          </span>
          {missing.length > 0 && count === 5 && (
            <span className="chip warn">Sin {missing.join(', ')} natural</span>
          )}
          {count === 5 && missing.length === 0 && <span className="chip good">Todas las posiciones cubiertas</span>}
        </div>
        {vibe && <p className="muted" style={{ marginBottom: 0 }}>{vibe}</p>}
        {count === 5 && rotationIds.length === 0 && (
          <p className="muted" style={{ marginBottom: 0, color: 'var(--warn)' }}>
            Sin rotación los titulares juegan los 40 minutos: rinden menos al final y se desgastan mucho más.
          </p>
        )}
      </div>

      {forfeitRisk && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--bad)' }}>
            Solo hay {selectable.length} jugadores disponibles: no llega a 5. Si jugás así, se pierde por forfeit.
          </strong>
        </div>
      )}

      <div className="player-grid">
        {sorted.map((p) => {
          const isStarter = state.starters.includes(p.id);
          const inRotation = rotationIds.includes(p.id);
          const lineupFull = count >= 5 && !isStarter;
          const rotationFull = rotationIds.length >= maxRotation;
          const onToggle = !lineupFull
            ? (id: string) => dispatch({ type: 'TOGGLE_STARTER', id })
            : inRotation || !rotationFull
              ? (id: string) => dispatch({ type: 'TOGGLE_ROTATION', id })
              : undefined;
          return (
            <PlayerCard
              key={p.id}
              player={p}
              selectable
              compact
              selected={isStarter}
              inRotation={inRotation}
              dimmed={lineupFull && rotationFull && !inRotation}
              onToggle={onToggle}
            />
          );
        })}
      </div>

      <div className="confirm-bar">
        <button
          className="primary"
          disabled={!canPlay && !forfeitRisk}
          onClick={() => dispatch({ type: 'PLAY_MATCH' })}
        >
          {forfeitRisk ? 'Presentarse igual (forfeit) →' : '🏀 Jugar el partido →'}
        </button>
        {!canPlay && !forfeitRisk && <span className="hint">Elegí exactamente 5 titulares.</span>}
        {canPlay && (
          <span className="hint">
            Con el quinteto completo, tocá a los demás para sumarlos o sacarlos de la rotación (~{BALANCE.rotation.minutesPerSub}
            &apos; cada uno). Para cambiar un titular, primero sacalo.
          </span>
        )}
      </div>
    </div>
  );
}

function MatchResultPanel({ state, dispatch }: Props) {
  const m = state.lastMatch;
  if (!m) return null;
  const isLastWeek = state.week >= state.seasonLength;

  return (
    <div>
      <div className="card">
        <div style={{ textAlign: 'center' }}>
          <span className={`result-badge ${m.won ? 'win' : 'lose'}`}>
            {m.forfeit ? 'FORFEIT' : m.won ? 'VICTORIA' : 'DERROTA'}
          </span>
        </div>
        <div className="scoreboard">
          <div className="team">
            <div className="tname">{state.club.name}</div>
            <div className={`score ${m.won ? 'win' : 'lose'}`}>{m.scoreFor}</div>
          </div>
          <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>vs</div>
          <div className="team">
            <div className="tname">{m.rivalName}</div>
            <div className={`score ${m.won ? 'lose' : 'win'}`}>{m.scoreAgainst}</div>
          </div>
        </div>
        {m.quarters.length > 0 && (
          <div className="table-wrap" style={{ maxWidth: 420, margin: '0 auto 0.8rem' }}>
            <table>
              <thead>
                <tr>
                  <th></th>
                  {m.quarters.map((_, i) => (
                    <th className="num" key={i}>
                      Q{i + 1}
                    </th>
                  ))}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Nosotros</td>
                  {m.quarters.map((q, i) => (
                    <td className="num" key={i}>
                      {q.for}
                    </td>
                  ))}
                  <td className="num" style={{ fontWeight: 700 }}>
                    {m.scoreFor}
                  </td>
                </tr>
                <tr>
                  <td>{m.rivalName}</td>
                  {m.quarters.map((q, i) => (
                    <td className="num" key={i}>
                      {q.against}
                    </td>
                  ))}
                  <td className="num" style={{ fontWeight: 700 }}>
                    {m.scoreAgainst}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p style={{ textAlign: 'center', marginTop: 0 }}>{m.summary}</p>
        {m.mvpName && (
          <p style={{ textAlign: 'center' }}>
            <span className="chip accent">⭐ Mejor jugador: {m.mvpName}</span>
          </p>
        )}
      </div>

      {m.highlights.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>El relato del partido</h3>
          <ul className="reason-list">
            {m.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid cols-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <h3>Claves del resultado</h3>
          <ul className="reason-list">
            {m.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Consecuencias</h3>
          <ul className="reason-list">
            {m.effects.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      </div>

      {m.lockerRoom.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>En el vestuario</h3>
          <ul className="reason-list">
            {m.lockerRoom.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="confirm-bar">
        <button className="primary" onClick={() => dispatch({ type: 'NEXT_WEEK' })}>
          {isLastWeek ? 'Cerrar la temporada →' : `Avanzar a la semana ${state.week + 1} →`}
        </button>
      </div>
    </div>
  );
}

export function WeekView({ state, dispatch }: Props) {
  return (
    <div>
      <Steps phase={state.phase} />
      {state.phase === 'planning' && <PlanningPanel state={state} dispatch={dispatch} />}
      {state.phase === 'lineup' && <LineupPanel state={state} dispatch={dispatch} />}
      {state.phase === 'matchResult' && <MatchResultPanel state={state} dispatch={dispatch} />}
    </div>
  );
}
