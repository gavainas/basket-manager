import type { GameState, Player } from '../game/types';
import { buildSocialMap } from '../game/socialMap';
import { Avatar } from './Avatar';
import { Bar } from './Bar';
import { Cabecera } from './Cabecera';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';

function PlayerChip({ p }: { p: Player }) {
  return (
    <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <Avatar seed={p.id} age={p.age} appearance={p.appearance} size={22} title={p.name} />
      <PlayerLink id={p.id}>{p.name.replace(/"[^"]*"\s*/g, '').split(/\s+/).pop()}</PlayerLink>
    </span>
  );
}

const PAIR_ICON = { intimos: '🍻', chocan: '🧨', roce: '⚡' } as const;

/**
 * El mapa social del vestuario: los grupos reales del plantel, los puentes,
 * las parejas con historia y los que van por la suya. Todo derivado de las
 * afinidades vivas (asados y sociedades incluidos).
 */
export function VestuarioCard({ state }: { state: GameState }) {
  const map = buildSocialMap(state);

  return (
    /* Su color es el del vestuario en cualquier pantalla donde aparezca, no el
       del área que la contiene. */
    <div className="card sec-vestuario" style={{ marginBottom: '1rem' }}>
      <h3>
        <Icon name="vestuario" size={17} /> El vestuario por dentro
      </h3>
      <Cabecera art="cab-vestuario.webp" alt="El vestuario del club quince minutos antes del partido" />
      <div style={{ maxWidth: 320, marginBottom: '0.6rem' }}>
        <Bar
          label="Unión del grupo"
          value={map.cohesion}
          hint="Promedio de las relaciones del plantel: sube compartiendo mesa, baja con peleas y broncas."
        />
      </div>

      {map.groups.length > 0 ? (
        map.groups.map((g, i) => (
          <div key={i} style={{ margin: '0.4rem 0' }}>
            <strong>{g.label}</strong>{' '}
            <span className="muted">({g.members.length}{g.strength >= 78 ? ' · inseparables' : ''})</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
              {g.members.map((p) => (
                <PlayerChip key={p.id} p={p} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="muted" style={{ margin: '0.3rem 0' }}>
          Todavía no se armaron grupos fuertes: el plantel se lleva bien, pero nadie es íntimo de nadie. Un par de asados
          pueden cambiar eso.
        </p>
      )}

      {map.bridges.map(({ p, text }) => (
        <p key={p.id} style={{ margin: '0.35rem 0' }}>
          🌉 <PlayerLink id={p.id}>{p.name}</PlayerLink>: {text}
        </p>
      ))}

      {map.pairs.map((pair) => (
        <p key={pair.a.id + pair.b.id} style={{ margin: '0.35rem 0' }}>
          {PAIR_ICON[pair.kind]} <PlayerLink id={pair.a.id}>{pair.a.name}</PlayerLink> y{' '}
          <PlayerLink id={pair.b.id}>{pair.b.name}</PlayerLink>: {pair.text}
        </p>
      ))}

      {map.loners.map(({ p, text }) => (
        <p key={p.id} style={{ margin: '0.35rem 0' }}>
          🚶 <PlayerLink id={p.id}>{p.name}</PlayerLink>: {text}
        </p>
      ))}
    </div>
  );
}
