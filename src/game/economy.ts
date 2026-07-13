import { BALANCE, clamp } from './balance';
import type { GameState, Player } from './types';
import type { Rng } from './rng';

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
  if (state.sponsorWeeks > 0) {
    income.push({ concept: `Sponsor (${state.sponsorWeeks} sem. restantes)`, amount: BALANCE.economy.sponsorWeekly });
  }
  const expenses = [
    { concept: 'Alquiler de cancha', amount: -BALANCE.economy.courtRentWeekly },
    { concept: 'Árbitros y planilla', amount: -BALANCE.economy.refereeWeekly },
  ];
  return { income, expenses };
}

/**
 * Aplica la economía de la semana que termina: cobra cuotas, paga gastos fijos,
 * procesa sponsor y morosidad. Muta el estado recibido (ya clonado).
 */
export function applyWeeklyEconomy(s: GameState, rng: Rng): void {
  const active = s.players.filter((p) => !p.leftClub);

  // Algunos jugadores dejan de pagar según compromiso.
  for (const p of active) {
    if (p.feeStatus === 'pagada') {
      const skipChance = p.commitment < 45 ? 0.3 : p.commitment < 65 ? 0.12 : 0.03;
      if (rng.chance(skipChance)) {
        p.feeStatus = 'pendiente';
        p.weeksUnpaid = 0;
      }
    }
    if (p.feeStatus === 'pendiente') p.weeksUnpaid += 1;
  }

  const payers = active.filter((p) => weeklyFee(p) > 0);
  const feeIncome = payers.reduce((sum, p) => sum + weeklyFee(p), 0);
  if (feeIncome > 0) {
    s.club.money += feeIncome;
    s.ledger.push({ week: s.week, concept: `Cuotas (${payers.length} jugadores)`, amount: feeIncome });
  }

  if (s.sponsorWeeks > 0) {
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
