import type { GameState } from '../game/types';
import { divisionOfTeam, teamByLegacyRival, teamRoster, worldPlayerName } from '../game/world';
import { LeagueLink } from './LeagueLink';
import { WorldPlayerLink } from './WorldPlayerLink';
import { initials, rivalDifficulty, rivalStyleInfo, starsFor } from './helpers';

interface Props {
  state: GameState;
  rivalId: string;
  onClose: () => void;
}

/** Ficha de un club rival: cómo juega, cómo viene y el historial contra nosotros. */
export function RivalProfile({ state, rivalId, onClose }: Props) {
  const rival = state.rivals.find((r) => r.id === rivalId);
  if (!rival) return null;

  const style = rivalStyleInfo(rival.style);
  const difficulty = rivalDifficulty(rival);
  const row = state.standings.find((r) => r.teamId === rival.id);
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)
  );
  const position = sorted.findIndex((r) => r.teamId === rival.id) + 1;

  const headToHead = state.history.filter((m) => m.rivalId === rival.id);
  const h2hWins = headToHead.filter((m) => m.won).length;

  const team = teamByLegacyRival(state.world, rival.id);
  const division = team ? divisionOfTeam(state.world, team.id) : undefined;
  const league = division ? state.world.leagues.find((l) => l.id === division.leagueId) : undefined;
  const venue = team ? state.world.venues.find((v) => v.id === team.venueId) : undefined;
  const roster = team
    ? teamRoster(state.world, team.id).sort((a, b) => b.level - a.level)
    : [];
  const upcoming = state.schedule
    .map((id, i) => ({ id, week: i + 1 }))
    .filter(
      (x) =>
        x.id === rival.id && x.week >= state.week && !state.history.some((m) => m.week === x.week)
    );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile" onClick={(e) => e.stopPropagation()}>
        <div className="profile-head">
          <div className="avatar profile-avatar">{initials(rival.name)}</div>
          <div className="profile-who">
            <div className="profile-name">{rival.name}</div>
            <div className="profile-chips">
              <span className={`chip ${difficulty.cls}`}>{difficulty.label}</span>
              <span className="chip accent">{style.label}</span>
              {row && <span className="chip">{position}° en la liga</span>}
            </div>
          </div>
          <button className="profile-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="profile-body">
          <h4 className="profile-subtitle">Cómo juegan</h4>
          <p style={{ margin: '0 0 0.4rem' }}>{style.desc}</p>
          <p className="muted" style={{ margin: 0 }}>
            💡 {style.advice}
          </p>

          {team && (
            <>
              <h4 className="profile-subtitle">El club</h4>
              <div className="data-grid">
                <div className="data-row">
                  <span className="data-label">Compite en</span>
                  <span className="data-value">
                    {league ? <LeagueLink id={league.id}>{league.name}</LeagueLink> : '—'} · {division?.name}
                    {division ? ` (${division.gameDay} ${division.gameTimes.join(' / ')})` : ''}
                  </span>
                </div>
                <div className="data-row">
                  <span className="data-label">Cancha</span>
                  <span className="data-value">
                    {venue ? `${venue.name} (${venue.neighborhood})` : '—'}
                  </span>
                </div>
                <div className="data-row">
                  <span className="data-label">Delegado</span>
                  <span className="data-value">{team.delegate}</span>
                </div>
              </div>
            </>
          )}

          {roster.length > 0 && (
            <>
              <h4 className="profile-subtitle">Plantel {state.world.season.id.replace('s', 'temporada ')}</h4>
              <div className="data-grid">
                {roster.map((p) => (
                  <div className="data-row" key={p.id}>
                    <span className="data-label">{p.position}</span>
                    <span className="data-value">
                      <WorldPlayerLink id={p.id}>{worldPlayerName(p)}</WorldPlayerLink>{' '}
                      <span className="muted">
                        ≈{p.level} {starsFor(p.level)} · {p.age} años
                        {p.injuryWeeks > 0 ? ' · 🚑' : ''}
                        {p.availability.distanceKm > 50 ? ` · ${p.availability.residence}` : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {row && (
            <>
              <h4 className="profile-subtitle">Su temporada</h4>
              <div className="data-grid">
                <div className="data-row">
                  <span className="data-label">Récord</span>
                  <span className="data-value">
                    {row.wins}-{row.losses}
                  </span>
                </div>
                <div className="data-row">
                  <span className="data-label">Puntos</span>
                  <span className="data-value">
                    {row.pointsFor} a favor · {row.pointsAgainst} en contra (
                    {row.pointsFor - row.pointsAgainst >= 0 ? '+' : ''}
                    {row.pointsFor - row.pointsAgainst})
                  </span>
                </div>
                <div className="data-row">
                  <span className="data-label">Posición</span>
                  <span className="data-value">{position}° de {state.standings.length}</span>
                </div>
              </div>
            </>
          )}

          <h4 className="profile-subtitle">Historial contra nosotros</h4>
          {headToHead.length === 0 ? (
            <p className="muted">Todavía no nos cruzamos esta temporada.</p>
          ) : (
            <>
              <p style={{ margin: '0 0 0.4rem' }}>
                {h2hWins} victoria{h2hWins !== 1 ? 's' : ''} y {headToHead.length - h2hWins} derrota
                {headToHead.length - h2hWins !== 1 ? 's' : ''} nuestras.
              </p>
              <div className="data-grid">
                {headToHead.map((m) => (
                  <div className="data-row" key={m.week}>
                    <span className="data-label">Semana {m.week}</span>
                    <span className="data-value" style={{ color: m.won ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                      {m.forfeit ? 'Forfeit' : `${m.won ? 'G' : 'P'} ${m.scoreFor}-${m.scoreAgainst}`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {upcoming.length > 0 && state.week <= state.seasonLength && (
            <>
              <h4 className="profile-subtitle">Próximos cruces</h4>
              <p style={{ margin: 0 }}>
                {upcoming.map((x) => `Semana ${x.week}`).join(' · ')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
