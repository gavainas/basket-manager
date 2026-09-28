import type { GameState, Player } from '../game/types';
import { buildSocialMap, type SocialGroup } from '../game/socialMap';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { CaraPlantel } from './RosterList';

/** Apodo si tiene; si no, el apellido (como en la fila de pie del Tablero). */
function corto(p: Player): string {
  const nick = p.name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  return p.name.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/).pop() ?? p.name;
}

const PAIR_ICON = { intimos: 'corazon', chocan: 'rayo', roce: 'alerta' } as const;

/** El texto con el nombre del compañero convertido en link a su ficha. */
function ConNombre({ text, p }: { text: string; p: Player }) {
  const idx = text.indexOf(p.name);
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <PlayerLink id={p.id}>{p.name}</PlayerLink>
      {text.slice(idx + p.name.length)}
    </>
  );
}

/** Una mesa: su nombre a la izquierda y la gente sentada a la derecha. */
function Mesa({ g }: { g: SocialGroup }) {
  const unidos = g.strength >= 78 ? 'Inseparables' : g.strength >= 70 ? 'Muy unidos' : null;
  return (
    <div className="vs-mesa v1-renglon">
      <div className="vs-mesa-nom">
        <b>{g.label}</b>
        <span>
          {g.members.length} {g.members.length === 1 ? 'jugador' : 'jugadores'}
          {unidos && <> · {unidos}</>}
        </span>
      </div>
      <div className="vs-mesa-gente">
        {g.members.map((p) => (
          <span key={p.id} className="vs-sentado">
            <CaraPlantel p={p} size="chica" />
            <PlayerLink id={p.id}>{corto(p)}</PlayerLink>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * El vestuario por dentro (UI V1 — design/UI_V1_GUIA.md). La escena de fondo
 * ya es el vestuario, así que la pantalla no dibuja otro: arriba, sin caja, la
 * unión del grupo como cifra grande; las mesas en una planilla, una por
 * renglón y con la gente sentada; y lo demás —los puentes, las parejas con
 * historia, los que no tienen mesa y los que van por la suya— escrito en
 * frases al costado, como lo contaría alguien del club.
 *
 * Todo sale de las afinidades vivas (asados y sociedades incluidos) y cuenta a
 * todo el plantel: cada jugador está en una mesa, entre los sueltos o entre
 * los que van por la suya.
 */
export function VestuarioCard({ state }: { state: GameState }) {
  const map = buildSocialMap(state);
  const enGrupo = map.groups.reduce((t, g) => t + g.members.length, 0);
  const total = enGrupo + map.sueltos.length + map.loners.length;
  const union = Math.round(map.cohesion);
  const tonoUnion = union >= 65 ? 'good' : union >= 40 ? 'warn' : 'bad';
  const hayFrases = map.bridges.length + map.pairs.length + map.sueltos.length + map.loners.length > 0;

  return (
    <div className="vs-hoja">
      <section className="vs-principal">
        <div className="vs-hero v1-hero">
          <div className="v1-eyebrow">El vestuario por dentro</div>
          <div className="vs-hero-fila">
            <div className={`v1-cifra vs-union ${tonoUnion}`} title="Promedio de las relaciones del plantel">
              {union}
              <small>unión del grupo</small>
            </div>
            <p className="v1-frase">
              <b>{enGrupo} de {total}</b> tienen mesa fija
              {map.groups.length > 0 && (
                <> en {map.groups.length === 1 ? 'un grupo' : <><b>{map.groups.length}</b> grupos</>}</>
              )}
              . La unión sube compartiendo mesa y asados; baja con peleas y broncas.
            </p>
          </div>
        </div>

        <div className="vs-mesas v1-planilla">
          <i className="v1-cinta a" />
          <i className="v1-cinta b" />
          <h3 className="v1-mano">
            Las mesas <span>quién se sienta con quién</span>
          </h3>
          {map.groups.length > 0 ? (
            map.groups.map((g, i) => <Mesa key={i} g={g} />)
          ) : (
            <p className="vs-vacio v1-renglon">
              Todavía no se armaron grupos fuertes: el plantel se lleva bien, pero nadie es íntimo de nadie. Un par de
              asados pueden cambiar eso.
            </p>
          )}
        </div>
      </section>

      {hayFrases && (
        <aside className="vs-margen v1-hero" aria-label="Lo que se ve en el vestuario">
          {map.pairs.length > 0 && (
            <div className="vs-bloque">
              <div className="v1-eyebrow">Parejas con historia</div>
              {map.pairs.map((pair) => (
                <p key={pair.a.id + pair.b.id} className={`v1-frase vs-pareja ${pair.kind}`}>
                  <Icon name={PAIR_ICON[pair.kind]} size={14} />{' '}
                  <b><PlayerLink id={pair.a.id}>{corto(pair.a)}</PlayerLink></b> y{' '}
                  <b><PlayerLink id={pair.b.id}>{corto(pair.b)}</PlayerLink></b>: {pair.text}
                </p>
              ))}
            </div>
          )}

          {map.bridges.length > 0 && (
            <div className="vs-bloque">
              <div className="v1-eyebrow">Los que hacen de puente</div>
              {map.bridges.map(({ p, text }) => (
                <p key={p.id} className="v1-frase">
                  <b><PlayerLink id={p.id}>{corto(p)}</PlayerLink></b> — {text}
                </p>
              ))}
            </div>
          )}

          {map.sueltos.length > 0 && (
            <div className="vs-bloque">
              <div className="v1-eyebrow">Sin mesa fija</div>
              {map.sueltos.map((s) => (
                <p key={s.p.id} className="v1-frase">
                  <b><PlayerLink id={s.p.id}>{corto(s.p)}</PlayerLink></b> — <ConNombre text={s.text} p={s.closest} />
                </p>
              ))}
            </div>
          )}

          {map.loners.length > 0 && (
            <div className="vs-bloque">
              <div className="v1-eyebrow">Van por la suya</div>
              {map.loners.map(({ p, text }) => (
                <p key={p.id} className="v1-frase">
                  <b><PlayerLink id={p.id}>{corto(p)}</PlayerLink></b> — {text}
                </p>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
