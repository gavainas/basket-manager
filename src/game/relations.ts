// Relaciones entre jugadores. Las afinidades son deterministas: se calculan
// a partir de atributos, personalidades y un ruido fijo por par de ids, así
// no hay que guardarlas ni migrarlas y son estables entre semanas.

import { clamp } from './balance';
import type { Personality, Player } from './types';

/** Hash simple y estable de un string a [0, 1). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Compatibilidad entre personalidades: quiénes se llevan bien y quiénes chocan. */
export function personalityCompat(a: Personality, b: Personality): number {
  const key = [a, b].sort().join('+');
  const table: Record<string, number> = {
    'social+social': 12,
    'social+veterano': 8,
    'leal+veterano': 10,
    'cumplidor+veterano': 6,
    'competitivo+competitivo': 6,
    'cumplidor+leal': 6,
    'protagonista+social': 4,
    'competitivo+talentoso_informal': -12,
    'cumplidor+talentoso_informal': -14,
    'protagonista+protagonista': -12,
    'leal+mercenario': -10,
    'mercenario+veterano': -6,
    'competitivo+protagonista': -6,
    'mercenario+mercenario': -4,
  };
  return table[key] ?? 0;
}

/** Clave estable de un par de jugadores (ids ordenados). */
export function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join('|');
}

/**
 * Afinidad entre dos compañeros (0-100). Simétrica y estable; el mapa opcional
 * de bonus (state.affinityBonus) suma lo vivido juntos: asados, sociedades, peleas.
 */
export function affinity(a: Player, b: Player, bonus?: Record<string, number>): number {
  const social = (a.social + b.social) / 2;
  const compat = personalityCompat(a.personality, b.personality);
  const ageGap = Math.min(8, Math.abs(a.age - b.age) * 0.8);
  const key = pairKey(a.id, b.id);
  const noise = (hash01(key) - 0.5) * 30;
  const lived = bonus?.[key] ?? 0;
  return clamp(Math.round(22 + social * 0.55 + compat - ageGap + noise + lived));
}

/** Cómo está la relación del jugador con vos, el entrenador (0-100). */
export function coachAffinity(p: Player): number {
  let v = 30 + p.motivation * 0.45 + p.commitment * 0.15;
  if (p.status === 'molesto') v -= 15;
  if (p.status === 'al_borde') v -= 30;
  v -= Math.min(15, p.weeksBenched * 5);
  return clamp(Math.round(v));
}

/** Peso del jugador en el vestuario (0-100): cariño recibido + logros + antigüedad. */
export function groupStanding(p: Player, teammates: Player[], currentSeason: number, bonus?: Record<string, number>): number {
  const others = teammates.filter((t) => t.id !== p.id && !t.leftClub);
  const received = others.length
    ? others.reduce((sum, t) => sum + affinity(t, p, bonus), 0) / others.length
    : 50;
  const mvps = p.matchLog.filter((m) => m.mvp).length;
  const seniority = Math.min(15, Math.max(0, currentSeason - p.joinedSeason) * 5);
  return clamp(Math.round(received * 0.7 + Math.min(15, mvps * 5) + seniority));
}

export const FRIEND_THRESHOLD = 70;
export const RIVALRY_THRESHOLD = 35;
