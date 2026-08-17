import type { HumanNote, NoteKind } from '../game/humanState';
import { Icon, type IconName } from './Icon';
import { PlayerLink } from './PlayerLink';

/**
 * La categoría de la nota elige el ícono; el color lo pone `tone`.
 * Lo comparte el radar del tablero (`watchItems`), que clasifica igual.
 */
export const NOTE_ICON: Record<NoteKind, IconName> = {
  animo: 'animo',
  fisico: 'fisico',
  plata: 'plata',
  social: 'social',
  cancha: 'cancha',
  agenda: 'agenda',
  alerta: 'alerta',
};

/**
 * Una nota humana (ícono + frase contextual). Si la nota menciona a un
 * compañero por nombre, ese nombre abre su ficha (mismo mecanismo que el
 * resto de la UI). Card y ficha comparten este renderizado.
 */
export function HumanNoteRow({ note }: { note: HumanNote }) {
  return (
    <div className={`human-note ${note.tone}`}>
      <span className="hn-icon">
        <Icon name={NOTE_ICON[note.kind]} size={14} />
      </span>{' '}
      {renderText(note)}
    </div>
  );
}

function renderText(note: HumanNote) {
  if (!note.refId || !note.refName) return note.text;
  const idx = note.text.indexOf(note.refName);
  if (idx < 0) return note.text;
  return (
    <>
      {note.text.slice(0, idx)}
      <PlayerLink id={note.refId}>{note.refName}</PlayerLink>
      {note.text.slice(idx + note.refName.length)}
    </>
  );
}
