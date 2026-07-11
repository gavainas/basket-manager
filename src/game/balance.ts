// Números de balance centralizados. Modificar acá para ajustar la dificultad
// sin tocar la lógica del juego.

export const BALANCE = {
  season: {
    weeks: 9,
  },

  economy: {
    startingMoney: 550,
    inscriptionFee: 300,
    courtRentWeekly: 140,
    refereeWeekly: 60,
    feeWeekly: 30, // cuota por jugador
    partialScholarshipFactor: 0.5,
    sponsorWeekly: 70,
    sponsorDurationWeeks: 4,
  },

  match: {
    baseScore: 62,
    strengthToPoints: 0.55, // cuánto pesa la diferencia de fuerza en el marcador
    randomPoints: 10, // amplitud del azar en puntos
    physicalWearStarter: 11,
    physicalWearBench: 3,
    positionMissingPenalty: 0.055, // penalización por posición sin cubrir
    forfeitScore: [20, 60] as [number, number],
  },

  weekly: {
    physicalRecovery: 8,
    motivationDecay: 1, // desgaste natural semanal
    lowMotivationThreshold: 30, // debajo de esto un jugador puede molestarse
    leaveThreshold: 18, // debajo de esto un jugador al borde puede irse
    upsetWeeksToAlBorde: 2,
    eventChance: 0.65,
  },

  matchEffects: {
    winMotivation: 5,
    lossMotivation: -5,
    winSportPrestige: 3,
    lossSportPrestige: -2,
    upsetWinBonus: 3, // extra por ganarle a un rival más fuerte
    benchedMotivationHit: -6, // protagonistas sin titularidad
    mvpConfidence: 10,
  },

  actions: {
    maxPerWeek: 2,
    training: { cost: 30, physical: 4, injuryChance: 0.08 },
    asado: { cost: 110, climate: 12, socialPrestige: 4, rainChance: 0.15 },
    raffle: { cost: 25, incomeMin: 60, incomeMax: 190 },
    sponsorSearch: { baseChance: 0.35, prestigeFactor: 0.005 },
    talk: { motivationBoost: 14, failChance: 0.12 },
    collectFees: { motivationHit: -4 },
    scholarship: { motivationBoost: 12, climateHit: -5 },
    jerseys: { cost: 200, socialPrestige: 6, organization: 8, motivation: 3 },
    rest: { physical: 10, motivation: 2 },
    recruit: { cost: 70, failChance: 0.3 },
  },

  prestige: {
    min: 0,
    max: 100,
  },
} as const;

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function clampMoney(value: number): number {
  return Math.round(value);
}
