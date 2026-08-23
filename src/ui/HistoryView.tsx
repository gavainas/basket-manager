import type { GameState } from '../game/types';
import { activePlayers } from '../game/match';
import { PlayerLink } from './PlayerLink';
import { Timeline } from './Timeline';
import { formatMoney } from './helpers';
import { Icon } from './Icon';

export function HistoryView({ state }: { state: GameState }) {
  // Ranking de MVP de la temporada en curso.
  const mvpCounts = new Map<string, number>();
  for (const m of state.history) {
    if (m.mvpId) mvpCounts.set(m.mvpId, (mvpCounts.get(m.mvpId) ?? 0) + 1);
  }
  const mvpRanking = [...mvpCounts.entries()]
    .map(([id, count]) => ({ player: state.players.find((p) => p.id === id), count }))
    .filter((x) => x.player)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      {state.pastSeasons.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Palmarés del club</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Temporada</th>
                  <th>Récord</th>
                  <th>Posición</th>
                  <th>Balance</th>
                  <th className="num">Caja final</th>
                </tr>
              </thead>
              <tbody>
                {state.pastSeasons.map((ps) => (
                  <tr key={ps.season}>
                    <td>T{ps.season}</td>
                    <td>{ps.record}</td>
                    <td>{ps.position}°</td>
                    <td>{ps.outcome}</td>
                    <td className="num">{formatMoney(ps.money)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>La historia del club</h3>
        <Timeline
          events={state.clubTimeline}
          emptyText="La historia del club se está escribiendo: jugá y van a llegar los momentos."
        />
      </div>

      <div className="grid cols-2">
        <div>
          {mvpRanking.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3>Figuras de la temporada</h3>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {mvpRanking.map(({ player, count }) => (
                      <tr key={player!.id}>
                        <td>
                          <PlayerLink id={player!.id}>{player!.name}</PlayerLink>
                        </td>
                        <td className="num">
                          <Icon name="estrella" size={12} /> {count} {count === 1 ? 'vez MVP' : 'veces MVP'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <h3>Momentos memorables</h3>
            {state.memorableMoments.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Todavía no pasó nada digno de contar en el asado. Las historias se construyen.
              </p>
            ) : (
              <ul className="reason-list">
                {state.memorableMoments.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Crónica de la temporada {state.seasonNumber}</h3>
          {state.news.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Sin novedades todavía.</p>
          ) : (
            <ul className="news-list">
              {state.news.map((n, i) => (
                <li key={i}>
                  <span className={`news-dot ${n.tone}`} />
                  <span className="news-week">S{n.week}</span>
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted" style={{ marginBottom: 0 }}>
            Plantel actual: {activePlayers(state.players).length} jugadores · {state.playersLeftCount} bajas esta
            temporada.
          </p>
        </div>
      </div>
    </div>
  );
}
