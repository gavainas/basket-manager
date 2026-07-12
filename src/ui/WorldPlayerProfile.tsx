import type { GameState } from '../game/types';
import { DEBUG_FULL_SCOUTING, perceivedLevel, scoutingLevel } from '../game/scouting';
import {
  divisionOfTeam,
  findActiveRegistration,
  worldPlayerById,
  worldPlayerName,
  worldPlayerTeam,
} from '../game/world';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { LeagueLink } from './LeagueLink';
import { RivalLink } from './RivalLink';
import { starsFor } from './helpers';

interface Props {
  state: GameState;
  playerId: string;
  onClose: () => void;
}

/** Perfil de un jugador rival: persona, nivel estimado, disponibilidad y ficha. */
export function WorldPlayerProfile({ state, playerId, onClose }: Props) {
  const world = state.world;
  const p = worldPlayerById(world, playerId);
  if (!p) return null;

  const team = worldPlayerTeam(world, p.id);
  const club = team ? world.clubs.find((c) => c.id === team.clubId) : undefined;
  const division = team ? divisionOfTeam(world, team.id) : undefined;
  const league = team
    ? world.leagues.find((l) => l.id === world.entries.find((e) => e.teamId === team.id && e.status === 'activa')?.leagueId)
    : undefined;
  const freeLeagues = world.leagues.filter((l) => !findActiveRegistration(world, p.id, l.id, world.season.id));
  const interior = p.availability.distanceKm > 50;
  const knowledge = team?.legacyRivalId ? scoutingLevel(state, team.legacyRivalId) : 1;
  const knowsWell = knowledge >= 3 || DEBUG_FULL_SCOUTING;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile" onClick={(e) => e.stopPropagation()}>
        <div className="profile-head">
          <div className="avatar profile-avatar">
            <Avatar seed={p.id} age={p.age} jersey={club?.colors[0]} title={worldPlayerName(p)} />
          </div>
          <div className="profile-who">
            <div className="profile-name">{worldPlayerName(p)}</div>
            <div className="profile-chips">
              <span className="chip">{p.position}</span>
              {p.secondaryPositions.map((sp) => (
                <span key={sp} className="chip" style={{ opacity: 0.7 }}>
                  también {sp}
                </span>
              ))}
              <span className="chip">{p.age} años</span>
              {p.injuryWeeks > 0 && <span className="chip bad">Lesionado ({p.injuryWeeks} sem.)</span>}
              {interior && <span className="chip warn">Vive en {p.availability.residence}</span>}
            </div>
          </div>
          <div className="rating">
            <div className="num" style={knowsWell ? undefined : { fontSize: '0.85rem' }}>
              {perceivedLevel(state, p, knowledge)}
            </div>
            {knowsWell && <div className="approx">{starsFor(p.level)}</div>}
          </div>
          <button className="profile-close" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        <div className="profile-body">
          <h4 className="profile-subtitle">Ficha esta temporada</h4>
          <div className="data-grid">
            <div className="data-row">
              <span className="data-label">Equipo</span>
              <span className="data-value">
                {team && club ? (
                  team.legacyRivalId ? (
                    <RivalLink id={team.legacyRivalId}>{team.name}</RivalLink>
                  ) : (
                    team.name
                  )
                ) : (
                  'Libre'
                )}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Liga</span>
              <span className="data-value">
                {league ? (
                  <>
                    <LeagueLink id={league.id}>{league.name}</LeagueLink> · {division?.name ?? ''}
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Libre en</span>
              <span className="data-value">
                {freeLeagues.length > 0
                  ? freeLeagues.map((l, i) => (
                      <span key={l.id}>
                        {i > 0 && ' · '}
                        <LeagueLink id={l.id}>{l.name}</LeagueLink>
                      </span>
                    ))
                  : 'Ninguna liga'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Residencia</span>
              <span className="data-value">
                {p.availability.residence}
                {interior ? ` (${p.availability.distanceKm} km)` : ''}
              </span>
            </div>
          </div>

          <h4 className="profile-subtitle">Cómo es</h4>
          {knowsWell ? (
            <>
              <Bar label="Compromiso" value={p.commitment} />
              <Bar label="Confiabilidad" value={p.reliability} />
              <Bar label="Prestigio" value={p.prestige} />
              <p className="muted" style={{ margin: '0.4rem 0 0' }}>
                Personalidad: {p.personality.replace('_', ' ')}. Lo que se comenta en la liga; la verdad se ve en
                la cancha.
              </p>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Se lo conoce poco: habría que enfrentarlo o preguntar en la liga para saber cómo es.
            </p>
          )}

          <h4 className="profile-subtitle">Disponibilidad habitual</h4>
          {!knowsWell ? (
            <p className="muted">Poco y nada se sabe de su disponibilidad: en esta liga, eso se aprende jugándole.</p>
          ) : p.availability.notes.length > 0 ? (
            <ul className="reason-list">
              {p.availability.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sin restricciones conocidas: suele estar para jugar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
