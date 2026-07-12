import type { TimelineEvent, TimelineKind } from '../game/types';
import { timelineNewestFirst } from '../game/timeline';

const KIND_ICONS: Record<TimelineKind, string> = {
  llegada: '🤝',
  partido: '⭐',
  lesion: '🚑',
  ausencia: '❌',
  animo: '😤',
  social: '🍕',
  hito: '🏆',
  salida: '👋',
};

/** Historia en formato lista, del momento más reciente al más viejo. */
export function Timeline({ events, emptyText }: { events?: TimelineEvent[]; emptyText?: string }) {
  const list = events ?? [];
  if (list.length === 0) {
    return <p className="muted">{emptyText ?? 'Todavía no hay historia para contar.'}</p>;
  }
  return (
    <div className="timeline">
      {timelineNewestFirst(list).map((e, i) => (
        <div className="timeline-row" key={i}>
          <span className="timeline-icon">{KIND_ICONS[e.kind]}</span>
          <span className="timeline-when">
            T{e.season} · {e.week === 0 ? 'Pretemp.' : `Sem ${e.week}`}
          </span>
          <span className="timeline-text">{e.text}</span>
        </div>
      ))}
    </div>
  );
}
