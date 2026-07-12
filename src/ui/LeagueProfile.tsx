import { useContext } from 'react';
import type { Division, GameState } from '../game/types';
import { USER_TEAM_ID } from '../game/world';
import { RivalLink } from './RivalLink';
import { NavigateTabContext } from './nav';

interface Props {
  state: GameState;
  leagueId: string;
  onClose: () => void;
}

const KIND_LABELS: Record<string, string> = {
  universitaria: 'Liga universitaria',
  libre: 'Liga libre',
  veteranos: 'Liga de veteranos',
};

/** Ficha de una liga: reglas, divisionales, equipos y la relación con el club. */
export function LeagueProfile({ state, leagueId, onClose }: Props) {
  const navigate = useContext(NavigateTabContext);
  const world = state.world;
  const league = world.leagues.find((l) => l.id === leagueId);
  if (!league) return null;

  const divisions = world.divisions
    .filter((d) => d.leagueId === league.id)
    .sort((a, b) => a.level - b.level);
  const userEntry = world.entries.find(
    (e) => e.leagueId === league.id && e.teamId === USER_TEAM_ID && e.status === 'activa'
  );

  const recordOf = (legacyId?: string) => {
    const row = legacyId ? state.standings.find((r) => r.teamId === legacyId) : undefined;
    return row ? `${row.wins}-${row.losses}` : null;
  };

  const teamsOf = (division: Division) =>
    world.entries
      .filter((e) => e.divisionId === division.id && e.status === 'activa')
      .map((e) => world.teams.find((t) => t.id === e.teamId))
      .filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile" onClick={(e) => e.stopPropagation()}>
        <div className="profile-head">
          <div className="avatar profile-avatar">🏆</div>
          <div className="profile-who">
            <div className="profile-name">{league.name}</div>
            <div className="profile-chips">
              <span className="chip">{KIND_LABELS[league.kind] ?? league.kind}</span>
              <span className="chip">
                {league.divisionCount} divisional{league.divisionCount !== 1 ? 'es' : ''}
              </span>
              {league.minAge && <span className="chip warn">Desde {league.minAge} años</span>}
              {userEntry ? (
                <span className="chip good">Acá jugamos nosotros</span>
              ) : (
                <span className="chip">El club no participa</span>
              )}
            </div>
          </div>
          <button className="profile-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="profile-body">
          <h4 className="profile-subtitle">Reglas</h4>
          <ul className="reason-list">
            {league.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {divisions.map((d) => {
            const teams = teamsOf(d);
            const isOurs = userEntry?.divisionId === d.id;
            return (
              <div key={d.id}>
                <h4 className="profile-subtitle">
                  {d.name}
                  {isOurs && (
                    <span className="chip good" style={{ marginLeft: '0.5rem' }}>
                      nuestra divisional
                    </span>
                  )}
                </h4>
                <p className="muted" style={{ margin: '0 0 0.4rem' }}>
                  Se juega los {d.gameDay} a las {d.gameTimes.join(' o ')}
                  {d.altDays.length > 0 ? ` (reprogramaciones: ${d.altDays.join(', ')})` : ''}.
                </p>
                {teams.length > 0 ? (
                  <div className="data-grid">
                    {teams.map((t) => (
                      <div className="data-row" key={t.id}>
                        <span className="data-label">{recordOf(t.legacyRivalId) ?? '—'}</span>
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
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    Sin equipos cargados esta temporada: el club podría inscribirse acá más adelante.
                  </p>
                )}
              </div>
            );
          })}

          {!userEntry && (
            <>
              <h4 className="profile-subtitle">El club y esta liga</h4>
              <p className="muted" style={{ margin: 0 }}>
                Todavía no tenemos un equipo inscripto. Con más caja, camisetas, un delegado y jugadores
                disponibles, inscribir un equipo acá es el próximo paso de crecimiento del club.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
