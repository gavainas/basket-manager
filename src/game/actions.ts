import { asadoSummary, resolveAsado } from './asado';
import { BALANCE, clamp } from './balance';
import { coachBoostsTraining } from './coach';
import { createRecruit } from '../data/recruits';
import { pickByFragility } from './injuries';
import { bumpGrievance, sootheGrievance, upsetPlayers } from './mood';
import { logClubEvent } from './timeline';
import type { GameState, GrievanceCause, Player } from './types';
import type { Rng } from './rng';

export interface ActionAvailability {
  ok: boolean;
  reason?: string;
}

export interface ActionDef {
  id: string;
  name: string;
  description: string;
  costLabel: string;
  oncePerSeason?: boolean;
  available: (state: GameState) => ActionAvailability;
  /** Muta el estado (ya clonado) y devuelve el texto del resultado. */
  apply: (state: GameState, rng: Rng) => string;
}

const A = BALANCE.actions;

/** Cómo se nombra el tema en la charla del manager. */
const CAUSE_TALK: Record<GrievanceCause, string> = {
  minutos: 'los minutos',
  promesa: 'la promesa que le quedaste debiendo',
  plata: 'el tema de la cuota',
  trato: 'cómo se manejó lo suyo',
  grupo: 'cómo se siente en el grupo',
  proyecto: 'el nivel de la liga en la que estamos jugando',
};

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
    description:
      'Convocás al plantel a un asado: cada uno confirma según su momento. Si va la mayoría, el grupo sale otro; si van cuatro, es un papelón.',
    costLabel: `Cuesta $${A.asado.cost} (según quiénes vayan)`,
    // Con una apuesta ganada en el bolsillo, este asado lo paga el rival.
    available: (s) => (s.asadoBetPrize ? { ok: true } : needMoney(s, A.asado.cost)),
    apply: (s, rng) => {
      const prize = s.asadoBetPrize;
      if (prize) {
        s.asadoBetPrize = null;
        const report = resolveAsado(s, rng);
        return `Lo pagó ${prize.rivalName}: la apuesta es la apuesta. ${asadoSummary(report, actives(s).length)}`;
      }
      spend(s, 'Asado del plantel', A.asado.cost);
      const report = resolveAsado(s, rng);
      return asadoSummary(report, actives(s).length);
    },
  },
  {
    id: 'raffle',
    name: 'Hacer una rifa',
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
    description: 'Sentarse a charlar con el jugador más caliente del plantel para bajar la espuma.',
    costLabel: 'Gratis (puede salir mal)',
    // Mira la misma lista que el informe del partido y el radar: si alguien
    // quedó caliente el sábado, el lunes está acá.
    available: (s) =>
      upsetPlayers(s).length > 0 ? { ok: true } : { ok: false, reason: 'No hay jugadores molestos' },
    apply: (s, rng) => {
      const target = upsetPlayers(s)[0];
      const g = target.grievance;
      // Con la bronca vieja y encima ya hablada, la charla sola no alcanza.
      const failChance = A.talk.failChance + (g ? (g.level - 1) * 0.08 + (g.attended ?? 0) * 0.1 : 0);
      if (rng.chance(Math.min(0.7, failChance))) {
        target.motivation = clamp(target.motivation - 5);
        if (g) bumpGrievance(s, target, g.cause, { note: `Otra charla que no cambió nada. Ya no cree en las palabras.` });
        return g && (g.attended ?? 0) > 0
          ? `${target.name} te escuchó con media sonrisa: "Esto ya me lo dijiste". Las palabras se le gastaron.`
          : `La charla con ${target.name} terminó mal: sintió que eran excusas y quedó peor.`;
      }
      target.motivation = clamp(target.motivation + A.talk.motivationBoost);
      target.status = 'disponible';
      target.weeksUpset = 0;
      if (g) {
        sootheGrievance(s, target, 'charla');
        return target.grievance
          ? `Larga charla con ${target.name} por ${CAUSE_TALK[g.cause]}. Bajó la espuma, pero te va a mirar la pizarra el sábado.`
          : `Larga charla con ${target.name} por ${CAUSE_TALK[g.cause]}. Quedaron a mano.`;
      }
      return `Larga charla con ${target.name}. Se fue más tranquilo y con ganas de volver a jugar.`;
    },
  },
  {
    id: 'collect',
    name: 'Cobrar cuotas atrasadas',
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
        // Al que le pasaste la gorra y no pudo pagar le queda el mal trago:
        // apretarlo todas las semanas es una forma de romper una relación.
        if (p.feeStatus === 'pendiente' && rng.chance(0.3)) bumpGrievance(s, p, 'trato');
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
      if (star.grievance?.cause === 'plata') sootheGrievance(s, star, 'hechos');
      if (star.status === 'molesto') {
        star.status = 'disponible';
        star.weeksUpset = 0;
      }
      s.club.socialClimate = clamp(s.club.socialClimate + A.scholarship.climateHit);
      const cumplidores = actives(s).filter((p) => p.personality === 'cumplidor' && p.id !== star.id);
      for (const p of cumplidores) {
        p.motivation = clamp(p.motivation - 4);
        // El que paga religiosamente y ve que otro no, se lo guarda.
        if (p.feeStatus === 'pagada' && rng.chance(0.4)) bumpGrievance(s, p, 'plata');
      }
      if (cumplidores.length > 0 && rng.chance(0.5)) {
        s.news.unshift({ week: s.week, text: `Murmullos en el grupo: "¿Así que ${star.name} no paga y yo sí?"`, tone: 'bad' });
      }
      return `${star.name} queda becado: no paga más cuota y está mucho más motivado. Algunos cumplidores fruncieron el ceño.`;
    },
  },
  {
    id: 'jerseys',
    name: 'Comprar camisetas nuevas',
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
