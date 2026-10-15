import type { ClubIdentity, KitDesign } from '../game/identity';
import { inkOn } from '../game/identity';

/**
 * La camiseta del club, en SVG por código.
 *
 * Tres diseños, que es lo que un club de barrio manda a hacer: lisa, franjas
 * verticales y banda cruzada. Mismo criterio que el escudo (`Crest.tsx`): sin
 * imágenes externas, todo dibujado, y legible tanto a 40 px en una ficha como a
 * 200 px en la vista previa del editor.
 *
 * El dorsal es opcional y entra solo en tamaño grande: a 40 px un número es una
 * mancha.
 */

const VB = { w: 100, h: 104 };

/** Silueta de la camiseta: hombros, sisas y faldón. Una sola para los tres diseños. */
const CAMISETA =
  'M 32 8 L 18 14 L 8 30 L 20 40 L 26 33 L 26 96 L 74 96 L 74 33 L 80 40 L 92 30 L 82 14 L 68 8 ' +
  'Q 50 22 32 8 Z';

/** Cuello: el hueco que deja la silueta arriba. */
const CUELLO = 'M 32 8 Q 50 22 68 8 Q 50 16 32 8 Z';

export const KIT_LABELS: Record<KitDesign, string> = {
  lisa: 'Lisa',
  franjas: 'Franjas',
  banda: 'Banda',
};

export function Kit({
  identity,
  size = 72,
  number,
  title,
}: {
  identity: ClubIdentity;
  size?: number;
  /** Dorsal. Solo se dibuja de 120 px para arriba. */
  number?: number;
  title?: string;
}) {
  const { primary, secondary } = identity.colors;
  const tinta = inkOn(primary);
  const grande = size >= 120;
  const clip = `kit-${identity.initials}-${identity.kit}`.replace(/[^a-zA-Z0-9-]/g, '');

  const dibujo = (() => {
    switch (identity.kit) {
      case 'franjas':
        return (
          <g fill={secondary}>
            {[26, 42, 58, 74].map((x) => (
              <rect key={x} x={x} y={0} width={8} height={VB.h} />
            ))}
          </g>
        );
      case 'banda':
        return <path d="M -10 74 L 64 -8 L 92 16 L 18 100 Z" fill={secondary} />;
      default:
        return null;
    }
  })();

  // Vivos del cuello y las mangas: lo que convierte una camiseta lisa en la de
  // un club. Van siempre, en los tres diseños.
  const vivos = (
    <g fill={secondary}>
      <path d="M 32 8 Q 50 22 68 8 L 71 12 Q 50 28 29 12 Z" />
      <path d="M 18 14 L 8 30 L 13 34 L 23 18 Z" />
      <path d="M 82 14 L 92 30 L 87 34 L 77 18 Z" />
      <rect x={26} y={92} width={48} height={4} />
    </g>
  );

  return (
    <svg
      className="kit"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width={size * (VB.w / VB.h)}
      height={size}
      role="img"
      aria-label={title ?? `Camiseta de ${identity.name}`}
    >
      <defs>
        <clipPath id={clip}>
          <path d={CAMISETA} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <path d={CAMISETA} fill={primary} />
        {dibujo}
        {vivos}
      </g>
      <path d={CAMISETA} fill="none" stroke="#20242a" strokeWidth={3} strokeLinejoin="round" />
      <path d={CUELLO} fill="none" stroke="#20242a" strokeWidth={2.2} />
      {grande && number != null && (
        <text
          x={50}
          y={72}
          textAnchor="middle"
          fill={tinta}
          stroke={primary}
          strokeWidth={4}
          paintOrder="stroke"
          strokeLinejoin="round"
          fontFamily="var(--display)"
          fontWeight={700}
          fontSize={40}
        >
          {number}
        </text>
      )}
    </svg>
  );
}
