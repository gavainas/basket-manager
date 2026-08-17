import { crestFromSeed, type CrestDesign } from '../game/crest';

// Escudo SVG por capas (ver design/SISTEMA_VISUAL.md y game/crest.ts).
//
// ## La restricción que manda: se ve a 18px y a 96px
//
// El escudo aparece en la fila de una tabla de diez equipos (18px) y en la ficha
// de un club (96px). A 18px lo único que se lee es **silueta + dos colores + una
// partición**; una pelota con costuras o unas iniciales ahí son puré. Así que el
// detalle entra por umbral de tamaño, no siempre:
//
// - chico (< 28px): silueta, partición y filete. Nada más.
// - grande (≥ 28px): suma figura central, iniciales y estrellas.
//
// Es la misma disciplina que `Avatar.tsx` ("legible de 24 a 96 px"), y por eso
// el escudo del banderín de la tabla y el de la ficha son el mismo componente.

const VB = { w: 100, h: 112 };

/** Siluetas. Todas llenan aprox. x 6..94, y 4..108 para que pesen parecido. */
const SHAPES = [
  // Español: hombros rectos, base redonda. El más común en clubes de barrio.
  'M 8 6 H 92 V 62 Q 92 92 50 106 Q 8 92 8 62 Z',
  // Con punta.
  'M 8 6 H 92 V 58 L 50 106 L 8 58 Z',
  // Círculo.
  'M 50 10 A 44 44 0 1 0 50 98 A 44 44 0 1 0 50 10 Z',
  // Rombo.
  'M 50 4 L 94 56 L 50 108 L 6 56 Z',
  // Banderín con cola de golondrina.
  'M 10 6 H 90 V 100 L 50 84 L 10 100 Z',
];

/** Estrella de cinco puntas centrada en (50,52), radio 18. */
const STAR =
  'M 50 34 L 54.4 45.9 L 67.1 46.4 L 57.1 54.3 L 60.6 66.6 ' +
  'L 50 59.5 L 39.4 66.6 L 42.9 54.3 L 32.9 46.4 L 45.6 45.9 Z';

/**
 * Caja segura por silueta: dónde puede vivir el contenido (figura, iniciales,
 * estrellas) sin salirse del escudo.
 *
 * El campo y la partición se recortan con clipPath, pero el contenido NO — si se
 * desborda, se desborda a la vista. Un rombo a la altura de las iniciales es la
 * mitad de ancho que un escudo español, así que cada silueta declara su centro y
 * su escala y el contenido se dibuja siempre en las mismas coordenadas locales.
 */
const SAFE: { cx: number; cy: number; s: number }[] = [
  { cx: 50, cy: 54, s: 1 }, // español: casi todo el lienzo
  { cx: 50, cy: 47, s: 0.9 }, // con punta: la base no sirve
  { cx: 50, cy: 54, s: 0.88 }, // círculo
  { cx: 50, cy: 56, s: 0.68 }, // rombo: el más angosto de todos
  { cx: 50, cy: 46, s: 0.9 }, // banderín
];

/** Hash corto y estable para los ids de clipPath: dos escudos no pueden pisarse. */
function uid(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Luminancia aproximada, para decidir si la tinta encima va clara u oscura. */
function esClaro(hex: string): boolean {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return false;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

interface Props {
  /** Seed persistente: el id del club. Mismo club, mismo escudo. */
  seed: string;
  /** Nombre del club: de ahí salen las iniciales (no del azar). */
  name: string;
  /** Colores de la camiseta [principal, vivo]. */
  colors?: [string, string];
  /** Año de fundación: sesga las estrellas. */
  founded?: number;
  size?: number;
  /** Diseño ya calculado, si el llamador lo tiene. */
  design?: CrestDesign;
  title?: string;
}

export function Crest({ seed, name, colors, founded, size = 24, design, title }: Props) {
  const d = design ?? crestFromSeed(seed, name, founded);
  const [campo, vivo] = colors ?? ['#2d5c8a', '#e8e4dc'];
  const filete = '#20242a';
  const tinta = esClaro(campo) ? '#20242a' : '#f6f4f1';
  const shape = SHAPES[d.shape % SHAPES.length];
  const clip = `crest-${uid(seed)}`;
  const grande = size >= 28;

  // Las particiones se dibujan sobre el campo y se recortan a la silueta.
  const particion = (() => {
    switch (d.partition % 6) {
      case 1: // palo
        return <rect x={38} y={0} width={24} height={VB.h} fill={vivo} />;
      case 2: // faja
        return <rect x={0} y={42} width={VB.w} height={26} fill={vivo} />;
      case 3: // cuartelado
        return (
          <g fill={vivo}>
            <rect x={0} y={0} width={50} height={56} />
            <rect x={50} y={56} width={50} height={56} />
          </g>
        );
      case 4: // banda diagonal
        return <path d="M -12 76 L 76 -12 L 112 22 L 24 112 Z" fill={vivo} />;
      case 5: // chevrón
        return <path d="M 50 30 L 106 76 L 106 104 L 50 58 L -6 104 L -6 76 Z" fill={vivo} />;
      default: // plena
        return null;
    }
  })();

  // Figura central, dibujada dentro de un medallón del color de campo.
  //
  // El medallón no es adorno: sin él, una figura en tinta clara sobre una
  // partición casi blanca desaparece, y no hay forma de saber de antemano qué
  // partición le tocó a cada club. Además es como se ven los escudos de barrio
  // de verdad. Coordenadas locales: centro (50,44), radio 20.
  const figura = (() => {
    if (!grande || d.charge % 5 === 0) return null;
    const dibujo = (() => {
      switch (d.charge % 5) {
        case 1: // pelota
          return (
            <g>
              <circle cx={50} cy={44} r={13} fill={tinta} />
              <path
                d="M 37 44 H 63 M 50 31 V 57 M 41 35 Q 50 44 59 35 M 41 53 Q 50 44 59 53"
                stroke={campo}
                strokeWidth={1.8}
                fill="none"
              />
            </g>
          );
        case 2: // estrella
          return <path d={STAR} fill={tinta} transform="translate(50 44) scale(0.82) translate(-50 -52)" />;
        case 3: // aro con red
          return (
            <g stroke={tinta} fill="none" strokeLinecap="round">
              <path d="M 36 36 H 64" strokeWidth={3.4} />
              <path d="M 41 36 v 5 h 18 v -5" strokeWidth={2.4} />
              <path d="M 44 41 l 3 11 M 50 41 v 12 M 56 41 l -3 11 M 46 47 h 8" strokeWidth={1.8} />
            </g>
          );
        case 4: // laurel
          return (
            <g stroke={tinta} fill="none" strokeLinecap="round">
              <path d="M 39 57 Q 31 44 40 31" strokeWidth={2.6} />
              <path d="M 61 57 Q 69 44 60 31" strokeWidth={2.6} />
              <path d="M 40 51 l -6 -2 M 38 44 l -6 -2 M 39 37 l -6 -2" strokeWidth={1.7} />
              <path d="M 60 51 l 6 -2 M 62 44 l 6 -2 M 61 37 l 6 -2" strokeWidth={1.7} />
            </g>
          );
        default:
          return null;
      }
    })();
    return (
      <g>
        <circle cx={50} cy={44} r={20} fill={campo} stroke={tinta} strokeWidth={1.6} opacity={0.97} />
        {dibujo}
      </g>
    );
  })();

  // Las iniciales son la mejor señal de identidad —salen del nombre, no del azar—
  // así que van siempre en tamaño grande. Con figura arriba, monograma abajo: es
  // como funcionan los escudos de verdad.
  //
  // Van con `paint-order: stroke` y un contorno del color de campo, para que se
  // lean igual cuando caen sobre una partición clara.
  const sinFigura = d.charge % 5 === 0;
  const iniciales = grande ? (
    <text
      x={50}
      y={sinFigura ? 64 : 90}
      textAnchor="middle"
      fill={tinta}
      stroke={campo}
      strokeWidth={sinFigura ? 5 : 3.4}
      paintOrder="stroke"
      strokeLinejoin="round"
      fontFamily="var(--display)"
      fontWeight={700}
      fontSize={sinFigura ? 40 : 24}
      letterSpacing={sinFigura ? 1 : 0.5}
    >
      {d.initials}
    </text>
  ) : null;

  const estrellas =
    grande && d.stars > 0 ? (
      <g fill={tinta} opacity={0.85}>
        {(d.stars === 3 ? [-13, 0, 13] : [0]).map((dx) => (
          <path key={dx} d={STAR} transform={`translate(${dx + 50} 24) scale(0.17) translate(-50 -52)`} />
        ))}
      </g>
    ) : null;

  const safe = SAFE[d.shape % SAFE.length];

  return (
    <svg
      className="crest"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width={size * (VB.w / VB.h)}
      height={size}
      role="img"
      aria-label={title ?? `Escudo de ${name}`}
    >
      <defs>
        <clipPath id={clip}>
          <path d={shape} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <path d={shape} fill={campo} />
        {particion}
      </g>
      <path d={shape} fill="none" stroke={filete} strokeWidth={grande ? 4 : 6} />
      {/* Todo el contenido entra en la caja segura de su silueta. */}
      <g transform={`translate(${safe.cx} ${safe.cy}) scale(${safe.s}) translate(-50 -52)`}>
        {estrellas}
        {figura}
        {iniciales}
      </g>
    </svg>
  );
}
