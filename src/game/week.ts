import { BALANCE, clamp } from './balance';
import { createInitialRoster } from '../data/players';
import { RIVALS, SCHEDULE_ORDER } from '../data/rivals';
import { getAction } from './actions';
import { applyWeeklyEconomy } from './economy';
import { getEvent, rollEvent } from './events';
import { generateObjectives } from './objectives';
import { activePlayers, clubPosition, matchAbsentIds, suggestRotation, suggestStarters } from './match';
import { rollCallUp } from './callup';
import { logClubEvent, logPlayerEvent } from './timeline';
import { Rng } from './rng';
import type { GameState } from './types';

export const SAVE_VERSION = 11;

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
  };
  state.objectives = generateObjectives(1, state.club.sportPrestige, rng);
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
  s.pendingEvent = null;
  const absent = matchAbsentIds(s);
  s.starters = suggestStarters(s.players, absent);
  s.rotation = suggestRotation(s.players, s.starters, absent);
  s.seed = rng.nextSeed();
  return s;
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
    s.phase = 'seasonEnd';
    if (clubPosition(s) === 1) {
      logClubEvent(s, 'hito', `¡Campeones de la temporada ${s.seasonNumber}!`, s.seasonLength);
      for (const p of active) {
        logPlayerEvent(p, s.seasonNumber, s.seasonLength, 'hito', `¡Campeón de la temporada ${s.seasonNumber} con el club!`);
      }
    }
  } else {
    s.phase = 'planning';
    s.pendingEvent = rollEvent(s, rng);
    s.starters = suggestStarters(s.players);
    s.rotation = suggestRotation(s.players, s.starters);
  }

  s.seed = rng.nextSeed();
  return s;
}
