import { useState } from 'react';
import type { Coach, GameState } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { COACH_PROFILE_INFO, COACH_TYPE_LABELS } from '../game/coach';
import { activePlayers } from '../game/match';
import { Avatar } from './Avatar';
import { Busto } from './Busto';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';
import { PlayerLink } from './PlayerLink';
import { formatMoney } from './helpers';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/**
 * La cara del DT. Si es un jugador del plantel, su retrato de siempre, de pie;
 * si viene de afuera, el juego todavía no tiene retratos de técnicos y usa la
 * cara dibujada de respaldo (queda para la V2: design/UI_V2_PENDIENTES.md).
 */
function CaraDt({ coach, state, grande = false }: { coach: Coach; state: GameState; grande?: boolean }) {
  const jugador = coach.playerId ? state.players.find((p) => p.id === coach.playerId) : undefined;
  if (jugador?.personality) {
    return (
      <span className={`ct-cara depie${grande ? ' grande' : ''}`} aria-hidden="true">
        <Busto seed={jugador.id} personality={jugador.personality} />
      </span>
    );
  }
  return (
    <span className={`ct-cara medalla${grande ? ' grande' : ''}`} aria-hidden="true">
      <Avatar seed={coach.id} size={grande ? 132 : 76} />
    </span>
  );
}

/** Una cualidad del DT escrita en una línea: el nombre, la raya y la cifra. */
function Linea({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const t = v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad';
  return (
    <div className={`ct-linea ${t}`}>
      <span className="ct-linea-nom">{label}</span>
      <i aria-hidden="true"><i style={{ width: `${v}%` }} /></i>
      <b>{v}</b>
    </div>
  );
}

/**
 * El cuerpo técnico (UI V1 — design/UI_V1_GUIA.md). Con DT, la persona manda:
 * su cara, su nombre en grande, qué clase de técnico es escrito como lo diría
 * alguien del club y dos líneas —lectura de juego y manejo del grupo—. La
 * directiva para los partidos sigue siendo un par de botones y despedirlo
 * pregunta antes. Sin DT, los candidatos en una planilla, cada uno con su cara
 * y su «Contratar»; que dirija un jugador queda como opción de abajo.
 *
 * No lleva CTA naranja: el de la pantalla es el «Ir a la semana» de la barra.
 */
export function CoachCard({ state, dispatch }: Props) {
  const [playerPick, setPlayerPick] = useState('');
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const coach = state.coach;
  const candidates = state.coachMarket;
  const actives = activePlayers(state.players);

  /* Despedir al DT es irreversible: no vuelve a la lista de candidatos, el
     clima se resiente y, si era un jugador, le cae mal. Pregunta antes, como
     "Empezar de cero". */
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

  const jugadorDt = (
    <div className="ct-jugador">
      <span className="ct-jugador-txt">
        <b>O que dirija un jugador.</b> Gratis, pero dirige y juega a la vez: rinde un poco menos y no todos se lo
        bancan.
      </span>
      <span className="ct-jugador-accion">
        <select value={playerPick} onChange={(e) => setPlayerPick(e.target.value)} aria-label="Jugador que dirigiría">
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
      </span>
    </div>
  );

  return (
    <div className="ct-hoja">
      {coach ? (
        <>
          <section className="ct-dt v1-hero" aria-label="Quién dirige">
            <CaraDt coach={coach} state={state} grande />
            <div className="ct-dt-datos">
              <div className="v1-eyebrow">
                Quién dirige · <b>{COACH_TYPE_LABELS[coach.type]}</b>
              </div>
              <h2 className="v1-titulo">
                {coach.type === 'jugador' && coach.playerId ? (
                  <PlayerLink id={coach.playerId}>{coach.name}</PlayerLink>
                ) : (
                  coach.name
                )}
              </h2>
              <p className="ct-perfil">
                <b>{COACH_PROFILE_INFO[coach.profile].label}.</b> {COACH_PROFILE_INFO[coach.profile].desc}
                {coach.poachRisk ? <> <span className="v1-est bad">Lo tientan clubes grandes</span></> : null}
              </p>
              <div className="ct-lineas">
                <Linea label="Lectura de juego" value={coach.tactics} />
                <Linea label="Manejo del grupo" value={coach.people} />
              </div>
              <p className="v1-frase">
                {coach.weeklyWage > 0 ? (
                  <>Cobra <b>{formatMoney(coach.weeklyWage)}</b> por semana.</>
                ) : (
                  <>No le cuesta sueldo al club.</>
                )}
              </p>
            </div>
          </section>

          <section className="ct-directiva" aria-label="La directiva para los partidos">
            <div className="v1-eyebrow">La directiva para los partidos</div>
            <div className="ct-directiva-fila">
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
              <p className="v1-frase">
                En los partidos, {coach.name.split(' ')[0]} maneja los cambios con esta directiva. Podés pisar sus
                decisiones a mano cuando quieras.
              </p>
              <button className="small danger ct-despedir" onClick={despedir}>
                Despedirlo
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="ct-sin v1-hero" aria-label="Quién dirige">
            <div className="v1-eyebrow">Quién dirige</div>
            <h2 className="v1-titulo">No hay DT: dirigís vos desde el banco</h2>
            <p className="v1-frase">
              Sin sueldo que pagar, pero los cambios y las charlas corren por tu cuenta.
              {candidates.length > 0 && (
                <>
                  {' '}
                  {candidates.length === 1 ? (
                    <>Hay <b>un</b> técnico que vendría.</>
                  ) : (
                    <>Hay <b>{candidates.length}</b> técnicos que vendrían.</>
                  )}
                </>
              )}
            </p>
          </section>

          {candidates.length > 0 && (
            <section className="ct-candidatos v1-planilla" aria-label="Candidatos">
              {candidates.map((c) => {
                const info = COACH_PROFILE_INFO[c.profile];
                const noMoney = c.weeklyWage > 0 && state.club.money < c.weeklyWage;
                return (
                  <div className="ct-cand" key={c.id}>
                    <CaraDt coach={c} state={state} />
                    <div className="ct-cand-quien">
                      <b>{c.name}</b>
                      <span>
                        {COACH_TYPE_LABELS[c.type]} · {info.label}
                      </span>
                    </div>
                    <p className="ct-cand-desc">{info.desc}</p>
                    <div className="ct-cand-pie">
                      <span className="ct-cand-sueldo">
                        {c.weeklyWage > 0 ? (
                          <>
                            <b>{formatMoney(c.weeklyWage)}</b> por semana
                          </>
                        ) : (
                          <b>Gratis</b>
                        )}
                      </span>
                      <button
                        disabled={noMoney}
                        title={noMoney ? 'No alcanza la caja para su sueldo' : `Contratar a ${c.name}`}
                        onClick={() => dispatch({ type: 'HIRE_COACH', coachId: c.id })}
                      >
                        Contratar
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {jugadorDt}
        </>
      )}
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}
