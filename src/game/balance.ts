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
    physicalWearBench: 3,
    positionMissingPenalty: 0.055, // penalización por posición sin cubrir
    forfeitScore: [20, 60] as [number, number],
  },

  // Confirmación de asistencia previa al partido: los de poco compromiso fallan.
  callUp: {
    maxOut: 2, // nunca se caen más de 2 por semana
    commitmentThreshold: 60, // debajo de esto un jugador puede fallar
    excuseChanceFactor: 0.5, // prob. de excusa = (umbral - compromiso)/100 × esto
    informalExtra: 0.08, // el talentoso informal falla aunque tenga compromiso
    upsetExtra: 0.06, // molesto o al borde: menos ganas de venir
    injuryChanceFactor: 0.12, // prob. de lesión jugando en otro lado
    injuryWeeksMin: 1,
    injuryWeeksMax: 2,
  },

  // Partido en vivo, cuarto a cuarto.
  liveMatch: {
    luckPerQuarter: 3, // amplitud del azar en puntos por cuarto
    freshStartBase: 55, // piernas iniciales de cada jugador = base + físico × factor
    freshStartPhysical: 0.45,
    freshFactorMin: 0.88, // multiplicador de fuerza = min + span × piernas/100
    freshFactorSpan: 0.24,
    playerDrainBase: 11, // caída de piernas por cuarto en cancha
    playerDrainHombre: 5, // extra por marcar hombre
    playerDrainLowPhysical: 0.06, // extra por punto de físico debajo de 60
    benchRecovery: 8, // recuperación por cuarto en el banco
    halftimeRecovery: 7, // recuperación de todos en el entretiempo
    quarterMinutes: 10, // minutos que suma cada cuarto en cancha
    otMinutes: 5, // minutos del suplementario
    rivalFreshStart: 82,
    rivalDrain: 7,
    hombreRivalMult: 0.9, // marca hombre con piernas: el rival anota menos
    hombreTiredMult: 1.08, // marca hombre fundido: te pasan por arriba
    hombreTiredThreshold: 45, // piernas mínimas para sostener la marca hombre
    hombreRivalDrain: 3, // la presión también desgasta al rival
    estrellaBase: 0.88, // ataque estrella: mult = base + span × (calentura - 0.78)
    estrellaHotSpan: 0.6,
    estrellaDecay: 0.03, // el rival le toma la mano por cada cuarto repetido
    equipoBase: 0.97, // ataque de equipo: mult = base + bonus × química
    equipoChemBonus: 0.08,
    tiradoresVsZona: 1.08, // los tiradores castigan la zona
    tiradoresVsHombre: 0.95, // y sufren la marca individual
    internosHombreDrain: 4, // marcar hombre a los grandotes desgasta extra
    internosVsZona: 0.95, // la zona les cierra la pintura
    corredoresTiredBoost: 0.12, // los corredores castigan las piernas gastadas
    pushDeficit: 8, // si el rival pierde por esto al entrar al último cuarto, presiona
    pushFreshCost: 5,
    pushRivalBoost: 1.05,
    hombreWearPerQuarter: 1, // desgaste físico extra post partido por cuarto en hombre
    // Planilla: reparto de puntos/rebotes/asistencias por cuarto.
    boxRebMin: 7,
    boxRebMax: 12,
    boxAstMin: 3,
    boxAstMax: 6,
    estrellaPtsBias: 1.8, // la figura se lleva más tiros con ataque 'estrella'
    equipoAstExtra: 2, // mover la pelota genera más asistencias
  },

  rotation: {
    maxPlayers: 5,
    totalMinutes: 200, // 5 puestos × 40 minutos
    minutesPerSub: 12, // minutos aprox. de cada jugador de rotación
    wearPerMinute: 0.34, // desgaste físico por minuto jugado
    overloadThreshold: 32, // por encima de estos minutos, los titulares rinden menos
    overloadPenaltyPerMin: 0.008, // penalización de rendimiento por minuto de sobrecarga
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
    rotationMotivationHit: -3, // esperaban ser titulares y solo rotaron
    subMinutesBoost: 2, // suplentes contentos por sumar minutos
    mvpConfidence: 10,
  },

  actions: {
    maxPerWeek: 2,
    training: {
      cost: 30,
      physical: 4,
      injuryChance: 0.08,
      lowCommitmentThreshold: 45, // debajo de esto pueden faltar
      skipChanceLowCommitment: 0.3,
      skipChanceInformal: 0.35, // talentoso_informal falta aunque tenga compromiso
      youngImproveChance: 0.3, // ≤25 años y compromiso ≥ 50
      primeImproveChance: 0.15, // 26-30 años y compromiso ≥ 70
    },
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

  progression: {
    // Con esta cantidad de entrenamientos en la temporada, la evolución
    // de verano mejora: los jóvenes crecen más y los veteranos casi no caen.
    trainingsToCount: 3,
  },

  preseason: {
    weeks: 4,
    gestionesPerWeek: 3, // contactos/charlas por semana
    minPlayers: 8, // mínimo para inscribir al equipo
    marketSize: 16, // fichables visibles por pretemporada
    weeklyUpkeep: 40, // mantenimiento del club por semana de pretemporada
    eventChance: 0.75,
    emergencyPrestigeHit: 4, // por recurrir a jugadores de emergencia
    bailoutSocialHit: 6, // aporte extraordinario de la comisión
    bailoutSportHit: 3,
  },
} as const;

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function clampMoney(value: number): number {
  return Math.round(value);
}
