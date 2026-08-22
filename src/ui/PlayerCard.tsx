import type { GameState, Player } from '../game/types';
import { playerNotes } from '../game/humanState';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { HumanNoteRow } from './HumanNoteRow';
import { PlayerLink } from './PlayerLink';
import { Tip, TIPS } from './Tip';
import { feeChip, roleLabel, statusChip } from './helpers';

interface Props {
  player: Player;
  /** Estado del juego para las frases contextuales (si falta, no se muestran). */
  state?: GameState;
  selectable?: boolean;
  selected?: boolean;
  /** Elegido para la rotación (entra desde el banco). */
  inRotation?: boolean;
  /** Sin lugar en el quinteto: se ve apagado y no responde al click. */
  dimmed?: boolean;
  onToggle?: (id: string) => void;
  compact?: boolean;
  /** Veces que fue MVP esta temporada. */
  mvpCount?: number;
}

export function PlayerCard({ player: p, state, selectable, selected, inRotation, dimmed, onToggle, compact, mvpCount }: Props) {
  const status = statusChip(p);
  const fee = feeChip(p);
  const unavailable = selectable && (p.status === 'lesionado' || p.leftClub);
  const clickable = selectable && !unavailable && !dimmed && onToggle;
  // La frase más urgente sobre cómo está: el "por qué" al lado de los números.
  const note = state && !compact ? playerNotes(state, p)[0] : undefined;

  return (
    <div
      className={`player-card${selected ? ' selected' : ''}${inRotation ? ' rotation' : ''}${unavailable ? ' unavailable' : ''}${dimmed ? ' dimmed' : ''}`}
      onClick={clickable ? () => onToggle(p.id) : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
    >
      <div className="player-head">
        <div className="avatar">
          <Avatar
            seed={p.id}
            age={p.age}
            appearance={p.appearance}
            expressionOverride={
              p.status === 'molesto' || p.status === 'al_borde' ? 2 : p.status === 'lesionado' ? 3 : undefined
            }
            title={p.name}
          />
        </div>
        <div className="who">
          <div className="name">
            <PlayerLink id={p.id}>{p.name}</PlayerLink>
          </div>
          <div className="pos">
            {p.position} · {p.age} años
          </div>
        </div>
        <div className="rating">
          <Tip text={TIPS.valoracion}>
            <div className="num">≈{p.visibleRating}</div>
          </Tip>
        </div>
      </div>

      {!compact && <div className="player-desc">{p.description}</div>}

      <Bar label="Físico" value={p.physical} hint={TIPS.fisico} />
      <Bar label="Motivación" value={p.motivation} hint={TIPS.motivacion} />
      {!compact && (
        <>
          <Bar label="Compromiso" value={p.commitment} hint={TIPS.compromiso} />
          <Bar label="Afinidad social" value={p.social} hint={TIPS.afinidadSocial} />
        </>
      )}

      {note && <HumanNoteRow note={note} />}

      <div className="player-chips">
        <span className={`chip ${status.cls}`}>{status.label}</span>
        <span className={`chip ${fee.cls}`}>{fee.label}</span>
        <span className="chip">{roleLabel(p)}</span>
        {p.lastRating !== null && <span className="chip accent">Último partido: {p.lastRating}/10</span>}
        {(mvpCount ?? 0) > 0 && <span className="chip accent">MVP ×{mvpCount}</span>}
        {selectable && selected && <span className="chip accent">Titular</span>}
        {selectable && inRotation && <span className="chip rotation-chip">Rotación</span>}
      </div>
    </div>
  );
}
