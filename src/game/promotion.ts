// Ascensos y descensos al cierre de temporada.
// Regla: ascienden los 2 finalistas de la Copa de Oro de la divisional de ABAJO;
// descienden los 2 últimos de la tabla regular de la de ARRIBA. Los equipos se
// mueven entre los dos pools (state.rivals = la divisional del usuario, con slots
// r1..r9 + el club; state.otherDivisionTeams = la otra, slots o1..o10). Si al club
// le toca subir o bajar, cambia state.divisionId y se reasigna todo por slot.

import { divisionStandings } from './world';
import { Rng, seedFromString } from './rng';
import type { GameState, Rival, RivalStyle } from './types';

export const HIGHER_DIV = 'dv_lu_a'; // level 1 (la de arriba)
export const LOWER_DIV = 'dv_lu_b'; // level 2 (la de abajo)

interface Ref {
  key: string; // id actual: 'club' | 'r1'.. | 'o1'..
  name: string;
  strength: number;
  style: RivalStyle;
  isUser: boolean;
  division: string;
}

export interface PromotionResult {
  nextDivisionId: string;
  nextRivals: Rival[]; // 9 equipos, slots r1..r9
  nextOtherTeams: Rival[]; // 10 equipos, slots o1..o10
  notes: string[];
  userMoved: 'ascenso' | 'descenso' | null;
}

/** world team id 'tm_o1' -> id de otherDivisionTeams 'o1'. */
function otherKey(worldTeamId: string): string {
  return worldTeamId.replace(/^tm_/, '');
}

/** Simula 2 semifinales (1v4, 2v3) y devuelve las 2 keys ganadoras (los finalistas). */
function simulateSemifinals(top4: string[], strengthOf: (k: string) => number, seed: number): string[] {
  if (top4.length < 4) return top4.slice(0, 2);
  const rng = new Rng(seed);
  const play = (a: string, b: string) => {
    const sa = strengthOf(a);
    const sb = strengthOf(b);
    return rng.chance(sa ** 2 / (sa ** 2 + sb ** 2)) ? a : b;
  };
  return [play(top4[0], top4[3]), play(top4[1], top4[2])];
}

/**
 * Calcula la composición de las dos divisionales para la próxima temporada.
 * Puro: no muta `state`. Lo llama startPreseason.
 */
export function applyPromotionRelegation(state: GameState): PromotionResult {
  const userDiv = state.divisionId;
  const otherDiv = userDiv === LOWER_DIV ? HIGHER_DIV : LOWER_DIV;
  const userInLower = userDiv === LOWER_DIV;

  const refs: Ref[] = [
    { key: 'club', name: state.club.name, strength: 60, style: 'equilibrado', isUser: true, division: userDiv },
    ...state.rivals.map((r) => ({ key: r.id, name: r.name, strength: r.strength, style: r.style, isUser: false, division: userDiv })),
    ...state.otherDivisionTeams.map((t) => ({ key: t.id, name: t.name, strength: t.strength, style: t.style, isUser: false, division: otherDiv })),
  ];
  const byKey = (k: string) => refs.find((x) => x.key === k);
  const strengthOf = (k: string) => byKey(k)?.strength ?? 50;

  // --- Ascienden: 2 finalistas de la Copa de Oro de la divisional de ABAJO ---
  let promoted: string[] = [];
  if (userInLower) {
    const fin = state.playoffs?.ties.find((t) => t.cup === 'oro' && t.round === 'final');
    if (fin) promoted = [fin.homeId, fin.awayId];
  } else {
    const table = divisionStandings(state.world, LOWER_DIV, state.seasonLength + 1, state.seasonNumber);
    const top4 = table.slice(0, 4).map((r) => otherKey(r.teamId));
    promoted = simulateSemifinals(top4, strengthOf, seedFromString(`copa_${LOWER_DIV}_s${state.seasonNumber}`));
  }
  promoted = promoted.filter((k) => byKey(k)?.division === LOWER_DIV);
  if (promoted.length < 2) {
    // Fallback robusto: los más fuertes de la divisional de abajo que falten.
    const extra = refs
      .filter((r) => r.division === LOWER_DIV && !promoted.includes(r.key))
      .sort((a, b) => b.strength - a.strength)
      .map((r) => r.key);
    promoted = [...promoted, ...extra].slice(0, 2);
  }

  // --- Descienden: 2 últimos de la tabla regular de la divisional de ARRIBA ---
  let relegated: string[];
  if (!userInLower) {
    const sorted = [...state.standings].sort(
      (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
    );
    relegated = sorted.slice(-2).map((r) => r.teamId);
  } else {
    const table = divisionStandings(state.world, HIGHER_DIV, state.seasonLength + 1, state.seasonNumber);
    relegated = table.slice(-2).map((r) => otherKey(r.teamId));
  }
  relegated = relegated.filter((k) => byKey(k)?.division === HIGHER_DIV);
  if (relegated.length < 2) {
    const extra = refs
      .filter((r) => r.division === HIGHER_DIV && !relegated.includes(r.key))
      .sort((a, b) => a.strength - b.strength)
      .map((r) => r.key);
    relegated = [...relegated, ...extra].slice(0, 2);
  }

  // --- Próxima división de cada equipo (los que suben/bajan cambian) ---
  const promotedSet = new Set(promoted);
  const relegatedSet = new Set(relegated);
  const nextDivOf = (r: Ref) =>
    promotedSet.has(r.key) ? HIGHER_DIV : relegatedSet.has(r.key) ? LOWER_DIV : r.division;

  const nextUserDiv = nextDivOf(byKey('club')!);
  const drift = new Rng(seedFromString(`ascensos_s${state.seasonNumber}`));
  const carry = (r: Ref, bump: number) => Math.max(40, Math.min(90, r.strength + bump + drift.int(-4, 4)));

  const nonUser = refs.filter((r) => !r.isUser);
  const bumpOf = (r: Ref) => (promotedSet.has(r.key) ? 2 : relegatedSet.has(r.key) ? -2 : 0);
  const nextRivals: Rival[] = nonUser
    .filter((r) => nextDivOf(r) === nextUserDiv)
    .map((r, i) => ({ id: `r${i + 1}`, name: r.name, strength: carry(r, bumpOf(r)), style: r.style }));
  const nextOtherTeams: Rival[] = nonUser
    .filter((r) => nextDivOf(r) !== nextUserDiv)
    .map((r, i) => ({ id: `o${i + 1}`, name: r.name, strength: carry(r, bumpOf(r)), style: r.style }));

  // --- Notas para anunciar (el club se comunica aparte) ---
  const notes: string[] = [];
  const upNames = promoted.filter((k) => k !== 'club').map((k) => byKey(k)?.name).filter(Boolean);
  const downNames = relegated.filter((k) => k !== 'club').map((k) => byKey(k)?.name).filter(Boolean);
  if (upNames.length) notes.push(`Ascendieron a la Divisional A: ${upNames.join(' y ')}.`);
  if (downNames.length) notes.push(`Descendieron a la Divisional B: ${downNames.join(' y ')}.`);
  const userMoved = nextUserDiv === userDiv ? null : nextUserDiv === HIGHER_DIV ? 'ascenso' : 'descenso';
  if (userMoved === 'ascenso') notes.unshift('¡El club ascendió a la Divisional A! Otra categoría, rivales más duros.');
  if (userMoved === 'descenso') notes.unshift('El club descendió a la Divisional B. A pelear para volver.');

  return { nextDivisionId: nextUserDiv, nextRivals, nextOtherTeams, notes, userMoved };
}
