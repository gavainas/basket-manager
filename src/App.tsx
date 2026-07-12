import { useEffect, useReducer, useState } from 'react';
import { gameReducer } from './state/gameReducer';
import { clearSave, hasSave, loadGame, saveGame } from './persistence/storage';
import { Dashboard } from './ui/Dashboard';
import { RosterView } from './ui/RosterView';
import { FinancesView } from './ui/FinancesView';
import { LeagueView } from './ui/LeagueView';
import { RankingsView } from './ui/RankingsView';
import { WeekView } from './ui/WeekView';
import { EventModal } from './ui/EventModal';
import { OpenProfileContext } from './ui/PlayerLink';
import { PlayerProfile } from './ui/PlayerProfile';
import { OpenRivalContext } from './ui/RivalLink';
import { RivalProfile } from './ui/RivalProfile';
import { NavigateTabContext, type AppTab } from './ui/nav';
import { SeasonEndScreen } from './ui/SeasonEndScreen';
import { HistoryView } from './ui/HistoryView';
import { PreseasonView } from './ui/PreseasonView';
import { PreseasonEndScreen } from './ui/PreseasonEndScreen';
import { formatMoney } from './ui/helpers';

type Tab = AppTab;

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'plantilla', label: 'Plantilla' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'liga', label: 'Liga' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'historia', label: 'Historia' },
  { id: 'semana', label: 'Semana' },
];

function MainMenu({
  onNew,
  onNewPreseason,
  onContinue,
}: {
  onNew: () => void;
  onNewPreseason: () => void;
  onContinue: () => void;
}) {
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
        <button className={saved ? '' : 'primary'} onClick={onNewPreseason}>
          ✚ Nueva partida (armá el plantel en la pretemporada)
        </button>
        <button onClick={onNew}>⚡ Nueva partida directa (plantel ya armado)</button>
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
  const [saveFailed, setSaveFailed] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [rivalProfileId, setRivalProfileId] = useState<string | null>(null);

  // Guardado automático.
  useEffect(() => {
    if (state) setSaveFailed(!saveGame(state));
  }, [state]);

  // Al cambiar de fase, llevar al usuario a la pantalla correcta.
  const phase = state?.phase;
  useEffect(() => {
    if (phase === 'callUp' || phase === 'lineup' || phase === 'match' || phase === 'matchResult') setTab('semana');
    if (phase === 'planning') setTab('resumen');
    // Cada cambio de fase arranca desde arriba de la página.
    window.scrollTo({ top: 0 });
  }, [phase]);

  if (!state) {
    return (
      <MainMenu
        onNew={() => {
          if (hasSave() && !window.confirm('Hay una partida guardada. ¿Empezar de nuevo y sobrescribirla?')) return;
          dispatch({ type: 'NEW_GAME' });
        }}
        onNewPreseason={() => {
          if (hasSave() && !window.confirm('Hay una partida guardada. ¿Empezar de nuevo y sobrescribirla?')) return;
          dispatch({ type: 'NEW_GAME_PRESEASON' });
        }}
        onContinue={() => {
          const saved = loadGame();
          if (saved) dispatch({ type: 'LOAD', state: saved });
        }}
      />
    );
  }

  if (state.phase === 'preseason') {
    return <PreseasonView state={state} dispatch={dispatch} />;
  }

  if (state.phase === 'preseasonEnd') {
    return <PreseasonEndScreen state={state} dispatch={dispatch} />;
  }

  if (state.phase === 'seasonEnd' || state.phase === 'gameOver') {
    return <SeasonEndScreen state={state} dispatch={dispatch} />;
  }

  const row = state.standings.find((r) => r.teamId === 'club')!;
  const phaseHint =
    state.phase === 'planning'
      ? 'Elegí las decisiones de la semana'
      : state.phase === 'callUp'
        ? 'Mirá quién confirmó para el partido'
        : state.phase === 'lineup'
          ? 'Armá el quinteto titular'
          : state.phase === 'match'
            ? 'Dirigí el partido cuarto a cuarto'
            : 'Mirá el resultado del partido';

  return (
    <OpenProfileContext.Provider value={setProfileId}>
    <OpenRivalContext.Provider value={setRivalProfileId}>
    <NavigateTabContext.Provider value={setTab}>
    <div className="app-shell">
      <div className="topbar">
        <span className="club-name">🏀 {state.club.name}</span>
        <div className="meta">
          <span>
            T{state.seasonNumber} · Semana{' '}
            <strong>
              {Math.min(state.week, state.seasonLength)}/{state.seasonLength}
            </strong>
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
        {saveFailed && <span className="chip bad">⚠ No se pudo guardar</span>}
        <span className="chip accent">{phaseHint}</span>
        <button
          onClick={() => {
            const msg = saveFailed
              ? 'ATENCIÓN: el guardado automático está fallando (storage bloqueado o lleno). Si salís al menú, esta partida se pierde. ¿Salir igual?'
              : '¿Volver al menú? La partida queda guardada automáticamente.';
            if (window.confirm(msg)) dispatch({ type: 'QUIT_TO_MENU' });
          }}
        >
          Menú
        </button>
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
      {tab === 'rankings' && <RankingsView state={state} />}
      {tab === 'historia' && <HistoryView state={state} />}
      {tab === 'semana' && <WeekView state={state} dispatch={dispatch} />}

      <EventModal state={state} dispatch={dispatch} />
      {profileId && <PlayerProfile state={state} playerId={profileId} onClose={() => setProfileId(null)} />}
      {rivalProfileId && (
        <RivalProfile state={state} rivalId={rivalProfileId} onClose={() => setRivalProfileId(null)} />
      )}
    </div>
    </NavigateTabContext.Provider>
    </OpenRivalContext.Provider>
    </OpenProfileContext.Provider>
  );
}
