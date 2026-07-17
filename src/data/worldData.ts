// Definición estática del mundo: ligas y divisionales. Los equipos, planteles
// y fixtures se generan en src/game/world.ts a partir de estos datos.

import type { Division, League, Rival, RivalStyle } from '../game/types';

/** Semilla de un equipo del mundo que NO es rival directo del usuario (otra divisional). */
export interface WorldTeamSeed {
  id: string;
  name: string;
  strength: number;
  style: RivalStyle;
}

/**
 * La Divisional A (la de arriba): 10 equipos más fuertes que la B. No son
 * rivales clásicos del usuario (mientras juegue en B); viven en la capa del
 * mundo, se los puede scoutear y son a los que se asciende.
 */
export const DIVISION_A_TEAMS: WorldTeamSeed[] = [
  { id: 'a1', name: 'Náutico del Cerro', strength: 85, style: 'tiradores' },
  { id: 'a2', name: 'Atlético Progreso', strength: 81, style: 'internos' },
  { id: 'a3', name: 'Defensor del Prado', strength: 78, style: 'corredores' },
  { id: 'a4', name: 'Olimpia del Oeste', strength: 76, style: 'equilibrado' },
  { id: 'a5', name: 'Racing de la Villa', strength: 74, style: 'tiradores' },
  { id: 'a6', name: 'Sportivo Artigas', strength: 72, style: 'internos' },
  { id: 'a7', name: 'Estrella del Sur', strength: 70, style: 'corredores' },
  { id: 'a8', name: 'Unión del Puerto', strength: 68, style: 'equilibrado' },
  { id: 'a9', name: 'Colón Basket', strength: 66, style: 'tiradores' },
  { id: 'a10', name: 'Litoral del Norte', strength: 64, style: 'internos' },
];

/** Composición inicial de la otra divisional (ids de slot o1..o10, se guarda en el estado). */
export const INITIAL_OTHER_DIVISION: Rival[] = DIVISION_A_TEAMS.map((t, i) => ({
  id: `o${i + 1}`,
  name: t.name,
  strength: t.strength,
  style: t.style,
}));

export const LEAGUES: League[] = [
  {
    id: 'lg_universitaria',
    name: 'Liga Universitaria',
    kind: 'universitaria',
    divisionCount: 2,
    rules: [
      'Un jugador solo puede estar inscripto en un equipo de la liga por temporada.',
      'La ficha se paga al inscribirse y habilita toda la temporada.',
    ],
  },
  {
    id: 'lg_montevideo',
    name: 'Liga Montevideo',
    kind: 'libre',
    divisionCount: 1,
    rules: [
      'Liga libre: cualquier jugador federado o no puede inscribirse.',
      'Un jugador solo puede estar inscripto en un equipo de la liga por temporada.',
    ],
  },
  {
    id: 'lg_veteranos',
    name: 'Liga +35',
    kind: 'veteranos',
    minAge: 35,
    divisionCount: 1,
    rules: [
      'Solo jugadores de 35 años o más.',
      'Un jugador solo puede estar inscripto en un equipo de la liga por temporada.',
    ],
  },
];

export const DIVISIONS: Division[] = [
  {
    id: 'dv_lu_a',
    leagueId: 'lg_universitaria',
    name: 'Divisional A',
    level: 1,
    gameDay: 'martes',
    gameTimes: ['20:00', '22:00'],
    altDays: ['miércoles'],
  },
  {
    // La divisional activa del club: acá viven los 10 equipos actuales.
    id: 'dv_lu_b',
    leagueId: 'lg_universitaria',
    name: 'Divisional B',
    level: 2,
    gameDay: 'lunes',
    gameTimes: ['20:00', '22:00'],
    altDays: ['miércoles'],
  },
  {
    id: 'dv_lm_f',
    leagueId: 'lg_montevideo',
    name: 'Divisional F',
    level: 6,
    gameDay: 'lunes',
    gameTimes: ['20:00', '22:00'],
    altDays: ['viernes'],
  },
  {
    id: 'dv_v35_c',
    leagueId: 'lg_veteranos',
    name: 'Divisional C',
    level: 3,
    gameDay: 'jueves',
    gameTimes: ['20:30', '22:15'],
    altDays: ['martes'],
  },
];

/** Liga y divisional donde compite el equipo principal del usuario. */
export const USER_LEAGUE_ID = 'lg_universitaria';
export const USER_DIVISION_ID = 'dv_lu_b';

export const CLUB_COLORS: [string, string][] = [
  ['#f08c2e', '#1b2739'],
  ['#3ddc84', '#0e141f'],
  ['#4ea8de', '#16202e'],
  ['#ff5d5d', '#222'],
  ['#f2c14e', '#333'],
  ['#b085f5', '#1a1a2e'],
  ['#e0e0e0', '#111'],
  ['#7ec850', '#123'],
  ['#ff9e6d', '#20242e'],
  ['#5dd0c0', '#1c2331'],
];

export const CRESTS = ['🏀', '🦅', '🐺', '⚡', '🔥', '🛡', '🌊', '🚂', '⭐', '🦁'] as const;
