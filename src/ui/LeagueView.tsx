import { useContext } from 'react';
import type { CupTier, GameState } from '../game/types';
import { USER_TEAM_ID } from '../game/world';
import { LeagueLink } from './LeagueLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext } from './nav';
import { rivalStyleInfo } from './helpers';

/** Nombre de un equipo por id clásico: rivales abren su ficha, el club lleva a la plantilla. */
function LegacyTeamName({ state, id }: { state: GameState; id: string }) {
  const navigate = useContext(NavigateTabContext);
  if (id === 'club') {
    return (
      <span className="plink" role="button" onClick={() => navigate('plantilla')}>
        <strong>{state.club.name}</strong>
      </span>
    );
  }
  const rival = state.rivals.find((r) => r.id === id);
  return rival ? <RivalLink id={id}>{rival.name}</RivalLink> : <span>{id}</span>;
}

export function PlayoffsCard({ state }: { state: GameState }) {
  const P = state.playoffs;
  if (!P) return null;
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Playoffs de la divisional</h3>
      <div className="grid cols-2">
        {(['oro', 'plata'] as CupTier[]).map((cup) => {
          const ties = P.ties.filter((t) => t.cup === cup);
          const champ = P.champions[cup];
          return (
            <div key={cup}>
              <h4 className="profile-subtitle">
                {cup === 'oro' ? '🥇 Copa de Oro' : '🥈 Copa de Plata'}
                {champ && (
                  <span className="chip accent" style={{ marginLeft: '0.5rem' }}>
                    Campeón: {champ === 'club' ? state.club.name : state.rivals.find((r) => r.id === champ)?.name}
                  </span>
                )}
              </h4>
              <div className="data-grid">
                {ties.map((t) => (
                  <div className="data-row" key={t.id}>
                    <span className="data-label">{t.round === 'semifinal' ? 'Semifinal' : 'Final'}</span>
                    <span className="data-value">
                      <LegacyTeamName state={state} id={t.homeId} />{' '}
                      {t.scoreHome !== undefined ? (
                        <strong>
                          {t.scoreHome}-{t.scoreAway}
                        </strong>
                      ) : (
                        'vs'
                      )}{' '}
                      <LegacyTeamName state={state} id={t.awayId} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeagueView({ state }: { state: GameState }) {
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
  const teamName = (id: string) => <LegacyTeamName state={state} id={id} />;
  const styleChip = (id: string) => {
    const rival = state.rivals.find((r) => r.id === id);
    if (!rival) return null;
    const info = rivalStyleInfo(rival.style);
    return (
      <span className="chip" title={info.desc}>
        {info.label}
      </span>
    );
  };

  const world = state.world;
  const userEntry = world.entries.find((e) => e.teamId === USER_TEAM_ID && e.status === 'activa');
  const userDivision = world.divisions.find((d) => d.id === userEntry?.divisionId);
  const userLeague = world.leagues.find((l) => l.id === userEntry?.leagueId);

  return (
    <div>
      {userLeague && userDivision && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Las ligas</h3>
          <div className="data-grid">
            {world.leagues.map((l) => {
              const divisions = world.divisions.filter((d) => d.leagueId === l.id);
              const isOurs = l.id === userLeague.id;
              return (
                <div className="data-row" key={l.id}>
                  <span className="data-label">
                    <LeagueLink id={l.id}>{l.name}</LeagueLink>
                  </span>
                  <span className="data-value">
                    {isOurs ? (
                      <>
                        <strong>Jugamos en {userDivision.name}</strong>
                        <span className="muted">
                          {' '}
                          · los {userDivision.gameDay} a las {userDivision.gameTimes.join(' o ')}
                        </span>
                      </>
                    ) : (
                      <span className="muted">
                        {divisions.length} divisional{divisions.length !== 1 ? 'es' : ''}
                        {l.minAge ? ` · desde ${l.minAge} años` : ''} · el club todavía no tiene equipo acá
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PlayoffsCard state={state} />

      <div className="grid cols-2">
      <div className="card">
        <h3>
          Tabla de posiciones
          {userLeague && userDivision ? ` · ${userLeague.name} ${userDivision.name}` : ''}
        </h3>
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
                  <td
                    style={{
                      color: i < 4 ? 'var(--warn)' : i < 8 ? 'var(--text-dim)' : 'var(--bad)',
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </td>
                  <td>
                    {teamName(row.teamId)} {styleChip(row.teamId)}
                  </td>
                  <td className="num">{row.wins}</td>
                  <td className="num">{row.losses}</td>
                  <td className="num">{row.pointsFor - row.pointsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Al cierre de la fase regular: 1°-4° juegan la 🥇 Copa de Oro, 5°-8° la 🥈 Copa de Plata. Los últimos dos
          se van a casa.
        </p>
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
                    <td>
                      {teamName(rivalId)} {styleChip(rivalId)}
                    </td>
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
    </div>
  );
}
