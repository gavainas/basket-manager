import { useState } from 'react';
import type { GameState } from '../game/types';
import { Icon } from './Icon';
import { buildScoutView, type ScoutViewEntry } from '../game/scouting';
import { WorldPlayerLink } from './WorldPlayerLink';

function ScoutList({ title, icon, entries, empty }: { title: string; icon: string; entries: ScoutViewEntry[]; empty: string }) {
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

/**
 * Informe del próximo rival: lo que se sabe depende de cuánto lo conocés.
 *
 * Arranca plegado (sep 2026). Es información que se lee ANTES de armar, no
 * mientras arrastrás: abierto se comía trescientos píxeles de la columna del
 * plantel y obligaba a scrollear la lista para ver a quién ponías.
 */
export function ScoutingCard({ state }: { state: GameState }) {
  const [abierto, setAbierto] = useState(false);
  const view = buildScoutView(state);
  if (!view) return null;
  return (
    <div className={`card${abierto ? '' : ' plegada'}`} style={{ marginBottom: '1rem' }}>
      <h3>
        Scouting · {view.rivalName}{' '}
        <span className={`chip ${view.knowledge >= 3 ? 'good' : view.knowledge === 2 ? 'warn' : ''}`}>
          {view.knowledgeLabel}
        </span>
        {view.debug && <span className="chip bad"> DEBUG: scouting completo</span>}
        <button className="small band-btn" onClick={() => setAbierto((v) => !v)}>
          <Icon name={abierto ? 'cruz' : 'lupa'} size={13} /> {abierto ? 'Ocultar' : 'Ver el informe'}
        </button>
      </h3>
      {abierto && (
        <>
          <ul className="reason-list" style={{ marginBottom: view.knowledge >= 2 ? '0.6rem' : 0 }}>
            {view.teamLines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          {view.knowledge >= 2 && (
            <div className="grid cols-3">
              <ScoutList title="Probables" icon="✓" entries={view.probable} empty="Nadie confirmado. Raro." />
              <ScoutList title="En duda" icon="?" entries={view.doubtful} empty="Sin rumores esta semana." />
              <ScoutList title="Bajas probables" icon="✕" entries={view.out} empty="Vendrían todos." />
            </div>
          )}
          <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.78rem' }}>
            Nada de esto es seguro: en esta liga te enterás quién vino cuando entran a la cancha.
          </p>
        </>
      )}
    </div>
  );
}
