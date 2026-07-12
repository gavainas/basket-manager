import type { GameState } from '../game/types';
import { scoutNextRival, type ScoutEntry } from '../game/world';
import { WorldPlayerLink } from './WorldPlayerLink';

function ScoutList({ title, icon, entries, empty }: { title: string; icon: string; entries: ScoutEntry[]; empty: string }) {
  return (
    <div>
      <div className="scout-title">
        {icon} {title}
      </div>
      {entries.length === 0 ? (
        <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
          {empty}
        </p>
      ) : (
        <ul className="reason-list" style={{ paddingLeft: '1rem' }}>
          {entries.map((e) => (
            <li key={e.playerId}>
              <WorldPlayerLink id={e.playerId}>{e.name}</WorldPlayerLink>{' '}
              <span className="muted">— {e.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Informe del próximo rival: un pronóstico con incertidumbre, no una certeza. */
export function ScoutingCard({ state }: { state: GameState }) {
  const report = scoutNextRival(state);
  if (!report) return null;
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>Scouting · {report.rivalName}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Lo que se comenta en la liga. Nadie confirma nada hasta el día del partido: puede fallar.
      </p>
      <div className="grid cols-3">
        <ScoutList title="Probables" icon="✅" entries={report.probable} empty="Nadie confirmado. Raro." />
        <ScoutList title="En duda" icon="❔" entries={report.doubtful} empty="Sin dudas conocidas." />
        <ScoutList title="Bajas probables" icon="🚫" entries={report.out} empty="Vendrían todos." />
      </div>
    </div>
  );
}
