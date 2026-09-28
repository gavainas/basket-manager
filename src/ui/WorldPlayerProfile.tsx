import type { GameState } from '../game/types';
import { famaDeCumplidor } from '../game/conduct';
import { DEBUG_FULL_SCOUTING, perceivedLevel, scoutingLevel } from '../game/scouting';
import {
  divisionOfTeam,
  findActiveRegistration,
  worldPlayerById,
  worldPlayerName,
  worldPlayerTeam,
} from '../game/world';
import { Bar } from './Bar';
import { Ficha, FichaDePie, Renglon, Seccion } from './Ficha';
import { LeagueLink } from './LeagueLink';
import { RivalLink } from './RivalLink';
import { useTeclasModal } from './teclas';

interface Props {
  state: GameState;
  playerId: string;
  onClose: () => void;
}

/** Perfil de un jugador rival: persona, nivel estimado, disponibilidad y ficha. */
export function WorldPlayerProfile({ state, playerId, onClose }: Props) {
  useTeclasModal({ onClose });
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
  // El conocimiento por persona pesa igual que el del equipo: al que
  // enfrentaste varias veces lo conocés, juegue donde juegue.
  const faced = p.timesFaced ?? 0;
  const knowsWell = knowledge >= 3 || faced >= 2 || DEBUG_FULL_SCOUTING;
  // Lo que nos hizo esta temporada, sumando la planilla de ellos de cada
  // informe (sep 2026). Los informes viejos no la traen y no cuentan.
  const contra = state.history.reduce(
    (acc, m) => {
      const l = m.rivalBox?.find((x) => x.playerId === p.id);
      return l ? { pts: acc.pts + l.points, partidos: acc.partidos + 1 } : acc;
    },
    { pts: 0, partidos: 0 }
  );

  const nivel = perceivedLevel(state, p, knowledge);
  const estados = [
    p.injuryWeeks > 0 ? { cls: 'bad', label: `Lesionado (${p.injuryWeeks} sem.)` } : null,
    interior ? { cls: 'warn', label: `Vive en ${p.availability.residence}` } : null,
  ].filter((e): e is { cls: string; label: string } => !!e);

  /* Un jugador de otro equipo, con el mismo idioma que la ficha de los
     nuestros: de pie y grande a la izquierda, con lo que sabemos de él en
     frases; la ficha de esta temporada en la planilla. */
  const heroe = (
    <>
      <div className="ficha-heroe-texto">
        <div className="v1-eyebrow">
          {p.position}
          {p.secondaryPositions.length > 0 && <> (también {p.secondaryPositions.join(', ')})</>} · <b>{p.age} años</b>
        </div>
        <h2 className="ficha-nombre">{worldPlayerName(p)}</h2>
        <p className="ficha-linea">
          {team && club ? (
            <>
              Juega en{' '}
              {team.legacyRivalId ? <RivalLink id={team.legacyRivalId}>{team.name}</RivalLink> : team.name}
              {league ? <> · {league.name}</> : null}.
            </>
          ) : (
            'Está libre: no juega en ningún equipo.'
          )}
          {faced > 0 && <> Lo enfrentaste {faced === 1 ? 'una vez' : `${faced} veces`}.</>}
          {p.exUserClub && <> Jugó en tu club.</>}
        </p>
        <div className="ficha-valor">
          <span className={`ficha-cifra${nivel.startsWith('≈') ? '' : nivel.startsWith('estimación') ? ' palabra dudosa' : ' palabra'}`}>{nivel}</span>
          <span className="ficha-cifra-k">
            Nivel estimado
            <span>{knowsWell ? 'Lo conocemos bien' : 'Lo que se comenta'}</span>
          </span>
        </div>
        {estados.length > 0 && (
          <div className="ficha-estados">
            {estados.map((e) => (
              <span key={e.label} className={`v1-est ${e.cls}`}>
                {e.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <FichaDePie seed={p.id} personality={p.personality} />
    </>
  );

  return (
    <Ficha onClose={onClose} label={worldPlayerName(p)} heroe={heroe} clase="ficha-mundo">
      <Seccion titulo="Ficha esta temporada">
        <div className="data-grid">
          <Renglon label="Equipo">
            {team && club ? (
              team.legacyRivalId ? (
                <RivalLink id={team.legacyRivalId}>{team.name}</RivalLink>
              ) : (
                team.name
              )
            ) : (
              'Libre'
            )}
          </Renglon>
          {contra.partidos > 0 && (
            <Renglon label="Contra nosotros">
              {contra.pts === 0
                ? `Jugó ${contra.partidos === 1 ? 'un partido' : `${contra.partidos} partidos`} y no nos anotó.`
                : `${contra.pts} puntos en ${contra.partidos === 1 ? 'un partido' : `${contra.partidos} partidos`}${
                    contra.partidos > 1 ? ` (${(contra.pts / contra.partidos).toFixed(1)} por partido)` : ''
                  } esta temporada.`}
            </Renglon>
          )}
          <Renglon label="Liga">
            {league ? (
              <>
                <LeagueLink id={league.id}>{league.name}</LeagueLink> · {division?.name ?? ''}
              </>
            ) : (
              '—'
            )}
          </Renglon>
          <Renglon label="Libre en">
            {freeLeagues.length > 0
              ? freeLeagues.map((l, i) => (
                  <span key={l.id}>
                    {i > 0 && ' · '}
                    <LeagueLink id={l.id}>{l.name}</LeagueLink>
                  </span>
                ))
              : 'Ninguna liga'}
          </Renglon>
          {team && p.joinedSeason !== undefined && (
            <Renglon label="En el equipo">
              {p.joinedSeason >= world.season.number ? 'Llegó este año' : `Desde la temporada ${p.joinedSeason}`}
            </Renglon>
          )}
          <Renglon label="Residencia">
            {p.availability.residence}
            {interior ? ` (${p.availability.distanceKm} km)` : ''}
          </Renglon>
        </div>
      </Seccion>

      <Seccion titulo="Cómo es">
        {knowsWell ? (
          <>
            {/* De uno de otro club sólo hay fama, no ficha de conducta. */}
            <p className="ficha-frase">{famaDeCumplidor(p.commitment)}</p>
            <Bar label="Confiabilidad" value={p.reliability} />
            <Bar label="Prestigio" value={p.prestige} />
            <p className="ficha-nota">
              Personalidad: {p.personality.replace('_', ' ')}. Lo que se comenta en la liga; la verdad se ve en la cancha.
            </p>
          </>
        ) : (
          <p className="ficha-nada">Se lo conoce poco: habría que enfrentarlo o preguntar en la liga para saber cómo es.</p>
        )}
      </Seccion>

      <Seccion titulo="Disponibilidad habitual">
        {!knowsWell ? (
          <p className="ficha-nada">Poco y nada se sabe de su disponibilidad: en esta liga, eso se aprende jugándole.</p>
        ) : p.availability.notes.length > 0 ? (
          <ul className="ficha-lista">
            {p.availability.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="ficha-nada">Sin restricciones conocidas: suele estar para jugar.</p>
        )}
      </Seccion>
    </Ficha>
  );
}
