import { BALANCE } from '../game/balance';
import { weeklyFee } from '../game/economy';
import {
  CONTINUITY_LABELS,
  COUNTER_OFFERS,
  DEMAND_LABELS,
  confirmedPlayers,
  inscriptionOffer,
  projectedWeeklyFees,
  type LeagueOption,
} from '../game/preseason';
import { getPreseasonEvent } from '../game/preseasonEvents';
import { DIVISIONS } from '../data/worldData';
import { ORIGIN_SITUATIONS, originSentence } from '../data/market';
import type { GameState, KnowledgeLevel, MarketPlayer, Player } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { formatMoney, starsFor } from './helpers';
import { Avatar } from './Avatar';
import { Cabecera } from './Cabecera';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { dayLabel } from '../game/world';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';
import { useState } from 'react';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

const KNOWLEDGE_LABELS: Record<KnowledgeLevel, { label: string; cls: string }> = {
  muy_conocido: { label: 'Muy conocido', cls: 'good' },
  conocido: { label: 'Conocido', cls: 'good' },
  referencias: { label: 'Referencias', cls: 'warn' },
  poco_conocido: { label: 'Poco conocido', cls: 'warn' },
  desconocido: { label: 'Desconocido', cls: 'bad' },
};

/** Nivel estimado que se muestra, según cuánto lo conocés. */
function estimateLabel(value: number, knowledge: KnowledgeLevel): string {
  switch (knowledge) {
    case 'muy_conocido':
    case 'conocido':
      return `≈${value}`;
    case 'referencias':
      return `${Math.max(20, value - 7)}–${Math.min(95, value + 7)}`;
    case 'poco_conocido':
      return starsFor(value);
    case 'desconocido':
      return '?';
  }
}

function feeAttitudeLabel(mp: MarketPlayer): string {
  switch (mp.feeAttitude) {
    case 'completa':
      return `Pagaría cuota completa ($${BALANCE.economy.feeWeekly}/sem)`;
    case 'parcial':
      return `Pagaría media cuota ($${Math.round(BALANCE.economy.feeWeekly / 2)}/sem)`;
    case 'beca':
      return 'No piensa pagar cuota';
  }
}

function playerFeeLabel(p: Player): { label: string; cls: string } {
  const fee = weeklyFee(p);
  if (p.feeStatus === 'beca_total') return { label: 'Becado · $0/sem', cls: 'accent' };
  if (p.feeStatus === 'beca_parcial') return { label: `Media beca · $${fee}/sem`, cls: 'accent' };
  return { label: `Aporta $${fee}/sem`, cls: 'good' };
}

// ---------- Liga, día de partido y agendas ----------

/** La divisional donde va a jugar el equipo esta temporada (día y horarios de partido). */
function userDivision(state: GameState) {
  return DIVISIONS.find((d) => d.id === state.divisionId) ?? DIVISIONS[1];
}

/**
 * La divisional contra la que se cruzan las agendas. Con la inscripción
 * abierta y sin liga elegida no hay "nuestro día": el veredicto se apaga
 * hasta que firmes (los saves de antes de la oferta siguen como siempre).
 */
function verdictDivision(state: GameState) {
  const p = state.preseason;
  if (p && p.chosenDivisionId !== undefined) {
    return p.chosenDivisionId ? (DIVISIONS.find((d) => d.id === p.chosenDivisionId) ?? null) : null;
  }
  return userDivision(state);
}

/** ¿Ya conocés su agenda real? Se revela al contactarlo (o si es de la casa). */
function agendaKnown(mp: MarketPlayer): boolean {
  return mp.contacted || mp.knowledge === 'muy_conocido';
}

/**
 * Cruce de la agenda del fichable con nuestro día y horarios de partido: el
 * dato que decide un fichaje. Si no puede nuestro día, te clavás; si llega
 * tarde a una franja, te la jugás; si puede todo, adelante.
 */
function agendaFit(state: GameState, mp: MarketPlayer): { cls: string; text: string } | null {
  if (!agendaKnown(mp) || !mp.agenda) return null;
  const d = verdictDivision(state);
  if (!d) return null;
  if (mp.agenda.blockedDays.includes(d.gameDay)) {
    return { cls: 'bad', text: `✕ No puede los ${dayLabel(d.gameDay)} — justo nuestro día de partido` };
  }
  const missed =
    mp.agenda.onlyTimes.length > 0 ? d.gameTimes.filter((t) => !mp.agenda!.onlyTimes.includes(t)) : [];
  if (missed.length > 0) {
    return { cls: 'warn', text: `A los partidos de ${missed.join(' y ')} llegaría para el 2do tiempo` };
  }
  return { cls: 'good', text: `Puede los ${dayLabel(d.gameDay)}, nuestro día de partido` };
}

/** Nombre del club de origen: clickeable cuando es un rival real de la liga. */
function prevTeamNode(state: GameState, name: string) {
  const rival = state.rivals.find((r) => name === r.name || name.includes(r.name));
  return rival ? (
    <RivalLink id={rival.id}>
      <strong>{name}</strong>
    </RivalLink>
  ) : (
    <strong>{name}</strong>
  );
}

/** El origen completo: "Viene de <club>." o la situación de vida contada como tal. */
function originNode(state: GameState, previousTeam: string) {
  const situation = ORIGIN_SITUATIONS[previousTeam];
  if (situation) return <>{situation}</>;
  return <>Viene de {prevTeamNode(state, previousTeam)}.</>;
}

// ---------- Cabecera con la fecha límite ----------

function DeadlinePanel({ state, dispatch }: Props) {
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const ps = state.preseason!;
  const confirmed = confirmedPlayers(state);
  const min = BALANCE.preseason.minPlayers;
  const weeksLeft = ps.totalWeeks - ps.week;
  const fees = projectedWeeklyFees(state);
  const costs = BALANCE.economy.courtRentWeekly + BALANCE.economy.refereeWeekly;
  const offer = inscriptionOffer(state);
  // Save viejo (sin oferta): sigue inscripto en la de siempre. null = falta elegir.
  const chosenOpt =
    ps.chosenDivisionId === undefined
      ? offer.find((o) => o.isCurrent)!
      : (offer.find((o) => o.divisionId === ps.chosenDivisionId) ?? null);
  const fee = chosenOpt ? chosenOpt.fee : BALANCE.economy.inscriptionFee;

  const risks: string[] = [];
  if (state.club.money < 0)
    risks.push(
      `La caja está en rojo ($${state.club.money}). Si cerrás así, la comisión va a tener que tapar el agujero, y eso cuesta prestigio.`
    );
  if (confirmed.length < min)
    risks.push(`Faltan ${min - confirmed.length} jugadores para el mínimo de ${min}: si no llegás, habrá que aceptar jugadores de emergencia.`);
  if (fee > 0 && state.club.money < fee)
    risks.push(`La caja no cubre la inscripción ($${fee}): la comisión tendría que pasar la gorra, y eso cuesta prestigio.`);
  if (fees < costs && confirmed.length >= min)
    risks.push(`Las cuotas proyectadas ($${fees}/sem) no cubren los gastos fijos ($${costs}/sem).`);
  if (chosenOpt === null)
    risks.push(
      `Todavía no elegiste liga: si cerrás la pretemporada así, la comisión te anota a último momento en la de siempre (recargo $${BALANCE.preseason.lateInscriptionFee} y mala imagen).`
    );

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Pretemporada · Temporada {state.seasonNumber}</h2>
        <button
          onClick={() =>
            setConfirmReq({
              title: 'Volver al menú',
              message: 'La partida queda guardada automáticamente: retomás cuando quieras.',
              confirmLabel: 'Volver al menú',
              icon: 'salir',
              onConfirm: () => dispatch({ type: 'QUIT_TO_MENU' }),
            })
          }
        >
          Menú
        </button>
        <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
        <span className={`chip ${weeksLeft === 0 ? 'bad' : 'accent'}`}>
          {weeksLeft === 0 ? '¡Última semana! Al avanzar, se cierra la inscripción' : `Semana ${ps.week}/${ps.totalWeeks} · quedan ${weeksLeft + 1} semanas`}
        </span>
        {chosenOpt ? (
          <span className="chip accent">
            {chosenOpt.leagueName} · {chosenOpt.divisionName} — se juega los {dayLabel(chosenOpt.gameDay)} (
            {chosenOpt.gameTimes.join(' / ')})
          </span>
        ) : (
          <span className="chip warn">Inscripción abierta: elegí en qué liga jugar</span>
        )}
        <span className={`chip ${ps.gestionesLeft > 0 ? 'good' : 'warn'}`}>Gestiones: {ps.gestionesLeft}/{BALANCE.preseason.gestionesPerWeek}</span>
        <span className={`chip ${confirmed.length >= min ? 'good' : 'bad'}`}>
          Confirmados: {confirmed.length} (mín. {min})
        </span>
        <span className={`chip ${state.club.money >= fee ? 'good' : 'bad'}`}>Caja: {formatMoney(state.club.money)}</span>
        <span className="chip">
          {chosenOpt ? (fee > 0 ? `Inscripción: $${fee}` : 'Inscripción: gratis') : `Inscripción: $0 a $${BALANCE.economy.inscriptionFee}`}
        </span>
        <span className="chip">Cuotas proyectadas: ${fees}/sem · Gastos fijos: ${costs}/sem</span>
      </div>
      {risks.map((r, i) => (
        <p key={i} className="muted" style={{ margin: '0.2rem 0', color: 'var(--bad)' }}>
          ⚠ {r}
        </p>
      ))}
      {risks.length === 0 && (
        <p className="muted" style={{ margin: '0.2rem 0', color: 'var(--good)' }}>
          ✓ Con lo que hay hoy, el club llega a inscribirse sin problemas.
        </p>
      )}
    </div>
  );
}

// ---------- Inscripción: la oferta de ligas ----------

function InscriptionSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  // Saves de antes de la oferta: siguen inscriptos en la de siempre, sin pantalla.
  if (ps.chosenDivisionId === undefined) return null;
  const offer = inscriptionOffer(state);
  const confirmed = confirmedPlayers(state);

  const renderOption = (opt: LeagueOption) => {
    const chosen = ps.chosenDivisionId === opt.divisionId;
    // La agenda del plantel confirmado, cruzada con el día y horarios de ESA liga:
    // el dato que decide la inscripción.
    const blocked = confirmed.filter((p) => p.agenda?.blockedDays.includes(opt.gameDay));
    const late = confirmed.filter(
      (p) =>
        p.agenda &&
        p.agenda.onlyTimes.length > 0 &&
        !blocked.includes(p) &&
        opt.gameTimes.some((t) => !p.agenda!.onlyTimes.includes(t))
    );
    return (
      <div key={opt.divisionId} className={`player-card${chosen ? ' selected' : ''}`}>
        <div className="player-head">
          <div className="who">
            <div className="name">
              {opt.leagueName} · {opt.divisionName}
            </div>
            <div className="pos">
              Se juega los {dayLabel(opt.gameDay)} ({opt.gameTimes.join(' / ')})
            </div>
          </div>
        </div>
        <div className="player-chips">
          <span className={`chip ${opt.fee > 0 ? '' : 'good'}`}>
            {opt.fee > 0 ? `Inscripción: $${opt.fee}` : 'Inscripción gratis'}
          </span>
          <span className="chip accent">{opt.levelLabel}</span>
          {opt.isPlaza && <span className="chip warn">Sin ascensos · prestigio -{BALANCE.preseason.plazaPrestigeHit}</span>}
        </div>
        <p className="muted" style={{ margin: '0.5rem 0' }}>
          {opt.note}
        </p>
        {blocked.length > 0 && (
          <p className="muted" style={{ margin: '0.3rem 0', color: 'var(--bad)' }}>
            ✕ No podrían los {dayLabel(opt.gameDay)}: {blocked.map((p) => p.name).join(', ')}
          </p>
        )}
        {late.length > 0 && (
          <p className="muted" style={{ margin: '0.3rem 0', color: 'var(--warn)' }}>
            Llegarían tarde a los de{' '}
            {opt.gameTimes.filter((t) => late.some((p) => !p.agenda!.onlyTimes.includes(t))).join(' y ')}:{' '}
            {late.map((p) => p.name).join(', ')}
          </p>
        )}
        {blocked.length === 0 && late.length === 0 && (
          <p className="muted" style={{ margin: '0.3rem 0', color: 'var(--good)' }}>
            ✓ Todos los confirmados pueden los {dayLabel(opt.gameDay)}
          </p>
        )}
        <button
          className={chosen ? '' : 'primary'}
          style={{ width: '100%', marginTop: '0.4rem' }}
          disabled={chosen}
          onClick={() => dispatch({ type: 'PS_CHOOSE_LEAGUE', divisionId: opt.divisionId })}
        >
          {chosen ? '✓ Inscripto acá (se paga al cierre)' : 'Anotarse acá'}
        </button>
      </div>
    );
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>
        <Icon name="inscripcion" size={17} /> Inscripción: ¿dónde jugamos este año?
      </h3>
      <div className="player-grid">{offer.map(renderOption)}</div>
      <p className="hint" style={{ marginBottom: 0 }}>
        Elegir liga es elegir tu día de partido: mirá qué día puede tu gente antes de firmar. Podés cambiar hasta el
        cierre. Si no elegís, la comisión te anota a último momento en la de siempre (recargo $
        {BALANCE.preseason.lateInscriptionFee} y mala imagen).
      </p>
    </div>
  );
}

// ---------- Plantel: continuidad ----------

function RosterSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const roster = state.players.filter((p) => !p.leftClub);
  const noGestiones = ps.gestionesLeft <= 0;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Plantel: ¿quiénes siguen?</h3>
      <div className="ps-list">
        {roster.map((p) => {
          const st = ps.continuity[p.id];
          const cont = CONTINUITY_LABELS[st];
          const feeInfo = playerFeeLabel(p);
          const demand = ps.playerDemands[p.id];
          const needsTalk = st === 'dudando' || st === 'no_respondio' || st === 'quiere_irse';
          return (
            <div key={p.id} className={`ps-row${st === 'retirado' ? ' dimmed' : ''}`}>
              <div className="avatar">
                <Avatar seed={p.id} age={p.age} appearance={p.appearance} title={p.name} />
              </div>
              <div className="ps-who">
                <div className="name">
                  <PlayerLink id={p.id}>{p.name}</PlayerLink>{' '}
                  <span className="muted">· {p.position} · {p.age} años · ≈{p.visibleRating}</span>
                </div>
                {st === 'pide_condicion' && demand && (
                  <div className="muted">Pide: {DEMAND_LABELS[demand].toLowerCase()}</div>
                )}
              </div>
              <span className={`chip ${feeInfo.cls}`}>{feeInfo.label}</span>
              <span className={`chip ${cont.cls}`}>{cont.label}</span>
              {needsTalk && (
                <button disabled={noGestiones} onClick={() => dispatch({ type: 'PS_TALK', id: p.id })}>
                  Hablar
                </button>
              )}
              {st === 'pide_condicion' && (
                <button
                  disabled={noGestiones}
                  className="primary"
                  onClick={() => dispatch({ type: 'PS_OPEN_NEGOTIATION', id: p.id, isMarket: false })}
                >
                  Negociar
                </button>
              )}
              {st === 'confirmado' && <span style={{ color: 'var(--good)', fontWeight: 700 }}>✓</span>}
            </div>
          );
        })}
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        Cada charla o negociación consume 1 gestión. Los que no estén confirmados al cierre, no juegan la temporada.
      </p>
    </div>
  );
}

// ---------- Mercado de fichajes ----------

function MarketSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const noGestiones = ps.gestionesLeft <= 0;
  const available = ps.market.filter((m) => m.status === 'disponible');
  const gone = ps.market.filter((m) => m.status !== 'disponible');
  const [profileId, setProfileId] = useState<string | null>(null);
  const profileMp = ps.market.find((m) => m.id === profileId) ?? null;

  const renderCard = (mp: MarketPlayer) => {
    const know = KNOWLEDGE_LABELS[mp.knowledge];
    const active = mp.status === 'disponible';
    const fit = agendaFit(state, mp);
    return (
      <div key={mp.id} className={`player-card${active ? '' : ' dimmed'}`}>
        <div
          className="player-head"
          style={{ cursor: 'pointer' }}
          title={`Ver ficha de ${mp.name}`}
          onClick={() => setProfileId(mp.id)}
        >
          <div className="avatar">
            <Avatar seed={`${mp.id}:${mp.name}`} age={mp.age} title={mp.name} />
          </div>
          <div className="who">
            <div className="name">
              <span className="plink" role="button" tabIndex={0}>
                {mp.name}
              </span>
            </div>
            <div className="pos">
              {mp.position} · {mp.age} años · {mp.height} cm
            </div>
          </div>
          <div className="rating">
            <div className="num">{estimateLabel(mp.estTechnique, mp.knowledge)}</div>
            <div className="approx">nivel</div>
          </div>
        </div>
        <div className="player-desc">
          {originNode(state, mp.previousTeam)} {mp.knowledgeSource}
        </div>
        {(mp.contacted || mp.knowledge === 'muy_conocido') && (mp.agenda?.notes.length ?? 0) > 0 && (
          <div className="human-note">
            <span className="hn-icon"><Icon name="agenda" size={14} /></span> {mp.agenda!.notes.join(' ')}
          </div>
        )}
        <div className="player-chips">
          <span className={`chip ${know.cls}`}>{know.label}</span>
          <span className="chip">Físico: {estimateLabel(mp.estPhysical, mp.knowledge)}</span>
          <span className="chip">{mp.signingCost > 0 ? `Pase: $${mp.signingCost}` : 'Pase libre'}</span>
          {fit && <span className={`chip ${fit.cls}`}>{fit.text}</span>}
          {mp.availability === 'escuchando_ofertas' && active && (
            <span className="chip warn">Escucha otras ofertas</span>
          )}
          {(mp.contacted || mp.knowledge === 'muy_conocido' || mp.knowledge === 'conocido') && (
            <span className="chip">{feeAttitudeLabel(mp)}</span>
          )}
          {mp.contacted ? (
            <span className={`chip ${mp.demand ? 'accent' : 'good'}`}>
              {mp.demand ? `Exige: ${DEMAND_LABELS[mp.demand]}` : 'Sin exigencias'}
            </span>
          ) : (
            active && <span className="chip">Exigencias: ? (contactalo)</span>
          )}
          {mp.status === 'fichado' && <span className="chip good">Fichado ✔</span>}
          {mp.status === 'perdido' && <span className="chip bad">Arregló con otro club</span>}
          {mp.status === 'rechazo' && <span className="chip bad">La negociación se cayó</span>}
        </div>
        {active && (
          <button
            className="primary"
            style={{ marginTop: '0.6rem', width: '100%' }}
            disabled={noGestiones}
            onClick={() => dispatch({ type: 'PS_OPEN_NEGOTIATION', id: mp.id, isMarket: true })}
          >
            {mp.contacted ? 'Retomar negociación' : 'Contactar'} (1 gestión)
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Mercado de fichajes ({available.length} disponibles)</h3>
      <Cabecera art="cab-bar.webp" alt="Convenciendo a un jugador en la mesa de un bar" />
      <div className="player-grid">{available.map(renderCard)}</div>
      {gone.length > 0 && (
        <>
          <h4 className="muted" style={{ margin: '1rem 0 0.5rem' }}>Ya no disponibles</h4>
          <div className="player-grid">{gone.map(renderCard)}</div>
        </>
      )}
      {profileMp && (
        <MarketProfile state={state} dispatch={dispatch} mp={profileMp} onClose={() => setProfileId(null)} />
      )}
    </div>
  );
}

// ---------- Ficha de un fichable (estilo FM: lo que sabés, y "?" en lo que no) ----------

function MarketProfile({
  state,
  dispatch,
  mp,
  onClose,
}: Props & { mp: MarketPlayer; onClose: () => void }) {
  const ps = state.preseason!;
  const noGestiones = ps.gestionesLeft <= 0;
  const know = KNOWLEDGE_LABELS[mp.knowledge];
  // Cuánto se sabe de él: la personalidad y el compromiso solo se conocen de
  // verdad si es de la casa; la cuota se comenta más fácil en la liga.
  const deepKnown = mp.knowledge === 'muy_conocido';
  const feeKnown = mp.contacted || deepKnown || mp.knowledge === 'conocido';
  const fit = agendaFit(state, mp);
  const active = mp.status === 'disponible';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile" onClick={(e) => e.stopPropagation()}>
        <div className="profile-head">
          <div className="avatar profile-avatar">
            <Avatar seed={`${mp.id}:${mp.name}`} age={mp.age} title={mp.name} />
          </div>
          <div className="profile-who">
            <div className="profile-name">{mp.name}</div>
            <div className="profile-chips">
              <span className="chip">{mp.position}</span>
              <span className="chip">{mp.age} años</span>
              <span className="chip">{mp.height} cm</span>
              <span className={`chip ${know.cls}`}>{know.label}</span>
              {mp.availability === 'escuchando_ofertas' && active && (
                <span className="chip warn">Escucha otras ofertas</span>
              )}
              {mp.status === 'fichado' && <span className="chip good">Fichado ✔</span>}
              {mp.status === 'perdido' && <span className="chip bad">Arregló con otro club</span>}
              {mp.status === 'rechazo' && <span className="chip bad">La negociación se cayó</span>}
            </div>
          </div>
          <div className="rating">
            <div className="num">{estimateLabel(mp.estTechnique, mp.knowledge)}</div>
            <div className="approx">nivel</div>
          </div>
          <button className="profile-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="profile-body">
          <p style={{ margin: '0 0 0.6rem' }}>
            {originNode(state, mp.previousTeam)} {mp.knowledgeSource}
          </p>

          <h4 className="profile-subtitle">Lo que sabés (y lo que no)</h4>
          <div className="data-grid">
            <div className="data-row">
              <span className="data-label">Nivel</span>
              <span className="data-value">{estimateLabel(mp.estTechnique, mp.knowledge)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Físico</span>
              <span className="data-value">{estimateLabel(mp.estPhysical, mp.knowledge)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Pase</span>
              <span className="data-value">{mp.signingCost > 0 ? `$${mp.signingCost}` : 'Libre'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Cuota</span>
              <span className="data-value">{feeKnown ? feeAttitudeLabel(mp) : '?'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Exigencias</span>
              <span className="data-value">
                {mp.contacted ? (mp.demand ? DEMAND_LABELS[mp.demand] : 'Sin exigencias') : '? (se sabe al contactarlo)'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Personalidad</span>
              <span className="data-value">{deepKnown ? mp.personality.replace('_', ' ') : '?'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Compromiso</span>
              <span className="data-value">{deepKnown ? starsFor(mp.commitment) : '?'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Cartel en la liga</span>
              <span className="data-value">{deepKnown || mp.knowledge === 'conocido' ? starsFor(mp.sportRep) : '?'}</span>
            </div>
          </div>

          <h4 className="profile-subtitle">Agenda</h4>
          {agendaKnown(mp) && mp.agenda ? (
            <>
              {mp.agenda.notes.length > 0 ? (
                <ul className="reason-list">
                  {mp.agenda.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Sin restricciones que te haya avisado.
                </p>
              )}
              {fit && (
                <p style={{ margin: '0.5rem 0 0' }}>
                  <span className={`chip ${fit.cls}`}>{fit.text}</span>
                </p>
              )}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              ? — La agenda real la cuenta él mismo: se conoce al contactarlo.
            </p>
          )}

          {active && (
            <button
              className="primary"
              style={{ width: '100%', marginTop: '0.9rem' }}
              disabled={noGestiones}
              onClick={() => {
                onClose();
                dispatch({ type: 'PS_OPEN_NEGOTIATION', id: mp.id, isMarket: true });
              }}
            >
              {mp.contacted ? 'Retomar negociación' : 'Contactar'} (1 gestión)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Modales ----------

function NegotiationModal({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const neg = ps.negotiation;
  if (!neg) return null;

  if (neg.isMarket) {
    const mp = ps.market.find((m) => m.id === neg.targetId);
    if (!mp) return null;
    const counter = mp.demand ? COUNTER_OFFERS[mp.demand] : undefined;
    const canCounter = counter && !ps.counterUsed[mp.id];
    const fit = agendaFit(state, mp);
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>Negociación con {mp.name}</h2>
          <p className="event-text">
            {mp.position} · {mp.age} años · {mp.height} cm. {originSentence(mp.previousTeam)}
            <br />
            {mp.knowledgeSource}
            <br />
            {feeAttitudeLabel(mp)}. {mp.signingCost > 0 ? `El pase cuesta $${mp.signingCost}.` : 'El pase es libre.'}
            <br />
            {(mp.agenda?.notes.length ?? 0) > 0 && (
              <>
                {mp.agenda!.notes.join(' ')}
                <br />
              </>
            )}
            {fit && (
              <>
                <span className={`chip ${fit.cls}`}>{fit.text}</span>
                <br />
              </>
            )}
            {mp.demand ? (
              <strong>Su condición para venir: {DEMAND_LABELS[mp.demand].toLowerCase()}.</strong>
            ) : (
              <strong>No pone condiciones: quiere venir.</strong>
            )}
          </p>
          <div className="options">
            <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'accept' })}>
              {mp.demand ? `Aceptar su condición y ficharlo` : `Ficharlo${mp.signingCost > 0 ? ` ($${mp.signingCost})` : ''}`}
              {mp.demand && <span className="opt-hint">Queda registrado como promesa del club</span>}
            </button>
            {canCounter && (
              <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'counter' })}>
                {counter.label}
                <span className="opt-hint">Puede aceptar o plantarse (una sola vez)</span>
              </button>
            )}
            {mp.agenda &&
              (mp.agenda.blockedDays.length > 0 || mp.agenda.onlyTimes.length > 0 || mp.agenda.distanceKm > 50) &&
              !ps.priorityUsed?.[mp.id] && (
                <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'priority' })}>
                  Pedirle que priorice al club
                  <span className="opt-hint">Puede comprometerse a acomodar su agenda… o ser honesto (una sola vez)</span>
                </button>
              )}
            {mp.demand && (
              <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'reject' })}>
                "Vení igual, sin condiciones"
                <span className="opt-hint">Arriesgado: puede ofenderse y bajarse</span>
              </button>
            )}
            <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'later' })}>
              Dejar la negociación pendiente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const player = state.players.find((p) => p.id === neg.targetId);
  const demand = ps.playerDemands[neg.targetId];
  if (!player || !demand) return null;
  const hasGrudge = !!player.grudge && player.grudge.season >= state.seasonNumber - 1;
  const counter = COUNTER_OFFERS[demand];
  const canCounter = counter && counter.result !== 'medio_pase' && !ps.counterUsed[player.id];
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2><PlayerLink id={player.id}>{player.name}</PlayerLink> pide una condición</h2>
        <p className="event-text">
          {player.name} ({player.position}, {player.age} años) quiere seguir en el club, pero pide:{' '}
          <strong>{DEMAND_LABELS[demand].toLowerCase()}</strong>.
          {hasGrudge && (
            <>
              {' '}
              🧨 Y esta vez lo quiere en serio: <strong>el año pasado le prometiste y no cumpliste</strong>. "Palabra va, palabra viene, yo ya puse la mía", te dice.
            </>
          )}
        </p>
        <div className="options">
          <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'accept' })}>
            Aceptar y prometérselo
            <span className="opt-hint">{hasGrudge ? 'Confirma y salda la deuda… mientras cumplas' : 'Confirma, y la promesa queda registrada'}</span>
          </button>
          {canCounter && (
            <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'counter' })}>
              {counter.label}
              <span className="opt-hint">{hasGrudge ? 'Con la deuda del año pasado, ni la va a escuchar' : 'Puede aceptar o mantenerse firme (una sola vez)'}</span>
            </button>
          )}
          <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'reject' })}>
            Negarse: "Acá somos todos iguales"
            <span className="opt-hint">{hasGrudge ? 'A un acreedor no le gusta escuchar eso: portazo casi seguro' : 'Puede aceptar quedarse igual… o querer irse'}</span>
          </button>
          <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'later' })}>
            Dejar la negociación pendiente
          </button>
        </div>
      </div>
    </div>
  );
}

function PreseasonModals({ state, dispatch }: Props) {
  const ps = state.preseason!;

  if (ps.negotiation) return <NegotiationModal state={state} dispatch={dispatch} />;

  if (ps.actionOutcome) {
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>Desenlace</h2>
          <p className="event-text">{ps.actionOutcome}</p>
          <div className="options">
            <button className="primary" onClick={() => dispatch({ type: 'PS_DISMISS_OUTCOME' })}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (ps.pendingEvent) {
    const def = getPreseasonEvent(ps.pendingEvent.defId);
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>{def.title}</h2>
          <p className="event-text">{def.text(state, ps.pendingEvent.targetIds)}</p>
          <div className="options">
            {def.options(state, ps.pendingEvent.targetIds).map((opt, i) => (
              <button key={i} onClick={() => dispatch({ type: 'PS_RESOLVE_EVENT', optionIndex: i })}>
                {opt.label}
                {opt.hint && <span className="opt-hint">{opt.hint}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (ps.eventOutcome) {
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>Desenlace</h2>
          <p className="event-text">{ps.eventOutcome}</p>
          <div className="options">
            <button className="primary" onClick={() => dispatch({ type: 'PS_DISMISS_EVENT_OUTCOME' })}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ---------- Vista principal ----------

export function PreseasonView({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const isLastWeek = ps.week >= ps.totalWeeks;

  return (
    <div className="app-shell">
      <DeadlinePanel state={state} dispatch={dispatch} />
      <InscriptionSection state={state} dispatch={dispatch} />
      <RosterSection state={state} dispatch={dispatch} />
      <MarketSection state={state} dispatch={dispatch} />

      {ps.log.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Lo que pasó en la pretemporada</h3>
          <ul className="log-list">
            {ps.log.slice(0, 10).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="confirm-bar">
        <button
          className="primary"
          onClick={() => dispatch({ type: isLastWeek ? 'PS_CLOSE' : 'PS_ADVANCE' })}
        >
          {isLastWeek ? 'Cerrar pretemporada e inscribir al club →' : `Avanzar a la semana ${ps.week + 1} →`}
        </button>
        <span className="hint">
          {isLastWeek
            ? 'Se cierra la lista: los no confirmados quedan afuera y se paga la inscripción.'
            : `Al llegar a la semana ${ps.totalWeeks} se cierra la inscripción.`}
        </span>
      </div>

      <PreseasonModals state={state} dispatch={dispatch} />
    </div>
  );
}
