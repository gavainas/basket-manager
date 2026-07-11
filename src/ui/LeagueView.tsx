import type { GameState } from '../game/types';

export function LeagueView({ state }: { state: GameState }) {
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
  const teamName = (id: string) => (id === 'club' ? state.club.name : state.rivals.find((r) => r.id === id)?.name ?? id);

  return (
    <div className="grid cols-2">
      <div className="card">
        <h3>Tabla de posiciones</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Equipo</th>
                <th className="num">G</th>
                <th className="num">P</th>
                <th className="num">Dif</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row.teamId} className={row.teamId === 'club' ? 'highlight' : ''}>
                  <td>{i + 1}</td>
                  <td>{teamName(row.teamId)}</td>
                  <td className="num">{row.wins}</td>
                  <td className="num">{row.losses}</td>
                  <td className="num">{row.pointsFor - row.pointsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Fixture</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sem.</th>
                <th>Rival</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {state.schedule.map((rivalId, i) => {
                const week = i + 1;
                const match = state.history.find((m) => m.week === week);
                return (
                  <tr key={week} className={week === state.week ? 'highlight' : ''}>
                    <td>{week}</td>
                    <td>{teamName(rivalId)}</td>
                    <td>
                      {match ? (
                        <span style={{ color: match.won ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                          {match.won ? 'G' : 'P'} {match.scoreFor}-{match.scoreAgainst}
                        </span>
                      ) : week === state.week ? (
                        <span className="chip accent">Esta semana</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
