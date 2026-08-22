// El mundo del juego: ligas, divisionales, clubes, equipos, jugadores rivales,
// inscripciones y fixture. Es una capa modular sobre el juego clásico: los
// sistemas existentes (rivals/schedule/standings) siguen mandando en el partido
// del usuario, y el mundo los espeja con entidades completas.

import { BALANCE } from './balance';
import { CLUB_COLORS, DIVISIONS, LEAGUES, USER_LEAGUE_ID } from '../data/worldData';
import { DELEGATE_NAMES, FIRST_NAMES, INTERIOR_CITIES, LAST_NAMES, NEIGHBORHOODS } from '../data/names';
import { Rng, seedFromString } from './rng';
import type {
  AvailabilityProfile,
  Division,
  GameState,
  Personality,
  Position,
  Team,
  WeekDay,
  WorldClub,
  WorldFixture,
  WorldPlayer,
  WorldState,
} from './types';

export const USER_CLUB_ID = 'cl_user';
export const USER_TEAM_ID = 'tm_user';

// ---------- Regla central de inscripción ----------

export function findActiveRegistration(world: WorldState, playerId: string, leagueId: string, seasonId: string) {
  return world.registrations.find(
    (r) => r.playerId === playerId && r.leagueId === leagueId && r.seasonId === seasonId && r.status === 'activa'
  );
}

/**
 * Inscribe un jugador en un equipo. Regla central: como máximo UNA inscripción
 * activa por playerId + leagueId + seasonId (la divisional no habilita otra).
 */
export function registerPlayer(
  world: WorldState,
  reg: { playerId: string; teamId: string; leagueId: string; seasonId: string; week: number }
): { ok: boolean; reason?: string } {
  const existing = findActiveRegistration(world, reg.playerId, reg.leagueId, reg.seasonId);
  if (existing) {
    if (existing.teamId === reg.teamId) return { ok: true };
    return { ok: false, reason: 'Ya tiene ficha activa en otro equipo de esa liga esta temporada.' };
  }
  world.registrations.push({
    id: `rg_${reg.seasonId}_${reg.playerId}_${world.registrations.length}`,
    playerId: reg.playerId,
    teamId: reg.teamId,
    leagueId: reg.leagueId,
    seasonId: reg.seasonId,
    status: 'activa',
    registeredWeek: reg.week,
  });
  return { ok: true };
}

/** La liga donde compite el equipo principal (depende de la divisional elegida). */
export function userLeagueId(state: GameState): string {
  return DIVISIONS.find((d) => d.id === state.divisionId)?.leagueId ?? USER_LEAGUE_ID;
}

/** "los lunes" pero "los sábados": el plural del día para los textos. */
export function dayLabel(d: WeekDay): string {
  return d === 'sábado' ? 'sábados' : d === 'domingo' ? 'domingos' : d;
}

/** Mantiene las fichas del plantel del usuario al día (altas y bajas). */
export function syncUserRegistrations(state: GameState): void {
  const world = state.world;
  const seasonId = world.season.id;
  for (const p of state.players) {
    if (p.leftClub) continue;
    registerPlayer(world, {
      playerId: p.id,
      teamId: USER_TEAM_ID,
      leagueId: userLeagueId(state),
      seasonId,
      week: Math.min(state.week, state.seasonLength),
    });
  }
  for (const r of world.registrations) {
    if (r.teamId !== USER_TEAM_ID || r.status !== 'activa') continue;
    const p = state.players.find((x) => x.id === r.playerId);
    if (p?.leftClub) {
      r.status = 'baja';
      r.endWeek = Math.min(state.week, state.seasonLength);
    }
  }
}

// ---------- Consultas ----------

export function userTeam(world: WorldState): Team {
  return world.teams.find((t) => t.id === USER_TEAM_ID)!;
}

export function teamByLegacyRival(world: WorldState, rivalId: string): Team | undefined {
  return world.teams.find((t) => t.legacyRivalId === rivalId);
}

/**
 * Club del mundo detrás de un id del sistema clásico ('club' para el usuario,
 * 'rN' para un rival). Lo necesita cualquier pantalla que quiera el escudo o los
 * colores de un equipo que solo conoce por su id viejo — la tabla de posiciones,
 * el fixture, el próximo rival.
 */
export function clubByLegacyId(world: WorldState, id: string): WorldClub | undefined {
  const team = id === 'club' ? userTeam(world) : teamByLegacyRival(world, id);
  return team ? world.clubs.find((c) => c.id === team.clubId) : undefined;
}

/** Plantel de un equipo rival (jugadores del mundo con ficha activa). */
export function teamRoster(world: WorldState, teamId: string): WorldPlayer[] {
  const ids = new Set(
    world.registrations.filter((r) => r.teamId === teamId && r.status === 'activa').map((r) => r.playerId)
  );
  return world.players.filter((p) => ids.has(p.id));
}

export function worldPlayerById(world: WorldState, id: string): WorldPlayer | undefined {
  return world.players.find((p) => p.id === id);
}

export function worldPlayerName(p: WorldPlayer): string {
  return `${p.firstName} ${p.lastName}`;
}

/** Equipo (y club) donde está inscripto un jugador del mundo esta temporada. */
export function worldPlayerTeam(world: WorldState, playerId: string): Team | undefined {
  const reg = world.registrations.find((r) => r.playerId === playerId && r.status === 'activa');
  return reg ? world.teams.find((t) => t.id === reg.teamId) : undefined;
}

export function divisionOfTeam(world: WorldState, teamId: string): Division | undefined {
  const entry = world.entries.find((e) => e.teamId === teamId && e.status === 'activa');
  return entry ? world.divisions.find((d) => d.id === entry.divisionId) : undefined;
}

export function fixturesOfWeek(world: WorldState, week: number): WorldFixture[] {
  return world.fixtures.filter((f) => f.week === week);
}

export function userFixtureOfWeek(world: WorldState, week: number): WorldFixture | undefined {
  return world.fixtures.find((f) => f.week === week && f.isUserMatch);
}

export function teamName(world: WorldState, teamId: string): string {
  return world.teams.find((t) => t.id === teamId)?.name ?? teamId;
}

// ---------- Fechas ----------

const WEEKDAY_INDEX: Record<WeekDay, number> = {
  lunes: 1,
  martes: 2,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  domingo: 0,
};

/** Lunes de la semana 1 de la temporada (abril del año que corresponda). */
function seasonMonday(year: number): Date {
  const d = new Date(Date.UTC(year, 3, 1));
  const shift = (8 - d.getUTCDay()) % 7; // días hasta el próximo lunes
  d.setUTCDate(d.getUTCDate() + shift);
  return d;
}

function fixtureDate(year: number, week: number, day: WeekDay): string {
  const d = seasonMonday(year);
  d.setUTCDate(d.getUTCDate() + (week - 1) * 7 + ((WEEKDAY_INDEX[day] + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// ---------- Generación del mundo ----------

export function emptyWorld(): WorldState {
  return {
    season: { id: 's0', number: 0, year: 2026, startDate: '' },
    leagues: [],
    divisions: [],
    venues: [],
    clubs: [],
    teams: [],
    players: [],
    registrations: [],
    entries: [],
    fixtures: [],
    playerSeq: 1,
  };
}

const RIVAL_PERSONALITIES: Personality[] = [
  'competitivo', 'social', 'protagonista', 'leal', 'mercenario', 'cumplidor', 'veterano', 'talentoso_informal',
];

const ROSTER_TEMPLATE: Position[] = [
  'Base', 'Base', 'Escolta', 'Escolta', 'Alero', 'Alero', 'Alero', 'Ala-Pívot', 'Ala-Pívot', 'Pívot', 'Pívot', 'Escolta',
];

const BLOCKABLE_DAYS: WeekDay[] = ['lunes', 'martes', 'jueves', 'viernes'];

// ---------- Identidad institucional congelada ----------

/**
 * Cada plantel tiene un carácter: cambia cómo se arma y cómo se renueva.
 * Sale del nombre del club, así el carácter también es parte de la identidad.
 */
export type ClubArchetype = 'juvenil' | 'veterano' | 'estrella' | 'parejo';

export interface ClubIdentity {
  colors: [string, string];
  founded: number;
  socialPrestige: number;
  delegate: string;
  neighborhood: string;
  coachName: string;
  archetype: ClubArchetype;
  /** Tipo de DT cuando el club no es de los que pagan (fuerza < 68). */
  modestCoachType: 'jugador' | 'honorario';
}

/**
 * La chapa institucional de un club rival, derivada SOLO de su nombre
 * (`seedFromString`): colores, fundación, delegado y carácter no cambian de
 * temporada a temporada ni dependen de en qué divisional cayó. Antes salían
 * del RNG del momento y del índice del slot: el mismo club cambiaba de
 * camiseta y de año de fundación cada año.
 */
export function clubIdentity(name: string): ClubIdentity {
  const rng = new Rng(seedFromString(`club_${name}`));
  const archetypes: ClubArchetype[] = ['juvenil', 'veterano', 'estrella', 'parejo', 'parejo'];
  return {
    colors: CLUB_COLORS[rng.int(0, CLUB_COLORS.length - 1)],
    founded: 2026 - rng.int(4, 60),
    socialPrestige: rng.int(30, 80),
    delegate: DELEGATE_NAMES[rng.int(0, DELEGATE_NAMES.length - 1)],
    neighborhood: NEIGHBORHOODS[rng.int(0, NEIGHBORHOODS.length - 1)],
    coachName: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    archetype: rng.pick(archetypes),
    modestCoachType: rng.chance(0.25) ? 'jugador' : 'honorario',
  };
}

/** Edad con pirámide: el grueso en 22-31, colas de pibes y veteranos. */
function rollAge(rng: Rng, archetype: ClubArchetype): number {
  const base = Math.round((rng.int(19, 36) + rng.int(19, 36)) / 2); // triangular ~27
  if (archetype === 'juvenil') return Math.max(18, base - rng.int(3, 6));
  if (archetype === 'veterano') return Math.min(39, base + rng.int(3, 6));
  return base;
}

/** Genera la agenda personal de un jugador (también usada por el mercado de pases). */
export function genAvailability(commitment: number, reliability: number, rng: Rng): AvailabilityProfile {
  const interior = rng.chance(0.08);
  const res = interior ? rng.pick(INTERIOR_CITIES) : { city: 'Montevideo', km: 0 };
  const blockedDays: WeekDay[] = rng.chance(0.2) ? [rng.pick(BLOCKABLE_DAYS)] : [];
  const onlyTimes = rng.chance(0.15) ? ['22:00'] : [];
  const baseChance = Math.max(0.25, Math.min(0.97, 0.5 + reliability * 0.004 + commitment * 0.0015 + rng.range(-0.05, 0.05)));
  const lateChance = Math.min(0.5, (100 - reliability) * 0.004);

  const notes: string[] = [];
  if (interior) notes.push(`Vive en ${res.city} (${res.km} km): viene cuando puede.`);
  for (const d of blockedDays) notes.push(`Los ${dayLabel(d)} no puede: compromiso fijo.`);
  if (onlyTimes.length > 0) notes.push('Por el trabajo solo llega a los partidos de 22:00.');
  if (lateChance > 0.25) notes.push('Suele llegar sobre la hora, a veces empezado el partido.');
  if (notes.length === 0 && baseChance > 0.85) notes.push('De los que están siempre: confirma temprano y no falla.');

  return { baseChance, blockedDays, onlyTimes, lateChance, residence: res.city, distanceKm: res.km, notes };
}

/** Id de persona nuevo, único de por vida (el contador nunca se reusa). */
function nextPersonId(world: WorldState): string {
  const seq = world.playerSeq ?? 1;
  world.playerSeq = seq + 1;
  return `wp_n${seq}`;
}

/** Crea una persona nueva para un club, respetando el carácter del plantel. */
function newWorldPlayer(
  world: WorldState,
  clubName: string,
  position: Position,
  strength: number,
  role: 'estrella' | 'plantel' | 'juvenil',
  seasonNumber: number,
  rng: Rng,
  takenNames?: Set<string>
): WorldPlayer {
  const identity = clubIdentity(clubName);
  let first = rng.pick(FIRST_NAMES);
  let last = rng.pick(LAST_NAMES);
  // Dos "Diego Sosa" en el mismo vestuario confunden: se re-sortea.
  for (let guard = 0; takenNames?.has(`${first} ${last}`) && guard < 8; guard++) {
    first = rng.pick(FIRST_NAMES);
    last = rng.pick(LAST_NAMES);
  }
  takenNames?.add(`${first} ${last}`);
  const age = role === 'juvenil' ? rng.int(18, 23) : rollAge(rng, identity.archetype);
  let spread: number;
  if (role === 'estrella') spread = rng.int(6, 14);
  else if (role === 'juvenil') spread = rng.int(-18, -6);
  else if (identity.archetype === 'estrella') spread = rng.int(-16, 0);
  else if (identity.archetype === 'parejo') spread = rng.int(-7, 5);
  else spread = rng.int(-14, 8);
  const level = Math.max(28, Math.min(92, Math.round(strength + spread)));
  const commitment = rng.int(35, 95);
  const reliability = identity.archetype === 'veterano' ? rng.int(55, 95) : rng.int(40, 95);
  return {
    id: nextPersonId(world),
    firstName: first,
    lastName: last,
    age,
    position,
    secondaryPositions: rng.chance(0.35) ? [rng.pick(ROSTER_TEMPLATE.filter((p) => p !== position))] : [],
    level,
    personality: rng.pick(RIVAL_PERSONALITIES),
    commitment,
    reliability,
    prestige: Math.max(10, Math.min(90, level + rng.int(-15, 10))),
    availability: genAvailability(commitment, reliability, rng),
    injuryWeeks: 0,
    clubName,
    joinedSeason: seasonNumber,
    timesFaced: 0,
  };
}

/** Plantel entero desde cero (club nuevo en el mundo, o primer arranque). */
function genRosterFor(world: WorldState, clubName: string, strength: number, seasonNumber: number, rng: Rng): WorldPlayer[] {
  const taken = new Set<string>();
  return ROSTER_TEMPLATE.map((position, i) =>
    newWorldPlayer(world, clubName, position, strength, i === 0 ? 'estrella' : 'plantel', seasonNumber, rng, taken)
  );
}

/**
 * Completa un plantel que quedó corto tras el verano (retiros y pases): los
 * clubes pescan juveniles y algún conocido del barrio. Es la renovación
 * natural del mundo: los que llegan son mayormente pibes.
 */
function refillRoster(
  world: WorldState,
  clubName: string,
  strength: number,
  current: WorldPlayer[],
  seasonNumber: number,
  rng: Rng
): WorldPlayer[] {
  const added: WorldPlayer[] = [];
  const target = 11;
  const taken = new Set(current.map((p) => `${p.firstName} ${p.lastName}`));
  const covered = new Set(current.map((p) => p.position));
  const missing = (['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'] as Position[]).filter((pos) => !covered.has(pos));
  while (current.length + added.length < target) {
    const position = missing.shift() ?? rng.pick(ROSTER_TEMPLATE);
    const role = rng.chance(0.7) ? 'juvenil' : 'plantel';
    added.push(newWorldPlayer(world, clubName, position, strength, role, seasonNumber, rng, taken));
  }
  return added;
}

/**
 * Alinea suavemente el plantel heredado con la fuerza actual del club (los
 * ascensos/descensos la mueven): un empujón chico por jugador, no un reroll.
 */
function nudgeRosterTowards(roster: WorldPlayer[], strength: number, rng: Rng): void {
  if (roster.length === 0) return;
  const top = [...roster].sort((a, b) => b.level - a.level).slice(0, 8);
  const avg = top.reduce((t, p) => t + p.level, 0) / top.length;
  const diff = strength - avg;
  if (Math.abs(diff) <= 8) return;
  const step = diff > 0 ? 1 : -1;
  for (const p of roster) {
    p.level = Math.max(28, Math.min(92, p.level + step * rng.int(1, 3)));
  }
}

/**
 * Recupera (o crea) el plantel de un club por su NOMBRE desde el pool
 * persistente, lo alinea con la fuerza actual y lo completa si quedó corto.
 * Acá es donde el mundo deja de ser slots: las personas siguen siendo las
 * mismas de una temporada a la otra.
 */
function rosterForClub(
  world: WorldState,
  clubName: string,
  strength: number,
  seasonNumber: number,
  rng: Rng
): WorldPlayer[] {
  const current = world.players.filter((p) => p.clubName === clubName);
  if (current.length === 0) {
    const fresh = genRosterFor(world, clubName, strength, seasonNumber, rng);
    world.players.push(...fresh);
    return fresh;
  }
  nudgeRosterTowards(current, strength, rng);
  if (current.length < 11) {
    const extra = refillRoster(world, clubName, strength, current, seasonNumber, rng);
    world.players.push(...extra);
    return [...current, ...extra];
  }
  return current;
}

/**
 * Construye el mundo a partir del estado clásico (rivals + schedule).
 * Los equipos, fichas y fixture se rearman cada temporada; las PERSONAS
 * (world.players) persisten: vienen del estado anterior y solo se completan.
 */
export function buildWorld(state: GameState, rng: Rng): WorldState {
  const world = emptyWorld();
  const seasonId = `s${state.seasonNumber}`;
  const year = 2025 + state.seasonNumber;
  world.season = {
    id: seasonId,
    number: state.seasonNumber,
    year,
    startDate: fixtureDate(year, 1, 'lunes'),
  };
  world.leagues = LEAGUES;
  world.divisions = DIVISIONS;
  // El pool de personas se hereda del mundo anterior (Sprint 5). Los que
  // quedaron libres siguen en el pool (sin ficha): el verano que viene se
  // acomodan en algún club. Los slots de saves viejos ('wp_t...') sin club
  // asignado no persisten: esa partida arranca su memoria del mundo acá.
  world.players = (state.world.players ?? []).filter((p) => p.clubName !== undefined || !p.id.startsWith('wp_t'));
  world.playerSeq = state.world.playerSeq ?? 1;
  const division = DIVISIONS.find((d) => d.id === state.divisionId)!;
  // La liga del usuario sale de su divisional (Universitaria o la plaza).
  const leagueId = division.leagueId;

  // Club y equipo del usuario.
  world.venues.push({ id: 'vn_user', name: 'Gimnasio del Parque', neighborhood: 'Parque Batlle' });
  world.clubs.push({
    id: USER_CLUB_ID,
    name: state.club.name,
    colors: CLUB_COLORS[0],
    // El club nació el año anterior a su primera temporada, y esa fecha no se mueve.
    founded: 2025,
    // El prestigio real del usuario vive en state.club; esto es un espejo.
    sportPrestige: state.club.sportPrestige,
    socialPrestige: state.club.socialPrestige,
    isUser: true,
  });
  world.teams.push({
    id: USER_TEAM_ID,
    clubId: USER_CLUB_ID,
    name: state.club.name,
    category: 'mayores',
    status: 'activo',
    venueId: 'vn_user',
    delegate: 'vos',
    legacyRivalId: 'club',
  });

  // Clubes y equipos rivales (uno por rival del sistema clásico). La chapa
  // institucional (colores, fundación, delegado, DT) sale del NOMBRE, no del
  // slot ni del RNG del momento: el mismo club es el mismo club todos los años.
  state.rivals.forEach((rival) => {
    const clubId = `cl_${rival.id}`;
    const teamId = `tm_${rival.id}`;
    const venueId = `vn_${rival.id}`;
    const identity = clubIdentity(rival.name);
    world.venues.push({
      id: venueId,
      name: `Gimnasio de ${rival.name.split(' ').slice(-1)[0]}`,
      neighborhood: identity.neighborhood,
    });
    world.clubs.push({
      id: clubId,
      name: rival.name,
      colors: identity.colors,
      founded: identity.founded,
      sportPrestige: Math.max(15, Math.min(90, Math.round(rival.strength))),
      socialPrestige: identity.socialPrestige,
    });
    world.teams.push({
      id: teamId,
      clubId,
      name: rival.name,
      category: 'mayores',
      status: 'activo',
      venueId,
      delegate: identity.delegate,
      // Los grandes pagan DT; el resto se arregla con honorarios o un jugador.
      coachName: identity.coachName,
      coachType: rival.strength >= 68 ? 'pago' : identity.modestCoachType,
      legacyRivalId: rival.id,
    });

    const roster = rosterForClub(world, rival.name, rival.strength, state.seasonNumber, rng);
    for (const p of roster) {
      registerPlayer(world, { playerId: p.id, teamId, leagueId, seasonId, week: 0 });
    }
  });

  // Inscripciones de los equipos en la divisional activa.
  for (const t of world.teams) {
    world.entries.push({
      teamId: t.id,
      leagueId,
      divisionId: state.divisionId,
      seasonId,
      status: 'activa',
      fee: 300,
      registeredWeek: 0,
    });
  }

  // Fixture de toda la temporada: el cruce del usuario sale del schedule
  // clásico; el resto de la divisional se empareja de forma determinista.
  for (let w = 1; w <= state.seasonLength; w++) {
    const rivalId = state.schedule[w - 1];
    const rivalTeam = teamByLegacyRival(world, rivalId)!;
    const userHome = w % 2 === 1;
    const played = state.history.find((m) => m.week === w);
    world.fixtures.push({
      id: `fx_${seasonId}_w${w}_u`,
      seasonId,
      leagueId,
      divisionId: state.divisionId,
      week: w,
      date: fixtureDate(year, w, division.gameDay),
      time: division.gameTimes[w % division.gameTimes.length],
      homeTeamId: userHome ? USER_TEAM_ID : rivalTeam.id,
      awayTeamId: userHome ? rivalTeam.id : USER_TEAM_ID,
      venueId: userHome ? 'vn_user' : rivalTeam.venueId,
      status: played ? 'jugado' : 'programado',
      scoreHome: played ? (userHome ? played.scoreFor : played.scoreAgainst) : undefined,
      scoreAway: played ? (userHome ? played.scoreAgainst : played.scoreFor) : undefined,
      isUserMatch: true,
    });

    const others = rng.shuffle(world.teams.filter((t) => t.id !== USER_TEAM_ID && t.id !== rivalTeam.id));
    for (let i = 0; i + 1 < others.length; i += 2) {
      world.fixtures.push({
        id: `fx_${seasonId}_w${w}_${i / 2}`,
        seasonId,
        leagueId,
        divisionId: state.divisionId,
        week: w,
        date: fixtureDate(year, w, division.gameDay),
        time: division.gameTimes[i / 2 % division.gameTimes.length],
        homeTeamId: others[i].id,
        awayTeamId: others[i + 1].id,
        venueId: others[i].venueId,
        status: w < state.week ? 'jugado' : 'programado',
        isUserMatch: false,
      });
    }
  }

  // La otra divisional de la liga (la de arriba mientras el usuario juega en B):
  // equipos completos con plantel, para scoutear y para los ascensos/descensos.
  // Se genera al final para no alterar el RNG ni el emparejamiento de la del usuario.
  const otherDivision = DIVISIONS.find((d) => d.leagueId === USER_LEAGUE_ID && d.id !== state.divisionId);
  if (otherDivision) {
    state.otherDivisionTeams.forEach((seed) => {
      const clubId = `cl_${seed.id}`;
      const teamId = `tm_${seed.id}`;
      const venueId = `vn_${seed.id}`;
      const identity = clubIdentity(seed.name);
      world.venues.push({
        id: venueId,
        name: `Gimnasio de ${seed.name.split(' ').slice(-1)[0]}`,
        neighborhood: identity.neighborhood,
      });
      world.clubs.push({
        id: clubId,
        name: seed.name,
        colors: identity.colors,
        founded: identity.founded,
        sportPrestige: Math.max(20, Math.min(95, seed.strength)),
        socialPrestige: identity.socialPrestige,
      });
      world.teams.push({
        id: teamId,
        clubId,
        name: seed.name,
        category: 'mayores',
        status: 'activo',
        venueId,
        delegate: identity.delegate,
        coachName: identity.coachName,
        coachType: seed.strength >= 75 ? 'pago' : identity.modestCoachType,
        // Sin legacyRivalId: no es un rival del sistema clásico.
      });
      world.entries.push({
        teamId,
        leagueId: USER_LEAGUE_ID,
        divisionId: otherDivision.id,
        seasonId,
        status: 'activa',
        fee: 300,
        registeredWeek: 0,
      });
      const roster = rosterForClub(world, seed.name, seed.strength, state.seasonNumber, rng);
      for (const p of roster) {
        registerPlayer(world, { playerId: p.id, teamId, leagueId: USER_LEAGUE_ID, seasonId, week: 0 });
      }
    });
  }

  // Fichas del plantel del usuario (regla central incluida).
  const tempState = { ...state, world };
  syncUserRegistrations(tempState);

  return world;
}

// ---------- El verano del mundo: las personas siguen su vida ----------

export interface OffseasonWorldResult {
  /** El pool de personas ya evolucionado, listo para heredar al mundo nuevo. */
  players: WorldPlayer[];
  playerSeq: number;
  /** Los que quedaron libres este verano: alimentan el mercado de pases. */
  freeAgents: { player: WorldPlayer; fromClub: string }[];
  /** Noticias del verano (retiros y pases con nombre conocido), ya recortadas. */
  news: string[];
}

const levelClamp = (v: number) => Math.max(25, Math.min(92, Math.round(v)));

/** Con nombre en la liga: sus movimientos merecen noticia. */
function isNotable(p: WorldPlayer): boolean {
  return p.level >= 66 || (p.timesFaced ?? 0) >= 3 || p.prestige >= 70;
}

/**
 * El verano del mundo (Sprint 5): entre temporada y temporada las personas
 * siguen su vida — envejecen, mejoran o decaen, se retiran, cambian de club o
 * quedan libres. La rotación anual queda en ~10-20% del pool, con noticias
 * solo para los nombres que el usuario puede reconocer. Corre en
 * startPreseason, ANTES de armar el mercado: los libres de acá son fichables.
 */
export function evolveWorldOffseason(state: GameState, rng: Rng): OffseasonWorldResult {
  const finishedSeason = state.seasonNumber;
  const pool: WorldPlayer[] = structuredClone(state.world.players ?? []);
  const news: string[] = [];
  const freeAgents: { player: WorldPlayer; fromClub: string }[] = [];

  // Saves de antes de la persistencia: el club de cada uno se rescata de su
  // ficha de la temporada que cerró, y desde acá la persona queda anclada.
  const teamClub = new Map<string, string>();
  for (const t of state.world.teams) {
    const club = state.world.clubs.find((c) => c.id === t.clubId);
    if (club && !club.isUser) teamClub.set(t.id, club.name);
  }
  for (const p of pool) {
    if (p.clubName !== undefined) continue;
    const reg = state.world.registrations.find((r) => r.playerId === p.id && r.status === 'activa');
    const clubName = reg ? teamClub.get(reg.teamId) : undefined;
    if (clubName) {
      p.clubName = clubName;
      p.joinedSeason = p.joinedSeason ?? finishedSeason;
    }
  }

  const clubNames = [...new Set(pool.map((p) => p.clubName).filter((n): n is string => !!n))];
  const survivors: WorldPlayer[] = [];

  for (const p of pool) {
    p.injuryWeeks = 0;
    p.age += 1;
    // La curva de la edad: los pibes crecen, los grandes aguantan lo que pueden.
    if (p.age <= 24) p.level = levelClamp(p.level + rng.int(0, 4));
    else if (p.age <= 29) p.level = levelClamp(p.level + rng.int(-1, 2));
    else if (p.age <= 33) p.level = levelClamp(p.level + rng.int(-3, 1));
    else p.level = levelClamp(p.level - rng.int(1, 5));
    p.prestige = Math.max(10, Math.min(90, Math.round(p.prestige * 0.7 + p.level * 0.3)));

    // Retiros: la edad no perdona, y al que ya no rinde se le nota.
    const retireChance = p.age >= 40 ? 1 : p.age >= 36 ? 0.4 : p.age >= 33 && p.level < 48 ? 0.25 : 0;
    if (retireChance > 0 && rng.chance(retireChance)) {
      if (isNotable(p) && p.clubName) {
        news.push(
          `Se retira ${p.firstName} ${p.lastName} (${p.clubName}), a los ${p.age}. La liga pierde un nombre de los que se conocen.`
        );
      }
      continue;
    }

    // El libre que nadie fichó el verano pasado se acomoda solo, sin ruido.
    if (p.clubName === undefined) {
      if (clubNames.length > 0) {
        p.clubName = rng.pick(clubNames);
        p.joinedSeason = finishedSeason + 1;
      }
      survivors.push(p);
      continue;
    }

    // Pases y agentes libres: la rotación que hace que la T3 no sea la T1.
    const roll = rng.range(0, 1);
    if (roll < 0.04) {
      freeAgents.push({ player: p, fromClub: p.clubName });
      p.clubName = undefined;
      survivors.push(p);
      continue;
    }
    if (roll < 0.13 && clubNames.length > 1) {
      const from = p.clubName;
      const dest = rng.pick(clubNames.filter((n) => n !== from));
      p.clubName = dest;
      p.joinedSeason = finishedSeason + 1;
      if (isNotable(p)) news.push(`Pase del verano: ${p.firstName} ${p.lastName} deja ${from} y jugará en ${dest}.`);
      survivors.push(p);
      continue;
    }
    survivors.push(p);
  }

  // Los que se fueron del club del usuario no se evaporan: emigran al mundo,
  // y más de uno te lo vas a volver a cruzar con otra camiseta.
  for (const ex of state.players.filter((x) => x.leftClub)) {
    const wpId = `wp_x_${ex.id}`;
    if (survivors.some((p) => p.id === wpId)) continue;
    if (ex.age + 1 >= 35 || clubNames.length === 0 || !rng.chance(0.6)) continue;
    const dest = rng.pick(clubNames);
    const parts = ex.name.trim().split(' ');
    const lastName = parts.pop() ?? ex.name;
    const firstName = parts.join(' ') || lastName;
    survivors.push({
      id: wpId,
      firstName,
      lastName,
      age: ex.age + 1,
      position: ex.position,
      secondaryPositions: [],
      level: levelClamp(ex.technique),
      personality: ex.personality,
      commitment: ex.commitment,
      reliability: Math.max(40, Math.min(95, ex.commitment)),
      prestige: Math.max(10, Math.min(90, ex.technique + rng.int(-10, 10))),
      availability: genAvailability(ex.commitment, ex.commitment, rng),
      injuryWeeks: 0,
      clubName: dest,
      joinedSeason: finishedSeason + 1,
      timesFaced: 0,
      exUserClub: true,
    });
    news.push(`${ex.name}, que se fue del club, apareció con la camiseta de ${dest}. El básquet es un pañuelo.`);
  }

  // Los libres del mercado: mejor los reconocibles, y no más de un puñado.
  freeAgents.sort((a, b) => (isNotable(b.player) ? 1 : 0) - (isNotable(a.player) ? 1 : 0) || b.player.level - a.player.level);

  return {
    players: survivors,
    playerSeq: state.world.playerSeq ?? 1,
    freeAgents: freeAgents.slice(0, 6),
    news: news.slice(0, 6),
  };
}

export interface DivStandingRow {
  teamId: string;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

/**
 * Tabla simulada de una divisional que el usuario NO juega. Determinista por
 * temporada: arma un round-robin (método del círculo) y resuelve solo las
 * fechas ya jugadas (hasta upToWeek-1). No toca state.standings ni los playoffs.
 */
export function divisionStandings(
  world: WorldState,
  divisionId: string,
  upToWeek: number,
  seasonNumber: number
): DivStandingRow[] {
  const teams = world.entries
    .filter((e) => e.divisionId === divisionId && e.status === 'activa')
    .map((e) => world.teams.find((t) => t.id === e.teamId))
    .filter((t): t is Team => !!t);
  const strengthOf = (id: string) => {
    const t = teams.find((x) => x.id === id)!;
    return world.clubs.find((c) => c.id === t.clubId)?.sportPrestige ?? 50;
  };
  const rows: Record<string, DivStandingRow> = {};
  for (const t of teams) {
    rows[t.id] = { teamId: t.id, name: t.name, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
  }
  const n = teams.length;
  if (n >= 2) {
    const rng = new Rng(seedFromString(`div_${divisionId}_s${seasonNumber}`));
    const arr = teams.map((t) => t.id);
    for (let r = 0; r < n - 1 && r + 1 < upToWeek; r++) {
      for (let i = 0; i < n / 2; i++) {
        const homeId = arr[i];
        const awayId = arr[n - 1 - i];
        const sa = strengthOf(homeId);
        const sb = strengthOf(awayId);
        const homeWins = rng.chance(sa ** 2 / (sa ** 2 + sb ** 2));
        const winScore = rng.int(62, 88);
        const loseScore = winScore - rng.int(2, 20);
        const w = homeWins ? rows[homeId] : rows[awayId];
        const l = homeWins ? rows[awayId] : rows[homeId];
        w.wins += 1;
        l.losses += 1;
        w.pointsFor += winScore;
        w.pointsAgainst += loseScore;
        l.pointsFor += loseScore;
        l.pointsAgainst += winScore;
      }
      arr.splice(1, 0, arr.splice(n - 1, 1)[0]); // rotar dejando fijo arr[0]
    }
  }
  return Object.values(rows).sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst)
  );
}

/** Agrega al fixture un cruce de copa (playoffs) en la semana dada. */
export function addCupFixture(
  state: GameState,
  opts: { id: string; week: number; homeLegacyId: string; awayLegacyId: string; label: string }
): void {
  const world = state.world;
  const division = world.divisions.find((d) => d.id === state.divisionId)!;
  const homeTeam = opts.homeLegacyId === 'club' ? userTeam(world) : teamByLegacyRival(world, opts.homeLegacyId);
  const awayTeam = opts.awayLegacyId === 'club' ? userTeam(world) : teamByLegacyRival(world, opts.awayLegacyId);
  if (!homeTeam || !awayTeam) return;
  const isUserMatch = opts.homeLegacyId === 'club' || opts.awayLegacyId === 'club';
  world.fixtures.push({
    id: opts.id,
    seasonId: world.season.id,
    leagueId: USER_LEAGUE_ID,
    divisionId: state.divisionId,
    week: opts.week,
    date: fixtureDate(world.season.year, opts.week, division.gameDay),
    time: division.gameTimes[opts.week % division.gameTimes.length],
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    venueId: homeTeam.venueId,
    status: 'programado',
    isUserMatch,
    label: opts.label,
  });
}

// ---------- Disponibilidad y convocatoria rival ----------

/** Probabilidad de que un jugador del mundo esté para un partido dado. */
export function attendChance(p: WorldPlayer, division: Division, time: string): number {
  if (p.injuryWeeks > 0) return 0;
  let c = p.availability.baseChance;
  if (p.availability.blockedDays.includes(division.gameDay)) c *= 0.15;
  if (p.availability.onlyTimes.length > 0 && !p.availability.onlyTimes.includes(time)) c *= 0.35;
  if (p.availability.distanceKm > 50) c *= 0.5;
  return Math.max(0.02, Math.min(0.98, c));
}

/** Motivo legible por el que un jugador puede faltar. */
function absenceReason(p: WorldPlayer, division: Division): string {
  if (p.injuryWeeks > 0) return 'lesionado';
  if (p.availability.distanceKm > 50) return `vive en ${p.availability.residence}`;
  if (p.availability.blockedDays.includes(division.gameDay)) return `los ${dayLabel(division.gameDay)} no puede`;
  if (p.availability.onlyTimes.length > 0) return 'solo llega a los de 22:00';
  if (p.availability.baseChance < 0.6) return 'poco confiable';
  return 'compromiso de último momento';
}

export interface RivalMatchday {
  presentIds: string[];
  presentCount: number;
  /** Multiplicador de la fuerza rival según quiénes vinieron (0.85–1.06). */
  mod: number;
  notes: string[];
}

/** Sortea la convocatoria del rival de la semana: quiénes vienen y cuánto pesa. */
export function rollRivalMatchday(state: GameState, rivalLegacyId: string, rng: Rng): RivalMatchday {
  const world = state.world;
  const team = teamByLegacyRival(world, rivalLegacyId);
  const division = team ? divisionOfTeam(world, team.id) : undefined;
  if (!team || !division) return { presentIds: [], presentCount: 0, mod: 1, notes: [] };

  const fixture = userFixtureOfWeek(world, state.week);
  const time = fixture?.time ?? division.gameTimes[0];
  const roster = teamRoster(world, team.id).sort((a, b) => b.level - a.level);
  if (roster.length === 0) return { presentIds: [], presentCount: 0, mod: 1, notes: [] };

  const present = roster.filter((p) => rng.chance(attendChance(p, division, time)));
  const absent = roster.filter((p) => !present.some((x) => x.id === p.id));

  // Si no juntan cinco, rascan gente a último momento.
  const notes: string[] = [];
  while (present.length < 5 && absent.length > 0) {
    const p = absent.pop()!;
    present.push(p);
    notes.push(`${worldPlayerName(p)} apareció a último momento para que llegaran a cinco.`);
  }

  const topAvg = (list: WorldPlayer[]) => {
    const top = [...list].sort((a, b) => b.level - a.level).slice(0, 8);
    return top.length ? top.reduce((t, p) => t + p.level, 0) / top.length : 1;
  };
  // El recentrado compensa que los planteles con arquetipos se degradan menos
  // al faltar gente (ver BALANCE.world.rivalModRecenter).
  let mod = Math.max(0.85, Math.min(1.05, (topAvg(present) / topAvg(roster)) * BALANCE.world.rivalModRecenter));

  const star = roster[0];
  if (!present.some((p) => p.id === star.id)) {
    notes.unshift(`No vino su figura, ${worldPlayerName(star)} (${absenceReason(star, division)}).`);
  }
  if (present.length <= 6) notes.push(`Llegan cortos: ${present.length} jugadores en la planilla.`);
  const interiorGuest = present.find((p) => p.availability.distanceKm > 50 && p.level >= star.level - 6);
  if (interiorGuest) {
    notes.push(`${worldPlayerName(interiorGuest)} justo está en la ciudad y refuerza al rival.`);
    mod = Math.min(1.06, mod + 0.03);
  }

  return { presentIds: present.map((p) => p.id), presentCount: present.length, mod, notes };
}

// (El scouting del próximo rival vive en src/game/scouting.ts, con niveles de
// conocimiento e incertidumbre.)
