import { asadoSummary, resolveAsado } from './asado';
import { BALANCE, clamp } from './balance';
import { coachBoostsTraining } from './coach';
import { createRecruit } from '../data/recruits';
import { pickByFragility } from './injuries';
import { logClubEvent } from './timeline';
import type { GameState, Player } from './types';
import type { Rng } from './rng';

export interface ActionAvailability {
  ok: boolean;
  reason?: string;
}

export interface ActionDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  costLabel: string;
  oncePerSeason?: boolean;
  available: (state: GameState) => ActionAvailability;
  /** Muta el estado (ya clonado) y devuelve el texto del resultado. */
  apply: (state: GameState, rng: Rng) => string;
}

const A = BALANCE.actions;

function actives(s: GameState): Player[] {
  return s.players.filter((p) => !p.leftClub);
}

function needMoney(s: GameState, cost: number): ActionAvailability {
  return s.club.money >= cost ? { ok: true } : { ok: false, reason: `Necesitás $${cost}` };
}

function spend(s: GameState, concept: string, amount: number): void {
  s.club.money -= amount;
  s.ledger.push({ week: s.week, concept, amount: -amount });
}

function earn(s: GameState, concept: string, amount: number): void {
  s.club.money += amount;
  s.ledger.push({ week: s.week, concept, amount });
}

export const ACTIONS: ActionDef[] = [
  {
    id: 'training',
    name: 'Organizar entrenamiento',
    icon: '🏋️',
    description: 'Un entrenamiento extra en la semana. Mejora el físico y el orden, con leve riesgo de lesión.',
    costLabel: `Cuesta $${A.training.cost}`,
    available: (s) => needMoney(s, A.training.cost),
    apply: (s, rng) => {
      spend(s, 'Alquiler para entrenamiento', A.training.cost);
      s.club.organization = clamp(s.club.organization + 3);
      const T = A.training;
      let improved = 0;
      const skipped: string[] = [];
      const attendees: Player[] = [];
      for (const p of actives(s)) {
        if (p.status === 'lesionado') continue;
        // Asistencia: los informales y los de poco compromiso faltan seguido.
        const skipChance =
          p.personality === 'talentoso_informal'
            ? T.skipChanceInformal
            : p.commitment < T.lowCommitmentThreshold
              ? T.skipChanceLowCommitment
              : 0;
        if (skipChance > 0 && rng.chance(skipChance)) {
          skipped.push(p.name);
          continue;
        }
        attendees.push(p);
        p.seasonTrainings += 1;
        p.physical = clamp(p.physical + T.physical);
        p.motivation = clamp(p.motivation + (p.personality === 'competitivo' ? 3 : 1));
        // Progresión real: jóvenes comprometidos crecen; en su plenitud, solo los muy dedicados.
        // Un DT que enseña multiplica el progreso del entrenamiento.
        const coachBonus = coachBoostsTraining(s.coach) ? 1.5 : 1;
        const canGrow =
          (p.age <= 25 && p.commitment >= 50 && rng.chance(T.youngImproveChance * coachBonus)) ||
          (p.age >= 26 && p.age <= 30 && p.commitment >= 70 && rng.chance(T.primeImproveChance * coachBonus));
        if (canGrow && p.technique < 90) {
          p.technique += 1;
          p.techniqueGain += 1;
          improved += 1;
          // Cada 2 puntos ganados, el salto se nota también en la valoración visible.
          if (p.techniqueGain % 2 === 0) {
            p.visibleRating += 1;
            s.news.unshift({
              week: s.week,
              text: `${p.name} está dando un salto: se lo ve mejor que a principio de temporada.`,
              tone: 'good',
            });
          }
        }
      }
      const absent =
        skipped.length === 0 ? '' : skipped.length === 1 ? ` Faltó ${skipped[0]}.` : ` Faltaron ${skipped.join(' y ')}.`;
      if (attendees.length > 0 && rng.chance(A.training.injuryChance)) {
        // El que se resiente no es al azar: los cuerpos frágiles pagan primero.
        const injured = pickByFragility(attendees, rng);
        injured.status = 'lesionado';
        injured.injuryWeeks = 1;
        s.news.unshift({ week: s.week, text: `${injured.name} se resintió en el entrenamiento. Una semana afuera.`, tone: 'bad' });
        return `Buen entrenamiento, pero ${injured.name} terminó tocado (1 semana afuera).${absent}`;
      }
      return improved > 0
        ? `Entrenamiento intenso: el plantel mejoró el físico y algún joven mostró progresos que ilusionan.${absent}`
        : `Entrenamiento intenso: el plantel mejoró su estado físico y el club se ve más ordenado.${absent}`;
    },
  },
  {
    id: 'asado',
    name: 'Organizar asado',
    icon: '🍖',
    description:
      'Convocás al plantel a un asado: cada uno confirma según su momento. Si va la mayoría, el grupo sale otro; si van cuatro, es un papelón.',
    costLabel: `Cuesta $${A.asado.cost} (según quiénes vayan)`,
    available: (s) => needMoney(s, A.asado.cost),
    apply: (s, rng) => {
      spend(s, 'Asado del plantel', A.asado.cost);
      const report = resolveAsado(s, rng);
      return asadoSummary(report, actives(s).length);
    },
  },
  {
    id: 'raffle',
    name: 'Hacer una rifa',
    icon: '🎟️',
    description: 'Organizar una rifa en el barrio. Recauda según el prestigio social del club.',
    costLabel: `Cuesta $${A.raffle.cost} (recauda según prestigio)`,
    available: (s) => needMoney(s, A.raffle.cost),
    apply: (s, rng) => {
      spend(s, 'Premios y papelería de la rifa', A.raffle.cost);
      let income = rng.int(A.raffle.incomeMin, A.raffle.incomeMax);
      income = Math.round(income * (0.7 + (s.club.socialPrestige / 100) * 0.6));
      if (s.club.organization < 40 && rng.chance(0.4)) {
        income = Math.round(income / 2);
        earn(s, 'Rifa (mal organizada)', income);
        s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
        return `La rifa fue un caos: números repetidos y quejas. Se recaudaron solo $${income}.`;
      }
      earn(s, 'Recaudación de la rifa', income);
      s.club.socialPrestige = clamp(s.club.socialPrestige + 1);
      return `La rifa recaudó $${income}. El barrio respondió.`;
    },
  },
  {
    id: 'sponsor',
    name: 'Buscar sponsor',
    icon: '🤝',
    description: 'Golpear puertas de comercios de la zona buscando un aporte semanal.',
    costLabel: 'Gratis (éxito según prestigio)',
    available: (s) =>
      s.sponsorWeeks > 0 ? { ok: false, reason: 'Ya tenés un sponsor activo' } : { ok: true },
    apply: (s, rng) => {
      const chance = A.sponsorSearch.baseChance + (s.club.sportPrestige + s.club.socialPrestige) * A.sponsorSearch.prestigeFactor;
      if (rng.chance(chance)) {
        s.sponsorWeeks = BALANCE.economy.sponsorDurationWeeks;
        s.news.unshift({ week: s.week, text: `La pizzería del barrio auspicia al club: $${BALANCE.economy.sponsorWeekly} por semana.`, tone: 'good' });
        return `¡Conseguimos sponsor! La pizzería del barrio aporta $${BALANCE.economy.sponsorWeekly} semanales durante ${BALANCE.economy.sponsorDurationWeeks} semanas.`;
      }
      return 'Recorrimos varios comercios pero nadie se animó a poner plata. Quizás con más prestigio…';
    },
  },
  {
    id: 'talk',
    name: 'Hablar con un jugador molesto',
    icon: '💬',
    description: 'Sentarse a charlar con el jugador más caliente del plantel para bajar la espuma.',
    costLabel: 'Gratis (puede salir mal)',
    available: (s) =>
      actives(s).some((p) => p.status === 'molesto' || p.status === 'al_borde')
        ? { ok: true }
        : { ok: false, reason: 'No hay jugadores molestos' },
    apply: (s, rng) => {
      const upset = actives(s)
        .filter((p) => p.status === 'molesto' || p.status === 'al_borde')
        .sort((a, b) => (a.status === 'al_borde' ? -1 : 1) - (b.status === 'al_borde' ? -1 : 1) || a.motivation - b.motivation);
      const target = upset[0];
      if (rng.chance(A.talk.failChance)) {
        target.motivation = clamp(target.motivation - 5);
        return `La charla con ${target.name} terminó mal: sintió que eran excusas y quedó peor.`;
      }
      target.motivation = clamp(target.motivation + A.talk.motivationBoost);
      target.status = 'disponible';
      target.weeksUpset = 0;
      return `Larga charla con ${target.name}. Se fue más tranquilo y con ganas de volver a jugar.`;
    },
  },
  {
    id: 'collect',
    name: 'Cobrar cuotas atrasadas',
    icon: '💰',
    description: 'Pasar la gorra entre los deudores. Recupera plata pero puede caer mal.',
    costLabel: 'Gratis (puede molestar)',
    available: (s) =>
      actives(s).some((p) => p.feeStatus === 'pendiente')
        ? { ok: true }
        : { ok: false, reason: 'No hay cuotas pendientes' },
    apply: (s, rng) => {
      const debtors = actives(s).filter((p) => p.feeStatus === 'pendiente');
      let collected = 0;
      let paidCount = 0;
      for (const p of debtors) {
        const payChance = 0.15 + (p.commitment / 100) * 0.75;
        if (rng.chance(payChance)) {
          const owed = BALANCE.economy.feeWeekly * Math.min(Math.max(p.weeksUnpaid, 1), 3);
          collected += owed;
          paidCount += 1;
          p.feeStatus = 'pagada';
          p.weeksUnpaid = 0;
        }
        const hit = p.personality === 'mercenario' || p.personality === 'talentoso_informal' ? A.collectFees.motivationHit - 2 : A.collectFees.motivationHit;
        p.motivation = clamp(p.motivation + hit);
        if (p.motivation < BALANCE.weekly.lowMotivationThreshold && p.status === 'disponible') {
          p.status = 'molesto';
          p.weeksUpset = 0;
        }
      }
      if (collected > 0) earn(s, `Cuotas atrasadas (${paidCount} jugadores)`, collected);
      const grumbled = debtors.length - paidCount;
      return paidCount > 0
        ? `Se recuperaron $${collected} de ${paidCount} deudor${paidCount > 1 ? 'es' : ''}.${grumbled > 0 ? ` ${grumbled} siguen debiendo y quedaron masticando bronca.` : ''}`
        : 'Nadie pagó. Puras excusas, y encima algunos quedaron molestos por el apriete.';
    },
  },
  {
    id: 'scholarship',
    name: 'Becar a un jugador importante',
    icon: '🎓',
    description: 'Eximir de la cuota a la figura del equipo para retenerlo. Los que pagan pueden molestarse.',
    costLabel: 'Resigna su cuota semanal',
    available: (s) =>
      actives(s).some((p) => p.feeStatus !== 'beca_total')
        ? { ok: true }
        : { ok: false, reason: 'Todos ya tienen beca' },
    apply: (s, rng) => {
      const candidates = actives(s).filter((p) => p.feeStatus !== 'beca_total');
      candidates.sort((a, b) => {
        const prio = (p: Player) => p.technique + (p.personality === 'mercenario' ? 15 : 0) + (p.feeStatus === 'pendiente' ? 8 : 0);
        return prio(b) - prio(a);
      });
      const star = candidates[0];
      star.feeStatus = 'beca_total';
      star.weeksUnpaid = 0;
      star.motivation = clamp(star.motivation + A.scholarship.motivationBoost);
      if (star.status === 'molesto') {
        star.status = 'disponible';
        star.weeksUpset = 0;
      }
      s.club.socialClimate = clamp(s.club.socialClimate + A.scholarship.climateHit);
      const cumplidores = actives(s).filter((p) => p.personality === 'cumplidor');
      for (const p of cumplidores) p.motivation = clamp(p.motivation - 4);
      if (cumplidores.length > 0 && rng.chance(0.5)) {
        s.news.unshift({ week: s.week, text: `Murmullos en el grupo: "¿Así que ${star.name} no paga y yo sí?"`, tone: 'bad' });
      }
      return `${star.name} queda becado: no paga más cuota y está mucho más motivado. Algunos cumplidores fruncieron el ceño.`;
    },
  },
  {
    id: 'jerseys',
    name: 'Comprar camisetas nuevas',
    icon: '👕',
    description: 'Juego de camisetas nuevo. Gran salto de imagen y organización. Una vez por temporada.',
    costLabel: `Cuesta $${A.jerseys.cost} (única vez)`,
    oncePerSeason: true,
    available: (s) => {
      if (s.actionsUsed.includes('jerseys')) return { ok: false, reason: 'Ya se compraron esta temporada' };
      return needMoney(s, A.jerseys.cost);
    },
    apply: (s) => {
      spend(s, 'Juego de camisetas nuevas', A.jerseys.cost);
      s.club.socialPrestige = clamp(s.club.socialPrestige + A.jerseys.socialPrestige);
      s.club.organization = clamp(s.club.organization + A.jerseys.organization);
      for (const p of actives(s)) p.motivation = clamp(p.motivation + A.jerseys.motivation);
      s.news.unshift({ week: s.week, text: 'Estrenamos camisetas: el equipo parece otro.', tone: 'good' });
      return 'Camisetas nuevas para todos. El plantel se sacó fotos como si fuera la NBA.';
    },
  },
  {
    id: 'rest',
    name: 'Descansar al equipo',
    icon: '😴',
    description: 'Semana liviana sin entrenamientos. Recupera físico, aunque a los competitivos no les gusta.',
    costLabel: 'Gratis',
    available: () => ({ ok: true }),
    apply: (s) => {
      for (const p of actives(s)) {
        p.physical = clamp(p.physical + A.rest.physical);
        p.motivation = clamp(p.motivation + (p.personality === 'competitivo' ? -3 : A.rest.motivation));
      }
      return 'Semana de descanso: las piernas se recuperaron. Algún competitivo refunfuñó por la falta de ritmo.';
    },
  },
  {
    id: 'recruit',
    name: 'Reclutar un jugador',
    icon: '🔎',
    description: 'Correr la voz para sumar un jugador nuevo al plantel. No hay garantías de calidad.',
    costLabel: `Cuesta $${A.recruit.cost}`,
    available: (s) => {
      if (actives(s).length >= 15) return { ok: false, reason: 'El plantel está completo (15)' };
      return needMoney(s, A.recruit.cost);
    },
    apply: (s, rng) => {
      spend(s, 'Gestiones para reclutar', A.recruit.cost);
      if (rng.chance(A.recruit.failChance)) {
        return 'Preguntamos por todos lados, pero esta semana no apareció nadie con ganas de sumarse.';
      }
      const recruit = createRecruit(rng, { season: s.seasonNumber });
      s.players.push(recruit);
      logClubEvent(s, 'llegada', `Se sumó ${recruit.name} (${recruit.position}) al plantel a mitad de temporada.`);
      s.news.unshift({ week: s.week, text: `Se sumó ${recruit.name} (${recruit.position}) al plantel.`, tone: 'good' });
      return `Se sumó ${recruit.name}, ${recruit.position.toLowerCase()} de ${recruit.age} años. Habrá que ver cómo rinde.`;
    },
  },
];

export function getAction(id: string): ActionDef {
  const def = ACTIONS.find((a) => a.id === id);
  if (!def) throw new Error(`Acción desconocida: ${id}`);
  return def;
}
