import { useState } from 'react';
import type { GameState } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { COACH_PROFILE_INFO, COACH_TYPE_LABELS } from '../game/coach';
import { activePlayers } from '../game/match';
import { Bar } from './Bar';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';
import { PlayerLink } from './PlayerLink';
import { formatMoney } from './helpers';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/** Ficha del cuerpo técnico: DT pago, honorario, jugador-DT o dirigís vos. */
export function CoachCard({ state, dispatch }: Props) {
  const [playerPick, setPlayerPick] = useState('');
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const coach = state.coach;
  const candidates = state.coachMarket;
  const actives = activePlayers(state.players);

  /* Despedir al DT es irreversible: no vuelve a la lista de candidatos, el
     clima se resiente y, si era un jugador, le cae mal. Era un botón chico en
     rojo que lo hacía con un click; ahora pregunta, como "Empezar de cero". */
  const despedir = () => {
    if (!coach) return;
    const nombre = coach.type === 'jugador' ? coach.name.split(' ').slice(-1)[0] : coach.name;
    const message =
      coach.type === 'jugador'
        ? `${coach.name} deja de dirigir y vuelve a ser uno más del plantel. Se lo va a tomar mal (motivación -6) y el vestuario lo va a comentar (ambiente social -3).`
        : `${coach.name} se va del club y no vuelve: desaparece de la lista de candidatos. El vestuario lo va a comentar (ambiente social -3)${
            coach.weeklyWage > 0 ? ` y te ahorrás su sueldo de ${formatMoney(coach.weeklyWage)} por semana` : ''
          }.`;
    setConfirmReq({
      title: `¿Despedir a ${nombre}?`,
      message,
      confirmLabel: 'Despedirlo',
      danger: true,
      icon: 'salir',
      onConfirm: () => dispatch({ type: 'FIRE_COACH' }),
    });
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Cuerpo técnico</h3>

      {coach ? (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '1.05rem' }}>
              {coach.type === 'jugador' && coach.playerId ? (
                <PlayerLink id={coach.playerId}>{coach.name}</PlayerLink>
              ) : (
                coach.name
              )}
            </strong>
            <span className="chip accent">{COACH_TYPE_LABELS[coach.type]}</span>
            <span className="chip">{COACH_PROFILE_INFO[coach.profile].label}</span>
            {coach.weeklyWage > 0 && <span className="chip warn">{formatMoney(coach.weeklyWage)}/sem</span>}
            {coach.poachRisk && <span className="chip bad">Lo tientan clubes grandes</span>}
          </div>
          <p className="muted" style={{ margin: '0.4rem 0 0.6rem' }}>
            {COACH_PROFILE_INFO[coach.profile].desc}
          </p>
          <Bar label="Lectura de juego" value={coach.tactics} />
          <Bar label="Manejo de grupo" value={coach.people} />
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.6rem' }}>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Directiva:
            </span>
            <div className="segmented">
              <button
                className={coach.directive === 'ganar' ? 'on' : ''}
                onClick={() => dispatch({ type: 'SET_COACH_DIRECTIVE', directive: 'ganar' })}
              >
                A ganar
              </button>
              <button
                className={coach.directive === 'repartir' ? 'on' : ''}
                onClick={() => dispatch({ type: 'SET_COACH_DIRECTIVE', directive: 'repartir' })}
              >
                Juegan todos
              </button>
            </div>
            <button className="small danger" onClick={despedir}>
              Despedirlo
            </button>
          </div>
          <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.78rem' }}>
            En los partidos, {coach.name.split(' ')[0]} maneja los cambios con su directiva. Podés pisar sus
            decisiones a mano cuando quieras.
          </p>
        </div>
      ) : (
        <div>
          <p style={{ marginTop: 0 }}>
            <strong>No hay DT: dirigís vos desde el banco.</strong>{' '}
            <span className="muted">Sin sueldo que pagar, pero los cambios y las charlas corren por tu cuenta.</span>
          </p>

          {candidates.length > 0 && (
            <>
              <h4 className="profile-subtitle">Candidatos disponibles</h4>
              <div className="data-grid">
                {candidates.map((c) => {
                  const info = COACH_PROFILE_INFO[c.profile];
                  const noMoney = c.weeklyWage > 0 && state.club.money < c.weeklyWage;
                  return (
                    <div className="data-row" key={c.id}>
                      <span className="data-label">{COACH_TYPE_LABELS[c.type]}</span>
                      <span className="data-value">
                        <strong>{c.name}</strong> — {info.label}
                        {c.weeklyWage > 0 ? ` (${formatMoney(c.weeklyWage)}/sem)` : ' (gratis)'}
                        <button
                          className="small"
                          style={{ marginLeft: '0.5rem' }}
                          disabled={noMoney}
                          title={noMoney ? 'No alcanza la caja para su sueldo' : info.desc}
                          onClick={() => dispatch({ type: 'HIRE_COACH', coachId: c.id })}
                        >
                          Contratar
                        </button>
                        <span className="muted" style={{ display: 'block', fontSize: '0.78rem' }}>
                          {info.desc}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <h4 className="profile-subtitle">O que dirija un jugador</h4>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={playerPick}
              onChange={(e) => setPlayerPick(e.target.value)}
              style={{
                background: 'var(--panel-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.4rem 0.6rem',
              }}
            >
              <option value="">Elegí un jugador…</option>
              {[...actives]
                .sort((a, b) => b.age - a.age)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age} años{p.personality === 'veterano' ? ', veterano' : ''})
                  </option>
                ))}
            </select>
            <button
              className="small"
              disabled={!playerPick}
              onClick={() => {
                dispatch({ type: 'APPOINT_PLAYER_COACH', playerId: playerPick });
                setPlayerPick('');
              }}
            >
              Nombrarlo jugador-DT
            </button>
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              Gratis, pero dirige y juega a la vez: rinde un poco menos y no todos se lo bancan.
            </span>
          </div>
        </div>
      )}
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}
