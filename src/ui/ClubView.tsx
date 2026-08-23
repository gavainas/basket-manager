import type { GameState } from '../game/types';
import { activePlayers } from '../game/match';
import { EMOTION_EXPRESSION } from '../game/humanState';
import { objectiveStatus, type ObjectiveStatus } from '../game/objectives';
import { promiseHealth, type PromiseHealth } from '../game/promises';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { TIPS } from './Tip';
import { avgMotivation } from './helpers';

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

/**
 * El club: cómo está, qué le pidieron y qué se dice.
 *
 * Son las cards que vivían en el viejo tablero. El inicio pasó a ser un menú
 * (ver Hub.tsx) y esto necesitaba una casa propia: la comisión, el ánimo del
 * club y lo que se dijo después del partido son de la misma conversación.
 */
export function ClubView({ state }: { state: GameState }) {
  const active = activePlayers(state.players);
  const morale = avgMotivation(state.players);

  // El grupo del club: lo que se dijo después del último partido, como chat.
  // Priorizamos a los que tienen algo para decir (ni conformes ni indiferentes).
  const moods = state.lastMatch?.moods ?? [];
  const opinionated = moods.filter((m) => m.emotion !== 'conforme' && m.emotion !== 'indiferente');
  const groupChat = (opinionated.length >= 3 ? opinionated : moods).slice(0, 6);

  return (
    <div className="grid cols-3">
      <div>
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
      </div>

      <div>
        {state.objectives.length > 0 && (
          <div className="card" data-focus="objetivos">
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
          <div className="card sec-vestuario" data-focus="grupo">
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
                          personality={pl.personality}
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
        <div className="card" data-focus="noticias">
          <h3>Últimos acontecimientos</h3>
          {state.news.length === 0 ? (
            <div className="muted">Sin novedades por ahora.</div>
          ) : (
            <ul className="news-list">
              {state.news.slice(0, 12).map((n, i) => (
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
  );
}
