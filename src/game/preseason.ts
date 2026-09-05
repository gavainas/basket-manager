import { BALANCE, clamp } from './balance';
import { buildMarket, marketToPlayer, ORIGIN_SITUATIONS, worldToMarket } from '../data/market';
import { createInitialRoster } from '../data/players';
import { createRecruit } from '../data/recruits';
import { RIVALS, SCHEDULE_ORDER } from '../data/rivals';
import {
  LEAGUES,
  LEAGUE_ENTRIES,
  PLAZA_DIVISION_ID,
  USER_DIVISION_ID,
  leagueEntryOf,
} from '../data/worldData';
import type { LeaguePrize } from '../data/worldData';
import {
  applyPromotionRelegation,
  divisionById,
  divisionsOfLeague,
  initialWorldDivisions,
  joinDivision,
  leagueOfDivision,
  leaguePromotes,
  rivalsForDivision,
  scheduleFor,
} from './pyramid';
import { rollWeekBanter } from './banter';
import { rollWeekMoment } from './moments';
import { weeklyFee } from './economy';
import { generateObjectives } from './objectives';
import { clubPosition, suggestRotation, suggestStarters } from './match';
import { buildCoachMarket } from './coach';
import { computeSeasonEvaluation } from './evaluation';
import { rollPreseasonEvent } from './preseasonEvents';
import { logClubEvent } from './timeline';
import { buildWorld, dayLabel, emptyWorld, evolveWorldOffseason } from './world';
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
  WeekDay,
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
  firstSeason: boolean,
  seasonNumber: number,
  inPlaza: boolean
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

  // La plaza se cobra en el vestuario: pasar el año ahí les queda chico a los
  // que juegan al básquet en serio. El competitivo condiciona la vuelta, y el
  // que vive de su cartel directamente arma el bolso.
  if (inPlaza) {
    if (p.personality === 'competitivo' && p.technique >= BALANCE.plaza.ambitionMinTech) {
      const roll = rng.range(0, 1);
      if (roll < 0.25) return { status: 'quiere_irse' };
      if (roll < 0.75) return { status: 'pide_condicion', demand: 'competitivo' };
    }
    if (
      (p.personality === 'protagonista' || p.personality === 'mercenario') &&
      p.technique >= BALANCE.plaza.ambitionMinTech &&
      rng.chance(0.4)
    ) {
      return { status: 'quiere_irse' };
    }
  }

  // La promesa rota del año pasado se cobra acá: el que quedó pagando vuelve
  // con condiciones duras… o directamente con el bolso armado.
  if (p.grudge && p.grudge.season === seasonNumber - 1) {
    const roll = rng.range(0, 1);
    if (roll < 0.2) return { status: 'quiere_irse' };
    if (roll < 0.75) {
      const demand: DemandType =
        p.grudge.type === 'titularidad' || p.grudge.type === 'minutos' ? 'titularidad' : 'beca_parcial';
      return { status: 'pide_condicion', demand };
    }
    return { status: 'dudando' };
  }

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

function buildPreseasonState(
  players: Player[],
  club: Club,
  rng: Rng,
  firstSeason: boolean,
  seasonNumber = 1,
  marketFromWorld: MarketPlayer[] = [],
  inPlaza = false
): PreseasonState {
  const continuity: Record<string, ContinuityStatus> = {};
  const playerDemands: Record<string, DemandType> = {};

  const active = players.filter((p) => !p.leftClub);
  for (const p of active) {
    const r = assignContinuity(p, club, rng, firstSeason, seasonNumber, inPlaza);
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
    chosenDivisionId: null,
    continuity,
    playerDemands,
    market: buildMarket(rng, { fromWorld: marketFromWorld, takenNames: active.map((x) => x.name) }),
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

// ---------- Inscripción: la oferta de ligas ----------

export interface LeagueOption {
  divisionId: string;
  leagueId: string;
  leagueName: string;
  divisionName: string;
  gameDay: WeekDay;
  gameTimes: string[];
  fee: number;
  /** Lectura del nivel según los rivales de esa liga. */
  levelLabel: string;
  /** Nota con carácter de la opción (qué se gana y qué se paga). */
  note: string;
  isCurrent: boolean;
  isPlaza: boolean;
  /**
   * Acá te conocen: si no llegás con la inscripción, te la fían (deuda que
   * se devuelve durante la temporada). Las ligas nuevas cobran contado.
   */
  trusts: boolean;
  /** Fechas de la fase regular: los torneos cortos tienen menos. */
  weeks: number;
  /** La liga mueve equipos entre divisionales al cierre de la temporada. */
  promotes: boolean;
  /** Te guardaron el lugar: volvés a la categoría que dejaste. */
  isHeld: boolean;
  /** Premio en plata del podio, si la liga reparte. */
  prize?: LeaguePrize;
  /** Lo que mueve anotarse acá (una sola vez, al inscribirse). */
  prestigeOnJoin?: { sport?: number; social?: number };
  /** Si el club no puede anotarse, por qué. */
  locked?: string;
}

function levelLabelFor(avgStrength: number): string {
  if (avgStrength >= 68) return 'Nivel muy duro';
  if (avgStrength >= 58) return 'Nivel competitivo';
  if (avgStrength >= 48) return 'Nivel accesible';
  return 'Nivel para pasear';
}

/**
 * Arma una opción de la oferta. Los rivales salen del mundo vivo: la
 * divisional que te guardaron siguió teniendo ascensos y descensos sin vos,
 * y el nivel que se muestra es el de este año, no el del año que te fuiste.
 */
function optionFor(s: GameState, divisionId: string, opts: { held?: boolean } = {}): LeagueOption {
  const division = divisionById(divisionId)!;
  const league = LEAGUES.find((l) => l.id === division.leagueId)!;
  const entry = leagueEntryOf(league.id);
  const isCurrent = divisionId === s.divisionId;
  const isPlaza = divisionId === PLAZA_DIVISION_ID;
  const held = !!opts.held;
  const rivals = isCurrent ? s.rivals : rivalsForDivision(s, divisionId);
  const avg = rivals.reduce((sum, r) => sum + r.strength, 0) / Math.max(1, rivals.length);
  const known = isCurrent || held;
  const below = divisionsOfLeague(league.id).find((d) => d.level === division.level + 1);
  const above = divisionsOfLeague(league.id).find((d) => d.level === division.level - 1);
  const movimientos: string[] = [];
  if (above) movimientos.push(`los dos finalistas de la Copa de Oro ascienden a la ${above.name}`);
  if (below) movimientos.push(`los dos últimos se van a la ${below.name}`);
  const remate = !above
    ? ' Arriba no hay nada: es la categoría más alta de la liga.'
    : !below
      ? ' Abajo no hay nada: de acá no se baja.'
      : '';
  const note = isCurrent
    ? leaguePromotes(league.id)
      ? `Tu categoría de siempre: acá te conocen y te fían la ficha si no llegás con la plata. La categoría se mueve: ${movimientos.join(' y ')}.${remate}`
      : 'Tu liga de siempre: acá te conocen, y si no llegás con la plata, te la fían (deuda que se paga en temporada).'
    : held
      ? 'Te guardaron el lugar: el dueño de la liga te conoce, y si no llegás con la plata, te la fía. Volvés a la categoría que dejaste.'
      : entry?.note ?? 'Una liga nueva para el club.';

  const minPrestige = entry?.minSportPrestige;
  const locked =
    !isCurrent && !held && minPrestige !== undefined && s.club.sportPrestige < minPrestige
      ? `Piden antecedentes: al menos ${minPrestige} de prestigio deportivo y el club tiene ${Math.round(s.club.sportPrestige)}.`
      : undefined;

  return {
    divisionId,
    leagueId: league.id,
    leagueName: league.name,
    divisionName: division.name,
    gameDay: division.gameDay,
    gameTimes: division.gameTimes,
    fee: isPlaza ? 0 : entry?.fee ?? BALANCE.economy.inscriptionFee,
    levelLabel: levelLabelFor(avg),
    note,
    isCurrent,
    isPlaza,
    // Te fía la liga donde ya estás y la que te guarda el lugar; las nuevas
    // cobran contado hasta que te conozcan.
    trusts: known ? true : entry?.trusts ?? false,
    weeks: rivals.length,
    promotes: leaguePromotes(league.id),
    isHeld: held,
    prize: entry?.prize,
    prestigeOnJoin: !isCurrent && !held ? entry?.prestigeOnJoin : undefined,
    locked,
  };
}

/**
 * La oferta de ligas de esta pretemporada: tu divisional actual, las que te
 * guardan el lugar y las ligas donde el club puede entrar de afuera. La
 * elección se hace con PS_CHOOSE_LEAGUE y se paga al cierre.
 */
export function inscriptionOffer(s: GameState): LeagueOption[] {
  const options: LeagueOption[] = [optionFor(s, s.divisionId)];
  for (const heldId of s.heldDivisionIds ?? []) {
    if (heldId !== s.divisionId && divisionById(heldId)) options.push(optionFor(s, heldId, { held: true }));
  }
  const currentLeagueId = leagueOfDivision(s.divisionId)?.id;
  for (const entry of LEAGUE_ENTRIES) {
    if (entry.leagueId === currentLeagueId) continue;
    if (options.some((o) => o.leagueId === entry.leagueId)) continue;
    options.push(optionFor(s, entry.entryDivisionId));
  }
  return options;
}

/**
 * El premio en plata del podio: las ligas que lo reparten lo pagan al cierre
 * de la temporada (hoy, el torneo corto del Comercio).
 */
export function seasonPrize(state: GameState): { amount: number; text: string } | null {
  const leagueId = leagueOfDivision(state.divisionId)?.id;
  const prize = leagueId ? leagueEntryOf(leagueId)?.prize : undefined;
  if (!prize) return null;
  const P = state.playoffs;
  if (!P) return null;
  const leagueName = LEAGUES.find((l) => l.id === leagueId)?.name ?? 'la liga';
  if (P.champions.oro === 'club') {
    return { amount: prize.champion, text: `Premio de campeón de la ${leagueName}: $${prize.champion} que pusieron los auspiciantes.` };
  }
  const finalOro = P.ties.find((t) => t.cup === 'oro' && t.round === 'final');
  if (finalOro && (finalOro.homeId === 'club' || finalOro.awayId === 'club')) {
    return { amount: prize.runnerUp, text: `Premio de finalista de la ${leagueName}: $${prize.runnerUp}.` };
  }
  if (P.champions.plata === 'club') {
    return { amount: prize.silver, text: `Premio por ganar la Copa de Plata de la ${leagueName}: $${prize.silver}.` };
  }
  return null;
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
    leagueStats: {},
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
    worldDivisions: initialWorldDivisions(USER_DIVISION_ID),
    heldDivisionIds: [],
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

  // El fiado no cruza el verano: al cerrar el año, la liga pasa a cobrar lo
  // que haya quedado en el cuaderno. Si la caja no llega, queda en rojo y la
  // pretemporada lo va a hacer doler (la comisión tapa agujeros con prestigio).
  const oldDebt = state.inscriptionDebt;
  const debtSettled = oldDebt && oldDebt.remaining > 0 ? oldDebt.remaining : 0;
  // El premio del podio (las ligas que reparten) entra en la caja del verano.
  const prize = seasonPrize(state);
  const inheritedMoney = state.club.money - debtSettled + (prize?.amount ?? 0);

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
    np.suspendedWeeks = 0;
    np.seasonTechs = 0;
    np.promiseLog = [];
    // El rencor dura una temporada entera; más viejo que eso, prescribe.
    if (np.grudge && np.grudge.season < state.seasonNumber) np.grudge = null;
    if (np.feeStatus === 'pendiente') {
      np.feeStatus = 'pagada';
      np.weeksUnpaid = 0;
    }
    return np;
  });

  // Ascensos y descensos: mueve toda la pirámide (divisional por divisional,
  // la juegue el club o no) y, si toca, cambia de categoría al club.
  const promo = applyPromotionRelegation(state);
  const rivals = promo.nextRivals;
  const promoTone: NewsTone =
    promo.userMoved === 'ascenso' ? 'good' : promo.userMoved === 'descenso' ? 'bad' : 'neutral';

  // El verano del mundo: las personas rivales siguen su vida (retiros, pases,
  // libres). Corre ANTES de armar el mercado, que se alimenta de sus libres.
  const summer = evolveWorldOffseason(state, rng);

  const seasonNumber = state.seasonNumber + 1;

  const next: GameState = {
    saveVersion: SAVE_VERSION,
    seed: 0,
    seasonNumber,
    objectives: [],
    pastSeasons: [...state.pastSeasons, finishedSeason],
    week: 1,
    // El largo del torneo lo pone la liga: los rivales que tenés son las fechas.
    seasonLength: rivals.length,
    phase: 'preseason',
    club: {
      ...state.club,
      money: inheritedMoney,
      socialClimate: clamp(Math.round(state.club.socialClimate * 0.5 + 30)),
      organization: clamp(state.club.organization - 3),
      sportPrestige: clamp(state.club.sportPrestige - 2),
      socialPrestige: clamp(state.club.socialPrestige - 2),
    },
    players,
    rivals,
    schedule: scheduleFor(rivals),
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
    leagueStats: {},
    news: [
      ...(debtSettled > 0
        ? [{
            week: 0,
            text: `La ${oldDebt!.leagueName} pasó a cobrar lo que quedaba del fiado de la inscripción: $${debtSettled}. Cuentas claras antes del año nuevo.`,
            tone: 'neutral' as NewsTone,
          }]
        : []),
      ...(prize ? [{ week: 0, text: prize.text, tone: 'good' as NewsTone }] : []),
      ...promo.notes.map((text) => ({ week: 0, text, tone: promoTone })),
      ...summer.news.map((text) => ({ week: 0, text, tone: 'neutral' as NewsTone })),
      ...(state.secondTeam
        ? [{
            week: 0,
            text: `Venció la inscripción de ${state.secondTeam.name}: si el club quiere seguir en esa liga, hay que reinscribirlo.`,
            tone: 'neutral' as NewsTone,
          }]
        : []),
      { week: 0, text: `Termina la temporada ${state.seasonNumber}. Arranca la pretemporada: hay que rearmar el plantel.`, tone: 'neutral' as NewsTone },
    ],
    ledger: [
      { week: 0, concept: `Caja heredada de la temporada ${state.seasonNumber}`, amount: state.club.money },
      ...(debtSettled > 0
        ? [{ week: 0, concept: `Liquidación del fiado de la inscripción (${oldDebt!.leagueName})`, amount: -debtSettled }]
        : []),
      ...(prize ? [{ week: 0, concept: 'Premio del podio', amount: prize.amount }] : []),
    ],
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
    startingMoney: inheritedMoney,
    promises: [],
    preseason: null,
    // El mundo nuevo hereda las PERSONAS del verano; equipos y fixture se
    // rearman recién al arrancar la temporada (buildWorld).
    world: { ...emptyWorld(), players: summer.players, playerSeq: summer.playerSeq },
    playoffs: null,
    // El DT sigue en el club entre temporadas (si no se fue antes).
    coach: state.coach,
    coachMarket: buildCoachMarket(seasonNumber, state.seed),
    trialCandidate: null,
    divisionId: promo.nextDivisionId,
    worldDivisions: promo.nextWorldDivisions,
    // Los lugares que las ligas le guardan al club (si anda jugando en otra).
    heldDivisionIds: [...(state.heldDivisionIds ?? [])],
    // La dificultad de faltas acompaña al club toda la carrera.
    absenceDifficulty: state.absenceDifficulty,
    // Lo vivido entre compañeros (asados, sociedades, peleas) no se resetea.
    affinityBonus: state.affinityBonus ?? {},
    // La espina clavada tampoco: la revancha puede esperar un año entero.
    nemesis: state.nemesis ?? null,
  };
  if (promo.userMoved) {
    const fromName = divisionById(state.divisionId)?.name ?? 'su divisional';
    const toName = divisionById(promo.nextDivisionId)?.name ?? 'otra divisional';
    next.clubTimeline.push({
      season: state.seasonNumber,
      week: state.seasonLength,
      kind: 'hito',
      text: promo.userMoved === 'ascenso'
        ? `¡El club ascendió de la ${fromName} a la ${toName} tras la temporada ${state.seasonNumber}!`
        : `El club descendió de la ${fromName} a la ${toName} tras la temporada ${state.seasonNumber}.`,
    });
  }
  next.preseason = buildPreseasonState(
    players,
    next.club,
    rng,
    false,
    next.seasonNumber,
    summer.freeAgents.map((fa) => worldToMarket(fa.player, fa.fromClub, rng)),
    next.divisionId === PLAZA_DIVISION_ID
  );
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

/**
 * ¿Esta pretemporada apunta a la plaza? Vale la liga elegida, o la actual
 * mientras no se haya elegido otra (un club de la plaza sigue ahí por defecto).
 */
export function plazaBound(s: GameState): boolean {
  const chosen = s.preseason?.chosenDivisionId;
  if (chosen) return chosen === PLAZA_DIVISION_ID;
  return s.divisionId === PLAZA_DIVISION_ID;
}

/** Figura del mercado: cartel deportivo con el que la plaza ni se discute. */
export function isMarketFigure(mp: MarketPlayer): boolean {
  return mp.sportRep >= BALANCE.plaza.figureRep;
}

/** Frases con las que una figura te corta el teléfono si jugás en la plaza. */
const FIGURE_SNUBS = [
  '¿La plaza? No, flaco. Cuando vuelvan a jugar en serio, hablamos.',
  'Me hablaron bien de ustedes, pero yo los sábados a la tarde juego campeonatos, no picados.',
  'Sin ofender: a mí me llaman de ligas de verdad. Suerte con eso.',
];

/** Abre una negociación (con jugador del plantel o fichable). Consume una gestión. */
export function openNegotiation(state: GameState, targetId: string, isMarket: boolean): GameState {
  const s: GameState = structuredClone(state);
  const p = ps(s);
  if (p.gestionesLeft <= 0) return state;
  p.gestionesLeft -= 1;
  if (isMarket) {
    const mp = p.market.find((m) => m.id === targetId);
    if (!mp || mp.status !== 'disponible') return state;
    // Las figuras ni te atienden mientras el club juegue en la plaza: el
    // llamado se hace (gestión gastada), pero del otro lado cortan.
    if (plazaBound(s) && isMarketFigure(mp)) {
      const rng = new Rng(s.seed);
      p.actionOutcome = `${mp.name} atendió, escuchó "Liga de la Plaza" y cortó: "${rng.pick(FIGURE_SNUBS)}"`;
      psLog(s, `${mp.name} no quiso ni hablar: el club juega en la plaza.`);
      s.seed = rng.nextSeed();
      return s;
    }
    mp.contacted = true;
  }
  p.negotiation = { targetId, isMarket };
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
  // Si venía del mundo, la persona se muda a tu plantel: sale del pool rival
  // (el mundo no duplica gente).
  if (mp.worldPlayerId) {
    s.world.players = s.world.players.filter((wp) => wp.id !== mp.worldPlayerId);
  }

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
  const origin = ORIGIN_SITUATIONS[mp.previousTeam];
  psLog(s, `Fichamos a ${mp.name} (${mp.position}).${origin ? ` ${origin}` : ` Viene de ${mp.previousTeam}.`}`);
  logClubEvent(
    s,
    'llegada',
    origin
      ? `Fichaje: llegó ${mp.name} (${mp.position}). ${origin}`
      : `Fichaje: llegó ${mp.name} (${mp.position}) desde ${mp.previousTeam}.`,
    0
  );
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

    // El que arrastra una promesa rota negocia distinto: vino a cobrarse la deuda.
    const hasGrudge = !!player.grudge && player.grudge.season >= s.seasonNumber - 1;

    if (decision === 'accept') {
      applyDemandToPlayer(player, demand);
      addPromise(s, player.id, player.name, demand, `${player.name}: ${DEMAND_LABELS[demand]}`);
      p.continuity[player.id] = 'confirmado';
      player.motivation = clamp(player.motivation + 8);
      if (hasGrudge) {
        player.grudge = null;
        p.actionOutcome = `${player.name} confirmó: le prometiste ${DEMAND_LABELS[demand].toLowerCase()}. "Esta vez cumplí", te dijo mirándote fijo. La deuda del año pasado quedó saldada… si cumplís.`;
      } else {
        p.actionOutcome = `${player.name} confirmó: le prometiste ${DEMAND_LABELS[demand].toLowerCase()}.`;
      }
      psLog(s, `${player.name} sigue en el club (promesa: ${DEMAND_LABELS[demand].toLowerCase()}).`);
    } else if (decision === 'reject') {
      // Con rencor encima, negarse es casi un portazo asegurado.
      const flexibility = hasGrudge
        ? Math.max(0.05, (player.commitment / 100) * 0.25)
        : Math.max(0.15, (player.commitment / 100) * 0.6);
      if (rng.chance(flexibility)) {
        p.continuity[player.id] = 'confirmado';
        player.motivation = clamp(player.motivation - 5);
        p.actionOutcome = `${player.name} aceptó seguir sin condiciones, aunque quedó masticando un poco.`;
        psLog(s, `${player.name} confirmó sin condiciones.`);
      } else {
        p.continuity[player.id] = 'quiere_irse';
        p.actionOutcome = hasGrudge
          ? `${player.name} juntó sus cosas sin levantar la voz: "El año pasado ya me fallaste una vez. No hay segunda". Quiere irse.`
          : `${player.name} se lo tomó mal: "Entonces no cuenten conmigo". Ahora quiere irse.`;
      }
    } else if (decision === 'counter') {
      const counter = COUNTER_OFFERS[demand];
      if (!counter || p.counterUsed[player.id] || counter.result === 'medio_pase') return state;
      if (hasGrudge) {
        // A un acreedor no se le ofrece la mitad: la contraoferta ni se discute.
        p.counterUsed[player.id] = true;
        p.actionOutcome = `${player.name} ni la escuchó: "¿Otra promesa a medias? Lo que pedí, o nada". Mantiene su condición.`;
        p.negotiation = null;
        s.seed = rng.nextSeed();
        return s;
      }
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

  // Inscripción: la liga elegida — o el default a las corridas si nadie eligió.
  const offer = inscriptionOffer(s);
  // undefined = save de antes de que existiera la oferta: se inscribe como siempre, sin recargo.
  const late = p.chosenDivisionId === null;
  const chosen = offer.find((o) => o.divisionId === p.chosenDivisionId && !o.locked);
  const target = chosen ?? offer.find((o) => o.isCurrent)!;

  // Cambio de liga o divisional: rivales, tabla, fixture y largo de torneo
  // nuevos, y el lugar guardado donde corresponda (lo maneja joinDivision).
  if (target.divisionId !== s.divisionId) {
    const fromLeagueName = leagueOfDivision(s.divisionId)?.name ?? 'su liga';
    const move = joinDivision(s, target.divisionId);
    if (target.isPlaza) {
      s.club.sportPrestige = clamp(s.club.sportPrestige - BALANCE.preseason.plazaPrestigeHit);
      consequences.push(
        `El club se anotó en la Liga de la Plaza: gratis y los sábados a la tarde, pero el barrio lo lee como un paso atrás (prestigio deportivo -${BALANCE.preseason.plazaPrestigeHit}).${
          move.held ? ` La ${fromLeagueName} te guarda el lugar.` : ''
        }`
      );
      logClubEvent(s, 'hito', `El club dejó la ${fromLeagueName} y se anotó en la Liga de la Plaza.`, 0);
    } else if (target.isHeld) {
      consequences.push(
        `El club vuelve a la ${target.leagueName}: el lugar en la ${target.divisionName} estaba guardado y la vuelta se firmó sin drama.`
      );
      logClubEvent(s, 'hito', `El club volvió a la ${target.leagueName} (${target.divisionName}).`, 0);
    } else {
      const moves: string[] = [];
      if (target.prestigeOnJoin?.sport) {
        s.club.sportPrestige = clamp(s.club.sportPrestige + target.prestigeOnJoin.sport);
        moves.push(`prestigio deportivo +${target.prestigeOnJoin.sport}`);
      }
      if (target.prestigeOnJoin?.social) {
        s.club.socialPrestige = clamp(s.club.socialPrestige + target.prestigeOnJoin.social);
        moves.push(`prestigio social +${target.prestigeOnJoin.social}`);
      }
      consequences.push(
        `El club se anotó en la ${target.leagueName} (${target.divisionName}): se juega los ${dayLabel(target.gameDay)} y son ${target.weeks} fechas${
          moves.length ? ` (${moves.join(', ')})` : ''
        }.${move.held ? ` La ${fromLeagueName} te guarda el lugar.` : ''}`
      );
      logClubEvent(s, 'hito', `El club se pasó a la ${target.leagueName}: juega la ${target.divisionName}.`, 0);
    }
  }

  // El costo: la plaza es gratis; no elegir a tiempo tiene recargo y mala imagen.
  let fee = target.fee;
  if (late) {
    if (target.fee > 0) fee += BALANCE.preseason.lateInscriptionFee;
    s.club.socialPrestige = clamp(s.club.socialPrestige - BALANCE.preseason.lateInscriptionPrestigeHit);
    consequences.push(
      `Nadie eligió liga a tiempo: la comisión te anotó a último momento en ${target.leagueName}${
        target.fee > 0 ? ` con recargo ($${BALANCE.preseason.lateInscriptionFee})` : ''
      }. El apuro se notó (prestigio social -${BALANCE.preseason.lateInscriptionPrestigeHit}).`
    );
  }
  if (fee > 0) {
    if (s.club.money < fee && target.trusts) {
      // Fiado solo donde te conocen: entregás lo que hay en caja y el resto
      // queda anotado en el cuaderno de la liga. Se devuelve en temporada,
      // con presión semanal — y a la tercera cuota impaga, sanción deportiva.
      const cash = Math.max(0, s.club.money);
      const owed = fee - cash;
      if (cash > 0) psSpend(s, `Inscripción a ${target.leagueName} (entrega a cuenta)`, cash);
      s.inscriptionDebt = { total: owed, remaining: owed, leagueName: target.leagueName, missedWeeks: 0 };
      s.club.socialPrestige = clamp(s.club.socialPrestige - BALANCE.preseason.fiadoSocialHit);
      consequences.push(
        `No alcanzaba para la inscripción y la liga te fió $${owed}: acá te conocen. Se devuelve en cuotas de $${BALANCE.economy.debtInstallment} por semana durante la temporada — y si no pagás, la liga aprieta (prestigio social -${BALANCE.preseason.fiadoSocialHit}).`
      );
      logClubEvent(s, 'hito', `La ${target.leagueName} le fió al club $${owed} de la inscripción: acá lo conocen.`, 0);
    } else {
      // Liga que no te conoce (cuando la oferta las sume): cobra contado; si
      // no hay, queda la gorra de la comisión como último recurso, bien cara.
      if (s.club.money < fee) {
        const needed = fee - s.club.money;
        psEarn(s, 'Aporte extraordinario de la comisión', needed);
        s.club.socialPrestige = clamp(s.club.socialPrestige - BALANCE.preseason.bailoutSocialHit);
        s.club.sportPrestige = clamp(s.club.sportPrestige - BALANCE.preseason.bailoutSportHit);
        consequences.push(
          `${target.leagueName} cobra contado: acá no te conocen. La comisión puso $${needed} de su bolsillo y el club arranca debiendo favores (prestigio -${BALANCE.preseason.bailoutSocialHit}).`
        );
      }
      psSpend(s, `Inscripción a ${target.leagueName}`, fee);
    }
  }
  // La liga de la plaza es gratis, pero la caja igual puede haber quedado en
  // rojo por el mantenimiento: nadie arranca una temporada ya quebrado (antes
  // se entraba con caja negativa y el game over caía en la primera semana,
  // sin aviso). La comisión tapa el rojo, con el mismo costo de favores.
  if (s.club.money < 0) {
    const needed = -s.club.money;
    psEarn(s, 'Aporte extraordinario de la comisión', needed);
    s.club.socialPrestige = clamp(s.club.socialPrestige - BALANCE.preseason.bailoutSocialHit);
    s.club.sportPrestige = clamp(s.club.sportPrestige - BALANCE.preseason.bailoutSportHit);
    consequences.push(
      `La caja quedó en rojo y la comisión tapó el agujero ($${needed}) para poder arrancar. El club empieza debiendo favores (prestigio -${BALANCE.preseason.bailoutSocialHit}).`
    );
  }

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

  s.objectives = generateObjectives(s.seasonNumber, s.club.sportPrestige, rng, s.seasonLength);
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
  // Y la primera semana arranca con su pulso: momento del mundo y previa.
  rollWeekMoment(s, rng);
  rollWeekBanter(s, rng);
  s.seed = rng.nextSeed();
  return s;
}
