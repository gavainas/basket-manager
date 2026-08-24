// La pirámide: ligas, divisionales, y los ascensos y descensos que las mueven
// al cierre de cada temporada.
//
// Reglas (las mismas para toda liga con ascensos, la juegue el club o no):
//   - Suben los 2 finalistas de la Copa de Oro de la divisional de ABAJO.
//   - Bajan los 2 últimos de la tabla regular de la divisional de ARRIBA.
//   - Los movimientos se resuelven de a pares de divisionales vecinas, así que
//     cada divisional termina con la misma cantidad de equipos con la que
//     empezó: dos se van, dos llegan.
//
// El club del usuario ocupa un lugar en su divisional (`state.rivals` son los
// otros). El resto del mundo vive en `state.worldDivisions`: la composición de
// cada divisional, que persiste entre temporadas. La identidad de un equipo es
// su NOMBRE — los ids son slots de divisional y se reasignan al moverse.

import {
  DIVISIONS,
  DIVISION_SEEDS,
  DIVISION_SLOT_PREFIX,
  LEAGUES,
  WORLD_DIVISION_IDS,
  leagueEntryOf,
} from '../data/worldData';
import { divisionStandings } from './world';
import { Rng, seedFromString } from './rng';
import type { Division, GameState, League, Rival } from './types';

/** Cuántos equipos suben y bajan entre dos divisionales vecinas. */
export const MOVE_COUNT = 2;

export function divisionById(id: string): Division | undefined {
  return DIVISIONS.find((d) => d.id === id);
}

export function leagueById(id: string): League | undefined {
  return LEAGUES.find((l) => l.id === id);
}

export function leagueOfDivision(divisionId: string): League | undefined {
  const div = divisionById(divisionId);
  return div ? leagueById(div.leagueId) : undefined;
}

/** Las divisionales de una liga, de la más alta a la más baja (level 1 = arriba). */
export function divisionsOfLeague(leagueId: string): Division[] {
  return DIVISIONS.filter((d) => d.leagueId === leagueId && WORLD_DIVISION_IDS.includes(d.id)).sort(
    (a, b) => a.level - b.level
  );
}

/** ¿Esta liga mueve equipos entre divisionales al cierre? */
export function leaguePromotes(leagueId: string): boolean {
  const entry = leagueEntryOf(leagueId);
  if (entry) return entry.promotes;
  // La liga donde arranca el club no se "entra desde afuera": tiene ascensos
  // si tiene más de una divisional.
  return divisionsOfLeague(leagueId).length > 1;
}

/**
 * La banda de nivel de cada divisional, sacada de su composición original.
 * Los equipos derivan dentro de su banda: la A sigue siendo la A diez
 * temporadas después, y la D sigue siendo la D.
 */
const DIVISION_BAND: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(DIVISION_SEEDS).map(([id, teams]) => {
    const values = teams.map((t) => t.strength);
    return [id, [Math.min(...values) - 3, Math.max(...values) + 3] as [number, number]];
  })
);

function bandOf(divisionId: string): [number, number] {
  return DIVISION_BAND[divisionId] ?? [20, 92];
}

/** Encaja una fuerza en la banda de su divisional (redondeada). */
function fitToBand(strength: number, divisionId: string): number {
  const [min, max] = bandOf(divisionId);
  return Math.max(min, Math.min(max, Math.round(strength)));
}

/** Ids de slot de una divisional: `lua1`, `luc7`, `ce2_3`… */
function slotId(divisionId: string, index: number): string {
  const prefix = DIVISION_SLOT_PREFIX[divisionId] ?? divisionId.replace(/[^a-z0-9]/g, '');
  return `${prefix}${index + 1}`;
}

/**
 * Reparte los slots de una divisional. La del club usa los ids clásicos
 * (`r1..rN`) y los ordena de menor a mayor fuerza, que es lo que espera el
 * orden de fixture (arranca accesible, termina bravo).
 */
export function reslot(teams: Rival[], divisionId: string, isUserDivision: boolean): Rival[] {
  const sorted = [...teams].sort((a, b) => (isUserDivision ? a.strength - b.strength : b.strength - a.strength));
  return sorted.map((t, i) => ({ ...t, id: isUserDivision ? `r${i + 1}` : slotId(divisionId, i) }));
}

/**
 * Orden de partidos de la temporada: arranca accesible, termina bravo, con
 * altibajos. Con 9 rivales es el orden histórico escrito a mano; con otra
 * cantidad (las ligas de torneo corto) se arma con la misma idea.
 */
export function scheduleFor(rivals: Rival[]): string[] {
  const n = rivals.length;
  if (n === 9) return ['r2', 'r1', 'r5', 'r3', 'r7', 'r4', 'r8', 'r6', 'r9'];
  // Los índices se ordenan por fuerza (r1 el más flojo) y se intercalan:
  // dos fáciles, uno duro, y los dos más bravos al final.
  const easy = rivals.slice(0, Math.ceil(n / 2)).map((r) => r.id);
  const hard = rivals.slice(Math.ceil(n / 2)).map((r) => r.id);
  const out: string[] = [];
  while (easy.length || hard.length) {
    if (easy.length) out.push(easy.shift()!);
    if (hard.length > 2 || (hard.length && !easy.length)) out.push(hard.shift()!);
  }
  return out;
}

/** Composición inicial de todas las divisionales del mundo menos la del club. */
export function initialWorldDivisions(userDivisionId: string): Record<string, Rival[]> {
  const out: Record<string, Rival[]> = {};
  for (const id of WORLD_DIVISION_IDS) {
    if (id === userDivisionId) continue;
    out[id] = DIVISION_SEEDS[id].map((t) => ({ ...t }));
  }
  return out;
}

/** Los rivales que le tocan al club si se anota en esta divisional. */
export function rivalsForDivision(state: GameState, divisionId: string): Rival[] {
  const stored = state.worldDivisions?.[divisionId];
  const base = stored && stored.length > 0 ? stored : DIVISION_SEEDS[divisionId] ?? [];
  return reslot(base, divisionId, true);
}

export interface JoinResult {
  /** La divisional que el club dejó (null si no se movió). */
  leftDivisionId: string | null;
  /** La liga le guarda el lugar al club (solo las que tienen categorías). */
  held: boolean;
}

/**
 * Mueve al club a otra divisional (inscripción o ascenso/descenso): rearma
 * rivales, tabla, fixture y largo de temporada, y deja al mundo consistente
 * (la divisional que dejó recupera sus slots; la nueva le hace lugar).
 */
export function joinDivision(state: GameState, divisionId: string): JoinResult {
  if (divisionId === state.divisionId) return { leftDivisionId: null, held: false };
  const from = state.divisionId;
  const fromLeague = leagueOfDivision(from);
  const toLeague = leagueOfDivision(divisionId);

  state.worldDivisions = { ...(state.worldDivisions ?? {}) };
  const incoming = rivalsForDivision(state, divisionId);
  // La divisional que deja recupera sus slots propios; el lugar del club queda
  // libre (esa divisional juega un año con un equipo menos).
  state.worldDivisions[from] = reslot(state.rivals, from, false);
  delete state.worldDivisions[divisionId];

  state.divisionId = divisionId;
  state.rivals = incoming;
  state.seasonLength = incoming.length;
  state.schedule = scheduleFor(incoming);
  state.standings = [
    { teamId: 'club', wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 },
    ...incoming.map((r) => ({ teamId: r.id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 })),
  ];

  // Lugares guardados: la liga con categorías te espera en la divisional que
  // dejaste; a la que volvés deja de guardarte nada.
  const held = new Set(state.heldDivisionIds ?? []);
  held.delete(divisionId);
  const changedLeague = fromLeague?.id !== toLeague?.id;
  const shouldHold = changedLeague && !!fromLeague && leaguePromotes(fromLeague.id);
  if (shouldHold) held.add(from);
  // Si el club se va de una liga sin categorías, no hay nada que guardar: se
  // vuelve cuando quiera por la misma puerta.
  state.heldDivisionIds = [...held];
  return { leftDivisionId: from, held: shouldHold };
}

/**
 * Qué le pasó al club esta temporada, sabido al cerrar las copas: sube, baja o
 * se queda. Es la misma regla que aplica `applyPromotionRelegation` — acá vive
 * aparte para poder cantarlo en la pantalla de fin de temporada, antes de que
 * el verano rearme el mundo.
 */
export function userSeasonFate(state: GameState): { kind: 'ascenso' | 'descenso'; division: Division } | null {
  const division = divisionById(state.divisionId);
  const league = division ? leagueById(division.leagueId) : undefined;
  if (!division || !league || !leaguePromotes(league.id)) return null;
  const divisions = divisionsOfLeague(league.id);
  const above = divisions.find((d) => d.level === division.level - 1);
  const below = divisions.find((d) => d.level === division.level + 1);

  const finalOro = state.playoffs?.ties.find((t) => t.cup === 'oro' && t.round === 'final');
  const inFinal = !!finalOro && (finalOro.homeId === 'club' || finalOro.awayId === 'club');
  if (above && inFinal) return { kind: 'ascenso', division: above };

  if (below) {
    const order = [...state.standings]
      .sort((a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst))
      .map((r) => r.teamId);
    if (order.slice(-MOVE_COUNT).includes('club')) return { kind: 'descenso', division: below };
  }
  return null;
}

// ---------- Ascensos y descensos ----------

interface Entry {
  key: string; // slot actual ('club' | 'r3' | 'lua7')
  name: string;
  strength: number;
  style: Rival['style'];
  isUser: boolean;
  division: string;
}

export interface PromotionResult {
  nextDivisionId: string;
  /** Los rivales de la divisional del club (slots r1..rN). */
  nextRivals: Rival[];
  /** El resto del mundo, ya movido. */
  nextWorldDivisions: Record<string, Rival[]>;
  notes: string[];
  userMoved: 'ascenso' | 'descenso' | null;
}

/** Simula 2 semifinales (1v4, 2v3) y devuelve las 2 keys ganadoras (los finalistas). */
function simulateSemifinals(top4: string[], strengthOf: (k: string) => number, seed: number): string[] {
  if (top4.length < 4) return top4.slice(0, MOVE_COUNT);
  const rng = new Rng(seed);
  const play = (a: string, b: string) => {
    const sa = strengthOf(a);
    const sb = strengthOf(b);
    return rng.chance(sa ** 2 / (sa ** 2 + sb ** 2)) ? a : b;
  };
  return [play(top4[0], top4[3]), play(top4[1], top4[2])];
}

/**
 * Calcula la composición de todas las divisionales para la próxima temporada.
 * Puro: no muta `state`. Lo llama startPreseason.
 */
export function applyPromotionRelegation(state: GameState): PromotionResult {
  const userDivision = state.divisionId;
  const worldDivisions = state.worldDivisions ?? {};

  // --- Foto de todo el mundo, divisional por divisional ---
  const entries: Entry[] = [
    {
      key: 'club',
      name: state.club.name,
      strength: 60,
      style: 'equilibrado',
      isUser: true,
      division: userDivision,
    },
    ...state.rivals.map((r) => ({ ...r, key: r.id, isUser: false, division: userDivision })),
  ];
  for (const [divisionId, teams] of Object.entries(worldDivisions)) {
    for (const t of teams) {
      entries.push({ ...t, key: t.id, isUser: false, division: divisionId });
    }
  }
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const strengthOf = (k: string) => byKey.get(k)?.strength ?? 50;
  const nameOf = (k: string) => byKey.get(k)?.name ?? k;

  /** Los equipos de una divisional ordenados de primero a último de la tabla. */
  const tableOf = (divisionId: string): string[] => {
    if (divisionId === userDivision) {
      return [...state.standings]
        .sort(
          (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
        )
        .map((r) => r.teamId);
    }
    const rows = divisionStandings(state.world, divisionId, state.seasonLength + 1, state.seasonNumber);
    const fromWorld = rows.map((r) => r.teamId.replace(/^tm_/, '')).filter((k) => byKey.get(k)?.division === divisionId);
    if (fromWorld.length > 0) return fromWorld;
    // El mundo todavía no materializó esa divisional (saves viejos): la tabla
    // sale del nivel, con un poco de azar determinista para que no sea calcada.
    const rng = new Rng(seedFromString(`tabla_${divisionId}_s${state.seasonNumber}`));
    return entries
      .filter((e) => e.division === divisionId)
      .map((e) => ({ key: e.key, score: e.strength + rng.int(-8, 8) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.key);
  };

  const nextDivision = new Map<string, string>(entries.map((e) => [e.key, e.division]));
  const promotedTo = new Map<string, string>(); // key -> divisional a la que sube
  const relegatedTo = new Map<string, string>(); // key -> divisional a la que baja
  const notes: string[] = [];

  for (const league of LEAGUES) {
    const divisions = divisionsOfLeague(league.id);
    if (divisions.length < 2 || !leaguePromotes(league.id)) continue;

    for (let i = 0; i + 1 < divisions.length; i++) {
      const upper = divisions[i];
      const lower = divisions[i + 1];

      // Suben: los 2 finalistas de la Copa de Oro de la de abajo.
      let promoted: string[] = [];
      if (lower.id === userDivision) {
        const fin = state.playoffs?.ties.find((t) => t.cup === 'oro' && t.round === 'final');
        if (fin) promoted = [fin.homeId, fin.awayId];
      } else {
        const top4 = tableOf(lower.id).slice(0, 4);
        promoted = simulateSemifinals(
          top4,
          strengthOf,
          seedFromString(`copa_${lower.id}_s${state.seasonNumber}`)
        );
      }
      promoted = promoted.filter((k) => byKey.get(k)?.division === lower.id);
      if (promoted.length < MOVE_COUNT) {
        const extra = tableOf(lower.id).filter((k) => !promoted.includes(k));
        promoted = [...promoted, ...extra].slice(0, MOVE_COUNT);
      }

      // Bajan: los 2 últimos de la tabla regular de la de arriba.
      const upperTable = tableOf(upper.id);
      const relegated = upperTable.slice(-MOVE_COUNT).filter((k) => byKey.get(k)?.division === upper.id);

      for (const k of promoted) {
        nextDivision.set(k, upper.id);
        promotedTo.set(k, upper.id);
      }
      for (const k of relegated) {
        nextDivision.set(k, lower.id);
        relegatedTo.set(k, lower.id);
      }

      // Las noticias son las de TU divisional: quién se te fue y quién llega.
      const others = (keys: string[]) => keys.filter((k) => k !== 'club').map(nameOf);
      if (lower.id === userDivision) {
        const up = others(promoted);
        if (up.length) notes.push(`Ascendieron a la ${upper.name}: ${up.join(' y ')}.`);
        const down = others(relegated);
        if (down.length) notes.push(`Bajan a la ${lower.name} y van a ser rivales nuestros: ${down.join(' y ')}.`);
      } else if (upper.id === userDivision) {
        const down = others(relegated);
        if (down.length) notes.push(`Descendieron a la ${lower.name}: ${down.join(' y ')}.`);
        const up = others(promoted);
        if (up.length) notes.push(`Suben de la ${lower.name} y los vamos a tener enfrente: ${up.join(' y ')}.`);
      }
    }
  }

  // --- Nueva composición de cada divisional ---
  const drift = new Rng(seedFromString(`ascensos_s${state.seasonNumber}`));
  const nextUserDivision = nextDivision.get('club') ?? userDivision;
  const grouped: Record<string, Rival[]> = {};
  for (const id of WORLD_DIVISION_IDS) grouped[id] = [];

  for (const e of entries) {
    if (e.isUser) continue;
    const target = nextDivision.get(e.key) ?? e.division;
    const bump = promotedTo.has(e.key) ? 2 : relegatedTo.has(e.key) ? -2 : 0;
    const moved: Rival = {
      id: e.key,
      name: e.name,
      style: e.style,
      // El que sube se refuerza un poco y el que baja se desarma, pero todos
      // terminan dentro de la banda de su nueva categoría.
      strength: fitToBand(e.strength + bump + drift.int(-4, 4), target),
    };
    (grouped[target] ??= []).push(moved);
  }

  const nextRivals = reslot(grouped[nextUserDivision] ?? [], nextUserDivision, true);
  const nextWorldDivisions: Record<string, Rival[]> = {};
  for (const [id, teams] of Object.entries(grouped)) {
    if (id === nextUserDivision) continue;
    nextWorldDivisions[id] = reslot(teams, id, false);
  }

  const userMoved =
    nextUserDivision === userDivision ? null : promotedTo.has('club') ? 'ascenso' : 'descenso';
  const userDivName = divisionById(userDivision)?.name ?? 'la divisional';
  const nextDivName = divisionById(nextUserDivision)?.name ?? 'otra divisional';
  if (userMoved === 'ascenso') {
    notes.unshift(`¡El club ascendió a la ${nextDivName}! Otra categoría, rivales más duros.`);
  }
  if (userMoved === 'descenso') {
    notes.unshift(`El club descendió a la ${nextDivName}. A pelear para volver a la ${userDivName}.`);
  }

  // Lo que pasa en la liga que te guarda el lugar mientras jugás en otra.
  for (const heldId of state.heldDivisionIds ?? []) {
    const heldDiv = divisionById(heldId);
    const heldLeague = heldDiv ? leagueById(heldDiv.leagueId) : undefined;
    if (heldDiv && heldLeague) {
      notes.push(
        `En la ${heldLeague.name} se jugaron los ascensos sin nosotros: el lugar en la ${heldDiv.name} sigue guardado.`
      );
    }
  }

  return { nextDivisionId: nextUserDivision, nextRivals, nextWorldDivisions, notes, userMoved };
}
