import { useState } from 'react';
import type { GameState, Player, Position } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { ABSENCE_ACTIONS, reasonById } from '../game/absences';
import { ACTIONS } from '../game/actions';
import { BALANCE } from '../game/balance';
import { refereeOfWeek, rivalryWith } from '../game/leagueLife';
import { userGameDay } from '../game/moments';
import { lineupPromiseWarnings } from '../game/promises';
import { evaluateTeam, isSelectable, PLAN_MIN_BENCH } from '../game/match';
import { userFixtureOfWeek } from '../game/world';
import type { WeekDay } from '../game/types';
import { Icon, type IconName } from './Icon';
import { PlayerLink } from './PlayerLink';
import { StyleChip } from './StyleChip';
import { RivalLink } from './RivalLink';
import { ScoutingCard } from './ScoutingCard';
import { Tip, TIPS } from './Tip';
import { rivalDifficulty, rivalStyleInfo, weekLabel } from './helpers';
import { EMOTION_EXPRESSION } from '../game/humanState';
import { Avatar } from './Avatar';
import { PartidoVivo } from './PartidoVivo';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
const POS_ABBR: Record<Position, string> = {
  Base: 'BA',
  Escolta: 'ES',
  Alero: 'AL',
  'Ala-Pívot': 'AP',
  Pívot: 'PI',
};

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/**
 * Ícono de cada acción del club. Vive acá y no en `game/actions.ts` porque cómo
 * se dibuja una acción es presentación, y la lógica del juego no depende de
 * React (ver CLAUDE.md). Antes eran emoji hardcodeados en el archivo de lógica,
 * que además es justo lo que `Icon.tsx` pide no hacer.
 */
const ACTION_ICON: Record<string, IconName> = {
  training: 'gimnasio',
  asado: 'asado',
  raffle: 'rifa',
  sponsor: 'comercio',
  talk: 'chat',
  collect: 'plata',
  scholarship: 'beca',
  jerseys: 'camiseta',
  rest: 'descanso',
  recruit: 'lupa',
};

/** Si aparece una acción nueva sin ícono, cae en uno neutro en vez de romper. */
function actionIcon(id: string): IconName {
  return ACTION_ICON[id] ?? 'inscripcion';
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
    { key: 'planning', label: '1 · La semana' },
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

// ---------- El calendario de la semana ----------

const WEEK_DAYS: WeekDay[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAY_ABBR: Record<WeekDay, string> = {
  lunes: 'LUN',
  martes: 'MAR',
  miércoles: 'MIÉ',
  jueves: 'JUE',
  viernes: 'VIE',
  sábado: 'SÁB',
  domingo: 'DOM',
};

/** "14/9" desde la fecha ISO del fixture. */
function shortDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
}

/**
 * La semana como tira de días, contada hacia el partido: se planifica a 3
 * días, la lista se larga a 2, y el día de la fecha se arma el quinteto y se
 * juega. Los momentos del mundo y el asado caen en su día: verlos venir es
 * poder planificar.
 */
function SemanaStrip({ state }: { state: GameState }) {
  const gameDay = userGameDay(state);
  const fx = userFixtureOfWeek(state.world, state.week);
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1]);
  const gi = WEEK_DAYS.indexOf(gameDay);
  // Offset de cada fase respecto del partido (0 = día de la fecha).
  const todayOffset =
    state.phase === 'planning' ? -3 : state.phase === 'callUp' ? -2 : 0;
  // La tira muestra 7 días terminando uno después del partido: una cuenta regresiva.
  const offsets = [-5, -4, -3, -2, -1, 0, 1];
  const momentOffset = state.weekMoment
    ? ((WEEK_DAYS.indexOf(state.weekMoment.day) - gi + 7 + 5) % 7) - 5
    : null;
  const asadoOffset =
    state.actionsChosen.includes('asado') || state.lastAsado?.week === state.week ? -1 : null;
  const date = shortDate(fx?.date);

  return (
    <div className="semana-strip">
      {offsets.map((off) => {
        const day = WEEK_DAYS[(gi + off + 14) % 7];
        const isToday = off === todayOffset;
        const isMatch = off === 0;
        const marks: { icon: IconName; text: string }[] = [];
        if (isMatch && rival) marks.push({ icon: 'pelota', text: `vs ${rival.name}${fx?.time ? ` · ${fx.time}` : ''}` });
        if (momentOffset === off && state.weekMoment) marks.push({ icon: 'destacado', text: state.weekMoment.title });
        if (asadoOffset === off) marks.push({ icon: 'asado' as IconName, text: 'Asado del plantel' });
        if (off === -2) marks.push({ icon: 'plantel', text: 'Se larga la lista' });
        return (
          <div key={off} className={`dia-cell${isToday ? ' dia-hoy' : ''}${isMatch ? ' dia-partido' : ''}`}>
            <div className="dia-nombre">
              {DAY_ABBR[day]}
              {isMatch && date ? <span className="dia-fecha"> {date}</span> : null}
            </div>
            {isToday && <div className="dia-tag">HOY</div>}
            {marks.map((m, i) => (
              <div key={i} className="dia-marca" title={m.text}>
                <Icon name={m.icon} size={12} /> <span>{m.text}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---------- La previa que se pica ----------

/**
 * El feed de la semana: un jugador real del rival tira la primera piedra, tu
 * vestuario contesta y, algunas semanas, el delegado rival apuesta un asado.
 */
function PreviaFeed({ state, dispatch }: Props) {
  const banter = state.weekBanter;
  if (!banter || banter.week !== state.week || banter.messages.length === 0) return null;
  const bet = state.asadoBet && state.asadoBet.week === state.week ? state.asadoBet : null;
  return (
    <div className="card sec-vestuario" style={{ marginBottom: '1rem' }}>
      <h3>
        <Icon name="chat" size={17} /> La previa se pica
      </h3>
      <div className="chat-list">
        {banter.messages.map((m, i) => {
          const own = m.playerId ? state.players.find((p) => p.id === m.playerId) : undefined;
          return (
            <div className="chat-row" key={i}>
              {(m.worldPlayerId || own) && (
                <div className="avatar chat-avatar">
                  <Avatar
                    seed={m.worldPlayerId ?? own!.id}
                    age={m.age ?? own?.age}
                    appearance={own?.appearance}
                    title={m.name}
                    personality={m.personality ?? own?.personality}
                  />
                </div>
              )}
              <div className="chat-bubble" style={m.side === 'own' ? undefined : { background: 'var(--panel-2)' }}>
                <div className="chat-name">
                  {m.name}
                  {m.side === 'rival' && <span className="chip" style={{ marginLeft: '0.4rem' }}>rival</span>}
                </div>
                <div className="chat-text">{m.text}</div>
                {m.isBet && bet?.status === 'propuesta' && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    <button className="small" onClick={() => dispatch({ type: 'ASADO_BET', accept: true })}>
                      🍖 Aceptar: el que pierde paga
                    </button>
                    <button className="small" onClick={() => dispatch({ type: 'ASADO_BET', accept: false })}>
                      Ni loco
                    </button>
                  </div>
                )}
                {m.isBet && bet && bet.status === 'aceptada' && (
                  <span className="chip accent" style={{ marginTop: '0.4rem' }}>
                    Apuesta sellada: el que pierde paga el asado
                  </span>
                )}
                {m.isBet && bet && bet.status === 'rechazada' && (
                  <span className="chip" style={{ marginTop: '0.4rem' }}>
                    La dejaste pasar
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Respuestas del plantel a la convocatoria del asado: quién va, quién duda, quién se baja. */
function AsadoRsvpPanel({ state }: { state: GameState }) {
  const plan = state.asadoPlan;
  if (!plan || plan.week !== state.week) return null;
  const byId = (id: string) => state.players.find((p) => p.id === id);
  const group = (answer: string) =>
    plan.rsvps
      .filter((r) => r.answer === answer)
      .map((r) => ({ rsvp: r, p: byId(r.playerId) }))
      .filter((x): x is { rsvp: (typeof plan.rsvps)[number]; p: Player } => !!x.p);
  const going = group('va');
  const maybe = group('duda');
  const declined = group('no_va');
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>
        <Icon name="chat" size={17} /> El grupo responde a la convocatoria
      </h3>
      <p style={{ margin: '0.2rem 0 0.5rem' }}>
        <span className="chip good" style={{ marginRight: '0.4rem' }}>✓ Van {going.length}</span>
        <span className="chip warn" style={{ marginRight: '0.4rem' }}>Dudan {maybe.length}</span>
        <span className="chip bad">✗ No van {declined.length}</span>
      </p>
      {going.length > 0 && (
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Confirmados:</strong>{' '}
          {going.map(({ p }, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <PlayerLink id={p.id}>{p.name}</PlayerLink>
            </span>
          ))}
        </p>
      )}
      {maybe.length > 0 && (
        <p style={{ margin: '0.25rem 0' }}>
          <strong>"Veo y aviso":</strong>{' '}
          {maybe.map(({ p }, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <PlayerLink id={p.id}>{p.name}</PlayerLink>
            </span>
          ))}
        </p>
      )}
      {declined.length > 0 && (
        <ul className="log-list" style={{ margin: '0.25rem 0' }}>
          {declined.map(({ p, rsvp }) => (
            <li key={p.id}>
              <PlayerLink id={p.id}>{p.name}</PlayerLink>: {rsvp.reason}
            </li>
          ))}
        </ul>
      )}
      <p className="hint" style={{ margin: '0.4rem 0 0' }}>
        Los que dudan se definen el mismo día. Si el número no te cierra, podés levantarlo destildando la acción.
      </p>
    </div>
  );
}

/**
 * La semana del club, estilo PC Fútbol: el camino directo es el partido.
 * Las acciones (entrenar, asado, rifa…) son un menú opcional, no un peaje.
 */
function PlanningPanel({ state, dispatch }: Props) {
  const max = BALANCE.actions.maxPerWeek;
  // Abiertas de entrada. Colapsadas eran invisibles: buscar un sponsor, becar a
  // la figura o cobrar las cuotas atrasadas vivían detrás de un botón gris al
  // lado de "Pasarla sobre la hora", y quien no lo tocaba nunca jugaba con la
  // mitad del juego. El botón sigue estando para plegarlas.
  const [showActions, setShowActions] = useState(true);
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1]);
  const chosen = state.actionsChosen
    .map((id) => ACTIONS.find((a) => a.id === id))
    .filter((a): a is (typeof ACTIONS)[number] => !!a);

  return (
    /* Dos columnas (tanda B del marco fijo): a la izquierda la decisión de la
       semana —rival, calendario, previa— y a la derecha las acciones del club,
       que son diez cards y antes empujaban la pantalla 279px abajo del pliegue. */
    <div className="semana-planning">
      <div className="semana-izq">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>
          {weekLabel(state.week, state.seasonLength)}
          {rival && (
            <>
              {' '}· vs <RivalLink id={rival.id}>{rival.name}</RivalLink>
            </>
          )}
        </h3>
        {rival && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
            <StyleChip style={rival.style} />
            {rivalryWith(state, rival.id) && (
              <span className="chip bad" title={rivalryWith(state, rival.id)!.text}>
                Revancha
              </span>
            )}
            <span className="chip" title={refereeOfWeek(state).blurb}>
              Dirige {refereeOfWeek(state).name}
            </span>
          </div>
        )}
        {rival && rivalryWith(state, rival.id) && (
          <p style={{ margin: '0.2rem 0 0.4rem' }}>{rivalryWith(state, rival.id)!.text}</p>
        )}
        <SemanaStrip state={state} />
        {state.weekMoment && (
          <p style={{ margin: '0.4rem 0' }}>
            <span className="chip accent" style={{ marginRight: '0.4rem' }}>
              <Icon name="destacado" size={13} /> {state.weekMoment.title}
            </span>
            {state.weekMoment.text}
          </p>
        )}
        {chosen.length > 0 && (
          <p style={{ margin: '0.3rem 0' }}>
            Esta semana además:{' '}
            {chosen.map((a) => (
              <span key={a.id} className="chip accent" style={{ marginRight: '0.3rem' }}>
                <Icon name={actionIcon(a.id)} size={12} /> {a.name}
              </span>
            ))}
          </p>
        )}
        <div className="confirm-bar" style={{ marginTop: '0.6rem' }}>
          <button
            className="primary"
            title="Ves las bajas con 2 días de margen y podés gestionarlas… pero el día del partido alguno más se puede caer."
            onClick={() => dispatch({ type: 'CONFIRM_ACTIONS', timing: 'temprana' })}
          >
            ▶ Largar la lista (2 días antes)
          </button>
          <button
            title="Nadie tiene tiempo de inventar excusas y lo que ves es definitivo… pero tampoco te queda margen para gestionar ninguna baja."
            onClick={() => dispatch({ type: 'CONFIRM_ACTIONS', timing: 'tarde' })}
          >
            Pasarla sobre la hora
          </button>
          <span className="hint">
            {chosen.length > 0
              ? 'Las acciones elegidas se aplican al pasar lista.'
              : 'Temprana: margen para gestionar bajas, con riesgo de caídas de último momento. Sobre la hora: certeza, sin margen.'}
          </span>
        </div>
      </div>

      <PreviaFeed state={state} dispatch={dispatch} />

      {state.actionsChosen.includes('asado') && <AsadoRsvpPanel state={state} />}
      </div>

      {/* Las acciones son una sección de la pantalla, no un cajón escondido:
          card con su cabezal, como todo lo demás del juego. Desde la tanda B es
          un panel con el cabezal quieto y las diez cards scrolleando adentro. */}
      <div className={`card semana-acciones${showActions ? ' pane' : ''}`}>
        <h3 className="card-band">
          <Icon name="tablero" size={17} /> Acciones del club
          <span className="chip band-right">
            {chosen.length}/{max} esta semana
          </span>
          <button className="small band-btn" onClick={() => setShowActions((v) => !v)}>
            {showActions ? 'Ocultar' : 'Ver'}
          </button>
        </h3>
        {showActions && (
          <div className="pane-body">
            <p className="hint" style={{ marginTop: 0 }}>
              Hasta {max} acciones por semana. Cada una tiene costos, beneficios y algún riesgo. Ninguna es obligatoria:
              se aplican al pasar lista.
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
                      <Icon name={actionIcon(a.id)} size={17} /> {a.name}
                    </div>
                    <div className="action-desc">{a.description}</div>
                    {blocked ? (
                      <div className="action-blocked">✕ {check.reason}</div>
                    ) : (
                      <div className="action-cost">{a.costLabel}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ASADO_TIER_INFO: Record<string, { icon: IconName; title: string; cls: string }> = {
  fieston: { icon: 'asado', title: 'Asadazo', cls: 'good' },
  bueno: { icon: 'asado', title: 'Buen asado', cls: 'good' },
  flojo: { icon: 'animo', title: 'Asado flojo', cls: 'warn' },
  papelon: { icon: 'alerta', title: 'Papelón', cls: 'bad' },
};

/** Crónica del asado: quiénes estuvieron en la mesa y qué dejó la noche. */
function AsadoReportCard({ state }: { state: GameState }) {
  const report = state.lastAsado;
  if (!report || report.week !== state.week) return null;
  const info = ASADO_TIER_INFO[report.tier];
  const byId = (id: string) => state.players.find((p) => p.id === id);
  const attended = report.attended.map(byId).filter((p): p is Player => !!p);
  const total = state.players.filter((p) => !p.leftClub).length;
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>
        <Icon name={info.icon} size={16} /> {info.title}
        <span className={`chip ${info.cls}`} style={{ marginLeft: '0.5rem' }}>
          {attended.length} de {total} en la mesa
        </span>
        {report.rained && <span className="chip" style={{ marginLeft: '0.3rem' }}>Con lluvia</span>}
      </h3>
      {attended.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.4rem 0' }}>
          {attended.map((p) => (
            <span key={p.id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Avatar seed={p.id} age={p.age} appearance={p.appearance} size={22} title={p.name} personality={p.personality} />
              <PlayerLink id={p.id}>{shortName(p.name)}</PlayerLink>
            </span>
          ))}
        </div>
      )}
      {report.missed.length > 0 && (
        <ul className="log-list" style={{ margin: '0.3rem 0' }}>
          {report.missed.map((m) => {
            const p = byId(m.playerId);
            if (!p) return null;
            return (
              <li key={m.playerId}>
                <PlayerLink id={p.id}>{p.name}</PlayerLink>: {m.reason}
              </li>
            );
          })}
        </ul>
      )}
      {report.highlights.map((h, i) => (
        <p key={i} style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>
          {h}
        </p>
      ))}
    </div>
  );
}

function CallUpPanel({ state, dispatch }: Props) {
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1])!;
  const entries = state.callUp;
  // Bajas y llegadas tarde: todo lo que el DT tiene que saber antes de armar.
  // En la lista grande va todo lo que pide atención o tiene historia que contar:
  // bajas, llegadas tarde, fundidos y los que diste vuelta con una gestión.
  const outs = entries.filter((e) => e.status !== 'confirmado' || e.lateArrival || e.resolved || e.exhausted);
  const confirmed = entries.filter((e) => e.status === 'confirmado' && !e.lateArrival && !e.resolved && !e.exhausted);
  const stillInjured = state.players.filter(
    (p) => !p.leftClub && p.status === 'lesionado' && !entries.some((e) => e.playerId === p.id)
  );
  const suspended = state.players.filter((p) => !p.leftClub && (p.suspendedWeeks ?? 0) > 0);
  const availableCount = entries.filter((e) => e.status === 'confirmado').length;
  const bajas = entries.filter((e) => e.status !== 'confirmado').length + stillInjured.length + suspended.length;
  // El mismo denominador que la barra de recursos, El club y la Plantilla: los
  // que están en el club. Así "vinieron todos" dice cuántos son "todos".
  const enElPlantel = state.players.filter((p) => !p.leftClub).length;

  return (
    /* Ya entraba en la ventana; con el marco fijo scrollea adentro de sí misma
       si una semana brava trae seis ausencias con sus gestiones. */
    <div className="semana-scroll">
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

      <AsadoReportCard state={state} />


      <div className="card">
        <h3>
          Pasando lista · {weekLabel(state.week, state.seasonLength)} vs <RivalLink id={rival.id}>{rival.name}</RivalLink>
          <span
            className="chip"
            style={{ marginLeft: '0.5rem' }}
            title="Dificultad de faltas elegida al crear la partida"
          >
            Faltas: {BALANCE.absenceDifficulty[state.absenceDifficulty ?? 'medio'].label}
          </span>
          <span
            className={`chip ${state.callUpTiming === 'tarde' ? 'warn' : 'accent'}`}
            style={{ marginLeft: '0.3rem' }}
            title={
              state.callUpTiming === 'tarde'
                ? 'La pasaste sobre la hora: lo que ves es definitivo, pero no hay margen para gestionar bajas.'
                : 'La largaste 2 días antes: podés gestionar las bajas, pero el día del partido alguno más se puede caer.'
            }
          >
            {state.callUpTiming === 'tarde' ? 'Lista sobre la hora' : 'Lista 2 días antes'}
          </span>
        </h3>
        <SemanaStrip state={state} />
        {state.callUpTiming === 'tarde' && state.callUp.some((e) => e.status === 'ausente') && (
          <p className="muted" style={{ marginTop: 0, color: 'var(--warn)' }}>
            Te enteraste sobre la hora: no queda margen para gestionar ninguna baja.
          </p>
        )}
        {outs.length === 0 && stillInjured.length === 0 && suspended.length === 0 ? (
          <p style={{ marginTop: 0 }}>
            ✓ <strong>Vinieron todos: los {enElPlantel} del plantel.</strong> Semana tranquila: el grupo está entero
            para el partido.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            {availableCount} confirmado{availableCount !== 1 ? 's' : ''} · {bajas} baja{bajas !== 1 ? 's' : ''} · de los{' '}
            {enElPlantel} del plantel
          </p>
        )}

        {(outs.length > 0 || stillInjured.length > 0 || suspended.length > 0) && (
          <div className="callup-list">
            {outs.map((e) => {
              const reason = e.reasonId ? reasonById(e.reasonId) : undefined;
              const canAct = e.status === 'ausente' && reason && !e.resolved && state.callUpTiming !== 'tarde';
              const pl = state.players.find((p) => p.id === e.playerId);
              return (
                <div key={e.playerId} className="callup-row out">
                  {pl && (
                    <div className="avatar callup-avatar">
                      <Avatar
                        seed={pl.id}
                        age={pl.age}
                        appearance={pl.appearance}
                        expressionOverride={e.status === 'lesionado' ? 3 : 2}
                        title={pl.name}
                        personality={pl.personality}
                      />
                    </div>
                  )}
                  <span className="callup-icon">
                    {e.status === 'lesionado' ? (
                      <Icon name="enfermeria" size={15} />
                    ) : e.exhausted && e.status === 'confirmado' ? (
                      <Icon name="fisico" size={15} />
                    ) : e.lateArrival ? (
                      <Icon name="reloj" size={15} />
                    ) : e.status === 'confirmado' ? (
                      '✓'
                    ) : (
                      '✕'
                    )}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="callup-name">
                      <PlayerLink id={e.playerId}>{e.playerName}</PlayerLink>
                      <span
                        className={`chip ${e.status === 'lesionado' ? 'bad' : e.exhausted && e.status === 'confirmado' ? 'warn' : e.lateArrival ? 'warn' : e.status === 'confirmado' ? 'good' : 'warn'}`}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        {e.status === 'lesionado'
                          ? 'Se lesionó afuera'
                          : e.exhausted && e.status === 'confirmado'
                            ? e.playingExhausted
                              ? 'Juega fundido'
                              : 'Viene fundido'
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
                    {e.exhausted && !e.resolved && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                        <button
                          className="small"
                          title="No juega esta semana: recupera físico y lo valora"
                          onClick={() => dispatch({ type: 'CALLUP_EXHAUSTED', playerId: e.playerId, decision: 'descansar' })}
                        >
                          Darle la semana
                        </button>
                        <button
                          className="small"
                          title="Juega igual: rinde menos y el cuerpo puede decir basta"
                          onClick={() => dispatch({ type: 'CALLUP_EXHAUSTED', playerId: e.playerId, decision: 'jugar' })}
                        >
                          Lo necesito igual
                        </button>
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
                <div className="avatar callup-avatar">
                  <Avatar seed={p.id} age={p.age} appearance={p.appearance} expressionOverride={3} title={p.name} personality={p.personality} />
                </div>
                <span className="callup-icon"><Icon name={p.injuryReason === 'laboral' ? 'laburo' : 'enfermeria'} size={15} /></span>
                <div>
                  <div className="callup-name">
                    <PlayerLink id={p.id}>{p.name}</PlayerLink>
                  </div>
                  <div className="callup-note">
                    {p.injuryReason === 'laboral' ? 'Sigue a full con el laburo' : 'Sigue lesionado'}: le queda
                    {p.injuryWeeks > 1 ? 'n' : ''} {p.injuryWeeks} semana
                    {p.injuryWeeks > 1 ? 's' : ''}.
                  </div>
                </div>
              </div>
            ))}
            {suspended.map((p) => (
              <div key={p.id} className="callup-row out dim">
                <div className="avatar callup-avatar">
                  <Avatar seed={p.id} age={p.age} appearance={p.appearance} expressionOverride={2} title={p.name} personality={p.personality} />
                </div>
                <span className="callup-icon"><i className="tarjeta-roja" title="Suspendido" /></span>
                <div>
                  <div className="callup-name">
                    <PlayerLink id={p.id}>{p.name}</PlayerLink>
                    <span className="chip bad" style={{ marginLeft: '0.5rem' }}>
                      Suspendido
                    </span>
                  </div>
                  <div className="callup-note">
                    Cumple la fecha de suspensión por acumulación de técnicas. Mira desde la tribuna.
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
                ✓ <PlayerLink id={e.playerId}>{e.playerName}</PlayerLink>
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

/* La tira de 5 cartas del quinteto se eliminó en la tanda C del marco fijo.
   Mostraba puesto, cara, nombre, altura, una barra de físico y la media de los
   mismos cinco que ya muestra la pizarra justo abajo: era la duplicación más
   cara de la pantalla (unos 180px de los 530 que hay a 720p, y con ella la
   pizarra no entraba). Lo único que aportaba y la pizarra no decía —la altura—
   se mudó a la línea de cada puesto en la cancha. */

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
  // Los que llegan al segundo tiempo cuentan para la planilla pero no pueden
  // arrancar: si por ellos no se llega a 5 titulares, se arranca corto (nunca
  // más el botón muerto sin explicación).
  const lateIds = new Set(state.callUp.filter((c) => c.lateArrival && c.status === 'confirmado').map((c) => c.playerId));
  const startable = available.filter((p) => !lateIds.has(p.id));
  const maxStarters = Math.min(5, startable.length);
  const shortStart = maxStarters < 5 && available.length >= 5;
  const canPlay = count === 5 || (shortStart && count === maxStarters && count > 0);
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

  // Los que vinieron y se quedan mirando: la pizarra lo dice antes de empezar
  // (T4), y nombra a los que se van a calentar por eso.
  const leftOut = available.filter((p) => !state.starters.includes(p.id) && !rotationIds.includes(p.id));
  const leftOutHot = leftOut.filter(
    (p) => p.personality === 'protagonista' || p.expectedRole === 'titular' || p.grievance?.cause === 'minutos'
  );

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
    /* Tres franjas de alto fijo (tanda C): arriba cómo llega el partido y el
       quinteto de un vistazo, en el medio la pizarra —que es LA acción de esta
       pantalla y antes quedaba medio escondida abajo del pliegue—, abajo la
       confirmación siempre en el mismo lugar. */
    <div className="quinteto-pantalla">
      <div className="quinteto-cabecera">
      <div className="card">
        <h3>
          {weekLabel(state.week, state.seasonLength)} · vs <RivalLink id={rival.id}>{rival.name}</RivalLink>
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
          <span className="chip accent" title={style.desc}>
            {style.label}
          </span>
          <Tip text={TIPS.titulares}>
            <span className={`chip ${count === 5 || (shortStart && count === maxStarters) ? 'good' : 'warn'}`}>
              Titulares: {count}/{shortStart ? maxStarters : 5}
            </span>
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
            {available.length > 5 && ` Tenés ${available.length} en la planilla.`}
          </p>
        )}
        {count === 5 && rotationIds.length > 0 && leftOut.length > 0 && (
          <p className="muted" style={{ marginBottom: 0, color: 'var(--warn)' }}>
            Vas con {count + rotationIds.length} y tenés {available.length} en la planilla:{' '}
            {leftOutHot.length > 0
              ? `${leftOutHot.map((p) => shortName(p.name)).join(', ')} ${leftOutHot.length > 1 ? 'se van' : 'se va'} a calentar mirando desde afuera.`
              : `${leftOut.map((p) => shortName(p.name)).join(', ')} ${leftOut.length > 1 ? 'miran' : 'mira'} desde afuera.`}
          </p>
        )}
        {count === 5 && rotationIds.length > 0 && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {rotationIds.length >= PLAN_MIN_BENCH
              ? 'Con banco, el partido rota solo: frescos en el 2° cuarto, titulares en el 3°, cerradores al final. En el partido lo podés pasar a mano.'
              : 'Con un solo suplente los cambios son tuyos: el plan rota solo desde dos en el banco.'}
          </p>
        )}
      </div>

      {state.callUp.some((e) => e.lastMinute) && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--bad)' }}>
            <Icon name="alerta" size={16} /> Baja{state.callUp.filter((e) => e.lastMinute).length > 1 ? 's' : ''} de
            último momento
          </h3>
          {state.callUp
            .filter((e) => e.lastMinute)
            .map((e) => (
              <p key={e.playerId} style={{ margin: '0.25rem 0' }}>
                <PlayerLink id={e.playerId}>{e.playerName}</PlayerLink>: {e.note}
              </p>
            ))}
          <p className="muted" style={{ margin: '0.3rem 0 0' }}>
            La lista se largó hace dos días y la vida siguió pasando. No hay margen para gestiones: se arma con los que
            están.
          </p>
        </div>
      )}


      {forfeitRisk && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--bad)' }}>
            Solo hay {available.length} jugadores disponibles: no llega a 5. Si jugás así, se pierde por forfeit.
          </strong>
        </div>
      )}
      {shortStart && (
        <div className="card" style={{ borderColor: 'var(--warn)', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--warn)' }}>
            Solo {maxStarters} pueden arrancar:{' '}
            {available
              .filter((p) => lateIds.has(p.id))
              .map((p) => p.name)
              .join(' y ')}{' '}
            llega{available.filter((p) => lateIds.has(p.id)).length > 1 ? 'n' : ''} para el segundo tiempo. Se arranca
            corto y entra{available.filter((p) => lateIds.has(p.id)).length > 1 ? 'n' : ''} en el 3er cuarto.
          </strong>
        </div>
      )}
      </div>

      <div className="lineup-layout">
        <div className="lineup-izq">
        <div className="lineup-list card" onDragOver={allowDrop} onDrop={dropOnList}>
          <div className="lineup-toolbar">
            <h3 style={{ margin: 0 }}>Plantel</h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="small" onClick={() => dispatch({ type: 'AUTO_LINEUP' })}>
                Sugerir
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
                        {absent.has(p.id)
                          ? 'No vino'
                          : p.status === 'lesionado'
                            ? p.injuryReason === 'laboral'
                              ? `Laburo ${p.injuryWeeks} sem.`
                              : `Lesión ${p.injuryWeeks} sem.`
                            : 'No disponible'}
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
                    {avail && lateIds.has(p.id) && (
                      <span className="chip warn" style={{ marginLeft: '0.4rem' }} title="Solo puede entrar desde el banco, en el segundo tiempo">
                        <Icon name="reloj" size={11} /> 2do tiempo
                      </span>
                    )}
                  </div>
                  <div className="lp-meta">
                    <span title="Físico">
                      <Icon name="fisico" size={12} /> {Math.round(p.physical)}
                    </span>
                    <span title="Motivación">
                      <Icon name="animo" size={12} /> {Math.round(p.motivation)}
                    </span>
                    {p.lastRating !== null && <span title="Último partido">Últ. {p.lastRating}/10</span>}
                  </div>
                </div>
                <div className="lp-rating">
                  <div className="num">≈{p.visibleRating}</div>
                </div>
                <div className="lp-btns">
                  <button
                    className={`mini${isStarter ? ' on' : ''}`}
                    title={lateIds.has(p.id) ? 'Llega al segundo tiempo: no puede ser titular' : 'Titular'}
                    disabled={!avail || lateIds.has(p.id) || (starterFull && !isStarter)}
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
        {/* El scouting del rival, debajo de la lista: primero armás el quinteto,
            después leés al rival. Scrollea junto con el plantel. */}
        <ScoutingCard state={state} />
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
                    {pl ? <Avatar seed={pl.id} age={pl.age} appearance={pl.appearance} title={pl.name} personality={pl.personality} /> : '+'}
                  </div>
                  <div className={`slot-name${pl ? '' : ' dim'}`}>{pl ? shortName(pl.name) : 'Libre'}</div>
                  {pl && (
                    <div className={`slot-sub${oop ? ' oop-text' : ''}`}>
                      ≈{pl.visibleRating} · {(pl.height / 100).toFixed(2)} m
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
                <div className="slot-avatar small">
                  <Avatar seed={p.id} age={p.age} appearance={p.appearance} title={p.name} personality={p.personality} />
                </div>
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

      <div className="quinteto-pie">
      {lineupPromiseWarnings(state).map((w) => (
        <p key={w.playerId} style={{ color: w.breaksToday ? 'var(--bad)' : 'var(--warn, #c90)', fontWeight: 600, margin: '0 0 0.35rem' }}>
          {w.text}
        </p>
      ))}

      <div className="confirm-bar">
        <button
          className="primary"
          disabled={!canPlay && !forfeitRisk}
          onClick={() => dispatch({ type: 'START_MATCH' })}
        >
          {forfeitRisk && !canPlay ? 'Presentarse igual (forfeit) →' : 'Ir al partido →'}
        </button>
        {!canPlay && !forfeitRisk && (
          <span className="hint">
            {shortStart
              ? `Marcá como titulares a los ${maxStarters} que pueden arrancar (botón T).`
              : 'Elegí exactamente 5 titulares (botón T).'}
          </span>
        )}
        {canPlay && (
          <span className="hint">
            Arrastrá jugadores a los puestos de la cancha o al banco (también sirven los botones T/R). Click en la
            pizarra para sacar.
          </span>
        )}
      </div>
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
    /* El Informe era la peor de todas: una tira vertical de seis bloques que
       medía casi tres pantallas a 720p. El contenido no sobraba —la forma sí—,
       así que entra completo repartido en tres columnas, sin sacar una línea. */
    <div className="informe-pantalla">
      {/* La cabecera es una franja, como en el partido (sep 2026): el
          resultado, el marcador con los cuartos en una línea, el resumen y la
          figura. Antes medía 275 px (marcador grande + tabla de cuartos con los
          mismos números) y a las tres columnas les quedaban 257. */}
      <div className="card partido-franja informe-franja">
        <div className="franja-quien">
          <span className={`result-badge ${m.won ? 'win' : 'lose'}`}>
            {m.forfeit ? 'FORFEIT' : m.won ? 'VICTORIA' : 'DERROTA'}
          </span>
          <h3 style={{ margin: 0 }}>
            {weekLabel(m.week, state.seasonLength)} · vs <RivalLink id={m.rivalId}>{m.rivalName}</RivalLink>
          </h3>
        </div>

        <div className="franja-marcador">
          <span className="fm-team">{state.club.name}</span>
          <span className={`fm-score ${m.won ? 'win' : 'lose'}`}>{m.scoreFor}</span>
          <span className="fm-sep">final</span>
          <span className={`fm-score ${m.won ? 'lose' : 'win'}`}>{m.scoreAgainst}</span>
          <span className="fm-team"><RivalLink id={m.rivalId}>{m.rivalName}</RivalLink></span>
          {m.quarters.length > 0 && (
            <div className="fm-cuartos" title="Parciales por cuarto (nosotros-ellos)">
              {m.quarters.map((q, i) => (
                <span key={i} className="fm-cuarto">
                  <b>{i < 4 ? `Q${i + 1}` : 'PR'}</b> {q.for}-{q.against}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="franja-estado">
          <span className="franja-linea" title={m.summary}>{m.summary}</span>
          {m.mvpName && m.mvpId && (
            <span className="chip accent">
              <Icon name="estrella" size={13} /> Figura: <PlayerLink id={m.mvpId}>{m.mvpName}</PlayerLink>
            </span>
          )}
        </div>
      </div>

      <div className="informe-cuerpo">
      {(m.box ?? []).length > 0 && (
        <div className="card pane informe-planilla">
          <h3 className="card-band">Planilla del partido</h3>
          <div className="table-wrap pane-body">
            <table className="planilla">
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
                      <PlayerLink id={line.playerId}>{line.name}</PlayerLink> {line.mvp ? <Icon name="estrella" size={11} /> : ''}
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

      <div className="informe-col">
      {m.highlights.length > 0 && (
        <div className="card">
          <h3>El relato del partido</h3>
          <ul className="reason-list">
            {m.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

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

      {m.lockerRoom.length > 0 && (
        <div className="card">
          <h3>En el vestuario</h3>
          <ul className="reason-list">
            {m.lockerRoom.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      </div>

      {(m.moods ?? []).length > 0 && (
        <div className="card pane informe-moods">
          <h3 className="card-band">Cómo quedó cada uno</h3>
          <div className="data-grid pane-body">
            {m.moods!.map((mood) => {
              const cls =
                mood.emotion === 'euforico' || mood.emotion === 'orgulloso' || mood.emotion === 'contento'
                  ? 'good'
                  : mood.emotion === 'molesto_minutos'
                    ? 'bad'
                    : mood.emotion === 'frustrado' || mood.emotion === 'decepcionado'
                      ? 'warn'
                      : '';
              const moodPlayer = state.players.find((p) => p.id === mood.playerId);
              return (
                <div className="data-row" key={mood.playerId}>
                  <span className="data-label mood-label">
                    {moodPlayer && (
                      <span className="avatar mood-avatar">
                        <Avatar
                          seed={moodPlayer.id}
                          age={moodPlayer.age}
                          appearance={moodPlayer.appearance}
                          expressionOverride={EMOTION_EXPRESSION[mood.emotion]}
                          title={mood.name}
                          personality={moodPlayer.personality}
                        />
                      </span>
                    )}
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
      </div>

      <div className="confirm-bar">
        <button className="primary" onClick={() => dispatch({ type: 'NEXT_WEEK' })}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

export function WeekView({ state, dispatch }: Props) {
  /* Migración al marco fijo (design/PLAN_MARCO_FIJO.md): las fases ya
     convertidas ocupan el alto exacto de la ventana y scrollean por panel; las
     que todavía no, siguen creciendo hacia abajo y las scrollea `.app-shell`.
     La lista crece tanda a tanda y desaparece en la E, cuando estén todas. */
  const fija =
    state.phase === 'planning' ||
    state.phase === 'callUp' ||
    state.phase === 'lineup' ||
    state.phase === 'match' ||
    state.phase === 'matchResult';

  return (
    <div className={fija ? 'semana-vista pantalla' : undefined}>
      <Steps phase={state.phase} />
      {state.phase === 'planning' && <PlanningPanel state={state} dispatch={dispatch} />}
      {state.phase === 'callUp' && <CallUpPanel state={state} dispatch={dispatch} />}
      {state.phase === 'lineup' && <LineupPanel state={state} dispatch={dispatch} />}
      {state.phase === 'match' && <PartidoVivo state={state} dispatch={dispatch} />}
      {state.phase === 'matchResult' && <MatchResultPanel state={state} dispatch={dispatch} />}
    </div>
  );
}
