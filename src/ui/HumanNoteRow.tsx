import type { HumanNote } from '../game/humanState';
import { PlayerLink } from './PlayerLink';

/**
 * Una nota humana (ícono + frase contextual). Si la nota menciona a un
 * compañero por nombre, ese nombre abre su ficha (mismo mecanismo que el
 * resto de la UI). Card y ficha comparten este renderizado.
 */
export function HumanNoteRow({ note }: { note: HumanNote }) {
  return (
    <div className={`human-note ${note.tone}`}>
      <span className="hn-icon">{note.icon}</span> {renderText(note)}
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
