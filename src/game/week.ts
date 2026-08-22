import { BALANCE, clamp } from './balance';
import { createInitialRoster } from '../data/players';
import { RIVALS, SCHEDULE_ORDER } from '../data/rivals';
import { INITIAL_OTHER_DIVISION, PLAZA_DIVISION_ID, USER_DIVISION_ID } from '../data/worldData';
import { getAction } from './actions';
import { rollWeekBanter } from './banter';
import { applyWeeklyEconomy } from './economy';
import { getEvent, rollEvent, rollTrialPractice, takeScheduledEvent } from './events';
import { maybeFriendMessage } from './friendsAbroad';
import { rollWeekMoment } from './moments';
import { bumpGrievance, decayGrievance, grievanceNote, isBurning, isHot, sootheGrievance } from './mood';
import { generateObjectives, midSeasonObjectiveCheck, settleObjectives } from './objectives';
import { activePlayers, matchAbsentIds, noStartIds, suggestRotation, suggestStarters } from './match';
import { rollCallUp } from './callup';
import { buildCoachMarket, coachWeeklyTick } from './coach';
import { advancePlayoffs } from './playoffs';
import { checkPromises } from './promises';
import { secondTeamWeeklyTick } from './secondTeam';
import { logClubEvent, logPlayerEvent } from './timeline';
import { buildWorld, emptyWorld, syncUserRegistrations } from './world';
import { Rng } from './rng';
import type { AbsenceDifficulty, ActiveEvent, GameState } from './types';

export const SAVE_VERSION = 23;

export function createNewGame(seed: number, difficulty: AbsenceDifficulty = 'medio'): GameState {
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
    heldDivision: null,
    absenceDifficulty: difficulty,
  };
  state.objectives = generateObjectives(1, state.club.sportPrestige, rng);
  state.world = buildWorld(state, rng);
  // La primera semana también tiene pulso: momento del mundo y previa.
  rollWeekMoment(state, rng);
  rollWeekBanter(state, rng);
  state.seed = rng.nextSeed();
  return state;
}

/**
 * Aplica las acciones elegidas y pasa a la convocatoria del partido.
 * `timing` es cuándo se larga la lista: 2 días antes (default — hay margen
 * para gestionar bajas, pero el día del partido alguno más se puede caer) o
 * sobre la hora (lo que ves es definitivo y los excuseros no llegan a
 * bajarse, pero sin margen para gestiones).
 */
export function confirmActions(state: GameState, timing: 'temprana' | 'tarde' = 'temprana'): GameState {
  const s: GameState = structuredClone(state);
  s.callUpTiming = timing;
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
  // Los que llegan al segundo tiempo no se sugieren de titulares: solo banco.
  s.starters = suggestStarters(s.players, noStartIds(s));
  s.rotation = suggestRotation(s.players, s.starters, matchAbsentIds(s));
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
  s.starters = suggestStarters(s.players, noStartIds(s));
  s.rotation = suggestRotation(s.players, s.starters, matchAbsentIds(s));
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
        if (p.injuryReason === 'laboral') {
          logPlayerEvent(p, s.seasonNumber, s.week, 'lesion', 'Se acomodó con el laburo: vuelve a entrenar.');
          s.news.unshift({ week: s.week, text: `${p.name} arregló el tema del trabajo: vuelve al equipo.`, tone: 'good' });
        } else {
          logPlayerEvent(p, s.seasonNumber, s.week, 'lesion', 'Recibió el alta: disponible otra vez.');
          s.news.unshift({ week: s.week, text: `${p.name} vuelve a estar disponible.`, tone: 'good' });
        }
        p.injuryReason = undefined;
      }
    } else {
      p.physical = clamp(p.physical + BALANCE.weekly.physicalRecovery);
    }

    if (p.suspendedWeeks && p.suspendedWeeks > 0) {
      p.suspendedWeeks -= 1;
      if (p.suspendedWeeks <= 0) {
        s.news.unshift({ week: s.week, text: `${p.name} cumplió la suspensión: vuelve a estar habilitado.`, tone: 'good' });
      }
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

    // Si la queja era por plata y el club ya lo becó, la bronca se queda sin
    // argumento: se apaga con hechos, aunque el manager no diga nada.
    if (p.grievance?.cause === 'plata' && (p.feeStatus === 'beca_total' || p.feeStatus === 'beca_parcial')) {
      sootheGrievance(s, p, 'hechos');
    }

    // La bronca vieja se enfría sola si el motivo dejó de repetirse.
    decayGrievance(s, p);

    // Transiciones de estado de ánimo. El estado "molesto" ya no depende solo
    // de la motivación: una queja activa que escaló a bronca también lo prende,
    // así lo que dice el informe del partido es lo mismo que ve el menú.
    const hot = isHot(p);
    const burning = isBurning(p);
    if (p.status === 'disponible' && (p.motivation < BALANCE.weekly.lowMotivationThreshold || hot)) {
      p.status = 'molesto';
      p.weeksUpset = 0;
      const why = p.grievance ? grievanceNote(p, s.week) : null;
      logPlayerEvent(p, s.seasonNumber, s.week, 'animo', why ?? 'Se calentó: está molesto con cómo vienen las cosas.');
      if (!hot) s.news.unshift({ week: s.week, text: `${p.name} está molesto con cómo vienen las cosas.`, tone: 'bad' });
    } else if (p.status === 'molesto' || p.status === 'al_borde') {
      if (p.motivation >= 45 && !hot) {
        p.status = 'disponible';
        p.weeksUpset = 0;
      } else {
        p.weeksUpset += 1;
        if (
          p.status === 'molesto' &&
          p.weeksUpset >= BALANCE.weekly.upsetWeeksToAlBorde &&
          (p.motivation < 45 || burning)
        ) {
          p.status = 'al_borde';
          logPlayerEvent(p, s.seasonNumber, s.week, 'animo', 'Al borde de dejar el club: la relación pende de un hilo.');
          s.news.unshift({ week: s.week, text: `${p.name} está al borde de dejar el club. Habría que hablarle.`, tone: 'bad' });
        } else if (
          p.status === 'al_borde' &&
          (p.motivation < BALANCE.weekly.leaveThreshold ||
            (p.motivation < 45 && rng.chance(0.3)) ||
            // Con la motivación alta pero la bronca al tope, también se puede
            // ir: menos probable, porque el que está bien igual la piensa.
            (burning && rng.chance(0.15)))
        ) {
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

  // --- Egos que crecen ganando: la racha también factura ---
  // Con tres victorias seguidas, el protagonista que mira desde el banco
  // siente que se pierde SU momento, y el mercenario que paga la cuota hace
  // números. Máximo uno por semana: es un run-run de vestuario, no un motín.
  const streakTail = s.history.slice(-3);
  if (streakTail.length === 3 && streakTail.every((m) => m.won) && s.lastMatch && !s.lastMatch.forfeit) {
    const box = s.lastMatch.box;
    const egoCandidates = s.players.filter((p) => {
      if (p.leftClub || p.status === 'lesionado') return false;
      if (p.personality === 'protagonista') {
        const line = box.find((b) => b.playerId === p.id);
        return !!line && line.minutes < 20;
      }
      if (p.personality === 'mercenario') return p.feeStatus === 'pagada';
      return false;
    });
    if (egoCandidates.length > 0) {
      const ego = rng.pick(egoCandidates);
      if (ego.personality === 'protagonista' && rng.chance(0.5)) {
        const level = bumpGrievance(s, ego, 'minutos', {
          note: 'El equipo está de racha y él la mira de afuera: quiere estar en la foto.',
        });
        if (level <= 1) {
          s.news.unshift({
            week: s.week,
            text: `${ego.name} dejó caer que con el equipo ganando, él también quiere sus minutos. El éxito despierta egos.`,
            tone: 'bad',
          });
        }
      } else if (ego.personality === 'mercenario' && rng.chance(0.3)) {
        const level = bumpGrievance(s, ego, 'plata', {
          note: 'Con el equipo de racha hizo números: si él es parte del éxito, que no pague por jugar.',
        });
        if (level <= 1) {
          s.news.unshift({
            week: s.week,
            text: `${ego.name} tiró en el vestuario que "un equipo que gana no le cobra la cuota a sus figuras". La racha también factura.`,
            tone: 'bad',
          });
        }
      }
    }
  }

  // --- Promesas: lo que prometiste en la pretemporada se cobra acá ---
  // (después de la evolución semanal, para que el enojo no se pise con la recuperación)
  checkPromises(s);

  // --- El cuerpo técnico también vive: roces, y al proyecto se lo pueden llevar ---
  coachWeeklyTick(s, rng);

  // --- El segundo equipo juega su fecha (si el club se expandió) ---
  secondTeamWeeklyTick(s, rng);

  // --- El mundo también vive: fichas al día y lesiones rivales ---
  syncUserRegistrations(s);
  for (const wp of s.world.players) {
    if (wp.injuryWeeks > 0) wp.injuryWeeks -= 1;
    else if (rng.chance(0.015)) wp.injuryWeeks = rng.int(1, 3);
  }

  // --- Economía de la semana ---
  applyWeeklyEconomy(s, rng);

  // --- La plaza se paga: cartel que se derrite y ambiciosos que mastican ---
  // Lo barato lo paga el vestuario: el prestigio deportivo gotea semana a
  // semana, y a los que juegan en serio el nivel les queda chico — la queja
  // ('proyecto') entra al sistema de humor y escala como cualquier bronca.
  if (s.divisionId === PLAZA_DIVISION_ID && s.week <= s.seasonLength) {
    if (s.club.sportPrestige > BALANCE.plaza.meltFloor) {
      s.club.sportPrestige = clamp(s.club.sportPrestige - BALANCE.plaza.weeklyPrestigeMelt);
      if (s.week % BALANCE.plaza.meltNewsEvery === 0) {
        s.news.unshift({
          week: s.week,
          text: 'En el barrio preguntan, medio en broma medio en serio, cuándo vuelven a jugar en serio. La plaza no suma cartel.',
          tone: 'bad',
        });
      }
    }
    const ambitious = s.players.filter(
      (p) =>
        !p.leftClub &&
        p.status !== 'lesionado' &&
        (p.personality === 'competitivo' || p.personality === 'protagonista' || p.personality === 'mercenario') &&
        p.technique >= BALANCE.plaza.ambitionMinTech
    );
    if (ambitious.length > 0 && rng.chance(BALANCE.plaza.ambitionChance)) {
      // La bronca se concentra en la figura: la del mejor es la que escala y se lee.
      const star = [...ambitious].sort((a, b) => b.technique - a.technique)[0];
      const target = rng.chance(0.7) ? star : rng.pick(ambitious);
      const grumble =
        target.personality === 'competitivo'
          ? 'Terminó el partido y lo dijo sin vueltas: "acá no me exige nadie, así me estanco".'
          : target.personality === 'protagonista'
            ? '"Yo para brillar en la plaza no me anoté", tiró medio en chiste. Medio.'
            : 'Hizo cuentas en voz alta: "en una liga de verdad, a uno como yo lo becan; acá ni cartel hay".';
      bumpGrievance(s, target, 'proyecto', { note: grumble });
    }
  }

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
  s.callUpTiming = undefined; // cada semana se vuelve a elegir cuándo largar la lista
  s.live = null;
  s.lastMatch = state.lastMatch; // se conserva para referencia
  s.asadoPlan = null; // la convocatoria al asado vence con la semana
  s.lastAsado = null;

  // Un amigo de otro cuadro puede escribir: data del rival, picados, rumores.
  maybeFriendMessage(s, rng);

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
      // En playoffs no hay momentos del mundo, pero la previa se pica MÁS.
      rollWeekMoment(s, rng);
      rollWeekBanter(s, rng);
      s.pendingEvent = trialPlanningEvent(s, rng) ?? takeScheduledEvent(s) ?? rollEvent(s, rng);
      s.starters = suggestStarters(s.players);
      s.rotation = suggestRotation(s.players, s.starters);
    } else {
      s.trialCandidate = null; // terminó la fase regular: el amigo a prueba siguió su camino
      s.phase = 'seasonEnd';
      // La comisión cobra: los objetivos se liquidan una sola vez, acá.
      // (En game over no: ahí ya se perdió todo lo que había que perder.)
      settleObjectives(s);
    }
  } else {
    s.phase = 'planning';
    // A mitad de temporada la comisión pasa a decir cómo vienen sus encargos.
    if (s.week === 5) midSeasonObjectiveCheck(s);
    // La semana nueva arranca con su pulso: el momento del mundo (si lo hay)
    // y la previa que se pica se anuncian ANTES de decidir nada.
    rollWeekMoment(s, rng);
    rollWeekBanter(s, rng);
    // Prioridad: el amigo a prueba, después las consecuencias encadenadas
    // (seguras), y recién ahí el sorteo semanal.
    s.pendingEvent = trialPlanningEvent(s, rng) ?? takeScheduledEvent(s) ?? rollEvent(s, rng);
    s.starters = suggestStarters(s.players);
    s.rotation = suggestRotation(s.players, s.starters);
  }

  s.seed = rng.nextSeed();
  return s;
}
