import { useContext } from 'react';
import type { GameState, WorldFixture } from '../game/types';
import { fixturesOfWeek, teamName, USER_TEAM_ID, userFixtureOfWeek } from '../game/world';
import { LeagueLink } from './LeagueLink';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext } from './nav';
import { EscudoEquipo, Planilla } from './bloqueD';
import { formatDateLong, formatDateShort, monthLabel, weekLabel } from './helpers';
import './liga.css';

interface Props {
  state: GameState;
}

/** El estado de un partido, escrito sólo si es la excepción (lo corriente es «programado»). */
function estadoFx(fx: WorldFixture): { label: string; cls: string } | null {
  switch (fx.status) {
    case 'programado':
      return null;
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

/**
 * El calendario (pestaña de la Liga, UI V1). Héroe: el partido de esta semana
 * con los dos escudos, cuándo y dónde; los conflictos de agenda en una frase.
 * Al costado, la hoja con los otros partidos de la fecha; abajo, el fixture de
 * la temporada en una sola planilla partida en dos columnas por mes.
 */
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
  const est = userFx ? estadoFx(userFx) : null;
  const jugados = userFixtures.filter((f) => f.status === 'jugado').length;

  return (
    <div className="lg-cal">
      {userFx ? (
        <section className="lg-hero v1-hero lg-cal-hero" aria-label="Esta semana">
          {/* En los playoffs no es "fecha 10" de una liga de 9: es la semifinal
              o la final, como dice la barra de recursos. */}
          <div className="v1-eyebrow">
            Esta semana · <b>{week <= state.seasonLength ? `Fecha ${week}` : weekLabel(week, state.seasonLength)}</b>
            {league && <> · <LeagueLink id={league.id}>{league.name}</LeagueLink></>}
            {division && <> · {division.name}</>}
          </div>
          <div className="lg-cal-versus">
            <div className="lg-cal-eq">
              <EscudoEquipo state={state} teamId={userFx.homeTeamId} size={64} />
              <span className="lg-cal-nom"><TeamLabel state={state} teamId={userFx.homeTeamId} /></span>
            </div>
            {userFx.status === 'jugado' && userFx.scoreHome !== undefined ? (
              <div className="lg-cal-marcador">{userFx.scoreHome} – {userFx.scoreAway}</div>
            ) : (
              <div className="lg-cal-vs">VS</div>
            )}
            <div className="lg-cal-eq">
              <EscudoEquipo state={state} teamId={userFx.awayTeamId} size={64} />
              <span className="lg-cal-nom"><TeamLabel state={state} teamId={userFx.awayTeamId} /></span>
            </div>
          </div>
          <div className="lg-cal-cuando">
            {cap(formatDateLong(userFx.date))} · {userFx.time} h
            {userFx.label && <span className="lg-cal-etiqueta">{userFx.label}</span>}
            {est && <span className={`v1-est ${est.cls}`}>{est.label}</span>}
            <span className="lg-cal-donde">
              {venue ? `${venue.name} (${venue.neighborhood})` : 'Cancha por confirmar'} ·{' '}
              {userFx.homeTeamId === USER_TEAM_ID ? 'somos locales' : 'de visitante'}
            </span>
          </div>
          <p className="v1-frase lg-cal-conflictos">
            {conflicted.length === 0 ? (
              <>Sin conflictos: nadie del plantel tiene otro partido comprometido ese día.</>
            ) : conflicted.length === state.players.filter((p) => !p.leftClub).length ? (
              /* Con el plantel entero en las dos ligas, doce nombres seguidos
                 no dicen nada: el dato es que son todos. */
              <>
                <b className="warn">Ojo con la agenda:</b> los <b>{conflicted.length}</b> del plantel tienen ficha en las dos
                ligas. Revisar horarios.
              </>
            ) : (
              <>
                <b className="warn">Ojo con la agenda:</b>{' '}
                {conflicted.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ', '}
                    <PlayerLink id={p.id}>{p.name}</PlayerLink>
                  </span>
                ))}{' '}
                con ficha en dos ligas. Revisar horarios.
              </>
            )}
          </p>
        </section>
      ) : (
        <section className="lg-hero v1-hero lg-cal-hero">
          <div className="v1-eyebrow">Esta semana</div>
          <h2 className="v1-titulo">Sin partido programado</h2>
        </section>
      )}

      <Planilla titulo="Los otros partidos de la fecha" nota={weekOthers.length > 0 ? `${weekOthers.length} partidos` : undefined} className="lg-cal-otros">
        {weekOthers.length === 0 ? (
          <p className="bd-vacio">Esta fecha no hay otros partidos en la divisional.</p>
        ) : (
          <table className="bd-tabla">
            <tbody>
              {weekOthers.map((fx) => (
                <tr key={fx.id}>
                  <td className="dim lg-cal-hora">
                    {formatDateShort(fx.date)} · {fx.time}
                  </td>
                  <td className="lg-cal-cruce">
                    <span className="bd-equipo">
                      <EscudoEquipo state={state} teamId={fx.homeTeamId} size={18} />
                      <TeamLabel state={state} teamId={fx.homeTeamId} />
                    </span>
                    <span className="bd-equipo">
                      <EscudoEquipo state={state} teamId={fx.awayTeamId} size={18} />
                      <TeamLabel state={state} teamId={fx.awayTeamId} />
                    </span>
                  </td>
                  {/* El marcador, o un guion si todavía no se jugó: la hora
                      ya está en la primera columna (decía dos veces lo mismo). */}
                  <td className="num">
                    {fx.status === 'jugado' && fx.scoreHome !== undefined ? (
                      <span className="lg-cal-res">
                        {fx.scoreHome}
                        <br />
                        {fx.scoreAway}
                      </span>
                    ) : fx.status === 'jugado' ? (
                      'jugado'
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Planilla>

      <Planilla titulo="El fixture de la temporada" nota={`${jugados} de ${userFixtures.length} jugados`} className="lg-cal-fixture">
        <div className="lg-cal-meses">
          {[...byMonth.entries()].map(([month, fixtures]) => (
            <div key={month} className="lg-cal-mes">
              <h4 className="lg-cal-mes-tit">{month}</h4>
              <table className="bd-tabla">
                <tbody>
                  {fixtures.map((fx) => {
                    const isHome = fx.homeTeamId === USER_TEAM_ID;
                    const rivalTeamId = isHome ? fx.awayTeamId : fx.homeTeamId;
                    const played = fx.status === 'jugado' && fx.scoreHome !== undefined;
                    const userScore = isHome ? fx.scoreHome : fx.scoreAway;
                    const rivalScore = isHome ? fx.scoreAway : fx.scoreHome;
                    const won = played && userScore! > rivalScore!;
                    const e = estadoFx(fx);
                    return (
                      <tr key={fx.id} className={fx.week === week ? 'bd-nos' : ''}>
                        <td className="dim lg-cal-hora">
                          {formatDateShort(fx.date)} · {fx.time}
                        </td>
                        <td>
                          <span className="bd-equipo">
                            <EscudoEquipo state={state} teamId={rivalTeamId} size={18} />
                            <TeamLabel state={state} teamId={rivalTeamId} />
                            <span className="lg-lv">{isHome ? 'L' : 'V'}</span>
                            {fx.label && <span className="lg-cal-etiqueta chica">{fx.label}</span>}
                          </span>
                        </td>
                        <td className="num">
                          {played ? (
                            <span className={won ? 'good' : 'bad'}>
                              {won ? 'G' : 'P'} {userScore}-{rivalScore}
                            </span>
                          ) : fx.week === week ? (
                            <span className="lg-hoy">Esta semana</span>
                          ) : e ? (
                            <span className={`v1-est ${e.cls}`}>{e.label}</span>
                          ) : (
                            <span className="dim">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Planilla>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
