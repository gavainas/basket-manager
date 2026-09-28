import { useContext } from 'react';
import type { GameState, WorldClub } from '../game/types';
import { divisionOfTeam, teamRoster, USER_TEAM_ID, worldPlayerName } from '../game/world';
import { Bar } from './Bar';
import { Crest } from './Crest';
import { Carita, Ficha, Renglon, Seccion } from './Ficha';
import { LeagueLink } from './LeagueLink';
import { RivalLink } from './RivalLink';
import { Timeline } from './Timeline';
import { Tip, TIPS } from './Tip';
import { WorldPlayerLink } from './WorldPlayerLink';
import { NavigateTabContext } from './nav';
import { formatMoney, rivalDifficulty, rivalStyleInfo, starsFor } from './helpers';
import { useTeclasModal } from './teclas';

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
  useTeclasModal({ onClose });
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

  const difficulty = rival ? rivalDifficulty(rival) : null;

  /* El club como héroe: el escudo grande con la camiseta, el nombre en
     display y lo que se dice de él en la liga, en una frase. La planilla de
     la derecha tiene el prestigio, los equipos y —si es el nuestro— la
     historia. */
  const heroe = (
    <div className="ficha-heroe-texto">
      <div className="ficha-escudo">
        <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={140} />
        <Jersey colors={club.colors} size={48} />
      </div>
      <div className="v1-eyebrow">
        {isUser ? <b>Tu club</b> : 'Club'} · Fundado en {club.founded}
      </div>
      <h2 className="ficha-nombre">{club.name}</h2>
      {difficulty && rival ? (
        <p className="ficha-clave">
          <b className={difficulty.cls}>{difficulty.label}.</b> {fameLabel(sportPrestige)}
        </p>
      ) : (
        <p className="ficha-linea">{fameLabel(sportPrestige)}</p>
      )}
      {rival && (
        <p className="v1-frase">
          Juegan como <b>{rivalStyleInfo(rival.style).label.toLowerCase()}</b>: {rivalStyleInfo(rival.style).desc.split(':')[0].toLowerCase()}.
        </p>
      )}
      {rival && (
        <p className="v1-frase">
          {h2h.length === 0 ? (
            'Todavía no nos cruzamos esta temporada.'
          ) : (
            <>
              Contra nosotros, {h2h.length} partido{h2h.length > 1 ? 's' : ''}: <b className="good">{h2hWins}</b> victoria
              {h2hWins !== 1 ? 's' : ''} nuestra{h2hWins !== 1 ? 's' : ''} y <b className="bad">{h2h.length - h2hWins}</b> de ellos.
            </>
          )}
        </p>
      )}
      {isUser && (
        <p className="v1-frase">
          En caja:{' '}
          <Tip text="La plata del club: si llega a cero, se acaba la temporada.">
            <b>{formatMoney(state.club.money)}</b>
          </Tip>
          {state.pastSeasons.length > 0 && (
            <>
              {' '}· <b>{state.pastSeasons.length}</b> temporada{state.pastSeasons.length > 1 ? 's' : ''} en el libro
            </>
          )}
          .
        </p>
      )}
    </div>
  );

  return (
    <Ficha onClose={onClose} label={club.name} heroe={heroe} clase="ficha-club">
      <Seccion titulo="Prestigio y fama">
        <Bar label="Prestigio deportivo" value={sportPrestige} hint={TIPS.prestigioDeportivo} />
        <Bar label="Prestigio social" value={socialPrestige} hint={TIPS.prestigioSocial} />
        {isUser && (
          <>
            <Bar label="Ambiente social" value={state.club.socialClimate} hint={TIPS.ambienteSocial} />
            <Bar label="Organización" value={state.club.organization} hint={TIPS.organizacion} />
          </>
        )}
      </Seccion>

      <Seccion titulo="Equipos del club">
        <div className="data-grid ficha-equipos">
          {teams.map((t) => {
            const division = divisionOfTeam(world, t.id);
            const league = division ? world.leagues.find((l) => l.id === division.leagueId) : undefined;
            const venue = world.venues.find((v) => v.id === t.venueId);
            return (
              <Renglon key={t.id} label={recordOf(t.legacyRivalId)}>
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
              </Renglon>
            );
          })}
        </div>
        {isUser && (
          <p className="ficha-nota">
            Con más caja, camisetas y un delegado, el club podrá inscribir equipos en otras ligas.
          </p>
        )}
      </Seccion>

      {/* Plantel de equipos del mundo (otra divisional): los rivales clásicos ya lo muestran en su ficha con scouting. */}
      {teams
        .filter((t) => !t.legacyRivalId && t.id !== USER_TEAM_ID)
        .map((t) => {
          const roster = teamRoster(world, t.id).sort((a, b) => b.level - a.level);
          // Los clubes de categorías lejanas viven como tabla: sabemos
          // quiénes son, no quién juega. El plantel aparece cuando el club
          // se les acerca (una categoría arriba o abajo de la nuestra).
          if (roster.length === 0) {
            return (
              <Seccion key={t.id} titulo="Plantel">
                <p className="ficha-nada">Juegan demasiado lejos de nuestra categoría: nadie del club los vio jugar todavía.</p>
              </Seccion>
            );
          }
          return (
            <Seccion key={t.id} titulo="Plantel" extra={`${roster.length} jugadores`}>
              <div className="data-grid ficha-plantel">
                {roster.map((p) => (
                  <Renglon key={p.id} label={p.position}>
                    <span className="ficha-persona">
                      <Carita seed={p.id} personality={p.personality} />
                      <span>
                        <WorldPlayerLink id={p.id}>{worldPlayerName(p)}</WorldPlayerLink>{' '}
                        <span className="muted">
                          {starsFor(p.level)} · {p.age} años{p.injuryWeeks > 0 ? ' · lesionado' : ''}
                        </span>
                      </span>
                    </span>
                  </Renglon>
                ))}
              </div>
            </Seccion>
          );
        })}

      {isUser && state.pastSeasons.length > 0 && (
        <Seccion titulo="Palmarés">
          <div className="data-grid">
            {state.pastSeasons.map((ps) => (
              <Renglon key={ps.season} label={`Temporada ${ps.season}`}>
                {ps.division ? `${ps.division.replace(/^.* · /, '')} · ` : ''}
                {ps.position}° ({ps.record}) · <strong>{ps.outcome}</strong>
                {ps.moved && (ps.moved.kind === 'ascenso' ? ` · ↑ subió a la ${ps.moved.to}` : ` · ↓ bajó a la ${ps.moved.to}`)}
              </Renglon>
            ))}
          </div>
        </Seccion>
      )}

      {isUser && (
        <Seccion titulo="La historia reciente">
          <Timeline events={state.clubTimeline.slice(-8)} emptyText="La historia del club se está escribiendo." />
        </Seccion>
      )}
    </Ficha>
  );
}
