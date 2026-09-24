// El mapa social del vestuario: deriva grupos, puentes, parejas notables y
// aislados de las afinidades vivas (base + lo compartido: asados, sociedades,
// peleas). No guarda nada: se calcula al mirar, siempre al día.

import { affinity, FRIEND_THRESHOLD, personalityCompat, RIVALRY_THRESHOLD } from './relations';
import type { GameState, Player } from './types';

/**
 * Umbral para que un lazo arme grupo: más alto que la amistad simple (70),
 * si no el plantel inicial forma un solo bloque gigante y el mapa no cuenta nada.
 */
const GROUP_THRESHOLD = 77;

export interface SocialGroup {
  members: Player[];
  label: string;
  /** Afinidad promedio interna del grupo (0-100). */
  strength: number;
}

export interface NotablePair {
  a: Player;
  b: Player;
  kind: 'intimos' | 'chocan' | 'roce';
  text: string;
}

/**
 * Un jugador sin mesa fija: no arma grupo con nadie (ningún lazo llega al
 * umbral) pero tampoco está solo. El mapa dice con quién se junta y, si ese
 * compañero tiene grupo, a qué mesa se arrima.
 */
export interface SueltoEntry {
  p: Player;
  /** El compañero con el que mejor se lleva. */
  closest: Player;
  /** El grupo de ese compañero, si tiene. */
  mesa?: SocialGroup;
  text: string;
}

export interface SocialMapData {
  groups: SocialGroup[];
  /** Jugadores con buena onda en más de un grupo: pegamento del vestuario. */
  bridges: { p: Player; text: string }[];
  pairs: NotablePair[];
  /** Los que no tienen grupo fijo pero tampoco están solos. */
  sueltos: SueltoEntry[];
  loners: { p: Player; text: string }[];
  /** Qué tan unido está el plantel en promedio (0-100). */
  cohesion: number;
}

function apodo(p: Player): string {
  const quoted = p.name.match(/"([^"]+)"/);
  if (quoted) return quoted[1];
  return p.name.split(/\s+/).pop() ?? p.name;
}

/** Etiqueta con carácter para un grupo, según quiénes lo componen. */
function labelGroup(members: Player[], state: GameState): string {
  const avgAge = members.reduce((t, p) => t + p.age, 0) / members.length;
  const asados = state.asadoHistory ?? [];
  const attendance = (p: Player) => asados.filter((a) => a.attended.includes(p.id)).length;
  const avgAsados = members.reduce((t, p) => t + attendance(p), 0) / members.length;

  if (asados.length >= 2 && avgAsados >= asados.length * 0.8) return 'La mesa del asado';
  if (avgAge >= 31) return 'Los veteranos';
  if (avgAge <= 24) return 'Los pibes';
  const competitivos = members.filter((p) => p.personality === 'competitivo' || p.personality === 'protagonista');
  if (competitivos.length > members.length / 2) return 'Los que vienen a ganar';
  const leader = [...members].sort((a, b) => b.social - a.social)[0];
  return `La banda de${'aeiou'.includes(apodo(leader)[0]?.toLowerCase() ?? '') ? 'l' : ''} ${apodo(leader)}`;
}

/**
 * La pareja que no se banca: la de peor afinidad del plantel, si llega al
 * umbral de roce (la misma que el vestuario muestra con "hay que manejarlo",
 * sobre la que cae "Se fueron a las manos" y a la que sienta la acción de la
 * semana). Null si nadie llega al roce.
 */
export function worstPair(state: GameState): [Player, Player] | null {
  const ps = state.players.filter((p) => !p.leftClub);
  let worst: { a: Player; b: Player; v: number } | null = null;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const v = affinity(ps[i], ps[j], state.affinityBonus);
      if (!worst || v < worst.v) worst = { a: ps[i], b: ps[j], v };
    }
  }
  return worst && worst.v <= RIVALRY_THRESHOLD ? [worst.a, worst.b] : null;
}

/** Deriva el mapa social completo del plantel activo. */
export function buildSocialMap(state: GameState): SocialMapData {
  const players = state.players.filter((p) => !p.leftClub);
  const bonus = state.affinityBonus;
  const aff = (a: Player, b: Player) => affinity(a, b, bonus);

  // Componentes conexas con lazos fuertes (amistades).
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  players.forEach((p) => parent.set(p.id, p.id));

  let affSum = 0;
  let affCount = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const v = aff(players[i], players[j]);
      affSum += v;
      affCount += 1;
      if (v >= GROUP_THRESHOLD) union(players[i].id, players[j].id);
    }
  }
  const cohesion = affCount ? Math.round(affSum / affCount) : 50;

  const byRoot = new Map<string, Player[]>();
  for (const p of players) {
    const root = find(p.id);
    byRoot.set(root, [...(byRoot.get(root) ?? []), p]);
  }
  const rawGroups = [...byRoot.values()].filter((g) => g.length >= 2).sort((a, b) => b.length - a.length);

  const groups: SocialGroup[] = rawGroups.map((members) => {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        sum += aff(members[i], members[j]);
        n += 1;
      }
    }
    return { members, label: labelGroup(members, state), strength: n ? Math.round(sum / n) : 50 };
  });

  const inGroup = new Set(rawGroups.flat().map((p) => p.id));

  // Puentes: buena onda (≥55) con gente de dos grupos distintos.
  const bridges: { p: Player; text: string }[] = [];
  if (groups.length >= 2) {
    for (const p of players) {
      const linked = groups.filter((g) => !g.members.some((m) => m.id === p.id) && g.members.some((m) => aff(p, m) >= 55));
      const own = groups.find((g) => g.members.some((m) => m.id === p.id));
      const reach = linked.length + (own ? 1 : 0);
      if (reach >= 2 && linked.length >= 1) {
        bridges.push({ p, text: `Se sienta en cualquier mesa: tiene buena onda con ${reach} grupos.` });
        if (bridges.length >= 2) break;
      }
    }
  }

  // Parejas notables: los inseparables, los que chocan y el roce más picante.
  const pairs: NotablePair[] = [];
  let best: { a: Player; b: Player; v: number } | null = null;
  let clash: { a: Player; b: Player; v: number } | null = null;
  let worst: { a: Player; b: Player; v: number } | null = null;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      const v = aff(a, b);
      if (!best || v > best.v) best = { a, b, v };
      if (v >= 65 && personalityCompat(a.personality, b.personality) < 0 && (!clash || v > clash.v)) clash = { a, b, v };
      if (!worst || v < worst.v) worst = { a, b, v };
    }
  }
  if (best && best.v >= 78) {
    pairs.push({ a: best.a, b: best.b, kind: 'intimos', text: 'Uña y carne: donde va uno, va el otro.' });
  }
  if (clash) {
    pairs.push({
      a: clash.a,
      b: clash.b,
      kind: 'chocan',
      text: 'Como hermanos afuera… y se matan adentro de la cancha. Mejor no dejarlos marcándose.',
    });
  }
  if (worst && worst.v <= RIVALRY_THRESHOLD) {
    pairs.push({ a: worst.a, b: worst.b, kind: 'roce', text: 'No se bancan y el vestuario lo sabe: sentarlos a los dos es una acción de la semana.' });
  }

  // Aislados: sin ningún lazo que llegue a 50.
  const loners = players
    .filter((p) => !inGroup.has(p.id))
    .filter((p) => players.every((q) => q.id === p.id || aff(p, q) < 50))
    .map((p) => ({
      p,
      text:
        p.personality === 'mercenario'
          ? 'Viene, juega y se va: el grupo le da lo mismo.'
          : p.joinedSeason >= state.seasonNumber
            ? 'Recién llegado: todavía busca su lugar en la mesa.'
            : 'Va por la suya: saluda, entrena y no se queda a la birra.',
    }));

  // Los sueltos: sin grupo y sin ser aislados. Antes el mapa no los nombraba y
  // con doce en el plantel podía contar a seis y callarse sobre los otros seis.
  // Cada uno con su compañero más cercano y la mesa a la que se arrima.
  const lonerIds = new Set(loners.map((l) => l.p.id));
  const sueltos: SueltoEntry[] = [];
  for (const p of players) {
    if (inGroup.has(p.id) || lonerIds.has(p.id)) continue;
    let closest: Player | null = null;
    let best = -1;
    for (const q of players) {
      if (q.id === p.id) continue;
      const v = aff(p, q);
      if (v > best) {
        best = v;
        closest = q;
      }
    }
    if (!closest) continue;
    const mesa = groups.find((g) => g.members.some((m) => m.id === closest!.id));
    const amigo = best >= FRIEND_THRESHOLD;
    const text = mesa
      ? amigo
        ? `Amigo de ${closest.name}: se arrima a ${mesa.label} sin ser de la mesa.`
        : `Se sienta cerca de ${mesa.label}: con ${closest.name} se lleva bien, con el resto se saluda.`
      : amigo
        ? `Se junta con ${closest.name}, que tampoco tiene mesa fija.`
        : `Saluda a todos y no se queda con nadie: el más cercano es ${closest.name}.`;
    sueltos.push({ p, closest, mesa, text });
  }

  return { groups, bridges, pairs, sueltos, loners, cohesion };
}
