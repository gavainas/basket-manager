import { BALANCE, clamp } from './balance';
import { buildMarket, marketToPlayer } from '../data/market';
import { createInitialRoster } from '../data/players';
import { createRecruit } from '../data/recruits';
import { RIVALS, SCHEDULE_ORDER } from '../data/rivals';
import { INITIAL_OTHER_DIVISION, USER_DIVISION_ID } from '../data/worldData';
import { applyPromotionRelegation } from './promotion';
import { weeklyFee } from './economy';
import { generateObjectives } from './objectives';
import { clubPosition, suggestRotation, suggestStarters } from './match';
import { buildCoachMarket } from './coach';
import { computeSeasonEvaluation } from './evaluation';
import { rollPreseasonEvent } from './preseasonEvents';
import { logClubEvent } from './timeline';
import { buildWorld, emptyWorld } from './world';
import { SAVE_VERSION } from './week';
import { Rng } from './rng';
import type {
  AbsenceDifficulty,
  Club,
  ContinuityStatus,
  DemandType,
  ExpectedRole,
  FeeStatus,
  GameState,
  MarketPlayer,
  NewsTone,
  Player,
  PreseasonState,
  PreseasonSummaryEntry,
} from './types';

// ---------- Etiquetas de exigencias ----------

export const DEMAND_LABELS: Record<DemandType, string> = {
  fichaje_pagado: 'Que el club pague su pase',
  beca: 'No pagar cuota (beca total)',
  beca_parcial: 'Pagar media cuota',
  titularidad: 'Ser titular',
  minutos: 'Lugar asegurado en la rotación',
  amigo: 'Que también venga un amigo suyo',
  competitivo: 'Un equipo que pelee arriba',
  ambiente: 'Un buen ambiente social',
  sin_entrenar: 'No entrenar regularmente',
};

/** Contraoferta disponible para cada exigencia (si existe). */
export const COUNTER_OFFERS: Partial<Record<DemandType, { label: string; result: string }>> = {
  beca: { label: 'Ofrecerle media beca', result: 'beca_parcial' },
  titularidad: { label: 'Asegurarle rotación, no titularidad', result: 'minutos' },
  fichaje_pagado: { label: 'Pagar la mitad del pase entre los dos', result: 'medio_pase' },
};

export const CONTINUITY_LABELS: Record<ContinuityStatus, { label: string; cls: string }> = {
  confirmado: { label: 'Confirmado', cls: 'good' },
  dudando: { label: 'Está dudando', cls: 'warn' },
  no_respondio: { label: 'No respondió', cls: 'warn' },
  quiere_irse: { label: 'Quiere irse', cls: 'bad' },
  retirado: { label: 'Se retiró', cls: 'bad' },
  pide_condicion: { label: 'Pide una condición', cls: 'accent' },
};

// ---------- Helpers ----------

function ps(s: GameState): PreseasonState {
  if (!s.preseason) throw new Error('No hay pretemporada activa');
  return s.preseason;
}

function psSpend(s: GameState, concept: string, amount: number): void {
  s.club.money -= amount;
  s.ledger.push({ week: 0, concept, amount: -amount });
  ps(s).moneySpent += amount;
}

function psEarn(s: GameState, concept: string, amount: number): void {
  s.club.money += amount;
  s.ledger.push({ week: 0, concept, amount });
}

function psLog(s: GameState, text: string): void {
  ps(s).log.unshift(`S${ps(s).week}: ${text}`);
}

function addPromise(s: GameState, playerId: string, playerName: string, type: DemandType, label: string): void {
  s.promises.push({ playerId, playerName, type, label, season: s.seasonNumber });
}

export function confirmedPlayers(s: GameState): Player[] {
  const p = s.preseason;
  if (!p) return s.players.filter((x) => !x.leftClub);
  return s.players.filter((x) => !x.leftClub && p.continuity[x.id] === 'confirmado');
}

/** Cuotas semanales proyectadas con los confirmados de hoy. */
export function projectedWeeklyFees(s: GameState): number {
  return confirmedPlayers(s).reduce((sum, p) => sum + weeklyFee(p), 0);
}

// ---------- Continuidad del plantel ----------

function assignContinuity(
  p: Player,
  club: Club,
  rng: Rng,
  firstSeason: boolean
): { status: ContinuityStatus; demand?: DemandType } {
  if (firstSeason) {
    // Temporada 1: el grupo viene junto; solo algunos plantean cosas.
    if (p.personality === 'mercenario') return { status: 'pide_condicion', demand: 'beca_parcial' };
    if (p.personality === 'protagonista' && rng.chance(0.35)) return { status: 'pide_condicion', demand: 'titularidad' };
    if (p.personality === 'talentoso_informal' && rng.chance(0.4)) return { status: 'no_respondio' };
    if (rng.chance(0.12)) return { status: 'dudando' };
    return { status: 'confirmado' };
  }

  if (p.age >= 36 && rng.chance(0.5)) return { status: 'retirado' };
  if (p.age >= 34 && p.physical < 55 && rng.chance(0.25)) return { status: 'retirado' };
  if (p.status === 'al_borde') return { status: 'quiere_irse' };
  if (p.motivation < 35) return rng.chance(0.6) ? { status: 'quiere_irse' } : { status: 'dudando' };

  switch (p.personality) {
    case 'leal':
      return { status: 'confirmado' };
    case 'veterano':
      return rng.chance(0.9) ? { status: 'confirmado' } : { status: 'retirado' };
    case 'cumplidor':
      return rng.chance(0.85) ? { status: 'confirmado' } : { status: 'dudando' };
    case 'social':
      if (club.socialClimate >= 50) return rng.chance(0.85) ? { status: 'confirmado' } : { status: 'dudando' };
      return rng.chance(0.6) ? { status: 'dudando' } : { status: 'confirmado' };
    case 'competitivo':
      if (club.sportPrestige < 42 && rng.chance(0.4)) return { status: 'pide_condicion', demand: 'competitivo' };
      return rng.chance(0.8) ? { status: 'confirmado' } : { status: 'dudando' };
    case 'mercenario': {
      const roll = rng.range(0, 1);
      if (roll < 0.45) return { status: 'pide_condicion', demand: 'beca' };
      if (roll < 0.75) return { status: 'pide_condicion', demand: 'beca_parcial' };
      return { status: 'quiere_irse' };
    }
    case 'protagonista':
      if (p.expectedRole === 'titular' && rng.chance(0.55)) return { status: 'confirmado' };
      return rng.chance(0.7) ? { status: 'pide_condicion', demand: 'titularidad' } : { status: 'dudando' };
    case 'talentoso_informal': {
      const roll = rng.range(0, 1);
      if (roll < 0.5) return { status: 'no_respondio' };
      if (roll < 0.8) return { status: 'dudando' };
      return { status: 'confirmado' };
    }
  }
}

function buildPreseasonState(players: Player[], club: Club, rng: Rng, firstSeason: boolean): PreseasonState {
  const continuity: Record<string, ContinuityStatus> = {};
  const playerDemands: Record<string, DemandType> = {};

  const active = players.filter((p) => !p.leftClub);
  for (const p of active) {
    const r = assignContinuity(p, club, rng, firstSeason);
    continuity[p.id] = r.status;
    if (r.demand) playerDemands[p.id] = r.demand;
  }

  // Red de seguridad: que siempre quede una base de confirmados.
  const minConfirmed = firstSeason ? 8 : 4;
  const confirmed = active.filter((p) => continuity[p.id] === 'confirmado');
  if (confirmed.length < minConfirmed) {
    const rest = active
      .filter((p) => continuity[p.id] !== 'confirmado' && continuity[p.id] !== 'retirado')
      .sort((a, b) => b.commitment - a.commitment);
    for (const p of rest.slice(0, minConfirmed - confirmed.length)) {
      continuity[p.id] = 'confirmado';
      delete playerDemands[p.id];
    }
  }

  return {
    week: 1,
    totalWeeks: BALANCE.preseason.weeks,
    gestionesLeft: BALANCE.preseason.gestionesPerWeek,
    continuity,
    playerDemands,
    market: buildMarket(rng),
    negotiation: null,
    counterUsed: {},
    actionOutcome: null,
    pendingEvent: null,
    eventOutcome: null,
    log: [],
    moneySpent: 0,
    summary: null,
  };
}

// ---------- Arranques ----------

/** Partida nueva que empieza por la pretemporada (la inscripción se paga al cierre). */
export function createPreseasonNewGame(seed: number, difficulty: AbsenceDifficulty = 'medio'): GameState {
  const rng = new Rng(seed);
  const players = createInitialRoster(rng);

  const state: GameState = {
    saveVersion: SAVE_VERSION,
    seed: 0,
    seasonNumber: 1,
    objectives: [],
    pastSeasons: [],
    week: 1,
    seasonLength: BALANCE.season.weeks,
    phase: 'preseason',
    club: {
      name: 'Atlético El Parque',
      money: BALANCE.economy.startingMoney,
      socialClimate: 62,
      organization: 50,
      sportPrestige: 40,
      socialPrestige: 45,
    },
    players,
    rivals: RIVALS,
    schedule: SCHEDULE_ORDER,
    standings: [
      { teamId: 'club', wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 },
      ...RIVALS.map((r) => ({ teamId: r.id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 })),
    ],
    actionsChosen: [],
    actionsLog: [],
    actionsUsed: [],
    pendingEvent: null,
    eventOutcome: null,
    starters: [],
    rotation: [],
    callUp: [],
    live: null,
    lastMatch: null,
    history: [],
    news: [
      { week: 0, text: 'Arranca la pretemporada: hay que confirmar el plantel e inscribir al club antes de la fecha límite.', tone: 'neutral' },
      { week: 0, text: 'Sos el nuevo manager de Atlético El Parque. Primero, armá el equipo.', tone: 'good' },
    ],
    ledger: [{ week: 0, concept: 'Caja inicial del club', amount: BALANCE.economy.startingMoney }],
    memorableMoments: [],
    clubTimeline: [
      { season: 1, week: 0, kind: 'hito', text: 'Nace Atlético El Parque: hay que armar el plantel para la primera temporada.' },
    ],
    playersLeftCount: 0,
    sponsorWeeks: 0,
    gameOverReason: null,
    startingMoney: BALANCE.economy.startingMoney,
    promises: [],
    preseason: null,
    world: emptyWorld(),
    playoffs: null,
    coach: null,
    coachMarket: buildCoachMarket(1, seed),
    trialCandidate: null,
    divisionId: USER_DIVISION_ID,
    otherDivisionTeams: INITIAL_OTHER_DIVISION.map((t) => ({ ...t })),
    absenceDifficulty: difficulty,
  };
  state.preseason = buildPreseasonState(players, state.club, rng, true);
  state.seed = rng.nextSeed();
  return state;
}

/**
 * Cierra la temporada terminada y abre la pretemporada de la siguiente:
 * el plantel evoluciona en el verano y cada jugador define su situación.
 */
export function startPreseason(state: GameState): GameState {
  const rng = new Rng(state.seed);
  const survivors = state.players.filter((p) => !p.leftClub);

  const finishedRow = state.standings.find((r) => r.teamId === 'club')!;
  const finishedSeason = {
    season: state.seasonNumber,
    record: `${finishedRow.wins}-${finishedRow.losses}`,
    position: clubPosition(state),
    outcome: computeSeasonEvaluation(state).outcomeTitle,
    money: state.club.money,
  };

  const players = survivors.map((p) => {
    const np = structuredClone(p);
    np.age += 1;
    // Evolución de verano: entrenar durante la temporada la mejora.
    const trained = np.seasonTrainings >= BALANCE.progression.trainingsToCount;
    if (np.age <= 25) np.technique = clamp(np.technique + rng.int(0, 4) + (trained ? 1 : 0), 20, 92);
    else if (np.age <= 30) np.technique = clamp(np.technique + rng.int(-1, 1) + (trained ? 1 : 0), 20, 92);
    else np.technique = clamp(np.technique - (trained ? rng.int(0, 2) : rng.int(1, 4)), 20, 92);
    np.visibleRating = Math.round(np.technique + rng.range(-7, 7));
    np.seasonTrainings = 0;
    np.techniqueGain = 0;
    np.physical = clamp(75 - Math.max(0, np.age - 28) * 2 + rng.int(-8, 8));
    np.motivation = clamp(rng.int(60, 78));
    np.confidence = clamp(rng.int(45, 65));
    np.status = 'disponible';
    np.injuryWeeks = 0;
    np.weeksUpset = 0;
    np.weeksBenched = 0;
    np.lastRating = null;
    if (np.feeStatus === 'pendiente') {
      np.feeStatus = 'pagada';
      np.weeksUnpaid = 0;
    }
    return np;
  });

  // Ascensos y descensos: rearma las dos divisionales y, si toca, mueve al club.
  const promo = applyPromotionRelegation(state);
  const rivals = promo.nextRivals;
  const promoTone: NewsTone =
    promo.userMoved === 'ascenso' ? 'good' : promo.userMoved === 'descenso' ? 'bad' : 'neutral';

  const seasonNumber = state.seasonNumber + 1;

  const next: GameState = {
    saveVersion: SAVE_VERSION,
    seed: 0,
    seasonNumber,
    objectives: [],
    pastSeasons: [...state.pastSeasons, finishedSeason],
    week: 1,
    seasonLength: BALANCE.season.weeks,
    phase: 'preseason',
    club: {
      ...state.club,
      socialClimate: clamp(Math.round(state.club.socialClimate * 0.5 + 30)),
      organization: clamp(state.club.organization - 3),
      sportPrestige: clamp(state.club.sportPrestige - 2),
      socialPrestige: clamp(state.club.socialPrestige - 2),
    },
    players,
    rivals,
    schedule: SCHEDULE_ORDER,
    standings: [
      { teamId: 'club', wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 },
      ...rivals.map((r) => ({ teamId: r.id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 })),
    ],
    actionsChosen: [],
    actionsLog: [],
    actionsUsed: [],
    pendingEvent: null,
    eventOutcome: null,
    starters: [],
    rotation: [],
    callUp: [],
    live: null,
    lastMatch: null,
    history: [],
    news: [
      ...promo.notes.map((text) => ({ week: 0, text, tone: promoTone })),
      ...(state.secondTeam
        ? [{
            week: 0,
            text: `Venció la inscripción de ${state.secondTeam.name}: si el club quiere seguir en esa liga, hay que reinscribirlo.`,
            tone: 'neutral' as NewsTone,
          }]
        : []),
      { week: 0, text: `Termina la temporada ${state.seasonNumber}. Arranca la pretemporada: hay que rearmar el plantel.`, tone: 'neutral' as NewsTone },
    ],
    ledger: [{ week: 0, concept: `Caja heredada de la temporada ${state.seasonNumber}`, amount: state.club.money }],
    memorableMoments: [],
    clubTimeline: [
      ...state.clubTimeline,
      {
        season: state.seasonNumber,
        week: state.seasonLength,
        kind: 'hito' as const,
        text: `Cierra la temporada ${state.seasonNumber}: ${finishedSeason.position}° con récord ${finishedSeason.record}.`,
      },
    ],
    playersLeftCount: 0,
    sponsorWeeks: 0,
    gameOverReason: null,
    startingMoney: state.club.money,
    promises: [],
    preseason: null,
    world: emptyWorld(),
    playoffs: null,
    // El DT sigue en el club entre temporadas (si no se fue antes).
    coach: state.coach,
    coachMarket: buildCoachMarket(seasonNumber, state.seed),
    trialCandidate: null,
    divisionId: promo.nextDivisionId,
    otherDivisionTeams: promo.nextOtherTeams,
    // La dificultad de faltas acompaña al club toda la carrera.
    absenceDifficulty: state.absenceDifficulty,
    // Lo vivido entre compañeros (asados, sociedades, peleas) no se resetea.
    affinityBonus: state.affinityBonus ?? {},
  };
  if (promo.userMoved) {
    next.clubTimeline.push({
      season: state.seasonNumber,
      week: state.seasonLength,
      kind: 'hito',
      text: promo.userMoved === 'ascenso'
        ? `¡El club ascendió a la Divisional A tras la temporada ${state.seasonNumber}!`
        : `El club descendió a la Divisional B tras la temporada ${state.seasonNumber}.`,
    });
  }
  next.preseason = buildPreseasonState(players, next.club, rng, false);
  next.seed = rng.nextSeed();
  return next;
}

// ---------- Gestiones ----------

/** Charla con un jugador del plantel (dudando / no respondió / quiere irse). */
export function talkToPlayer(state: GameState, playerId: string): GameState {
  const s: GameState = structuredClone(state);
  const p = ps(s);
  if (p.gestionesLeft <= 0) return state;
  const player = s.players.find((x) => x.id === playerId);
  if (!player) return state;
  const status = p.continuity[playerId];
  const rng = new Rng(s.seed);
  p.gestionesLeft -= 1;

  if (status === 'dudando') {
    if (rng.chance(0.75)) {
      p.continuity[playerId] = 'confirmado';
      p.actionOutcome = `${player.name} te escuchó y confirmó: "Dale, una temporada más".`;
      psLog(s, `${player.name} confirmó que sigue.`);
    } else {
      p.actionOutcome = `${player.name} sigue dudando: "Dejame pensarlo unos días más".`;
    }
  } else if (status === 'no_respondio') {
    if (rng.chance(0.6)) {
      const confirmed = rng.chance(0.5);
      p.continuity[playerId] = confirmed ? 'confirmado' : 'dudando';
      p.actionOutcome = confirmed
        ? `Por fin atendió. ${player.name} confirma: "Perdón, estaba a full con el laburo".`
        : `${player.name} respondió, pero no define: "Ando complicado, dame unos días".`;
      if (confirmed) psLog(s, `${player.name} apareció y confirmó.`);
    } else {
      p.actionOutcome = `${player.name} sigue sin atender. Visto y sin respuesta.`;
    }
  } else if (status === 'quiere_irse') {
    const roll = rng.range(0, 1);
    if (roll < 0.15) {
      p.continuity[playerId] = 'confirmado';
      p.actionOutcome = `Charla larga con ${player.name}. Al final aflojó: "Está bien, me quedo por el grupo".`;
      psLog(s, `${player.name} se quedó después de una charla a corazón abierto.`);
    } else if (roll < 0.5) {
      const demand: DemandType = rng.chance(0.5) ? 'beca' : 'beca_parcial';
      p.continuity[playerId] = 'pide_condicion';
      p.playerDemands[playerId] = demand;
      p.actionOutcome = `${player.name} lo piensa, pero pone una condición: ${DEMAND_LABELS[demand].toLowerCase()}.`;
    } else {
      p.actionOutcome = `${player.name} está decidido: "No es contra vos, pero necesito un cambio".`;
    }
  } else {
    return state;
  }

  s.seed = rng.nextSeed();
  return s;
}

/** Abre una negociación (con jugador del plantel o fichable). Consume una gestión. */
export function openNegotiation(state: GameState, targetId: string, isMarket: boolean): GameState {
  const s: GameState = structuredClone(state);
  const p = ps(s);
  if (p.gestionesLeft <= 0) return state;
  p.gestionesLeft -= 1;
  p.negotiation = { targetId, isMarket };
  if (isMarket) {
    const mp = p.market.find((m) => m.id === targetId);
    if (!mp || mp.status !== 'disponible') return state;
    mp.contacted = true;
  }
  return s;
}

function feeStatusFor(mp: MarketPlayer, demandApplied: DemandType | null): FeeStatus {
  if (demandApplied === 'beca') return 'beca_total';
  if (demandApplied === 'beca_parcial') return 'beca_parcial';
  switch (mp.feeAttitude) {
    case 'completa':
      return 'pagada';
    case 'parcial':
      return 'beca_parcial';
    case 'beca':
      return 'beca_total';
  }
}

function roleFor(mp: MarketPlayer, demandApplied: DemandType | null): ExpectedRole {
  if (demandApplied === 'titularidad') return 'titular';
  if (demandApplied === 'minutos') return 'rotación';
  return mp.estTechnique >= 65 ? 'rotación' : 'suplente';
}

/** Ficha a un fichable con los términos dados. */
export function signMarketPlayer(
  s: GameState,
  mp: MarketPlayer,
  rng: Rng,
  terms: { demandApplied: DemandType | null; cost: number; promiseLabel?: string }
): { ok: boolean; text: string } {
  const p = ps(s);
  if (s.club.money < terms.cost) {
    return { ok: false, text: `No te alcanza la caja para cerrar este fichaje (necesitás $${terms.cost}).` };
  }
  if (terms.cost > 0) psSpend(s, `Fichaje de ${mp.name}`, terms.cost);
  const player = marketToPlayer(mp, feeStatusFor(mp, terms.demandApplied), roleFor(mp, terms.demandApplied), s.seasonNumber, rng);
  s.players.push(player);
  p.continuity[player.id] = 'confirmado';
  mp.status = 'fichado';

  let extra = '';
  if (terms.demandApplied) {
    addPromise(s, player.id, player.name, terms.demandApplied, terms.promiseLabel ?? DEMAND_LABELS[terms.demandApplied]);
  }
  if (terms.demandApplied === 'amigo') {
    const friend = createRecruit(rng, { minTechnique: 42, maxTechnique: 64, season: s.seasonNumber });
    friend.description = `Vino porque ficharon a su amigo ${mp.name}.`;
    s.players.push(friend);
    p.continuity[friend.id] = 'confirmado';
    extra = ` Y trajo a su amigo: se sumó ${friend.name} (${friend.position}).`;
  }
  psLog(s, `Fichamos a ${mp.name} (${mp.position}, ${mp.previousTeam}).`);
  logClubEvent(s, 'llegada', `Fichaje: llegó ${mp.name} (${mp.position}) desde ${mp.previousTeam}.`, 0);
  s.news.unshift({ week: 0, text: `Se sumó ${mp.name} al plantel.`, tone: 'good' });
  return { ok: true, text: `¡${mp.name} es nuevo jugador del club!${extra}` };
}

/** Resuelve la negociación abierta según la decisión del usuario. */
export function resolveNegotiation(
  state: GameState,
  decision: 'accept' | 'reject' | 'counter' | 'later' | 'priority'
): GameState {
  const s: GameState = structuredClone(state);
  const p = ps(s);
  const neg = p.negotiation;
  if (!neg) return state;
  const rng = new Rng(s.seed);

  if (decision === 'later') {
    p.negotiation = null;
    s.seed = rng.nextSeed();
    return s;
  }

  if (neg.isMarket) {
    const mp = p.market.find((m) => m.id === neg.targetId);
    if (!mp || mp.status !== 'disponible') return state;

    if (decision === 'accept') {
      const cost = mp.signingCost;
      p.actionOutcome = signMarketPlayer(s, mp, rng, {
        demandApplied: mp.demand,
        cost,
        promiseLabel: mp.demand ? `${mp.name}: ${DEMAND_LABELS[mp.demand]}` : undefined,
      }).text;
    } else if (decision === 'reject') {
      if (!mp.demand) return state;
      if (rng.chance(mp.flexibility)) {
        // Viene igual, sin condiciones: paga cuota completa y sin promesas.
        const cost = mp.demand === 'fichaje_pagado' ? 0 : mp.signingCost;
        const originalDemand = mp.demand;
        const originalAttitude = mp.feeAttitude;
        mp.demand = null;
        mp.feeAttitude = 'completa';
        const result = signMarketPlayer(s, mp, rng, { demandApplied: null, cost });
        if (!result.ok) {
          mp.demand = originalDemand;
          mp.feeAttitude = originalAttitude;
        }
        p.actionOutcome = result.ok ? `Aceptó venir sin condiciones. ${result.text}` : result.text;
      } else {
        mp.status = 'rechazo';
        p.actionOutcome = `${mp.name} se lo tomó a mal: "Si no valoran lo que pido, no voy". No va a venir.`;
        psLog(s, `${mp.name} rechazó la propuesta y se bajó.`);
      }
    } else if (decision === 'priority') {
      // Negociar la agenda: que acomode sus días y horarios por el club.
      if (!mp.agenda || p.priorityUsed?.[mp.id]) return state;
      p.priorityUsed = { ...(p.priorityUsed ?? {}), [mp.id]: true };
      if (rng.chance(Math.min(0.85, mp.flexibility + 0.15))) {
        mp.agenda = {
          ...mp.agenda,
          blockedDays: [],
          onlyTimes: [],
          baseChance: Math.max(mp.agenda.baseChance, 0.88),
          notes: ['Se comprometió a priorizar al club: va a acomodar sus cosas para estar.'],
        };
        p.actionOutcome = `${mp.name} lo pensó un segundo y asintió: "Si me hacés un lugar, yo me acomodo". Va a priorizar al club. La negociación sigue abierta.`;
        psLog(s, `${mp.name} se comprometió a priorizar al club si lo fichás.`);
      } else {
        p.actionOutcome = `${mp.name} fue honesto: "Mi agenda es la que es. Si te sirvo así, encantado; si no, lo entiendo". Sigue disponible.`;
      }
      p.negotiation = null;
      s.seed = rng.nextSeed();
      return s;
    } else if (decision === 'counter') {
      const counter = mp.demand ? COUNTER_OFFERS[mp.demand] : undefined;
      if (!counter || p.counterUsed[mp.id]) return state;
      if (rng.chance(Math.min(0.9, mp.flexibility + 0.3))) {
        if (counter.result === 'medio_pase') {
          const halfCost = Math.round(mp.signingCost / 2);
          const result = signMarketPlayer(s, mp, rng, { demandApplied: null, cost: halfCost });
          p.actionOutcome = result.ok ? `Acordaron pagar el pase a medias ($${halfCost}). ${result.text}` : result.text;
        } else {
          const newDemand = counter.result as DemandType;
          const result = signMarketPlayer(s, mp, rng, {
            demandApplied: newDemand,
            cost: mp.signingCost,
            promiseLabel: `${mp.name}: ${DEMAND_LABELS[newDemand]}`,
          });
          p.actionOutcome = result.ok ? `Aceptó la contraoferta. ${result.text}` : result.text;
        }
      } else {
        p.counterUsed[mp.id] = true;
        p.actionOutcome = `${mp.name} no aceptó la contraoferta: "Lo que pedí es lo que necesito". Sigue disponible, pero no va a moverse de ahí.`;
      }
    }
  } else {
    // Negociación con un jugador del plantel que pide condición.
    const player = s.players.find((x) => x.id === neg.targetId);
    const demand = p.playerDemands[neg.targetId];
    if (!player || !demand) return state;

    if (decision === 'accept') {
      applyDemandToPlayer(player, demand);
      addPromise(s, player.id, player.name, demand, `${player.name}: ${DEMAND_LABELS[demand]}`);
      p.continuity[player.id] = 'confirmado';
      player.motivation = clamp(player.motivation + 8);
      p.actionOutcome = `${player.name} confirmó: le prometiste ${DEMAND_LABELS[demand].toLowerCase()}.`;
      psLog(s, `${player.name} sigue en el club (promesa: ${DEMAND_LABELS[demand].toLowerCase()}).`);
    } else if (decision === 'reject') {
      const flexibility = Math.max(0.15, (player.commitment / 100) * 0.6);
      if (rng.chance(flexibility)) {
        p.continuity[player.id] = 'confirmado';
        player.motivation = clamp(player.motivation - 5);
        p.actionOutcome = `${player.name} aceptó seguir sin condiciones, aunque quedó masticando un poco.`;
        psLog(s, `${player.name} confirmó sin condiciones.`);
      } else {
        p.continuity[player.id] = 'quiere_irse';
        p.actionOutcome = `${player.name} se lo tomó mal: "Entonces no cuenten conmigo". Ahora quiere irse.`;
      }
    } else if (decision === 'counter') {
      const counter = COUNTER_OFFERS[demand];
      if (!counter || p.counterUsed[player.id] || counter.result === 'medio_pase') return state;
      const newDemand = counter.result as DemandType;
      if (rng.chance(0.55 + player.commitment / 400)) {
        applyDemandToPlayer(player, newDemand);
        addPromise(s, player.id, player.name, newDemand, `${player.name}: ${DEMAND_LABELS[newDemand]}`);
        p.continuity[player.id] = 'confirmado';
        p.actionOutcome = `${player.name} aceptó la contraoferta (${DEMAND_LABELS[newDemand].toLowerCase()}) y confirmó.`;
        psLog(s, `${player.name} sigue en el club (promesa: ${DEMAND_LABELS[newDemand].toLowerCase()}).`);
      } else {
        p.counterUsed[player.id] = true;
        p.actionOutcome = `${player.name} no aceptó: "Lo que pedí no es un capricho". Mantiene su condición.`;
      }
    }
  }

  p.negotiation = null;
  s.seed = rng.nextSeed();
  return s;
}

function applyDemandToPlayer(player: Player, demand: DemandType): void {
  if (demand === 'beca') {
    player.feeStatus = 'beca_total';
    player.weeksUnpaid = 0;
  } else if (demand === 'beca_parcial') {
    player.feeStatus = 'beca_parcial';
    player.weeksUnpaid = 0;
  } else if (demand === 'titularidad') {
    player.expectedRole = 'titular';
  } else if (demand === 'minutos') {
    player.expectedRole = 'rotación';
  }
  // competitivo / ambiente / sin_entrenar quedan solo como promesa registrada.
}

// ---------- Avance semanal ----------

export function advancePreseasonWeek(state: GameState): GameState {
  const p0 = state.preseason;
  if (!p0) return state;
  if (p0.week >= p0.totalWeeks) return closePreseason(state);

  const s: GameState = structuredClone(state);
  const p = ps(s);
  const rng = new Rng(s.seed);

  p.week += 1;
  p.gestionesLeft = BALANCE.preseason.gestionesPerWeek;
  psSpend(s, 'Gastos de mantenimiento (pretemporada)', BALANCE.preseason.weeklyUpkeep);

  // El mercado se mueve: otros clubes también fichan.
  for (const mp of p.market) {
    if (mp.status !== 'disponible') continue;
    const lostChance = mp.availability === 'escuchando_ofertas' ? 0.22 : p.week >= 3 ? 0.08 : 0;
    if (lostChance > 0 && rng.chance(lostChance)) {
      mp.status = 'perdido';
      psLog(s, `${mp.name} arregló con otro club. Se cayó esa opción.`);
    }
  }

  // La indefinición se pudre sola.
  for (const player of s.players.filter((x) => !x.leftClub)) {
    const st = p.continuity[player.id];
    if (st === 'no_respondio' && rng.chance(0.2)) {
      p.continuity[player.id] = 'quiere_irse';
      psLog(s, `${player.name} sigue sin responder; te llegó el rumor de que no quiere volver.`);
    } else if (st === 'dudando' && rng.chance(0.12)) {
      p.continuity[player.id] = 'no_respondio';
      psLog(s, `${player.name} dejó de contestar los mensajes.`);
    }
  }

  if (rng.chance(BALANCE.preseason.eventChance)) {
    p.pendingEvent = rollPreseasonEvent(s, rng);
  }

  s.seed = rng.nextSeed();
  return s;
}

// ---------- Cierre e inicio de temporada ----------

function computeStrengthsAndRisks(s: GameState): { strengths: string[]; risks: string[] } {
  const roster = s.players.filter((p) => !p.leftClub);
  const strengths: string[] = [];
  const risks: string[] = [];

  const positions = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'] as const;
  const missing = positions.filter((pos) => !roster.some((p) => p.position === pos));
  if (missing.length === 0) strengths.push('Todas las posiciones tienen al menos un jugador natural.');
  else risks.push(`Sin ${missing.join(' ni ')} natural en el plantel.`);

  const top5 = [...roster].sort((a, b) => b.visibleRating - a.visibleRating).slice(0, 5);
  const avgTop = top5.reduce((sum, p) => sum + p.visibleRating, 0) / Math.max(1, top5.length);
  if (avgTop >= 66) strengths.push('El quinteto de arriba tiene nivel para pelear la liga.');
  else if (avgTop < 55) risks.push('El quinteto luce flojo frente a los rivales fuertes.');

  if (roster.length >= 11) strengths.push('Plantel largo: hay recambio para lesiones y ausencias.');
  else if (roster.length <= 9) risks.push('Plantel corto: dos lesiones y quedás al borde del forfeit.');

  const socialAvg = roster.reduce((sum, p) => sum + p.social, 0) / Math.max(1, roster.length);
  if (socialAvg >= 66) strengths.push('Grupo con buena pasta social: el vestuario se banca solo.');

  const fees = roster.reduce((sum, p) => sum + weeklyFee(p), 0);
  const costs = BALANCE.economy.courtRentWeekly + BALANCE.economy.refereeWeekly;
  if (fees >= costs) strengths.push('Las cuotas cubren los gastos fijos semanales.');
  else if (fees < costs * 0.6) risks.push('Las cuotas no cubren ni el 60% de los gastos: la caja se achica sola.');

  const unknowns = roster.filter((p) => p.description.includes('No tenés referencias') || p.description.includes('datos sueltos')).length;
  if (unknowns >= 2) risks.push(`Fichaste ${unknowns} jugadores casi sin referencias: pueden ser cualquier cosa.`);

  const promisesCount = s.promises.filter((pr) => pr.season === s.seasonNumber).length;
  if (promisesCount >= 3) risks.push(`Hay ${promisesCount} promesas por cumplir: si fallás, se van a acordar.`);

  if (s.club.money < 150) risks.push('La caja quedó al límite: una mala semana y estás en rojo.');

  return { strengths, risks };
}

export function closePreseason(state: GameState): GameState {
  const s: GameState = structuredClone(state);
  const p = ps(s);
  const rng = new Rng(s.seed);
  const consequences: string[] = [];
  const lostEntries: PreseasonSummaryEntry[] = [];
  const emergencyEntries: PreseasonSummaryEntry[] = [];

  // Los que no confirmaron, no siguen.
  for (const player of s.players) {
    if (player.leftClub) continue;
    const st = p.continuity[player.id];
    if (st !== 'confirmado') {
      player.leftClub = true;
      lostEntries.push({ id: player.id, label: `${player.name} (${CONTINUITY_LABELS[st].label.toLowerCase()})` });
    }
  }

  let roster = s.players.filter((x) => !x.leftClub);

  // Plantel corto: jugadores de emergencia para poder inscribirse.
  if (roster.length < BALANCE.preseason.minPlayers) {
    const needed = BALANCE.preseason.minPlayers - roster.length;
    for (let i = 0; i < needed; i++) {
      const emergency = createRecruit(rng, { minTechnique: 32, maxTechnique: 48, season: s.seasonNumber });
      emergency.description = 'Vino a dar una mano a último momento para que el club pudiera inscribirse.';
      s.players.push(emergency);
      p.continuity[emergency.id] = 'confirmado';
      emergencyEntries.push({ id: emergency.id, label: emergency.name });
    }
    s.club.socialPrestige = clamp(s.club.socialPrestige - BALANCE.preseason.emergencyPrestigeHit);
    consequences.push(
      `No llegaste a ${BALANCE.preseason.minPlayers} jugadores: hubo que salir a buscar ${needed === 1 ? 'un jugador' : `${needed} jugadores`} de emergencia (prestigio social -${BALANCE.preseason.emergencyPrestigeHit}).`
    );
    roster = s.players.filter((x) => !x.leftClub);
  }

  // Inscripción: si no alcanza la plata, la comisión pasa la gorra.
  const fee = BALANCE.economy.inscriptionFee;
  if (s.club.money < fee) {
    const needed = fee - s.club.money;
    psEarn(s, 'Aporte extraordinario de la comisión', needed);
    s.club.socialPrestige = clamp(s.club.socialPrestige - BALANCE.preseason.bailoutSocialHit);
    s.club.sportPrestige = clamp(s.club.sportPrestige - BALANCE.preseason.bailoutSportHit);
    consequences.push(
      `No alcanzaba la caja para la inscripción: la comisión puso $${needed} de su bolsillo. El club arranca debiendo favores (prestigio -${BALANCE.preseason.bailoutSocialHit}).`
    );
  }
  psSpend(s, 'Inscripción a la liga', fee);

  const { strengths, risks } = computeStrengthsAndRisks(s);
  const seasonPromises = s.promises.filter((pr) => pr.season === s.seasonNumber);

  p.summary = {
    roster: roster.map((x) => ({ id: x.id, label: `${x.name} (${x.position})` })),
    lost: lostEntries,
    signed: p.market
      .filter((m) => m.status === 'fichado')
      .map((m) => ({ id: s.players.find((x) => !x.leftClub && x.name === m.name)?.id ?? '', label: m.name })),
    emergency: emergencyEntries,
    moneySpent: p.moneySpent,
    projectedWeeklyFees: roster.reduce((sum, x) => sum + weeklyFee(x), 0),
    projectedWeeklyCosts: BALANCE.economy.courtRentWeekly + BALANCE.economy.refereeWeekly,
    scholarships: roster.filter((x) => x.feeStatus === 'beca_total' || x.feeStatus === 'beca_parcial').length,
    promises: seasonPromises.map((pr) => pr.label),
    strengths,
    risks,
    consequences,
  };

  s.phase = 'preseasonEnd';
  s.seed = rng.nextSeed();
  return s;
}

/** Del resumen de pretemporada al primer partido de la temporada. */
export function startSeasonFromPreseason(state: GameState): GameState {
  const s: GameState = structuredClone(state);
  const rng = new Rng(s.seed);

  s.objectives = generateObjectives(s.seasonNumber, s.club.sportPrestige, rng);
  s.week = 1;
  s.phase = 'planning';
  s.starters = suggestStarters(s.players);
  s.rotation = suggestRotation(s.players, s.starters);
  s.news.unshift({
    week: 1,
    text: `¡Arranca la temporada ${s.seasonNumber}! La comisión fijó los objetivos del año.`,
    tone: 'good',
  });
  logClubEvent(s, 'hito', `Arranca la temporada ${s.seasonNumber} con ${s.players.filter((p) => !p.leftClub).length} jugadores en el plantel.`, 0);
  s.preseason = null;
  // El mundo se rearma cada temporada: planteles rivales nuevos y fixture nuevo.
  s.world = buildWorld(s, rng);
  s.seed = rng.nextSeed();
  return s;
}
