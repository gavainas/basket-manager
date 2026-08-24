import { clamp } from './balance';
import { activePlayers, clubPosition } from './match';
import { logClubEvent } from './timeline';
import type { GameState, Objective } from './types';
import type { Rng } from './rng';

export type ObjectiveStatus = 'cumplido' | 'en_riesgo' | 'en_curso' | 'fallado';

interface ObjectiveDef {
  id: string;
  label: (target: number) => string;
  /** Genera el target según la ambición de la comisión (crece con las temporadas). */
  makeTarget: (ambition: number, rng: Rng) => number;
  /** Evalúa el estado actual del objetivo. */
  status: (state: GameState, target: number, seasonOver: boolean) => ObjectiveStatus;
  /** El target no puede pasarse de las fechas que tiene la liga. */
  fitToSeason?: boolean;
}

const DEFS: ObjectiveDef[] = [
  {
    id: 'position',
    label: (t) => (t === 1 ? 'Salir campeones' : `Terminar entre los ${t} primeros`),
    makeTarget: (ambition, rng) => Math.max(1, 6 - ambition - rng.int(0, 1)),
    status: (s, t, over) => {
      const pos = clubPosition(s);
      if (over) return pos <= t ? 'cumplido' : 'fallado';
      return pos <= t ? 'en_curso' : 'en_riesgo';
    },
  },
  {
    id: 'wins',
    label: (t) => `Ganar al menos ${t} partidos`,
    makeTarget: (ambition, rng) => Math.min(8, 3 + ambition + rng.int(0, 1)),
    fitToSeason: true,
    status: (s, t, over) => {
      const row = s.standings.find((r) => r.teamId === 'club')!;
      if (row.wins >= t) return 'cumplido';
      const remaining = s.seasonLength - (row.wins + row.losses);
      if (row.wins + remaining < t) return 'fallado';
      return over ? 'fallado' : 'en_curso';
    },
  },
  {
    id: 'money',
    label: (t) => `Cerrar la temporada con al menos $${t} en caja`,
    makeTarget: (ambition, rng) => 300 + ambition * 100 + rng.int(0, 2) * 50,
    status: (s, t, over) => {
      if (over) return s.club.money >= t ? 'cumplido' : 'fallado';
      return s.club.money >= t ? 'en_curso' : 'en_riesgo';
    },
  },
  {
    id: 'retention',
    label: (t) =>
      t === 0
        ? 'Que no se vaya ningún jugador'
        : t === 1
          ? 'Que no se vaya más de 1 jugador'
          : `Que no se vayan más de ${t} jugadores`,
    makeTarget: (ambition, rng) => Math.max(0, 2 - Math.floor(ambition / 2) + rng.int(0, 1)),
    status: (s, t, over) => {
      if (s.playersLeftCount > t) return 'fallado';
      return over ? 'cumplido' : 'en_curso';
    },
  },
  {
    id: 'climate',
    label: (t) => `Mantener el ambiente social en ${t} o más`,
    makeTarget: (ambition, rng) => 55 + ambition * 3 + rng.int(0, 5),
    status: (s, t, over) => {
      if (over) return s.club.socialClimate >= t ? 'cumplido' : 'fallado';
      return s.club.socialClimate >= t ? 'en_curso' : 'en_riesgo';
    },
  },
  {
    id: 'roster',
    label: (t) => `Terminar con un plantel de ${t}+ jugadores`,
    makeTarget: (ambition, rng) => 10 + Math.min(2, Math.floor(ambition / 2)) + rng.int(0, 1),
    status: (s, t, over) => {
      const count = activePlayers(s.players).length;
      if (over) return count >= t ? 'cumplido' : 'fallado';
      return count >= t ? 'en_curso' : 'en_riesgo';
    },
  },
  {
    id: 'asados',
    label: (t) =>
      t === 1
        ? 'Juntar al plantel: 1 asado con más de la mitad del grupo'
        : `Juntar al plantel: ${t} asados con más de la mitad del grupo`,
    makeTarget: (ambition, rng) => Math.min(3, 1 + Math.floor(ambition / 2) + rng.int(0, 1)),
    status: (s, t, over) => {
      const good = (s.asadoHistory ?? []).filter((a) => a.good).length;
      if (good >= t) return 'cumplido';
      const weeksLeft = Math.max(0, s.seasonLength - s.week + 1);
      if (over || weeksLeft < t - good) return 'fallado';
      return weeksLeft <= t - good + 2 ? 'en_riesgo' : 'en_curso';
    },
  },
];

/** Genera 3 objetivos distintos. La ambición crece con las temporadas y el prestigio. */
/**
 * Los tres encargos de la comisión. `seasonLength` importa porque no todas las
 * ligas tienen la misma cantidad de fechas: pedir 8 victorias en un torneo
 * corto de 7 partidos sería un objetivo imposible de fábrica.
 */
export function generateObjectives(
  seasonNumber: number,
  sportPrestige: number,
  rng: Rng,
  seasonLength = 9
): Objective[] {
  const ambition = Math.min(4, seasonNumber - 1 + Math.floor(sportPrestige / 35));
  const picked = rng.shuffle(DEFS).slice(0, 3);
  return picked.map((def) => {
    const target = def.fitToSeason
      ? Math.min(def.makeTarget(ambition, rng), Math.max(1, seasonLength - 1))
      : def.makeTarget(ambition, rng);
    return { id: def.id, label: def.label(target), target };
  });
}

export function objectiveStatus(state: GameState, obj: Objective, seasonOver: boolean): ObjectiveStatus {
  const def = DEFS.find((d) => d.id === obj.id);
  if (!def) return 'en_curso';
  return def.status(state, obj.target, seasonOver);
}

/**
 * La comisión cobra al cierre: los objetivos dejan de ser cartón pintado.
 * Cumplir suma prestigio (la comisión te banca en el barrio); fallar lo resta
 * y queda anotado en la historia del club. Se llama UNA vez, al pasar a
 * seasonEnd (no en game over: ahí ya se perdió todo lo que había que perder).
 */
export function settleObjectives(s: GameState): void {
  const week = Math.min(s.week, s.seasonLength);
  for (const obj of s.objectives) {
    const st = objectiveStatus(s, obj, true);
    if (st === 'cumplido') {
      s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
      s.club.sportPrestige = clamp(s.club.sportPrestige + 1);
      s.news.unshift({ week, text: `La comisión tilda el objetivo: ${obj.label}. Palabra cumplida.`, tone: 'good' });
    } else {
      s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
      s.club.sportPrestige = clamp(s.club.sportPrestige - 1);
      s.news.unshift({ week, text: `La comisión no perdona: quedó incumplido "${obj.label}". Lo van a recordar.`, tone: 'bad' });
      logClubEvent(s, 'hito', `Objetivo de la comisión incumplido: ${obj.label}.`, week);
    }
  }
  const met = s.objectives.filter((o) => objectiveStatus(s, o, true) === 'cumplido').length;
  if (met === s.objectives.length && s.objectives.length > 0) {
    logClubEvent(s, 'hito', 'La comisión cerró el año conforme: los tres objetivos, cumplidos.', week);
  }
}

/**
 * La visita de mitad de temporada: la comisión pasa por el entrenamiento y
 * dice en voz alta cómo viene cada objetivo. Es la reacción que faltaba entre
 * "te los encargo en la semana 1" y "te los cobro en el cierre".
 */
export function midSeasonObjectiveCheck(s: GameState): void {
  if (s.objectives.length === 0) return;
  const week = Math.min(s.week, s.seasonLength);
  const atRisk = s.objectives.filter((o) => {
    const st = objectiveStatus(s, o, false);
    return st === 'en_riesgo' || st === 'fallado';
  });
  if (atRisk.length === 0) {
    s.news.unshift({
      week,
      text: 'La comisión pasó por el entrenamiento y se fue conforme: los objetivos vienen encaminados.',
      tone: 'good',
    });
    return;
  }
  const labels = atRisk.map((o) => `"${o.label}"`).join(' y ');
  s.news.unshift({
    week,
    text: `Visita de la comisión a mitad de temporada: ${labels} ${atRisk.length > 1 ? 'vienen flojos' : 'viene flojo'}. "Confiamos en vos, pero mirá el almanaque", dejaron dicho.`,
    tone: 'bad',
  });
  logClubEvent(s, 'hito', `La comisión avisó a mitad de temporada: en riesgo ${labels}.`, week);
}
