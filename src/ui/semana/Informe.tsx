// Etapa 5 · Informe (UI V1, sep 2026 — design/UI_V1_GUIA.md y la lámina 05,
// cuadro 20 «Postpartido», de design/arte/referencias/). Nació junto al
// Tablero aprobado, así que se lee en el mismo orden:
//
// 1. El RESULTADO es el héroe, sin caja, sobre la escena (el vestuario si
//    ganamos, la derrota si perdimos): la palabra, los escudos y el marcador
//    grandes, los cuartos en una línea y el resumen como frase. A la derecha,
//    la FIGURA del partido como persona: el busto de pie, sus números y lo que
//    dijo.
// 2. EL VESTUARIO: el plantel de pie sobre el parquet con cómo quedó cada uno
//    escrito debajo, y lo que se escuchó (primero lo que preocupa).
// 3. Dos planillas: la del partido (nuestros números, con el total del equipo,
//    y los goleadores de ellos en una frase) y «Lo que dejó el partido», la
//    protagonista con cinta: los momentos clave numerados, por qué salió así
//    y las consecuencias.
//
// El único naranja es seguir, en el pie.

import { useContext, useState } from 'react';
import type { PlayerEmotion, Position } from '../../game/types';
import { clubGamesPlayed, clubPosition, clubRecord } from '../../game/match';
import { clubByLegacyId, USER_CLUB_ID } from '../../game/world';
import { Busto, FilaDePie, type PersonaDePie } from '../Busto';
import { Crest } from '../Crest';
import { OpenProfileContext, PlayerLink } from '../PlayerLink';
import { RivalLink } from '../RivalLink';
import { WorldPlayerLink } from '../WorldPlayerLink';
import { Tip } from '../Tip';
import { weekLabel } from '../helpers';
import { useEspacio } from '../teclas';
import type { Props } from './comun';
import './informe.css';

/** La sigla del puesto (la misma que usa el partido en vivo). */
const POS_CORTA: Record<Position, string> = { Base: 'B', Escolta: 'E', Alero: 'A', 'Ala-Pívot': 'AP', Pívot: 'P' };

/** Cómo se pinta cada emoción: bien, a mirar, mal o nada (neutra). */
function tonoDe(e: PlayerEmotion): 'good' | 'warn' | 'bad' | null {
  if (e === 'euforico' || e === 'orgulloso' || e === 'contento') return 'good';
  if (e === 'molesto_minutos') return 'bad';
  if (e === 'frustrado' || e === 'decepcionado') return 'warn';
  return null;
}
/** El orden en que se escucha al vestuario: primero lo que preocupa, después la euforia. */
const PESO: Record<PlayerEmotion, number> = {
  molesto_minutos: 0, frustrado: 1, decepcionado: 1, euforico: 2, orgulloso: 2, indiferente: 3, conforme: 3, contento: 4,
};
/** El estado debajo de cada uno en la fila: una o dos palabras (el texto entero va en su voz). */
const CORTO: Record<PlayerEmotion, string> = {
  euforico: 'Eufórico', orgulloso: 'Orgulloso', contento: 'Contento', conforme: 'Conforme',
  indiferente: 'Indiferente', frustrado: 'Frustrado', molesto_minutos: 'Con bronca', decepcionado: 'Decepcionado',
};

/** En la fila entra el apodo si lo tiene, y si no el apellido (como en el Tablero). */
function nombreCorto(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

/** Cuántos momentos clave se ven antes de "ver todos", y cuántas voces del vestuario. */
const MOMENTOS_A_LA_VISTA = 5;
const VOCES_A_LA_VISTA = 3;

export function MatchResultPanel({ state, dispatch }: Props) {
  useEspacio(() => dispatch({ type: 'NEXT_WEEK' }));
  const [todosLosMomentos, setTodosLosMomentos] = useState(false);
  const [todasLasVoces, setTodasLasVoces] = useState(false);
  const open = useContext(OpenProfileContext);
  const m = state.lastMatch;
  if (!m) return null;

  /* Para qué sirvió ganar: la tabla, contada acá. Antes había que salir a la
     Liga para saber si el partido movió algo. Sólo en fase regular: en
     playoffs la tabla está congelada. Al apretar "Ver el informe" la tabla ya
     se actualizó con este partido, así que la posición es la de después. */
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

  const userClub = state.world.clubs.find((c) => c.id === USER_CLUB_ID);
  const rivalClub = clubByLegacyId(state.world, m.rivalId);
  const escudo = (club: typeof userClub, size: number) =>
    club ? <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={size} /> : null;
  const veredicto = m.forfeit ? 'Forfeit' : m.won ? 'Victoria' : 'Derrota';
  const tono = m.forfeit ? 'bad' : m.won ? 'good' : 'bad';

  // La figura: la persona, sus números del partido y lo que dijo al salir.
  const box = m.box ?? [];
  const figura = m.mvpId ? state.players.find((p) => p.id === m.mvpId) : undefined;
  const lineaFigura = box.find((l) => l.playerId === m.mvpId) ?? box.find((l) => l.mvp);
  const animoFigura = (m.moods ?? []).find((x) => x.playerId === m.mvpId);

  // El total del equipo: la suma de la planilla (no se inventa nada).
  const total = box.reduce((t, l) => ({ pts: t.pts + l.points, reb: t.reb + l.rebounds, ast: t.ast + l.assists }), { pts: 0, reb: 0, ast: 0 });
  const rivalTitulares = (m.rivalBox ?? []).filter((l) => l.starter);
  const rivalBanco = (m.rivalBox ?? []).filter((l) => !l.starter);

  // El vestuario: de pie, en el orden de la planilla; los que no jugaron, al final.
  const moods = m.moods ?? [];
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const personas: PersonaDePie[] = moods.map((mood) => {
    const t = tonoDe(mood.emotion);
    const p = byId.get(mood.playerId);
    return {
      id: mood.playerId,
      nombre: nombreCorto(mood.name),
      personality: p?.personality,
      sub: t ? undefined : CORTO[mood.emotion],
      estado: t ? { cls: t, label: CORTO[mood.emotion] } : null,
      title: `${mood.name} — ${mood.label}: ${mood.text}`,
      onClick: () => open(mood.playerId),
    };
  });
  // Lo que se escuchó: primero lo que preocupa, después la euforia.
  // La figura ya habló arriba: va última.
  const peso = (x: (typeof moods)[number]) => (x.playerId === m.mvpId ? 9 : PESO[x.emotion]);
  const voces = [...moods].sort((a, b) => peso(a) - peso(b));
  const vocesVisibles = todasLasVoces ? voces : voces.slice(0, VOCES_A_LA_VISTA);
  const momentos = todosLosMomentos ? m.highlights : m.highlights.slice(0, MOMENTOS_A_LA_VISTA);

  return (
    <div className="informe-pantalla informe-v1">
      {/* ---------- 1. El resultado y la figura ---------- */}
      <section className={`inf-hero${figura ? '' : ' sin-figura'}`} aria-label="El resultado">
        <div className="inf-resultado v1-hero">
          <div className="v1-eyebrow">
            Final del partido · <b>{weekLabel(m.week, state.seasonLength).replace('Semana', 'Fecha')}</b>
            {' · '}{m.week <= state.seasonLength ? 'Fase regular' : 'Playoffs'}
          </div>
          <h2 className={`inf-veredicto ${tono}`}>{veredicto}</h2>
          <div className="inf-versus">
            <div className="inf-equipo">
              {escudo(userClub, 72)}
              <span className="inf-nombre">{state.club.name}</span>
            </div>
            <div className="inf-marcador">
              <span className={m.won ? '' : 'abajo'}>{m.scoreFor}</span>
              <i>–</i>
              <span className={m.won ? 'abajo' : ''}>{m.scoreAgainst}</span>
            </div>
            <div className="inf-equipo rival">
              {escudo(rivalClub, 72)}
              <span className="inf-nombre"><RivalLink id={m.rivalId}>{m.rivalName}</RivalLink></span>
            </div>
          </div>
          {m.quarters.length > 0 && (
            <div className="inf-cuartos" title="Parciales por cuarto (nosotros-ellos)">
              {m.quarters.map((q, i) => (
                <span key={i}>
                  <b>{i < 4 ? `Q${i + 1}` : 'PR'}</b> {q.for}-{q.against}
                </span>
              ))}
            </div>
          )}
          <p className="v1-frase inf-resumen">
            <b className={tono}>{m.summary}</b>
            {tablaLinea && <> {tablaLinea}</>}
          </p>
        </div>

        {figura && m.mvpId && (
          <div className="inf-figura v1-hero">
            <div className="inf-figura-persona" aria-hidden="true">
              <Busto seed={figura.id} personality={figura.personality} />
              <span className="inf-figura-piso" />
            </div>
            <div className="inf-figura-txt">
              <div className="v1-eyebrow">Figura del partido</div>
              <div className="inf-figura-nombre"><PlayerLink id={m.mvpId}>{m.mvpName ?? figura.name}</PlayerLink></div>
              <div className="inf-figura-puesto">{figura.position}</div>
              {lineaFigura && (
                <div className="inf-figura-numeros">
                  <span><b>{lineaFigura.points}</b> pts</span>
                  <span><b>{lineaFigura.rebounds}</b> reb</span>
                  <span><b>{lineaFigura.assists}</b> ast</span>
                  <span><b>{lineaFigura.minutes}&apos;</b> min</span>
                </div>
              )}
              {lineaFigura?.comment && <p className="inf-figura-nota">{lineaFigura.comment}</p>}
              {animoFigura && <p className="inf-figura-dijo">{animoFigura.text}</p>}
            </div>
          </div>
        )}
      </section>

      {/* ---------- 2. El vestuario ---------- */}
      {(moods.length > 0 || m.lockerRoom.length > 0) && (
        <section className="inf-vestuario" aria-label="El vestuario">
          <div className="inf-vestuario-cab v1-hero">
            <h3 className="inf-tit">El vestuario</h3>
            {m.lockerRoom.length > 0 && <p className="v1-frase">{m.lockerRoom.join(' ')}</p>}
          </div>
          {personas.length > 0 && <FilaDePie personas={personas} compacta />}
          {voces.length > 0 && (
            <div className="inf-voces">
              {vocesVisibles.map((mood) => {
                const p = byId.get(mood.playerId);
                const t = tonoDe(mood.emotion);
                return (
                  <div key={mood.playerId} className={`inf-voz ${t ?? ''}`}>
                    <span className="inf-cara" aria-hidden="true"><Busto seed={mood.playerId} personality={p?.personality} /></span>
                    <span className="inf-voz-txt">
                      <b><PlayerLink id={mood.playerId}>{mood.name}</PlayerLink> <span className={`inf-voz-est ${t ?? ''}`}>{mood.label}</span></b>
                      <span>{mood.text}</span>
                    </span>
                  </div>
                );
              })}
              {voces.length > VOCES_A_LA_VISTA && (
                <button className="inf-mas inf-voces-mas" onClick={() => setTodasLasVoces(!todasLasVoces)}>
                  {todasLasVoces ? 'Ver menos' : `Escuchar a todos (${voces.length})`}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* ---------- 3. La planilla y lo que dejó el partido ---------- */}
      <div className={`inf-cuerpo${box.length === 0 ? ' sin-planilla' : ''}`}>
        {box.length > 0 && (
          <section className="inf-planilla v1-planilla" aria-label="Planilla del partido">
            <h3 className="inf-tit">La planilla</h3>
            <table className="inf-tabla">
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
                {box.map((line) => (
                  <tr key={line.playerId} className={line.mvp ? 'mvp' : ''}>
                    <td>
                      <PlayerLink id={line.playerId}>{line.name}</PlayerLink>
                      {line.mvp && <span className="inf-est">Figura</span>}
                    </td>
                    <td className="num">{line.minutes}&apos;</td>
                    <td className="num fuerte">{line.points}</td>
                    <td className="num">{line.rebounds}</td>
                    <td className="num">{line.assists}</td>
                    <td className="num">{line.comment ? <Tip text={line.comment}>{line.rating}/10</Tip> : `${line.rating}/10`}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Equipo</td>
                  <td className="num" />
                  <td className="num fuerte">{total.pts}</td>
                  <td className="num">{total.reb}</td>
                  <td className="num">{total.ast}</td>
                  <td className="num" />
                </tr>
              </tfoot>
            </table>
            {/* La planilla de ellos (sep 2026): quién nos anotó, dicho como
                frase. Los del banco figuran sin puntos: el motor reparte los
                del rival entre su quinteto. */}
            {rivalTitulares.length > 0 && (
              <p className="v1-frase inf-ellos">
                <RivalLink id={m.rivalId}>{m.rivalName}</RivalLink> ({m.scoreAgainst}):{' '}
                {rivalTitulares.map((l, i) => (
                  <span key={l.playerId}>
                    {i > 0 && ' · '}
                    <span className="inf-pos">{POS_CORTA[l.position]}</span> <WorldPlayerLink id={l.playerId}>{l.name}</WorldPlayerLink> <b>{l.points}</b>
                  </span>
                ))}
                .
                {rivalBanco.length > 0 && (
                  <>
                    {' '}Del banco:{' '}
                    {rivalBanco.map((l, i) => (
                      <span key={l.playerId}>
                        {i > 0 && ', '}
                        <WorldPlayerLink id={l.playerId}>{l.name}</WorldPlayerLink>
                      </span>
                    ))}
                    .
                  </>
                )}
              </p>
            )}
          </section>
        )}

        <section className="inf-dejo v1-planilla" aria-label="Lo que dejó el partido">
          <i className="v1-cinta a" /><i className="v1-cinta b" />
          <h3 className="v1-mano">Lo que dejó el partido <span>{m.won ? 'para no olvidar' : 'para aprender'}</span></h3>
          {m.highlights.length > 0 && (
            <div className="inf-bloque">
              <div className="inf-k">Momentos clave</div>
              <ol className="inf-momentos">
                {momentos.map((h, i) => (
                  <li key={i}>
                    <span className="inf-nro">{i + 1}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ol>
              {m.highlights.length > MOMENTOS_A_LA_VISTA && (
                <button className="inf-mas" onClick={() => setTodosLosMomentos(!todosLosMomentos)}>
                  {todosLosMomentos ? 'Ver menos' : `+ ${m.highlights.length - MOMENTOS_A_LA_VISTA} momentos más`}
                </button>
              )}
            </div>
          )}
          {m.reasons.length > 0 && (
            <div className="inf-bloque">
              <div className="inf-k">Por qué</div>
              <p className="inf-parrafo">{m.reasons.join(' ')}</p>
            </div>
          )}
          {m.effects.length > 0 && (
            <div className="inf-bloque">
              <div className="inf-k">Consecuencias</div>
              <ul className="inf-lista">
                {m.effects.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* El botón de seguir se pega abajo mientras el informe scrollea; a la
          derecha, como en las demás etapas de la semana. */}
      <div className="pie-fijo">
        <div className="confirm-bar inf-pie">
          <span className="hint">
            <b>Espacio</b> también avanza.
          </span>
          <button className="primary v1-cta" onClick={() => dispatch({ type: 'NEXT_WEEK' })}>
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
