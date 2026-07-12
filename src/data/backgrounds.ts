// Datos personales de los jugadores: profesiones, clubes de origen, alturas.
// Todo se sortea acá para que ningún componente de UI hardcodee valores.

import type { Hand, Position } from '../game/types';
import type { Rng } from '../game/rng';

export const PROFESSIONS = [
  'Profesor de educación física',
  'Contador',
  'Albañil',
  'Empleado bancario',
  'Repartidor',
  'Kinesiólogo',
  'Programador',
  'Electricista',
  'Vendedor de autos usados',
  'Estudiante crónico',
  'Enfermero',
  'Carpintero',
  'Remisero',
  'Empleado municipal',
  'Abogado',
  'Cocinero',
  'Docente de secundaria',
  'Gomero',
] as const;

export const PREVIOUS_TEAMS = [
  'Inferiores del club',
  'Los picados del parque',
  'El torneo de la oficina',
  'Deportivo La Curva',
  'Unión Vecinal',
  'Ferro del Norte',
  'Un club de barrio que ya no existe',
  'Liga federada regional',
  'El equipo de la facultad',
  'Sin club conocido',
] as const;

const HEIGHT_RANGES: Record<Position, [number, number]> = {
  Base: [172, 186],
  Escolta: [178, 192],
  Alero: [183, 196],
  'Ala-Pívot': [188, 201],
  Pívot: [192, 207],
};

export interface Background {
  height: number;
  hand: Hand;
  profession: string;
  previousTeam: string;
}

/** Sortea los datos personales de un jugador según su posición. */
export function rollBackground(position: Position, rng: Rng): Background {
  const [min, max] = HEIGHT_RANGES[position];
  return {
    height: rng.int(min, max),
    hand: rng.chance(0.15) ? 'zurda' : 'derecha',
    profession: rng.pick(PROFESSIONS),
    previousTeam: rng.pick(PREVIOUS_TEAMS),
  };
}
