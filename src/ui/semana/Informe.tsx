// Etapa 5 · Informe: la franja con el resultado, la planilla de los dos
// equipos, el relato, las claves, las consecuencias y cómo quedó cada uno.

import type { Position } from '../../game/types';
import { clubGamesPlayed, clubPosition, clubRecord } from '../../game/match';
import { Icon } from '../Icon';
import { PlayerLink } from '../PlayerLink';
import { RivalLink } from '../RivalLink';
import { WorldPlayerLink } from '../WorldPlayerLink';
import { Tip } from '../Tip';
import { weekLabel } from '../helpers';
import { useEspacio } from '../teclas';
import { EMOTION_EXPRESSION } from '../../game/humanState';
import { Avatar } from '../Avatar';
import type { Props } from './comun';

/** La sigla del puesto en la planilla del rival (la misma que usa el partido en vivo). */
const POS_CORTA: Record<Position, string> = { Base: 'B', Escolta: 'E', Alero: 'A', 'Ala-Pívot': 'AP', Pívot: 'P' };

export function MatchResultPanel({ state, dispatch }: Props) {
  useEspacio(() => dispatch({ type: 'NEXT_WEEK' }));
  const m = state.lastMatch;
  if (!m) return null;

  /* Para qué sirvió ganar: la tabla, contada acá. Antes había que salir a la
     Liga para saber si el partido movió algo. Sólo en fase regular: en
     playoffs la tabla está congelada. */
  const jugadas = clubGamesPlayed(state);
  const rec = clubRecord(state);
  const tablaLinea =
    m.forfeit || jugadas === 0 || state.week > state.seasonLength
      ? null
      : `En la tabla quedamos ${clubPosition(state)}° de ${state.standings.length} (${rec.wins}-${rec.losses}), con ${
          state.seasonLength - jugadas === 0
            ? 'la fase regular terminada'
            : `${state.seasonLength - jugadas} ${state.seasonLength - jugadas === 1 ? 'fecha' : 'fechas'} por jugar`
        }.`;
  const nextLabel =
    state.week < state.seasonLength
      ? `Avanzar a la semana ${state.week + 1} →`
      : state.week === state.seasonLength
        ? 'Cerrar la fase regular →'
        : state.week === state.seasonLength + 1
          ? 'Después de las semifinales →'
          : 'Cerrar la temporada →';

  return (
    /* El Informe era la peor de todas: una tira vertical de seis bloques que
       medía casi tres pantallas a 720p. El contenido no sobraba —la forma sí—,
       así que entra completo repartido en tres columnas, sin sacar una línea. */
    <div className="informe-pantalla">
      {/* La cabecera es una franja, como en el partido (sep 2026): el
          resultado, el marcador con los cuartos en una línea, el resumen y la
          figura. Antes medía 275 px (marcador grande + tabla de cuartos con los
          mismos números) y a las tres columnas les quedaban 257. */}
      <div className="card partido-franja informe-franja">
        <div className="franja-quien">
          <span className={`result-badge ${m.won ? 'win' : 'lose'}`}>
            {m.forfeit ? 'FORFEIT' : m.won ? 'VICTORIA' : 'DERROTA'}
          </span>
          <h3 style={{ margin: 0 }}>
            {weekLabel(m.week, state.seasonLength)} · vs <RivalLink id={m.rivalId}>{m.rivalName}</RivalLink>
          </h3>
        </div>

        <div className="franja-marcador">
          <span className="fm-team">{state.club.name}</span>
          <span className={`fm-score ${m.won ? 'win' : 'lose'}`}>{m.scoreFor}</span>
          <span className="fm-sep">final</span>
          <span className={`fm-score ${m.won ? 'lose' : 'win'}`}>{m.scoreAgainst}</span>
          <span className="fm-team"><RivalLink id={m.rivalId}>{m.rivalName}</RivalLink></span>
          {m.quarters.length > 0 && (
            <div className="fm-cuartos" title="Parciales por cuarto (nosotros-ellos)">
              {m.quarters.map((q, i) => (
                <span key={i} className="fm-cuarto">
                  <b>{i < 4 ? `Q${i + 1}` : 'PR'}</b> {q.for}-{q.against}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="franja-estado">
          <span className="franja-linea" title={m.summary}>{m.summary}</span>
          {m.mvpName && m.mvpId && (
            <span className="chip accent">
              <Icon name="estrella" size={13} /> Figura: <PlayerLink id={m.mvpId}>{m.mvpName}</PlayerLink>
            </span>
          )}
        </div>
      </div>

      <div className="informe-cuerpo">
      {(m.box ?? []).length > 0 && (
        <div className="card pane informe-planilla">
          <h3 className="card-band">Planilla del partido</h3>
          <div className="table-wrap pane-body">
            <table className="planilla">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th className="num">Min</th>
                  <th className="num">Pts</th>
                  <th className="num">Reb</th>
                  <th className="num">Ast</th>
                  <th className="num">Nota</th>
                </tr>
              </thead>
              <tbody>
                {m.box.map((line) => (
                  <tr key={line.playerId}>
                    <td>
                      <PlayerLink id={line.playerId}>{line.name}</PlayerLink> {line.mvp ? <Icon name="estrella" size={11} /> : ''}
                    </td>
                    <td className="num">{line.minutes}&apos;</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {line.points}
                    </td>
                    <td className="num">{line.rebounds}</td>
                    <td className="num">{line.assists}</td>
                    <td className="num">
                      {line.comment ? <Tip text={line.comment}>{line.rating}/10</Tip> : `${line.rating}/10`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* La planilla de ellos (sep 2026): quién nos anotó. El partido en
                vivo ya lo mostraba cuarto a cuarto; el informe se quedaba con
                el marcador y la liga perdía la cara. El rival también rota: los
                suplentes que entraron llevan sus puntos, y los que no, un guion.
                Los informes viejos no traen `played`: ahí jugaban los titulares. */}
            {(m.rivalBox ?? []).length > 0 && (
              <>
                <h4 className="informe-lado">
                  <RivalLink id={m.rivalId}>{m.rivalName}</RivalLink>
                  <span className="muted"> · {m.scoreAgainst} puntos</span>
                </h4>
                <table className="planilla planilla-rival">
                  <thead>
                    <tr>
                      <th className="pos">Pos</th>
                      <th>Jugador</th>
                      <th className="num">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.rivalBox!.map((line) => {
                      const jugo = line.played ?? line.starter;
                      return (
                        <tr key={line.playerId} className={jugo ? '' : 'banco'}>
                          <td className="pos">{POS_CORTA[line.position]}</td>
                          <td>
                            <WorldPlayerLink id={line.playerId}>{line.name}</WorldPlayerLink>
                            {!line.starter && <span className="muted">{jugo ? ' · suplente' : ' · no entró'}</span>}
                          </td>
                          <td className="num" style={{ fontWeight: jugo ? 700 : 400 }}>
                            {jugo ? line.points : '–'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      <div className="informe-col">
      {m.highlights.length > 0 && (
        <div className="card">
          <h3>El relato del partido</h3>
          <ul className="reason-list">
            {m.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

        <div className="card">
          <h3>Claves del resultado</h3>
          <ul className="reason-list">
            {m.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Consecuencias</h3>
          <ul className="reason-list">
            {/* Dónde quedamos, sin ir a la Liga: al apretar "Ver el informe" la
                tabla ya se actualizó con este partido, así que la posición es la
                de después. En playoffs la tabla está congelada y no se dice. */}
            {tablaLinea && <li>{tablaLinea}</li>}
            {m.effects.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>

      {m.lockerRoom.length > 0 && (
        <div className="card">
          <h3>En el vestuario</h3>
          <ul className="reason-list">
            {m.lockerRoom.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      </div>

      {(m.moods ?? []).length > 0 && (
        <div className="card pane informe-moods">
          <h3 className="card-band">Cómo quedó cada uno</h3>
          <div className="data-grid pane-body">
            {m.moods!.map((mood) => {
              const cls =
                mood.emotion === 'euforico' || mood.emotion === 'orgulloso' || mood.emotion === 'contento'
                  ? 'good'
                  : mood.emotion === 'molesto_minutos'
                    ? 'bad'
                    : mood.emotion === 'frustrado' || mood.emotion === 'decepcionado'
                      ? 'warn'
                      : '';
              const moodPlayer = state.players.find((p) => p.id === mood.playerId);
              return (
                <div className="data-row" key={mood.playerId}>
                  <span className="data-label mood-label">
                    {moodPlayer && (
                      <span className="avatar mood-avatar">
                        <Avatar
                          seed={moodPlayer.id}
                          age={moodPlayer.age}
                          appearance={moodPlayer.appearance}
                          expressionOverride={EMOTION_EXPRESSION[mood.emotion]}
                          title={mood.name}
                          personality={moodPlayer.personality}
                        />
                      </span>
                    )}
                    <PlayerLink id={mood.playerId}>{mood.name}</PlayerLink>
                  </span>
                  <span className="data-value">
                    <span className={`chip ${cls}`}>{mood.label}</span>{' '}
                    <span className="muted">{mood.text}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* El botón de seguir se pega abajo mientras el informe scrollea. */}
      <div className="pie-fijo">
        <div className="confirm-bar">
          <button className="primary" onClick={() => dispatch({ type: 'NEXT_WEEK' })}>
            {nextLabel}
          </button>
          <span className="hint">
            <b>Espacio</b> también.
          </span>
        </div>
      </div>
    </div>
  );
}
