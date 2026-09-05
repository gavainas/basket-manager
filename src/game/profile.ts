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

/**
 * El perfil típico de cada puesto, antes de la variación personal. Los valores
 * apuntan a cómo se reparte de verdad la producción en una cancha: los triples
 * los tiran sobre todo bases y escoltas, los rebotes los cierran los dos
 * grandes, y el pase pasa por el base.
 */
const BASE_POR_PUESTO: Record<Position, PlayerProfile> = {
  'Base': { outside: 68, inside: 16, vision: 86 },
  'Escolta': { outside: 76, inside: 26, vision: 52 },
  'Alero': { outside: 46, inside: 42, vision: 46 },
  'Ala-Pívot': { outside: 28, inside: 80, vision: 34 },
  'Pívot': { outside: 22, inside: 94, vision: 26 },
};

/** Cuánto se despega del perfil de su puesto un jugador cualquiera. */
const VARIACION = 24;

/**
 * Cada tanto sale uno que rompe el molde: el pívot que tira de tres, el base
 * que no la pasa pero mete, el alero que baja más rebotes que los grandes.
 *
 * Sin esto el puesto era un destino — medido: el 100% de los pívots salía
 * "Juego interior" y NINGUNO llegaba al tiro mínimo para intentar un triple.
 * Doce pívots en el mundo eran el mismo jugador. Con esto, uno de cada siete
 * tiene algo que no le corresponde al puesto, y esos son los que te acordás.
 */
const RAREZA = 0.14;
const EMPUJE_RARO = 34;

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

  // El que rompe el molde: un solo rasgo, empujado fuerte.
  const esRaro = roll(id, 'raro') < RAREZA;
  const cual = Math.floor(roll(id, 'cual') * 3);
  const empuje = (i: number) => (esRaro && cual === i ? EMPUJE_RARO * (0.7 + roll(id, 'fuerza') * 0.6) : 0);

  return {
    outside: clamp01a100(base.outside + desvio('out') + empuje(0)),
    inside: clamp01a100(base.inside + desvio('in') + empuje(1)),
    vision: clamp01a100(base.vision + desvio('vis') + empuje(2)),
  };
}

export function profileOf(p: Player): PlayerProfile {
  return profileFrom(p.id, p.position);
}

/** La etiqueta de alguien, leída contra lo que se espera de su puesto. */
export function labelOf(p: Player): string {
  return profileLabel(profileFrom(p.id, p.position), p.position);
}

export function profileOfWorld(wp: WorldPlayer): PlayerProfile {
  return profileFrom(wp.id, wp.position);
}

/**
 * La etiqueta que ve el jugador. Solo se pone cuando el rasgo se despega de
 * verdad del resto: si nadie manda, es "Completo" y no se dice nada.
 */
export function profileLabel(pf: PlayerProfile, position?: Position): string {
  // Un pívot con 58 de tiro es un tirador aunque un escolta con 58 no lo sea:
  // lo que hace noticia es despegarse de LO QUE SE ESPERA DE SU PUESTO.
  if (position) {
    const base = BASE_POR_PUESTO[position];
    if (base) {
      const sobre = {
        outside: pf.outside - base.outside,
        inside: pf.inside - base.inside,
        vision: pf.vision - base.vision,
      };
      const mayor = Math.max(sobre.outside, sobre.inside, sobre.vision);
      if (mayor >= 26) {
        if (mayor === sobre.outside) return 'Tirador';
        if (mayor === sobre.inside) return 'Juego interior';
        return 'Armador';
      }
    }
  }
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
export function profileNote(pf: PlayerProfile, position?: Position): string | null {
  switch (profileLabel(pf, position)) {
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
