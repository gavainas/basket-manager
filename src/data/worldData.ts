// Definición estática del mundo: ligas, divisionales y la composición inicial
// de cada una. Los equipos, planteles y fixtures se generan en
// src/game/world.ts a partir de estos datos; los ascensos y descensos que las
// van cambiando temporada a temporada viven en src/game/pyramid.ts.

import { RIVALS } from './rivals';
import type { Division, League, Rival, RivalStyle } from '../game/types';

/** Semilla de un equipo del mundo que NO es rival directo del usuario (otra divisional). */
export interface WorldTeamSeed {
  id: string;
  name: string;
  strength: number;
  style: RivalStyle;
}

/** Liga y divisional donde arranca el equipo principal del usuario. */
export const USER_LEAGUE_ID = 'lg_universitaria';
export const USER_DIVISION_ID = 'dv_lu_b';
export const PLAZA_DIVISION_ID = 'dv_pl_u';
export const CENTRO_LEAGUE_ID = 'lg_centro';
export const COMERCIO_LEAGUE_ID = 'lg_comercio';

/**
 * La Divisional A (la de arriba de todo): los que se juegan el año en serio.
 * No son rivales clásicos del usuario mientras juegue en la B; viven en la
 * capa del mundo, se los puede scoutear y son a los que se asciende.
 */
export const DIVISION_A_TEAMS: WorldTeamSeed[] = [
  { id: 'lua1', name: 'Náutico del Cerro', strength: 85, style: 'tiradores' },
  { id: 'lua2', name: 'Atlético Progreso', strength: 81, style: 'internos' },
  { id: 'lua3', name: 'Defensor del Prado', strength: 78, style: 'corredores' },
  { id: 'lua4', name: 'Olimpia del Oeste', strength: 76, style: 'equilibrado' },
  { id: 'lua5', name: 'Racing de la Villa', strength: 74, style: 'tiradores' },
  { id: 'lua6', name: 'Sportivo Artigas', strength: 72, style: 'internos' },
  { id: 'lua7', name: 'Estrella del Sur', strength: 70, style: 'corredores' },
  { id: 'lua8', name: 'Unión del Puerto', strength: 68, style: 'equilibrado' },
  { id: 'lua9', name: 'Colón Basket', strength: 66, style: 'tiradores' },
  { id: 'lua10', name: 'Litoral del Norte', strength: 64, style: 'internos' },
];

/**
 * La Divisional C: la primera parada del que se cae de la B. Equipos de
 * barrio con cancha prestada y planteles cortos, pero con gente que sabe.
 */
export const DIVISION_C_TEAMS: WorldTeamSeed[] = [
  { id: 'luc1', name: 'Rampla del Molino', strength: 58, style: 'internos' },
  { id: 'luc2', name: 'Atlético Reducto', strength: 55, style: 'equilibrado' },
  { id: 'luc3', name: 'Deportivo Capurro', strength: 52, style: 'corredores' },
  { id: 'luc4', name: 'Belvedere Basket', strength: 50, style: 'tiradores' },
  { id: 'luc5', name: 'Juventud del Paso', strength: 47, style: 'equilibrado' },
  { id: 'luc6', name: 'Nuevo París Basket', strength: 45, style: 'internos' },
  { id: 'luc7', name: 'Los Yuyos del Buceo', strength: 42, style: 'corredores' },
  { id: 'luc8', name: 'Unión Sayago', strength: 39, style: 'tiradores' },
  { id: 'luc9', name: 'Estrella de Piedras Blancas', strength: 37, style: 'equilibrado' },
  { id: 'luc10', name: 'Sportivo Aguada Chico', strength: 34, style: 'internos' },
];

/**
 * La Divisional D: el fondo de la Universitaria. Se juega igual, con la misma
 * ficha y el mismo árbitro, pero acá abajo no mira nadie. Se sube o se queda.
 */
export const DIVISION_D_TEAMS: WorldTeamSeed[] = [
  { id: 'lud1', name: 'Villa Española Basket', strength: 46, style: 'equilibrado' },
  { id: 'lud2', name: 'Atlético Manga', strength: 43, style: 'internos' },
  { id: 'lud3', name: 'Los Bomberos de Colón', strength: 41, style: 'corredores' },
  { id: 'lud4', name: 'Deportivo Casavalle', strength: 38, style: 'tiradores' },
  { id: 'lud5', name: 'La Cachimba', strength: 36, style: 'equilibrado' },
  { id: 'lud6', name: 'Punta de Rieles Basket', strength: 34, style: 'internos' },
  { id: 'lud7', name: 'El Monarca', strength: 31, style: 'corredores' },
  { id: 'lud8', name: 'Barrio Borro Basket', strength: 29, style: 'tiradores' },
  { id: 'lud9', name: 'Los Últimos de Filipinas', strength: 26, style: 'equilibrado' },
  { id: 'lud10', name: 'Deportivo Maroñas', strength: 24, style: 'internos' },
];

/**
 * Liga del Centro, Primera: la vidriera. Equipos de oficina y facultad que
 * entrenan de verdad, con ex federados repartidos por todos lados.
 */
export const CENTRO_1_TEAMS: WorldTeamSeed[] = [
  { id: 'ce1_1', name: 'Ciudad Vieja Basket', strength: 90, style: 'tiradores' },
  { id: 'ce1_2', name: 'Los Bancarios', strength: 87, style: 'internos' },
  { id: 'ce1_3', name: 'Escribanía Rossi', strength: 84, style: 'equilibrado' },
  { id: 'ce1_4', name: 'Los Médicos del Clínicas', strength: 81, style: 'corredores' },
  { id: 'ce1_5', name: 'Estudio Contable Pereira', strength: 79, style: 'tiradores' },
  { id: 'ce1_6', name: 'Aduana Basket', strength: 77, style: 'internos' },
  { id: 'ce1_7', name: 'Los Ingenieros', strength: 75, style: 'equilibrado' },
  { id: 'ce1_8', name: 'Torre Ejecutiva', strength: 73, style: 'corredores' },
  { id: 'ce1_9', name: 'Sindicato del Puerto', strength: 71, style: 'tiradores' },
  { id: 'ce1_10', name: 'Nocturno del Centro', strength: 70, style: 'equilibrado' },
];

/**
 * Liga del Centro, Segunda: por acá entra el que viene de afuera. Nueve
 * equipos y el lugar del recién llegado.
 */
export const CENTRO_2_TEAMS: WorldTeamSeed[] = [
  { id: 'ce2_1', name: 'Los Taxistas', strength: 78, style: 'corredores' },
  { id: 'ce2_2', name: 'Farmacia Central', strength: 76, style: 'tiradores' },
  { id: 'ce2_3', name: 'Gremio del Cordón', strength: 74, style: 'internos' },
  { id: 'ce2_4', name: 'Los Fiscales', strength: 72, style: 'equilibrado' },
  { id: 'ce2_5', name: 'Imprenta La Nocturna', strength: 69, style: 'tiradores' },
  { id: 'ce2_6', name: 'Mutualista Basket', strength: 67, style: 'internos' },
  { id: 'ce2_7', name: 'Los Peritos', strength: 65, style: 'corredores' },
  { id: 'ce2_8', name: 'Tribunales Basket', strength: 63, style: 'equilibrado' },
  { id: 'ce2_9', name: 'Turno Noche', strength: 62, style: 'tiradores' },
];

/**
 * Liga del Comercio: siete comercios del barrio y el lugar que queda libre.
 * Torneo corto de domingo de mañana, con premio en plata para el podio.
 */
export const COMERCIO_TEAMS: WorldTeamSeed[] = [
  { id: 'co1', name: 'Ferretería El Tornillo', strength: 58, style: 'internos' },
  { id: 'co2', name: 'Panadería Los Hornos', strength: 54, style: 'tiradores' },
  { id: 'co3', name: 'Autoservice Doña Chela', strength: 51, style: 'equilibrado' },
  { id: 'co4', name: 'Carnicería El Novillo', strength: 48, style: 'internos' },
  { id: 'co5', name: 'Bar El Refuerzo', strength: 45, style: 'corredores' },
  { id: 'co6', name: 'Óptica Mirasol', strength: 42, style: 'tiradores' },
  { id: 'co7', name: 'Taller Don Nino', strength: 38, style: 'equilibrado' },
];

/**
 * Rivales de las divisionales donde el club puede inscribir un equipo nuevo
 * (Mundo etapa 6). Se materializan en el mundo recién cuando el club se anota.
 */
export const EXPANSION_DIVISION_TEAMS: Record<string, WorldTeamSeed[]> = {
  // Liga Montevideo, Divisional F: liga libre de barrio, nivel bajo.
  dv_lm_f: [
    { id: 'lm1', name: 'Deportivo La Comercial', strength: 56, style: 'equilibrado' },
    { id: 'lm2', name: 'Malvín Chico', strength: 52, style: 'tiradores' },
    { id: 'lm3', name: 'La Teja Basket', strength: 49, style: 'corredores' },
    { id: 'lm4', name: 'La Blanqueada Basket', strength: 46, style: 'internos' },
    { id: 'lm5', name: 'Ferro del Oeste', strength: 43, style: 'equilibrado' },
    { id: 'lm6', name: 'Cordón Norte', strength: 40, style: 'tiradores' },
    { id: 'lm7', name: 'Brazo Oriental', strength: 37, style: 'corredores' },
  ],
  // Liga +35, Divisional C: veteranos con oficio, más duros de lo que parecen.
  dv_v35_c: [
    { id: 'v1', name: 'Veteranos de Malvín', strength: 62, style: 'internos' },
    { id: 'v2', name: 'Old Boys del Prado', strength: 58, style: 'tiradores' },
    { id: 'v3', name: 'Amigos del Círculo', strength: 54, style: 'equilibrado' },
    { id: 'v4', name: 'Maracaná Seniors', strength: 50, style: 'internos' },
    { id: 'v5', name: 'Los Notables', strength: 46, style: 'equilibrado' },
    { id: 'v6', name: 'Peñarol de la Mesa 5', strength: 43, style: 'tiradores' },
    { id: 'v7', name: 'El Resto del Mundo', strength: 40, style: 'corredores' },
  ],
};

export const LEAGUES: League[] = [
  {
    id: 'lg_universitaria',
    abbr: 'LU',
    colors: { base: '#2f5d8f', alt: '#e8e4dc' },
    name: 'Liga Universitaria',
    kind: 'universitaria',
    divisionCount: 4,
    rules: [
      'Cuatro divisionales: de la A a la D, con ascensos y descensos todos los años.',
      'Suben los dos finalistas de la Copa de Oro; bajan los dos últimos de la tabla.',
      'Un jugador solo puede estar inscripto en un equipo de la liga por temporada.',
      'La ficha se paga al inscribirse y habilita toda la temporada.',
    ],
  },
  {
    id: CENTRO_LEAGUE_ID,
    abbr: 'C',
    colors: { base: '#33373f', alt: '#c9a34e' },
    name: 'Liga del Centro',
    kind: 'libre',
    divisionCount: 2,
    rules: [
      'Se juega de noche en el centro: el último partido empieza 23:00.',
      'Dos divisionales con ascensos y descensos.',
      'La ficha se paga contado antes de la primera fecha: acá no fían.',
      'Piden antecedentes: no aceptan clubes sin nada de prestigio deportivo.',
    ],
  },
  {
    id: COMERCIO_LEAGUE_ID,
    abbr: 'LC',
    colors: { base: '#2e6b4d', alt: '#e8e4dc' },
    name: 'Liga del Comercio',
    kind: 'libre',
    divisionCount: 1,
    rules: [
      'Torneo corto de ocho equipos: siete fechas y las copas.',
      'Se juega los domingos de mañana; la organizan los comercios del barrio.',
      'Premio en plata para el podio, puesto por los auspiciantes.',
      'Sin ascensos ni descensos: el torneo se rearma cada año.',
    ],
  },
  {
    id: 'lg_plaza',
    abbr: 'LP',
    colors: { base: '#9c5b3c', alt: '#e8e4dc' },
    name: 'Liga de la Plaza',
    kind: 'libre',
    divisionCount: 1,
    rules: [
      'Inscripción gratuita: la organiza la comisión de la plaza.',
      'Sin ascensos ni descensos: acá se viene a jugar, no a subir.',
      'Un jugador solo puede estar inscripto en un equipo de la liga por temporada.',
    ],
  },
  {
    id: 'lg_montevideo',
    abbr: 'M',
    colors: { base: '#456470', alt: '#e8e4dc' },
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
    abbr: '35',
    colors: { base: '#6a4a86', alt: '#e8e4dc' },
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
    // La divisional donde arranca el club: acá viven los rivales clásicos.
    id: 'dv_lu_b',
    leagueId: 'lg_universitaria',
    name: 'Divisional B',
    level: 2,
    gameDay: 'lunes',
    gameTimes: ['20:00', '22:00'],
    altDays: ['miércoles'],
  },
  {
    id: 'dv_lu_c',
    leagueId: 'lg_universitaria',
    name: 'Divisional C',
    level: 3,
    gameDay: 'miércoles',
    gameTimes: ['20:00', '22:00'],
    altDays: ['lunes'],
  },
  {
    // El fondo de la Universitaria juega martes tarde: la cancha buena se la
    // quedan los de arriba y a la D le toca el turno de las 21.
    id: 'dv_lu_d',
    leagueId: 'lg_universitaria',
    name: 'Divisional D',
    level: 4,
    gameDay: 'martes',
    gameTimes: ['21:00', '22:45'],
    altDays: ['miércoles'],
  },
  {
    id: 'dv_ce_1',
    leagueId: CENTRO_LEAGUE_ID,
    name: 'Primera',
    level: 1,
    gameDay: 'miércoles',
    gameTimes: ['21:30', '23:00'],
    altDays: ['martes'],
  },
  {
    // Por acá entra el que viene de afuera. Martes a las 23:00: el que labura
    // temprano lo va a sufrir, y eso es parte del precio.
    id: 'dv_ce_2',
    leagueId: CENTRO_LEAGUE_ID,
    name: 'Segunda',
    level: 2,
    gameDay: 'martes',
    gameTimes: ['21:30', '23:00'],
    altDays: ['miércoles'],
  },
  {
    // Domingo de mañana: no le pisa el día a nadie y la vuelta es con asado.
    id: 'dv_co_u',
    leagueId: COMERCIO_LEAGUE_ID,
    name: 'Única',
    level: 5,
    gameDay: 'domingo',
    gameTimes: ['10:00', '11:30'],
    altDays: ['sábado'],
  },
  {
    // Viernes a propósito: los partidos del segundo equipo no pisan los del
    // principal (lunes). El doble partido el mismo día es la etapa 7.
    id: 'dv_lm_f',
    leagueId: 'lg_montevideo',
    name: 'Divisional F',
    level: 6,
    gameDay: 'viernes',
    gameTimes: ['20:00', '22:00'],
    altDays: ['lunes'],
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
  {
    // La Liga de la Plaza: sábados a la tarde, gratis, sin ascensos. Nadie
    // tiene la agenda bloqueada los sábados: acá puede venir todo el mundo.
    // Lo que se paga es otra cosa: nivel bajo y prestigio que no acompaña.
    id: 'dv_pl_u',
    leagueId: 'lg_plaza',
    name: 'Única',
    level: 8,
    gameDay: 'sábado',
    gameTimes: ['17:00', '19:00'],
    altDays: ['domingo'],
  },
];

/**
 * Los de la plaza: rivales del torneo si el club se anota ahí. Varios son los
 * cuadros de origen que ya se nombran en el mercado ("viene de El Galpón"):
 * el mundo chico cierra solo.
 */
export const PLAZA_RIVALS: WorldTeamSeed[] = [
  { id: 'plu1', name: 'La Amistad', strength: 48, style: 'equilibrado' },
  { id: 'plu2', name: 'Los Tablones', strength: 45, style: 'corredores' },
  { id: 'plu3', name: 'Los de Siempre', strength: 43, style: 'internos' },
  { id: 'plu4', name: 'El Galpón', strength: 41, style: 'equilibrado' },
  { id: 'plu5', name: 'Panadería La Ideal', strength: 38, style: 'tiradores' },
  { id: 'plu6', name: 'La Esquina del Tanque', strength: 36, style: 'internos' },
  { id: 'plu7', name: 'Barrio Norte', strength: 33, style: 'corredores' },
  { id: 'plu8', name: 'Los Primos', strength: 31, style: 'tiradores' },
  { id: 'plu9', name: 'El Túnel', strength: 28, style: 'equilibrado' },
];

/**
 * Composición inicial de CADA divisional del mundo (sin contar al club del
 * usuario, que ocupa un lugar en la suya). Los ids son slots de esa
 * divisional: la identidad de un club es su NOMBRE, no su id — por eso un
 * equipo puede ascender y cambiar de slot sin dejar de ser el mismo.
 */
export const DIVISION_SEEDS: Record<string, Rival[]> = {
  dv_lu_a: DIVISION_A_TEAMS.map(toRival),
  dv_lu_b: RIVALS.map((r, i) => ({ ...r, id: `lub${i + 1}` })),
  dv_lu_c: DIVISION_C_TEAMS.map(toRival),
  dv_lu_d: DIVISION_D_TEAMS.map(toRival),
  dv_ce_1: CENTRO_1_TEAMS.map(toRival),
  dv_ce_2: CENTRO_2_TEAMS.map(toRival),
  dv_co_u: COMERCIO_TEAMS.map(toRival),
  dv_pl_u: PLAZA_RIVALS.map(toRival),
};

function toRival(t: WorldTeamSeed): Rival {
  return { id: t.id, name: t.name, strength: t.strength, style: t.style };
}

/** Prefijo de slot de cada divisional (ids únicos en todo el mundo). */
export const DIVISION_SLOT_PREFIX: Record<string, string> = {
  dv_lu_a: 'lua',
  dv_lu_b: 'lub',
  dv_lu_c: 'luc',
  dv_lu_d: 'lud',
  dv_ce_1: 'ce1_',
  dv_ce_2: 'ce2_',
  dv_co_u: 'co',
  dv_pl_u: 'plu',
};

/** Las divisionales que viven en el mundo (las del segundo equipo van aparte). */
export const WORLD_DIVISION_IDS = Object.keys(DIVISION_SEEDS);

/** Premio en plata del podio de una liga que reparte. */
export interface LeaguePrize {
  champion: number;
  runnerUp: number;
  /** Campeón de la Copa de Plata (el torneo de los que no entraron al Oro). */
  silver: number;
}

/** Cómo se entra a una liga y qué se paga (y qué se cobra) por estar ahí. */
export interface LeagueEntry {
  leagueId: string;
  /** Divisional por la que entra un club que viene de afuera. */
  entryDivisionId: string;
  fee: number;
  /** Te fía la inscripción porque te conocen, o cobra contado. */
  trusts: boolean;
  /** La liga mueve equipos entre divisionales al cierre de la temporada. */
  promotes: boolean;
  prize?: LeaguePrize;
  /** Prestigio deportivo mínimo para que te acepten. */
  minSportPrestige?: number;
  /** Lo que mueve anotarse acá (se aplica una sola vez, al inscribirse). */
  prestigeOnJoin?: { sport?: number; social?: number };
  /** El carácter de la opción en la pantalla de inscripción. */
  note: string;
}

/**
 * La oferta: las ligas donde el club puede anotar su equipo principal. La
 * Universitaria no está acá porque no se entra "de afuera": se entra por la
 * divisional que te corresponde (la tuya, o la que te guardaron).
 */
export const LEAGUE_ENTRIES: LeagueEntry[] = [
  {
    leagueId: CENTRO_LEAGUE_ID,
    entryDivisionId: 'dv_ce_2',
    fee: 450,
    trusts: false,
    promotes: true,
    minSportPrestige: 45,
    prestigeOnJoin: { sport: 4 },
    note:
      'La nocturna del Centro: la ficha es cara y se paga contado (no te conocen, no te fían), se juega tarde y el nivel es otro. Pero jugar acá se nota en el cartel del club.',
  },
  {
    leagueId: COMERCIO_LEAGUE_ID,
    entryDivisionId: 'dv_co_u',
    fee: 180,
    trusts: false,
    promotes: false,
    prize: { champion: 400, runnerUp: 200, silver: 100 },
    prestigeOnJoin: { social: 2 },
    note:
      'Torneo corto de los comercios del barrio: siete fechas, domingo de mañana y premio en plata para el podio. Barato, pero es media temporada de cuotas menos.',
  },
  {
    leagueId: 'lg_plaza',
    entryDivisionId: PLAZA_DIVISION_ID,
    fee: 0,
    trusts: false,
    promotes: false,
    note:
      'Gratis y los sábados puede todo el mundo. Sin ascensos, el prestigio deportivo se derrite semana a semana, los ambiciosos del plantel se calientan y las figuras del mercado ni te atienden.',
  },
];

export function leagueEntryOf(leagueId: string): LeagueEntry | undefined {
  return LEAGUE_ENTRIES.find((e) => e.leagueId === leagueId);
}

/**
 * Colores de camiseta [principal, vivo].
 *
 * Antes eran los neón del tema oscuro (#3ddc84, #4ea8de, #ff5d5d, #b085f5):
 * pensados para brillar sobre azul noche, chillones sobre papel claro. Ahora son
 * combinaciones de club de barrio — tintas apagadas, la clase de par que ves en
 * una camiseta de algodón lavada cien veces.
 *
 * **Ninguno es el naranja de acción** (`--naranja`, #e07a2a): ese color está
 * reservado y una camiseta no lo puede gastar (ver design/SISTEMA_VISUAL.md).
 */
export const CLUB_COLORS: [string, string][] = [
  ['#2d5c8a', '#e8e4dc'], // azul y blanco
  ['#9d3b3b', '#f0e6d2'], // bordó y crema
  ['#2f6b4f', '#efe9dc'], // verde y blanco
  ['#3a3f4a', '#c9a227'], // negro y oro
  ['#6a4a86', '#ece7f0'], // violeta y blanco
  ['#8c4a2a', '#e8ddcf'], // ladrillo y hueso
  ['#456470', '#cfe0e6'], // pizarra y celeste
  ['#c9a227', '#3a3f4a'], // oro y negro
  ['#7a2f45', '#e6dfd4'], // vino y crema
  ['#356b6b', '#eef0e8'], // verde agua y blanco
];
