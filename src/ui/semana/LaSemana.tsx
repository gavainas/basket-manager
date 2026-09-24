// Etapa 1 · La semana: el rival, la tira de días, la previa que se pica y las
// acciones del club. Termina largando la lista (temprana o sobre la hora).

import { useState } from 'react';
import type { GameState, Player } from '../../game/types';
import { ACTIONS } from '../../game/actions';
import { BALANCE } from '../../game/balance';
import { refereeOfWeek, rivalryWith } from '../../game/leagueLife';
import { Icon } from '../Icon';
import { PlayerLink } from '../PlayerLink';
import { StyleChip } from '../StyleChip';
import { RivalLink } from '../RivalLink';
import { rivalDifficulty, weekLabel } from '../helpers';
import { Avatar } from '../Avatar';
import { actionIcon, SemanaStrip, type Props } from './comun';

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
export function PlanningPanel({ state, dispatch }: Props) {
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
                /* Un botón de verdad, no un div clickeable (sep 2026): tiene
                   foco, se marca y se destilda con el teclado, y el lector de
                   pantalla sabe si está elegida. La elegida siempre se puede
                   destildar, aunque el cupo esté lleno. */
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`action-card${selected ? ' selected' : ''}${blocked || full ? ' disabled' : ''}`}
                    aria-pressed={selected}
                    disabled={(blocked || full) && !selected}
                    onClick={() => dispatch({ type: 'TOGGLE_ACTION', id: a.id })}
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
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
