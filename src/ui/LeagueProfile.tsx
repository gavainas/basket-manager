import { useContext } from 'react';
import type { Division, GameState } from '../game/types';
import { divisionStandings, USER_TEAM_ID } from '../game/world';
import { ClubLink } from './ClubLink';
import { Ficha, Seccion } from './Ficha';
import { RivalLink } from './RivalLink';
import { NavigateTabContext } from './nav';
import { Icon } from './Icon';
import { useTeclasModal } from './teclas';

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
  useTeclasModal({ onClose });
  const world = state.world;
  const league = world.leagues.find((l) => l.id === leagueId);
  if (!league) return null;

  const divisions = world.divisions
    .filter((d) => d.leagueId === league.id)
    .sort((a, b) => a.level - b.level);
  const userEntry = world.entries.find(
    (e) => e.leagueId === league.id && e.teamId === USER_TEAM_ID && e.status === 'activa'
  );

  // La categoría del club en esta liga (undefined si no juega acá).
  const ourLevel = userEntry ? divisions.find((x) => x.id === userEntry.divisionId)?.level : undefined;

  const recordOf = (legacyId?: string) => {
    const row = legacyId ? state.standings.find((r) => r.teamId === legacyId) : undefined;
    return row ? `${row.wins}-${row.losses}` : null;
  };

  const teamsOf = (division: Division) =>
    world.entries
      .filter((e) => e.divisionId === division.id && e.status === 'activa')
      .map((e) => world.teams.find((t) => t.id === e.teamId))
      .filter((t): t is NonNullable<typeof t> => !!t);

  const ours = userEntry ? divisions.find((d) => d.id === userEntry.divisionId) : undefined;

  /* La liga como héroe: qué es, el nombre en display, si jugamos acá y sus
     reglas dichas como frases. La planilla de la derecha tiene las
     divisionales con sus equipos. */
  const heroe = (
    <div className="ficha-heroe-texto">
      <div className="ficha-emblema" aria-hidden="true">
        <Icon name="liga" size={52} />
      </div>
      <div className="v1-eyebrow">
        {KIND_LABELS[league.kind] ?? league.kind} · <b>{league.divisionCount} divisional{league.divisionCount !== 1 ? 'es' : ''}</b>
        {league.minAge ? <> · desde {league.minAge} años</> : null}
      </div>
      <h2 className="ficha-nombre">{league.name}</h2>
      <p className="ficha-clave">
        {userEntry ? (
          <>
            <b className="good">Acá jugamos nosotros.</b> {ours ? `En la ${ours.name}, los ${ours.gameDay}.` : ''}
          </>
        ) : (
          <>
            <b>El club no participa.</b> Todavía no tenemos un equipo inscripto. Con más caja, camisetas, un delegado
            y jugadores disponibles, inscribir un equipo acá es el próximo paso de crecimiento del club.
          </>
        )}
      </p>
      {league.rules.length > 0 && (
        <ul className="ficha-lista" aria-label="Reglas">
          {league.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Ficha onClose={onClose} label={league.name} heroe={heroe} clase="ficha-liga">
      {divisions.map((d) => {
        const teams = teamsOf(d);
        const isOurs = userEntry?.divisionId === d.id;
        // La divisional que no jugamos tiene tabla simulada (determinista por temporada).
        const otherRows = isOurs ? null : divisionStandings(world, d.id, state.week, state.seasonNumber);
        const orderedTeams = otherRows
          ? otherRows
              .map((r) => teams.find((t) => t.id === r.teamId))
              .filter((t): t is NonNullable<typeof t> => !!t)
          : teams;
        const recordFor = (t: (typeof teams)[number]) => {
          if (isOurs) return recordOf(t.legacyRivalId) ?? '—';
          const row = otherRows?.find((r) => r.teamId === t.id);
          return row ? `${row.wins}-${row.losses}` : '—';
        };
        // "Arriba" y "abajo" solo tienen sentido si el club juega en esta
        // liga; si no, la categoría se cuenta sola.
        const extra = isOurs
          ? 'Nuestra divisional'
          : orderedTeams.length > 0 && ourLevel !== undefined
            ? d.level < ourLevel
              ? `${ourLevel - d.level} categoría${ourLevel - d.level > 1 ? 's' : ''} arriba`
              : `${d.level - ourLevel} categoría${d.level - ourLevel > 1 ? 's' : ''} abajo`
            : undefined;
        return (
          <Seccion key={d.id} titulo={d.name} extra={extra}>
            <p className="ficha-nota">
              Se juega los {d.gameDay} a las {d.gameTimes.join(' o ')}
              {d.altDays.length > 0 ? ` (reprogramaciones: ${d.altDays.join(', ')})` : ''}.
            </p>
            {orderedTeams.length > 0 ? (
              <div className="data-grid ficha-equipos">
                {orderedTeams.map((t) => (
                  <div className={`data-row${t.id === USER_TEAM_ID ? ' nuestro' : ''}`} key={t.id}>
                    <span className="data-label">{recordFor(t)}</span>
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
                        <span className="club-link"><ClubLink id={t.clubId}>{t.name}</ClubLink></span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ficha-nada">Sin equipos cargados esta temporada: el club podría inscribirse acá más adelante.</p>
            )}
          </Seccion>
        );
      })}
    </Ficha>
  );
}
