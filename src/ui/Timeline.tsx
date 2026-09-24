import type { GameState, TimelineEvent, TimelineKind } from '../game/types';
import { fechaCorta, timelineNewestFirst } from '../game/timeline';
import { Icon, type IconName } from './Icon';

/**
 * Cuántas fechas tuvo cada temporada, para etiquetar sus semanas: la actual
 * sale del estado; las pasadas, del palmarés (una liga de 7 fechas tiene sus
 * semis en la 8). Los saves de antes no lo guardan: se asume la actual.
 */
export function largoDeTemporada(state: Pick<GameState, 'seasonNumber' | 'seasonLength' | 'pastSeasons'>): (season: number) => number {
  return (season) =>
    season === state.seasonNumber
      ? state.seasonLength
      : (state.pastSeasons.find((ps) => ps.season === season)?.seasonLength ?? state.seasonLength);
}

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

/** Historia en formato lista, del momento más reciente al más viejo. */
export function Timeline({
  events,
  emptyText,
  seasonLength,
}: {
  events?: TimelineEvent[];
  emptyText?: string;
  /** Fechas de cada temporada (ver `largoDeTemporada`); sin él, las semanas de playoffs se leen "Sem 10". */
  seasonLength?: (season: number) => number;
}) {
  const list = events ?? [];
  if (list.length === 0) {
    return <p className="muted">{emptyText ?? 'Todavía no hay historia para contar.'}</p>;
  }
  return (
    <div className="timeline">
      {timelineNewestFirst(list).map((e, i) => (
        <div className="timeline-row" key={i}>
          <span className="timeline-icon">
            <Icon name={KIND_ICONS[e.kind]} size={14} />
          </span>
          <span className="timeline-when">
            T{e.season} · {seasonLength ? fechaCorta(e.week, seasonLength(e.season)) : e.week === 0 ? 'Pretemp.' : `Sem ${e.week}`}
          </span>
          <span className="timeline-text">{e.text}</span>
        </div>
      ))}
    </div>
  );
}
