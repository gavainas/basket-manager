import { useEffect, useReducer, useState } from 'react';
import { gameReducer } from './state/gameReducer';
import { clearSave, hasSave, loadGame, saveGame } from './persistence/storage';
import { Dashboard } from './ui/Dashboard';
import { RosterView } from './ui/RosterView';
import { FinancesView } from './ui/FinancesView';
import { LeagueView } from './ui/LeagueView';
import { CalendarView } from './ui/CalendarView';
import { RankingsView } from './ui/RankingsView';
import { WeekView } from './ui/WeekView';
import { EventModal } from './ui/EventModal';
import { OpenProfileContext } from './ui/PlayerLink';
import { PlayerProfile } from './ui/PlayerProfile';
import { OpenRivalContext } from './ui/RivalLink';
import { RivalProfile } from './ui/RivalProfile';
import { OpenWorldPlayerContext } from './ui/WorldPlayerLink';
import { WorldPlayerProfile } from './ui/WorldPlayerProfile';
import { OpenLeagueContext } from './ui/LeagueLink';
import { LeagueProfile } from './ui/LeagueProfile';
import { ClubLink, OpenClubContext } from './ui/ClubLink';
import { ClubProfile } from './ui/ClubProfile';
import { USER_CLUB_ID } from './game/world';
import { NavigateTabContext, type AppTab } from './ui/nav';
import type { AbsenceDifficulty } from './game/types';
import { SeasonEndScreen } from './ui/SeasonEndScreen';
import { HistoryView } from './ui/HistoryView';
import { PreseasonView } from './ui/PreseasonView';
import { PreseasonEndScreen } from './ui/PreseasonEndScreen';
import { formatMoney, weekLabel } from './ui/helpers';
import { AvatarGallery } from './ui/AvatarGallery';
import { Maqueta } from './ui/Maqueta';
import { ConfirmDialog, type ConfirmRequest } from './ui/ConfirmDialog';

type Tab = AppTab;

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'plantilla', label: 'Plantilla' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'liga', label: 'Liga' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'historia', label: 'Historia' },
  { id: 'semana', label: 'Semana' },
];

const DIFFICULTY_INFO: Record<AbsenceDifficulty, { label: string; desc: string }> = {
  facil: { label: '😌 Fácil', desc: 'Casi siempre están todos: la vida molesta poco.' },
  medio: { label: '😅 Medio', desc: 'La vida pasa: enfermos, viajes y algún lesionado.' },
  dificil: { label: '🔥 Difícil', desc: 'Cada semana falta gente: armar el equipo con los que vinieron es el juego.' },
};

function MainMenu({
  onNew,
  onNewPreseason,
  onContinue,
  ask,
}: {
  onNew: (difficulty: AbsenceDifficulty) => void;
  onNewPreseason: (difficulty: AbsenceDifficulty) => void;
  onContinue: () => void;
  ask: (req: ConfirmRequest) => void;
}) {
  const [, forceRender] = useState(0);
  const [difficulty, setDifficulty] = useState<AbsenceDifficulty>('medio');
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
      <div className="menu-difficulty">
        <div className="menu-diff-label">Faltas y lesiones (para partidas nuevas)</div>
        <div className="segmented">
          {(Object.keys(DIFFICULTY_INFO) as AbsenceDifficulty[]).map((d) => (
            <button key={d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_INFO[d].label}
            </button>
          ))}
        </div>
        <p className="menu-diff-desc">{DIFFICULTY_INFO[difficulty].desc}</p>
      </div>
      <div className="menu-buttons">
        {saved && (
          <button className="primary" onClick={onContinue}>
            ▶ Continuar partida
          </button>
        )}
        <button className={saved ? '' : 'primary'} onClick={() => onNewPreseason(difficulty)}>
          ✚ Nueva partida (armá el plantel en la pretemporada)
        </button>
        <button onClick={() => onNew(difficulty)}>⚡ Nueva partida directa (plantel ya armado)</button>
        {saved && (
          <button
            className="danger"
            onClick={() =>
              ask({
                title: 'Borrar la partida guardada',
                message: 'Se pierden el club, el plantel y toda su historia. Esto no se puede deshacer.',
                confirmLabel: 'Borrar todo',
                danger: true,
                icon: '🗑',
                onConfirm: () => {
                  clearSave();
                  forceRender((n) => n + 1);
                },
              })
            }
          >
            🗑 Borrar partida guardada
          </button>
        )}
      </div>
      <p className="menu-version">
        Versión {__COMMIT_HASH__} ·{' '}
        {new Date(__COMMIT_DATE__).toLocaleString('es-UY', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </p>
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null);

  // Pantalla de validación de retratos, solo desarrollo (ver design/AVATAR_SYSTEM.md).
  if (window.location.hash === '#retratos') return <AvatarGallery />;
  // Maqueta navegable de la dirección de arte en evaluación (ver design/ART_PIPELINE.md).
  if (window.location.hash === '#maqueta') return <Maqueta />;
  const [tab, setTab] = useState<Tab>('resumen');
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [rivalProfileId, setRivalProfileId] = useState<string | null>(null);
  const [worldPlayerId, setWorldPlayerId] = useState<string | null>(null);
  const [leagueProfileId, setLeagueProfileId] = useState<string | null>(null);
  const [clubProfileId, setClubProfileId] = useState<string | null>(null);

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
    const startNew = (type: 'NEW_GAME' | 'NEW_GAME_PRESEASON', difficulty: AbsenceDifficulty) => {
      if (hasSave()) {
        setConfirmReq({
          title: 'Hay una partida guardada',
          message: 'Si empezás de nuevo, la partida guardada se sobrescribe y se pierde.',
          confirmLabel: 'Empezar de nuevo',
          danger: true,
          icon: '⚠️',
          onConfirm: () => dispatch({ type, difficulty }),
        });
        return;
      }
      dispatch({ type, difficulty });
    };
    return (
      <>
        <MainMenu
          ask={setConfirmReq}
          onNew={(difficulty) => startNew('NEW_GAME', difficulty)}
          onNewPreseason={(difficulty) => startNew('NEW_GAME_PRESEASON', difficulty)}
          onContinue={() => {
            const saved = loadGame();
            if (saved) dispatch({ type: 'LOAD', state: saved });
          }}
        />
        <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
      </>
    );
  }

  // Todas las pantallas comparten los providers de fichas: cualquier nombre
  // (jugador, rival, liga) es clickeable también en pretemporada y cierres.
  const withProviders = (screen: React.ReactNode) => (
    <OpenProfileContext.Provider value={setProfileId}>
    <OpenRivalContext.Provider value={setRivalProfileId}>
    <OpenWorldPlayerContext.Provider value={setWorldPlayerId}>
    <OpenLeagueContext.Provider value={setLeagueProfileId}>
    <OpenClubContext.Provider value={setClubProfileId}>
    <NavigateTabContext.Provider value={setTab}>
      {screen}
      {profileId && <PlayerProfile state={state} playerId={profileId} onClose={() => setProfileId(null)} />}
      {rivalProfileId && (
        <RivalProfile state={state} rivalId={rivalProfileId} onClose={() => setRivalProfileId(null)} />
      )}
      {worldPlayerId && (
        <WorldPlayerProfile state={state} playerId={worldPlayerId} onClose={() => setWorldPlayerId(null)} />
      )}
      {leagueProfileId && (
        <LeagueProfile state={state} leagueId={leagueProfileId} onClose={() => setLeagueProfileId(null)} />
      )}
      {clubProfileId && (
        <ClubProfile state={state} clubId={clubProfileId} onClose={() => setClubProfileId(null)} />
      )}
    </NavigateTabContext.Provider>
    </OpenClubContext.Provider>
    </OpenLeagueContext.Provider>
    </OpenWorldPlayerContext.Provider>
    </OpenRivalContext.Provider>
    </OpenProfileContext.Provider>
  );

  if (state.phase === 'preseason') {
    return withProviders(<PreseasonView state={state} dispatch={dispatch} />);
  }

  if (state.phase === 'preseasonEnd') {
    return withProviders(<PreseasonEndScreen state={state} dispatch={dispatch} />);
  }

  if (state.phase === 'seasonEnd' || state.phase === 'gameOver') {
    return withProviders(<SeasonEndScreen state={state} dispatch={dispatch} />);
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

  return withProviders(
    <div className="app-shell">
      <div className="topbar">
        <span className="club-name">
          🏀 <ClubLink id={USER_CLUB_ID}>{state.club.name}</ClubLink>
        </span>
        <div className="meta">
          <span>
            T{state.seasonNumber} ·{' '}
            <strong>
              {state.week <= state.seasonLength
                ? `Semana ${Math.min(state.week, state.seasonLength)}/${state.seasonLength}`
                : weekLabel(state.week, state.seasonLength)}
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
          onClick={() =>
            setConfirmReq(
              saveFailed
                ? {
                    title: 'El guardado está fallando',
                    message:
                      'El guardado automático no está funcionando (storage bloqueado o lleno). Si salís al menú, esta partida se pierde.',
                    confirmLabel: 'Salir igual',
                    danger: true,
                    icon: '⚠️',
                    onConfirm: () => dispatch({ type: 'QUIT_TO_MENU' }),
                  }
                : {
                    title: 'Volver al menú',
                    message: 'La partida queda guardada automáticamente: retomás cuando quieras.',
                    confirmLabel: 'Volver al menú',
                    icon: '🚪',
                    onConfirm: () => dispatch({ type: 'QUIT_TO_MENU' }),
                  }
            )
          }
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
      {tab === 'plantilla' && <RosterView state={state} dispatch={dispatch} />}
      {tab === 'finanzas' && <FinancesView state={state} />}
      {tab === 'liga' && <LeagueView state={state} dispatch={dispatch} />}
      {tab === 'agenda' && <CalendarView state={state} />}
      {tab === 'rankings' && <RankingsView state={state} />}
      {tab === 'historia' && <HistoryView state={state} />}
      {tab === 'semana' && <WeekView state={state} dispatch={dispatch} />}

      <EventModal state={state} dispatch={dispatch} />
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}
