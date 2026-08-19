import type { Personality } from '../game/types';

/**
 * Retrato ilustrado por arquetipo, recortado y sobre azul plano.
 *
 * Es el primer lugar donde el juego usa ilustración en vez del retrato SVG
 * procedural (design/AVATAR_SYSTEM.md): la tira del plantel en el inicio. El
 * resto del juego sigue con los procedurales, que dan una cara distinta por
 * jugador — acá hay ocho caras, una por personalidad, así que dos jugadores del
 * mismo arquetipo comparten retrato. Es a propósito hasta que exista el set
 * grande (ver public/arte/LEEME.md).
 *
 * El fondo azul lo pone el contenedor y la ilustración va con alfa encima: el
 * arte no trae fondo propio, así que cambiar el color es tocar una línea de CSS.
 */
const ARCHIVO: Record<Personality, string> = {
  veterano: 'p-veterano.webp',
  talentoso_informal: 'p-talentoso.webp',
  social: 'p-social.webp',
  cumplidor: 'p-cumplidor.webp',
  competitivo: 'p-competitivo.webp',
  protagonista: 'p-protagonista.webp',
  leal: 'p-leal.webp',
  mercenario: 'p-mercenario.webp',
};

export function Retrato({
  personality,
  title,
  size = 62,
  variante = 0,
}: {
  personality: Personality;
  title: string;
  size?: number;
  /**
   * Con ocho caras y catorce jugadores hay repetidos. La variante los separa sin
   * arte nuevo: espeja el retrato y cambia el tono del azul. No los vuelve
   * personas distintas — es un parche honesto hasta el set grande.
   */
  variante?: number;
}) {
  return (
    <span className={`retrato v${variante % 3}`} style={{ width: size, height: size }}>
      <img src={`${import.meta.env.BASE_URL}arte/${ARCHIVO[personality]}`} alt="" title={title} loading="lazy" />
    </span>
  );
}
