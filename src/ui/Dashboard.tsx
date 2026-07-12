import { useContext } from 'react';
import type { GameState } from '../game/types';
import { activePlayers, clubPosition } from '../game/match';
import { objectiveStatus, type ObjectiveStatus } from '../game/objectives';
import { promiseHealth, type PromiseHealth } from '../game/promises';
import { Bar } from './Bar';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { NavigateTabContext } from './nav';
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

export function Dashboard({ state }: { state: GameState }) {
  const navigate = useContext(NavigateTabContext);
  const row = state.standings.find((r) => r.teamId === 'club')!;
  const position = clubPosition(state);
  const active = activePlayers(state.players);
  const morale = avgMotivation(state.players);
  // Tras el partido (matchResult) la semana aún no avanzó: el "próximo" es el que sigue.
  const upcomingWeek = state.phase === 'matchResult' ? state.week + 1 : state.week;
  const nextRivalId = upcomingWeek <= state.seasonLength ? state.schedule[upcomingWeek - 1] : null;
  const nextRival = nextRivalId ? state.rivals.find((r) => r.id === nextRivalId)! : null;
  const moneyCls = state.club.money < 100 ? 'bad' : state.club.money < 300 ? 'warn' : 'good';

  return (
    <div>
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
