// Fragilidad física: la tendencia de cada jugador a lesionarse. Es un rasgo
// fijo derivado del id (determinista, no ocupa lugar en el save) más la edad:
// el cuerpo de un veterano perdona menos. La usan el partido en vivo, el
// entrenamiento y la lesión "jugando en otro lado" de la convocatoria.

import { clamp } from './balance';
import { Rng, seedFromString } from './rng';

/** Tendencia a lesionarse (0-100). Rasgo fijo del jugador + factura de la edad. */
export function fragilityOf(p: { id: string; age: number }): number {
  const trait = new Rng(seedFromString(`frag_${p.id}`)).int(0, 55);
  return clamp(trait + Math.max(0, p.age - 26) * 2, 0, 95);
}

/** Pista para la ficha: cómo describe el cuerpo médico (imaginario) al jugador. */
export function fragilityHint(f: number): { icon: string; text: string } {
  if (f >= 70) return { icon: '🩹', text: 'De cristal: cualquier partido puede terminar en el kinesiólogo.' };
  if (f >= 45) return { icon: '⚠️', text: 'Se resiente seguido: conviene cuidarle los minutos.' };
  if (f <= 20) return { icon: '🪨', text: 'Cuerpo noble: casi nunca se lesiona.' };
  return { icon: '✔️', text: 'Físicamente confiable: se lesiona lo normal.' };
}

/** Semanas de baja de una lesión nueva: los frágiles tardan más en volver. */
export function rollInjuryWeeks(fragility: number, rng: Rng): number {
  return rng.int(1, 2) + (fragility >= 60 && rng.chance(0.5) ? 1 : 0);
}

/** Elige un lesionado del grupo pesando por fragilidad (el frágil cae más seguido). */
export function pickByFragility<T extends { id: string; age: number }>(players: T[], rng: Rng): T {
  const weights = players.map((p) => 20 + fragilityOf(p));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < players.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return players[i];
  }
  return players[players.length - 1];
}

export const MATCH_INJURY_NOTES = [
  'cayó mal después de una bandeja y el tobillo dijo basta.',
  'se tomó el isquio corriendo una contra: sintió el pinchazo.',
  'chocó en la lucha por un rebote y quedó sentido el hombro.',
  'pisó un pie ajeno bajo el aro y se dobló el tobillo.',
  'sintió un tirón en la pantorrilla al volver a defender.',
];
