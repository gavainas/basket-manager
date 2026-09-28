import { useState } from 'react';
import type { CupTier, GameState } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';
import { computeSeasonEvaluation } from '../game/evaluation';
import { userSeasonFate } from '../game/pyramid';
import { objectiveStatus } from '../game/objectives';
import { BALANCE } from '../game/balance';
import { RivalLink } from './RivalLink';
import { formatMoney } from './helpers';
import './cierre.css';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/** Un equipo de los playoffs: el nuestro en negrita, los rivales con su ficha. */
function Equipo({ state, id }: { state: GameState; id: string }) {
  if (id === 'club') return <b className="cierre-nuestro">{state.club.name}</b>;
  const rival = state.rivals.find((r) => r.id === id);
  return rival ? <RivalLink id={id}>{rival.name}</RivalLink> : <span>{id}</span>;
}

const CUP_NAME: Record<CupTier, string> = { oro: 'Copa de Oro', plata: 'Copa de Plata' };

/**
 * El cierre de la temporada (UI V1): un momento, no un informe de cards. Pasa
 * en la comisión. Arriba y sin caja, el resultado grande —el título que da la
 * evaluación, si subimos o bajamos, el puesto, el récord y la caja—; abajo, lo
 * que quedó (los momentos memorables, contados) y los playoffs como renglones.
 * A la derecha, la planilla con cinta de la comisión: la nota de cada
 * dimensión y lo que había pedido. El único naranja es el de seguir, en el pie.
 */
export function SeasonEndScreen({ state, dispatch }: Props) {
  const ev = computeSeasonEvaluation(state);
  // Sube, baja o se queda: con las copas jugadas ya está decidido.
  const fate = userSeasonFate(state);
  const canContinue = !ev.isGameOver;
  const shortOnMoney = state.club.money < BALANCE.economy.inscriptionFee;
  /* "Empezar de cero" pisaba la partida con un click: el club, el plantel y
     la historia entera. Pide confirmación como la portada, y en rojo. */
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const empezarDeCero = () =>
    setConfirmReq({
      title: 'Empezar de cero',
      message: canContinue
        ? `Se pierden ${state.club.name}, el plantel y toda su historia: arranca otro club en la temporada 1. Si querés seguir con este, la pretemporada está al lado.`
        : `Se pierden ${state.club.name}, el plantel y toda su historia: arranca otro club en la temporada 1.`,
      confirmLabel: 'Empezar de cero',
      danger: true,
      icon: 'alerta',
      onConfirm: () => dispatch({ type: 'NEW_GAME' }),
    });

  const P = state.playoffs;
  const campeon = P?.champions.oro === 'club' || P?.champions.plata === 'club';

  return (
    <div className={`cierre cierre-temporada${ev.isGameOver ? ' perdida' : ''}`}>
      <div className="cierre-scroll">
        <div className="cierre-grid">
          <section className="cierre-hero v1-hero" aria-label="Cómo terminó la temporada">
            <div className="v1-eyebrow">
              {ev.isGameOver ? 'Se terminó' : 'Terminó la temporada'} · <b>Temporada {state.seasonNumber}</b> ·{' '}
              {state.club.name}
            </div>
            <h1 className={`cierre-titulo${ev.isGameOver ? ' bad' : campeon ? ' campeon' : ''}`}>{ev.outcomeTitle}</h1>
            <p className="cierre-bajada">{ev.outcomeText}</p>

            {fate && (
              <p className={`cierre-destino ${fate.kind === 'ascenso' ? 'good' : 'bad'}`}>
                {fate.kind === 'ascenso'
                  ? `¡Ascendemos a la ${fate.division.name}!`
                  : `Descendemos a la ${fate.division.name}.`}
              </p>
            )}

            <div className="cierre-cifras">
              <div className="v1-cifra">
                {ev.position}°<small>de {state.standings.length} en la tabla</small>
              </div>
              <div className="v1-cifra">
                {ev.record}
                <small>récord</small>
              </div>
              <div className={`v1-cifra${state.club.money < 0 ? ' bad' : ''}`}>
                {formatMoney(state.club.money)}
                <small>en caja</small>
              </div>
            </div>
          </section>

          <aside className="cierre-planilla v1-planilla" aria-label="La nota de la comisión">
            <i className="v1-cinta a" />
            <i className="v1-cinta b" />
            <h2 className="v1-mano">
              La nota <span>de la comisión</span>
            </h2>
            <div className="cierre-notas">
              {ev.dimensions.map((d) => {
                const cls = d.score >= 65 ? 'good' : d.score >= 40 ? 'warn' : 'bad';
                return (
                  <div className="cierre-nota" key={d.key}>
                    <div className="cierre-nota-txt">
                      <b>{d.label}</b>
                      <span>{d.detail}</span>
                    </div>
                    <div className={`cierre-nota-grado ${cls}`}>{d.grade}</div>
                    <div className="cierre-nota-barra" aria-hidden="true">
                      <i className={cls} style={{ width: `${d.score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {state.objectives.length > 0 && (
              <>
                <h3 className="cierre-sub">Lo que había pedido</h3>
                <ul className="cierre-renglones cierre-objetivos">
                  {state.objectives.map((obj) => {
                    const met = objectiveStatus(state, obj, true) === 'cumplido';
                    return (
                      <li key={obj.id} className={met ? 'good' : 'bad'}>
                        <span>{obj.label}</span>
                        <span className={`v1-est ${met ? 'good' : 'bad'}`}>{met ? 'Cumplido' : 'No cumplido'}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </aside>

          <section className="cierre-abajo" aria-label="Lo que dejó la temporada">
            {state.memorableMoments.length > 0 && (
              <div className="cierre-momentos">
                <h2 className="cierre-gente-t">Lo que queda</h2>
                <ul>
                  {state.memorableMoments.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {P && (
              <div className="cierre-copas v1-planilla">
                <h2 className="cierre-copas-t">Los playoffs de la divisional</h2>
                <div className="cierre-copas-grid">
                  {(['oro', 'plata'] as CupTier[]).map((cup) => {
                    const ties = P.ties.filter((t) => t.cup === cup);
                    const champ = P.champions[cup];
                    return (
                      <div key={cup} className={`cierre-copa${P.userCup === cup ? ' nuestra' : ''}`}>
                        <div className="cierre-copa-cab">
                          <span className="cierre-copa-n">{CUP_NAME[cup]}</span>
                          {champ && (
                            <span className="cierre-copa-camp">
                              Campeón: <Equipo state={state} id={champ} />
                            </span>
                          )}
                        </div>
                        {ties.map((t) => (
                          <div key={t.id} className={`cierre-cruce${t.isUserMatch ? ' nuestro' : ''}`}>
                            <span className="cierre-cruce-r">{t.round === 'semifinal' ? 'Semifinal' : 'Final'}</span>
                            <span className="cierre-cruce-p">
                              <Equipo state={state} id={t.homeId} />{' '}
                              {t.scoreHome !== undefined ? (
                                <b className="cierre-cruce-s">
                                  {t.scoreHome}-{t.scoreAway}
                                </b>
                              ) : (
                                'vs'
                              )}{' '}
                              <Equipo state={state} id={t.awayId} />
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="cierre-pie">
        <div className="cierre-pie-in">
          <p className={`cierre-pie-frase${canContinue && shortOnMoney ? ' warn' : ''}`}>
            {canContinue
              ? shortOnMoney
                ? `Ojo: no alcanza para la inscripción ($${BALANCE.economy.inscriptionFee}). Habrá que recaudar en la pretemporada.`
                : `Lo que sigue: la pretemporada de la temporada ${state.seasonNumber + 1}.`
              : 'La partida terminó. Se puede empezar otro club de cero.'}
          </p>
          <div className="cierre-pie-otros">
            {canContinue && (
              <button className="cierre-ghost" onClick={empezarDeCero}>
                Empezar de cero
              </button>
            )}
            <button className="cierre-ghost" onClick={() => dispatch({ type: 'QUIT_TO_MENU' })}>
              Volver al menú
            </button>
          </div>
          {canContinue ? (
            <button className="primary v1-cta" onClick={() => dispatch({ type: 'NEW_SEASON' })}>
              Seguir con el club: pretemporada de la T{state.seasonNumber + 1} →
            </button>
          ) : (
            <button className="primary v1-cta" onClick={empezarDeCero}>
              Empezar de cero
            </button>
          )}
        </div>
      </footer>
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}
