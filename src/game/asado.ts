// El asado como mecánica: se convoca, cada uno responde según su momento, sus
// amigos y su relación con el club, y la noche sale según quiénes aparecen.
// La lista es el juego: quién va importa tanto como cuántos.

import { BALANCE, clamp } from './balance';
import { affinity, pairKey, FRIEND_THRESHOLD } from './relations';
import { logPlayerEvent } from './timeline';
import { pickVoicedRng, type VoicePools } from './voices';
import type { AsadoPlan, AsadoReport, AsadoRsvp, AsadoTier, GameState, Player } from './types';
import type { Rng } from './rng';

const A = BALANCE.actions.asado;

function actives(s: GameState): Player[] {
  return s.players.filter((p) => !p.leftClub);
}

/** "No puedo": la vida, sin mirar el ánimo. */
const NO_PUEDE = [
  'Laburo hasta cualquier hora: no llega ni al postre.',
  'Compromiso familiar imposible de mover.',
  'Está fuera de la ciudad justo esa noche.',
  'Le toca cuidar a los pibes: "mandame foto del vacío".',
  'Le cambiaron el turno en el laburo. "A la próxima voy fija", jura.',
];

/** Cómo avisa cada uno que la vida le ganó (ver `voices.ts`). */
const NO_PUEDE_VOICES: VoicePools = {
  cumplidor: ['Le toca laburar y avisó tres días antes. Preguntó si podía mandar algo para la mesa igual.'],
  social: ['Tiene otro cumpleaños esa misma noche. "Dos asados no me da el cuerpo", se lamentó en serio.'],
  leal: ['No le da el día y lo dijo con culpa. Preguntó dos veces si no se podía mover para el viernes.'],
  veterano: ['Compromiso familiar de esos que a los cuarenta no se discuten.'],
};

/** Cuando el "no voy" es por ganas y no por agenda, cada uno lo dice a su modo. */
const DECLINE_VOICES: VoicePools = {
  competitivo: ['"¿Asado? Con lo mal que venimos jugando, prefiero entrenar", contestó, y no era chiste.'],
  social: ['Increíble pero cierto: dijo que no. "Ando con la cabeza en otra", admitió.'],
  protagonista: ['Preguntó quién más iba antes de contestar. La lista no lo convenció.'],
  leal: ['Dijo que no puede y lo repitió tres veces, como pidiendo perdón.'],
  mercenario: [
    '"Tengo otra cosa", dijo sin dar detalles. Como siempre.',
    'Preguntó si lo pagaba el club. Cuando le dijeron que no, se le complicó la agenda.',
  ],
  cumplidor: ['"Si es después de entrenar, voy; si es un jueves a las once, no." Era un jueves a las once.'],
  veterano: ['"A esta altura prefiero cenar en casa, muchachos. No se ofendan."'],
  talentoso_informal: ['"Veo y aviso", escribió. Nunca avisó.'],
};

/** Motivos de "no voy" cuando es por ganas: la bronca, la deuda o el personaje. */
function declineReason(p: Player, rng: Rng, used: Set<string>): string {
  if (p.status === 'molesto' || p.status === 'al_borde') {
    return rng.pick([
      '"No tengo ganas de ver a nadie", contestó seco.',
      'Dejó el visto. Sigue caliente con el club.',
      '"Vayan ustedes", tiró. La bronca le ganó al apetito.',
    ]);
  }
  if (p.feeStatus === 'pendiente' && p.weeksUnpaid >= 2) {
    return 'Debe cuotas y le da no sé qué sentarse a la mesa. "La próxima fija", prometió.';
  }
  return pickVoicedRng(p.personality, DECLINE_VOICES, NO_PUEDE, rng, { used });
}

/** Cuánto pesa la personalidad en las ganas de ir a un asado. */
function personalityPull(p: Player): number {
  switch (p.personality) {
    case 'social': return 0.15;
    case 'veterano': return 0.08;
    case 'cumplidor': return 0.05;
    case 'leal': return 0.05;
    case 'mercenario': return -0.18;
    case 'talentoso_informal': return -0.1;
    default: return 0;
  }
}

/**
 * Convoca al asado: cada jugador responde va / duda / no va. Determinista por
 * semana (se guarda en el estado): volver a proponerlo no cambia las respuestas.
 */
export function planAsado(s: GameState, rng: Rng): AsadoPlan {
  const squad = actives(s);
  const score = new Map<string, number>();
  const noPuede = new Map<string, string>();
  // La racha pesa: ganar da ganas de juntarse; perder seguido, de irse a casa.
  const recent = s.history.slice(-3);
  const streakAdj = recent.reduce((t, m) => t + (m.won ? 0.03 : -0.05), 0);
  // Excusas sin repetir en la misma convocatoria: dos con "los pibes" el mismo
  // jueves es mucha casualidad hasta para esta liga. El registro es compartido
  // con los "no voy" de más abajo, así toda la lista suena a catorce personas.
  const usedExcuses = new Set<string>();
  for (const p of squad) {
    // La vida no mira el ánimo: a algunos directamente no les da el calendario.
    if (rng.chance(A.noPuedeChance)) {
      noPuede.set(p.id, pickVoicedRng(p.personality, NO_PUEDE_VOICES, NO_PUEDE, rng, { used: usedExcuses }));
      continue;
    }
    let v =
      0.18 +
      p.social * 0.004 +
      p.motivation * 0.004 +
      s.club.socialClimate * 0.0015 +
      personalityPull(p) +
      streakAdj;
    if (p.status === 'molesto' || p.status === 'al_borde') v -= 0.3;
    // El lesionado va igual: está al pedo y extraña al grupo.
    if (p.status === 'lesionado') v += 0.05;
    if (p.feeStatus === 'pendiente' && p.weeksUnpaid >= 2) v -= 0.1;
    v += rng.range(-0.14, 0.14);
    score.set(p.id, v);
  }
  // Segunda pasada: si van los amigos, se prende. "¿Va el Chino? Ah, voy."
  const bonus = s.affinityBonus;
  for (const p of squad) {
    if (noPuede.has(p.id)) continue;
    const friendsGoing = squad.filter(
      (q) => q.id !== p.id && (score.get(q.id) ?? 0) >= A.rsvpYes && affinity(p, q, bonus) >= FRIEND_THRESHOLD
    ).length;
    if (friendsGoing > 0) score.set(p.id, (score.get(p.id) ?? 0) + Math.min(0.14, friendsGoing * 0.07));
  }
  const rsvps: AsadoRsvp[] = squad.map((p) => {
    const impediment = noPuede.get(p.id);
    if (impediment) return { playerId: p.id, answer: 'no_va', reason: impediment };
    const v = score.get(p.id) ?? 0;
    if (v >= A.rsvpYes) return { playerId: p.id, answer: 'va' };
    if (v >= A.rsvpMaybe) return { playerId: p.id, answer: 'duda' };
    return { playerId: p.id, answer: 'no_va', reason: declineReason(p, rng, usedExcuses) };
  });
  return { week: s.week, rsvps };
}

function tierFor(ratio: number): AsadoTier {
  if (ratio >= 0.8) return 'fieston';
  if (ratio >= 0.55) return 'bueno';
  if (ratio >= 0.35) return 'flojo';
  return 'papelon';
}

/** Suma vivencia compartida a un par (con techo, para que no explote). */
export function addPairBonus(s: GameState, aId: string, bId: string, amount: number): void {
  if (!s.affinityBonus) s.affinityBonus = {};
  const key = pairKey(aId, bId);
  const current = s.affinityBonus[key] ?? 0;
  s.affinityBonus[key] = Math.max(-12, Math.min(12, current + amount));
}

/**
 * La noche del asado: los confirmados casi siempre aparecen, los dudosos se
 * definen a último momento y siempre puede caer un sorpresa. Aplica todos los
 * efectos (clima, prestigio, motivación, afinidades) y devuelve el reporte.
 */
export function resolveAsado(s: GameState, rng: Rng): AsadoReport {
  const squad = actives(s);
  const plan = s.asadoPlan && s.asadoPlan.week === s.week ? s.asadoPlan : planAsado(s, rng);
  const attended: Player[] = [];
  const missed: { playerId: string; reason: string }[] = [];

  // Pools de excusas: si se caen dos en la misma noche, que no digan lo mismo.
  const BAILED_CONFIRMED = [
    '"Fija que voy", había dicho. Se cayó a último momento.',
    'Mandó audio a las 20:55: "no me lo vas a creer, se me complicó". Nadie le creyó.',
    'Había confirmado y clavó el visto. Apareció recién al otro día con una historia larguísima.',
  ];
  const BAILED_DOUBT = [
    'Al final no llegó: "quedé muerto del laburo, perdón".',
    'Dijo que avisaba a la tarde. Avisó, pero que no.',
    'Se quedó dormido en el sillón: "me senté un minuto y fue". Clásico.',
  ];
  const usedExcuses = new Set<string>();
  const freshExcuse = (pool: string[]): string => {
    const options = pool.filter((t) => !usedExcuses.has(t));
    const pick = rng.pick(options.length > 0 ? options : pool);
    usedExcuses.add(pick);
    return pick;
  };

  for (const rsvp of plan.rsvps) {
    const p = squad.find((x) => x.id === rsvp.playerId);
    if (!p) continue;
    if (rsvp.answer === 'va') {
      if (rng.chance(0.9)) attended.push(p);
      else missed.push({ playerId: p.id, reason: freshExcuse(BAILED_CONFIRMED) });
    } else if (rsvp.answer === 'duda') {
      if (rng.chance(0.5)) attended.push(p);
      else missed.push({ playerId: p.id, reason: freshExcuse(BAILED_DOUBT) });
    } else {
      if (rng.chance(0.08)) attended.push(p);
      else missed.push({ playerId: p.id, reason: rsvp.reason ?? 'No pudo.' });
    }
  }

  const ratio = squad.length > 0 ? attended.length / squad.length : 0;
  const tier = tierFor(ratio);
  const rained = rng.chance(A.rainChance);
  const factor = rained ? 0.5 : 1;
  const highlights: string[] = [];

  // El sorpresa que apareció sin avisar merece su línea.
  const surprise = attended.find((p) => plan.rsvps.some((r) => r.playerId === p.id && r.answer === 'no_va'));
  if (surprise) highlights.push(`${surprise.name} había dicho que no… y cayó igual, con el postre bajo el brazo.`);

  if (tier === 'fieston' || tier === 'bueno') {
    const big = tier === 'fieston';
    s.club.socialClimate = clamp(s.club.socialClimate + (A.climate + (big ? 4 : 0)) * factor);
    s.club.socialPrestige = clamp(s.club.socialPrestige + (A.socialPrestige + (big ? 2 : 0)) * factor);
    for (const p of attended) {
      p.motivation = clamp(p.motivation + (p.personality === 'social' ? 6 : 4) * factor);
      p.social = clamp(p.social + 2 * factor);
    }
    // La sobremesa deja sociedades: pares que compartieron mesa quedan más cerca.
    const pairs = big ? 3 : 1;
    const shuffled = rng.shuffle(attended);
    for (let i = 0; i + 1 < shuffled.length && i / 2 < pairs; i += 2) {
      addPairBonus(s, shuffled[i].id, shuffled[i + 1].id, 3);
      if (big && i === 0) {
        highlights.push(`${shuffled[i].name} y ${shuffled[i + 1].name} quedaron pegados en la sobremesa: nace una sociedad.`);
      }
    }
    if (big) {
      for (const p of attended) {
        logPlayerEvent(p, s.seasonNumber, s.week, 'social', `Estuvo en el asadazo de la semana ${s.week}: mesa llena y sobremesa larga.`);
      }
      if (rng.chance(0.35)) {
        s.memorableMoments.push(`Semana ${s.week}: el asado con ${attended.length} en la mesa que se va a contar por años.`);
        highlights.push('Hubo anécdota grande: de las que se cuentan por años.');
      }
      s.news.unshift({ week: s.week, text: `Asadazo del plantel: ${attended.length} en la mesa. El grupo está más unido que nunca.`, tone: 'good' });
    }
  } else if (tier === 'flojo') {
    s.club.socialClimate = clamp(s.club.socialClimate + 3 * factor);
    for (const p of attended) p.motivation = clamp(p.motivation + 2 * factor);
    highlights.push('Mesa corta y sobremesa tibia: se notaron las sillas vacías.');
  } else {
    // Papelón: convocaste y fueron cuatro gatos. El barrio se entera.
    s.club.socialClimate = clamp(s.club.socialClimate - 6);
    s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
    for (const p of actives(s)) {
      if (p.personality === 'social') p.motivation = clamp(p.motivation - 4);
    }
    s.news.unshift({ week: s.week, text: `El asado del plantel fue un papelón: ${attended.length} personas y carne de sobra.`, tone: 'bad' });
    highlights.push('Sobró carne, faltó gente. En el grupo nadie subió fotos.');
  }

  if (rained) highlights.push('Llovió y hubo que meterse bajo techo: sumó igual, pero menos.');

  const report: AsadoReport = {
    week: s.week,
    season: s.seasonNumber,
    attended: attended.map((p) => p.id),
    missed,
    ratio,
    tier,
    rained,
    highlights,
  };
  s.lastAsado = report;
  if (!s.asadoHistory) s.asadoHistory = [];
  s.asadoHistory.push({ week: s.week, ratio, good: ratio >= 0.55, attended: report.attended });
  s.asadoPlan = null;
  return report;
}

/** Resumen corto para el log de acciones. */
export function asadoSummary(report: AsadoReport, total: number): string {
  const n = report.attended.length;
  switch (report.tier) {
    case 'fieston':
      return `Fueron ${n} de ${total}: asadazo. Mesa llena, sobremesa larga y un grupo que se nota.`;
    case 'bueno':
      return `Fueron ${n} de ${total}: buen asado. La juntada dejó al grupo mejor.`;
    case 'flojo':
      return `Fueron ${n} de ${total}: zafó, pero se notaron las ausencias.`;
    case 'papelon':
      return `Fueron ${n} de ${total}: un papelón. Carne de sobra y mesa vacía.`;
  }
}

/** Semanas desde el último asado de la temporada (o desde el arranque si no hubo). */
export function weeksSinceAsado(s: GameState): number {
  const last = s.asadoHistory?.[s.asadoHistory.length - 1];
  return last ? s.week - last.week : s.week;
}
