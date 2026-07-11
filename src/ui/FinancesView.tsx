import type { GameState } from '../game/types';
import { activePlayers } from '../game/match';
import { weeklyEstimate } from '../game/economy';
import { feeChip, formatMoney } from './helpers';

export function FinancesView({ state }: { state: GameState }) {
  const estimate = weeklyEstimate(state);
  const active = activePlayers(state.players);
  const totalIncome = estimate.income.reduce((s, e) => s + e.amount, 0);
  const totalExpense = estimate.expenses.reduce((s, e) => s + e.amount, 0);
  const net = totalIncome + totalExpense;
  const recentLedger = [...state.ledger].reverse().slice(0, 14);

  return (
    <div>
      <div className="grid cols-3">
        <div className="stat-tile">
          <div className="label">Caja del club</div>
          <div className={`value ${state.club.money < 100 ? 'bad' : state.club.money < 300 ? 'warn' : 'good'}`}>
            {formatMoney(state.club.money)}
          </div>
          <div className="sub">Si baja de $0, el club quiebra</div>
        </div>
        <div className="stat-tile">
          <div className="label">Balance semanal estimado</div>
          <div className={`value ${net >= 0 ? 'good' : 'bad'}`}>
            {net >= 0 ? '+' : ''}
            {formatMoney(net)}
          </div>
          <div className="sub">cuotas y gastos fijos</div>
        </div>
        <div className="stat-tile">
          <div className="label">Sponsor</div>
          <div className="value">{state.sponsorWeeks > 0 ? `${state.sponsorWeeks} sem.` : '—'}</div>
          <div className="sub">{state.sponsorWeeks > 0 ? 'contrato activo' : 'sin sponsor: se puede buscar uno'}</div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: '1rem' }}>
        <div>
          <div className="card">
            <h3>Movimiento semanal estimado</h3>
            <div className="table-wrap">
              <table>
                <tbody>
                  {estimate.income.map((e, i) => (
                    <tr key={`i${i}`}>
                      <td>{e.concept}</td>
                      <td className="num" style={{ color: 'var(--good)' }}>
                        +{formatMoney(e.amount)}
                      </td>
                    </tr>
                  ))}
                  {estimate.expenses.map((e, i) => (
                    <tr key={`e${i}`}>
                      <td>{e.concept}</td>
                      <td className="num" style={{ color: 'var(--bad)' }}>
                        {formatMoney(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3>Últimos movimientos</h3>
            <div className="table-wrap">
              <table>
                <tbody>
                  {recentLedger.map((e, i) => (
                    <tr key={i}>
                      <td className="num" style={{ color: 'var(--text-dim)', width: 40 }}>
                        S{e.week}
                      </td>
                      <td>{e.concept}</td>
                      <td className="num" style={{ color: e.amount >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                        {e.amount >= 0 ? '+' : ''}
                        {formatMoney(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Cuotas del plantel</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Situación</th>
                </tr>
              </thead>
              <tbody>
                {active.map((p) => {
                  const fee = feeChip(p);
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>
                        <span className={`chip ${fee.cls}`}>{fee.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Las becas retienen jugadores importantes, pero resignan ingresos y pueden molestar a los que pagan al día.
          </p>
        </div>
      </div>
    </div>
  );
}
