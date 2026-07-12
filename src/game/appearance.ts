// Generador modular de retratos (ver design/AVATAR_SYSTEM.md).
//
// La apariencia de un jugador se deriva de forma determinística de una seed
// persistente (su id): la cara no cambia entre pantallas, sesiones ni partidas.
// Cada capa se elige con un hash independiente (seed + nombre de capa), así
// agregar variantes a una capa NO cambia las demás capas de jugadores existentes.
//
// Regla para ampliar el sistema: agregar variantes SIEMPRE al final de cada
// lista y nunca reordenar ni borrar (los índices guardados/derivados dependen
// del orden).

export interface Appearance {
  faceShape: number;
  skinTone: number;
  eyes: number;
  eyebrows: number;
  nose: number;
  mouth: number;
  ears: number;
  hair: number;
  hairColor: number;
  /** 0 pelo completo · 1 entradas · 2 coronilla · 3 pelado. */
  baldness: number;
  /** 0 nada · 1 bigote · 2 candado · 3 completa · 4 desprolija · 5 chivita · 6 patillas · 7 bigote caído. */
  facialHair: number;
  /** 0 nada · 1 ojeras · 2 ojeras y frente · 3 arrugas. */
  ageDetail: number;
  /** 0 neutro · 1 sonrisa · 2 malhumorado · 3 cansado · 4 confiado. */
  expression: number;
  /** 0 nada · 1 vincha · 2 lentes · 3 aro · 4 curita · 5 cinta fina. */
  accessory: number;
}

/** Cantidad de variantes por capa (apéndice únicamente: nunca reordenar). */
export const APPEARANCE_VARIANTS = {
  faceShape: 8,
  skinTone: 12,
  eyes: 5,
  eyebrows: 4,
  nose: 5,
  mouth: 3,
  ears: 3,
  hair: 12,
  hairColor: 8, // 6 y 7 son canas (gris / blanco)
  baldness: 4,
  facialHair: 8,
  ageDetail: 4,
  expression: 5,
  accessory: 6,
} as const;

/** FNV-1a de 32 bits: rápido, estable y suficiente para elegir variantes. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Índice determinístico e independiente por capa. */
function pick(seed: string, layer: string, count: number): number {
  return hash32(seed + ':' + layer) % count;
}

/** Número 0..1 determinístico por capa, para probabilidades. */
function roll(seed: string, layer: string): number {
  return hash32(seed + ':' + layer) / 0xffffffff;
}

/**
 * Deriva la apariencia desde la seed (id del jugador) sesgada por la edad:
 * los veteranos tienen más calvicie, canas y arrugas; los pibes casi nunca.
 */
export function appearanceFromSeed(seed: string, age = 28): Appearance {
  const v = APPEARANCE_VARIANTS;

  // Calvicie por franja etaria (umbrales acumulados para 0/1/2/3).
  const b = roll(seed, 'baldness');
  let baldness: number;
  if (age < 25) baldness = b < 0.9 ? 0 : 1;
  else if (age < 33) baldness = b < 0.72 ? 0 : b < 0.92 ? 1 : 2;
  else if (age < 39) baldness = b < 0.45 ? 0 : b < 0.75 ? 1 : b < 0.9 ? 2 : 3;
  else baldness = b < 0.25 ? 0 : b < 0.55 ? 1 : b < 0.8 ? 2 : 3;

  // Canas: probabilidad que crece desde los ~30.
  let hairColor = pick(seed, 'hairColor', 6); // colores "jóvenes" 0-5
  const grayChance = Math.max(0, Math.min(0.85, (age - 29) * 0.055));
  if (roll(seed, 'gray') < grayChance) hairColor = roll(seed, 'grayTone') < 0.7 ? 6 : 7;

  // Marcas de edad por franja.
  const a = roll(seed, 'ageDetail');
  let ageDetail: number;
  if (age < 24) ageDetail = 0;
  else if (age < 30) ageDetail = a < 0.7 ? 0 : 1;
  else if (age < 36) ageDetail = a < 0.35 ? 1 : 2;
  else ageDetail = a < 0.4 ? 2 : 3;

  // Barba: más común que en un plantel profesional.
  const f = roll(seed, 'facialHairChance');
  const facialHair = f < 0.4 ? 0 : 1 + pick(seed, 'facialHair', v.facialHair - 1);

  // Accesorios con moderación.
  const acc = roll(seed, 'accessoryChance');
  const accessory = acc < 0.8 ? 0 : 1 + pick(seed, 'accessory', v.accessory - 1);

  return {
    faceShape: pick(seed, 'faceShape', v.faceShape),
    skinTone: pick(seed, 'skinTone', v.skinTone),
    eyes: pick(seed, 'eyes', v.eyes),
    eyebrows: pick(seed, 'eyebrows', v.eyebrows),
    nose: pick(seed, 'nose', v.nose),
    mouth: pick(seed, 'mouth', v.mouth),
    ears: pick(seed, 'ears', v.ears),
    hair: pick(seed, 'hair', v.hair),
    hairColor,
    baldness,
    facialHair,
    ageDetail,
    expression: pick(seed, 'expression', v.expression),
    accessory,
  };
}
