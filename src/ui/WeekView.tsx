import { useState } from 'react';
import type { GameState, Player, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { ABSENCE_ACTIONS, reasonById } from '../game/absences';
import { ACTIONS } from '../game/actions';
import { BALANCE } from '../game/balance';
import { courtFreshness, evaluateTeam, isSelectable } from '../game/match';
import { Bar } from './Bar';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { ScoutingCard } from './ScoutingCard';
import { Tip, TIPS } from './Tip';
import { initials, rivalDifficulty, rivalStyleInfo, starsFor, weekLabel } from './helpers';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
const POS_ABBR: Record<Position, string> = {
  Base: 'BA',
  Escolta: 'ES',
  Alero: 'AL',
  'Ala-Pívot': 'AP',
  Pívot: 'PI',
};
const Q_LABELS = ['1er', '2do', '3er', '4to'];

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

function shortName(name: string): string {
  const parts = name.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/);
  return parts[parts.length - 1];
}

function absentIds(state: GameState): Set<string> {
  return new Set(state.callUp.filter((c) => c.status === 'ausente').map((c) => c.playerId));
}

function Steps({ phase }: { phase: GameState['phase'] }) {
  const steps = [
    { key: 'planning', label: '1 · Decisiones' },
    { key: 'callUp', label: '2 · Convocatoria' },
    { key: 'lineup', label: '3 · Quinteto' },
    { key: 'match', label: '4 · Partido' },
    { key: 'matchResult', label: '5 · Informe' },
  ];
  const order = steps.map((s) => s.key);
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
            ? `Confirmar ${state.actionsChosen.length === 1 ? '1 acción' : `${state.actionsChosen.length} acciones`} y pasar lista →`
            : 'No hacer nada esta semana y pasar lista →'}
        </button>
        <span className="hint">
          {state.actionsChosen.length}/{max} acciones elegidas
        </span>
      </div>
    </div>
  );
}

function CallUpPanel({ state, dispatch }: Props) {
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1])!;
  const entries = state.callUp;
  const outs = entries.filter((e) => e.status !== 'confirmado');
  const confirmed = entries.filter((e) => e.status === 'confirmado');
  const stillInjured = state.players.filter(
    (p) => !p.leftClub && p.status === 'lesionado' && !entries.some((e) => e.playerId === p.id)
  );
  const availableCount = confirmed.length;

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

      <div className="card">
        <h3>
          Pasando lista · {weekLabel(state.week, state.seasonLength)} vs <RivalLink id={rival.id}>{rival.name}</RivalLink>
        </h3>
        {outs.length === 0 && stillInjured.length === 0 ? (
          <p style={{ marginTop: 0 }}>
            ✅ <strong>Vinieron todos.</strong> Semana tranquila: el grupo está entero para el partido.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            {availableCount} confirmado{availableCount !== 1 ? 's' : ''} ·{' '}
            {outs.length + stillInjured.length} baja{outs.length + stillInjured.length !== 1 ? 's' : ''}
          </p>
        )}

        {(outs.length > 0 || stillInjured.length > 0) && (
          <div className="callup-list">
            {outs.map((e) => {
              const reason = e.reasonId ? reasonById(e.reasonId) : undefined;
              const canAct = e.status === 'ausente' && reason && !e.resolved;
              return (
                <div key={e.playerId} className="callup-row out">
                  <span className="callup-icon">{e.status === 'lesionado' ? '🚑' : e.lateArrival ? '🕘' : '❌'}</span>
                  <div style={{ flex: 1 }}>
                    <div className="callup-name">
                      <PlayerLink id={e.playerId}>{e.playerName}</PlayerLink>
                      <span
                        className={`chip ${e.status === 'lesionado' ? 'bad' : e.lateArrival ? 'warn' : e.status === 'confirmado' ? 'good' : 'warn'}`}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        {e.status === 'lesionado'
                          ? 'Se lesionó afuera'
                          : e.lateArrival
                            ? 'Llega al 2do tiempo'
                            : e.status === 'confirmado'
                              ? 'Al final viene'
                              : 'No viene'}
                      </span>
                    </div>
                    {e.note && <div className="callup-note">{e.note}</div>}
                    {e.resolution && (
                      <div className="callup-note" style={{ color: 'var(--text)', fontStyle: 'normal' }}>
                        → {e.resolution}
                      </div>
                    )}
                    {canAct && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                        {[...reason.actions, 'aceptar' as const].map((actionId) => {
                          const def = ABSENCE_ACTIONS[actionId];
                          const noMoney = def.cost > 0 && state.club.money < def.cost;
                          return (
                            <button
                              key={actionId}
                              className="small"
                              disabled={noMoney}
                              title={def.hint + (def.cost > 0 ? ` (cuesta $${def.cost})` : '')}
                              onClick={() => dispatch({ type: 'CALLUP_ACTION', playerId: e.playerId, actionId })}
                            >
                              {def.label}
                              {def.cost > 0 ? ` ($${def.cost})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {stillInjured.map((p) => (
              <div key={p.id} className="callup-row out dim">
                <span className="callup-icon">🚑</span>
                <div>
                  <div className="callup-name">
                    <PlayerLink id={p.id}>{p.name}</PlayerLink>
                  </div>
                  <div className="callup-note">
                    Sigue lesionado: le queda{p.injuryWeeks > 1 ? 'n' : ''} {p.injuryWeeks} semana
                    {p.injuryWeeks > 1 ? 's' : ''}.
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {confirmed.length > 0 && (
          <div className="callup-confirmed">
            {confirmed.map((e) => (
              <span key={e.playerId} className="chip good">
                ✓ {e.playerName}
              </span>
            ))}
          </div>
        )}

        {availableCount < 5 && (
          <p style={{ color: 'var(--bad)', fontWeight: 700 }}>
            Solo {availableCount} disponibles: no llega a 5. Si se juega así, se pierde por forfeit.
          </p>
        )}
      </div>

      <div className="confirm-bar">
        <button className="primary" onClick={() => dispatch({ type: 'PROCEED_TO_LINEUP' })}>
          Armar el quinteto →
        </button>
      </div>
    </div>
  );
}

/** Asigna los titulares a los 5 puestos de la pizarra (primero por posición natural). */
function assignSlots(starters: Player[]): (Player | null)[] {
  const slots: (Player | null)[] = [null, null, null, null, null];
  const remaining = [...starters];
  POSITION_ORDER.forEach((pos, i) => {
    const idx = remaining.findIndex((p) => p.position === pos);
    if (idx >= 0) {
      slots[i] = remaining[idx];
      remaining.splice(idx, 1);
    }
  });
  for (let i = 0; i < 5 && remaining.length > 0; i++) {
    if (!slots[i]) slots[i] = remaining.shift()!;
  }
  return slots;
}

// Disposición simétrica: dos internos abajo, dos perimetrales y el base arriba.
const SLOT_POS = [
  { x: '50%', y: '82%' }, // Base
  { x: '22%', y: '58%' }, // Escolta
  { x: '78%', y: '58%' }, // Alero
  { x: '26%', y: '27%' }, // Ala-Pívot
  { x: '74%', y: '27%' }, // Pívot
];

function CourtLines() {
  return (
    <svg className="court-lines" viewBox="0 0 300 340" preserveAspectRatio="none">
      <rect x="4" y="4" width="292" height="332" rx="10" />
      <rect x="110" y="4" width="80" height="106" />
      <circle cx="150" cy="110" r="34" />
      <line x1="132" y1="18" x2="168" y2="18" />
      <circle cx="150" cy="28" r="6" />
      <path d="M 30 4 L 30 62 A 128 128 0 0 0 270 62 L 270 4" />
      <path d="M 110 336 A 40 40 0 0 1 190 336" />
    </svg>
  );
}

function LineupPanel({ state, dispatch }: Props) {
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1])!;
  const absent = absentIds(state);
  const roster = state.players.filter((p) => !p.leftClub);
  const available = roster.filter((p) => isSelectable(p) && !absent.has(p.id));
  const sorted = [...roster].sort((a, b) => {
    const availA = isSelectable(a) && !absent.has(a.id) ? 0 : 1;
    const availB = isSelectable(b) && !absent.has(b.id) ? 0 : 1;
    return (
      availA - availB ||
      POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) ||
      b.visibleRating - a.visibleRating
    );
  });

  const starters = state.players.filter((p) => state.starters.includes(p.id));
  const count = starters.length;
  const canPlay = count === 5;
  const forfeitRisk = available.length < 5;

  const rotationIds = state.rotation.filter(
    (id) => !state.starters.includes(id) && available.some((p) => p.id === id)
  );
  const rotPlayers = rotationIds
    .map((id) => state.players.find((p) => p.id === id)!)
    .filter(Boolean);
  const maxRotation = BALANCE.rotation.maxPlayers;

  const covered = new Set(starters.map((p) => p.position));
  const missing = POSITION_ORDER.filter((pos) => !covered.has(pos));
  const slots = assignSlots(starters);

  // Drag & drop: el id viaja en el dataTransfer; los guards viven en el reducer.
  const dragStart = (id: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const draggedId = (e: React.DragEvent) => e.dataTransfer.getData('text/plain');
  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const dropOnSlot = (occupant: Player | null) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = draggedId(e);
    if (!id || occupant?.id === id || state.starters.includes(id)) return;
    if (occupant) dispatch({ type: 'TOGGLE_STARTER', id: occupant.id });
    dispatch({ type: 'TOGGLE_STARTER', id });
  };
  const dropOnBench = (e: React.DragEvent) => {
    e.preventDefault();
    const id = draggedId(e);
    if (!id) return;
    if (state.starters.includes(id)) dispatch({ type: 'TOGGLE_STARTER', id });
    if (!state.rotation.includes(id)) dispatch({ type: 'TOGGLE_ROTATION', id });
  };
  const dropOnList = (e: React.DragEvent) => {
    e.preventDefault();
    const id = draggedId(e);
    if (!id) return;
    if (state.starters.includes(id)) dispatch({ type: 'TOGGLE_STARTER', id });
    else if (state.rotation.includes(id)) dispatch({ type: 'TOGGLE_ROTATION', id });
  };

  const evalTeam = count > 0 ? evaluateTeam(state, state.starters) : null;
  const vibe =
    evalTeam === null
      ? ''
      : evalTeam.strength > rival.strength + 6
        ? 'El quinteto se ve superior al rival.'
        : evalTeam.strength > rival.strength - 6
          ? 'Se viene un partido parejo.'
          : 'El rival parece más fuerte: habrá que correr el doble.';
  const style = rivalStyleInfo(rival.style);

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>
          {weekLabel(state.week, state.seasonLength)} · vs <RivalLink id={rival.id}>{rival.name}</RivalLink>
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
          <span className="chip accent" title={style.desc}>
            {style.label}
          </span>
          <Tip text={TIPS.titulares}>
            <span className={`chip ${count === 5 ? 'good' : 'warn'}`}>Titulares: {count}/5</span>
          </Tip>
          <Tip text={TIPS.banco}>
            <span className={`chip ${rotationIds.length > 0 ? 'good' : 'warn'}`}>
              Banco: {rotationIds.length}/{maxRotation}
            </span>
          </Tip>
          {missing.length > 0 && count === 5 && <span className="chip warn">Sin {missing.join(', ')} natural</span>}
          {count === 5 && missing.length === 0 && <span className="chip good">Todas las posiciones cubiertas</span>}
        </div>
        {vibe && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {vibe} <span title={style.desc}>({style.label.replace(/^\S+\s/, '')}: {style.desc.toLowerCase()})</span>
          </p>
        )}
        {count === 5 && rotationIds.length === 0 && (
          <p className="muted" style={{ marginBottom: 0, color: 'var(--warn)' }}>
            Sin banco no hay cambios: los cinco juegan los 40 minutos, llegan fundidos al final y se desgastan mucho más.
          </p>
        )}
      </div>

      {forfeitRisk && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--bad)' }}>
            Solo hay {available.length} jugadores disponibles: no llega a 5. Si jugás así, se pierde por forfeit.
          </strong>
        </div>
      )}

      <ScoutingCard state={state} />

      <div className="lineup-layout">
        <div className="lineup-list card" onDragOver={allowDrop} onDrop={dropOnList}>
          <div className="lineup-toolbar">
            <h3 style={{ margin: 0 }}>Plantel</h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="small" onClick={() => dispatch({ type: 'AUTO_LINEUP' })}>
                ⚡ Sugerir
              </button>
              <button className="small" onClick={() => dispatch({ type: 'CLEAR_LINEUP' })}>
                Limpiar
              </button>
            </div>
          </div>
          {sorted.map((p) => {
            const avail = isSelectable(p) && !absent.has(p.id);
            const isStarter = state.starters.includes(p.id);
            const inRotation = rotationIds.includes(p.id);
            const starterFull = count >= 5 && !isStarter;
            const rotationFull = rotationIds.length >= maxRotation && !inRotation;
            return (
              <div
                key={p.id}
                className={`lp-row${isStarter ? ' starter' : ''}${inRotation ? ' rot' : ''}${!avail ? ' off' : ''}`}
                draggable={avail}
                onDragStart={avail ? dragStart(p.id) : undefined}
              >
                <span className="lp-pos">{POS_ABBR[p.position]}</span>
                <div className="lp-who">
                  <div className="lp-name">
                    <PlayerLink id={p.id}>{p.name}</PlayerLink>
                    {!avail && (
                      <span className="chip bad" style={{ marginLeft: '0.4rem' }}>
                        {absent.has(p.id) ? 'No vino' : p.status === 'lesionado' ? `Lesión ${p.injuryWeeks} sem.` : 'No disponible'}
                      </span>
                    )}
                    {avail && p.status === 'molesto' && (
                      <span className="chip warn" style={{ marginLeft: '0.4rem' }}>
                        Molesto
                      </span>
                    )}
                    {avail && p.status === 'al_borde' && (
                      <span className="chip bad" style={{ marginLeft: '0.4rem' }}>
                        Al borde
                      </span>
                    )}
                  </div>
                  <div className="lp-meta">
                    <span title="Físico">💪 {Math.round(p.physical)}</span>
                    <span title="Motivación">🔥 {Math.round(p.motivation)}</span>
                    {p.lastRating !== null && <span title="Último partido">Últ. {p.lastRating}/10</span>}
                  </div>
                </div>
                <div className="lp-rating">
                  <div className="num">≈{p.visibleRating}</div>
                  <div className="stars">{starsFor(p.visibleRating)}</div>
                </div>
                <div className="lp-btns">
                  <button
                    className={`mini${isStarter ? ' on' : ''}`}
                    title="Titular"
                    disabled={!avail || (starterFull && !isStarter)}
                    onClick={() => dispatch({ type: 'TOGGLE_STARTER', id: p.id })}
                  >
                    T
                  </button>
                  <button
                    className={`mini blue${inRotation ? ' on' : ''}`}
                    title="Rotación (banco)"
                    disabled={!avail || isStarter || rotationFull}
                    onClick={() => dispatch({ type: 'TOGGLE_ROTATION', id: p.id })}
                  >
                    R
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lineup-court card">
          <h3>La pizarra</h3>
          <div className="court">
            <CourtLines />
            {POSITION_ORDER.map((pos, i) => {
              const pl = slots[i];
              const oop = pl ? pl.position !== pos : false;
              return (
                <div
                  key={pos}
                  className={`slot${pl ? ' filled' : ''}`}
                  style={{ left: SLOT_POS[i].x, top: SLOT_POS[i].y }}
                  onClick={pl ? () => dispatch({ type: 'TOGGLE_STARTER', id: pl.id }) : undefined}
                  onDragOver={allowDrop}
                  onDrop={dropOnSlot(pl)}
                  draggable={!!pl}
                  onDragStart={pl ? dragStart(pl.id) : undefined}
                  title={
                    pl
                      ? `${pl.name}${oop ? ` (${pl.position} jugando de ${pos})` : ''} · click para sacarlo`
                      : `Arrastrá un jugador para el puesto de ${pos}`
                  }
                >
                  <div className="slot-pos-label">{pos}</div>
                  <div className={`slot-avatar${oop ? ' oop' : ''}${pl ? '' : ' empty'}`}>
                    {pl ? initials(pl.name) : '+'}
                  </div>
                  <div className={`slot-name${pl ? '' : ' dim'}`}>{pl ? shortName(pl.name) : 'Libre'}</div>
                  {pl && (
                    <div className={`slot-sub${oop ? ' oop-text' : ''}`}>
                      ≈{pl.visibleRating}
                      {oop ? ` · es ${pl.position}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="bench" onDragOver={allowDrop} onDrop={dropOnBench}>
            <span className="bench-label">Banco ({rotPlayers.length}/{maxRotation}):</span>
            {rotPlayers.map((p) => (
              <div
                key={p.id}
                className="bench-slot"
                title={`${p.name} (${p.position}) · click para sacarlo`}
                onClick={() => dispatch({ type: 'TOGGLE_ROTATION', id: p.id })}
                draggable
                onDragStart={dragStart(p.id)}
              >
                <div className="slot-avatar small">{initials(p.name)}</div>
                <div className="slot-name">{shortName(p.name)}</div>
                <div className="slot-sub">{POS_ABBR[p.position]}</div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, maxRotation - rotPlayers.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bench-slot dim">
                <div className="slot-avatar small empty">·</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="confirm-bar">
        <button
          className="primary"
          disabled={!canPlay && !forfeitRisk}
          onClick={() => dispatch({ type: 'START_MATCH' })}
        >
          {forfeitRisk && !canPlay ? 'Presentarse igual (forfeit) →' : '🏀 Ir al partido →'}
        </button>
        {!canPlay && !forfeitRisk && <span className="hint">Elegí exactamente 5 titulares (botón T).</span>}
        {canPlay && (
          <span className="hint">
            Arrastrá jugadores a los puestos de la cancha o al banco (también sirven los botones T/R). Click en la
            pizarra para sacar.
          </span>
        )}
      </div>
    </div>
  );
}

function LiveMatchPanel({ state, dispatch }: Props) {
  const [outSel, setOutSel] = useState<string | null>(null);
  const live = state.live;
  if (!live) return null;
  const rival = state.rivals.find((r) => r.id === live.rivalId)!;
  const style = rivalStyleInfo(rival.style);
  const played = live.quarters;
  const regularPlayed = played.filter((q) => !q.overtime).length;
  const totalFor = played.reduce((t, q) => t + q.for, 0);
  const totalAgainst = played.reduce((t, q) => t + q.against, 0);
  const diff = totalFor - totalAgainst;
  const isHalftime = regularPlayed === 2 && !live.finished;
  const hasOT = played.some((q) => q.overtime);

  const scoreLine =
    played.length === 0
      ? 'Todo listo para la presentación.'
      : live.finished
        ? diff > 0
          ? `Final: victoria por ${diff}.`
          : `Final: derrota por ${-diff}.`
        : diff > 0
          ? `Ganamos por ${diff}.`
          : diff < 0
            ? `Perdemos por ${-diff}.`
            : 'Empatados.';

  const byId = (id: string) => state.players.find((p) => p.id === id)!;
  const onCourtPlayers = live.onCourt.map(byId);
  const benchPlayers = live.squad.filter((id) => !live.onCourt.includes(id)).map(byId);
  const freshOf = (id: string) => Math.round(live.playerFresh[id] ?? 70);
  const minsOf = (id: string) => live.minutes[id] ?? 0;
  const legsCls = (v: number) => (v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad');

  const subRow = (p: Player, side: 'court' | 'bench') => {
    const fresh = freshOf(p.id);
    const selected = side === 'court' && outSel === p.id;
    const clickable = !live.finished && (side === 'court' || outSel !== null);
    const onClick = () => {
      if (live.finished) return;
      if (side === 'court') setOutSel(selected ? null : p.id);
      else if (outSel) {
        dispatch({ type: 'SUBSTITUTE', outId: outSel, inId: p.id });
        setOutSel(null);
      }
    };
    // Arrastre: soltar un suplente sobre uno de la cancha (o al revés) hace el cambio.
    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (live.finished) return;
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === p.id) return;
      const draggedOnCourt = live.onCourt.includes(draggedId);
      const targetOnCourt = side === 'court';
      if (draggedOnCourt === targetOnCourt) return;
      const outId = draggedOnCourt ? draggedId : p.id;
      const inId = draggedOnCourt ? p.id : draggedId;
      dispatch({ type: 'SUBSTITUTE', outId, inId });
      setOutSel(null);
    };
    return (
      <div
        key={p.id}
        className={`sub-row${selected ? ' sel' : ''}${clickable ? '' : ' off'}`}
        onClick={clickable ? onClick : undefined}
        draggable={!live.finished}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', p.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        title={
          side === 'court'
            ? 'Arrastralo al banco o tocá para elegir quién sale'
            : outSel
              ? 'Tocá para meterlo (o arrastralo sobre uno en cancha)'
              : 'Arrastralo sobre uno en cancha para el cambio'
        }
      >
        <span className="lp-pos">{POS_ABBR[p.position]}</span>
        <span className="sub-name">
          {p.name}
          {live.starId === p.id && side === 'court' ? ' ⭐' : ''}
        </span>
        <span className="sub-pts">{live.stats[p.id]?.pts ?? 0} pts</span>
        <span className="sub-mins">{minsOf(p.id)}&apos;</span>
        <div className="legs-mini" title={`Piernas: ${fresh}`}>
          <div className={`fill ${legsCls(fresh)}`} style={{ width: `${fresh}%` }} />
        </div>
        <div className="hover-card">
          <div className="hc-head">
            <strong>{p.name}</strong>
            <span className="hc-rating">≈{p.visibleRating}</span>
          </div>
          <div className="hc-meta">
            {p.position} · {p.age} años · {starsFor(p.visibleRating)}
          </div>
          <p className="hc-desc">{p.description}</p>
          <Bar label="Físico" value={p.physical} />
          <Bar label="Motivación" value={p.motivation} />
          <Bar label="Compromiso" value={p.commitment} />
          <Bar label="Afinidad social" value={p.social} />
          <div className="hc-meta" style={{ marginTop: '0.3rem' }}>
            Piernas ahora: {fresh} · {minsOf(p.id)}&apos; jugados
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>
            {weekLabel(state.week, state.seasonLength)} · vs <RivalLink id={rival.id}>{rival.name}</RivalLink>
          </h3>
          <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
          <span className="chip accent" title={style.desc}>
            {style.label}
          </span>
          {isHalftime && <span className="chip good">Entretiempo: el equipo recupera aire</span>}
        </div>

        <div className="scoreboard live">
          <div className="team">
            <div className="tname">{state.club.name}</div>
            <div className={`score ${diff > 0 ? 'win' : diff < 0 ? 'lose' : ''}`}>{totalFor}</div>
          </div>
          <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>
            {live.finished ? 'FINAL' : played.length === 0 ? 'vs' : `${Q_LABELS[Math.min(regularPlayed, 3)]}${hasOT ? ' + PR' : ''}`}
          </div>
          <div className="team">
            <div className="tname">{rival.name}</div>
            <div className={`score ${diff < 0 ? 'win' : diff > 0 ? 'lose' : ''}`}>{totalAgainst}</div>
          </div>
        </div>
        {live.rivalSquad && live.rivalSquad.notes.length > 0 && (
          <p className="muted" style={{ textAlign: 'center', margin: '0 0 0.4rem', fontSize: '0.82rem' }}>
            📋 {live.rivalSquad.notes.join(' ')}
          </p>
        )}
        <p className="muted" style={{ textAlign: 'center', margin: '0 0 0.6rem' }}>
          {scoreLine}
          {(() => {
            const top = [...live.squad].sort((a, b) => (live.stats[b]?.pts ?? 0) - (live.stats[a]?.pts ?? 0))[0];
            const pts = live.stats[top]?.pts ?? 0;
            if (pts === 0) return null;
            const tp = state.players.find((p) => p.id === top);
            return tp ? ` Goleador: ${tp.name} (${pts}).` : null;
          })()}
        </p>

        <div className="table-wrap" style={{ maxWidth: 460, margin: '0 auto' }}>
          <table>
            <thead>
              <tr>
                <th></th>
                {[0, 1, 2, 3].map((i) => (
                  <th className="num" key={i}>
                    Q{i + 1}
                  </th>
                ))}
                {hasOT && <th className="num">PR</th>}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Nosotros</td>
                {[0, 1, 2, 3].map((i) => (
                  <td className="num" key={i}>
                    {played.filter((q) => !q.overtime)[i]?.for ?? '–'}
                  </td>
                ))}
                {hasOT && <td className="num">{played.find((q) => q.overtime)!.for}</td>}
                <td className="num" style={{ fontWeight: 700 }}>
                  {totalFor}
                </td>
              </tr>
              <tr>
                <td>{rival.name}</td>
                {[0, 1, 2, 3].map((i) => (
                  <td className="num" key={i}>
                    {played.filter((q) => !q.overtime)[i]?.against ?? '–'}
                  </td>
                ))}
                {hasOT && <td className="num">{played.find((q) => q.overtime)!.against}</td>}
                <td className="num" style={{ fontWeight: 700 }}>
                  {totalAgainst}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <h3>Pizarra táctica</h3>
          <div className="tactic-block">
            <div className="tactic-label">Defensa</div>
            <div className="segmented">
              <button
                className={live.defense === 'zona' ? 'on' : ''}
                disabled={live.finished}
                onClick={() => dispatch({ type: 'SET_TACTIC', defense: 'zona' })}
              >
                Zona
              </button>
              <button
                className={live.defense === 'hombre' ? 'on' : ''}
                disabled={live.finished}
                onClick={() => dispatch({ type: 'SET_TACTIC', defense: 'hombre' })}
              >
                Hombre
              </button>
              <button
                className={live.defense === 'presion' ? 'on' : ''}
                disabled={live.finished}
                onClick={() => dispatch({ type: 'SET_TACTIC', defense: 'presion' })}
              >
                Presión
              </button>
            </div>
            <p className="tactic-hint">
              {live.defense === 'zona'
                ? 'Ordenada y económica: cuida el físico. Ojo con los equipos de buenos tiradores.'
                : live.defense === 'hombre'
                  ? 'Asfixia al rival, pero quema piernas. Si el equipo está fundido, quedan pasillos.'
                  : 'A toda cancha: el máximo castigo defensivo… y el máximo desgaste. Solo con piernas frescas.'}
            </p>
          </div>
          <div className="tactic-block">
            <div className="tactic-label">Ataque</div>
            <div className="segmented">
              <button
                className={live.attack === 'estrella' ? 'on' : ''}
                disabled={live.finished}
                onClick={() => dispatch({ type: 'SET_TACTIC', attack: 'estrella' })}
              >
                Dársela a {shortName(live.starName)}
              </button>
              <button
                className={live.attack === 'equipo' ? 'on' : ''}
                disabled={live.finished}
                onClick={() => dispatch({ type: 'SET_TACTIC', attack: 'equipo' })}
              >
                Mover la pelota
              </button>
              <button
                className={live.attack === 'correr' ? 'on' : ''}
                disabled={live.finished}
                onClick={() => dispatch({ type: 'SET_TACTIC', attack: 'correr' })}
              >
                Correr la cancha
              </button>
            </div>
            <p className="tactic-hint">
              {live.attack === 'estrella'
                ? `Todo pasa por ${live.starName}. Si está caliente es fiesta; si no, el rival lo espera entre dos.`
                : live.attack === 'equipo'
                  ? 'La mueven todos: menos brillo, más pases. Aprovecha la química del grupo.'
                  : 'Partido de ida y vuelta: más puntos para los dos. Gana el que tiene piernas; pierde el que se funde.'}
            </p>
          </div>
          <p className="tactic-hint" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
            {style.label}: {style.desc}
          </p>
        </div>

        <div className="card">
          <h3>Cambios</h3>
          <p className="tactic-hint" style={{ margin: '0 0 0.5rem' }}>
            {live.finished
              ? 'Partido terminado: no hay más cambios.'
              : outSel
                ? `Sale ${shortName(byId(outSel).name)}: tocá quién entra del banco.`
                : 'Arrastrá un suplente sobre uno en cancha (o tocá: sale → entra). Valen las reentradas.'}
          </p>
          <div className="sub-group-label">En cancha</div>
          {onCourtPlayers.map((p) => subRow(p, 'court'))}
          <div className="sub-group-label" style={{ marginTop: '0.6rem' }}>
            Banco
          </div>
          {benchPlayers.length > 0 ? (
            benchPlayers.map((p) => subRow(p, 'bench'))
          ) : (
            <p className="tactic-hint">No citaste suplentes: no hay cambios posibles.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Piernas</h3>
        <Bar label="En cancha" value={courtFreshness(live)} hint={TIPS.piernas} />
        <Bar label={rival.name} value={live.rivalFreshness} hint={TIPS.piernas} />
      </div>

      {played.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>El relato</h3>
          {played.map((q, i) => (
            <div key={i} className="quarter-log">
              <div className="quarter-head">
                {q.overtime ? 'Suplementario' : `${Q_LABELS[i]} cuarto`} · {q.for}-{q.against}
                <span className="chip" style={{ marginLeft: '0.5rem' }}>
                  {q.defense === 'hombre' ? 'Hombre' : 'Zona'} · {q.attack === 'estrella' ? 'Estrella' : 'Equipo'}
                </span>
              </div>
              <ul className="reason-list">
                {q.notes.map((n, j) => (
                  <li key={j}>{n}</li>
                ))}
                {q.notes.length === 0 && <li>Cuarto parejo, sin sobresaltos.</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      {live.pendingIncident && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--warn)' }}>
          <h3>⚠ Incidencia en la cancha</h3>
          <p style={{ marginTop: 0 }}>{live.pendingIncident.text}</p>
          <div className="modal-like options" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {live.pendingIncident.options.map((opt, i) => (
              <button key={i} style={{ textAlign: 'left' }} onClick={() => dispatch({ type: 'INCIDENT_CHOICE', index: i })}>
                {opt.label}
                <span className="opt-hint" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="confirm-bar">
        {!live.finished ? (
          <button
            className="primary"
            disabled={!!live.pendingIncident}
            onClick={() => dispatch({ type: 'PLAY_QUARTER' })}
          >
            ▶ Jugar el {Q_LABELS[regularPlayed]} cuarto
          </button>
        ) : (
          <button className="primary" onClick={() => dispatch({ type: 'FINISH_MATCH' })}>
            Ver el informe del partido →
          </button>
        )}
        {!live.finished && !live.pendingIncident && (
          <span className="hint">Podés cambiar la táctica antes de cada cuarto. El rival también juega…</span>
        )}
        {live.pendingIncident && <span className="hint">Resolvé la incidencia antes de seguir jugando.</span>}
      </div>
    </div>
  );
}

function MatchResultPanel({ state, dispatch }: Props) {
  const m = state.lastMatch;
  if (!m) return null;
  const nextLabel =
    state.week < state.seasonLength
      ? `Avanzar a la semana ${state.week + 1} →`
      : state.week === state.seasonLength
        ? 'Cerrar la fase regular →'
        : state.week === state.seasonLength + 1
          ? 'Después de las semifinales →'
          : 'Cerrar la temporada →';

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
            <div className="tname">
              <RivalLink id={m.rivalId}>{m.rivalName}</RivalLink>
            </div>
            <div className={`score ${m.won ? 'lose' : 'win'}`}>{m.scoreAgainst}</div>
          </div>
        </div>
        {m.quarters.length > 0 && (
          <div className="table-wrap" style={{ maxWidth: 460, margin: '0 auto 0.8rem' }}>
            <table>
              <thead>
                <tr>
                  <th></th>
                  {m.quarters.map((_, i) => (
                    <th className="num" key={i}>
                      {i < 4 ? `Q${i + 1}` : 'PR'}
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
        {m.mvpName && m.mvpId && (
          <p style={{ textAlign: 'center' }}>
            <span className="chip accent">
              ⭐ Mejor jugador: <PlayerLink id={m.mvpId}>{m.mvpName}</PlayerLink>
            </span>
          </p>
        )}
      </div>

      {(m.box ?? []).length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Planilla del partido</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th className="num">Min</th>
                  <th className="num">Pts</th>
                  <th className="num">Reb</th>
                  <th className="num">Ast</th>
                  <th className="num">Nota</th>
                </tr>
              </thead>
              <tbody>
                {m.box.map((line) => (
                  <tr key={line.playerId}>
                    <td>
                      <PlayerLink id={line.playerId}>{line.name}</PlayerLink> {line.mvp ? '⭐' : ''}
                    </td>
                    <td className="num">{line.minutes}&apos;</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {line.points}
                    </td>
                    <td className="num">{line.rebounds}</td>
                    <td className="num">{line.assists}</td>
                    <td className="num">
                      {line.comment ? <Tip text={line.comment}>{line.rating}/10</Tip> : `${line.rating}/10`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {(m.moods ?? []).length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Cómo quedó cada uno</h3>
          <div className="data-grid">
            {m.moods!.map((mood) => {
              const cls =
                mood.emotion === 'euforico' || mood.emotion === 'orgulloso' || mood.emotion === 'contento'
                  ? 'good'
                  : mood.emotion === 'molesto_minutos'
                    ? 'bad'
                    : mood.emotion === 'frustrado' || mood.emotion === 'decepcionado'
                      ? 'warn'
                      : '';
              return (
                <div className="data-row" key={mood.playerId}>
                  <span className="data-label">
                    <PlayerLink id={mood.playerId}>{mood.name}</PlayerLink>
                  </span>
                  <span className="data-value">
                    <span className={`chip ${cls}`}>{mood.label}</span>{' '}
                    <span className="muted">{mood.text}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="confirm-bar">
        <button className="primary" onClick={() => dispatch({ type: 'NEXT_WEEK' })}>
          {nextLabel}
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
      {state.phase === 'callUp' && <CallUpPanel state={state} dispatch={dispatch} />}
      {state.phase === 'lineup' && <LineupPanel state={state} dispatch={dispatch} />}
      {state.phase === 'match' && <LiveMatchPanel state={state} dispatch={dispatch} />}
      {state.phase === 'matchResult' && <MatchResultPanel state={state} dispatch={dispatch} />}
    </div>
  );
}
