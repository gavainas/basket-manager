// Voces por arquetipo: la misma situación dicha por ocho personas distintas.
//
// Hasta acá la personalidad decidía QUÉ siente el jugador (`pickEmotion` en
// `emotions.ts`) pero no CÓMO lo dice: los catorce del plantel compartían el
// mismo bolillero de frases, así que tapando el nombre no se sabía quién había
// hablado. El informe de testing lo llamó "voces de molde" (P1-8) y avisó que
// sin resolverlo cualquier contenido nuevo suena a plantilla.
//
// Acá vive la mecánica, no el contenido: cada sistema arma sus pools al lado de
// su lógica (vestuario en `emotions.ts`, excusas en `absences.ts`, asado en
// `asado.ts`), porque la frase se escribe mirando la situación, no una tabla.
//
// La regla es siempre la misma: **primero la frase del arquetipo; si no hay —o
// si ya se dijo en esta misma pantalla— cae en el pool genérico**. Por eso no
// hace falta escribir las ocho voces de entrada para cada situación: se agregan
// donde el contraste vale la pena (el mercenario y el cumplidor quejándose de
// lo mismo tienen que sonar a dos problemas distintos) y el resto sigue
// sonando como hasta ahora. Ampliar es agregar una clave al pool: nada que
// migrar, nada que romper.

import type { Personality } from './types';
import type { Rng } from './rng';

/** Frases propias de cada arquetipo para una situación. Todas opcionales. */
export type VoicePools = Partial<Record<Personality, string[]>>;

/** Recorre un pool desde `seed` y devuelve la primera frase no dicha (o null). */
function firstUnused(options: string[], seed: number, used?: Set<string>): string | null {
  if (options.length === 0) return null;
  const start = seed % options.length;
  for (let i = 0; i < options.length; i++) {
    const opt = options[(start + i) % options.length];
    if (!used?.has(opt)) {
      used?.add(opt);
      return opt;
    }
  }
  return null;
}

/**
 * Elección determinística (misma semilla → misma frase), para el vestuario:
 * la voz del arquetipo manda y el pool genérico es la red de seguridad.
 */
export function pickVoiced(
  personality: Personality,
  pools: VoicePools,
  generic: string[],
  seed: number,
  used?: Set<string>
): string {
  const own = pools[personality] ?? [];
  const mine = firstUnused(own, seed, used);
  if (mine) return mine;
  const fallback = firstUnused(generic, seed, used);
  if (fallback) return fallback;
  // Todo dicho en esta pantalla: que repita, pero que repita con su voz.
  const pool = own.length > 0 ? own : generic;
  return pool[seed % pool.length];
}

/**
 * Versión con azar, para lo que ya se sorteaba (excusas, respuestas al asado).
 * `ownWeight` deja que el arquetipo pese sin monopolizar: si un mercenario
 * tuviera siempre las mismas dos frases, cambiaríamos un molde por otro.
 */
export function pickVoicedRng(
  personality: Personality,
  pools: VoicePools,
  generic: string[],
  rng: Rng,
  opts: { used?: Set<string>; avoid?: string | null; ownWeight?: number } = {}
): string {
  const { used, avoid, ownWeight = 0.7 } = opts;
  const free = (list: string[]) => list.filter((t) => !used?.has(t) && t !== avoid);
  const own = free(pools[personality] ?? []);
  const rest = free(generic);
  let pool = own.length > 0 && (rest.length === 0 || rng.chance(ownWeight)) ? own : rest;
  if (pool.length === 0) pool = own.length > 0 ? own : generic;
  const text = rng.pick(pool);
  used?.add(text);
  return text;
}
