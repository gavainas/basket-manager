import { BALANCE, clamp } from './balance';
import { createInitialRoster } from '../data/players';
import { RIVALS, SCHEDULE_ORDER } from '../data/rivals';
import { INITIAL_OTHER_DIVISION, USER_DIVISION_ID } from '../data/worldData';
import { getAction } from './actions';
import { applyWeeklyEconomy } from './economy';
import { getEvent, rollEvent, rollTrialPractice } from './events';
import { generateObjectives } from './objectives';
import { activePlayers, matchAbsentIds, suggestRotation, suggestStarters } from './match';
import { rollCallUp } from './callup';
import { buildCoachMarket, coachWeeklyTick } from './coach';
import { advancePlayoffs } from './playoffs';
import { checkPromises } from './promises';
import { logClubEvent, logPlayerEvent } from './timeline';
import { buildWorld, emptyWorld, syncUserRegistrations } from './world';
import { Rng } from './rng';
import type { ActiveEvent, GameState } from './types';

export const SAVE_VERSION = 20;

export function createNewGame(seed: number): GameState {
  const rng = new Rng(seed);
  const players = createInitialRoster(rng);
  const money = BALANCE.economy.startingMoney - BALANCE.economy.inscriptionFee;
  const starters = suggestStarters(players);

  const state: GameState = {
    saveVersion: SAVE_VERSION,
    seed: 0,
    seasonNumber: 1,
    objectives: [],
    pastSeasons: [],
    week: 1,
    seasonLength: BALANCE.season.weeks,
    phase: 'planning',
    club: {
      name: 'Atlético El Parque',
      money,
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
    starters,
    rotation: suggestRotation(players, starters),
    callUp: [],
    live: null,
    lastMatch: null,
    history: [],
    news: [
      { week: 1, text: `Pagamos la inscripción a la liga ($${BALANCE.economy.inscriptionFee}). ¡Arranca la temporada!`, tone: 'neutral' },
      { week: 1, text: 'Sos el nuevo manager de Atlético El Parque. El club es tuyo: que sobreviva.', tone: 'good' },
    ],
    ledger: [
      { week: 1, concept: 'Caja inicial del club', amount: BALANCE.economy.startingMoney },
      { week: 1, concept: 'Inscripción a la liga', amount: -BALANCE.economy.inscriptionFee },
    ],
    memorableMoments: [],
    clubTimeline: [
      { season: 1, week: 0, kind: 'hito', text: 'Nace la temporada 1 de Atlético El Parque: el club se inscribe en la liga.' },
    ],
    playersLeftCount: 0,
    sponsorWeeks: 0,
    gameOverReason: null,
    startingMoney: money,
    promises: [],
    preseason: null,
    world: emptyWorld(),
    playoffs: null,
    coach: null,
    coachMarket: buildCoachMarket(1, seed),
    trialCandidate: null,
    divisionId: USER_DIVISION_ID,
    otherDivisionTeams: INITIAL_OTHER_DIVISION.map((t) => ({ ...t })),
  };
  state.objectives = generateObjectives(1, state.club.sportPrestige, rng);
  state.world = buildWorld(state, rng);
  state.seed = rng.nextSeed();
  return state;
}

/** Aplica las acciones elegidas y pasa a la convocatoria del partido. */
export function confirmActions(state: GameState): GameState {
  const s: GameState = structuredClone(state);
  const rng = new Rng(s.seed);
  for (const id of s.actionsChosen) {
    const def = getAction(id);
    const check = def.available(s);
    if (!check.ok) {
      s.actionsLog.push(`${def.name}: ya no se pudo realizar (${check.reason ?? 'condiciones cambiaron'}).`);
      continue;
    }
    const log = def.apply(s, rng);
    s.actionsLog.push(`${def.icon} ${def.name}: ${log}`);
    if (def.oncePerSeason) s.actionsUsed.push(def.id);
  }
  // Convocatoria: se confirma quién viene al partido (y quién falla).
  rollCallUp(s, rng);
  s.phase = 'callUp';
  const absent = matchAbsentIds(s);
  s.starters = suggestStarters(s.players, absent);
  s.rotation = suggestRotation(s.players, s.starters, absent);
  s.seed = rng.nextSeed();
  return s;
}

export function resolveEvent(state: GameState, optionIndex: number): GameState {
  if (!state.pendingEvent) return state;
  const s: GameState = structuredClone(state);
  const ev = s.pendingEvent;
  if (!ev) return state;
  const rng = new Rng(s.seed);
  const def = getEvent(ev.defId);
  const outcome = def.resolve(s, ev, optionIndex, rng);
  s.eventOutcome = outcome;
  // Reacciones visibles: el desenlace muestra a los implicados, y el momento
  // queda anotado en la historia personal de cada uno.
  s.eventOutcomePeople = [ev.playerId, ev.playerId2].filter((id): id is string => !!id);
  for (const id of s.eventOutcomePeople) {
    const p = s.players.find((x) => x.id === id);
    if (p) logPlayerEvent(p, s.seasonNumber, Math.min(s.week, s.seasonLength), 'social', `${def.title}. ${outcome}`);
  }
  s.pendingEvent = null;
  const absent = matchAbsentIds(s);
  s.starters = suggestStarters(s.players, absent);
  s.rotation = suggestRotation(s.players, s.starters, absent);
  s.seed = rng.nextSeed();
  return s;
}

/**
 * Si hay un amigo a prueba que ya entrenó su semana, fuerza la decisión de
 * sumarlo (tiene prioridad sobre un evento al azar). La práctica se resuelve
 * acá, la semana siguiente a la invitación. Devuelve null si no hay prueba.
 */
function trialPlanningEvent(s: GameState, rng: Rng): ActiveEvent | null {
  const tc = s.trialCandidate;
  if (!tc) return null;
  if (tc.practiceRating === null) rollTrialPractice(tc, rng);
  return { defId: 'prueba_amigo', playerId: tc.inviterId };
}

/** Cierra la semana tras el partido: recuperación, humores, economía y avance. */
export function advanceWeek(state: GameState): GameState {
  const s: GameState = structuredClone(state);
  const rng = new Rng(s.seed);

  // --- Evolución de los jugadores ---
  for (const p of s.players) {
    if (p.leftClub) continue;

    if (p.status === 'lesionado') {
      p.injuryWeeks -= 1;
      p.physical = clamp(p.physical + BALANCE.weekly.physicalRecovery + 4);
      if (p.injuryWeeks <= 0) {
        p.status = 'disponible';
        p.injuryWeeks = 0;
        logPlayerEvent(p, s.seasonNumber, s.week, 'lesion', 'Recibió el alta: disponible otra vez.');
        s.news.unshift({ week: s.week, text: `${p.name} vuelve a estar disponible.`, tone: 'good' });
      }
    } else {
      p.physical = clamp(p.physical + BALANCE.weekly.physicalRecovery);
    }

    p.motivation = clamp(p.motivation - BALANCE.weekly.motivationDecay);
    if (p.personality === 'social') {
      if (s.club.socialClimate > 70) p.motivation = clamp(p.motivation + 2);
      if (s.club.socialClimate < 35) p.motivation = clamp(p.motivation - 3);
    }
    if (p.personality === 'mercenario' && p.feeStatus !== 'beca_total' && p.feeStatus !== 'beca_parcial') {
      p.motivation = clamp(p.motivation - 2);
    }
    if (p.personality === 'cumplidor' && s.club.organization < 40) {
      p.motivation = clamp(p.motivation - 2);
    }
    if (p.personality === 'talentoso_informal') {
      p.motivation = clamp(p.motivation + rng.int(-3, 3));
    }
    if (p.personality === 'leal' || p.personality === 'veterano') {
      if (p.motivation < 45) p.motivation = clamp(p.motivation + 2); // aguantan las malas
    }

    // Transiciones de estado de ánimo.
    if (p.status === 'disponible' && p.motivation < BALANCE.weekly.lowMotivationThreshold) {
      p.status = 'molesto';
      p.weeksUpset = 0;
      logPlayerEvent(p, s.seasonNumber, s.week, 'animo', 'Se calentó: está molesto con cómo vienen las cosas.');
      s.news.unshift({ week: s.week, text: `${p.name} está molesto con cómo vienen las cosas.`, tone: 'bad' });
    } else if (p.status === 'molesto' || p.status === 'al_borde') {
      if (p.motivation >= 45) {
        p.status = 'disponible';
        p.weeksUpset = 0;
      } else {
        p.weeksUpset += 1;
        if (p.status === 'molesto' && p.weeksUpset >= BALANCE.weekly.upsetWeeksToAlBorde) {
          p.status = 'al_borde';
          logPlayerEvent(p, s.seasonNumber, s.week, 'animo', 'Al borde de dejar el club: la relación pende de un hilo.');
          s.news.unshift({ week: s.week, text: `${p.name} está al borde de dejar el club. Habría que hablarle.`, tone: 'bad' });
        } else if (p.status === 'al_borde' && (p.motivation < BALANCE.weekly.leaveThreshold || rng.chance(0.3))) {
          p.leftClub = true;
          s.playersLeftCount += 1;
          logPlayerEvent(p, s.seasonNumber, s.week, 'salida', 'Abandonó el club a mitad de temporada. "Esto ya no es para mí".');
          logClubEvent(s, 'salida', `${p.name} abandonó el club a mitad de temporada.`);
          s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
          s.club.socialClimate = clamp(s.club.socialClimate - 4);
          s.news.unshift({ week: s.week, text: `${p.name} abandonó el club. "Esto ya no es para mí", dejó dicho.`, tone: 'bad' });
        }
      }
    }
  }

  // --- Promesas: lo que prometiste en la pretemporada se cobra acá ---
  // (después de la evolución semanal, para que el enojo no se pise con la recuperación)
  checkPromises(s);

  // --- El cuerpo técnico también vive: roces, y al proyecto se lo pueden llevar ---
  coachWeeklyTick(s, rng);

  // --- El mundo también vive: fichas al día y lesiones rivales ---
  syncUserRegistrations(s);
  for (const wp of s.world.players) {
    if (wp.injuryWeeks > 0) wp.injuryWeeks -= 1;
    else if (rng.chance(0.015)) wp.injuryWeeks = rng.int(1, 3);
  }

  // --- Economía de la semana ---
  applyWeeklyEconomy(s, rng);

  // --- Deriva del club ---
  s.club.organization = clamp(s.club.organization - 1);
  if (s.club.socialClimate > 55) s.club.socialClimate = clamp(s.club.socialClimate - 1);
  else if (s.club.socialClimate < 55) s.club.socialClimate = clamp(s.club.socialClimate + 1);

  // --- Avance ---
  s.week += 1;
  s.actionsChosen = [];
  s.actionsLog = [];
  s.eventOutcome = null;
  s.callUp = [];
  s.live = null;
  s.lastMatch = state.lastMatch; // se conserva para referencia

  // Reacciones diferidas: lo que quedó picando semanas atrás se comunica ahora.
  const due = (s.delayed ?? []).filter((d) => d.season === s.seasonNumber && d.week <= s.week);
  s.delayed = (s.delayed ?? []).filter((d) => d.season === s.seasonNumber && d.week > s.week);
  for (const d of due) {
    const target = d.playerId ? s.players.find((p) => p.id === d.playerId) : undefined;
    if (d.playerId && (!target || target.leftClub)) continue; // ya no está: la historia murió ahí
    if (target && d.motivation) target.motivation = clamp(target.motivation + d.motivation);
    if (d.climate) s.club.socialClimate = clamp(s.club.socialClimate + d.climate);
    s.news.unshift({ week: Math.min(s.week, s.seasonLength), text: d.text, tone: d.tone });
    if (target) logPlayerEvent(target, s.seasonNumber, Math.min(s.week, s.seasonLength), 'social', d.text);
  }

  const active = activePlayers(s.players);

  if (s.club.money < 0) {
    s.phase = 'gameOver';
    s.gameOverReason = 'El club se quedó sin dinero. Sin caja no hay cancha, ni árbitros, ni liga: la temporada se termina acá.';
    logClubEvent(s, 'salida', 'La caja llegó a cero y el club no pudo seguir en la liga.', Math.min(s.week, s.seasonLength));
  } else if (active.length < 5) {
    s.phase = 'gameOver';
    s.gameOverReason = 'Quedaron menos de 5 jugadores en el plantel. No hay equipo para presentar: el club se retira de la liga.';
    logClubEvent(s, 'salida', 'El plantel quedó con menos de 5 jugadores: el club se retiró de la liga.', Math.min(s.week, s.seasonLength));
  } else if (s.week > s.seasonLength) {
    // Fase regular terminada: arrancan (o siguen) los playoffs de las copas.
    if (advancePlayoffs(s, rng)) {
      s.phase = 'planning';
      s.pendingEvent = trialPlanningEvent(s, rng) ?? rollEvent(s, rng);
      s.starters = suggestStarters(s.players);
      s.rotation = suggestRotation(s.players, s.starters);
    } else {
      s.trialCandidate = null; // terminó la fase regular: el amigo a prueba siguió su camino
      s.phase = 'seasonEnd';
    }
  } else {
    s.phase = 'planning';
    s.pendingEvent = trialPlanningEvent(s, rng) ?? rollEvent(s, rng);
    s.starters = suggestStarters(s.players);
    s.rotation = suggestRotation(s.players, s.starters);
  }

  s.seed = rng.nextSeed();
  return s;
}
