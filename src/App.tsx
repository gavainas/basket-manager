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
import { ConfirmDialog, type ConfirmRequest } from './ui/ConfirmDialog';
import { Icon, type IconName } from './ui/Icon';
import { Crest } from './ui/Crest';
import { CrestGallery } from './ui/CrestGallery';

type Tab = AppTab;

/* Cada sección lleva su color (ver design/SISTEMA_VISUAL.md): sirve para saber
   dónde estás sin leer. Liga, Agenda y Rankings comparten el azul de Partidos
   porque son la misma área — el color responde "¿qué parte del juego es esta?",
   no "¿qué pestaña toqué?".
   `sec` nombra la clase de área: la usa la pestaña para su punto y su filete, y
   la vista para las bandas de sus cards. Un solo lugar donde se decide.
   `semana` no está acá: es la acción, y vive en la barra de recursos. */
const TABS: { id: Tab; label: string; sec: string; icon: IconName }[] = [
  { id: 'resumen', label: 'Resumen', sec: 'sec-tablero', icon: 'tablero' },
  { id: 'plantilla', label: 'Plantilla', sec: 'sec-plantel', icon: 'plantel' },
  { id: 'finanzas', label: 'Finanzas', sec: 'sec-finanzas', icon: 'finanzas' },
  { id: 'liga', label: 'Liga', sec: 'sec-partidos', icon: 'liga' },
  { id: 'agenda', label: 'Agenda', sec: 'sec-partidos', icon: 'agenda' },
  { id: 'rankings', label: 'Rankings', sec: 'sec-partidos', icon: 'rankings' },
  { id: 'historia', label: 'Historia', sec: 'sec-tablero', icon: 'historia' },
];

/**
 * Portada del menú principal: `public/portada.webp`, versionada en el repo.
 *
 * Se arma con `BASE_URL` y no con un path absoluto porque el proyecto usa base
 * relativa (`'./'` en vite.config.ts): `/portada.webp` apuntaría a la raíz del
 * dominio en vez de `/basket-manager/`.
 *
 * Si el archivo faltara, el panel queda en grafito y el menú sigue usable.
 * Es arte provisional: se reemplaza pisando el archivo (ver public/LEEME.md).
 */
const PORTADA = `${import.meta.env.BASE_URL}portada.webp`;

const DIFFICULTY_INFO: Record<AbsenceDifficulty, { label: string; desc: string }> = {
  facil: { label: 'Fácil', desc: 'Casi siempre están todos: la vida molesta poco.' },
  medio: { label: 'Medio', desc: 'La vida pasa: enfermos, viajes y algún lesionado.' },
  dificil: { label: 'Difícil', desc: 'Cada semana falta gente: armar el equipo con los que vinieron es el juego.' },
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
      {/* Arte provisional (ver design/ART_PIPELINE.md y la constante PORTADA).
          Si la imagen no carga, el panel queda en grafito y el menú sigue usable. */}
      <div
        className="menu-portada"
        style={{ backgroundImage: `url(${PORTADA})` }}
        role="img"
        aria-label="Asado en la cantina del club"
      />

      <div className="menu-panel">
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
              Continuar partida
            </button>
          )}
          <button className={saved ? '' : 'primary'} onClick={() => onNewPreseason(difficulty)}>
            Nueva partida · armá el plantel en la pretemporada
          </button>
          <button onClick={() => onNew(difficulty)}>Nueva partida directa · plantel ya armado</button>
          {saved && (
            <button
              className="danger"
              onClick={() =>
                ask({
                  title: 'Borrar la partida guardada',
                  message: 'Se pierden el club, el plantel y toda su historia. Esto no se puede deshacer.',
                  confirmLabel: 'Borrar todo',
                  danger: true,
                  onConfirm: () => {
                    clearSave();
                    forceRender((n) => n + 1);
                  },
                })
              }
            >
              Borrar partida guardada
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
    </div>
  );
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, null);

  // Pantallas de validación, solo desarrollo (ver design/AVATAR_SYSTEM.md y
  // design/SISTEMA_VISUAL.md).
  if (window.location.hash === '#retratos') return <AvatarGallery />;
  if (window.location.hash === '#escudos') return <CrestGallery />;
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

  const userClub = state.world.clubs.find((c) => c.id === USER_CLUB_ID);
  const alDia = state.players.filter((p) => p.weeksUnpaid === 0).length;
  const semanaLabel =
    state.week <= state.seasonLength
      ? `${Math.min(state.week, state.seasonLength)}`
      : weekLabel(state.week, state.seasonLength);

  return withProviders(
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="marca">
            {userClub && (
              <Crest
                seed={userClub.id}
                name={userClub.name}
                colors={userClub.colors}
                founded={userClub.founded}
                size={38}
              />
            )}
            <div>
              <div className="club-name">
                <ClubLink id={USER_CLUB_ID}>{state.club.name}</ClubLink>
              </div>
              <div className="temporada">
                Temporada {state.seasonNumber}
                {userClub ? ` · fundado en ${userClub.founded}` : ''}
              </div>
            </div>
          </div>

          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${t.sec} ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={19} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="spacer" />
          {saveFailed && <span className="chip bad">⚠ No se pudo guardar</span>}
          <button
            className="salir"
            title="Volver al menú"
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
            <Icon name="salir" size={17} />
            Salir
          </button>
        </div>
      </header>

      {/* La clase de área envuelve a la vista: de ahí toman su color las bandas
          de todas sus cards, sin tocar los archivos de las vistas. */}
      <div className="app-shell">
        {tab === 'resumen' && (
          <div className="vista sec-tablero">
            <Dashboard state={state} />
          </div>
        )}
        {tab === 'plantilla' && (
          <div className="vista sec-plantel">
            <RosterView state={state} dispatch={dispatch} />
          </div>
        )}
        {tab === 'finanzas' && (
          <div className="vista sec-finanzas">
            <FinancesView state={state} />
          </div>
        )}
        {tab === 'liga' && (
          <div className="vista sec-partidos">
            <LeagueView state={state} dispatch={dispatch} />
          </div>
        )}
        {tab === 'agenda' && (
          <div className="vista sec-partidos">
            <CalendarView state={state} />
          </div>
        )}
        {tab === 'rankings' && (
          <div className="vista sec-partidos">
            <RankingsView state={state} />
          </div>
        )}
        {tab === 'historia' && (
          <div className="vista sec-tablero">
            <HistoryView state={state} />
          </div>
        )}
        {tab === 'semana' && (
          <div className="vista sec-partidos">
            <WeekView state={state} dispatch={dispatch} />
          </div>
        )}
      </div>

      {/* Los números que mirás siempre, siempre en el mismo lugar. */}
      <footer className="recursos">
        <div className="recursos-inner">
          <div className="recurso">
            <span className="k">
              <Icon name="agenda" size={14} /> Semana
            </span>
            <div className="v">{semanaLabel}</div>
            <div className="s">de {state.seasonLength}</div>
          </div>
          <div className="recurso">
            <span className="k">
              <Icon name="caja" size={14} /> Caja del club
            </span>
            <div className={`v ${state.club.money < 0 ? 'bad' : ''}`}>{formatMoney(state.club.money)}</div>
            <div className="s">disponible</div>
          </div>
          <div className="recurso">
            <span className="k">
              <Icon name="plantel" size={14} /> Cuotas al día
            </span>
            <div className={`v ${alDia < state.players.length ? 'warn' : 'good'}`}>
              {alDia} / {state.players.length}
            </div>
            <div className="s">jugadores</div>
          </div>
          <div className="recurso">
            <span className="k">
              <Icon name="liga" size={14} /> Récord
            </span>
            <div className="v">
              {row.wins}-{row.losses}
            </div>
            <div className="s">en la liga</div>
          </div>
          <div className="recurso accion">
            <span className="s">{phaseHint}</span>
            {/* Ya estando en la semana, el botón primario es el de la vista: dos
                naranjas compitiendo rompen la regla de uno por pantalla. */}
            <button
              className={`avanzar ${tab === 'semana' ? '' : 'primary'}`}
              onClick={() => setTab('semana')}
            >
              » Avanzar semana
            </button>
          </div>
        </div>
      </footer>

      <EventModal state={state} dispatch={dispatch} />
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
    </>
  );
}
