// Etapa 2 · Convocatoria: el resultado de las decisiones, la crónica del asado
// y la lista con sus bajas y gestiones. Termina en "Armar el quinteto".

import type { GameState, Player } from '../../game/types';
import { ABSENCE_ACTIONS, reasonById } from '../../game/absences';
import { BALANCE } from '../../game/balance';
import { Icon, type IconName } from '../Icon';
import { PlayerLink } from '../PlayerLink';
import { RivalLink } from '../RivalLink';
import { weekLabel } from '../helpers';
import { useEspacio } from '../teclas';
import { Avatar } from '../Avatar';
import { SemanaStrip, shortName, type Props } from './comun';

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

export function CallUpPanel({ state, dispatch }: Props) {
  /* Espacio sigue el camino de la semana donde no hay nada que decidir: pasar
     de la convocatoria al quinteto, del quinteto al partido y del informe a la
     semana siguiente. En "La semana" NO, a propósito: ahí Espacio elegiría por
     vos entre largar la lista temprano o sobre la hora, que es la decisión. */
  useEspacio(() => dispatch({ type: 'PROCEED_TO_LINEUP' }));
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
    /* Una semana brava con seis ausencias y sus gestiones crece hacia abajo y
       la scrollea la ventana, no el panel. */
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

      {/* El pie fijo, como en el quinteto, el partido y el informe: con la
          crónica del asado y cuatro bajas la lista mide más que la ventana y
          el botón quedaba abajo del pliegue; y a 1280×720 ni siquiera hace
          falta el asado. */}
      <div className="callup-pie pie-fijo">
        <div className="confirm-bar">
          <button className="primary" onClick={() => dispatch({ type: 'PROCEED_TO_LINEUP' })}>
            Armar el quinteto →
          </button>
          <span className="hint">
            <b>Espacio</b> también.
          </span>
        </div>
      </div>
    </div>
  );
}
