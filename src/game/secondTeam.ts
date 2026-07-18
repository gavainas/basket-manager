// Expansión del club (Mundo etapa 6): inscribir un segundo equipo en otra
// liga, compartiendo jugadores del plantel mediante la regla central de
// inscripción (una ficha activa por jugador + liga + temporada; una liga
// distinta habilita otra ficha). El torneo del segundo equipo se juega solo,
// una fecha por semana, y sus resultados dependen del plantel inscripto.
//
// Los partidos en vivo del segundo equipo (y el doble partido el mismo día)
// son la etapa 7: acá el cruce se resuelve como los demás partidos del mundo.

import { CLUB_COLORS, CRESTS, EXPANSION_DIVISION_TEAMS } from '../data/worldData';
import { DELEGATE_NAMES, NEIGHBORHOODS } from '../data/names';
import { BALANCE, clamp } from './balance';
import { fragilityOf, pickByFragility, rollInjuryWeeks } from './injuries';
import { playerEffective } from './match';
import { logClubEvent, logPlayerEvent } from './timeline';
import { registerPlayer, USER_CLUB_ID } from './world';
import { Rng, seedFromString } from './rng';
import type { GameState, League, Player, SecondTeamRow, SecondTeamState } from './types';

export const SECOND_TEAM_ID = 'tm_user2';

/** La liga donde compite el equipo principal no admite un segundo equipo (por ahora). */
export function expansionLeagues(state: GameState): League[] {
  const userLeagueId = state.world.entries.find((e) => e.teamId === 'tm_user' && e.status === 'activa')?.leagueId;
  return state.world.leagues.filter((l) => l.id !== userLeagueId);
}

export function eligibleForLeague(p: Player, league: League): boolean {
  return !p.leftClub && (league.minAge === undefined || p.age >= league.minAge);
}

export interface ExpansionCheck {
  ok: boolean;
  reason?: string;
  eligibleIds: string[];
  fee: number;
  divisionId: string | null;
  divisionName: string | null;
  gameDay: string | null;
}

/** Requisitos para inscribir un equipo en una liga: plata, fichas y cupo. */
export function checkExpansion(state: GameState, leagueId: string): ExpansionCheck {
  const E = BALANCE.expansion;
  const league = state.world.leagues.find((l) => l.id === leagueId);
  const division = state.world.divisions.find((d) => d.leagueId === leagueId);
  const eligibleIds = league
    ? state.players.filter((p) => eligibleForLeague(p, league)).map((p) => p.id)
    : [];
  const base = {
    eligibleIds,
    fee: E.inscriptionFee,
    divisionId: division?.id ?? null,
    divisionName: division?.name ?? null,
    gameDay: division?.gameDay ?? null,
  };
  if (!league || !division) return { ...base, ok: false, reason: 'La liga no abrió inscripciones.' };
  if (state.secondTeam) return { ...base, ok: false, reason: 'El club ya banca dos equipos: no da para un tercero.' };
  if (!EXPANSION_DIVISION_TEAMS[division.id])
    return { ...base, ok: false, reason: 'Esa divisional no tiene cupo esta temporada.' };
  if (eligibleIds.length < E.minPlayers)
    return {
      ...base,
      ok: false,
      reason: league.minAge
        ? `Hacen falta ${E.minPlayers} jugadores de ${league.minAge}+ y hay ${eligibleIds.length}.`
        : `Hacen falta al menos ${E.minPlayers} jugadores.`,
    };
  if (state.club.money < E.inscriptionFee)
    return { ...base, ok: false, reason: `La inscripción cuesta $${E.inscriptionFee} y no alcanza la caja.` };
  return { ...base, ok: true };
}

/**
 * Inscribe el segundo equipo: paga la ficha, materializa la divisional en el
 * mundo (clubes, equipos y fichas rivales) y registra a los jugadores elegidos.
 */
export function registerSecondTeam(state: GameState, leagueId: string, playerIds: string[]): GameState {
  const E = BALANCE.expansion;
  const check = checkExpansion(state, leagueId);
  if (!check.ok || !check.divisionId) return state;

  const s: GameState = structuredClone(state);
  const league = s.world.leagues.find((l) => l.id === leagueId)!;
  const division = s.world.divisions.find((d) => d.id === check.divisionId)!;
  const chosen = s.players.filter((p) => playerIds.includes(p.id) && eligibleForLeague(p, league));
  if (chosen.length < E.minPlayers) return state;

  const seasonId = s.world.season.id;
  const week = Math.min(s.week, s.seasonLength);
  const rng = new Rng(seedFromString(`exp_${leagueId}_s${s.seasonNumber}`));

  // La ficha se paga una vez por temporada.
  s.club.money -= E.inscriptionFee;
  s.ledger.push({ week: s.week, concept: `Inscripción del segundo equipo (${league.name})`, amount: -E.inscriptionFee });

  // El equipo del club en el mundo: mismo club, otra camiseta.
  const teamName = league.minAge ? `${s.club.name} +35` : `${s.club.name} "B"`;
  s.world.teams.push({
    id: SECOND_TEAM_ID,
    clubId: USER_CLUB_ID,
    name: teamName,
    category: league.minAge ? '+35' : 'mayores',
    status: 'activo',
    venueId: 'vn_user',
    delegate: 'vos',
  });
  s.world.entries.push({
    teamId: SECOND_TEAM_ID,
    leagueId,
    divisionId: division.id,
    seasonId,
    status: 'activa',
    fee: E.inscriptionFee,
    registeredWeek: week,
  });

  // Regla central: cada elegido saca ficha en esta liga (la de la Universitaria sigue viva).
  for (const p of chosen) {
    registerPlayer(s.world, { playerId: p.id, teamId: SECOND_TEAM_ID, leagueId, seasonId, week });
  }

  // Los rivales del torneo se materializan recién ahora (clubes navegables).
  const seeds = EXPANSION_DIVISION_TEAMS[division.id];
  const table: SecondTeamRow[] = [
    { teamId: SECOND_TEAM_ID, clubId: USER_CLUB_ID, name: teamName, strength: 0, wins: 0, losses: 0 },
  ];
  seeds.forEach((seed, i) => {
    const clubId = `cl_${seed.id}`;
    const teamId = `tm_${seed.id}`;
    if (!s.world.clubs.some((c) => c.id === clubId)) {
      const venueId = `vn_${seed.id}`;
      s.world.venues.push({
        id: venueId,
        name: `Gimnasio de ${seed.name.split(' ').slice(-1)[0]}`,
        neighborhood: NEIGHBORHOODS[(i + 2) % NEIGHBORHOODS.length],
      });
      s.world.clubs.push({
        id: clubId,
        name: seed.name,
        colors: CLUB_COLORS[(i + 5) % CLUB_COLORS.length],
        crest: CRESTS[(i + 5) % CRESTS.length],
        founded: s.world.season.year - rng.int(3, 50),
        sportPrestige: clamp(seed.strength + rng.int(-8, 8), 15, 90),
        socialPrestige: rng.int(30, 80),
      });
      s.world.teams.push({
        id: teamId,
        clubId,
        name: seed.name,
        category: league.minAge ? '+35' : 'mayores',
        status: 'activo',
        venueId,
        delegate: DELEGATE_NAMES[(i + 2) % DELEGATE_NAMES.length],
      });
      s.world.entries.push({
        teamId,
        leagueId,
        divisionId: division.id,
        seasonId,
        status: 'activa',
        fee: E.inscriptionFee,
        registeredWeek: week,
      });
    }
    table.push({ teamId, clubId, name: seed.name, strength: seed.strength, wins: 0, losses: 0 });
  });

  s.secondTeam = {
    leagueId,
    divisionId: division.id,
    teamId: SECOND_TEAM_ID,
    name: teamName,
    playerIds: chosen.map((p) => p.id),
    table,
    round: 0,
    lastResult: null,
    finished: false,
  };

  s.club.socialPrestige = clamp(s.club.socialPrestige + E.socialPrestigeOnRegister);
  s.news.unshift({
    week: s.week,
    text: `El club inscribió un segundo equipo: ${teamName} jugará en ${league.name} · ${division.name} (los ${division.gameDay}).`,
    tone: 'good',
  });
  logClubEvent(s, 'hito', `El club se expande: ${teamName} se inscribe en ${league.name} con ${chosen.length} fichas.`);
  for (const p of chosen) {
    logPlayerEvent(p, s.seasonNumber, week, 'hito', `Sacó ficha en ${league.name} con ${teamName}: doble camiseta del club.`);
  }
  return s;
}

/** Fuerza actual del segundo equipo: el promedio de sus mejores fichas disponibles. */
export function secondTeamStrength(state: GameState, st: SecondTeamState): number {
  const roster = state.players
    .filter((p) => st.playerIds.includes(p.id) && !p.leftClub && p.status !== 'lesionado')
    .sort((a, b) => playerEffective(b) - playerEffective(a))
    .slice(0, 6);
  if (roster.length === 0) return 20;
  const avg = roster.reduce((t, p) => t + playerEffective(p), 0) / roster.length;
  // Con menos de 6 en condiciones, el equipo sale remendado.
  return Math.max(20, avg * (roster.length < 6 ? 0.85 : 1));
}

/** Posición del club en la tabla del torneo (1 = primero). */
export function secondTeamPosition(st: SecondTeamState): number {
  const sorted = [...st.table].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
  return sorted.findIndex((r) => r.teamId === SECOND_TEAM_ID) + 1;
}

/**
 * Fecha semanal del torneo del segundo equipo. Muta el estado (ya clonado):
 * resultado, tabla, plata, desgaste y humor de los que fueron a jugar.
 */
export function secondTeamWeeklyTick(s: GameState, rng: Rng): void {
  const st = s.secondTeam;
  if (!st || st.finished) return;
  const E = BALANCE.expansion;
  const league = s.world.leagues.find((l) => l.id === st.leagueId);
  const leagueName = league?.name ?? 'la otra liga';

  // Mantener el equipo cuesta; la cantina devuelve una parte.
  s.club.money -= E.weeklyUpkeep - E.canteenIncome;
  s.ledger.push({
    week: s.week,
    concept: 'Segundo equipo: cancha y árbitros (neto de cantina)',
    amount: -(E.weeklyUpkeep - E.canteenIncome),
  });

  // Fichas de los que dejaron el club se dan de baja (regla central al día).
  for (const r of s.world.registrations) {
    if (r.teamId !== SECOND_TEAM_ID || r.status !== 'activa') continue;
    const p = s.players.find((x) => x.id === r.playerId);
    if (p?.leftClub) {
      r.status = 'baja';
      r.endWeek = Math.min(s.week, s.seasonLength);
    }
  }

  const opponents = st.table.filter((r) => r.teamId !== SECOND_TEAM_ID);
  const rival = opponents[st.round % opponents.length];
  st.round += 1;

  // Quiénes van: fichados sanos, con la vida de por medio.
  const available = s.players.filter(
    (p) =>
      st.playerIds.includes(p.id) && !p.leftClub && p.status !== 'lesionado' && rng.chance(0.85)
  );

  const userRow = st.table.find((r) => r.teamId === SECOND_TEAM_ID)!;
  if (available.length < 5) {
    userRow.losses += 1;
    rival.wins += 1;
    st.lastResult = `Fecha ${st.round}: no juntamos cinco y perdimos los puntos vs ${rival.name}.`;
    s.news.unshift({ week: s.week, text: `${st.name}: forfeit vs ${rival.name} — no llegaron a cinco.`, tone: 'bad' });
  } else {
    const our = secondTeamStrength(s, st) * rng.range(0.9, 1.1);
    const theirs = rival.strength * rng.range(0.9, 1.1);
    const won = rng.chance(our ** 2 / (our ** 2 + theirs ** 2));
    const winScore = rng.int(58, 84);
    const loseScore = winScore - rng.int(2, 18);
    const scoreFor = won ? winScore : loseScore;
    const scoreAgainst = won ? loseScore : winScore;
    if (won) {
      userRow.wins += 1;
      rival.losses += 1;
    } else {
      userRow.losses += 1;
      rival.wins += 1;
    }
    st.lastResult = `Fecha ${st.round}: ${won ? 'victoria' : 'derrota'} ${scoreFor}-${scoreAgainst} vs ${rival.name}.`;
    s.news.unshift({
      week: s.week,
      text: `${st.name} (${leagueName}): ${won ? 'victoria' : 'derrota'} ${scoreFor}-${scoreAgainst} vs ${rival.name}.`,
      tone: won ? 'good' : 'bad',
    });

    // Jugar en el otro torneo desgasta, pero a los relegados los enchufa.
    const played = available.sort((a, b) => playerEffective(b) - playerEffective(a)).slice(0, 8);
    for (const p of played) {
      p.physical = clamp(p.physical - E.playWear);
      const isMainStarter = s.starters.includes(p.id);
      p.motivation = clamp(p.motivation + (isMainStarter ? E.starterMotivation : E.benchMotivation));
    }
    // Y a veces alguien vuelve tocado (los frágiles, más seguido).
    if (played.length > 0 && rng.chance(E.injuryChance)) {
      const injured = pickByFragility(played, rng);
      const weeks = rollInjuryWeeks(fragilityOf(injured), rng);
      injured.status = 'lesionado';
      injured.injuryWeeks = Math.max(injured.injuryWeeks, weeks);
      logPlayerEvent(injured, s.seasonNumber, Math.min(s.week, s.seasonLength), 'lesion', `Se lesionó jugando para ${st.name}: ${weeks} semana${weeks > 1 ? 's' : ''} afuera.`);
      s.news.unshift({
        week: s.week,
        text: `${injured.name} se lesionó jugando para ${st.name}: ${weeks} semana${weeks > 1 ? 's' : ''} afuera (también del primero).`,
        tone: 'bad',
      });
    }
  }

  // El resto de la fecha: los demás se cruzan entre sí.
  const rest = rng.shuffle(opponents.filter((r) => r.teamId !== rival.teamId));
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const a = rest[i];
    const b = rest[i + 1];
    const aWins = rng.chance(a.strength ** 2 / (a.strength ** 2 + b.strength ** 2));
    (aWins ? a : b).wins += 1;
    (aWins ? b : a).losses += 1;
  }

  // Rueda completa: el torneo cierra y se rinde cuentas.
  if (st.round >= opponents.length) {
    st.finished = true;
    const pos = secondTeamPosition(st);
    const podium = pos <= 3;
    if (podium) s.club.sportPrestige = clamp(s.club.sportPrestige + E.topFinishPrestige);
    s.news.unshift({
      week: s.week,
      text:
        pos === 1
          ? `¡${st.name} salió campeón de su torneo en ${leagueName}! El club festeja en las dos ligas.`
          : `${st.name} terminó ${pos}° en su torneo de ${leagueName}${podium ? ': podio que suma prestigio' : ''}.`,
      tone: podium ? 'good' : 'neutral',
    });
    logClubEvent(
      s,
      'hito',
      pos === 1
        ? `${st.name} se consagró campeón de ${leagueName} en su primera incursión.`
        : `${st.name} cerró su torneo de ${leagueName} en la ${pos}° posición.`
    );
    if (pos === 1) s.memorableMoments.push(`Semana ${s.week}: ${st.name} campeón de ${leagueName}.`);
  }
}
