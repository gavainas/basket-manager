import { useEffect, useReducer, useState } from 'react';
import { gameReducer } from './state/gameReducer';
import { clearSave, hasSave, loadGame, saveGame } from './persistence/storage';
import { Dashboard } from './ui/Dashboard';
import { RosterView } from './ui/RosterView';
import { FinancesView } from './ui/FinancesView';
import { LeagueView } from './ui/LeagueView';
import { WeekView } from './ui/WeekView';
import { EventModal } from './ui/EventModal';
import { SeasonEndScreen } from './ui/SeasonEndScreen';
import { formatMoney } from './ui/helpers';

type Tab = 'resumen' | 'plantilla' | 'finanzas' | 'liga' | 'semana';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'plantilla', label: 'Plantilla' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'liga', label: 'Liga' },
  { id: 'semana', label: 'Semana' },
];

function MainMenu({ onNew, onContinue }: { onNew: () => void; onContinue: () => void }) {
  const [, forceRender] = useState(0);
  const saved = hasSave();

  return (
    <div className="menu-screen">
      <div className="logo">🏀</div>
      <h1>
        Básquet <span>Manager</span> Amateur
      </h1>
      <p>
        Manejás un club amateur de básquet. No alcanza con ganar: necesitás jugadores motivados, cuotas pagas, buen
        ambiente y una caja que no llegue a cero. Sobreviví la temporada… y si se puede, salí campeón.
      </p>
      <div className="menu-buttons">
        {saved && (
          <button className="primary" onClick={onContinue}>
            ▶ Continuar partida
          </button>
        )}
        <button className={saved ? '' : 'primary'} onClick={onNew}>
          ✚ Nueva partida
        </button>
        {saved && (
          <button
            className="danger"
            onClick={() => {
              if (window.confirm('¿Borrar la partida guardada? Esto no se puede deshacer.')) {
                clearSave();
                forceRender((n) => n + 1);
              }
            }}
          >
            🗑 Borrar partida guardada
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null);
  const [tab, setTab] = useState<Tab>('resumen');

  // Guardado automático.
  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  // Al cambiar de fase, llevar al usuario a la pantalla correcta.
  const phase = state?.phase;
  useEffect(() => {
    if (phase === 'lineup' || phase === 'matchResult') setTab('semana');
    if (phase === 'planning') setTab('resumen');
  }, [phase]);

  if (!state) {
    return (
      <MainMenu
        onNew={() => {
          if (hasSave() && !window.confirm('Hay una partida guardada. ¿Empezar de nuevo y sobrescribirla?')) return;
          dispatch({ type: 'NEW_GAME' });
        }}
        onContinue={() => {
          const saved = loadGame();
          if (saved) dispatch({ type: 'LOAD', state: saved });
        }}
      />
    );
  }

  if (state.phase === 'seasonEnd' || state.phase === 'gameOver') {
    return <SeasonEndScreen state={state} dispatch={dispatch} />;
  }

  const row = state.standings.find((r) => r.teamId === 'club')!;
  const phaseHint =
    state.phase === 'planning'
      ? 'Elegí las decisiones de la semana'
      : state.phase === 'lineup'
        ? 'Armá el quinteto titular'
        : 'Mirá el resultado del partido';

  return (
    <div className="app-shell">
      <div className="topbar">
        <span className="club-name">🏀 {state.club.name}</span>
        <div className="meta">
          <span>
            Semana <strong>{Math.min(state.week, state.seasonLength)}/{state.seasonLength}</strong>
          </span>
          <span>
            Caja <strong>{formatMoney(state.club.money)}</strong>
          </span>
          <span>
            Récord{' '}
            <strong>
              {row.wins}-{row.losses}
            </strong>
          </span>
        </div>
        <div className="spacer" />
        <span className="chip accent">{phaseHint}</span>
        <button onClick={() => dispatch({ type: 'QUIT_TO_MENU' })}>Menú</button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${tab === t.id ? 'active' : ''} ${t.id === 'semana' && tab !== 'semana' ? 'attention' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'semana' ? ' ▶' : ''}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <Dashboard state={state} />}
      {tab === 'plantilla' && <RosterView state={state} />}
      {tab === 'finanzas' && <FinancesView state={state} />}
      {tab === 'liga' && <LeagueView state={state} />}
      {tab === 'semana' && <WeekView state={state} dispatch={dispatch} />}

      <EventModal state={state} dispatch={dispatch} />
    </div>
  );
}
