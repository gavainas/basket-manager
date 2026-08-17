import { useContext } from 'react';
import type { GameState, WorldClub } from '../game/types';
import { divisionOfTeam, teamRoster, USER_TEAM_ID, worldPlayerName } from '../game/world';
import { Bar } from './Bar';
import { Crest } from './Crest';
import { LeagueLink } from './LeagueLink';
import { RivalLink } from './RivalLink';
import { Timeline } from './Timeline';
import { Tip, TIPS } from './Tip';
import { WorldPlayerLink } from './WorldPlayerLink';
import { NavigateTabContext } from './nav';
import { formatMoney, rivalDifficulty, rivalStyleInfo, starsFor } from './helpers';

interface Props {
  state: GameState;
  clubId: string;
  onClose: () => void;
}

/** La camiseta del club, con sus colores reales. */
export function Jersey({ colors, size = 40 }: { colors: [string, string]; size?: number }) {
  return (
    <span
      className="jersey"
      style={{ width: size, height: Math.round(size * 0.92), background: colors[0] }}
      title="La camiseta del club"
    >
      <span className="jersey-stripe" style={{ background: colors[1] }} />
    </span>
  );
}

function fameLabel(v: number): string {
  if (v >= 75) return 'Grande de la liga: todos quieren ganarle.';
  if (v >= 60) return 'Club respetado: nadie lo da por muerto.';
  if (v >= 45) return 'Uno más del montón, con aspiraciones.';
  if (v >= 30) return 'Le falta rodaje para hacerse un nombre.';
  return 'Todavía nadie lo tiene en el radar.';
}

/** Ficha institucional: identidad, camiseta, prestigio, fama y equipos. */
export function ClubProfile({ state, clubId, onClose }: Props) {
  const navigate = useContext(NavigateTabContext);
  const world = state.world;
  const club: WorldClub | undefined = world.clubs.find((c) => c.id === clubId);
  if (!club) return null;

  const isUser = !!club.isUser;
  const sportPrestige = isUser ? state.club.sportPrestige : club.sportPrestige;
  const socialPrestige = isUser ? state.club.socialPrestige : club.socialPrestige;
  const teams = world.teams.filter((t) => t.clubId === club.id);
  const legacyId = isUser ? 'club' : teams[0]?.legacyRivalId;
  const rival = !isUser ? state.rivals.find((r) => r.id === legacyId) : undefined;

  const recordOf = (teamLegacyId?: string) => {
    const row = teamLegacyId ? state.standings.find((r) => r.teamId === teamLegacyId) : undefined;
    return row ? `${row.wins}-${row.losses}` : '—';
  };

  const h2h = rival ? state.history.filter((m) => m.rivalId === rival.id) : [];
  const h2hWins = h2h.filter((m) => m.won).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile" onClick={(e) => e.stopPropagation()}>
        <div className="profile-head">
          <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={62} />
          <div className="profile-who">
            <div className="profile-name">{club.name}</div>
            <div className="profile-chips">
              <span className="chip">Fundado en {club.founded}</span>
              {isUser && <span className="chip accent">Tu club</span>}
              {rival && (
                <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
              )}
              {rival && (
                <span className="chip accent" title={rivalStyleInfo(rival.style).desc}>
                  {rivalStyleInfo(rival.style).label}
                </span>
              )}
            </div>
          </div>
          <Jersey colors={club.colors} size={46} />
          <button className="profile-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="profile-body">
          <h4 className="profile-subtitle">Prestigio y fama</h4>
          <Bar label="Prestigio deportivo" value={sportPrestige} hint={TIPS.prestigioDeportivo} />
          <Bar label="Prestigio social" value={socialPrestige} hint={TIPS.prestigioSocial} />
          {isUser && (
            <>
              <Bar label="Ambiente social" value={state.club.socialClimate} hint={TIPS.ambienteSocial} />
              <Bar label="Organización" value={state.club.organization} hint={TIPS.organizacion} />
            </>
          )}
          <p className="muted" style={{ margin: '0.4rem 0 0' }}>
            {fameLabel(sportPrestige)}
          </p>

          <h4 className="profile-subtitle">Equipos del club</h4>
          <div className="data-grid">
            {teams.map((t) => {
              const division = divisionOfTeam(world, t.id);
              const league = division ? world.leagues.find((l) => l.id === division.leagueId) : undefined;
              const venue = world.venues.find((v) => v.id === t.venueId);
              return (
                <div className="data-row" key={t.id}>
                  <span className="data-label">{recordOf(t.legacyRivalId)}</span>
                  <span className="data-value">
                    {t.id === USER_TEAM_ID ? (
                      <span
                        className="plink"
                        role="button"
                        onClick={() => {
                          navigate('plantilla');
                          onClose();
                        }}
                      >
                        <strong>{t.name}</strong>
                      </span>
                    ) : t.legacyRivalId ? (
                      <RivalLink id={t.legacyRivalId}>{t.name}</RivalLink>
                    ) : (
                      t.name
                    )}{' '}
                    <span className="muted">
                      ({t.category}) · {league ? <LeagueLink id={league.id}>{league.name}</LeagueLink> : '—'}
                      {division ? ` ${division.name}` : ''}
                      {venue ? ` · ${venue.name}` : ''}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {isUser && (
            <p className="muted" style={{ margin: '0.4rem 0 0' }}>
              Con más caja, camisetas y un delegado, el club podrá inscribir equipos en otras ligas.
            </p>
          )}

          {/* Plantel de equipos del mundo (otra divisional): los rivales clásicos ya lo muestran en su ficha con scouting. */}
          {teams
            .filter((t) => !t.legacyRivalId && t.id !== USER_TEAM_ID)
            .map((t) => {
              const roster = teamRoster(world, t.id).sort((a, b) => b.level - a.level);
              if (roster.length === 0) return null;
              return (
                <div key={t.id}>
                  <h4 className="profile-subtitle">Plantel</h4>
                  <div className="data-grid">
                    {roster.map((p) => (
                      <div className="data-row" key={p.id}>
                        <span className="data-label">{p.position}</span>
                        <span className="data-value">
                          <WorldPlayerLink id={p.id}>{worldPlayerName(p)}</WorldPlayerLink>{' '}
                          <span className="muted">
                            {starsFor(p.level)} · {p.age} años{p.injuryWeeks > 0 ? ' · 🚑' : ''}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          {isUser && (
            <>
              <h4 className="profile-subtitle">Las cuentas</h4>
              <div className="data-grid">
                <div className="data-row">
                  <span className="data-label">Caja</span>
                  <span className="data-value">
                    <Tip text="La plata del club: si llega a cero, se acaba la temporada.">
                      {formatMoney(state.club.money)}
                    </Tip>
                  </span>
                </div>
              </div>

              {state.pastSeasons.length > 0 && (
                <>
                  <h4 className="profile-subtitle">Palmarés</h4>
                  <div className="data-grid">
                    {state.pastSeasons.map((ps) => (
                      <div className="data-row" key={ps.season}>
                        <span className="data-label">T{ps.season}</span>
                        <span className="data-value">
                          {ps.position}° ({ps.record}) · {ps.outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h4 className="profile-subtitle">La historia reciente</h4>
              <Timeline
                events={state.clubTimeline.slice(-8)}
                emptyText="La historia del club se está escribiendo."
              />
            </>
          )}

          {rival && (
            <>
              <h4 className="profile-subtitle">Contra nosotros</h4>
              <p style={{ margin: 0 }}>
                {h2h.length === 0
                  ? 'Todavía no nos cruzamos esta temporada.'
                  : `${h2h.length} partido${h2h.length > 1 ? 's' : ''}: ${h2hWins} victoria${
                      h2hWins !== 1 ? 's' : ''
                    } nuestra${h2hWins !== 1 ? 's' : ''} y ${h2h.length - h2hWins} de ellos.`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
