import { useContext } from 'react';
import type { GameState } from '../game/types';
import { BALANCE } from '../game/balance';
import { activePlayers, clubPosition } from '../game/match';
import { EMOTION_EXPRESSION } from '../game/humanState';
import { objectiveStatus, type ObjectiveStatus } from '../game/objectives';
import { promiseHealth, type PromiseHealth } from '../game/promises';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext, type AppTab } from './nav';
import { TIPS } from './Tip';
import { avgMotivation, formatMoney, rivalDifficulty, rivalStyleInfo } from './helpers';

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
  icon: string;
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
      icon: '🚨',
      cls: 'bad',
      text: `${p.name} está al borde de dejar el club: una charla o minutos pueden salvarlo.`,
      tab: 'plantilla',
    });
  }
  const fixedCosts = 245 + (state.coach?.weeklyWage ?? 0);
  if (state.club.money < fixedCosts) {
    items.push({
      icon: '💸',
      cls: 'bad',
      text: `La caja no cubre la semana: $${state.club.money} contra ~$${fixedCosts} de gastos fijos. Rifa, sponsor o cuotas, ya.`,
      tab: 'finanzas',
    });
  }
  const upset = active.filter((x) => x.status === 'molesto');
  if (upset.length > 0) {
    items.push({
      icon: '😠',
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
      icon: '🩹',
      cls: 'good',
      text: `${returning.map((p) => p.name).join(' y ')} ${returning.length > 1 ? 'reciben' : 'recibe'} el alta la próxima semana.`,
      tab: 'plantilla',
    });
  } else if (injured.length > 0) {
    items.push({
      icon: '🚑',
      cls: 'warn',
      text: `${injured.length === 1 ? `${injured[0].name} sigue` : `${injured.length} jugadores siguen`} en la enfermería.`,
      tab: 'plantilla',
    });
  }
  const suspended = active.filter((x) => (x.suspendedWeeks ?? 0) > 0);
  for (const p of suspended) {
    items.push({
      icon: '🟥',
      cls: 'bad',
      text: `${p.name} está suspendido: esta fecha la mira desde la tribuna.`,
      tab: 'plantilla',
    });
  }
  const hotheads = active.filter((x) => (x.seasonTechs ?? 0) === 2 && (x.suspendedWeeks ?? 0) === 0);
  for (const p of hotheads) {
    items.push({
      icon: '🟨',
      cls: 'warn',
      text: `${p.name} acumula 2 técnicas en el año: una más y se pierde una fecha.`,
      tab: 'plantilla',
    });
  }
  const exhausted = active.filter((x) => x.status !== 'lesionado' && x.physical <= BALANCE.callUp.exhaustedThreshold);
  if (exhausted.length > 0) {
    items.push({
      icon: '🥵',
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
      icon: '🧾',
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
        icon: '🏀',
        cls: 'warn',
        text: `El segundo equipo llega justo: ${fit} fichas en condiciones para su fecha.`,
        tab: 'liga',
      });
    }
  }

  const order = { bad: 0, warn: 1, good: 2 } as const;
  return items.sort((a, b) => order[a.cls] - order[b.cls]).slice(0, 4);
}

export function Dashboard({ state }: { state: GameState }) {
  const navigate = useContext(NavigateTabContext);
  const watch = watchItems(state);
  const row = state.standings.find((r) => r.teamId === 'club')!;
  const position = clubPosition(state);
  const active = activePlayers(state.players);
  const morale = avgMotivation(state.players);
  // Tras el partido (matchResult) la semana aún no avanzó: el "próximo" es el que sigue.
  const upcomingWeek = state.phase === 'matchResult' ? state.week + 1 : state.week;
  const nextRivalId = upcomingWeek <= state.seasonLength ? state.schedule[upcomingWeek - 1] : null;
  const nextRival = nextRivalId ? state.rivals.find((r) => r.id === nextRivalId)! : null;
  const moneyCls = state.club.money < 100 ? 'bad' : state.club.money < 300 ? 'warn' : 'good';

  // El grupo del club: lo que se dijo después del último partido, como chat.
  // Priorizamos a los que tienen algo para decir (ni conformes ni indiferentes).
  const moods = state.lastMatch?.moods ?? [];
  const opinionated = moods.filter((m) => m.emotion !== 'conforme' && m.emotion !== 'indiferente');
  const groupChat = (opinionated.length >= 3 ? opinionated : moods).slice(0, 5);

  return (
    <div>
      <div className="card watch-card" style={{ marginBottom: '1rem' }}>
        <h3>📌 Qué mirar hoy</h3>
        {watch.length === 0 ? (
          <p style={{ margin: 0 }}>
            ✅ <strong>Semana tranquila.</strong> Sin urgencias en el club: a pensar en el partido.
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
                <span style={{ minWidth: 20 }}>{w.icon}</span>
                <span style={{ flex: 1 }}>{w.text}</span>
                <span className={`chip ${w.cls}`}>ver →</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid cols-4">
        <div className="stat-tile clickable" onClick={() => navigate('semana')} title="Ir a la semana">
          <div className="label">Semana</div>
          <div className="value">
            {Math.min(state.week, state.seasonLength)}/{state.seasonLength}
          </div>
          <div className="sub">ver la semana →</div>
        </div>
        <div className="stat-tile clickable" onClick={() => navigate('liga')} title="Ver la tabla de posiciones">
          <div className="label">Posición en la liga</div>
          <div className="value">{position}°</div>
          <div className="sub">de 10 equipos · ver tabla →</div>
        </div>
        <div className="stat-tile clickable" onClick={() => navigate('historia')} title="Ver los partidos jugados">
          <div className="label">Récord</div>
          <div className="value">
            {row.wins}-{row.losses}
          </div>
          <div className="sub">ganados-perdidos · ver historia →</div>
        </div>
        <div className="stat-tile clickable" onClick={() => navigate('finanzas')} title="Ver las finanzas">
          <div className="label">Dinero</div>
          <div className={`value ${moneyCls}`}>{formatMoney(state.club.money)}</div>
          <div className="sub">ver finanzas →</div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: '1rem' }}>
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
            <div className="card">
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
          {nextRival && (
            <div className="card">
              <h3>Próximo rival</h3>
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                <RivalLink id={nextRival.id}>{nextRival.name}</RivalLink>
              </div>
              <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                <span className={`chip ${rivalDifficulty(nextRival).cls}`}>{rivalDifficulty(nextRival).label}</span>
                <span className="chip accent" title={rivalStyleInfo(nextRival.style).desc}>
                  {rivalStyleInfo(nextRival.style).label}
                </span>
              </div>
            </div>
          )}
          {groupChat.length > 0 && (
            <div className="card">
              <h3>💬 El grupo del club</h3>
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
