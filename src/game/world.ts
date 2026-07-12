// El mundo del juego: ligas, divisionales, clubes, equipos, jugadores rivales,
// inscripciones y fixture. Es una capa modular sobre el juego clásico: los
// sistemas existentes (rivals/schedule/standings) siguen mandando en el partido
// del usuario, y el mundo los espeja con entidades completas.

import { CLUB_COLORS, CRESTS, DIVISIONS, LEAGUES, USER_DIVISION_ID, USER_LEAGUE_ID } from '../data/worldData';
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
  WorldFixture,
  WorldPlayer,
  WorldState,
} from './types';

const USER_CLUB_ID = 'cl_user';
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

/** Mantiene las fichas del plantel del usuario al día (altas y bajas). */
export function syncUserRegistrations(state: GameState): void {
  const world = state.world;
  const seasonId = world.season.id;
  for (const p of state.players) {
    if (p.leftClub) continue;
    registerPlayer(world, {
      playerId: p.id,
      teamId: USER_TEAM_ID,
      leagueId: USER_LEAGUE_ID,
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
  };
}

const RIVAL_PERSONALITIES: Personality[] = [
  'competitivo', 'social', 'protagonista', 'leal', 'mercenario', 'cumplidor', 'veterano', 'talentoso_informal',
];

const ROSTER_TEMPLATE: Position[] = [
  'Base', 'Base', 'Escolta', 'Escolta', 'Alero', 'Alero', 'Alero', 'Ala-Pívot', 'Ala-Pívot', 'Pívot', 'Pívot', 'Escolta',
];

const BLOCKABLE_DAYS: WeekDay[] = ['lunes', 'martes', 'jueves', 'viernes'];

function genAvailability(commitment: number, reliability: number, rng: Rng): AvailabilityProfile {
  const interior = rng.chance(0.08);
  const res = interior ? rng.pick(INTERIOR_CITIES) : { city: 'Montevideo', km: 0 };
  const blockedDays: WeekDay[] = rng.chance(0.2) ? [rng.pick(BLOCKABLE_DAYS)] : [];
  const onlyTimes = rng.chance(0.15) ? ['22:00'] : [];
  const baseChance = Math.max(0.25, Math.min(0.97, 0.5 + reliability * 0.004 + commitment * 0.0015 + rng.range(-0.05, 0.05)));
  const lateChance = Math.min(0.5, (100 - reliability) * 0.004);

  const notes: string[] = [];
  if (interior) notes.push(`Vive en ${res.city} (${res.km} km): viene cuando puede.`);
  for (const d of blockedDays) notes.push(`Los ${d} no puede: compromiso fijo.`);
  if (onlyTimes.length > 0) notes.push('Por el trabajo solo llega a los partidos de 22:00.');
  if (lateChance > 0.25) notes.push('Suele llegar sobre la hora, a veces empezado el partido.');
  if (notes.length === 0 && baseChance > 0.85) notes.push('De los que están siempre: confirma temprano y no falla.');

  return { baseChance, blockedDays, onlyTimes, lateChance, residence: res.city, distanceKm: res.km, notes };
}

function genRoster(teamIdx: number, strength: number, rng: Rng): WorldPlayer[] {
  const roster: WorldPlayer[] = [];
  const used = new Set<string>();
  ROSTER_TEMPLATE.forEach((position, i) => {
    let first = rng.pick(FIRST_NAMES);
    let last = rng.pick(LAST_NAMES);
    for (let guard = 0; used.has(`${first} ${last}`) && guard < 10; guard++) {
      first = rng.pick(FIRST_NAMES);
      last = rng.pick(LAST_NAMES);
    }
    used.add(`${first} ${last}`);
    const isStar = i === 0;
    const level = Math.max(30, Math.min(92, Math.round(strength + (isStar ? rng.int(6, 14) : rng.int(-14, 8)))));
    const commitment = rng.int(35, 95);
    const reliability = rng.int(40, 95);
    roster.push({
      id: `wp_t${teamIdx}_${i}`,
      firstName: first,
      lastName: last,
      age: rng.int(19, 38),
      position,
      secondaryPositions: rng.chance(0.35) ? [rng.pick(ROSTER_TEMPLATE.filter((p) => p !== position))] : [],
      level,
      personality: rng.pick(RIVAL_PERSONALITIES),
      commitment,
      reliability,
      prestige: Math.max(10, Math.min(90, level + rng.int(-15, 10))),
      availability: genAvailability(commitment, reliability, rng),
      injuryWeeks: 0,
    });
  });
  return roster;
}

/**
 * Construye el mundo a partir del estado clásico (rivals + schedule).
 * Determinista para una misma semilla; se rearma en cada temporada nueva.
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
  const division = DIVISIONS.find((d) => d.id === USER_DIVISION_ID)!;

  // Club y equipo del usuario.
  world.venues.push({ id: 'vn_user', name: 'Gimnasio del Parque', neighborhood: 'Parque Batlle' });
  world.clubs.push({ id: USER_CLUB_ID, name: state.club.name, colors: CLUB_COLORS[0], crest: '🏀', isUser: true });
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

  // Clubes y equipos rivales (uno por rival del sistema clásico).
  state.rivals.forEach((rival, i) => {
    const clubId = `cl_${rival.id}`;
    const teamId = `tm_${rival.id}`;
    const venueId = `vn_${rival.id}`;
    world.venues.push({
      id: venueId,
      name: `Gimnasio de ${rival.name.split(' ').slice(-1)[0]}`,
      neighborhood: NEIGHBORHOODS[i % NEIGHBORHOODS.length],
    });
    world.clubs.push({ id: clubId, name: rival.name, colors: CLUB_COLORS[(i + 1) % CLUB_COLORS.length], crest: CRESTS[(i + 1) % CRESTS.length] });
    world.teams.push({
      id: teamId,
      clubId,
      name: rival.name,
      category: 'mayores',
      status: 'activo',
      venueId,
      delegate: DELEGATE_NAMES[i % DELEGATE_NAMES.length],
      legacyRivalId: rival.id,
    });

    const roster = genRoster(i + 1, rival.strength, rng);
    world.players.push(...roster);
    for (const p of roster) {
      registerPlayer(world, { playerId: p.id, teamId, leagueId: USER_LEAGUE_ID, seasonId, week: 0 });
    }
  });

  // Inscripciones de los equipos en la divisional activa.
  for (const t of world.teams) {
    world.entries.push({
      teamId: t.id,
      leagueId: USER_LEAGUE_ID,
      divisionId: USER_DIVISION_ID,
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
      leagueId: USER_LEAGUE_ID,
      divisionId: USER_DIVISION_ID,
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
        leagueId: USER_LEAGUE_ID,
        divisionId: USER_DIVISION_ID,
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

  // Fichas del plantel del usuario (regla central incluida).
  const tempState = { ...state, world };
  syncUserRegistrations(tempState);

  return world;
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
  if (p.availability.blockedDays.includes(division.gameDay)) return `los ${division.gameDay} no puede`;
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
  let mod = Math.max(0.85, Math.min(1.05, topAvg(present) / topAvg(roster)));

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

// ---------- Scouting del próximo rival ----------

export interface ScoutEntry {
  playerId: string;
  name: string;
  position: Position;
  detail: string;
}

export interface ScoutReport {
  teamId: string;
  rivalName: string;
  probable: ScoutEntry[];
  doubtful: ScoutEntry[];
  out: ScoutEntry[];
}

/**
 * Informe del próximo rival con incertidumbre: es un pronóstico estable dentro
 * de la semana, pero independiente del sorteo real del día del partido.
 */
export function scoutNextRival(state: GameState): ScoutReport | null {
  const world = state.world;
  if (state.week > state.seasonLength) return null;
  const rivalId = state.schedule[state.week - 1];
  const rival = state.rivals.find((r) => r.id === rivalId);
  const team = teamByLegacyRival(world, rivalId);
  const division = team ? divisionOfTeam(world, team.id) : undefined;
  if (!rival || !team || !division) return null;

  const fixture = userFixtureOfWeek(world, state.week);
  const time = fixture?.time ?? division.gameTimes[0];
  const rng = new Rng(seedFromString(`scout_${world.season.id}_w${state.week}`));
  const roster = teamRoster(world, team.id).sort((a, b) => b.level - a.level);

  const report: ScoutReport = { teamId: team.id, rivalName: rival.name, probable: [], doubtful: [], out: [] };
  for (const p of roster) {
    const entryBase = { playerId: p.id, name: worldPlayerName(p), position: p.position };
    if (p.injuryWeeks > 0) {
      report.out.push({ ...entryBase, detail: 'lesionado' });
      continue;
    }
    const perceived = attendChance(p, division, time) + rng.range(-0.15, 0.15);
    if (perceived >= 0.7) report.probable.push({ ...entryBase, detail: `nivel ≈${p.level}` });
    else if (perceived >= 0.3) report.doubtful.push({ ...entryBase, detail: absenceReason(p, division) });
    else report.out.push({ ...entryBase, detail: absenceReason(p, division) });
  }
  return report;
}
