import type { GameState } from '../game/types';
import { DEBUG_FULL_SCOUTING, perceivedLevel, scoutingLevel } from '../game/scouting';
import { divisionOfTeam, teamByLegacyRival, teamRoster, worldPlayerName } from '../game/world';
import { ClubLink } from './ClubLink';
import { Carita, Ficha, Renglon, Seccion } from './Ficha';
import { Jersey } from './ClubProfile';
import { Crest } from './Crest';
import { LeagueLink } from './LeagueLink';
import { WorldPlayerLink } from './WorldPlayerLink';
import { initials, rivalDifficulty, rivalStyleInfo, weekLabel } from './helpers';
import { useTeclasModal } from './teclas';

interface Props {
  state: GameState;
  rivalId: string;
  onClose: () => void;
}

/** Ficha de un club rival: cómo juega, cómo viene y el historial contra nosotros. */
export function RivalProfile({ state, rivalId, onClose }: Props) {
  useTeclasModal({ onClose });
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
  const worldClub = team ? state.world.clubs.find((c) => c.id === team.clubId) : undefined;
  const roster = team
    ? teamRoster(state.world, team.id).sort((a, b) => b.level - a.level)
    : [];
  const upcoming = state.schedule
    .map((id, i) => ({ id, week: i + 1 }))
    .filter(
      (x) =>
        x.id === rival.id && x.week >= state.week && !state.history.some((m) => m.week === x.week)
    );

  const knowledge = scoutingLevel(state, rival.id);
  const knowsWell = knowledge >= 3 || DEBUG_FULL_SCOUTING;
  const played = row ? row.wins + row.losses : 0;
  const diff = row ? row.pointsFor - row.pointsAgainst : 0;
  const h2hLosses = headToHead.length - h2hWins;
  const proximos = upcoming.length > 0 && state.week <= state.seasonLength
    ? upcoming.map((x) => (x.week === state.week ? 'esta semana' : `la semana ${x.week}`))
    : [];

  /* El rival como héroe: el escudo grande, el nombre en display y la clave
     del partido dicha como en el Tablero («Rival duro. Tiradores: …»). Lo
     que importa de su temporada y del cara a cara va en frases; la planilla
     de la derecha tiene la institución, el plantel y los partidos. */
  const heroe = (
    <>
      <div className="ficha-heroe-texto">
        {worldClub ? (
          <div className="ficha-escudo">
            <Crest seed={worldClub.id} name={worldClub.name} colors={worldClub.colors} founded={worldClub.founded} size={140} />
            <Jersey colors={worldClub.colors} size={48} />
          </div>
        ) : (
          <div className="ficha-emblema" aria-hidden="true">
            <span className="ficha-iniciales">{initials(rival.name)}</span>
          </div>
        )}
        <div className="v1-eyebrow">
          Rival{league ? <> · {league.name}</> : null}{division ? <> · <b>{division.name}</b></> : null}
        </div>
        <h2 className="ficha-nombre">{rival.name}</h2>
        <p className="ficha-clave">
          <b className={difficulty.cls}>{difficulty.label}.</b> {style.label}: {style.desc}
        </p>
        <p className="v1-frase">{style.advice}</p>
        {row && (
          <p className="v1-frase">
            {played === 0 ? (
              <>Todavía <b>sin fechas jugadas</b> esta temporada.</>
            ) : (
              <>
                Van <b>{position}°</b> de {state.standings.length} con <b>{row.wins}-{row.losses}</b>: {row.pointsFor} a favor y{' '}
                {row.pointsAgainst} en contra (<b className={diff >= 0 ? 'good' : 'bad'}>{diff >= 0 ? '+' : ''}{diff}</b>).
              </>
            )}
          </p>
        )}
        <p className="v1-frase">
          {headToHead.length === 0 ? (
            <>Todavía no nos cruzamos esta temporada.</>
          ) : (
            <>
              Contra nosotros: <b className="good">{h2hWins}</b> victoria{h2hWins !== 1 ? 's' : ''} y{' '}
              <b className="bad">{h2hLosses}</b> derrota{h2hLosses !== 1 ? 's' : ''} nuestras.
            </>
          )}
          {proximos.length > 0 && <> Nos toca <b>{proximos.join(' y ')}</b>.</>}
        </p>
      </div>
    </>
  );

  return (
    <Ficha onClose={onClose} label={rival.name} heroe={heroe} clase="ficha-club">
      {team && (
        <Seccion titulo="El club">
          <div className="data-grid">
            <Renglon label="Compite en">
              {league ? <span className="liga-link"><LeagueLink id={league.id}>{league.name}</LeagueLink></span> : '—'} · {division?.name}
              {division ? ` (${division.gameDay} ${division.gameTimes.join(' / ')})` : ''}
            </Renglon>
            <Renglon label="Cancha">{venue ? `${venue.name} (${venue.neighborhood})` : '—'}</Renglon>
            <Renglon label="Delegado">{team.delegate}</Renglon>
            {team.coachName && (
              <Renglon label="DT">
                {team.coachName}{' '}
                <span className="muted">
                  (
                  {team.coachType === 'pago'
                    ? 'DT pago'
                    : team.coachType === 'jugador'
                      ? 'los dirige un jugador'
                      : 'honorario'}
                  )
                </span>
              </Renglon>
            )}
            {worldClub && (
              <Renglon label="Institución">
                <span className="club-link"><ClubLink id={worldClub.id}>Ver la ficha del club →</ClubLink></span>
              </Renglon>
            )}
          </div>
        </Seccion>
      )}

      {roster.length > 0 && (
        <Seccion titulo={`Plantel ${state.world.season.id.replace('s', 'temporada ')}`} extra={`${roster.length} jugadores`}>
          <div className="data-grid ficha-plantel">
            {roster.map((p) => (
              <Renglon key={p.id} label={p.position}>
                <span className="ficha-persona">
                  <Carita seed={p.id} personality={p.personality} />
                  <span>
                    <WorldPlayerLink id={p.id}>{worldPlayerName(p)}</WorldPlayerLink>{' '}
                    <span className="muted">
                      {perceivedLevel(state, p, knowledge)}
                      {' · '}{p.age} años
                      {p.injuryWeeks > 0 ? ' · lesionado' : ''}
                      {knowsWell && p.availability.distanceKm > 50 ? ` · ${p.availability.residence}` : ''}
                    </span>
                  </span>
                </span>
              </Renglon>
            ))}
          </div>
        </Seccion>
      )}

      {headToHead.length > 0 && (
        <Seccion titulo="Los cruces de esta temporada">
          <div className="data-grid">
            {headToHead.map((m) => (
              <Renglon key={m.week} label={weekLabel(m.week, state.seasonLength)}>
                <span className={`ficha-resultado ${m.won ? 'good' : 'bad'}`}>
                  {m.forfeit ? 'Forfeit' : `${m.won ? 'G' : 'P'} ${m.scoreFor}-${m.scoreAgainst}`}
                </span>
              </Renglon>
            ))}
          </div>
        </Seccion>
      )}
    </Ficha>
  );
}
