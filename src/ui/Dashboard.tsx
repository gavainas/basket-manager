import { useContext } from 'react';
import type { GameState } from '../game/types';
import { BALANCE } from '../game/balance';
import { refereeOfWeek, rivalryWith } from '../game/leagueLife';
import { activePlayers, clubPosition } from '../game/match';
import { EMOTION_EXPRESSION, playerNotes, type NoteKind } from '../game/humanState';
import { aggrieved, grievanceWarning } from '../game/mood';
import { objectiveStatus, type ObjectiveStatus } from '../game/objectives';
import { promiseHealth, type PromiseHealth } from '../game/promises';
import { clubByLegacyId } from '../game/world';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { HumanNoteRow, NOTE_ICON } from './HumanNoteRow';
import { StyleChip } from './StyleChip';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext, type AppTab } from './nav';
import { TIPS } from './Tip';
import { avgMotivation, rivalDifficulty } from './helpers';

const OBJECTIVE_BADGE: Record<ObjectiveStatus, { icon: string; cls: string; label: string }> = {
  cumplido: { icon: '✔', cls: 'good', label: 'cumplido' },
  en_curso: { icon: '●', cls: 'good', label: 'en curso' },
  en_riesgo: { icon: '▲', cls: 'warn', label: 'en riesgo' },
  fallado: { icon: '✘', cls: 'bad', label: 'fallado' },
};

const PROMISE_BADGE: Record<PromiseHealth, { cls: string; label: string }> = {
  en_pie: { cls: 'good', label: 'en pie' },
  en_riesgo: { cls: 'warn', label: 'en riesgo' },
  rota: { cls: 'bad', label: 'rota' },
  cumplida: { cls: 'accent', label: 'cumplida' },
};

interface WatchItem {
  /* Misma clasificación que las notas humanas: el ícono dice de qué habla y
     `cls` si es bueno o malo. Ver NoteKind en game/humanState.ts. */
  kind: NoteKind;
  cls: 'bad' | 'warn' | 'good';
  text: string;
  tab: AppTab;
}

/** Lo urgente de la semana, priorizado: lo que un manager miraría primero. */
function watchItems(state: GameState): WatchItem[] {
  const items: WatchItem[] = [];
  const active = activePlayers(state.players);

  for (const p of active.filter((x) => x.status === 'al_borde')) {
    items.push({
      kind: 'alerta',
      cls: 'bad',
      text: `${p.name} está al borde de dejar el club: una charla o minutos pueden salvarlo.`,
      tab: 'plantilla',
    });
  }
  const fixedCosts = 245 + (state.coach?.weeklyWage ?? 0);
  if (state.club.money < fixedCosts) {
    items.push({
      kind: 'plata',
      cls: 'bad',
      text: `La caja no cubre la semana: $${state.club.money} contra ~$${fixedCosts} de gastos fijos. Rifa, sponsor o cuotas, ya.`,
      tab: 'finanzas',
    });
  }
  // Las quejas vivas primero, con nombre y motivo: es la misma lista que ve la
  // acción de hablar, así lo que dice el informe del sábado sigue estando acá.
  const week = Math.min(state.week, state.seasonLength);
  const hot = aggrieved(state, 2).filter((p) => p.status !== 'al_borde');
  for (const p of hot.slice(0, 2)) {
    items.push({
      kind: 'animo',
      cls: p.grievance!.level >= 3 ? 'bad' : 'warn',
      text: grievanceWarning(p, week),
      tab: 'plantilla',
    });
  }
  const upset = active.filter((x) => x.status === 'molesto' && !hot.includes(x));
  if (upset.length > 0) {
    items.push({
      kind: 'animo',
      cls: 'warn',
      text:
        upset.length === 1
          ? `${upset[0].name} está molesto con cómo vienen las cosas.`
          : `${upset.length} jugadores están molestos: el vestuario pide atención.`,
      tab: 'plantilla',
    });
  }
  const returning = active.filter((x) => x.status === 'lesionado' && x.injuryWeeks === 1);
  const injured = active.filter((x) => x.status === 'lesionado');
  if (returning.length > 0) {
    items.push({
      kind: 'fisico',
      cls: 'good',
      text: `${returning.map((p) => p.name).join(' y ')} ${returning.length > 1 ? 'reciben' : 'recibe'} el alta la próxima semana.`,
      tab: 'plantilla',
    });
  } else if (injured.length > 0) {
    items.push({
      kind: 'fisico',
      cls: 'warn',
      text: `${injured.length === 1 ? `${injured[0].name} sigue` : `${injured.length} jugadores siguen`} en la enfermería.`,
      tab: 'plantilla',
    });
  }
  const suspended = active.filter((x) => (x.suspendedWeeks ?? 0) > 0);
  for (const p of suspended) {
    items.push({
      kind: 'alerta',
      cls: 'bad',
      text: `${p.name} está suspendido: esta fecha la mira desde la tribuna.`,
      tab: 'plantilla',
    });
  }
  const hotheads = active.filter((x) => (x.seasonTechs ?? 0) === 2 && (x.suspendedWeeks ?? 0) === 0);
  const weekRef = refereeOfWeek(state);
  for (const p of hotheads) {
    const strictRef = weekRef.style === 'estricto' || weekRef.style === 'protagonista';
    items.push({
      kind: 'alerta',
      cls: strictRef ? 'bad' : 'warn',
      text: strictRef
        ? `${p.name} acumula 2 técnicas y esta fecha dirige ${weekRef.name} (${weekRef.blurb}). Una protesta y se va.`
        : `${p.name} acumula 2 técnicas en el año: una más y se pierde una fecha.`,
      tab: 'plantilla',
    });
  }
  const exhausted = active.filter((x) => x.status !== 'lesionado' && x.physical <= BALANCE.callUp.exhaustedThreshold);
  if (exhausted.length > 0) {
    items.push({
      kind: 'fisico',
      cls: 'warn',
      text:
        exhausted.length === 1
          ? `${exhausted[0].name} viene fundido: al pasar lista vas a tener que decidir si lo cuidás.`
          : `${exhausted.length} jugadores vienen fundidos: al pasar lista habrá que decidir quién descansa.`,
      tab: 'semana',
    });
  }
  const debtors = active.filter((x) => x.feeStatus === 'pendiente' && x.weeksUnpaid >= 2);
  if (debtors.length > 0) {
    items.push({
      kind: 'plata',
      cls: 'warn',
      text: `${debtors.length === 1 ? `${debtors[0].name} debe` : `${debtors.length} jugadores deben`} la cuota hace ${debtors.length === 1 ? `${debtors[0].weeksUnpaid} semanas` : 'rato'}: pasar la gorra cuesta caro después.`,
      tab: 'finanzas',
    });
  }
  if (state.secondTeam && !state.secondTeam.finished) {
    const fit = state.players.filter(
      (p) => state.secondTeam!.playerIds.includes(p.id) && !p.leftClub && p.status !== 'lesionado'
    ).length;
    if (fit < 6) {
      items.push({
        kind: 'cancha',
        cls: 'warn',
        text: `El segundo equipo llega justo: ${fit} fichas en condiciones para su fecha.`,
        tab: 'liga',
      });
    }
  }

  const order = { bad: 0, warn: 1, good: 2 } as const;
  return items.sort((a, b) => order[a.cls] - order[b.cls]).slice(0, 4);
}

/**
 * Tabla de posiciones compacta para el tablero. La completa vive en Liga; acá van
 * cuatro columnas y el escudo, que es lo que se lee de un vistazo.
 */
function Posiciones({
  state,
  position,
  navigate,
}: {
  state: GameState;
  position: number;
  navigate: (t: AppTab) => void;
}) {
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
  const nameOf = (id: string) =>
    id === 'club' ? state.club.name : (state.rivals.find((r) => r.id === id)?.name ?? id);

  return (
    <div className="card sec-partidos">
      <h3>
        <Icon name="liga" size={17} /> Posiciones · vas {position}° de {sorted.length}
      </h3>
      <div className="table-wrap">
        <table className="tabla-compacta">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Equipo</th>
              <th className="num">G</th>
              <th className="num">P</th>
              <th className="num">Dif</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const club = clubByLegacyId(state.world, r.teamId);
              return (
                <tr key={r.teamId} className={r.teamId === 'club' ? 'highlight' : ''}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <span className="con-escudo">
                      {club && (
                        <Crest
                          seed={club.id}
                          name={club.name}
                          colors={club.colors}
                          founded={club.founded}
                          size={16}
                        />
                      )}
                      {nameOf(r.teamId)}
                    </span>
                  </td>
                  <td className="num">{r.wins}</td>
                  <td className="num">{r.losses}</td>
                  <td className="num">{r.pointsFor - r.pointsAgainst}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="small" style={{ marginTop: '0.6rem' }} onClick={() => navigate('liga')}>
        Ver la liga completa →
      </button>
    </div>
  );
}

export function Dashboard({ state }: { state: GameState }) {
  const navigate = useContext(NavigateTabContext);
  const watch = watchItems(state);
  const position = clubPosition(state);
  const active = activePlayers(state.players);
  const morale = avgMotivation(state.players);
  // Tras el partido (matchResult) la semana aún no avanzó: el "próximo" es el que sigue.
  const upcomingWeek = state.phase === 'matchResult' ? state.week + 1 : state.week;
  const nextRivalId = upcomingWeek <= state.seasonLength ? state.schedule[upcomingWeek - 1] : null;
  const nextRival = nextRivalId ? state.rivals.find((r) => r.id === nextRivalId)! : null;
  const rivalClub = nextRivalId ? clubByLegacyId(state.world, nextRivalId) : undefined;

  // El grupo del club: lo que se dijo después del último partido, como chat.
  // Priorizamos a los que tienen algo para decir (ni conformes ni indiferentes).
  const moods = state.lastMatch?.moods ?? [];
  const opinionated = moods.filter((m) => m.emotion !== 'conforme' && m.emotion !== 'indiferente');
  const groupChat = (opinionated.length >= 3 ? opinionated : moods).slice(0, 5);

  // La figura del plantel: el mejor valorado de los que están. Es quien ocupa la
  // columna del héroe, y cuando existan las ilustraciones por arquetipo su
  // retrato se reemplaza por la del suyo (ver design/SISTEMA_VISUAL.md).
  const figura = [...active].sort((a, b) => b.visibleRating - a.visibleRating)[0];
  const figuraNota = figura ? playerNotes(state, figura)[0] : undefined;

  return (
    <div className="tablero">
      <div className="tablero-top">
        {figura && (
          <aside className="card figura-card">
            <div className="figura-retrato">
              <Avatar seed={figura.id} age={figura.age} appearance={figura.appearance} title={figura.name} size={168} />
            </div>
            <div className="figura-nombre">
              <PlayerLink id={figura.id}>{figura.name}</PlayerLink>
            </div>
            <div className="figura-meta">
              {figura.position} · {figura.age} años · ≈{figura.visibleRating}
            </div>
            {figuraNota && <HumanNoteRow note={figuraNota} />}
          </aside>
        )}

        <div className="tablero-col">
      <div className="card watch-card">
        <h3>
          <Icon name="destacado" size={17} /> Qué mirar hoy
        </h3>
        {watch.length === 0 ? (
          <p style={{ margin: 0 }}>
            <strong>Semana tranquila.</strong> Sin urgencias en el club: a pensar en el partido.
          </p>
        ) : (
          <ul className="news-list">
            {watch.map((w, i) => (
              <li
                key={i}
                className="watch-row"
                onClick={() => navigate(w.tab)}
                title="Ir a la pantalla"
              >
                <span className="hn-icon" style={{ minWidth: 18 }}>
                  <Icon name={NOTE_ICON[w.kind]} size={14} />
                </span>
                <span style={{ flex: 1 }}>{w.text}</span>
                <span className={`chip ${w.cls}`}>ver →</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Las posiciones son el dato que un manager mira primero, y hasta ahora
          vivían solo en Liga. Los cuatro tiles que estaban acá (Semana, Récord,
          Dinero) se fueron: repetían la barra de recursos, que está siempre
          visible. La posición ya se lee en la tabla. */}
      <Posiciones state={state} position={position} navigate={navigate} />

      {nextRival && (
        /* El rival es del área de Partidos: el panel es una ventana ahí. */
        <div className="card sec-partidos">
          <h3>Próximo rival</h3>
          <div className="con-escudo" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
            {rivalClub && (
              <Crest
                seed={rivalClub.id}
                name={rivalClub.name}
                colors={rivalClub.colors}
                founded={rivalClub.founded}
                size={34}
              />
            )}
            <RivalLink id={nextRival.id}>{nextRival.name}</RivalLink>
          </div>
          <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            <span className={`chip ${rivalDifficulty(nextRival).cls}`}>{rivalDifficulty(nextRival).label}</span>
            <StyleChip style={nextRival.style} />
            {rivalryWith(state, nextRival.id) && <span className="chip bad">Revancha</span>}
          </div>
          {rivalryWith(state, nextRival.id) && (
            <p style={{ margin: '0.4rem 0 0' }}>{rivalryWith(state, nextRival.id)!.text}</p>
          )}
          <p className="muted" style={{ margin: '0.4rem 0 0' }}>
            Dirige {refereeOfWeek(state).name}: {refereeOfWeek(state).blurb}.
          </p>
        </div>
      )}
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: '1rem' }}>
        <div className="card">
          <h3>Estado del club</h3>
          <Bar label="Moral general" value={morale} hint={TIPS.moralGeneral} />
          <Bar label="Ambiente social" value={state.club.socialClimate} hint={TIPS.ambienteSocial} />
          <Bar label="Organización" value={state.club.organization} hint={TIPS.organizacion} />
          <Bar label="Prestigio deportivo" value={state.club.sportPrestige} hint={TIPS.prestigioDeportivo} />
          <Bar label="Prestigio social" value={state.club.socialPrestige} hint={TIPS.prestigioSocial} />
          <div className="muted" style={{ marginTop: '0.6rem' }}>
            Jugadores activos: <strong>{active.length}</strong>
            {state.playersLeftCount > 0 && ` · Se fueron ${state.playersLeftCount} esta temporada`}
          </div>
        </div>

        <div>
          {state.objectives.length > 0 && (
            <div className="card">
              <h3>Objetivos de la comisión (temporada {state.seasonNumber})</h3>
              <ul className="news-list">
                {state.objectives.map((obj) => {
                  const st = objectiveStatus(state, obj, false);
                  const badge = OBJECTIVE_BADGE[st];
                  return (
                    <li key={obj.id}>
                      <span style={{ color: `var(--${badge.cls})`, minWidth: 16 }}>{badge.icon}</span>
                      <span style={{ flex: 1 }}>{obj.label}</span>
                      <span className={`chip ${badge.cls}`}>{badge.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {state.promises.length > 0 && (
            /* Una promesa es del vestuario, no del tablero: lleva su color. */
            <div className="card sec-vestuario">
              <h3>Promesas del club</h3>
              <ul className="news-list">
                {state.promises.map((pr, i) => {
                  const badge = PROMISE_BADGE[promiseHealth(state, pr)];
                  return (
                    <li key={i}>
                      <span style={{ flex: 1 }}>
                        <PlayerLink id={pr.playerId}>{pr.playerName}</PlayerLink>
                        <span className="muted"> · {pr.label.replace(`${pr.playerName}: `, '')}</span>
                      </span>
                      <span className={`chip ${badge.cls}`}>{badge.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div>
          {groupChat.length > 0 && (
            /* El chat del plantel es vestuario puro. */
            <div className="card sec-vestuario">
              <h3>
                <Icon name="chat" size={17} /> El grupo del club
              </h3>
              <div className="chat-list">
                {groupChat.map((m) => {
                  const pl = state.players.find((p) => p.id === m.playerId);
                  return (
                    <div className="chat-row" key={m.playerId}>
                      {pl && (
                        <div className="avatar chat-avatar">
                          <Avatar
                            seed={pl.id}
                            age={pl.age}
                            appearance={pl.appearance}
                            expressionOverride={EMOTION_EXPRESSION[m.emotion]}
                            title={pl.name}
                          />
                        </div>
                      )}
                      <div className="chat-bubble">
                        <div className="chat-name">
                          <PlayerLink id={m.playerId}>{m.name}</PlayerLink>
                        </div>
                        <div className="chat-text">{m.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card">
            <h3>Últimos acontecimientos</h3>
            {state.news.length === 0 ? (
              <div className="muted">Sin novedades por ahora.</div>
            ) : (
              <ul className="news-list">
                {state.news.slice(0, 8).map((n, i) => (
                  <li key={i}>
                    <span className={`news-dot ${n.tone}`} />
                    <span className="news-week">S{n.week}</span>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
