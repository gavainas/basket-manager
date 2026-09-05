// Perfil de juego: qué CLASE de jugador es, no cuán bueno es.
//
// La técnica dice cuánto rinde; el perfil dice de qué manera. Un pívot y un
// base con la misma técnica valían lo mismo en la planilla — con esto, el base
// tira de tres y reparte, el pívot baja rebotes y tapa.
//
// ## Por qué no son atributos guardados
//
// El perfil se **deriva del id de la persona**, igual que el escudo del club
// (`crest.ts`), la cara (`appearance.ts`) y los atributos que `worldToMarket`
// le inventa a un fichable del mundo. Eso da tres cosas:
//
// - **No engorda el save**: 348 personas del mundo × 3 números que no se guardan.
// - **No hay migración**: los saves viejos calculan el perfil igual que los nuevos.
// - **No se le llena la ficha de barras al jugador**: el motor lee números, la
//   pantalla muestra una etiqueta ("Tirador", "Juego interior").
//
// Y es estable: el mismo tipo tiene el mismo perfil entre pantallas, entre
// sesiones y entre temporadas, la juegue con la camiseta que la juegue.
//
// **Regla de oro para tocar esto**: los perfiles base por puesto se pueden
// afinar, pero el hash NO se toca — cambiarlo le cambia el perfil a todo el
// mundo de golpe, y el pívot tirador que Gabi conocía deja de existir.

import type { Player, Position, WorldPlayer } from './types';

/** Cómo juega alguien. Los tres van de 0 a 100 y son independientes entre sí. */
export interface PlayerProfile {
  /** Cuánto tira de afuera. Manda los triples. */
  outside: number;
  /** Cuánto vive cerca del aro. Manda rebotes y tapones. */
  inside: number;
  /** Cuánto reparte. Manda las asistencias. */
  vision: number;
}

/** El perfil típico de cada puesto, antes de la variación personal. */
const BASE_POR_PUESTO: Record<Position, PlayerProfile> = {
  'Base': { outside: 60, inside: 18, vision: 86 },
  'Escolta': { outside: 78, inside: 26, vision: 54 },
  'Alero': { outside: 54, inside: 50, vision: 48 },
  'Ala-Pívot': { outside: 26, inside: 78, vision: 36 },
  'Pívot': { outside: 11, inside: 92, vision: 26 },
};

/**
 * Cuánto se puede despegar alguien del perfil de su puesto. Amplio a propósito:
 * el pívot que tira de tres y el base que no la pasa son los que hacen que un
 * plantel se sienta un plantel y no cinco puestos.
 */
const VARIACION = 24;

/** FNV-1a de 32 bits. El mismo que usan `crest.ts` y `appearance.ts`. */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Un valor 0..1 estable por persona y por rasgo. */
function roll(seed: string, rasgo: string): number {
  return hash32(`${seed}:perfil:${rasgo}`) / 0xffffffff;
}

const clamp01a100 = (v: number) => Math.max(2, Math.min(98, Math.round(v)));

/**
 * El perfil de una persona a partir de su id y su puesto. Determinístico: la
 * misma persona siempre devuelve lo mismo.
 */
export function profileFrom(id: string, position: Position): PlayerProfile {
  const base = BASE_POR_PUESTO[position] ?? BASE_POR_PUESTO['Alero'];
  const desvio = (rasgo: string) => (roll(id, rasgo) - 0.5) * 2 * VARIACION;
  return {
    outside: clamp01a100(base.outside + desvio('out')),
    inside: clamp01a100(base.inside + desvio('in')),
    vision: clamp01a100(base.vision + desvio('vis')),
  };
}

export function profileOf(p: Player): PlayerProfile {
  return profileFrom(p.id, p.position);
}

export function profileOfWorld(wp: WorldPlayer): PlayerProfile {
  return profileFrom(wp.id, wp.position);
}

/**
 * La etiqueta que ve el jugador. Solo se pone cuando el rasgo se despega de
 * verdad del resto: si nadie manda, es "Completo" y no se dice nada.
 */
export function profileLabel(pf: PlayerProfile): string {
  const alto = Math.max(pf.outside, pf.inside, pf.vision);
  const otros = [pf.outside, pf.inside, pf.vision].filter((v) => v !== alto);
  const segundo = Math.max(...otros, 0);
  if (alto < 62 || alto - segundo < 14) return 'Completo';
  if (alto === pf.outside) return 'Tirador';
  if (alto === pf.inside) return 'Juego interior';
  return 'Armador';
}

/**
 * La frase para la ficha: lo mismo que la etiqueta, pero contado. Devuelve
 * null cuando no hay nada distintivo que decir — el silencio es mejor que
 * "es un jugador equilibrado" en las doce fichas del plantel.
 */
export function profileNote(pf: PlayerProfile): string | null {
  switch (profileLabel(pf)) {
    case 'Tirador':
      return pf.outside >= 82 ? 'Si le dejás el tiro de afuera, la mete.' : 'Se siente cómodo tirando de afuera.';
    case 'Juego interior':
      return pf.inside >= 86 ? 'Vive abajo del aro: rebotea y tapa.' : 'Trabaja cerca del aro.';
    case 'Armador':
      return pf.vision >= 86 ? 'Ve el pase antes que nadie.' : 'Le gusta hacer jugar al de al lado.';
    default:
      return null;
  }
}
