import { BALANCE } from '../game/balance';
import { marketReference } from '../game/conduct';
import { weeklyFee } from '../game/economy';
import { CAUSE_SHORT } from '../game/mood';
import {
  CONTINUITY_LABELS,
  COUNTER_OFFERS,
  DEMAND_LABELS,
  broncaQueCruza,
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
import type { DemandType, GameState, KnowledgeLevel, MarketPlayer, Player, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { formatMoney, starsFor } from './helpers';
import { Avatar } from './Avatar';
import { FilaDePie, type PersonaDePie } from './Busto';
import { Crest } from './Crest';
import { Icon, type IconName } from './Icon';
import { OpenProfileContext, PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { USER_CLUB_ID } from '../game/world';
import { dayLabel } from '../game/world';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';
import { useContext, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTeclasModal } from './teclas';
import './pretemporada.css';

/**
 * Los diálogos de la pretemporada se montan en el body, fuera del marco: la
 * barra de arriba y la de abajo tienen z-index propio y el contenido anima su
 * opacidad (queda en su propio contexto de apilado). Montados adentro, el velo
 * del diálogo quedaba debajo del chrome y la barra se veía encendida encima.
 * Así el velo cubre toda la ventana, como en la temporada (App.tsx).
 */
const enElCuerpo = (n: ReactNode) => createPortal(n, document.body);

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

/** Un riesgo de cerrar así: el chip que se lee de un saque y la explicación al pasar el mouse. */
interface ClosingRisk {
  short: string;
  long: string;
}

/**
 * Lo que hoy está mal para inscribirse. Cada riesgo tiene una versión corta
 * (cabe en un chip de la cabecera) y una larga (el porqué, como tooltip). Las
 * cifras de fondo —confirmados, caja, cuotas— ya viven en la barra de recursos,
 * así que acá sólo va lo que está mal, no el estado entero.
 */
function closingRisks(state: GameState): ClosingRisk[] {
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

  const risks: ClosingRisk[] = [];
  const carrera = state.mode === 'carrera' && !!ps.libreta;
  if (state.club.money < 0)
    risks.push({
      short: `Caja en rojo (${formatMoney(state.club.money)})`,
      long: `La caja está en rojo ($${state.club.money}). Si cerrás así, la comisión va a tener que tapar el agujero, y eso cuesta prestigio.`,
    });
  if (confirmed.length < min) {
    const faltan = min - confirmed.length;
    // Con siete de ocho, "Faltan 1 jugadores" era lo más común de leer.
    const faltanTxt = faltan === 1 ? 'Falta 1' : `Faltan ${faltan}`;
    const faltanJug = faltan === 1 ? 'Falta 1 jugador' : `Faltan ${faltan} jugadores`;
    risks.push({
      short: carrera
        ? `${faltanTxt} de los ${min}: sin eso no hay temporada`
        : `${faltanTxt} para el mínimo de ${min}`,
      long: carrera
        ? `${faltanJug} para los ${min} que pide la liga. Acá no hay jugadores de emergencia: si cerrás así, no hay temporada.`
        : `${faltanJug} para el mínimo de ${min}: si no llegás, habrá que aceptar jugadores de emergencia.`,
    });
  }
  if (fee > 0 && state.club.money < fee)
    risks.push(
      chosenOpt?.trusts
        ? {
            short: `La inscripción ($${fee}) va fiada`,
            long: `La caja no cubre la inscripción ($${fee}): en tu liga te conocen y te la van a fiar, pero arrancás la temporada con deuda y cuotas semanales.`,
          }
        : {
            short: `La caja no cubre la inscripción ($${fee})`,
            long: `La caja no cubre la inscripción ($${fee}): la comisión tendría que pasar la gorra, y eso cuesta prestigio.`,
          }
    );
  if (fees < costs && confirmed.length >= min)
    risks.push({
      short: `Las cuotas ($${fees}) no cubren los gastos ($${costs})`,
      long: `Las cuotas proyectadas ($${fees}/sem) no cubren los gastos fijos ($${costs}/sem).`,
    });
  if (chosenOpt === null)
    risks.push({
      short: 'Sin liga elegida',
      long: `Todavía no elegiste liga: si cerrás la pretemporada así, la comisión te anota a último momento en la de siempre (recargo $${BALANCE.preseason.lateInscriptionFee} y mala imagen).`,
    });
  return risks;
}

/** La liga en la que quedó anotado el club, si ya eligió. */
function chosenLeague(state: GameState): LeagueOption | null {
  const ps = state.preseason!;
  const offer = inscriptionOffer(state);
  if (ps.chosenDivisionId === undefined) return offer.find((o) => o.isCurrent) ?? null;
  return offer.find((o) => o.divisionId === ps.chosenDivisionId) ?? null;
}


// ---------- Chrome: la misma barra de arriba y de abajo que la temporada ----------

type PsTab = 'inscripcion' | 'plantel' | 'mercado';

interface PsNavItem {
  id: PsTab;
  label: string;
  icon: IconName;
  /** Lo que hay que mirar en esa parte, en una marca chica al lado del nombre. */
  badge?: { text: string; cls: string; title: string };
}

/**
 * La pretemporada es el mismo juego que la temporada (UI V1): la misma barra
 * de arriba, con el escudo a la izquierda y las secciones al lado. Acá las
 * secciones son las tres partes de la pretemporada —dónde jugamos, quiénes
 * siguen, a quién traemos— con el mismo punto, el mismo ícono y el mismo
 * subrayado naranja de la sección activa que la barra de la temporada.
 */
function PreseasonTopbar({
  state,
  dispatch,
  items,
  tab,
  onTab,
}: Props & { items: PsNavItem[]; tab: PsTab; onTab: (t: PsTab) => void }) {
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const userClub = state.world.clubs.find((c) => c.id === USER_CLUB_ID);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="marca">
          {/* Antes de la primera temporada el mundo todavía no existe y el
              escudo salía de ahí: se dibuja desde el club, que ya tiene nombre
              y colores (en Carrera los acaba de elegir el jugador). */}
          <Crest
            seed={USER_CLUB_ID}
            name={state.club.name}
            colors={userClub?.colors ?? state.club.colors}
            founded={userClub?.founded ?? 2025}
            size={38}
          />
          <div>
            <div className="club-name">{state.club.name}</div>
            <div className="temporada">Temporada {state.seasonNumber} · pretemporada</div>
          </div>
        </div>

        <nav className="secciones ps-secciones" aria-label="La pretemporada">
          {items.map((it) => {
            const on = tab === it.id;
            return (
              <button
                key={it.id}
                className={`seccion${on ? ' on' : ''}`}
                aria-current={on ? 'page' : undefined}
                onClick={() => onTab(it.id)}
                title={it.badge?.title ?? it.label}
              >
                <span className="seccion-punto" />
                <span className="seccion-label">
                  {it.label}
                  {it.badge && <span className={`ps-marca ${it.badge.cls}`}>{it.badge.text}</span>}
                </span>
                <Icon name={it.icon} size={22} />
              </button>
            );
          })}
        </nav>

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
      {enElCuerpo(<ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />)}
    </header>
  );
}

/**
 * La barra de abajo, la misma de la temporada: los números que corren semana a
 * semana y, a la derecha, el único botón naranja de la pantalla —pasar de
 * semana o, en la última, cerrar la lista—. Queda fijo: el mercado scrollea y
 * la acción está siempre en el mismo pixel. Confirmados y caja no se repiten
 * acá: son la cabecera de la pantalla.
 */
function PreseasonRecursos({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const confirmed = confirmedPlayers(state);
  const min = BALANCE.preseason.minPlayers;
  const weeksLeft = ps.totalWeeks - ps.week;
  const fees = projectedWeeklyFees(state);
  const costs = BALANCE.economy.courtRentWeekly + BALANCE.economy.refereeWeekly;
  const isLastWeek = ps.week >= ps.totalWeeks;
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  /* Cerrar la lista es irreversible y con un click se llevaba puesto lo que
     la cabecera venía avisando: sin liga elegida (recargo y mala imagen),
     menos del mínimo (en la Carrera, no hay temporada), la caja que no cubre
     la ficha. Con riesgos abiertos, se pregunta con los mismos porqués; sin
     riesgos, cierra directo. */
  const cerrar = () => {
    const risks = closingRisks(state);
    if (risks.length === 0) {
      dispatch({ type: 'PS_CLOSE' });
      return;
    }
    const carrera = state.mode === 'carrera' && !!ps.libreta;
    const sinTemporada = carrera && confirmed.length < min;
    setConfirmReq({
      title: sinTemporada ? 'Si cerrás así, no hay temporada' : '¿Cerrar la lista así?',
      message: `${risks.map((r) => r.long).join(' ')} Después del cierre no se vuelve atrás.`,
      confirmLabel: sinTemporada ? 'Cerrar igual' : 'Cerrar e inscribir igual',
      danger: sinTemporada,
      icon: 'alerta',
      onConfirm: () => dispatch({ type: 'PS_CLOSE' }),
    });
  };

  return (
    <footer className="recursos">
      <div className="recursos-inner">
        <div className="recurso">
          <span className="k">
            <Icon name="agenda" size={14} /> Semana
          </span>
          <div className={`v ${weeksLeft === 0 ? 'bad' : ''}`}>{ps.week}</div>
          <div className="s">de {ps.totalWeeks} · {weeksLeft === 0 ? 'la última' : `quedan ${weeksLeft + 1}`}</div>
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
        <div className="recurso">
          <span className="k">
            <Icon name="finanzas" size={14} /> Cuotas
          </span>
          <div className={`v ${fees >= costs ? 'good' : 'warn'}`}>${fees}</div>
          <div className="s">por semana · gastos ${costs}</div>
        </div>
        <div className="recurso accion">
          <span className="s">
            {isLastWeek ? 'Se cierra la lista y se paga la inscripción' : 'Las gestiones se renuevan cada semana'}
          </span>
          <button
            className="avanzar primary v1-cta"
            onClick={() => (isLastWeek ? cerrar() : dispatch({ type: 'PS_ADVANCE' }))}
          >
            {isLastWeek ? 'Cerrar la lista e inscribir →' : `Pasar a la semana ${ps.week + 1} →`}
          </button>
        </div>
      </div>
      {enElCuerpo(<ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />)}
    </footer>
  );
}

// ---------- El héroe: dónde jugamos, cuántos somos, cuánta plata hay ----------

/**
 * Lo primero que se lee, sin caja y sobre el bar: la pregunta de la semana y
 * las tres respuestas que deciden si hay temporada. Lo que hoy impediría
 * inscribirse va debajo, escrito como frase (el porqué largo, al pasar el
 * mouse). Reemplaza a la línea de estado con chips de antes.
 */
function PsHero({ state, onTab, tab }: Props & { onTab: (t: PsTab) => void; tab: PsTab }) {
  const ps = state.preseason!;
  const opt = chosenLeague(state);
  const hasInscription = ps.chosenDivisionId !== undefined;
  const confirmed = confirmedPlayers(state).length;
  const min = BALANCE.preseason.minPlayers;
  const fee = opt ? opt.fee : BALANCE.economy.inscriptionFee;
  const risks = closingRisks(state);
  const weeksLeft = ps.totalWeeks - ps.week;
  const faltan = min - confirmed;
  const carrera = state.mode === 'carrera' && !!ps.libreta;

  const titulo =
    hasInscription && !opt
      ? '¿Dónde jugamos este año?'
      : faltan > 0
        ? carrera
          ? `Faltan ${faltan} para tener equipo`
          : faltan === 1
            ? 'Falta 1 para el mínimo'
            : `Faltan ${faltan} para el mínimo`
        : weeksLeft === 0
          ? 'Última semana: se cierra la lista'
          : 'El plantel se está armando';

  return (
    <section className="ps-hero v1-hero" aria-label="La pretemporada">
      <div className="v1-eyebrow">
        Pretemporada · <b>Semana {ps.week} de {ps.totalWeeks}</b> ·{' '}
        {weeksLeft === 0 ? 'la última antes del cierre' : `${weeksLeft + 1} semanas para el cierre`}
      </div>
      <h1 className="v1-titulo">{titulo}</h1>

      <div className="ps-datos">
        <div className="ps-dato ps-dato-liga">
          <span className="ps-dato-k">Dónde jugamos</span>
          <span className={`ps-dato-v${opt ? '' : ' warn'}`}>{opt ? opt.leagueName : 'Sin liga'}</span>
          <span className="ps-dato-s">
            {opt
              ? `${opt.divisionName} · los ${dayLabel(opt.gameDay)} (${opt.gameTimes.join(' / ')})`
              : 'Todavía no elegiste dónde jugar'}
            {hasInscription && tab !== 'inscripcion' && (
              <button className="ps-link" onClick={() => onTab('inscripcion')}>
                {opt ? 'Cambiar' : 'Elegir liga'} →
              </button>
            )}
          </span>
        </div>
        <div className="ps-dato">
          <span className="ps-dato-k">Cuántos somos</span>
          <span className={`ps-dato-v ${faltan > 0 ? 'bad' : 'good'}`}>{confirmed}</span>
          <span className="ps-dato-s">
            {confirmed === 1 ? 'confirmado' : 'confirmados'} ·{' '}
            {faltan > 0 ? `${faltan === 1 ? 'falta 1' : `faltan ${faltan}`} para los ${min}` : `el mínimo es ${min}`}
          </span>
        </div>
        <div className="ps-dato">
          <span className="ps-dato-k">Cuánta plata hay</span>
          <span className={`ps-dato-v${state.club.money < 0 || state.club.money < fee ? ' bad' : ''}`}>
            {formatMoney(state.club.money)}
          </span>
          <span className="ps-dato-s">
            en caja ·{' '}
            {opt ? (fee > 0 ? `la inscripción sale $${fee}` : 'la inscripción es gratis') : 'la inscripción depende de la liga'}
          </span>
        </div>
      </div>

      <p className="v1-frase ps-veredicto">
        {risks.length === 0 ? (
          <>
            <b className="good">Llegamos a inscribirnos</b> con lo que hay hoy.
            {weeksLeft > 0 && <> Quedan semanas para reforzar el plantel.</>}
          </>
        ) : (
          <>
            Si cerramos hoy:{' '}
            {risks.map((r, i) => (
              <span key={r.short}>
                {i > 0 && ' · '}
                <b className="warn" title={r.long}>
                  {r.short}
                </b>
              </span>
            ))}
            .
          </>
        )}
      </p>
    </section>
  );
}

/**
 * La planilla pegada con cinta, como «Esta semana» en el Tablero: lo que fue
 * pasando en la pretemporada, lo último arriba. Es la única con letra a mano.
 */
function PsDiario({ state }: { state: GameState }) {
  const ps = state.preseason!;
  const [todo, setTodo] = useState(false);
  const log = ps.log.slice(0, 10);
  const visibles = todo ? log : log.slice(0, 4);
  return (
    <aside className="ps-diario v1-planilla" aria-label="Lo que pasó en la pretemporada">
      <i className="v1-cinta a" />
      <i className="v1-cinta b" />
      <h3 className="v1-mano">
        Lo que pasó <span>en la pretemporada</span>
      </h3>
      {log.length === 0 ? (
        <p className="ps-diario-vacio">
          Todavía no pasó nada. Cada semana hay {BALANCE.preseason.gestionesPerWeek} gestiones: una charla, una negociación
          o un contacto cuesta una.
        </p>
      ) : (
        <ol className="ps-diario-lista">
          {visibles.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      )}
      {log.length > 4 && (
        <button className="ps-diario-mas" onClick={() => setTodo(!todo)}>
          {todo ? 'Ver menos' : log.length === 5 ? '+ 1 más' : `+ ${log.length - 4} más`}
        </button>
      )}
    </aside>
  );
}

/** El título de una planilla: voz display y una línea punteada abajo. */
function PlanCab({ titulo, derecha, children }: { titulo: ReactNode; derecha?: ReactNode; children?: ReactNode }) {
  return (
    <header className="ps-plan-cab">
      <div className="ps-plan-cab-fila">
        <h2 className="ps-plan-t">{titulo}</h2>
        {derecha && <span className="ps-plan-der">{derecha}</span>}
      </div>
      {children}
    </header>
  );
}

// ---------- Inscripción: la oferta de ligas ----------

/**
 * Las ligas como renglones de una sola planilla, no como cuatro cards: se
 * comparan de arriba abajo —cuánto sale, qué nivel, qué día— y el cruce con la
 * agenda del plantel queda en su propia columna, que es el dato que decide.
 */
function InscriptionSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const offer = inscriptionOffer(state);
  const confirmed = confirmedPlayers(state);

  const renderOption = (opt: LeagueOption) => {
    const chosen = ps.chosenDivisionId === opt.divisionId;
    // La agenda del plantel confirmado, cruzada con el día y horarios de ESA liga.
    const blocked = confirmed.filter((p) => p.agenda?.blockedDays.includes(opt.gameDay));
    const late = confirmed.filter(
      (p) =>
        p.agenda &&
        p.agenda.onlyTimes.length > 0 &&
        !blocked.includes(p) &&
        opt.gameTimes.some((t) => !p.agenda!.onlyTimes.includes(t))
    );
    return (
      <div key={opt.divisionId} className={`ps-liga${chosen ? ' elegida' : ''}${opt.locked ? ' cerrada' : ''}`}>
        <div className="ps-liga-quien">
          <div className="ps-liga-nombre">{opt.leagueName}</div>
          <div className="ps-liga-div">
            {opt.divisionName} · los {dayLabel(opt.gameDay)} · {opt.gameTimes.join(' / ')}
          </div>
        </div>
        <div className="ps-liga-que">
          <p className="v1-frase">
            {opt.fee > 0 ? (
              <>
                Inscripción <b>${opt.fee}</b>
              </>
            ) : (
              <b className="good">Inscripción gratis</b>
            )}{' '}
            · {opt.levelLabel.toLowerCase()} · <b>{opt.weeks}</b> fechas ·{' '}
            {opt.promotes ? 'con ascensos y descensos' : 'sin ascensos'}
            {opt.prize && (
              <>
                {' '}
                · premio al campeón <b className="good">${opt.prize.champion}</b>
              </>
            )}
            .
          </p>
          <p className="ps-liga-nota">{opt.note}</p>
          {((opt.fee > 0 && !opt.trusts) || opt.isPlaza || opt.isHeld) && (
            <div className="ps-liga-marcas">
              {opt.fee > 0 && !opt.trusts && <span className="v1-est warn">Se paga contado: no fían</span>}
              {opt.isPlaza && (
                <span className="v1-est warn">Prestigio deportivo −{BALANCE.preseason.plazaPrestigeHit}</span>
              )}
              {opt.isHeld && <span className="v1-est good">Te guardan el lugar</span>}
            </div>
          )}
        </div>
        <div className="ps-liga-gente">
          {blocked.length > 0 && (
            <p className="bad">
              No podrían los {dayLabel(opt.gameDay)}: {blocked.map((p) => p.name).join(', ')}
            </p>
          )}
          {late.length > 0 && (
            <p className="warn">
              Llegarían tarde a los de{' '}
              {opt.gameTimes.filter((t) => late.some((p) => !p.agenda!.onlyTimes.includes(t))).join(' y ')}:{' '}
              {late.map((p) => p.name).join(', ')}
            </p>
          )}
          {blocked.length === 0 && late.length === 0 && (
            <p className={confirmed.length > 0 ? 'good' : 'dim'}>
              {confirmed.length > 0
                ? `Todos los confirmados pueden los ${dayLabel(opt.gameDay)}`
                : `Nadie confirmado todavía: el día se cruza con cada uno que diga que sí`}
            </p>
          )}
          {opt.locked && <p className="warn">{opt.locked}</p>}
        </div>
        <div className="ps-liga-accion">
          <button
            className={`ps-elegir-liga${chosen ? ' on' : ''}`}
            disabled={chosen || !!opt.locked}
            onClick={() => dispatch({ type: 'PS_CHOOSE_LEAGUE', divisionId: opt.divisionId })}
          >
            {opt.locked ? 'No nos aceptan todavía' : chosen ? '✓ Anotados acá' : 'Anotarse acá'}
          </button>
          {chosen && <span className="ps-liga-pago">se paga al cierre</span>}
        </div>
      </div>
    );
  };

  return (
    <section className="ps-seccion v1-planilla" aria-label="La oferta de ligas">
      <PlanCab titulo="La oferta de ligas" derecha={`${offer.length} ${offer.length === 1 ? 'opción' : 'opciones'}`}>
        <p className="v1-frase">
          Elegir liga es elegir el día de partido: mirá qué día puede tu gente antes de firmar. Se puede cambiar hasta el
          cierre; si no elegís, la comisión te anota a último momento en la de siempre (recargo{' '}
          <b>${BALANCE.preseason.lateInscriptionFee}</b> y mala imagen).
        </p>
      </PlanCab>
      {offer.map(renderOption)}
    </section>
  );
}

// ---------- Plantel: continuidad ----------

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

const POS_ABBR: Record<string, string> = {
  Base: 'BAS',
  Escolta: 'ESC',
  Alero: 'ALE',
  'Ala-Pívot': 'ALA',
  Pívot: 'PIV',
};

/** En la fila de pie entra el apodo si lo tiene, y si no el apellido. */
function shortName(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

/** El estado de continuidad dicho con las clases del semáforo (sin el acento). */
function contCls(cls: string): 'good' | 'warn' | 'bad' {
  return cls === 'good' ? 'good' : cls === 'bad' ? 'bad' : 'warn';
}

/**
 * Un renglón de los que esperan una respuesta: la cara chica (es una tabla
 * densa), quién es, qué dijo, cómo viene y el botón de lo que se puede hacer.
 */
function PendienteRow({ state, dispatch, p, indice }: Props & { p: Player; indice: number }) {
  const ps = state.preseason!;
  const st = ps.continuity[p.id];
  const cont = CONTINUITY_LABELS[st];
  const feeInfo = playerFeeLabel(p);
  const demand = ps.playerDemands[p.id];
  const needsTalk = st === 'dudando' || st === 'no_respondio' || st === 'quiere_irse';
  const noGestiones = ps.gestionesLeft <= 0;
  const dicho = st === 'pide_condicion' && demand ? `Pide: ${DEMAND_LABELS[demand].toLowerCase()}.` : p.description;

  return (
    <div className="ps-fila ps-fila-plantel" style={{ '--fila': indice } as CSSProperties}>
      <span className="ps-foto">
        <Avatar seed={p.id} age={p.age} appearance={p.appearance} title={p.name} personality={p.personality} size={46} />
      </span>
      <span className="ps-quien">
        <span className="ps-nombre">
          <PlayerLink id={p.id}>{p.name}</PlayerLink>
          <span className="ps-pos">
            {p.position} · {p.age} años · ≈{p.visibleRating}
          </span>
        </span>
        <span className="ps-dicho" title={dicho}>
          {dicho}
        </span>
      </span>
      <span className="ps-estado">
        <span className={`v1-est ${contCls(cont.cls)}`}>{cont.label}</span>
        {feeInfo && <span className="ps-estado-nota">{feeInfo.label}</span>}
      </span>
      <span className="ps-accion">
        {needsTalk && (
          <button
            disabled={noGestiones}
            title={noGestiones ? 'No te quedan gestiones esta semana' : 'Cuesta 1 gestión'}
            onClick={() => dispatch({ type: 'PS_TALK', id: p.id })}
          >
            Hablar<small> · 1 gestión</small>
          </button>
        )}
        {st === 'pide_condicion' && (
          <button
            disabled={noGestiones}
            title={noGestiones ? 'No te quedan gestiones esta semana' : 'Cuesta 1 gestión'}
            onClick={() => dispatch({ type: 'PS_OPEN_NEGOTIATION', id: p.id, isMarket: false })}
          >
            Negociar<small> · 1 gestión</small>
          </button>
        )}
      </span>
    </div>
  );
}

/**
 * El plantel como personas: todos de pie sobre el parquet, ordenados por
 * puesto, con lo que pasa con cada uno escrito debajo (el que duda, el que
 * pide algo, el que se retiró, en gris al final). Abajo, la planilla sólo con
 * los que esperan una respuesta tuya y el botón para dársela.
 */
function RosterSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const open = useContext(OpenProfileContext);
  const roster = state.players.filter((p) => !p.leftClub);
  const pending = roster.filter((p) => {
    const st = ps.continuity[p.id];
    return st !== 'confirmado' && st !== 'retirado';
  });
  const confirmed = roster.filter((p) => ps.continuity[p.id] === 'confirmado');
  const retired = roster.filter((p) => ps.continuity[p.id] === 'retirado');

  const personas: PersonaDePie[] = [...roster]
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
    .map((p) => {
      const st = ps.continuity[p.id];
      const cont = CONTINUITY_LABELS[st];
      const fee = playerFeeLabel(p);
      return {
        id: p.id,
        nombre: shortName(p.name),
        personality: p.personality,
        sub: POS_ABBR[p.position] ?? p.position.slice(0, 3).toUpperCase(),
        estado:
          st === 'confirmado'
            ? fee
              ? { cls: 'good', label: p.feeStatus === 'beca_total' ? 'Becado' : 'Media beca' }
              : null
            : { cls: contCls(cont.cls), label: st === 'pide_condicion' ? 'Pide algo' : cont.label },
        fuera: st === 'retirado',
        title: `${p.name} — ${p.position}, ${p.age} años · ${cont.label}`,
        onClick: () => open(p.id),
      };
    });

  const frase =
    roster.length === 0 ? (
      <>Todavía no hay nadie. El plantel se arma en la libreta: empezá por el que seguro te dice que sí.</>
    ) : (
      <>
        <b className="good">{confirmed.length}</b> {confirmed.length === 1 ? 'confirmado' : 'confirmados'} para la
        temporada
        {pending.length > 0 ? (
          <>
            {' '}
            y <b className="warn">{pending.length}</b> {pending.length === 1 ? 'espera' : 'esperan'} una respuesta tuya
          </>
        ) : (
          <>: no queda nadie por convencer</>
        )}
        {retired.length > 0 && (
          <>
            . {retired.length === 1 ? 'Uno colgó' : `${retired.length} colgaron`} las zapatillas
          </>
        )}
        . Los que no estén confirmados al cierre, no juegan.
      </>
    );

  return (
    <section className="ps-plantel" aria-label="El plantel">
      <div className="ps-sobre">
        <h2 className="ps-plan-t">El plantel · ¿quiénes siguen?</h2>
        <p className="v1-frase">{frase}</p>
      </div>
      {roster.length > 0 && (
        <div className="ps-fila-depie">
          <FilaDePie personas={personas} />
        </div>
      )}

      {pending.length > 0 && (
        <div className="ps-seccion v1-planilla">
          <PlanCab
            titulo="Esperan una respuesta tuya"
            derecha={`${ps.gestionesLeft} de ${BALANCE.preseason.gestionesPerWeek} gestiones esta semana`}
          >
            <p className="v1-frase">Cada charla o negociación consume una gestión.</p>
          </PlanCab>
          {pending.map((p, i) => (
            <PendienteRow key={p.id} state={state} dispatch={dispatch} p={p} indice={i} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Mercado de fichajes ----------

/** Cómo ordenar la vidriera del mercado ('libreta': como está anotada, el íntimo primero). */
type MarketSort = 'nivel' | 'conocido' | 'posicion' | 'libreta';

const KNOWLEDGE_RANK: Record<KnowledgeLevel, number> = {
  muy_conocido: 0,
  conocido: 1,
  referencias: 2,
  poco_conocido: 3,
  desconocido: 4,
};

/**
 * El mercado (o la libreta de la Carrera) como una sola planilla con
 * renglones: la cara, quién es y de dónde viene, el nivel y el físico en
 * columna, lo que se sabe escrito como se diría —«Conocido, pase libre;
 * pagaría la cuota completa»— y la acción a la derecha. Lo excepcional (escucha
 * otras ofertas, la figura que no atiende) va como estado escrito. La ficha
 * completa sigue a un click del nombre o de la cara.
 */
function MarketSection({ state, dispatch }: Props) {
  const ps = state.preseason!;
  const noGestiones = ps.gestionesLeft <= 0;
  const [profileId, setProfileId] = useState<string | null>(null);
  const [posFilter, setPosFilter] = useState<Position | null>(null);
  const [sort, setSort] = useState<MarketSort>(ps.libreta ? 'libreta' : 'nivel');
  const profileMp = ps.market.find((m) => m.id === profileId) ?? null;

  const all = ps.market.filter((m) => m.status === 'disponible');
  const gone = ps.market.filter((m) => m.status !== 'disponible');
  const available = all
    .filter((m) => !posFilter || m.position === posFilter)
    .sort((a, b) => {
      if (sort === 'libreta') return 0;
      if (sort === 'conocido') return KNOWLEDGE_RANK[a.knowledge] - KNOWLEDGE_RANK[b.knowledge];
      if (sort === 'posicion') return POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
      // Del que no sabés nada no se puede decir que sea mejor ni peor: va al final.
      const blindA = a.knowledge === 'desconocido' ? 1 : 0;
      const blindB = b.knowledge === 'desconocido' ? 1 : 0;
      return blindA - blindB || b.estTechnique - a.estTechnique;
    });

  const libreta = !!ps.libreta;

  const renderFila = (mp: MarketPlayer, indice: number) => {
    const know = KNOWLEDGE_LABELS[mp.knowledge];
    const active = mp.status === 'disponible';
    const fit = agendaFit(state, mp);
    // La fama es pública: si el club apunta a la plaza, se sabe de antemano
    // que este no va a atender el teléfono.
    const snubs = plazaBound(state) && isMarketFigure(mp);
    // En la libreta, el que lo trajo y por qué vendría valen más que el nivel.
    const contacto = libreta && mp.relacion;
    const abrirFicha = () => setProfileId(mp.id);
    const dicho = contacto ? mp.porQue : `${ORIGIN_SITUATIONS[mp.previousTeam] ?? `Viene de ${mp.previousTeam}.`} ${mp.knowledgeSource}`;
    const feeKnown = mp.contacted || mp.knowledge === 'muy_conocido' || mp.knowledge === 'conocido';

    // Lo que se sabe, en una frase: cuánto lo conocés, el pase, la cuota, lo que exige.
    const partes: { txt: string; cls?: string }[] = [];
    if (!contacto) {
      partes.push({ txt: know.label, cls: know.cls });
      partes.push({ txt: mp.signingCost > 0 ? `pase $${mp.signingCost}` : 'pase libre' });
    }
    if (feeKnown) partes.push({ txt: feeAttitudeLabel(mp).replace(/^./, (c) => (partes.length ? c.toLowerCase() : c)) });
    if (mp.contacted) {
      partes.push(
        mp.demand
          ? { txt: `exige ${DEMAND_LABELS[mp.demand].toLowerCase()}`, cls: 'warn' }
          : { txt: 'sin exigencias', cls: 'good' }
      );
    } else if (active) {
      partes.push({ txt: 'lo que exige se sabe al contactarlo', cls: 'faint' });
    }
    if (partes.length > 0) partes[0] = { ...partes[0], txt: partes[0].txt.replace(/^./, (c) => c.toUpperCase()) };

    const notas = (mp.contacted || mp.knowledge === 'muy_conocido') && (mp.agenda?.notes.length ?? 0) > 0 ? mp.agenda!.notes.join(' ') : null;

    return (
      <div key={mp.id} className={`ps-fila ps-fila-mercado${active ? '' : ' apagada'}`} style={{ '--fila': indice } as CSSProperties}>
        <span className="ps-foto" role="button" tabIndex={-1} title={`Ver ficha de ${mp.name}`} onClick={abrirFicha}>
          <Avatar seed={`${mp.id}:${mp.name}`} age={mp.age} title={mp.name} personality={mp.personality} size={46} />
        </span>

        <span className="ps-quien">
          <span className="ps-nombre">
            <span
              className="plink"
              role="button"
              tabIndex={0}
              title={`Ver ficha de ${mp.name}`}
              onClick={abrirFicha}
              onKeyDown={(e) => {
                if (e.key === 'Enter') abrirFicha();
              }}
            >
              {mp.name}
            </span>
            <span className="ps-pos">
              {mp.position} · {mp.age} · {mp.height} cm
            </span>
          </span>
          {contacto && (
            <span className="ps-relacion-l">
              {mp.relacion}
              {mp.viaDe && mp.viaDe !== 'vos' && <span className="ps-via"> · lo trae {mp.viaDe}</span>}
            </span>
          )}
          <span className="ps-dicho" title={dicho}>
            {contacto ? mp.porQue : <>{originNode(state, mp.previousTeam)} {mp.knowledgeSource}</>}
          </span>
        </span>

        <span className={`ps-cifra${mp.knowledge === 'poco_conocido' ? ' estrellas' : ''}`} title="Nivel estimado, según cuánto lo conocés">
          {estimateLabel(mp.estTechnique, mp.knowledge)}
        </span>
        <span className={`ps-cifra${mp.knowledge === 'poco_conocido' ? ' estrellas' : ''}`} title="Físico estimado, según cuánto lo conocés">
          {estimateLabel(mp.estPhysical, mp.knowledge)}
        </span>

        <span className="ps-sabe">
          {active && (snubs || mp.availability === 'escuchando_ofertas' || (contacto && (mp.dudas ?? 0) > 0)) && (
            <span className="ps-sabe-marcas">
              {snubs && <span className="v1-est bad">Figura: no atiende a un club de la plaza</span>}
              {mp.availability === 'escuchando_ofertas' && <span className="v1-est warn">Escucha otras ofertas</span>}
              {contacto && (mp.dudas ?? 0) > 0 && <span className="v1-est warn">Preguntó quién más va</span>}
            </span>
          )}
          {partes.length > 0 && (
            <span className="ps-sabe-l">
              {partes.map((pt, i) => (
                <span key={i} className={pt.cls ? `ps-t-${pt.cls}` : undefined}>
                  {i > 0 && ' · '}
                  {pt.txt}
                </span>
              ))}
              .
            </span>
          )}
          {fit && <span className={`ps-sabe-l ps-t-${fit.cls}`}>{fit.text.replace(/^✕ /, '')}.</span>}
          {notas && (
            <span className="ps-sabe-nota">
              <Icon name="agenda" size={13} /> {notas}
            </span>
          )}
        </span>

        <span className="ps-accion">
          {active ? (
            <button
              disabled={noGestiones}
              title={noGestiones ? 'No te quedan gestiones esta semana' : 'Cuesta 1 gestión'}
              onClick={() => dispatch({ type: 'PS_OPEN_NEGOTIATION', id: mp.id, isMarket: true })}
            >
              {contacto
                ? (mp.dudas ?? 0) > 0
                  ? 'Insistirle'
                  : 'Pedirle que venga'
                : snubs
                  ? 'Llamarlo igual'
                  : mp.contacted
                    ? 'Retomar negociación'
                    : 'Contactar'}
              <small> · 1 gestión</small>
            </button>
          ) : mp.status === 'fichado' ? (
            <span className="v1-est good">{contacto ? 'Dijo que sí' : 'Fichado'}</span>
          ) : mp.status === 'perdido' ? (
            <span className="v1-est bad">Arregló con otro club</span>
          ) : (
            <span className="v1-est bad">{contacto ? 'Dijo que no' : 'La negociación se cayó'}</span>
          )}
        </span>
      </div>
    );
  };

  const cabecera = (
    <div className="ps-fila ps-fila-mercado ps-fila-cab" aria-hidden="true">
      <span />
      <span>{libreta ? 'Contacto' : 'Jugador'}</span>
      <span className="num">Nivel</span>
      <span className="num">Físico</span>
      <span>{libreta ? 'Qué pide y qué se sabe' : 'Lo que se sabe'}</span>
      <span />
    </div>
  );

  const filtro = (on: boolean, label: ReactNode, onClick: () => void, disabled = false, key?: string) => (
    <button key={key} className={`ps-filtro${on ? ' on' : ''}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <section className="ps-seccion v1-planilla ps-mercado" aria-label={libreta ? 'La libreta' : 'Mercado de fichajes'}>
      <PlanCab
        titulo={libreta ? 'La libreta' : 'Mercado de fichajes'}
        derecha={libreta ? `${all.length} por convencer` : `${all.length} disponibles de ${ps.market.length}`}
      >
        {libreta && (
          <p className="v1-frase">
            No tenés equipo: tenés amigos. Fichar es pedir un favor, y del segundo en adelante te van a preguntar quién
            más va. Cada uno que diga que sí abre su propia agenda. Necesitás <b>{BALANCE.preseason.minPlayers}</b> en{' '}
            <b>{ps.totalWeeks}</b> semanas: con menos, no hay temporada.
          </p>
        )}
        <div className="ps-filtros-v1">
          <span className="ps-filtros-k">Puesto</span>
          {filtro(posFilter === null, 'Todos', () => setPosFilter(null))}
          {POSITION_ORDER.map((pos) => {
            const n = all.filter((m) => m.position === pos).length;
            return filtro(
              posFilter === pos,
              <>
                {pos} <small>{n}</small>
              </>,
              () => setPosFilter(posFilter === pos ? null : pos),
              n === 0,
              pos
            );
          })}
          <span className="ps-filtros-k ps-filtros-orden">Ordenar</span>
          {libreta && filtro(sort === 'libreta', 'Como está en la libreta', () => setSort('libreta'))}
          {filtro(sort === 'nivel', 'Por nivel', () => setSort('nivel'))}
          {!libreta && filtro(sort === 'conocido', 'Por cuánto lo conocés', () => setSort('conocido'))}
          {filtro(sort === 'posicion', 'Por puesto', () => setSort('posicion'))}
        </div>
      </PlanCab>

      {available.length === 0 ? (
        <p className="ps-vacio">
          {libreta ? 'La libreta está vacía: no queda nadie a quien pedirle.' : 'No queda nadie disponible con ese filtro.'}
        </p>
      ) : (
        <>
          {cabecera}
          {available.map(renderFila)}
        </>
      )}

      {gone.length > 0 && (
        <>
          <h3 className="ps-sub">{libreta ? 'Ya contestaron' : 'Ya no disponibles'}</h3>
          {gone.map(renderFila)}
        </>
      )}
      {profileMp && enElCuerpo(<MarketProfile state={state} dispatch={dispatch} mp={profileMp} onClose={() => setProfileId(null)} />)}
    </section>
  );
}

// ---------- Ficha de un fichable (estilo FM: lo que sabés, y "?" en lo que no) ----------

function MarketProfile({
  state,
  dispatch,
  mp,
  onClose,
}: Props & { mp: MarketPlayer; onClose: () => void }) {
  useTeclasModal({ onClose });
  const ps = state.preseason!;
  const noGestiones = ps.gestionesLeft <= 0;
  const know = KNOWLEDGE_LABELS[mp.knowledge];
  // Cuánto se sabe de él: la personalidad y el compromiso solo se conocen de
  // verdad si es de la casa; la cuota se comenta más fácil en la liga.
  const deepKnown = mp.knowledge === 'muy_conocido';
  const feeKnown = mp.contacted || deepKnown || mp.knowledge === 'conocido';
  const fit = agendaFit(state, mp);
  const referencia = marketReference(mp);
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
            {ps.libreta && mp.relacion ? (
              <>
                <strong>{mp.relacion}.</strong> {mp.porQue}
              </>
            ) : (
              <>
                {originNode(state, mp.previousTeam)} {mp.knowledgeSource}
              </>
            )}
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
            {/* Al fichar no ves conducta: ves lo que dice quien lo trajo, y
                cada uno tiene su interés (T2). */}
            <div className="data-row">
              <span className="data-label">Referencias</span>
              <span className="data-value">
                <span className="ps-ref-quien">{referencia.who}:</span> {referencia.quote}
              </span>
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

/** La contraoferta dicha como favor: le pedís que venga con menos de lo que pide. */
const CONTRA_FAVOR: Partial<Record<DemandType, string>> = {
  beca: 'Pedirle que venga con media cuota, no gratis',
  titularidad: 'Pedirle que venga con lugar en la rotación, sin prometerle la titularidad',
};

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
    const contacto = !!ps.libreta && !!mp.relacion;
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>{contacto ? `Pedirle a ${mp.name} que venga a jugar` : `Negociación con ${mp.name}`}</h2>
          <p className="event-text">
            {contacto && (
              <>
                <strong>El favor es ese: que se sume al club esta temporada.</strong> No hay pase ni contrato: le pedís, y él decide.
                <br />
              </>
            )}
            {mp.position} · {mp.age} años · {mp.height} cm.{' '}
            {contacto ? `${mp.relacion}.` : originSentence(mp.previousTeam)}
            <br />
            {contacto ? mp.porQue : mp.knowledgeSource}
            <br />
            {feeAttitudeLabel(mp)}.{' '}
            {contacto
              ? 'Un favor no tiene pase.'
              : mp.signingCost > 0
                ? `El pase cuesta $${mp.signingCost}.`
                : 'El pase es libre.'}
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
              <strong>
                {contacto ? 'Lo que pide a cambio' : 'Su condición para venir'}: {DEMAND_LABELS[mp.demand].toLowerCase()}.
              </strong>
            ) : (
              <strong>{contacto ? 'No pide nada a cambio.' : 'No pone condiciones: quiere venir.'}</strong>
            )}
          </p>
          <div className="options">
            <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'accept' })}>
              {contacto
                ? mp.demand
                  ? 'Pedirle que venga, dándole lo que pide'
                  : 'Pedirle que venga'
                : mp.demand
                  ? `Aceptar su condición y ficharlo`
                  : `Ficharlo${mp.signingCost > 0 ? ` ($${mp.signingCost})` : ''}`}
              {contacto ? (
                <span className="opt-hint">
                  Puede decir que sí… o preguntar quién más va.
                  {mp.demand ? ' Si viene, lo que pide queda como promesa del club.' : ''}
                </span>
              ) : (
                mp.demand && <span className="opt-hint">Queda registrado como promesa del club</span>
              )}
            </button>
            {canCounter && (
              <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'counter' })}>
                {contacto ? (CONTRA_FAVOR[mp.demand!] ?? counter.label) : counter.label}
                <span className="opt-hint">
                  {contacto ? 'Menos de lo que pide. Puede aceptar o plantarse (una sola vez).' : 'Puede aceptar o plantarse (una sola vez)'}
                </span>
              </button>
            )}
            {mp.agenda &&
              (mp.agenda.blockedDays.length > 0 || mp.agenda.onlyTimes.length > 0 || mp.agenda.distanceKm > 50) &&
              !ps.priorityUsed?.[mp.id] && (
                <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'priority' })}>
                  {contacto ? 'Pedirle que acomode su agenda por el club' : 'Pedirle que priorice al club'}
                  <span className="opt-hint">Puede comprometerse a acomodar sus días y horarios… o ser honesto (una sola vez)</span>
                </button>
              )}
            {mp.demand && (
              <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'reject' })}>
                {contacto ? 'Pedirle que venga igual, sin darle nada' : '"Vení igual, sin condiciones"'}
                <span className="opt-hint">Arriesgado: puede ofenderse y bajarse</span>
              </button>
            )}
            <button onClick={() => dispatch({ type: 'PS_NEGOTIATE', decision: 'later' })}>
              {contacto ? 'Todavía no pedirle nada' : 'Dejar la negociación pendiente'}
              {/* La gestión ya se gastó al abrir la charla (es lo que compra
                  saber qué pide): que no parezca que cerrar el modal la devuelve. */}
              <span className="opt-hint">
                {contacto
                  ? `Ya sabés ${mp.demand ? 'lo que pide' : 'que no pide nada'}. Volver a llamarlo cuesta otra gestión.`
                  : `Ya sabés ${mp.demand ? 'su condición' : 'que quiere venir'}. Retomar la negociación cuesta otra gestión.`}
              </span>
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
  // La bronca que cruzó el verano (memoria entre temporadas): la condición no
  // es un capricho, es la cuenta del año pasado.
  const bronca = broncaQueCruza(player, state.seasonNumber);
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
          {!hasGrudge && bronca && (
            <>
              {' '}
              🧨 Se fue de vacaciones masticando bronca por <strong>{CAUSE_SHORT[bronca.cause]}</strong> y volvió con la cuenta hecha: "Este año, así no".
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
            <button className="primary" autoFocus onClick={() => dispatch({ type: 'PS_DISMISS_OUTCOME' })}>
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
            <button className="primary" autoFocus onClick={() => dispatch({ type: 'PS_DISMISS_EVENT_OUTCOME' })}>
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

/**
 * La pretemporada (UI V1). Pasa en el bar (ESCENA.bar en App.tsx), con el
 * mismo marco que la temporada: la barra de arriba con las tres partes de la
 * pretemporada como secciones y la barra de abajo con el botón de seguir.
 *
 * Adentro, el idioma del Tablero: arriba y sin caja, la pregunta de la semana
 * y sus tres respuestas —dónde jugamos, cuántos somos, cuánta plata hay—; a la
 * derecha, la planilla con cinta de lo que fue pasando; abajo, a todo el
 * ancho, la parte elegida: la oferta de ligas, el plantel de pie o el mercado.
 */
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
  const libreta = !!ps.libreta;

  const items: PsNavItem[] = [
    ...(hasInscription
      ? [
          {
            id: 'inscripcion' as PsTab,
            label: 'Inscripción',
            icon: 'inscripcion' as IconName,
            badge:
              ps.chosenDivisionId === null
                ? { text: '!', cls: 'warn', title: 'Todavía no elegiste liga' }
                : { text: '✓', cls: 'good', title: 'Ya elegiste dónde jugar' },
          },
        ]
      : []),
    {
      id: 'plantel',
      label: 'Plantel',
      icon: 'plantel',
      badge:
        pending > 0
          ? { text: String(pending), cls: 'warn', title: `${pending} ${pending === 1 ? 'espera' : 'esperan'} una respuesta tuya` }
          : { text: '✓', cls: 'good', title: 'Nadie espera una respuesta' },
    },
    {
      id: 'mercado',
      label: libreta ? 'La libreta' : 'Mercado',
      icon: libreta ? 'agenda' : 'lupa',
      badge: { text: String(disponibles), cls: '', title: `${disponibles} ${libreta ? 'por convencer' : 'disponibles'}` },
    },
  ];

  return (
    <>
      <div className="marco pretemporada">
        <PreseasonTopbar state={state} dispatch={dispatch} items={items} tab={tab} onTab={setTab} />

        <div className="app-shell">
          <div className="vista ps-pantalla">
            <PsHero state={state} dispatch={dispatch} tab={tab} onTab={setTab} />
            <PsDiario state={state} />
            <div className="ps-cuerpo" key={tab}>
              {tab === 'inscripcion' && hasInscription && <InscriptionSection state={state} dispatch={dispatch} />}
              {tab === 'plantel' && <RosterSection state={state} dispatch={dispatch} />}
              {tab === 'mercado' && <MarketSection state={state} dispatch={dispatch} />}
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
