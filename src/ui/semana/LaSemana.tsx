// Etapa 1 · La semana: el rival, la tira de días, la previa que se pica y las
// acciones del club. Termina largando la lista (temprana o sobre la hora).
//
// UI V1 (sep 2026): nació junto al Tablero aprobado. A la izquierda, sin caja y
// sobre el gimnasio, el partido que viene, los días que faltan y LA decisión
// de la pantalla (cuándo pasar la lista), con el único botón naranja. A la
// derecha, la planilla pegada con cinta: qué hace el club esta semana, un
// renglón por acción. La previa y el asado son voces del club, no cards.

import type { GameState, Player } from '../../game/types';
import { ACTIONS } from '../../game/actions';
import { BALANCE } from '../../game/balance';
import { refereeOfWeek, rivalryWith } from '../../game/leagueLife';
import { clubByLegacyId } from '../../game/world';
import { Icon } from '../Icon';
import { PlayerLink } from '../PlayerLink';
import { RivalLink } from '../RivalLink';
import { Crest } from '../Crest';
import { Busto } from '../Busto';
import { rivalDifficulty, rivalStyleInfo, weekLabel } from '../helpers';
import { weekTimeline } from '../../game/weekTimeline';
import { actionIcon, Cara, SemanaStrip, shortName, type Props } from './comun';

/** «a», «a y b», «a, b y c». */
function enLista(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// ---------- La previa que se pica ----------

/**
 * El feed de la semana: un jugador real del rival tira la primera piedra, tu
 * vestuario contesta y, algunas semanas, el delegado rival apuesta un asado.
 * Son voces: una cara, un nombre y lo que dijo, directo sobre la escena.
 */
function PreviaFeed({ state, dispatch }: Props) {
  const banter = state.weekBanter;
  if (!banter || banter.week !== state.week || banter.messages.length === 0) return null;
  const bet = state.asadoBet && state.asadoBet.week === state.week ? state.asadoBet : null;
  return (
    <section className="sem-previa" aria-label="La previa se pica">
      <div className="v1-eyebrow">La previa se pica</div>
      {banter.messages.map((m, i) => {
        const own = m.playerId ? state.players.find((p) => p.id === m.playerId) : undefined;
        const seed = m.worldPlayerId ?? own?.id;
        return (
          <div className={`sem-voz ${m.side === 'rival' ? 'rival' : 'nuestra'}`} key={i}>
            {seed ? (
              <span className="sem-cara" style={{ width: 40, height: 40 }} aria-hidden="true">
                <Busto seed={seed} personality={m.personality ?? own?.personality} />
              </span>
            ) : (
              <span className="sem-voz-sin" aria-hidden="true">
                <Icon name="chat" size={17} />
              </span>
            )}
            <div className="sem-voz-txt">
              <b>
                {m.name}
                {m.side === 'rival' && <small> · del rival</small>}
              </b>
              <p>{m.text}</p>
              {m.isBet && bet?.status === 'propuesta' && (
                <div className="sem-botones">
                  <button className="small" onClick={() => dispatch({ type: 'ASADO_BET', accept: true })}>
                    <Icon name="asado" size={13} /> Aceptar: el que pierde paga
                  </button>
                  <button className="small ghost" onClick={() => dispatch({ type: 'ASADO_BET', accept: false })}>
                    Ni loco
                  </button>
                </div>
              )}
              {m.isBet && bet && bet.status === 'aceptada' && (
                <span className="v1-est good">Apuesta sellada: el que pierde paga el asado</span>
              )}
              {m.isBet && bet && bet.status === 'rechazada' && <span className="v1-est warn">La dejaste pasar</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** Respuestas del plantel a la convocatoria del asado: quién va, quién duda, quién se baja. */
function AsadoRsvp({ state }: { state: GameState }) {
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
    <section className="sem-asado" aria-label="El asado">
      <div className="v1-eyebrow">El grupo responde por el asado</div>
      <p className="v1-frase">
        Van <b className="good">{going.length}</b>, dudan <b className="warn">{maybe.length}</b> y no van{' '}
        <b className="bad">{declined.length}</b>. Los que dudan se definen el mismo día; si el número no te cierra,
        destildá la acción.
      </p>
      {going.length > 0 && (
        <div className="sem-caras-fila">
          {going.map(({ p }) => (
            <span key={p.id} className="sem-cara-nom" title={p.name}>
              <Cara p={p} size={34} />
              <PlayerLink id={p.id}>{shortName(p.name)}</PlayerLink>
            </span>
          ))}
        </div>
      )}
      {maybe.length > 0 && (
        <p className="v1-frase">
          «Veo y aviso»:{' '}
          {maybe.map(({ p }, i) => (
            <span key={p.id}>
              {i > 0 && (i === maybe.length - 1 ? ' y ' : ', ')}
              <PlayerLink id={p.id}>{p.name}</PlayerLink>
            </span>
          ))}
          .
        </p>
      )}
      {declined.map(({ p, rsvp }) => (
        <p key={p.id} className="v1-frase">
          <PlayerLink id={p.id}>{p.name}</PlayerLink> no va: {rsvp.reason}
        </p>
      ))}
    </section>
  );
}

/**
 * La semana del club, estilo PC Fútbol: el camino directo es el partido.
 * Las acciones (entrenar, asado, rifa…) son un menú opcional, no un peaje.
 */
export function PlanningPanel({ state, dispatch }: Props) {
  const max = BALANCE.actions.maxPerWeek;
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1]);
  const rivalClub = rival ? clubByLegacyId(state.world, rival.id) : undefined;
  const chosen = state.actionsChosen
    .map((id) => ACTIONS.find((a) => a.id === id))
    .filter((a): a is (typeof ACTIONS)[number] => !!a);
  const dias = Math.max(0, -weekTimeline(state).todayOffset);
  const referee = refereeOfWeek(state);
  const rivalry = rival ? rivalryWith(state, rival.id) : null;
  const style = rival ? rivalStyleInfo(rival.style) : null;
  const diff = rival ? rivalDifficulty(rival) : null;

  return (
    <div className="sem-semana">
      <section className="sem-semana-hero v1-hero" aria-label="El partido de la semana">
        <div className="v1-eyebrow">
          <b>{weekLabel(state.week, state.seasonLength).replace('Semana', 'Fecha')}</b>
          {' · '}
          {dias === 0 ? 'hoy se juega' : dias === 1 ? 'falta 1 día para el partido' : `faltan ${dias} días para el partido`}
        </div>
        {rival ? (
          <div className="sem-versus">
            {rivalClub && (
              <Crest seed={rivalClub.id} name={rivalClub.name} colors={rivalClub.colors} founded={rivalClub.founded} size={64} />
            )}
            <h2 className="v1-titulo">
              <small>vs</small> <RivalLink id={rival.id}>{rival.name}</RivalLink>
            </h2>
          </div>
        ) : (
          <h2 className="v1-titulo">La semana del club</h2>
        )}
        {rival && diff && style && (
          <p className="v1-frase sem-clave">
            <b className={diff.cls}>{diff.label}.</b> {style.label}: {style.desc.split(':')[0].toLowerCase()}. Dirige{' '}
            <b title={referee.blurb}>{referee.name}</b>.
          </p>
        )}
        {rivalry && (
          <p className="v1-frase sem-clave">
            <span className="v1-est bad">Revancha</span> {rivalry.text}
          </p>
        )}

        <SemanaStrip state={state} />
        {state.weekMoment && (
          <p className="v1-frase sem-momento">
            <b>{state.weekMoment.title}.</b> {state.weekMoment.text}
          </p>
        )}

        {/* LA decisión de la pantalla: cuándo se pasa lista. Dos caminos con su
            consecuencia escrita debajo; el naranja es el camino de siempre. En
            "La semana" Espacio NO elige por vos (ver Convocatoria). */}
        <div className="sem-decision">
          <div className="sem-op">
            <button
              className="primary v1-cta"
              title="Ves las bajas con 2 días de margen y podés gestionarlas… pero el día del partido alguno más se puede caer."
              onClick={() => dispatch({ type: 'CONFIRM_ACTIONS', timing: 'temprana' })}
            >
              Largar la lista →
            </button>
            <p>
              <b>Dos días antes.</b> Hay margen para gestionar las bajas, pero el día del partido alguno más se puede caer.
            </p>
          </div>
          <div className="sem-op">
            <button
              className="sem-btn-2"
              title="Nadie tiene tiempo de inventar excusas y lo que ves es definitivo… pero tampoco te queda margen para gestionar ninguna baja."
              onClick={() => dispatch({ type: 'CONFIRM_ACTIONS', timing: 'tarde' })}
            >
              Pasarla sobre la hora
            </button>
            <p>
              <b>El mismo día.</b> Lo que ves es definitivo, sin margen para gestionar ninguna baja.
            </p>
          </div>
        </div>
        <p className="v1-frase sem-elegidas">
          {chosen.length > 0 ? (
            <>
              Esta semana además: <b>{enLista(chosen.map((a) => a.name.toLowerCase()))}</b>. Se aplica
              {chosen.length > 1 ? 'n' : ''} al pasar lista.
            </>
          ) : (
            <>Ninguna acción del club elegida: no son obligatorias, el camino directo es el partido.</>
          )}
        </p>

        <PreviaFeed state={state} dispatch={dispatch} />
        {state.actionsChosen.includes('asado') && <AsadoRsvp state={state} />}
      </section>

      {/* La planilla de la semana: el club decide qué hace, un renglón por
          acción, con su costo a la derecha y lo que la bloquea si no se puede. */}
      <aside className="sem-acciones v1-planilla" aria-label="Acciones del club">
        <i className="v1-cinta a" />
        <i className="v1-cinta b" />
        <h3 className="v1-mano">
          Qué hacemos esta semana{' '}
          <span title="Cada acción tiene su costo, su beneficio y algún riesgo. Se aplican al pasar lista.">
            {chosen.length} de {max} · ninguna es obligatoria
          </span>
        </h3>
        <div className="sem-acciones-lista">
          {ACTIONS.map((a) => {
            const check = a.available(state);
            const selected = state.actionsChosen.includes(a.id);
            const blocked = !check.ok && !selected;
            const full = !selected && state.actionsChosen.length >= max;
            /* Un botón de verdad: tiene foco, se marca y se destilda con el
               teclado, y el lector de pantalla sabe si está elegida. La
               elegida siempre se puede destildar, aunque el cupo esté lleno. */
            return (
              <button
                key={a.id}
                type="button"
                className={`sem-accion${selected ? ' on' : ''}${blocked || full ? ' off' : ''}`}
                aria-pressed={selected}
                disabled={(blocked || full) && !selected}
                onClick={() => dispatch({ type: 'TOGGLE_ACTION', id: a.id })}
              >
                <span className="sem-accion-tilde" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
                <span className="sem-accion-nombre">
                  <Icon name={actionIcon(a.id)} size={16} /> {a.name}
                </span>
                {blocked ? (
                  <span className="sem-accion-costo bad">{check.reason}</span>
                ) : (
                  <span className="sem-accion-costo">{a.costLabel}</span>
                )}
                <span className="sem-accion-desc">{a.description}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
