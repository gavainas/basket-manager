import type { Rival } from '../game/types';

export const RIVALS: Rival[] = [
  { id: 'r1', name: 'Deportivo La Curva', strength: 48, style: 'equilibrado' },
  { id: 'r2', name: 'Unión Vecinal', strength: 52, style: 'internos' },
  { id: 'r3', name: 'Ferro del Norte', strength: 56, style: 'corredores' },
  { id: 'r4', name: 'Los Cardales', strength: 59, style: 'tiradores' },
  { id: 'r5', name: 'Bohemios del Parque', strength: 62, style: 'equilibrado' },
  { id: 'r6', name: 'Cilindro Viejo', strength: 65, style: 'internos' },
  { id: 'r7', name: 'La Terminal', strength: 69, style: 'corredores' },
  { id: 'r8', name: 'Halcones de la Costa', strength: 73, style: 'tiradores' },
  { id: 'r9', name: 'Círculo Sportivo', strength: 78, style: 'equilibrado' },
];

/** Orden de partidos: arranca accesible, termina bravo, con altibajos. */
export const SCHEDULE_ORDER = ['r2', 'r1', 'r5', 'r3', 'r7', 'r4', 'r8', 'r6', 'r9'];
