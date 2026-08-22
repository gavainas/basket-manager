// Números de balance centralizados. Modificar acá para ajustar la dificultad
// sin tocar la lógica del juego.

export const BALANCE = {
  season: {
    weeks: 9,
  },

  economy: {
    startingMoney: 550,
    inscriptionFee: 300,
    courtRentWeekly: 165,
    refereeWeekly: 80,
    feeWeekly: 30, // cuota por jugador
    partialScholarshipFactor: 0.5,
    sponsorWeekly: 70,
    sponsorDurationWeeks: 4,
    // Imprevistos: el club siempre encuentra en qué gastarte plata.
    mishapChance: 0.25,
    mishapMin: 30,
    mishapMax: 90,
  },

  match: {
    baseScore: 62,
    strengthToPoints: 0.55, // cuánto pesa la diferencia de fuerza en el marcador
    randomPoints: 10, // amplitud del azar en puntos
    physicalWearBench: 3,
    positionMissingPenalty: 0.055, // penalización por posición sin cubrir
    forfeitScore: [20, 60] as [number, number],
  },

  // La nota del partido (1-10). Recalibrada en la 2ª pasada (ago 2026): con la
  // fórmula vieja (base 3.0, pendiente 7.2, tope 0.78) la media de un titular
  // era 8.2 y las notas 1-5 no existían (1.1% medido con sim:notas). Toda la
  // producción del equipo se reparte entre 5, así que el tope por minuto se
  // tocaba casi siempre. Objetivo: media ~6.5, la banda 3-6 viva, el 10 raro.
  rating: {
    perMinCap: 1.0, // tope de producción por minuto que puntúa (el 10 existe, pero es leyenda)
    base: 2.4, // nota = base + perMin × pendiente + (día − 1) × hotSpan
    perMinSlope: 5.6,
    hotSpan: 4, // el día bueno/malo (perf vs nivel) aproxima eficiencia y defensa
    winBonus: 0.4, // ganar/perder mueve la nota ±
    blowoutBonus: 0.2, // paliza a favor
    sampleMinutes: 16, // con menos muestra, la nota tira al "cumplió"
    cameoAnchor: 5.4,
    mvpFloor: 8, // la figura del partido nunca baja de esto
  },

  // Dificultad de faltas (se elige al crear la partida): multiplica las
  // ausencias y lesiones. En difícil, armar el equipo con los que vinieron
  // es el juego; en fácil, casi siempre están todos.
  absenceDifficulty: {
    facil: { label: 'Fácil', life: 0.5, excuse: 0.6, injury: 0.6, maxOut: 2 },
    medio: { label: 'Medio', life: 1, excuse: 1, injury: 1, maxOut: 3 },
    dificil: { label: 'Difícil', life: 1.9, excuse: 1.6, injury: 1.5, maxOut: 4 },
  },

  // Confirmación de asistencia previa al partido: los de poco compromiso fallan
  // más, pero la vida le pasa a cualquiera (enfermedad, viajes, guardias).
  callUp: {
    maxOut: 3, // nunca se caen más de 3 por semana
    commitmentThreshold: 60, // debajo de esto un jugador puede fallar
    excuseChanceFactor: 0.5, // prob. de excusa = (umbral - compromiso)/100 × esto
    lifeChance: 0.05, // prob. semanal de imprevisto de la vida, para todos por igual
    informalExtra: 0.08, // el talentoso informal falla aunque tenga compromiso
    upsetExtra: 0.06, // molesto o al borde: menos ganas de venir
    injuryBase: 0.02, // todos juegan/viven afuera: nadie está exento de romperse
    injuryChanceFactor: 0.1, // extra de lesión afuera por poco compromiso (juega en todos lados)
    exhaustedThreshold: 46, // físico ≤ esto: confirma pero avisa que está fundido (decisión del manager)
  },

  // Partido en vivo, cuarto a cuarto.
  liveMatch: {
    luckPerQuarter: 5, // amplitud del azar en puntos por cuarto
    rivalDayVariance: 0.1, // el rival también tiene días buenos y malos (±)
    // Remontadas: el que va abajo se enchufa, el que va cómodo se relaja.
    comebackDeficit: 9, // diferencia que despierta al que pierde
    comebackFactor: 0.15, // puntos de empuje por punto de déficit al arrancar el cuarto
    comebackMaxPoints: 3, // tope de ese empuje por cuarto
    // Rachas: parciales calientes que dan vuelta partidos (para ambos lados).
    rachaChance: 0.15, // prob. por cuarto de que a un equipo se le prenda el aro
    rachaMin: 3,
    rachaMax: 7,
    // Lesiones en cancha: piernas gastadas y defensa agresiva pagan factura.
    matchInjuryBase: 0.006, // prob. base por jugador por cuarto
    matchInjuryTiredMult: 1.8, // con menos de 35 de piernas
    matchInjuryAggressiveMult: 1.25, // marcando hombre o presionando
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
    // Presión a toda cancha: máxima recompensa defensiva, máximo desgaste…
    // y una apuesta: si te la rompen, son puntos de regalo.
    presionRivalMult: 0.84, // con piernas, ahoga al rival
    presionTiredMult: 1.12, // sin piernas, te pasan con dos pases
    presionTiredThreshold: 55, // exige más frescura que la marca hombre
    presionDrainExtra: 10, // desgaste extra por cuarto presionando
    presionRivalDrain: 6, // el rival también sufre la presión
    presionBreakBase: 0.25, // prob. base de que el rival rompa la presión ese cuarto
    presionBreakStrength: 0.005, // extra por punto de fuerza rival sobre 55
    presionBreakMult: 1.1, // cuarto en que la presión sale mal
    aggressiveAdapt: 0.03, // el rival aprende a salir: por cuarto previo de defensa agresiva
    // Correr la cancha: más posesiones para los dos; paga con piernas frescas.
    correrBase: 0.9, // atkMult = base + span × piernas/100
    correrFreshSpan: 0.33,
    correrPace: 2, // puntos extra de ritmo para ambos por cuarto
    correrDrainExtra: 4, // desgaste extra por cuarto corriendo
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
    eventCooldownWeeks: 4, // un evento no se repite hasta pasadas estas semanas
  },

  matchEffects: {
    winMotivation: 5,
    lossMotivation: -5,
    // Techo blando del ánimo: ganar seguido ya no clava a todos en 99. El
    // empujón positivo rinde menos cuanto más arriba está la motivación
    // (factor = (100 − motivación) / span, nunca menos que minFactor).
    // Las derrotas pegan completas: la mala racha no tiene amortiguador.
    moraleSoftcapSpan: 45,
    moraleSoftcapMinFactor: 0.5,
    winSportPrestige: 3,
    lossSportPrestige: -2,
    upsetWinBonus: 3, // extra por ganarle a un rival más fuerte
    // El margen y la épica pesan en el ánimo:
    closeWinMotivation: 4, // ganada por 3 o menos: alegría con el corazón en la boca
    blowoutWinMotivation: 7, // paliza a favor (15+): el grupo sale volando
    closeLossMotivation: -3, // perdida por 3 o menos: dolió, pero se compitió
    blowoutLossMotivation: -8, // paliza en contra (15+): golpe de verdad
    blowoutMargin: 15,
    clutchMargin: 3, // definido por esto o menos = "en la hora"
    clutchConfidence: 4, // confianza extra a los que cerraron el partido ganado en la hora
    comebackDeficit: 10, // ir tanto abajo y ganarla = remontada consumada
    shortHandedSquad: 7, // convocados ≤ esto = jugar "con lo justo"
    shortHandedWinMotivation: 9, // la gesta: ganar siendo 7 o menos
    shortHandedLossMotivation: -2, // con 7 nadie puede reprochar nada
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
    asado: {
      cost: 110,
      climate: 12,
      socialPrestige: 4,
      rainChance: 0.15,
      // Umbrales de respuesta a la convocatoria (score 0-1 por jugador).
      rsvpYes: 0.62,
      rsvpMaybe: 0.4,
      // La vida no mira el ánimo: prob. de que a un jugador directamente no le dé el calendario.
      noPuedeChance: 0.13,
    },
    raffle: { cost: 30, incomeMin: 30, incomeMax: 170 },
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

  // Suspensiones por acumulación de faltas técnicas.
  suspension: {
    techsForSuspension: 3,
    // 2 = se pierde exactamente la próxima fecha (el contador baja al avanzar la semana).
    weeks: 2,
  },

  progression: {
    // Con esta cantidad de entrenamientos en la temporada, la evolución
    // de verano mejora: los jóvenes crecen más y los veteranos casi no caen.
    trainingsToCount: 3,
  },

  // Expansión del club: un segundo equipo inscripto en otra liga (etapa 6).
  expansion: {
    inscriptionFee: 250, // por temporada, se paga al anotarse
    weeklyUpkeep: 70, // cancha y árbitros del segundo equipo
    canteenIncome: 30, // la cantina del partido deja algo
    minPlayers: 8, // fichas mínimas para inscribir el equipo
    playWear: 2, // desgaste físico semanal de los que jugaron
    benchMotivation: 3, // los relegados del primero se enchufan jugando acá
    starterMotivation: 1, // a los titulares del primero les suma poco
    injuryChance: 0.04, // riesgo semanal de que alguien se rompa en ese torneo
    socialPrestigeOnRegister: 3, // el barrio ve al club crecer
    topFinishPrestige: 4, // terminar en el podio suma prestigio deportivo
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
    lateInscriptionFee: 60, // recargo por no elegir liga: te anotan a último momento
    lateInscriptionPrestigeHit: 3, // y el barrio se entera de las corridas
    plazaPrestigeHit: 6, // bajarse a la plaza: el prestigio deportivo lo siente
  },
} as const;

/**
 * Acota a un rango y **redondea a entero**.
 *
 * Los atributos 0-100 (físico, motivación, compromiso, moral) son enteros: nadie
 * tiene 77,96 de físico. Pero varias fuentes de cambio son fraccionarias
 * (`rng.range()`, el desgaste por minutos jugados, los multiplicadores de
 * balance), y sin redondear el error se acumula semana a semana hasta que el
 * estado guardado tiene basura de punto flotante: `77.96101502049714`,
 * `90.60000000000001`. Eso salía impreso en la planilla.
 *
 * Se redondea acá, en el único lugar por donde pasan todas las escrituras, y no
 * en la UI: si se arregla solo al mostrar, el estado sigue derivando y el próximo
 * lugar que lea el número sin formatear vuelve a mostrar el desastre.
 */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

export function clampMoney(value: number): number {
  return Math.round(value);
}
