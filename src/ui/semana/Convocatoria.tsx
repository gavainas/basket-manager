// Etapa 2 · Convocatoria: el resultado de las decisiones, la crónica del asado
// y la lista con sus bajas y gestiones. Termina en "Armar el quinteto".
//
// UI V1 (sep 2026): la convocatoria es literalmente quién viene, así que la
// pantalla se arma con personas. Arriba a la izquierda, sin caja y sobre el
// vestuario, cuántos vienen (la cifra grande) y lo que dejó la semana escrito
// como frase; a la derecha, la planilla pegada con cinta con las bajas y lo
// que se puede hacer con cada una. Abajo, el plantel de pie sobre el parquet:
// los que vienen adelante, los que no, en gris después del corte.

import { useContext, type CSSProperties } from 'react';
import type { CallUpEntry, GameState, Player, Position } from '../../game/types';
import { ABSENCE_ACTIONS, reasonById } from '../../game/absences';
import { BALANCE } from '../../game/balance';
import { Icon, type IconName } from '../Icon';
import { OpenProfileContext, PlayerLink } from '../PlayerLink';
import { RivalLink } from '../RivalLink';
import { FilaDePie, type PersonaDePie } from '../Busto';
import { weekLabel } from '../helpers';
import { useEspacio } from '../teclas';
import { Cara, POSITION_ORDER, SemanaStrip, shortName, type Props } from './comun';

const ASADO_TIER_INFO: Record<string, { icon: IconName; title: string; cls: string }> = {
  fieston: { icon: 'asado', title: 'Asadazo', cls: 'good' },
  bueno: { icon: 'asado', title: 'Buen asado', cls: 'good' },
  flojo: { icon: 'animo', title: 'Asado flojo', cls: 'warn' },
  papelon: { icon: 'alerta', title: 'Papelón', cls: 'bad' },
};

const POS_CORTO: Record<Position, string> = { Base: 'BAS', Escolta: 'ESC', Alero: 'ALE', 'Ala-Pívot': 'ALA', Pívot: 'PIV' };

/** En la fila de pie entra el apodo si lo tiene, y si no el apellido (como en el Tablero). */
function nombreCorto(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  return nick ? nick[1] : shortName(name);
}

/** Crónica del asado: quiénes estuvieron en la mesa y qué dejó la noche. */
function AsadoCronica({ state }: { state: GameState }) {
  const report = state.lastAsado;
  if (!report || report.week !== state.week) return null;
  const info = ASADO_TIER_INFO[report.tier];
  const byId = (id: string) => state.players.find((p) => p.id === id);
  const attended = report.attended.map(byId).filter((p): p is Player => !!p);
  const total = state.players.filter((p) => !p.leftClub).length;
  return (
    <section className="sem-cronica" aria-label="El asado">
      <div className="v1-eyebrow">
        <Icon name={info.icon} size={13} /> <b className={info.cls}>{info.title}</b> · {attended.length} de {total} en la mesa
        {report.rained && ' · con lluvia'}
      </div>
      {attended.length > 0 && (
        <div className="sem-caras-fila">
          {attended.map((p) => (
            <span key={p.id} className="sem-cara-nom" title={p.name}>
              <Cara p={p} size={30} />
              <PlayerLink id={p.id}>{shortName(p.name)}</PlayerLink>
            </span>
          ))}
        </div>
      )}
      {report.missed.map((m) => {
        const p = byId(m.playerId);
        if (!p) return null;
        return (
          <p key={m.playerId} className="v1-frase">
            <PlayerLink id={p.id}>{p.name}</PlayerLink> no fue: {m.reason}
          </p>
        );
      })}
      {report.highlights.map((h, i) => (
        <p key={i} className="v1-frase sem-cita">
          {h}
        </p>
      ))}
    </section>
  );
}

/** Lo que dice la planilla sobre cada uno que pide atención: el estado, escrito. */
function estadoEntrada(e: CallUpEntry): { cls: 'good' | 'warn' | 'bad'; label: string } {
  if (e.status === 'lesionado') return { cls: 'bad', label: 'Se lesionó afuera' };
  if (e.exhausted && e.status === 'confirmado') return { cls: 'warn', label: e.playingExhausted ? 'Juega fundido' : 'Viene fundido' };
  if (e.lateArrival) return { cls: 'warn', label: 'Llega al 2° tiempo' };
  if (e.status === 'confirmado') return { cls: 'good', label: 'Al final viene' };
  return { cls: 'bad', label: 'No viene' };
}

export function CallUpPanel({ state, dispatch }: Props) {
  const open = useContext(OpenProfileContext);
  /* Espacio sigue el camino de la semana donde no hay nada que decidir: pasar
     de la convocatoria al quinteto, del quinteto al partido y del informe a la
     semana siguiente. En "La semana" NO, a propósito: ahí Espacio elegiría por
     vos entre largar la lista temprano o sobre la hora, que es la decisión. */
  useEspacio(() => dispatch({ type: 'PROCEED_TO_LINEUP' }));
  const rival = state.rivals.find((r) => r.id === state.schedule[state.week - 1])!;
  const entries = state.callUp;
  // En la planilla va todo lo que pide atención o tiene historia que contar:
  // bajas, llegadas tarde, fundidos y los que diste vuelta con una gestión.
  const outs = entries.filter((e) => e.status !== 'confirmado' || e.lateArrival || e.resolved || e.exhausted);
  const stillInjured = state.players.filter(
    (p) => !p.leftClub && p.status === 'lesionado' && !entries.some((e) => e.playerId === p.id)
  );
  const suspended = state.players.filter((p) => !p.leftClub && (p.suspendedWeeks ?? 0) > 0);
  const availableCount = entries.filter((e) => e.status === 'confirmado').length;
  const bajas = entries.filter((e) => e.status !== 'confirmado').length + stillInjured.length + suspended.length;
  // El mismo denominador que la barra de recursos, El club y la Plantilla: los
  // que están en el club. Así "vinieron todos" dice cuántos son "todos".
  const enElPlantel = state.players.filter((p) => !p.leftClub).length;
  const tarde = state.callUpTiming === 'tarde';
  const nadaQueVer = outs.length === 0 && stillInjured.length === 0 && suspended.length === 0;
  const pendientes = outs.filter(
    (e) => (e.exhausted && !e.resolved) || (e.status === 'ausente' && !e.resolved && !tarde && e.reasonId)
  ).length;

  // El plantel de pie: por puesto, los que no vienen al final y en gris.
  const personas: PersonaDePie[] = state.players
    .filter((p) => !p.leftClub)
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
    .map((p) => {
      const e = entries.find((x) => x.playerId === p.id);
      let estado: PersonaDePie['estado'] = null;
      let fuera = false;
      if ((p.suspendedWeeks ?? 0) > 0) {
        estado = { cls: 'bad', label: 'Suspendido' };
        fuera = true;
      } else if (!e) {
        if (p.status === 'lesionado') {
          estado = { cls: 'bad', label: p.injuryReason === 'laboral' ? 'Laburo' : `Lesión · ${p.injuryWeeks} sem` };
          fuera = true;
        }
      } else if (e.status === 'lesionado') {
        estado = { cls: 'bad', label: 'Lesionado' };
        fuera = true;
      } else if (e.status !== 'confirmado') {
        estado = { cls: 'bad', label: 'No viene' };
        fuera = true;
      } else if (e.exhausted) {
        estado = { cls: 'warn', label: 'Fundido' };
      } else if (e.lateArrival) {
        estado = { cls: 'warn', label: '2° tiempo' };
      } else if (e.resolved) {
        estado = { cls: 'good', label: 'Al final viene' };
      }
      return {
        id: p.id,
        nombre: nombreCorto(p.name),
        personality: p.personality,
        sub: POS_CORTO[p.position],
        estado,
        fuera,
        title: `${p.name}${estado ? ` — ${estado.label}` : ' — Confirmado'}`,
        onClick: () => open(p.id),
      };
    });

  return (
    /* Una semana brava con seis ausencias y sus gestiones crece hacia abajo y
       la scrollea la ventana, no el panel; el pie con la acción queda fijo. */
    <div className="sem-convoca sem-flujo">
      <div className="sem-convoca-arriba">
        <section className="sem-convoca-hero v1-hero" aria-label="Quién viene">
          <div className="v1-eyebrow">
            <b>{weekLabel(state.week, state.seasonLength).replace('Semana', 'Fecha')}</b> · vs{' '}
            <RivalLink id={rival.id}>{rival.name}</RivalLink> · {tarde ? 'lista sobre la hora' : 'lista 2 días antes'}
          </div>
          <div className="sem-convoca-cifra">
            <div className={`v1-cifra${availableCount < 5 ? ' bad' : ''}`}>
              {availableCount} {availableCount === 1 ? 'VIENE' : 'VIENEN'}
              <small>de los {enElPlantel} del plantel</small>
            </div>
            <p className="v1-frase">
              {nadaQueVer ? (
                <>
                  <b className="good">Vinieron todos.</b> Semana tranquila: el grupo está entero para el partido.
                </>
              ) : (
                <>
                  <b className={bajas > 0 ? 'bad' : 'good'}>
                    {bajas === 0 ? 'Ninguna baja' : bajas === 1 ? '1 baja' : `${bajas} bajas`}
                  </b>
                  {pendientes > 0 && (
                    <>
                      {' '}
                      y <b className="warn">{pendientes === 1 ? '1 cosa' : `${pendientes} cosas`}</b> para resolver
                    </>
                  )}
                  .{' '}
                  {tarde
                    ? 'La pasaste sobre la hora: lo que ves es definitivo, pero no queda margen para gestionar nada.'
                    : 'La largaste con dos días de margen: se puede gestionar, pero el día del partido alguno más se puede caer.'}
                </>
              )}{' '}
              <span title="Dificultad de faltas elegida al crear la partida">
                Faltas: {BALANCE.absenceDifficulty[state.absenceDifficulty ?? 'medio'].label.toLowerCase()}.
              </span>
            </p>
          </div>
          {availableCount < 5 && (
            <p className="v1-frase sem-alerta">
              <b className="bad">Sólo {availableCount} disponibles: no llega a 5.</b> Si se juega así, se pierde por forfeit.
            </p>
          )}
          <SemanaStrip state={state} />

          {state.actionsLog.length > 0 && (
            <section className="sem-cronica" aria-label="Lo que dejó la semana">
              <div className="v1-eyebrow">Lo que dejaron tus decisiones</div>
              <ul>
                {state.actionsLog.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            </section>
          )}
          <AsadoCronica state={state} />
        </section>

        <aside className="sem-bajas v1-planilla" aria-label="Las bajas">
          <i className="v1-cinta a" />
          <i className="v1-cinta b" />
          <h3 className="v1-mano">
            {nadaQueVer ? 'Pasando lista' : 'Las bajas'}{' '}
            <span>{nadaQueVer ? 'no falta nadie' : tarde ? 'sin margen para gestionar' : 'y qué hacer con cada una'}</span>
          </h3>
          {nadaQueVer ? (
            <p className="sem-tranquila">
              Vinieron los {enElPlantel} del plantel. Nadie con excusas, nadie fundido: se arma con todos.
            </p>
          ) : (
            <div className="sem-renglones">
              {outs.map((e) => {
                const reason = e.reasonId ? reasonById(e.reasonId) : undefined;
                const canAct = e.status === 'ausente' && reason && !e.resolved && !tarde;
                const pl = state.players.find((p) => p.id === e.playerId);
                const est = estadoEntrada(e);
                return (
                  <div key={e.playerId} className={`sem-baja ${est.cls}`}>
                    {pl ? <Cara p={pl} size={48} cls={est.cls} /> : <span />}
                    <div className="sem-baja-txt">
                      <div className="sem-baja-nom">
                        <PlayerLink id={e.playerId}>{e.playerName}</PlayerLink>
                        <span className={`v1-est ${est.cls}`}>{est.label}</span>
                      </div>
                      {e.note && <p className="sem-baja-nota">{e.note}</p>}
                      {e.resolution && <p className="sem-baja-res">→ {e.resolution}</p>}
                      {e.exhausted && !e.resolved && (
                        <div className="sem-botones">
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
                        <div className="sem-botones">
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
                <div key={p.id} className="sem-baja apagada">
                  <Cara p={p} size={48} gris />
                  <div className="sem-baja-txt">
                    <div className="sem-baja-nom">
                      <PlayerLink id={p.id}>{p.name}</PlayerLink>
                      <span className="v1-est bad">{p.injuryReason === 'laboral' ? 'Laburo' : 'Lesionado'}</span>
                    </div>
                    <p className="sem-baja-nota">
                      {p.injuryReason === 'laboral' ? 'Sigue a full con el laburo' : 'Sigue lesionado'}: le queda
                      {p.injuryWeeks > 1 ? 'n' : ''} {p.injuryWeeks} semana{p.injuryWeeks > 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              ))}
              {suspended.map((p) => (
                <div key={p.id} className="sem-baja apagada">
                  <Cara p={p} size={48} gris />
                  <div className="sem-baja-txt">
                    <div className="sem-baja-nom">
                      <PlayerLink id={p.id}>{p.name}</PlayerLink>
                      <span className="v1-est bad">
                        <i className="tarjeta-roja" /> Suspendido
                      </span>
                    </div>
                    <p className="sem-baja-nota">
                      Cumple la fecha de suspensión por acumulación de técnicas. Mira desde la tribuna.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <section className="sem-convoca-fila" aria-label="El plantel, de pie" style={{ '--n': personas.length } as CSSProperties}>
        <FilaDePie personas={personas} />
      </section>

      <div className="sem-pie pie-fijo">
        <p className="v1-frase">
          <b>{availableCount}</b> {availableCount === 1 ? 'confirmado' : 'confirmados'} para el partido.{' '}
          <span className="sem-tecla">Espacio</span> también sigue.
        </p>
        <button className="primary v1-cta" onClick={() => dispatch({ type: 'PROCEED_TO_LINEUP' })}>
          Armar el quinteto →
        </button>
      </div>
    </div>
  );
}
