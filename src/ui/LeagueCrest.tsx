import type { League } from '../game/types';

/**
 * Escudo de liga — **PLACEHOLDER** (sep 2026).
 *
 * Decisión de Gabi al aprobar la dirección D de la inscripción: "los escudos
 * después los inventamos, ahora poné placeholder". Así que esto NO es arte: es
 * una placa con la silueta, el color de la liga y sus iniciales, suficiente para
 * que las cuatro opciones se distingan sin leer el nombre.
 *
 * Está escrito para ser reemplazado sin tocar ninguna pantalla: quien llame a
 * `<LeagueCrest league={l} size={44} />` va a seguir llamando igual cuando el
 * escudo de verdad exista. Lo que cambia acá adentro es el dibujo.
 *
 * **El camino propuesto para el definitivo** (sin aprobar todavía) es el mismo
 * que ya usan los clubes: `game/crest.ts` + `ui/Crest.tsx` generan escudo por
 * seed con silueta, partición, dos colores y detalle por umbral de tamaño. Una
 * liga tendría su propio juego de siluetas para que su escudo no se confunda con
 * el de un club. Ver `design/canvas-pretemporada/LEEME.md`.
 *
 * ## La restricción que manda: se ve a 18px y a 96px
 *
 * Igual que `Crest.tsx` y `Avatar.tsx`. A 18px —el tamaño de la fila de una
 * tabla— lo único que se lee es **silueta + color**, así que las iniciales
 * entran por umbral y abajo de 26px no se dibujan.
 */

const VB = { w: 100, h: 112 };

/** Siluetas de LIGA. A propósito distintas de las de club (`Crest.tsx`): un
 *  escudo de liga no puede confundirse con el de un rival de la tabla. */
const SHAPES: Record<string, string> = {
  // Con punta: la institucional.
  punta: 'M 8 6 H 92 V 58 L 50 106 L 8 58 Z',
  // Rombo: la nocturna.
  rombo: 'M 50 4 L 94 56 L 50 108 L 6 56 Z',
  // Banderín con cola: la de los comercios.
  banderin: 'M 10 6 H 90 V 100 L 50 84 L 10 100 Z',
  // Círculo: las informales.
  circulo: 'M 50 10 A 44 44 0 1 0 50 98 A 44 44 0 1 0 50 10 Z',
  // Español: la libre grande.
  espanol: 'M 8 6 H 92 V 62 Q 92 92 50 106 Q 8 92 8 62 Z',
};

/** Qué silueta le toca a cada liga. Con más de cinco ligas, dos comparten
 *  silueta y las separa el color — que es cómo funciona `crest.ts` también. */
const SHAPE_BY_LEAGUE: Record<string, keyof typeof SHAPES> = {
  lg_universitaria: 'punta',
  lg_centro: 'rombo',
  lg_comercio: 'banderin',
  lg_plaza: 'circulo',
  lg_montevideo: 'espanol',
  lg_veteranos: 'circulo',
};

/** Partición: la mitad que se pinta con el color secundario. */
function partition(shape: keyof typeof SHAPES): string {
  switch (shape) {
    case 'punta':
      return 'M 8 6 H 50 V 106 L 8 58 Z'; // mitad izquierda
    case 'rombo':
      return 'M 0 44 H 100 V 68 H 0 Z'; // faja horizontal
    case 'banderin':
      return 'M 10 6 H 90 V 34 H 10 Z'; // franja superior
    case 'circulo':
      return 'M 0 54 H 100 V 112 H 0 Z'; // mitad inferior
    default:
      return 'M 50 0 H 100 V 112 H 50 Z'; // mitad derecha
  }
}

/** Hash corto y estable: dos escudos en la misma pantalla no pueden pisar sus
 *  clipPath. Mismo truco que `Crest.tsx`. */
function uid(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

interface Props {
  league: Pick<League, 'id' | 'name' | 'abbr' | 'colors'>;
  size?: number;
  title?: string;
}

export function LeagueCrest({ league, size = 44, title }: Props) {
  const shape = SHAPE_BY_LEAGUE[league.id] ?? 'espanol';
  const d = SHAPES[shape];
  const id = `lgc-${uid(league.id)}`;
  const alto = Math.round((size * VB.h) / VB.w);
  // Abajo de este tamaño las iniciales son puré: queda silueta y color.
  const conIniciales = size >= 26;

  return (
    <svg
      className="league-crest"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width={size}
      height={alto}
      role="img"
      aria-label={title ?? `Escudo de ${league.name}`}
    >
      <title>{title ?? league.name}</title>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width={VB.w} height={VB.h} fill={league.colors.base} />
        <path d={partition(shape)} fill={league.colors.alt} />
      </g>
      <path d={d} fill="none" stroke="#25282c" strokeWidth={conIniciales ? 4 : 6} opacity={0.5} />
      {conIniciales && (
        <text
          x="50"
          y={shape === 'circulo' ? 46 : shape === 'rombo' ? 66 : shape === 'banderin' ? 70 : 52}
          textAnchor="middle"
          fontFamily="Oswald, sans-serif"
          fontWeight="700"
          fontSize={league.abbr.length > 2 ? 26 : 32}
          fill={shape === 'banderin' || shape === 'circulo' ? league.colors.alt : '#25282c'}
          opacity={0.9}
        >
          {league.abbr}
        </text>
      )}
    </svg>
  );
}
