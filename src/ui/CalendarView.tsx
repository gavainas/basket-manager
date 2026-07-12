import { useContext } from 'react';
import type { GameState, WorldFixture } from '../game/types';
import { fixturesOfWeek, teamName, USER_TEAM_ID, userFixtureOfWeek } from '../game/world';
import { LeagueLink } from './LeagueLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext } from './nav';
import { formatDateLong, formatDateShort, monthLabel } from './helpers';

interface Props {
  state: GameState;
}

function statusChip(fx: WorldFixture): { label: string; cls: string } {
  switch (fx.status) {
    case 'programado':
      return { label: 'Programado', cls: '' };
    case 'jugado':
      return { label: 'Jugado', cls: 'good' };
    case 'reprogramado':
      return { label: 'Reprogramado', cls: 'warn' };
    case 'suspendido':
      return { label: 'Suspendido', cls: 'bad' };
  }
}

/** Nombre de equipo: los rivales abren su ficha, el del usuario lleva a la plantilla. */
function TeamLabel({ state, teamId }: { state: GameState; teamId: string }) {
  const navigate = useContext(NavigateTabContext);
  if (teamId === USER_TEAM_ID) {
    return (
      <span className="plink" role="button" onClick={() => navigate('plantilla')}>
        <strong>{state.club.name}</strong>
      </span>
    );
  }
  const team = state.world.teams.find((t) => t.id === teamId);
  if (team?.legacyRivalId) return <RivalLink id={team.legacyRivalId}>{team.name}</RivalLink>;
  return <span>{teamName(state.world, teamId)}</span>;
}

export function CalendarView({ state }: Props) {
  const world = state.world;
  const lastFixtureWeek = world.fixtures.reduce((m, f) => Math.max(m, f.week), state.seasonLength);
  const week = Math.min(state.week, lastFixtureWeek);
  const userFx = userFixtureOfWeek(world, week);
  const weekOthers = fixturesOfWeek(world, week).filter((f) => !f.isUserMatch);
  const division = world.divisions.find((d) => d.id === userFx?.divisionId);
  const league = world.leagues.find((l) => l.id === userFx?.leagueId);
  const venue = world.venues.find((v) => v.id === userFx?.venueId);

  // Conflictos de agenda: jugadores con más de una ficha activa (dos ligas).
  const conflicted = state.players.filter(
    (p) =>
      !p.leftClub &&
      world.registrations.filter((r) => r.playerId === p.id && r.status === 'activa').length > 1
  );

  const userFixtures = world.fixtures.filter((f) => f.isUserMatch).sort((a, b) => a.week - b.week);
  const byMonth = new Map<string, WorldFixture[]>();
  for (const fx of userFixtures) {
    const key = monthLabel(fx.date);
    byMonth.set(key, [...(byMonth.get(key) ?? []), fx]);
  }

  return (
    <div>
      {userFx && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Esta semana · fecha {week}</h3>
          <div className="data-grid">
            <div className="data-row">
              <span className="data-label">Partido</span>
              <span className="data-value">
                <TeamLabel state={state} teamId={userFx.homeTeamId} /> vs{' '}
                <TeamLabel state={state} teamId={userFx.awayTeamId} />
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Cuándo</span>
              <span className="data-value">
                {formatDateLong(userFx.date)} · {userFx.time} h
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Competición</span>
              <span className="data-value">
                {league ? <LeagueLink id={league.id}>{league.name}</LeagueLink> : '—'} · {division?.name}
                {userFx.label && (
                  <span className="chip accent" style={{ marginLeft: '0.5rem' }}>
                    {userFx.label}
                  </span>
                )}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Cancha</span>
              <span className="data-value">
                {venue ? `${venue.name} (${venue.neighborhood})` : '—'} ·{' '}
                {userFx.homeTeamId === USER_TEAM_ID ? 'somos locales' : 'de visitante'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Estado</span>
              <span className="data-value">
                <span className={`chip ${statusChip(userFx).cls}`}>{statusChip(userFx).label}</span>
                {userFx.status === 'jugado' && userFx.scoreHome !== undefined && (
                  <span style={{ marginLeft: '0.5rem', fontWeight: 700 }}>
                    {userFx.scoreHome}-{userFx.scoreAway}
                  </span>
                )}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Conflictos</span>
              <span className="data-value">
                {conflicted.length === 0 ? (
                  <span className="muted">
                    Sin conflictos: nadie del plantel tiene otro partido comprometido ese día.
                  </span>
                ) : (
                  `${conflicted.map((p) => p.name).join(', ')} con ficha en dos ligas: revisar horarios.`
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {weekOthers.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Los otros partidos de la fecha</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                {weekOthers.map((fx) => (
                  <tr key={fx.id}>
                    <td>
                      {formatDateShort(fx.date)} · {fx.time}
                    </td>
                    <td>
                      <TeamLabel state={state} teamId={fx.homeTeamId} /> vs{' '}
                      <TeamLabel state={state} teamId={fx.awayTeamId} />
                    </td>
                    <td className="num">
                      {fx.status === 'jugado' && fx.scoreHome !== undefined
                        ? `${fx.scoreHome}-${fx.scoreAway}`
                        : fx.status === 'jugado'
                          ? 'jugado'
                          : fx.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Fixture de la temporada</h3>
        {[...byMonth.entries()].map(([month, fixtures]) => (
          <div key={month}>
            <h4 className="profile-subtitle">{month}</h4>
            <div className="table-wrap">
              <table>
                <tbody>
                  {fixtures.map((fx) => {
                    const isHome = fx.homeTeamId === USER_TEAM_ID;
                    const rivalTeamId = isHome ? fx.awayTeamId : fx.homeTeamId;
                    const played = fx.status === 'jugado' && fx.scoreHome !== undefined;
                    const userScore = isHome ? fx.scoreHome : fx.scoreAway;
                    const rivalScore = isHome ? fx.scoreAway : fx.scoreHome;
                    const won = played && userScore! > rivalScore!;
                    return (
                      <tr key={fx.id} className={fx.week === week ? 'highlight' : ''}>
                        <td>
                          {formatDateShort(fx.date)} · {fx.time}
                        </td>
                        <td>
                          <TeamLabel state={state} teamId={rivalTeamId} />{' '}
                          <span className="muted">{isHome ? '(L)' : '(V)'}</span>
                          {fx.label && (
                            <span className="chip accent" style={{ marginLeft: '0.4rem' }}>
                              {fx.label}
                            </span>
                          )}
                        </td>
                        <td className="num">
                          {played ? (
                            <span style={{ color: won ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                              {won ? 'G' : 'P'} {userScore}-{rivalScore}
                            </span>
                          ) : (
                            <span className={`chip ${statusChip(fx).cls}`}>{statusChip(fx).label}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
