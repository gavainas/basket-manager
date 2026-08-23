import type { TimelineEvent, TimelineKind } from '../game/types';
import { timelineNewestFirst } from '../game/timeline';
import { Icon, type IconName } from './Icon';

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
export function Timeline({ events, emptyText }: { events?: TimelineEvent[]; emptyText?: string }) {
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
            T{e.season} · {e.week === 0 ? 'Pretemp.' : `Sem ${e.week}`}
          </span>
          <span className="timeline-text">{e.text}</span>
        </div>
      ))}
    </div>
  );
}
