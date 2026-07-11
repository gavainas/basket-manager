import type { Player } from '../game/types';
import { Bar } from './Bar';
import { feeChip, initials, roleLabel, starsFor, statusChip } from './helpers';

interface Props {
  player: Player;
  selectable?: boolean;
  selected?: boolean;
  /** Sin lugar en el quinteto: se ve apagado y no responde al click. */
  dimmed?: boolean;
  onToggle?: (id: string) => void;
  compact?: boolean;
}

export function PlayerCard({ player: p, selectable, selected, dimmed, onToggle, compact }: Props) {
  const status = statusChip(p);
  const fee = feeChip(p);
  const unavailable = selectable && (p.status === 'lesionado' || p.leftClub);
  const clickable = selectable && !unavailable && !dimmed && onToggle;

  return (
    <div
      className={`player-card${selected ? ' selected' : ''}${unavailable ? ' unavailable' : ''}${dimmed ? ' dimmed' : ''}`}
      onClick={clickable ? () => onToggle(p.id) : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
    >
      <div className="player-head">
        <div className="avatar">{initials(p.name)}</div>
        <div className="who">
          <div className="name">{p.name}</div>
          <div className="pos">
            {p.position} · {p.age} años
          </div>
        </div>
        <div className="rating">
          <div className="num">≈{p.visibleRating}</div>
          <div className="approx">{starsFor(p.visibleRating)}</div>
        </div>
      </div>

      {!compact && <div className="player-desc">{p.description}</div>}

      <Bar label="Físico" value={p.physical} />
      <Bar label="Motivación" value={p.motivation} />
      {!compact && (
        <>
          <Bar label="Compromiso" value={p.commitment} />
          <Bar label="Afinidad social" value={p.social} />
        </>
      )}

      <div className="player-chips">
        <span className={`chip ${status.cls}`}>{status.label}</span>
        <span className={`chip ${fee.cls}`}>{fee.label}</span>
        <span className="chip">{roleLabel(p)}</span>
        {p.lastRating !== null && <span className="chip accent">Último partido: {p.lastRating}/10</span>}
        {selectable && selected && <span className="chip accent">Titular</span>}
      </div>
    </div>
  );
}
