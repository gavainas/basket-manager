import { useContext } from 'react';
import type { GameState, TimelineEvent, TimelineKind } from '../game/types';
import { QUE_LOS_ALIMENTA } from '../game/evaluation';
import { activePlayers } from '../game/match';
import { timelineNewestFirst } from '../game/timeline';
import { USER_CLUB_ID } from '../game/world';
import { Crest } from './Crest';
import { FilaDePie, type PersonaDePie } from './Busto';
import { Icon, type IconName } from './Icon';
import { OpenProfileContext } from './PlayerLink';
import { formatMoney } from './helpers';
import { Planilla, plural } from './bloqueD';
import './club.css';

const KIND_ICONS: Record<TimelineKind, IconName> = {
  llegada: 'plantel',
  partido: 'estrella',
  lesion: 'enfermeria',
  ausencia: 'cruz',
  animo: 'animo',
  social: 'asado',
  hito: 'liga',
  salida: 'salir',
};

const POS_ABBR: Record<string, string> = { Base: 'BAS', Escolta: 'ESC', Alero: 'ALE', 'Ala-Pívot': 'ALA', Pívot: 'PIV' };

/** En la fila entra el apodo si lo tiene, y si no el apellido (como en el Tablero). */
function shortName(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

/** La historia del club por temporada, de la más nueva a la más vieja. */
function porTemporada(events: TimelineEvent[]): [number, TimelineEvent[]][] {
  const grupos = new Map<number, TimelineEvent[]>();
  for (const e of timelineNewestFirst(events)) grupos.set(e.season, [...(grupos.get(e.season) ?? []), e]);
  return [...grupos.entries()];
}

/**
 * Historia (UI V1): lo que el club ya vivió. No es una lista de datos sino el
 * archivo del club: el héroe con el escudo y los años, las figuras de la
 * temporada de pie, la vitrina con cada temporada cerrada como una placa, la
 * historia del club como una línea de tiempo (la planilla protagonista) y la
 * crónica de la temporada al lado.
 */
export function HistoryView({ state }: { state: GameState }) {
  const open = useContext(OpenProfileContext);
  const userClub = state.world.clubs.find((c) => c.id === USER_CLUB_ID);

  // Ranking de MVP de la temporada en curso.
  const mvpCounts = new Map<string, number>();
  for (const m of state.history) {
    if (m.mvpId) mvpCounts.set(m.mvpId, (mvpCounts.get(m.mvpId) ?? 0) + 1);
  }
  const mvpRanking = [...mvpCounts.entries()]
    .map(([id, count]) => ({ player: state.players.find((p) => p.id === id), count }))
    .filter((x) => x.player)
    .sort((a, b) => b.count - a.count);
  const figuras: PersonaDePie[] = mvpRanking.slice(0, 6).map(({ player, count }) => ({
    id: player!.id,
    nombre: shortName(player!.name),
    personality: player!.personality,
    sub: POS_ABBR[player!.position] ?? player!.position.slice(0, 3).toUpperCase(),
    estado: { cls: 'good', label: count === 1 ? '1 vez MVP' : `${count} veces MVP` },
    fuera: !!player!.leftClub,
    title: `${player!.name} — ${count === 1 ? 'una vez' : `${count} veces`} figura del partido`,
    onClick: () => open(player!.id),
  }));

  const pasadas = state.pastSeasons;
  const ascensos = pasadas.filter((ps) => ps.moved?.kind === 'ascenso').length;
  const descensos = pasadas.filter((ps) => ps.moved?.kind === 'descenso').length;
  const plantel = activePlayers(state.players).length;

  return (
    <div className="historia">
      <section className="hi-hero v1-hero" aria-label="El club">
        <div className="v1-eyebrow">
          La historia del club{userClub && <> · fundado en <b>{userClub.founded}</b></>}
        </div>
        <div className="hi-club">
          {userClub && (
            <Crest seed={userClub.id} name={userClub.name} colors={userClub.colors} founded={userClub.founded} size={92} />
          )}
          <div>
            <h2 className="v1-titulo">{state.club.name}</h2>
            <div className="hi-temporada">
              Temporada {state.seasonNumber}
              <span> · en juego</span>
            </div>
          </div>
        </div>
        <p className="v1-frase hi-frase">
          {pasadas.length === 0 ? (
            <>Es la primera temporada: la vitrina se llena cuando termine. </>
          ) : (
            <>
              <b>{plural(pasadas.length, 'temporada cerrada', 'temporadas cerradas')}</b>
              {ascensos > 0 && <>, <b className="good">{plural(ascensos, 'ascenso', 'ascensos')}</b></>}
              {descensos > 0 && <>, <b className="bad">{plural(descensos, 'descenso', 'descensos')}</b></>}.{' '}
            </>
          )}
          En el plantel hay <b>{plantel}</b>
          {state.playersLeftCount > 0 ? <> y se fueron <b>{state.playersLeftCount}</b> esta temporada.</> : ' y nadie se fue esta temporada.'}
        </p>
      </section>

      <section className="hi-figuras" aria-label="Las figuras de la temporada">
        <div className="v1-eyebrow hi-figuras-tit">
          Las figuras · <b>temporada {state.seasonNumber}</b>
        </div>
        {figuras.length > 0 ? (
          <FilaDePie personas={figuras} />
        ) : (
          <p className="v1-frase">Todavía no hubo figura del partido: aparecen después de la primera fecha.</p>
        )}
      </section>

      {pasadas.length > 0 && (
        <Planilla titulo="La vitrina" nota={plural(pasadas.length, 'temporada', 'temporadas')} className="hi-vitrina">
          <div className="hi-placas">
            {[...pasadas].reverse().map((ps) => (
              <article className="hi-placa" key={ps.season}>
                <div className="hi-placa-t">Temporada {ps.season}</div>
                <div className="hi-placa-pos">
                  {ps.position}°<span>{ps.record}</span>
                </div>
                <div className="hi-placa-outcome">{ps.outcome}</div>
                {/* Los saves de antes no traen la categoría: no se inventa. */}
                {ps.division && <div className="hi-placa-div">{ps.division}</div>}
                <div className="hi-placa-pie">
                  {ps.moved && (
                    <span className={`v1-est ${ps.moved.kind === 'ascenso' ? 'good' : 'bad'}`}>
                      {ps.moved.kind === 'ascenso' ? `↑ subió a la ${ps.moved.to}` : `↓ bajó a la ${ps.moved.to}`}
                    </span>
                  )}
                  <span className="hi-placa-caja">
                    caja final <b className={ps.money < 0 ? 'bad' : undefined}>{formatMoney(ps.money)}</b>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </Planilla>
      )}

      <Planilla mano titulo="Lo que vivimos" nota="la historia del club" className="hi-archivo">
        {state.clubTimeline.length === 0 ? (
          <p className="bd-vacio">La historia del club se está escribiendo: jugá y van a llegar los momentos.</p>
        ) : (
          porTemporada(state.clubTimeline).map(([season, events]) => (
            <div className="hi-tramo" key={season}>
              <h4 className="hi-tramo-tit">Temporada {season}</h4>
              <ol className="hi-linea">
                {events.map((e, i) => (
                  <li key={i} className={`hi-hito k-${e.kind}`}>
                    <span className="hi-hito-ico">
                      <Icon name={KIND_ICONS[e.kind]} size={13} />
                    </span>
                    <span className="hi-hito-cuando">{e.week === 0 ? 'Pretemporada' : `Semana ${e.week}`}</span>
                    <span className="hi-hito-txt">{e.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))
        )}
        <h4 className="bd-sub hi-momentos-tit">Para contar en el asado</h4>
        {state.memorableMoments.length === 0 ? (
          <p className="bd-vacio">
            Todavía no pasó nada digno de contar en el asado. Las historias se construyen: {QUE_LOS_ALIMENTA}
          </p>
        ) : (
          <ul className="hi-momentos">
            {state.memorableMoments.map((m, i) => (
              <li key={i} className="v1-renglon">
                {m}
              </li>
            ))}
          </ul>
        )}
      </Planilla>

      <Planilla titulo={`La crónica de la temporada ${state.seasonNumber}`} nota={state.news.length > 0 ? plural(state.news.length, 'noticia', 'noticias') : undefined} className="hi-cronica">
        {state.news.length === 0 ? (
          <p className="bd-vacio">Sin novedades todavía.</p>
        ) : (
          <ul className="ec-lista">
            {state.news.map((n, i) => (
              <li key={i} className={`v1-renglon ${n.tone}`}>
                <span className="ec-sem">S{n.week}</span>
                <span className="ec-punto" aria-hidden="true" />
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Planilla>
    </div>
  );
}
