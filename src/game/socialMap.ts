// El mapa social del vestuario: deriva grupos, puentes, parejas notables y
// aislados de las afinidades vivas (base + lo compartido: asados, sociedades,
// peleas). No guarda nada: se calcula al mirar, siempre al día.

import { affinity, personalityCompat, FRIEND_THRESHOLD, RIVALRY_THRESHOLD } from './relations';
import type { GameState, Player } from './types';

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

export interface SocialMapData {
  groups: SocialGroup[];
  /** Jugadores con buena onda en más de un grupo: pegamento del vestuario. */
  bridges: { p: Player; text: string }[];
  pairs: NotablePair[];
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
      if (v >= FRIEND_THRESHOLD) union(players[i].id, players[j].id);
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
    pairs.push({ a: worst.a, b: worst.b, kind: 'roce', text: 'No se bancan y el vestuario lo sabe: hay que manejarlo.' });
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

  return { groups, bridges, pairs, loners, cohesion };
}
