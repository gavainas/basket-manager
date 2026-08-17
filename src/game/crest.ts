// Generador modular de escudos de club — hermano de `appearance.ts`.
//
// Los escudos eran emoji de un bolillero de diez (`CRESTS`), y tres de ellos
// eran mascotas: águila, lobo, león. Eso es liga universitaria yanqui; los
// clubes de barrio van con escudo, franja, estrella e iniciales
// (ver design/SISTEMA_VISUAL.md, "qué no tomamos de la referencia").
//
// **Sin imágenes externas, sin IA en tiempo de ejecución**: todo es SVG dibujado
// por código. Ninguna IA da diez escudos consistentes entre sí, y menos treinta.
//
// ## Determinismo
//
// La seed es el **id del club**: mismo club, mismo escudo, entre pantallas y
// sesiones. Cada capa se elige con un hash independiente (`FNV-1a(seed + ':' +
// capa)`), así agregar variantes a una capa **no** cambia las demás.
//
// A diferencia de `Player.appearance`, el diseño **no se persiste**: se deriva
// del id al renderizar, igual que las caras de `WorldPlayer`. Si en el futuro
// crecen las variantes, algún escudo rival puede cambiar de una versión a otra;
// asumido, es el mismo trato que ya aceptamos para las caras del mundo.
//
// **Regla de oro para ampliar**: variantes SIEMPRE al final de cada lista, nunca
// reordenar ni borrar — los índices derivados dependen del orden.

/** Diseño derivado de un escudo. Los índices son sobre las listas de `Crest.tsx`. */
export interface CrestDesign {
  /** Silueta: español, con punta, círculo, rombo, banderín. */
  shape: number;
  /** Partición interna: plena, palo, faja, cuartelado, banda, chevrón. */
  partition: number;
  /** Figura central: nada, pelota, estrella, aro, laurel. */
  charge: number;
  /** Estrellas sobre el escudo: 0, 1 o 3. */
  stars: number;
  /** Iniciales derivadas del nombre, no del azar. 1 a 3 letras. */
  initials: string;
}

export const CREST_VARIANTS = {
  shape: 5,
  partition: 6,
  charge: 5,
} as const;

/** FNV-1a de 32 bits, igual que en `appearance.ts`. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick(seed: string, layer: string, count: number): number {
  return hash32(seed + ':' + layer) % count;
}

function roll(seed: string, layer: string): number {
  return hash32(seed + ':' + layer) / 0xffffffff;
}

/**
 * Palabras que no aportan identidad: casi todos los clubes de barrio empiezan
 * con una de estas, así que si contaran, media liga tendría las mismas iniciales.
 */
const RELLENO = new Set([
  'club',
  'atlético',
  'atletico',
  'deportivo',
  'social',
  'y',
  'de',
  'del',
  'la',
  'las',
  'el',
  'los',
  'unión',
  'union',
]);

/**
 * Iniciales de un club a partir de su nombre: significan algo, no salen del
 * bolillero. "Atlético El Parque" → EP · "Bohemios del Parque" → BP.
 *
 * Si al sacar el relleno no queda nada (un club llamado solo "Unión de la
 * Plaza"), cae en las primeras letras del nombre entero: siempre devuelve algo.
 */
export function clubInitials(name: string): string {
  const palabras = name
    .replace(/["'«»]/g, ' ')
    .split(/[\s·-]+/)
    .filter(Boolean);

  const fuertes = palabras.filter((p) => !RELLENO.has(p.toLowerCase()));
  const usar = fuertes.length > 0 ? fuertes : palabras;

  const letras = usar
    .slice(0, 3)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  // Un club de una sola palabra fuerte queda mejor con dos letras que con una.
  if (letras.length === 1 && usar[0] && usar[0].length > 1) {
    return (usar[0][0] + usar[0][1]).toUpperCase();
  }
  return letras || name.slice(0, 2).toUpperCase();
}

/**
 * Deriva el escudo desde la seed (id del club) y su nombre.
 *
 * `founded` sesga las estrellas: los clubes viejos las lucen y los recién
 * fundados no tienen nada que lucir todavía. Es el mismo recurso que usa
 * `appearanceFromSeed` con la edad.
 */
export function crestFromSeed(seed: string, name: string, founded?: number): CrestDesign {
  const antiguedad = founded == null ? 30 : Math.max(0, 2026 - founded);

  // Tres estrellas es de club con historia; una, de club con algo ganado.
  const r = roll(seed, 'stars');
  let stars = 0;
  if (antiguedad >= 45) stars = r < 0.35 ? 3 : 1;
  else if (antiguedad >= 20) stars = r < 0.5 ? 1 : 0;
  else stars = r < 0.15 ? 1 : 0;

  return {
    shape: pick(seed, 'shape', CREST_VARIANTS.shape),
    partition: pick(seed, 'partition', CREST_VARIANTS.partition),
    charge: pick(seed, 'charge', CREST_VARIANTS.charge),
    stars,
    initials: clubInitials(name),
  };
}
