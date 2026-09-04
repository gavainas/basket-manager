import { BALANCE } from '../game/balance';
import { weeklyFee } from '../game/economy';
import {
  CONTINUITY_LABELS,
  COUNTER_OFFERS,
  DEMAND_LABELS,
  confirmedPlayers,
  inscriptionOffer,
  isMarketFigure,
  plazaBound,
  projectedWeeklyFees,
  type LeagueOption,
} from '../game/preseason';
import { getPreseasonEvent } from '../game/preseasonEvents';
import { DIVISIONS } from '../data/worldData';
import { ORIGIN_SITUATIONS, originSentence } from '../data/market';
import type { GameState, KnowledgeLevel, MarketPlayer, Player, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { formatMoney, starsFor } from './helpers';
import { Avatar } from './Avatar';
import { Cabecera } from './Cabecera';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { USER_CLUB_ID } from '../game/world';
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

/**
 * La cuota del jugador — solo cuando no es la corriente. Que aporte la cuota
 * completa es lo que hacen casi todos: doce chips iguales diciendo lo mismo
 * tapaban a los dos que sí tienen una beca. Devuelve `null` para el caso normal.
 */
function playerFeeLabel(p: Player): { label: string; cls: string } | null {
  const fee = weeklyFee(p);
  if (p.feeStatus === 'beca_total') return { label: 'Becado · $0/sem', cls: 'accent' };
  if (p.feeStatus === 'beca_parcial') return { label: `Media beca · $${fee}/sem`, cls: 'accent' };
  return null;
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

// ---------- Los riesgos de cerrar así ----------

/**
 * Lo que hoy está mal para inscribirse. Vive suelto (y no dentro de un panel)
 * porque lo miran dos lugares: el aviso de arriba y el botón de cerrar.
 */
function closingRisks(state: GameState): string[] {
  const ps = state.preseason!;
  const confirmed = confirmedPlayers(state);
  const min = BALANCE.preseason.minPlayers;
  const fees = projectedWeeklyFees(state);
  const costs = BALANCE.economy.courtRentWeekly + BALANCE.economy.refereeWeekly;
  const offer = inscriptionOffer(state);
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
    risks.push(
      `Faltan ${min - confirmed.length} jugadores para el mínimo de ${min}: si no llegás, habrá que aceptar jugadores de emergencia.`
    );
  if (fee > 0 && state.club.money < fee)
    risks.push(
      chosenOpt?.trusts
        ? `La caja no cubre la inscripción ($${fee}): en tu liga te conocen y te la van a fiar, pero arrancás la temporada con deuda y cuotas semanales.`
        : `La caja no cubre la inscripción ($${fee}): la comisión tendría que pasar la gorra, y eso cuesta prestigio.`
    );
  if (fees < costs && confirmed.length >= min)
    risks.push(`Las cuotas proyectadas ($${fees}/sem) no cubren los gastos fijos ($${costs}/sem).`);
  if (chosenOpt === null)
    risks.push(
      `Todavía no elegiste liga: si cerrás la pretemporada así, la comisión te anota a último momento en la de siempre (recargo $${BALANCE.preseason.lateInscriptionFee} y mala imagen).`
    );
  return risks;
}

/** La liga en la que quedó anotado el club, si ya eligió. */
function chosenLeague(state: GameState): LeagueOption | null {
  const ps = state.preseason!;
  const offer = inscriptionOffer(state);
  if (ps.chosenDivisionId === undefined) return offer.find((o) => o.isCurrent) ?? null;
  return offer.find((o) => o.divisionId === ps.chosenDivisionId) ?? null;
}

// ---------- Chrome: la barra de arriba y la de abajo ----------

/**
 * La pretemporada es el mismo juego que la temporada, así que lleva el mismo
 * cromo: escudo, nombre del club y el área en la que estás. Antes era una
 * pantalla suelta sin barra ni color de sección — se leía como otra aplicación
 * pegada adelante del juego.
 */
function PreseasonTopbar({ state, dispatch }: Props) {
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const userClub = state.world.clubs.find((c) => c.id === USER_CLUB_ID);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="marca">
          {userClub && (
            <Crest seed={userClub.id} name={userClub.name} colors={userClub.colors} founded={userClub.founded} size={38} />
          )}
          <div>
            <div className="club-name">{state.club.name}</div>
            <div className="temporada">Temporada {state.seasonNumber} · antes de la primera fecha</div>
          </div>
        </div>
        <div className="pantalla-actual sec-plantel">
          <Icon name="inscripcion" size={19} />
          Pretemporada
        </div>
        <div className="spacer" />
        <button
          className="salir"
          title="Volver al menú"
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
          <Icon name="salir" size={17} />
          Salir
        </button>
      </div>
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </header>
  );
}

/**
 * Los números que mirás todo el tiempo, en la misma barra fija que en
 * temporada. Antes eran siete chips en fila arriba de todo: todos del mismo
 * tamaño, así que ninguno se leía primero.
 */
function PreseasonRecursos({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const confirmed = confirmedPlayers(state);
  const min = BALANCE.preseason.minPlayers;
  const weeksLeft = ps.totalWeeks - ps.week;
  const fees = projectedWeeklyFees(state);
  const costs = BALANCE.economy.courtRentWeekly + BALANCE.economy.refereeWeekly;
  const opt = chosenLeague(state);
  const fee = opt ? opt.fee : BALANCE.economy.inscriptionFee;
  const isLastWeek = ps.week >= ps.totalWeeks;

  return (
    <footer className="recursos">
      <div className="recursos-inner">
        <div className="recurso">
          <span className="k">
            <Icon name="agenda" size={14} /> Semana
          </span>
          <div className={`v ${weeksLeft === 0 ? 'bad' : ''}`}>{ps.week}</div>
          <div className="s">de {ps.totalWeeks} · {weeksLeft === 0 ? 'última' : `quedan ${weeksLeft + 1}`}</div>
        </div>
        <div className="recurso">
          <span className="k">
            <Icon name="plantel" size={14} /> Confirmados
          </span>
          <div className={`v ${confirmed.length >= min ? 'good' : 'bad'}`}>{confirmed.length}</div>
          <div className="s">
            {confirmed.length >= min ? `mínimo ${min}: cubierto` : `faltan ${min - confirmed.length} para el mínimo`}
          </div>
        </div>
        <div className="recurso">
          <span className="k">
            <Icon name="caja" size={14} /> Caja del club
          </span>
          <div className={`v ${state.club.money >= fee ? '' : 'bad'}`}>{formatMoney(state.club.money)}</div>
          <div className="s">{opt ? (fee > 0 ? `inscripción $${fee}` : 'inscripción gratis') : 'liga sin elegir'}</div>
        </div>
        <div className="recurso">
          <span className="k">
            <Icon name="finanzas" size={14} /> Cuotas
          </span>
          <div className={`v ${fees >= costs ? 'good' : 'warn'}`}>${fees}</div>
          <div className="s">por semana · gastos ${costs}</div>
        </div>
        <div className="recurso">
          <span className="k">
            <Icon name="chat" size={14} /> Gestiones
          </span>
          <div className={`v ${ps.gestionesLeft > 0 ? '' : 'warn'}`}>
            {ps.gestionesLeft} / {BALANCE.preseason.gestionesPerWeek}
          </div>
          <div className="s">charlas de esta semana</div>
        </div>
        <div className="recurso accion">
          <span className="s">
            {isLastWeek
              ? 'Se cierra la lista y se paga la inscripción'
              : 'Las gestiones se renuevan cada semana'}
          </span>
          <button
            className="avanzar primary"
            onClick={() => dispatch({ type: isLastWeek ? 'PS_CLOSE' : 'PS_ADVANCE' })}
          >
            {isLastWeek ? '» Cerrar e inscribir' : `» Semana ${ps.week + 1}`}
          </button>
        </div>
      </div>
    </footer>
  );
}

// ---------- El estado del club, arriba de todo ----------

/**
 * Dos cosas y nada más: en qué liga quedaste anotado (con su día de partido,
 * que es lo que decide cada fichaje) y qué está mal para cerrar.
 */
function EstadoPanel({ state, onFixLeague }: Props & { onFixLeague: () => void }) {
  const risks = closingRisks(state);
  const opt = chosenLeague(state);

  return (
    <div className="card ps-estado">
      <h3 className="card-band">
        <Icon name="inscripcion" size={17} /> Cómo llega el club a la inscripción
      </h3>
      <div className="ps-estado-liga">
        {opt ? (
          <>
            <span className="ps-estado-k">Anotado en</span>
            <strong>
              {opt.leagueName} · {opt.divisionName}
            </strong>
            <span className="muted">
              se juega los {dayLabel(opt.gameDay)} ({opt.gameTimes.join(' / ')})
            </span>
          </>
        ) : (
          <>
            <span className="ps-estado-k">Sin liga</span>
            <strong style={{ color: 'var(--warn)' }}>La inscripción está abierta y todavía no elegiste dónde jugar</strong>
            <button className="small" onClick={onFixLeague}>
              Elegir liga
            </button>
          </>
        )}
      </div>
      {risks.length === 0 ? (
        <p className="ps-veredicto good">✓ Con lo que hay hoy, el club llega a inscribirse sin problemas.</p>
      ) : (
        <ul className="ps-riesgos">
          {risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Inscripción: la oferta de ligas ----------

function InscriptionSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
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
      <div key={opt.divisionId} className={`player-card ps-liga${chosen ? ' selected' : ''}`}>
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
          <span className="chip">{opt.weeks} fechas</span>
          {opt.promotes ? (
            <span className="chip good">Con ascensos y descensos</span>
          ) : (
            <span className={`chip ${opt.isPlaza ? 'warn' : ''}`}>Sin ascensos</span>
          )}
          {opt.prize && <span className="chip good">Premio al campeón: ${opt.prize.champion}</span>}
          {opt.fee > 0 && !opt.trusts && <span className="chip warn">Se paga contado: no fían</span>}
          {opt.isPlaza && <span className="chip warn">Prestigio deportivo -{BALANCE.preseason.plazaPrestigeHit}</span>}
          {opt.isHeld && <span className="chip good">Te guardan el lugar</span>}
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
        {opt.locked && (
          <p className="muted" style={{ margin: '0.3rem 0', color: 'var(--warn)' }}>
            ✕ {opt.locked}
          </p>
        )}
        <button
          className={`ps-elegir${chosen ? ' on' : ''}`}
          disabled={chosen || !!opt.locked}
          onClick={() => dispatch({ type: 'PS_CHOOSE_LEAGUE', divisionId: opt.divisionId })}
        >
          {opt.locked ? 'No nos aceptan todavía' : chosen ? '✓ Inscripto acá (se paga al cierre)' : 'Anotarse acá'}
        </button>
      </div>
    );
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 className="card-band">
        <Icon name="inscripcion" size={17} /> ¿Dónde jugamos este año?
      </h3>
      <Cabecera art="cab-comision.webp" alt="La comisión del club reunida alrededor de una mesa" alto={150} />
      <p className="hint" style={{ marginTop: 0 }}>
        Elegir liga es elegir tu día de partido: mirá qué día puede tu gente antes de firmar. Podés cambiar hasta el
        cierre. Si no elegís, la comisión te anota a último momento en la de siempre (recargo $
        {BALANCE.preseason.lateInscriptionFee} y mala imagen).
      </p>
      <div className="player-grid ps-grid">{offer.map(renderOption)}</div>
    </div>
  );
}

// ---------- Plantel: continuidad ----------

function RosterRow({ state, dispatch, p }: Props & { p: Player }) {
  const ps = state.preseason!;
  const st = ps.continuity[p.id];
  const cont = CONTINUITY_LABELS[st];
  const feeInfo = playerFeeLabel(p);
  const demand = ps.playerDemands[p.id];
  const needsTalk = st === 'dudando' || st === 'no_respondio' || st === 'quiere_irse';
  const noGestiones = ps.gestionesLeft <= 0;

  return (
    <div className={`ps-row${st === 'retirado' ? ' dimmed' : ''}`}>
      <div className="avatar">
        <Avatar seed={p.id} age={p.age} appearance={p.appearance} title={p.name} personality={p.personality} />
      </div>
      <div className="ps-who">
        <div className="name">
          <PlayerLink id={p.id}>{p.name}</PlayerLink>{' '}
          <span className="muted">
            · {p.position} · {p.age} años · ≈{p.visibleRating}
          </span>
        </div>
        {st === 'pide_condicion' && demand && <div className="muted">Pide: {DEMAND_LABELS[demand].toLowerCase()}</div>}
      </div>
      {feeInfo && <span className={`chip ${feeInfo.cls}`}>{feeInfo.label}</span>}
      <span className={`chip ${cont.cls}`}>{cont.label}</span>
      {needsTalk && (
        <button disabled={noGestiones} onClick={() => dispatch({ type: 'PS_TALK', id: p.id })}>
          Hablar
        </button>
      )}
      {st === 'pide_condicion' && (
        <button
          disabled={noGestiones}
          onClick={() => dispatch({ type: 'PS_OPEN_NEGOTIATION', id: p.id, isMarket: false })}
        >
          Negociar
        </button>
      )}
    </div>
  );
}

/**
 * El plantel en dos tiempos: arriba los que necesitan una decisión tuya, abajo
 * los confirmados como una tira de fichas. Antes eran doce filas idénticas de
 * alto completo y los dos que sí había que resolver se perdían en el medio.
 */
function RosterSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const roster = state.players.filter((p) => !p.leftClub);
  const pending = roster.filter((p) => {
    const st = ps.continuity[p.id];
    return st !== 'confirmado' && st !== 'retirado';
  });
  const confirmed = roster.filter((p) => ps.continuity[p.id] === 'confirmado');
  const retired = roster.filter((p) => ps.continuity[p.id] === 'retirado');

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 className="card-band">
        <Icon name="vestuario" size={17} /> El plantel: ¿quiénes siguen?
      </h3>
      <Cabecera art="cab-vestuario.webp" alt="El vestuario del club antes del partido" alto={150} />

      {pending.length > 0 ? (
        <>
          <h4 className="ps-subtitulo">
            <span className="chip warn">{pending.length}</span> esperan una respuesta tuya
          </h4>
          <div className="ps-list">
            {pending.map((p) => (
              <RosterRow key={p.id} state={state} dispatch={dispatch} p={p} />
            ))}
          </div>
          <p className="hint">Cada charla o negociación consume 1 gestión. Los que no estén confirmados al cierre, no juegan la temporada.</p>
        </>
      ) : (
        <p className="ps-veredicto good">✓ Todo el plantel que sigue ya está confirmado. No queda nadie por convencer.</p>
      )}

      {confirmed.length > 0 && (
        <>
          <h4 className="ps-subtitulo">
            <span className="chip good">{confirmed.length}</span> confirmados para la temporada
          </h4>
          <div className="ps-fichas">
            {confirmed.map((p) => (
              <span key={p.id} className="ps-ficha" title={`${p.position} · ${p.age} años · ≈${p.visibleRating}`}>
                <Avatar seed={p.id} age={p.age} appearance={p.appearance} size={26} title={p.name} personality={p.personality} />
                <PlayerLink id={p.id}>{p.name}</PlayerLink>
                <small>≈{p.visibleRating}</small>
              </span>
            ))}
          </div>
        </>
      )}

      {retired.length > 0 && (
        <>
          <h4 className="ps-subtitulo">
            <span className="chip bad">{retired.length}</span> colgaron las zapatillas
          </h4>
          <div className="ps-list">
            {retired.map((p) => (
              <RosterRow key={p.id} state={state} dispatch={dispatch} p={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Mercado de fichajes ----------

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

/** Cómo ordenar la vidriera del mercado. */
type MarketSort = 'nivel' | 'conocido' | 'posicion';

const KNOWLEDGE_RANK: Record<KnowledgeLevel, number> = {
  muy_conocido: 0,
  conocido: 1,
  referencias: 2,
  poco_conocido: 3,
  desconocido: 4,
};

function MarketSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const noGestiones = ps.gestionesLeft <= 0;
  const [profileId, setProfileId] = useState<string | null>(null);
  const [posFilter, setPosFilter] = useState<Position | null>(null);
  const [sort, setSort] = useState<MarketSort>('nivel');
  const profileMp = ps.market.find((m) => m.id === profileId) ?? null;

  const all = ps.market.filter((m) => m.status === 'disponible');
  const gone = ps.market.filter((m) => m.status !== 'disponible');
  const available = all
    .filter((m) => !posFilter || m.position === posFilter)
    .sort((a, b) => {
      if (sort === 'conocido') return KNOWLEDGE_RANK[a.knowledge] - KNOWLEDGE_RANK[b.knowledge];
      if (sort === 'posicion') return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
      // Del que no sabés nada no se puede decir que sea mejor ni peor: va al
      // final en vez de encabezar la lista con un "?" que no ordena nada (y
      // que además delataría el número que el juego todavía te esconde).
      const blindA = a.knowledge === 'desconocido' ? 1 : 0;
      const blindB = b.knowledge === 'desconocido' ? 1 : 0;
      return blindA - blindB || b.estTechnique - a.estTechnique;
    });

  const renderCard = (mp: MarketPlayer) => {
    const know = KNOWLEDGE_LABELS[mp.knowledge];
    const active = mp.status === 'disponible';
    const fit = agendaFit(state, mp);
    // La fama es pública: si el club apunta a la plaza, se sabe de antemano
    // que este no va a atender el teléfono.
    const snubs = plazaBound(state) && isMarketFigure(mp);
    return (
      <div key={mp.id} className={`player-card${active ? '' : ' dimmed'}`}>
        <div
          className="player-head"
          style={{ cursor: 'pointer' }}
          title={`Ver ficha de ${mp.name}`}
          onClick={() => setProfileId(mp.id)}
        >
          <div className="avatar">
            <Avatar seed={`${mp.id}:${mp.name}`} age={mp.age} title={mp.name} personality={mp.personality} />
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
            <span className="hn-icon">
              <Icon name="agenda" size={14} />
            </span>{' '}
            {mp.agenda!.notes.join(' ')}
          </div>
        )}
        <div className="player-chips">
          <span className={`chip ${know.cls}`}>{know.label}</span>
          <span className="chip">Físico: {estimateLabel(mp.estPhysical, mp.knowledge)}</span>
          <span className="chip">{mp.signingCost > 0 ? `Pase: $${mp.signingCost}` : 'Pase libre'}</span>
          {fit && <span className={`chip ${fit.cls}`}>{fit.text}</span>}
          {mp.availability === 'escuchando_ofertas' && active && <span className="chip warn">Escucha otras ofertas</span>}
          {snubs && active && <span className="chip bad">Figura: no atiende a un club de la plaza</span>}
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
            disabled={noGestiones}
            title={noGestiones ? 'No te quedan gestiones esta semana' : undefined}
            onClick={() => dispatch({ type: 'PS_OPEN_NEGOTIATION', id: mp.id, isMarket: true })}
          >
            {snubs ? 'Llamarlo igual' : mp.contacted ? 'Retomar negociación' : 'Contactar'} (1 gestión)
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 className="card-band">
        <Icon name="lupa" size={17} /> Mercado de fichajes
        <span className="chip band-right">
          {available.length} de {all.length} disponibles
        </span>
      </h3>
      <Cabecera art="cab-bar.webp" alt="Convenciendo a un jugador en la mesa de un bar" alto={150} />

      <div className="ps-filtros">
        <span className="ps-filtros-k">Puesto</span>
        <button className={posFilter === null ? 'small on' : 'small'} onClick={() => setPosFilter(null)}>
          Todos
        </button>
        {POSITION_ORDER.map((pos) => {
          const n = all.filter((m) => m.position === pos).length;
          return (
            <button
              key={pos}
              className={posFilter === pos ? 'small on' : 'small'}
              disabled={n === 0}
              onClick={() => setPosFilter(posFilter === pos ? null : pos)}
            >
              {pos} <small>({n})</small>
            </button>
          );
        })}
        <span className="ps-filtros-k" style={{ marginLeft: 'auto' }}>
          Ordenar
        </span>
        <button className={sort === 'nivel' ? 'small on' : 'small'} onClick={() => setSort('nivel')}>
          Por nivel
        </button>
        <button className={sort === 'conocido' ? 'small on' : 'small'} onClick={() => setSort('conocido')}>
          Por cuánto lo conocés
        </button>
        <button className={sort === 'posicion' ? 'small on' : 'small'} onClick={() => setSort('posicion')}>
          Por puesto
        </button>
      </div>

      {available.length === 0 ? (
        <p className="muted">No queda nadie disponible con ese filtro.</p>
      ) : (
        <div className="player-grid ps-grid">{available.map(renderCard)}</div>
      )}

      {gone.length > 0 && (
        <>
          <h4 className="ps-subtitulo">Ya no disponibles</h4>
          <div className="player-grid ps-grid">{gone.map(renderCard)}</div>
        </>
      )}
      {profileMp && <MarketProfile state={state} dispatch={dispatch} mp={profileMp} onClose={() => setProfileId(null)} />}
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
            <Avatar seed={`${mp.id}:${mp.name}`} age={mp.age} title={mp.name} personality={mp.personality} />
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

          {active && plazaBound(state) && isMarketFigure(mp) && (
            <p className="muted" style={{ margin: '0.6rem 0 0', color: 'var(--bad)' }}>
              Figura de la liga: mientras el club juegue en la plaza, no te va a atender.
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
              {plazaBound(state) && isMarketFigure(mp)
                ? 'Llamarlo igual'
                : mp.contacted
                  ? 'Retomar negociación'
                  : 'Contactar'}{' '}
              (1 gestión)
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

type PsTab = 'inscripcion' | 'plantel' | 'mercado';

export function PreseasonView({ state, dispatch }: Props) {
  const ps = state.preseason!;
  // Saves de antes de la oferta de ligas: siguen inscriptos en la de siempre y
  // no tienen pestaña de inscripción.
  const hasInscription = ps.chosenDivisionId !== undefined;
  const [tab, setTab] = useState<PsTab>(hasInscription && ps.chosenDivisionId === null ? 'inscripcion' : 'plantel');

  const roster = state.players.filter((p) => !p.leftClub);
  const pending = roster.filter((p) => {
    const st = ps.continuity[p.id];
    return st !== 'confirmado' && st !== 'retirado';
  }).length;
  const disponibles = ps.market.filter((m) => m.status === 'disponible').length;

  const tabs: { id: PsTab; label: string; badge?: { text: string; cls: string } }[] = [
    ...(hasInscription
      ? [
          {
            id: 'inscripcion' as PsTab,
            label: 'Inscripción',
            badge:
              ps.chosenDivisionId === null
                ? { text: 'sin elegir', cls: 'warn' }
                : { text: '✓', cls: 'good' },
          },
        ]
      : []),
    {
      id: 'plantel',
      label: 'Plantel',
      badge: pending > 0 ? { text: `${pending} a resolver`, cls: 'warn' } : { text: '✓', cls: 'good' },
    },
    { id: 'mercado', label: 'Mercado', badge: { text: `${disponibles}`, cls: '' } },
  ];

  return (
    <>
      {/* Mismo marco fijo que la temporada (design/PLAN_MARCO_FIJO.md): la
          pretemporada tiene la misma anatomía de tres partes. */}
      <div className="marco">
      <PreseasonTopbar state={state} dispatch={dispatch} />

      <div className="app-shell">
        {/* Tanda E: el estado del club y las pestañas quedan quietos arriba y lo
            que scrollea es la sección elegida. El panel de estado se repetía
            entero en las tres pestañas ocupando 160px cada vez. */}
        <div className="vista sec-plantel pretemporada-pantalla">
          <div className="pretemporada-cabecera">
            <EstadoPanel state={state} dispatch={dispatch} onFixLeague={() => setTab('inscripcion')} />

            <nav className="ps-tabs">
              {tabs.map((t) => (
                <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                  {t.label}
                  {t.badge && <span className={`chip ${t.badge.cls}`}>{t.badge.text}</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="pretemporada-cuerpo">
            {tab === 'inscripcion' && hasInscription && <InscriptionSection state={state} dispatch={dispatch} />}
            {tab === 'plantel' && <RosterSection state={state} dispatch={dispatch} />}
            {tab === 'mercado' && <MarketSection state={state} dispatch={dispatch} />}

            {ps.log.length > 0 && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3 className="card-band">
                  <Icon name="historia" size={17} /> Lo que pasó en la pretemporada
                </h3>
                <ul className="log-list">
                  {ps.log.slice(0, 10).map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <PreseasonRecursos state={state} dispatch={dispatch} />
      </div>

      {/* Fuera del marco, como en App.tsx: los modales no son parte del layout. */}
      <PreseasonModals state={state} dispatch={dispatch} />
    </>
  );
}
