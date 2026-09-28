import type { GameState } from '../game/types';
import { activePlayers } from '../game/match';
import { projectedWeekClose, weeklyEstimate } from '../game/economy';
import { condicionTexto } from '../game/sponsors';
import { feeChipAlways, formatMoney, weekLabel } from './helpers';
import { PlayerLink } from './PlayerLink';
import { Cara, Planilla, plural } from './bloqueD';
import './club.css';

/** +$40 / −$80: el signo siempre, para leer la plata de un vistazo. */
function conSigno(n: number): string {
  return n > 0 ? `+${formatMoney(n)}` : n < 0 ? `−${formatMoney(-n)}` : formatMoney(0);
}

/**
 * Finanzas (UI V1). La pregunta es «¿cómo cierra la caja?». El héroe, sobre
 * la escena de la comisión: lo que hay hoy, cómo cierra la semana si pasa lo
 * previsto y el veredicto en una frase. Al lado, la cuenta de la semana como
 * la lleva el tesorero (lo que entra, lo que sale, lo que queda), que es la
 * planilla protagonista. Abajo, las cuotas del plantel con sus caras y el
 * libro de caja con los últimos movimientos. Verde lo que entra, rojo lo que
 * sale; ningún otro color.
 */
export function FinancesView({ state }: { state: GameState }) {
  const estimate = weeklyEstimate(state);
  const cierre = projectedWeekClose(state);
  const active = activePlayers(state.players);
  const caja = state.club.money;
  const neto = cierre.close - caja;
  // La suma de los renglones de la planilla (la cuota del fiado cuenta
  // siempre; la proyección del héroe sigue la regla del cobro, ver economy.ts).
  const sumaSemana = [...estimate.income, ...estimate.expenses].reduce((t, e) => t + e.amount, 0);
  const enRojo = state.semanasEnRojo ?? 0;
  const recentLedger = [...state.ledger].reverse().slice(0, 12);
  const alDia = active.filter((p) => p.feeStatus === 'pagada').length;
  const deben = active.filter((p) => p.feeStatus === 'pendiente').length;
  const becados = active.length - alDia - deben;
  const semana = state.week <= state.seasonLength ? `Semana ${state.week}` : weekLabel(state.week, state.seasonLength);

  return (
    <div className="finanzas">
      <section className="fz-hero v1-hero" aria-label="Cómo cierra la caja">
        <div className="v1-eyebrow">
          La caja del club · <b>{semana}</b>
        </div>
        <div className="fz-cuenta">
          <div className={`v1-cifra fz-caja${caja < 0 ? ' bad' : ''}`}>
            {formatMoney(caja)}
            <small>en la caja hoy</small>
          </div>
          <div className="fz-flecha" aria-hidden="true">→</div>
          <div className={`v1-cifra fz-cierre${cierre.close < 0 ? ' bad' : ''}`}>
            {formatMoney(cierre.close)}
            <small>al cierre de la semana</small>
          </div>
        </div>
        <p className="fz-veredicto">
          {cierre.close < 0 ? (
            <>
              <b className="bad">Cierra en rojo.</b>{' '}
              {enRojo > 0
                ? 'Ya cerró en rojo una vez y la comisión avisó: otra semana así y el club quiebra.'
                : 'Dos semanas seguidas cerrando en rojo y el club quiebra.'}
            </>
          ) : neto < 0 ? (
            <>
              <b className="warn">Se achica.</b> Lo fijo se come <strong>{formatMoney(-neto)}</strong> más de lo que entra.
            </>
          ) : (
            <>
              <b className="good">Cierra arriba.</b> Lo que entra cubre lo fijo y sobran <strong>{formatMoney(neto)}</strong>.
            </>
          )}
        </p>
        <p className="v1-frase fz-frase">
          {state.sponsor ? (
            <span title={`${state.sponsor.name}: pide ${condicionTexto(state.sponsor)}. Si cumplís, renueva y sube el aporte.`}>
              El sponsor, <b>{state.sponsor.name}</b>, pone <b className="good">{formatMoney(state.sponsor.weekly)}</b> por semana:
              quedan {plural(state.sponsor.weeksLeft, 'semana', 'semanas')} y pide {condicionTexto(state.sponsor)}
              {state.sponsor.renovaciones > 0 ? ` (ya renovó ${state.sponsor.renovaciones === 1 ? 'una vez' : `${state.sponsor.renovaciones} veces`})` : ''}.
            </span>
          ) : state.sponsorWeeks > 0 ? (
            <>Hay sponsor con contrato activo: quedan <b>{plural(state.sponsorWeeks, 'semana', 'semanas')}</b>.</>
          ) : (
            <>Sin sponsor: se puede buscar uno.</>
          )}{' '}
          {enRojo === 0 && cierre.close >= 0 && 'Dos semanas seguidas en rojo y el club quiebra.'}
        </p>
      </section>

      <Planilla mano titulo="La cuenta de la semana" nota="si pasa lo previsto" className="fz-semana" focus="gastos">
        <h4 className="bd-sub">Entra</h4>
        {estimate.income.map((e, i) => (
          <div className="fz-linea" key={`i${i}`}>
            <span>{e.concept}</span>
            <b className="good">{conSigno(e.amount)}</b>
          </div>
        ))}
        <h4 className="bd-sub">Sale</h4>
        {estimate.expenses.map((e, i) => (
          <div className="fz-linea" key={`e${i}`}>
            <span>{e.concept}</span>
            <b className="bad">{conSigno(e.amount)}</b>
          </div>
        ))}
        <div className="fz-total">
          <span>Queda en la semana</span>
          <b className={sumaSemana >= 0 ? 'good' : 'bad'}>{conSigno(sumaSemana)}</b>
        </div>
      </Planilla>

      <Planilla
        titulo="Las cuotas del plantel"
        nota={`${alDia} de ${active.length} al día${deben > 0 ? ` · ${deben} ${deben === 1 ? 'debe' : 'deben'}` : ''}${becados > 0 ? ` · ${becados} con beca` : ''}`}
        className="fz-cuotas"
        focus="cuotas"
      >
        <div className="fz-cuotas-grilla">
          {active.map((p) => {
            // Acá la columna ES el estado de la cuota: al día va en gris, lo
            // que no es lo corriente (deuda, beca) va escrito como estado.
            const fee = feeChipAlways(p);
            const cls = fee.cls === 'good' ? '' : fee.cls === 'accent' ? 'warn' : fee.cls;
            return (
              <div key={p.id} className={`fz-cuota${cls === 'bad' ? ' debe' : ''}`}>
                <Cara id={p.id} personality={p.personality} size={32} />
                <span className="fz-cuota-nom">
                  <PlayerLink id={p.id}>{p.name}</PlayerLink>
                </span>
                {cls ? <span className={`v1-est ${cls}`}>{fee.label}</span> : <span className="fz-aldia">al día</span>}
              </div>
            );
          })}
        </div>
        <p className="bd-nota">
          Las becas retienen jugadores importantes, pero resignan ingresos y pueden molestar a los que pagan al día.
        </p>
      </Planilla>

      <Planilla titulo="El libro de caja" nota="los últimos movimientos" className="fz-libro">
        {recentLedger.length === 0 ? (
          <p className="bd-vacio">Todavía no hay movimientos.</p>
        ) : (
          <table className="bd-tabla">
            <tbody>
              {recentLedger.map((e, i) => (
                <tr key={i}>
                  <td className="dim fz-sem">S{e.week}</td>
                  <td className="fz-concepto">{e.concept}</td>
                  <td className={`num ${e.amount >= 0 ? 'good' : 'bad'}`}>{conSigno(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Planilla>
    </div>
  );
}
