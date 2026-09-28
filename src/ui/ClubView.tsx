import type { GameState } from '../game/types';
import { activePlayers } from '../game/match';
import { objectiveStatus, type ObjectiveStatus } from '../game/objectives';
import { promiseHealth, type PromiseHealth } from '../game/promises';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { Tip, TIPS } from './Tip';
import { avgMotivation } from './helpers';
import { Cara, Planilla } from './bloqueD';
import './club.css';

/** Cómo va cada encargo de la comisión: la marca a mano y el estado sólo si no es «en curso». */
const OBJECTIVE_MARK: Record<ObjectiveStatus, { mark: string; cls: string; label: string | null }> = {
  cumplido: { mark: '✔', cls: 'good', label: 'Cumplido' },
  en_curso: { mark: '●', cls: 'dim', label: null },
  en_riesgo: { mark: '▲', cls: 'warn', label: 'En riesgo' },
  fallado: { mark: '✘', cls: 'bad', label: 'Fallado' },
};

const PROMISE_EST: Record<PromiseHealth, { cls: string; label: string | null }> = {
  en_pie: { cls: '', label: null },
  en_riesgo: { cls: 'warn', label: 'En riesgo' },
  rota: { cls: 'bad', label: 'Rota' },
  cumplida: { cls: 'good', label: 'Cumplida' },
};

/** Un medidor del club: la cifra grande, la barrita y el nombre con su explicación. */
function Medidor({ label, value, hint }: { label: string; value: number; hint: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const cls = v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad';
  return (
    <div className={`ec-medidor ${cls}`}>
      <div className="ec-medidor-cifra">{v}</div>
      <div className="ec-medidor-barra" aria-hidden="true">
        <i style={{ width: `${v}%` }} />
      </div>
      <div className="ec-medidor-lab">
        <Tip text={hint}>{label}</Tip>
      </div>
    </div>
  );
}

/** «Bien», «a medias», «flojo»: el número dicho en palabras para la frase. */
function enPalabras(v: number): string {
  return v >= 65 ? 'bien' : v >= 40 ? 'a medias' : 'flojo';
}

/**
 * El club (UI V1): qué pide la comisión y cómo está el club.
 *
 * El héroe, sobre la escena de la comisión, son los cinco medidores del club
 * dichos grandes, sin caja, y una frase que los resume. Al lado, la planilla
 * protagonista: lo que pide la comisión (y lo que el club le prometió a sus
 * jugadores), con cinta y título a mano. Abajo, las dos conversaciones del
 * club: lo que pasó (los acontecimientos) y lo que se dice (el grupo). La que
 * no tiene nada no ocupa lugar: antes del primer partido el grupo no habla.
 */
export function ClubView({ state }: { state: GameState }) {
  const active = activePlayers(state.players);
  const morale = avgMotivation(state.players);
  const c = state.club;

  // El grupo del club: lo que se dijo después del último partido.
  // Priorizamos a los que tienen algo para decir (ni conformes ni indiferentes).
  const moods = state.lastMatch?.moods ?? [];
  const opinionated = moods.filter((m) => m.emotion !== 'conforme' && m.emotion !== 'indiferente');
  const groupChat = (opinionated.length >= 3 ? opinionated : moods).slice(0, 6);

  const medidores = [
    { label: 'Moral', value: morale, hint: TIPS.moralGeneral },
    { label: 'Ambiente', value: c.socialClimate, hint: TIPS.ambienteSocial },
    { label: 'Organización', value: c.organization, hint: TIPS.organizacion },
    { label: 'Prestigio deportivo', value: c.sportPrestige, hint: TIPS.prestigioDeportivo },
    { label: 'Prestigio social', value: c.socialPrestige, hint: TIPS.prestigioSocial },
  ];
  const peor = [...medidores].sort((a, b) => a.value - b.value)[0];
  const mejor = [...medidores].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="elclub">
      <section className="ec-hero v1-hero" aria-label="Cómo está el club">
        <div className="v1-eyebrow">
          El club · <b>Temporada {state.seasonNumber}</b>
        </div>
        <h2 className="v1-titulo">Cómo está el club</h2>
        <div className="ec-medidores">
          {medidores.map((m) => (
            <Medidor key={m.label} {...m} />
          ))}
        </div>
        <p className="v1-frase ec-frase">
          Lo mejor, {mejor.label.toLowerCase()}: <b className={mejor.value >= 65 ? 'good' : undefined}>{Math.round(mejor.value)}</b>.
          {' '}Lo que más flojea, {peor.label.toLowerCase()}:{' '}
          <b className={peor.value < 40 ? 'bad' : peor.value < 65 ? 'warn' : undefined}>{Math.round(peor.value)}</b>
          {peor.value < 65 ? ` (${enPalabras(peor.value)})` : ''}. En el plantel hay <b>{active.length}</b>
          {state.playersLeftCount > 0 ? <>; se fueron <b className="bad">{state.playersLeftCount}</b> esta temporada.</> : ' y nadie se fue esta temporada.'}
        </p>
      </section>

      <Planilla mano titulo="Lo que pide la comisión" nota={`temporada ${state.seasonNumber}`} className="ec-comision" focus="objetivos">
        {state.objectives.length === 0 ? (
          <p className="bd-vacio">La comisión no pidió nada esta temporada.</p>
        ) : (
          state.objectives.map((obj, i) => {
            const m = OBJECTIVE_MARK[objectiveStatus(state, obj, false)];
            return (
              <div className={`ec-encargo v1-renglon ${m.cls}`} key={obj.id}>
                <span className="ec-encargo-nro">{i + 1}</span>
                <span className="ec-encargo-txt">{obj.label}</span>
                {m.label ? <span className={`v1-est ${m.cls}`}>{m.label}</span> : <span className="ec-encargo-va">en curso</span>}
              </div>
            );
          })
        )}
        {state.promises.length > 0 && (
          <>
            <h4 className="bd-sub ec-promesas-tit">Lo que les prometimos</h4>
            {state.promises.map((pr, i) => {
              const e = PROMISE_EST[promiseHealth(state, pr)];
              const pl = state.players.find((p) => p.id === pr.playerId);
              return (
                <div className="ec-promesa v1-renglon" key={i}>
                  <Cara id={pr.playerId} personality={pl?.personality} size={30} />
                  <span className="ec-promesa-txt">
                    <PlayerLink id={pr.playerId}>{pr.playerName}</PlayerLink>
                    <span> · {pr.label.replace(`${pr.playerName}: `, '')}</span>
                  </span>
                  {e.label ? <span className={`v1-est ${e.cls}`}>{e.label}</span> : <span className="ec-encargo-va">en pie</span>}
                </div>
              );
            })}
          </>
        )}
      </Planilla>

      <Planilla titulo="Lo que pasó" nota="últimos acontecimientos" className={`ec-noticias${groupChat.length === 0 ? ' ancha' : ''}`} focus="noticias">
        {state.news.length === 0 ? (
          <p className="bd-vacio">Sin novedades por ahora.</p>
        ) : (
          <ul className="ec-lista">
            {state.news.slice(0, 12).map((n, i) => (
              <li key={i} className={`v1-renglon ${n.tone}`}>
                <span className="ec-sem">S{n.week}</span>
                <span className="ec-punto" aria-hidden="true" />
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Planilla>

      {/* El grupo sólo habla después de un partido. Antes de la primera fecha la
          columna quedaba en blanco sin decir por qué: ahora no se dibuja. */}
      {groupChat.length > 0 && (
        <Planilla
          titulo={
            <>
              <Icon name="chat" size={16} /> El grupo del club
            </>
          }
          nota="después del partido"
          className="ec-grupo"
          focus="grupo"
        >
          {groupChat.map((m) => {
            const pl = state.players.find((p) => p.id === m.playerId);
            return (
              <div className="ec-msj v1-renglon" key={m.playerId}>
                <Cara id={m.playerId} personality={pl?.personality} size={40} />
                <div className="ec-msj-txt">
                  <PlayerLink id={m.playerId}>{m.name}</PlayerLink>
                  <p>{m.text}</p>
                </div>
              </div>
            );
          })}
        </Planilla>
      )}
    </div>
  );
}
