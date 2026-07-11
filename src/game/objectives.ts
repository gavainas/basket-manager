import { activePlayers, clubPosition } from './match';
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
];

/** Genera 3 objetivos distintos. La ambición crece con las temporadas y el prestigio. */
export function generateObjectives(seasonNumber: number, sportPrestige: number, rng: Rng): Objective[] {
  const ambition = Math.min(4, seasonNumber - 1 + Math.floor(sportPrestige / 35));
  const picked = rng.shuffle(DEFS).slice(0, 3);
  return picked.map((def) => {
    const target = def.makeTarget(ambition, rng);
    return { id: def.id, label: def.label(target), target };
  });
}

export function objectiveStatus(state: GameState, obj: Objective, seasonOver: boolean): ObjectiveStatus {
  const def = DEFS.find((d) => d.id === obj.id);
  if (!def) return 'en_curso';
  return def.status(state, obj.target, seasonOver);
}
