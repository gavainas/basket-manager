import { BALANCE, clamp } from './balance';
import { recordFee } from './conduct';
import { condicionTexto, semanaDelSponsor } from './sponsors';
import type { GameState, Player } from './types';
import type { Rng } from './rng';

/** Gastos sorpresa: mantener un club de barrio es una gotera atrás de otra. */
const MISHAPS = [
  'Se rompió un tablero y hubo que soldarlo de apuro',
  'Multa de la liga por la planilla mal cerrada',
  'Se quemó un reflector del gimnasio',
  'Desaparecieron las llaves: cerradura nueva en el vestuario',
  'Canilla rota en los baños: plomero de urgencia',
  'Hubo que reponer dos pelotas que quedaron lisas',
  'El aro quedó flojo tras una volcada ajena: soldadura y bulones',
];

export function weeklyFee(p: Player): number {
  switch (p.feeStatus) {
    case 'pagada':
      return BALANCE.economy.feeWeekly;
    case 'beca_parcial':
      return Math.round(BALANCE.economy.feeWeekly * BALANCE.economy.partialScholarshipFactor);
    default:
      return 0;
  }
}

/** Estimación de ingresos/gastos semanales para mostrar en Finanzas. */
export function weeklyEstimate(state: GameState): { income: { concept: string; amount: number }[]; expenses: { concept: string; amount: number }[] } {
  const active = state.players.filter((p) => !p.leftClub);
  const fees = active.reduce((sum, p) => sum + weeklyFee(p), 0);
  const income: { concept: string; amount: number }[] = [
    { concept: `Cuotas (${active.filter((p) => weeklyFee(p) > 0).length} jugadores al día)`, amount: fees },
  ];
  if (state.sponsor) {
    income.push({ concept: `${state.sponsor.name} (${state.sponsor.weeksLeft} sem. · pide ${condicionTexto(state.sponsor)})`, amount: state.sponsor.weekly });
  } else if (state.sponsorWeeks > 0) {
    income.push({ concept: `Sponsor (${state.sponsorWeeks} sem. restantes)`, amount: BALANCE.economy.sponsorWeekly });
  }
  const expenses = [
    { concept: 'Alquiler de cancha', amount: -BALANCE.economy.courtRentWeekly },
    { concept: 'Árbitros y planilla', amount: -BALANCE.economy.refereeWeekly },
  ];
  // El sueldo del DT es un gasto fijo más: sin él, Finanzas decía "+$10" de
  // balance con un DT de $48 por semana, y el radar del tablero avisaba con
  // otra cuenta.
  if (state.coach && state.coach.weeklyWage > 0) {
    expenses.push({ concept: `Sueldo del DT (${state.coach.name})`, amount: -state.coach.weeklyWage });
  }
  const debt = state.inscriptionDebt;
  if (debt && debt.remaining > 0) {
    expenses.push({
      concept: `Cuota del fiado de la inscripción (debés $${debt.remaining})`,
      amount: -Math.min(BALANCE.economy.debtInstallment, debt.remaining),
    });
  }
  return { income, expenses };
}

/**
 * Cómo cierra la caja esta semana si pasa lo previsto: lo que hay, más las
 * cuotas y el sponsor, menos los gastos fijos. Es la misma cuenta que el
 * "balance semanal estimado" de Finanzas, sumada a la caja. Las cuotas se
 * cobran antes de pagar la cancha (ver applyWeeklyEconomy), así que es esto,
 * y no "la caja contra los gastos fijos", lo que dice si hay peligro.
 */
export function projectedWeekClose(state: GameState): { close: number; income: number; expenses: number } {
  const est = weeklyEstimate(state);
  const income = est.income.reduce((t, i) => t + i.amount, 0);
  const expenses = -est.expenses.reduce((t, e) => t + e.amount, 0);
  return { close: state.club.money + income - expenses, income, expenses };
}

/**
 * Aplica la economía de la semana que termina: cobra cuotas, paga gastos fijos,
 * procesa sponsor y morosidad. Muta el estado recibido (ya clonado).
 */
export function applyWeeklyEconomy(s: GameState, rng: Rng): void {
  const active = s.players.filter((p) => !p.leftClub);
  const E = BALANCE.economy;
  const D = BALANCE.absenceDifficulty[s.absenceDifficulty ?? 'medio'];

  // Algunos jugadores dejan de pagar según compromiso. Y algunos morosos se
  // ponen al día solos (cobraron, les dio vergüenza): pagan hasta dos semanas.
  for (const p of active) {
    if (p.feeStatus === 'pagada') {
      const skipChance = p.commitment < 45 ? 0.3 : p.commitment < 65 ? 0.12 : 0.03;
      if (rng.chance(skipChance)) {
        p.feeStatus = 'pendiente';
        p.weeksUnpaid = 0;
      }
    } else if (p.feeStatus === 'pendiente' && p.weeksUnpaid >= 1 && rng.chance(E.morosoPagaSolo)) {
      const owed = E.feeWeekly * Math.min(p.weeksUnpaid, E.morosoPagaMaxSemanas);
      s.club.money += owed;
      s.ledger.push({ week: s.week, concept: `${p.name} se puso al día con la cuota`, amount: owed });
      p.feeStatus = 'pagada';
      p.weeksUnpaid = 0;
    }
    if (p.feeStatus === 'pendiente') p.weeksUnpaid += 1;
    // La ficha de conducta: pagó en fecha o debe (los becados no juegan esto).
    if (p.feeStatus === 'pagada') recordFee(p, true);
    else if (p.feeStatus === 'pendiente') recordFee(p, false);
  }

  const payers = active.filter((p) => weeklyFee(p) > 0);
  const feeIncome = payers.reduce((sum, p) => sum + weeklyFee(p), 0);
  if (feeIncome > 0) {
    s.club.money += feeIncome;
    s.ledger.push({ week: s.week, concept: `Cuotas (${payers.length} jugadores)`, amount: feeIncome });
  }

  if (s.sponsor) {
    semanaDelSponsor(s);
  } else if (s.sponsorWeeks > 0) {
    // La pizzería de siempre, de los saves de antes del contrato con condiciones.
    s.club.money += BALANCE.economy.sponsorWeekly;
    s.ledger.push({ week: s.week, concept: 'Aporte del sponsor', amount: BALANCE.economy.sponsorWeekly });
    s.sponsorWeeks -= 1;
    if (s.sponsorWeeks === 0) {
      s.news.unshift({ week: s.week, text: 'Terminó el contrato con el sponsor.', tone: 'neutral' });
    }
  }

  s.club.money -= BALANCE.economy.courtRentWeekly;
  s.ledger.push({ week: s.week, concept: 'Alquiler de cancha', amount: -BALANCE.economy.courtRentWeekly });
  s.club.money -= BALANCE.economy.refereeWeekly;
  s.ledger.push({ week: s.week, concept: 'Árbitros y planilla', amount: -BALANCE.economy.refereeWeekly });

  if (s.coach && s.coach.weeklyWage > 0) {
    s.club.money -= s.coach.weeklyWage;
    s.ledger.push({ week: s.week, concept: `Sueldo del DT (${s.coach.name})`, amount: -s.coach.weeklyWage });
  }

  // El fiado de la inscripción: la liga pasa a cobrar su cuota semanal. Si la
  // caja no llega, no hay descubierto — hay presión: prestigio que se va, y a
  // la tercera semana impaga la liga no te habilita la fecha (ver match.ts).
  const debt = s.inscriptionDebt;
  if (debt && debt.remaining > 0) {
    const cuota = Math.min(BALANCE.economy.debtInstallment, debt.remaining);
    if (s.club.money >= cuota) {
      s.club.money -= cuota;
      debt.remaining -= cuota;
      debt.missedWeeks = 0;
      debt.sanctionPending = false;
      s.ledger.push({ week: s.week, concept: `Cuota del fiado de la inscripción (${debt.leagueName})`, amount: -cuota });
      if (debt.remaining <= 0) {
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        s.news.unshift({
          week: s.week,
          text: `El club saldó el fiado de la inscripción con la ${debt.leagueName}. Deuda cero: en la liga lo tomaron nota.`,
          tone: 'good',
        });
      }
    } else {
      debt.missedWeeks += 1;
      s.club.socialPrestige = clamp(s.club.socialPrestige - BALANCE.debt.missPrestigeHit);
      if (debt.missedWeeks >= BALANCE.debt.weeksForSanction && !debt.sanctioned) {
        debt.sanctionPending = true;
        s.news.unshift({
          week: s.week,
          text: `La ${debt.leagueName} se cansó de esperar el fiado: si antes del próximo partido no te ponés al día, no te habilitan la fecha y los puntos se pierden en la mesa.`,
          tone: 'bad',
        });
      } else {
        s.news.unshift({
          week: s.week,
          text:
            debt.missedWeeks === 1
              ? `No hubo caja para la cuota del fiado: el tesorero de la ${debt.leagueName} te cruzó en la cancha y "te lo recordó".`
              : `Van ${debt.missedWeeks} semanas sin pagar el fiado de la inscripción: en la ${debt.leagueName} ya lo comentan en voz alta.`,
          tone: 'bad',
        });
      }
    }
  }

  // Imprevistos: la infraestructura del club también juega su partido. Si no
  // hay caja, se arregla con alambre: no cuesta plata, cuesta organización
  // (y en algún momento se paga de otra manera).
  if (rng.chance(E.mishapChance * D.mishap)) {
    const amount = rng.int(E.mishapMin, E.mishapMax);
    const mishap = rng.pick(MISHAPS);
    if (s.club.money - amount < E.alambreColchon) {
      s.club.organization = clamp(s.club.organization - E.alambreOrganizacion);
      s.news.unshift({ week: s.week, text: `${mishap}. No había caja: se arregló con alambre y buena voluntad. El club se desordena un poco.`, tone: 'neutral' });
    } else {
      s.club.money -= amount;
      s.ledger.push({ week: s.week, concept: mishap, amount: -amount });
      s.news.unshift({ week: s.week, text: `${mishap}: se fueron $${amount} de la caja.`, tone: 'bad' });
    }
  }

  // Los cumplidores se molestan si sienten que bancan a los demás.
  const freeRiders = active.filter((p) => p.feeStatus === 'pendiente' || p.feeStatus === 'beca_total').length;
  if (freeRiders >= 4) {
    const cumplidores = active.filter((p) => p.personality === 'cumplidor' || p.personality === 'competitivo');
    for (const p of cumplidores) p.motivation = clamp(p.motivation - 3);
    if (cumplidores.length > 0 && rng.chance(0.5)) {
      s.news.unshift({
        week: s.week,
        text: 'Los que pagan al día murmuran: sienten que financian a los que no pagan.',
        tone: 'bad',
      });
    }
  }

  s.club.money = Math.round(s.club.money);
}
