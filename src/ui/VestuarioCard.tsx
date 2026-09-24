import type { GameState, Player } from '../game/types';
import { buildSocialMap, type SocialGroup } from '../game/socialMap';
import { apellido } from '../game/nombres';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { Cabecera } from './Cabecera';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';

function PlayerChip({ p }: { p: Player }) {
  return (
    <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <Avatar seed={p.id} age={p.age} appearance={p.appearance} size={22} title={p.name} personality={p.personality} />
      <PlayerLink id={p.id}>{apellido(p.name)}</PlayerLink>
    </span>
  );
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

function Grupo({ g }: { g: SocialGroup }) {
  return (
    <div className="vest-grupo">
      <strong>{g.label}</strong>{' '}
      <span className="muted">
        ({g.members.length}
        {g.strength >= 78 ? ' · inseparables' : g.strength >= 70 ? ' · muy unidos' : ''})
      </span>
      <div className="vest-chips">
        {g.members.map((p) => (
          <PlayerChip key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

/**
 * El mapa social del vestuario: los grupos reales del plantel, los que no
 * tienen mesa fija, los puentes, las parejas con historia y los que van por
 * la suya. Todo derivado de las afinidades vivas (asados y sociedades
 * incluidos). Cuenta a todo el plantel: cada jugador está en un grupo, entre
 * los sueltos o entre los aislados; antes la mitad podía no aparecer.
 */
export function VestuarioCard({ state }: { state: GameState }) {
  const map = buildSocialMap(state);
  const enGrupo = map.groups.reduce((t, g) => t + g.members.length, 0);

  return (
    /* Su color es el del vestuario en cualquier pantalla donde aparezca, no el
       del área que la contiene. */
    <div className="card sec-vestuario" style={{ marginBottom: '1rem' }}>
      <h3>
        <Icon name="vestuario" size={17} /> El vestuario por dentro
      </h3>
      <Cabecera art="cab-vestuario.webp" alt="El vestuario del club quince minutos antes del partido" />

      <div className="vest-cuerpo">
        <div className="vest-col">
          <div className="vest-sub">
            Las mesas
            <span className="muted"> · {enGrupo} de {enGrupo + map.sueltos.length + map.loners.length} en algún grupo</span>
          </div>
          {map.groups.length > 0 ? (
            map.groups.map((g, i) => <Grupo key={i} g={g} />)
          ) : (
            <p className="muted" style={{ margin: '0.3rem 0' }}>
              Todavía no se armaron grupos fuertes: el plantel se lleva bien, pero nadie es íntimo de nadie. Un par de
              asados pueden cambiar eso.
            </p>
          )}

          {map.sueltos.length > 0 && (
            <>
              <div className="vest-sub">Sin mesa fija</div>
              {map.sueltos.map((s) => (
                <div key={s.p.id} className="vest-fila">
                  <PlayerChip p={s.p} />
                  <span>
                    <ConNombre text={s.text} p={s.closest} />
                  </span>
                </div>
              ))}
            </>
          )}

          {map.loners.length > 0 && (
            <>
              <div className="vest-sub">Van por la suya</div>
              {map.loners.map(({ p, text }) => (
                <div key={p.id} className="vest-fila">
                  <PlayerChip p={p} />
                  <span>{text}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="vest-col">
          <div style={{ maxWidth: 320, marginBottom: '0.6rem' }}>
            <Bar
              label="Unión del grupo"
              value={map.cohesion}
              hint="Promedio de las relaciones del plantel: sube compartiendo mesa, baja con peleas y broncas."
            />
          </div>

          {map.bridges.length > 0 && (
            <>
              <div className="vest-sub">Los que hacen de puente</div>
              {map.bridges.map(({ p, text }) => (
                <div key={p.id} className="vest-fila">
                  <PlayerChip p={p} />
                  <span>{text}</span>
                </div>
              ))}
            </>
          )}

          {map.pairs.length > 0 && (
            <>
              <div className="vest-sub">Parejas con historia</div>
              {map.pairs.map((pair) => (
                <p key={pair.a.id + pair.b.id} className="vest-pareja">
                  <Icon name={PAIR_ICON[pair.kind]} size={13} /> <PlayerLink id={pair.a.id}>{pair.a.name}</PlayerLink> y{' '}
                  <PlayerLink id={pair.b.id}>{pair.b.name}</PlayerLink>: {pair.text}
                </p>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
