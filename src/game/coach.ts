// El cuerpo técnico: un club amateur puede tener DT pago, DT honorario,
// un jugador que dirige, o nadie (dirigís vos). Cada régimen mueve plata,
// prestigio, motivación y conflictos distintos.

import { clamp } from './balance';
import { logClubEvent, logPlayerEvent } from './timeline';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { Rng, seedFromString } from './rng';
import type { Coach, CoachProfile, GameState } from './types';

export const COACH_TYPE_LABELS: Record<Coach['type'], string> = {
  pago: 'DT pago',
  honorario: 'DT honorario',
  jugador: 'Jugador-DT',
};

export const COACH_PROFILE_INFO: Record<CoachProfile, { label: string; desc: string }> = {
  proyecto: {
    label: 'El proyecto',
    desc: 'Quiere ser DT profesional y hace sus primeras armas acá: potencia los entrenamientos y lee bien los partidos. Caro, y si golpea un club grande, se va.',
  },
  profe: {
    label: 'El profe del barrio',
    desc: 'Décadas en el club de al lado. No inventa nada, pero el grupo lo quiere y no cobra casi nada.',
  },
  quemado: {
    label: 'El ex federado',
    desc: 'Jugó en serio y sabe de básquet, pero tiene poca paciencia: el vestuario lo sufre.',
  },
};

/** Candidatos de la temporada: perfiles distintos, todas las combinaciones. */
export function buildCoachMarket(seasonNumber: number, seed: number): Coach[] {
  const rng = new Rng(seedFromString(`coaches_s${seasonNumber}_${seed}`));
  const name = () => `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  return [
    {
      id: `co_s${seasonNumber}_proyecto`,
      name: name(),
      type: 'pago',
      profile: 'proyecto',
      tactics: rng.int(65, 80),
      people: rng.int(45, 70),
      weeklyWage: rng.int(45, 60),
      poachRisk: 0.05,
      directive: 'ganar',
    },
    {
      id: `co_s${seasonNumber}_profe`,
      name: name(),
      type: 'honorario',
      profile: 'profe',
      tactics: rng.int(45, 60),
      people: rng.int(65, 85),
      weeklyWage: 0,
      directive: 'repartir',
    },
    {
      id: `co_s${seasonNumber}_quemado`,
      name: name(),
      type: 'pago',
      profile: 'quemado',
      tactics: rng.int(55, 70),
      people: rng.int(25, 45),
      weeklyWage: rng.int(25, 35),
      directive: 'ganar',
    },
  ];
}

/** ¿El DT potencia los entrenamientos? (el proyecto sabe enseñar). */
export function coachBoostsTraining(coach: Coach | null): boolean {
  return !!coach && coach.profile === 'proyecto';
}

export function hireCoach(state: GameState, coachId: string): GameState {
  const s: GameState = structuredClone(state);
  const candidate = s.coachMarket.find((c) => c.id === coachId);
  if (!candidate || s.coach?.id === coachId) return s;
  if (candidate.weeklyWage > 0 && s.club.money < candidate.weeklyWage) return s;

  s.coach = { ...candidate };
  s.coachMarket = s.coachMarket.filter((c) => c.id !== coachId);
  s.club.sportPrestige = clamp(s.club.sportPrestige + (candidate.type === 'pago' ? 2 : 1));
  if (candidate.type === 'honorario') s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
  logClubEvent(s, 'llegada', `${candidate.name} es el nuevo DT del club (${COACH_TYPE_LABELS[candidate.type].toLowerCase()}).`);
  s.news.unshift({ week: s.week, text: `${candidate.name} asume como DT. El plantel toma nota.`, tone: 'good' });
  return s;
}

/** Un jugador del plantel pasa a dirigir: barato, pero el doble rol se paga. */
export function appointPlayerCoach(state: GameState, playerId: string): GameState {
  const s: GameState = structuredClone(state);
  const p = s.players.find((x) => x.id === playerId && !x.leftClub);
  if (!p) return s;
  s.coach = {
    id: `co_pl_${p.id}`,
    name: p.name,
    type: 'jugador',
    profile: 'quemado',
    // La táctica de un jugador-DT sale de sus años de cancha.
    tactics: clamp(20 + p.age + (p.personality === 'veterano' ? 10 : 0), 30, 65),
    people: clamp(Math.round(p.social * 0.8)),
    weeklyWage: 0,
    playerId: p.id,
    directive: 'ganar',
  };
  p.motivation = clamp(p.motivation + 5);
  logPlayerEvent(p, s.seasonNumber, Math.min(s.week, s.seasonLength), 'hito', 'Se puso el buzo de DT sin dejar de jugar.');
  logClubEvent(s, 'hito', `${p.name} dirige y juega: jugador-DT del club.`);
  s.news.unshift({ week: s.week, text: `${p.name} se hace cargo del equipo como jugador-DT.`, tone: 'neutral' });
  return s;
}

export function fireCoach(state: GameState): GameState {
  const s: GameState = structuredClone(state);
  if (!s.coach) return s;
  const wasPlayer = s.coach.type === 'jugador';
  const name = s.coach.name;
  if (wasPlayer) {
    const p = s.players.find((x) => x.id === s.coach!.playerId);
    if (p) p.motivation = clamp(p.motivation - 6);
  }
  s.club.socialClimate = clamp(s.club.socialClimate - 3);
  logClubEvent(s, 'salida', `${name} dejó de ser el DT del club.`);
  s.news.unshift({ week: s.week, text: `${name} ya no dirige al equipo. El vestuario opina, como siempre.`, tone: 'bad' });
  s.coach = null;
  return s;
}

/**
 * Vida semanal del cuerpo técnico: sueldos los cobra la economía; acá pasan
 * las cosas: al proyecto se lo puede llevar un club grande, el quemado
 * desgasta, y al jugador-DT no todos se lo bancan.
 */
export function coachWeeklyTick(s: GameState, rng: Rng): void {
  const coach = s.coach;
  if (!coach) return;

  // El jugador-DT se fue del club: se acabó el doble rol.
  if (coach.type === 'jugador') {
    const p = s.players.find((x) => x.id === coach.playerId);
    if (!p || p.leftClub) {
      s.coach = null;
      return;
    }
    if (rng.chance(0.12)) {
      const upset = s.players.find((x) => !x.leftClub && x.id !== p.id && x.motivation < 50);
      if (upset) {
        upset.motivation = clamp(upset.motivation - 3);
        s.club.socialClimate = clamp(s.club.socialClimate - 2);
        s.news.unshift({
          week: s.week,
          text: `A ${upset.name} no le cierra que lo dirija un compañero: "adentro de la cancha somos iguales".`,
          tone: 'bad',
        });
      }
    }
    return;
  }

  if (coach.profile === 'quemado' && rng.chance(0.15)) {
    s.club.socialClimate = clamp(s.club.socialClimate - 2);
    s.news.unshift({ week: s.week, text: `${coach.name} se sacó con el plantel en la práctica. Caras largas.`, tone: 'bad' });
  }

  // El proyecto suena en clubes grandes: te lo pueden sacar a mitad del campeonato.
  if (coach.poachRisk && rng.chance(coach.poachRisk)) {
    logClubEvent(s, 'salida', `${coach.name} se fue a mitad de temporada: lo contrató un club federado.`);
    s.news.unshift({
      week: s.week,
      text: `Golpe al banco: un club federado se llevó a ${coach.name}. Quedamos sin DT.`,
      tone: 'bad',
    });
    s.club.socialClimate = clamp(s.club.socialClimate - 4);
    s.coach = null;
  }
}
