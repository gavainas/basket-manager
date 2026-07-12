// Playoffs de la divisional: al cierre de la fase regular (9 fechas), del 1°
// al 4° juegan la Copa de Oro y del 5° al 8° la Copa de Plata (semifinales en
// la fecha 10, finales en la 11). Los dos últimos se van a casa. Si el usuario
// no clasifica, las copas se simulan igual: el mundo sigue jugando.

import { clamp } from './balance';
import { logClubEvent, logPlayerEvent } from './timeline';
import { addCupFixture } from './world';
import type { CupTier, GameState, PlayoffTie } from './types';
import type { Rng } from './rng';

export const CUP_LABELS: Record<CupTier, string> = { oro: 'Copa de Oro', plata: 'Copa de Plata' };

/** Ids clásicos ('club' / rivalId) ordenados por la tabla de la fase regular. */
export function seedingOrder(state: GameState): string[] {
  return [...state.standings]
    .sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
    .map((r) => r.teamId);
}

export function legacyTeamName(state: GameState, legacyId: string): string {
  return legacyId === 'club' ? state.club.name : state.rivals.find((r) => r.id === legacyId)?.name ?? legacyId;
}

function tieOpponent(tie: PlayoffTie): string {
  return tie.homeId === 'club' ? tie.awayId : tie.homeId;
}

/** Simula un cruce entre rivales (sin el usuario) y asienta el resultado. */
function simulateTie(s: GameState, tie: PlayoffTie, rng: Rng): void {
  const a = s.rivals.find((r) => r.id === tie.homeId)!;
  const b = s.rivals.find((r) => r.id === tie.awayId)!;
  const pa = a.strength ** 2 / (a.strength ** 2 + b.strength ** 2);
  const aWins = rng.chance(pa);
  const winScore = rng.int(66, 92);
  const loseScore = winScore - rng.int(2, 18);
  tie.scoreHome = aWins ? winScore : loseScore;
  tie.scoreAway = aWins ? loseScore : winScore;
  tie.winnerId = aWins ? tie.homeId : tie.awayId;
  syncTieFixture(s, tie);
}

/** Copia el resultado del cruce al fixture del mundo (para la Agenda). */
function syncTieFixture(s: GameState, tie: PlayoffTie): void {
  const fx = s.world.fixtures.find((f) => f.id === `fx_${tie.id}`);
  if (!fx || tie.scoreHome === undefined) return;
  fx.status = 'jugado';
  fx.scoreHome = tie.scoreHome;
  fx.scoreAway = tie.scoreAway;
}

/** Toma el resultado del partido jugado por el usuario y lo asienta en su cruce. */
function fillUserTie(s: GameState, tie: PlayoffTie): void {
  const m = s.history.find((x) => x.week === tie.week);
  if (!m) return;
  const userHome = tie.homeId === 'club';
  tie.scoreHome = userHome ? m.scoreFor : m.scoreAgainst;
  tie.scoreAway = userHome ? m.scoreAgainst : m.scoreFor;
  tie.winnerId = m.won ? 'club' : tieOpponent(tie);
  syncTieFixture(s, tie);
}

function buildPlayoffs(s: GameState, rng: Rng): void {
  const order = seedingOrder(s);
  const semiWeek = s.seasonLength + 1;
  const defs: Omit<PlayoffTie, 'isUserMatch'>[] = [
    { id: 'oro_sf1', cup: 'oro', round: 'semifinal', week: semiWeek, homeId: order[0], awayId: order[3] },
    { id: 'oro_sf2', cup: 'oro', round: 'semifinal', week: semiWeek, homeId: order[1], awayId: order[2] },
    { id: 'plata_sf1', cup: 'plata', round: 'semifinal', week: semiWeek, homeId: order[4], awayId: order[7] },
    { id: 'plata_sf2', cup: 'plata', round: 'semifinal', week: semiWeek, homeId: order[5], awayId: order[6] },
  ];
  const ties: PlayoffTie[] = defs.map((t) => ({ ...t, isUserMatch: t.homeId === 'club' || t.awayId === 'club' }));

  const userTie = ties.find((t) => t.isUserMatch);
  s.playoffs = {
    qualified: !!userTie,
    userCup: userTie?.cup ?? null,
    ties,
    champions: {},
  };

  for (const t of ties) {
    addCupFixture(s, {
      id: `fx_${t.id}`,
      week: t.week,
      homeLegacyId: t.homeId,
      awayLegacyId: t.awayId,
      label: `Semifinal · ${CUP_LABELS[t.cup]}`,
    });
  }

  if (order[0] === 'club') {
    logClubEvent(s, 'hito', 'Terminamos primeros la fase regular.', s.seasonLength);
  }
  if (userTie) {
    const rivalName = legacyTeamName(s, tieOpponent(userTie));
    logClubEvent(s, 'hito', `Clasificados a la ${CUP_LABELS[userTie.cup]}: semifinal contra ${rivalName}.`, s.seasonLength);
    s.news.unshift({
      week: s.seasonLength,
      text: `¡Clasificamos a la ${CUP_LABELS[userTie.cup]}! Semifinal contra ${rivalName}.`,
      tone: 'good',
    });
    rng.next();
  } else {
    s.news.unshift({
      week: s.seasonLength,
      text: 'No clasificamos a los playoffs. Las copas se juegan sin nosotros.',
      tone: 'bad',
    });
  }
}

/** Arma la final de una copa a partir de sus semifinales resueltas. */
function buildFinal(s: GameState, cup: CupTier): PlayoffTie | null {
  const P = s.playoffs!;
  const semis = P.ties.filter((t) => t.cup === cup && t.round === 'semifinal');
  if (semis.some((t) => !t.winnerId)) return null;
  const finalWeek = s.seasonLength + 2;
  const tie: PlayoffTie = {
    id: `${cup}_final`,
    cup,
    round: 'final',
    week: finalWeek,
    homeId: semis[0].winnerId!,
    awayId: semis[1].winnerId!,
    isUserMatch: semis[0].winnerId === 'club' || semis[1].winnerId === 'club',
  };
  P.ties.push(tie);
  addCupFixture(s, {
    id: `fx_${tie.id}`,
    week: finalWeek,
    homeLegacyId: tie.homeId,
    awayLegacyId: tie.awayId,
    label: `Final · ${CUP_LABELS[cup]}`,
  });
  return tie;
}

/** Cierra las copas: campeones, prestigio, noticias e hitos. */
function closeCups(s: GameState): void {
  const P = s.playoffs!;
  for (const cup of ['oro', 'plata'] as CupTier[]) {
    const final = P.ties.find((t) => t.cup === cup && t.round === 'final');
    if (!final?.winnerId) continue;
    P.champions[cup] = final.winnerId;
    const champName = legacyTeamName(s, final.winnerId);
    if (final.winnerId === 'club') {
      const boost = cup === 'oro' ? 6 : 3;
      s.club.sportPrestige = clamp(s.club.sportPrestige + boost);
      s.club.socialClimate = clamp(s.club.socialClimate + boost);
      logClubEvent(s, 'hito', `¡Campeones de la ${CUP_LABELS[cup]}!`, final.week);
      s.memorableMoments.push(`¡Campeones de la ${CUP_LABELS[cup]} de la temporada ${s.seasonNumber}!`);
      for (const p of s.players) {
        if (!p.leftClub) logPlayerEvent(p, s.seasonNumber, final.week, 'hito', `¡Campeón de la ${CUP_LABELS[cup]} con el club!`);
      }
      s.news.unshift({ week: final.week, text: `¡CAMPEONES de la ${CUP_LABELS[cup]}!`, tone: 'good' });
    } else if (final.isUserMatch) {
      s.club.sportPrestige = clamp(s.club.sportPrestige + 2);
      logClubEvent(s, 'hito', `Subcampeones de la ${CUP_LABELS[cup]}: la final se escapó.`, final.week);
      s.news.unshift({ week: final.week, text: `Perdimos la final de la ${CUP_LABELS[cup]}. Dolió.`, tone: 'bad' });
    } else {
      s.news.unshift({ week: final.week, text: `${champName} se quedó con la ${CUP_LABELS[cup]}.`, tone: 'neutral' });
    }
  }
}

/**
 * Avanza los playoffs al entrar a una semana posterior a la fase regular.
 * Devuelve true si el usuario tiene partido esta semana (la temporada sigue).
 */
export function advancePlayoffs(s: GameState, rng: Rng): boolean {
  const semiWeek = s.seasonLength + 1;
  const finalWeek = s.seasonLength + 2;

  if (!s.playoffs) {
    buildPlayoffs(s, rng);
    const P = s.playoffs!;
    const userTie = P.ties.find((t) => t.isUserMatch);
    if (userTie) {
      s.schedule[semiWeek - 1] = tieOpponent(userTie);
      return true;
    }
    // Sin el usuario: se simula todo de una y la temporada termina.
    for (const t of P.ties.filter((x) => x.round === 'semifinal')) simulateTie(s, t, rng);
    for (const cup of ['oro', 'plata'] as CupTier[]) {
      const final = buildFinal(s, cup);
      if (final) simulateTie(s, final, rng);
    }
    closeCups(s);
    return false;
  }

  const P = s.playoffs;

  if (s.week === finalWeek) {
    // Se jugaron las semis: la del usuario sale del historial, el resto se simula.
    for (const t of P.ties.filter((x) => x.round === 'semifinal')) {
      if (t.isUserMatch) fillUserTie(s, t);
      else if (!t.winnerId) simulateTie(s, t, rng);
    }
    const finals = (['oro', 'plata'] as CupTier[])
      .map((cup) => buildFinal(s, cup))
      .filter((t): t is PlayoffTie => t !== null);

    const userFinal = finals.find((t) => t.isUserMatch);
    if (userFinal) {
      s.schedule[finalWeek - 1] = tieOpponent(userFinal);
      const rivalName = legacyTeamName(s, tieOpponent(userFinal));
      logClubEvent(s, 'hito', `¡A la final de la ${CUP_LABELS[userFinal.cup]} contra ${rivalName}!`, semiWeek);
      s.news.unshift({ week: semiWeek, text: `¡Estamos en la final de la ${CUP_LABELS[userFinal.cup]}! Rival: ${rivalName}.`, tone: 'good' });
      // La otra final se simula ya, para que la agenda la muestre resuelta.
      for (const f of finals) if (!f.isUserMatch) simulateTie(s, f, rng);
      return true;
    }
    // Eliminados en semis: se simulan las finales y se cierra.
    if (P.userCup) {
      logClubEvent(s, 'animo', `Quedamos afuera en la semifinal de la ${CUP_LABELS[P.userCup]}.`, semiWeek);
      s.news.unshift({ week: semiWeek, text: `Nos quedamos afuera en semis de la ${CUP_LABELS[P.userCup]}.`, tone: 'bad' });
    }
    for (const f of finals) simulateTie(s, f, rng);
    closeCups(s);
    return false;
  }

  // Final del usuario jugada: cerrar todo.
  const userFinal = P.ties.find((t) => t.round === 'final' && t.isUserMatch);
  if (userFinal && !userFinal.winnerId) fillUserTie(s, userFinal);
  for (const t of P.ties) {
    if (!t.winnerId) simulateTie(s, t, rng);
  }
  closeCups(s);
  return false;
}
