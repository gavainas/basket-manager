import { useContext, useState } from 'react';
import { BALANCE } from '../game/balance';
import { checkExpansion, eligibleForLeague, SECOND_TEAM_ID, secondTeamPosition } from '../game/secondTeam';
import type { CupTier, GameState, League } from '../game/types';
import { clubByLegacyId, divisionStandings, USER_TEAM_ID } from '../game/world';
import type { GameAction } from '../state/gameReducer';
import { ClubLink } from './ClubLink';
import { Crest } from './Crest';
import { LeagueLink } from './LeagueLink';
import { PlayerLink } from './PlayerLink';
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
                    Campeón: <LegacyTeamName state={state} id={champ} />
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

/** Panel de inscripción del segundo equipo: requisitos, fichas y confirmación. */
function ExpansionPanel({
  state,
  league,
  dispatch,
  onClose,
}: {
  state: GameState;
  league: League;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
}) {
  const E = BALANCE.expansion;
  const check = checkExpansion(state, league.id);
  const eligible = state.players.filter((p) => eligibleForLeague(p, league));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligible.map((p) => p.id)));
  const planning = state.phase === 'planning';
  const canConfirm = check.ok && planning && selected.size >= E.minPlayers;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Inscribir un equipo en {league.name}</h3>
      <div className="data-grid">
        <div className="data-row">
          <span className="data-label">Inscripción</span>
          <span className="data-value">${check.fee} por temporada (después, ~${E.weeklyUpkeep - E.canteenIncome} por semana entre cancha, árbitros y cantina)</span>
        </div>
        <div className="data-row">
          <span className="data-label">Requisitos</span>
          <span className="data-value">
            Mínimo {E.minPlayers} fichas{league.minAge ? ` · solo jugadores de ${league.minAge}+` : ''}
            {check.divisionName ? ` · se juega los ${check.gameDay} (${check.divisionName})` : ''}
          </span>
        </div>
        <div className="data-row">
          <span className="data-label">La regla</span>
          <span className="data-value muted">
            La ficha de esta liga es independiente de la Universitaria: los mismos jugadores pueden jugar en las dos.
          </span>
        </div>
      </div>

      {!check.ok && <p style={{ color: 'var(--bad)' }}>{check.reason}</p>}
      {check.ok && !planning && (
        <p className="muted">Las inscripciones se confirman en la semana de planificación.</p>
      )}

      {eligible.length > 0 && (
        <>
          <h4 className="profile-subtitle">
            Fichas ({selected.size} de {eligible.length} elegidos · mínimo {E.minPlayers})
          </h4>
          <div className="callup-list">
            {eligible.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  title={selected.has(p.id) ? 'Sacar la ficha' : 'Darle ficha'}
                />
                <PlayerLink id={p.id}>{p.name}</PlayerLink>
                <span className="muted">
                  {p.age} años · ≈{p.visibleRating}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          disabled={!canConfirm}
          title={canConfirm ? `Se paga la inscripción de $${check.fee}` : (check.reason ?? 'Elegí al menos las fichas mínimas en semana de planificación')}
          onClick={() => {
            dispatch({ type: 'REGISTER_SECOND_TEAM', leagueId: league.id, playerIds: [...selected] });
            onClose();
          }}
        >
          Inscribir por ${check.fee}
        </button>
        <button className="small" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Tabla y estado del torneo del segundo equipo. */
function SecondTeamCard({ state }: { state: GameState }) {
  const st = state.secondTeam;
  const navigate = useContext(NavigateTabContext);
  if (!st) return null;
  const league = state.world.leagues.find((l) => l.id === st.leagueId);
  const division = state.world.divisions.find((d) => d.id === st.divisionId);
  const sorted = [...st.table].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
  const roster = state.players.filter((p) => st.playerIds.includes(p.id) && !p.leftClub);
  const totalRounds = st.table.length - 1;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>
        {st.name} · {league?.name}
        {division ? ` ${division.name}` : ''}
        {st.finished ? (
          <span className="chip accent" style={{ marginLeft: '0.5rem' }}>
            Torneo terminado: {secondTeamPosition(st)}°
          </span>
        ) : (
          <span className="chip" style={{ marginLeft: '0.5rem' }}>
            Fecha {st.round}/{totalRounds}
          </span>
        )}
      </h3>
      {st.lastResult && <p className="muted" style={{ marginTop: 0 }}>{st.lastResult}</p>}
      <div className="grid cols-2">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Equipo</th>
                <th className="num">G</th>
                <th className="num">P</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row.teamId} className={row.teamId === SECOND_TEAM_ID ? 'highlight' : ''}>
                  <td style={{ fontWeight: 700, color: i < 3 ? 'var(--warn)' : 'var(--text-dim)' }}>{i + 1}</td>
                  <td>
                    {row.teamId === SECOND_TEAM_ID ? (
                      <span className="plink" role="button" onClick={() => navigate('plantilla')}>
                        <strong>{row.name}</strong>
                      </span>
                    ) : (
                      <ClubLink id={row.clubId}>{row.name}</ClubLink>
                    )}
                  </td>
                  <td className="num">{row.wins}</td>
                  <td className="num">{row.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="profile-subtitle">Fichas del equipo ({roster.length})</h4>
          <p style={{ marginTop: 0 }}>
            {roster.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ' · '}
                <PlayerLink id={p.id}>{p.name}</PlayerLink>
              </span>
            ))}
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Juegan los {division?.gameDay}: suma ritmo y ánimo a los relegados del primero, pero desgasta — y alguno
            puede volver tocado. Podio al cierre = prestigio para el club.
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeagueView({ state, dispatch }: { state: GameState; dispatch: (action: GameAction) => void }) {
  const [expandLeague, setExpandLeague] = useState<string | null>(null);
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
  const teamName = (id: string) => <LegacyTeamName state={state} id={id} />;
  /* A 18px del escudo se lee la silueta y los dos colores, que es justo lo que
     hace falta para distinguir diez filas de un vistazo. */
  const crestOf = (id: string) => {
    const club = clubByLegacyId(state.world, id);
    if (!club) return null;
    return <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={18} />;
  };
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
  // La otra divisional de la liga (la de arriba mientras jugamos en B): tabla simulada.
  const otherDivision = world.divisions.find((d) => d.leagueId === userLeague?.id && d.id !== userDivision?.id);
  const otherRows = otherDivision ? divisionStandings(world, otherDivision.id, state.week, state.seasonNumber) : [];

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
                    ) : state.secondTeam?.leagueId === l.id ? (
                      <>
                        <strong>{state.secondTeam.name}</strong>
                        <span className="muted">
                          {' '}
                          · {state.secondTeam.table.find((r) => r.teamId === SECOND_TEAM_ID)?.wins ?? 0}-
                          {state.secondTeam.table.find((r) => r.teamId === SECOND_TEAM_ID)?.losses ?? 0}
                          {state.secondTeam.finished ? ' · torneo terminado' : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="muted">
                          {divisions.length} divisional{divisions.length !== 1 ? 'es' : ''}
                          {l.minAge ? ` · desde ${l.minAge} años` : ''} · el club todavía no tiene equipo acá
                        </span>{' '}
                        <button className="small" onClick={() => setExpandLeague(l.id)}>
                          Inscribir equipo…
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expandLeague &&
        (() => {
          const l = world.leagues.find((x) => x.id === expandLeague);
          return l ? (
            <ExpansionPanel state={state} league={l} dispatch={dispatch} onClose={() => setExpandLeague(null)} />
          ) : null;
        })()}

      <SecondTeamCard state={state} />

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
                    <span className="con-escudo">
                      {crestOf(row.teamId)}
                      {teamName(row.teamId)}
                    </span>{' '}
                    {styleChip(row.teamId)}
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

      {otherDivision && otherRows.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>
            La otra divisional · {userLeague?.name} {otherDivision.name}
          </h3>
          <p className="muted" style={{ marginTop: 0 }}>
            La divisional de arriba: equipos más fuertes. Tocá un nombre para ver su plantel.
          </p>
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
                {otherRows.map((row, i) => {
                  const clubId = world.teams.find((t) => t.id === row.teamId)?.clubId;
                  return (
                    <tr key={row.teamId}>
                      <td
                        style={{
                          color: i >= otherRows.length - 2 ? 'var(--bad)' : 'var(--text-dim)',
                          fontWeight: 700,
                        }}
                      >
                        {i + 1}
                      </td>
                      <td>{clubId ? <ClubLink id={clubId}>{row.name}</ClubLink> : row.name}</td>
                      <td className="num">{row.wins}</td>
                      <td className="num">{row.losses}</td>
                      <td className="num">{row.pointsFor - row.pointsAgainst}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Los 2 últimos descienden a nuestra divisional al cierre; de la nuestra ascienden los 2 finalistas de la
            Copa de Oro.
          </p>
        </div>
      )}
    </div>
  );
}
