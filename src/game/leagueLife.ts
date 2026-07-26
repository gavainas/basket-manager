// La liga viva: árbitros con nombre y fama, rivalidades que se arman solas
// y noticias de la fecha. Casi todo se deriva de lo que ya se simula; acá
// solo se le pone nombre, memoria y voz.

import { clamp } from './balance';
import { logClubEvent } from './timeline';
import { teamByLegacyRival, teamRoster, worldPlayerName } from './world';
import type { GameState } from './types';
import type { Rng } from './rng';

/** Hash simple y estable a [0, 1). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// ---------- Árbitros ----------

export type RefStyle = 'estricto' | 'permisivo' | 'casero' | 'protagonista';

export interface Referee {
  name: string;
  style: RefStyle;
  /** Cómo lo describe la liga (para la previa). */
  blurb: string;
}

const REFEREES: Referee[] = [
  { name: 'Suárez', style: 'estricto', blurb: 'cortito con las protestas: la técnica sale fácil' },
  { name: 'la Colo Ramírez', style: 'estricto', blurb: 'reglamento en mano, no negocia nada' },
  { name: 'el Flaco Medina', style: 'permisivo', blurb: 'deja jugar hasta que corre sangre' },
  { name: 'Tito Álvarez', style: 'permisivo', blurb: 'silba lo justo y quiere irse temprano' },
  { name: 'Cacho Ferreira', style: 'casero', blurb: 'dicen que el local nunca pierde con él' },
  { name: 'Barreto', style: 'protagonista', blurb: 'le encanta ser noticia: partido cortado seguro' },
];

/** El árbitro de la fecha: determinista, se anuncia en la previa y no cambia. */
export function refereeOfWeek(s: GameState): Referee {
  const idx = Math.floor(hash01(`ref|${s.seasonNumber}|${s.week}`) * REFEREES.length);
  return REFEREES[idx];
}

/** Multiplicador de incidencias arbitrales según el estilo del juez. */
export function refIncidentFactor(style: RefStyle | undefined): number {
  switch (style) {
    case 'estricto': return 1.35;
    case 'protagonista': return 1.5;
    case 'permisivo': return 0.55;
    default: return 1;
  }
}

// ---------- Rivalidades ----------

export interface Rivalry {
  rivalId: string;
  /** Cuántas veces nos ganaron (más la espina del año pasado, si aplica). */
  heat: number;
  /** Para la previa: por qué este partido pica. */
  text: string;
}

/** ¿Este rival se ganó una previa caliente? Se arma solo con la historia. */
export function rivalryWith(s: GameState, rivalId: string): Rivalry | null {
  const meetings = s.history.filter((m) => m.rivalId === rivalId);
  const losses = meetings.filter((m) => !m.won);
  const paliza = losses.some((m) => m.scoreAgainst - m.scoreFor >= 15);
  const nemesis = s.nemesis && s.nemesis.rivalId === rivalId;

  if (nemesis && losses.length === 0) {
    return { rivalId, heat: 2, text: `Espina clavada: ${s.nemesis!.reason}. El grupo no se olvidó.` };
  }
  if (losses.length >= 2) {
    return { rivalId, heat: losses.length + (nemesis ? 1 : 0), text: 'Nos ganaron las dos veces que nos cruzamos. El vestuario quiere revancha ya.' };
  }
  if (losses.length === 1 && meetings.length >= 1) {
    return {
      rivalId,
      heat: 1 + (paliza ? 1 : 0) + (nemesis ? 1 : 0),
      text: paliza
        ? `La última vez nos pasaron por arriba (${losses[0].scoreFor}-${losses[0].scoreAgainst}). Nadie se olvidó de ese viaje de vuelta.`
        : `Nos ganaron en el cruce anterior (${losses[0].scoreFor}-${losses[0].scoreAgainst}). Hay revancha en el aire.`,
    };
  }
  return null;
}

/** Al ganarle a un rival con historia: la espina se saca y el club lo celebra. */
export function settleRivalryAfterMatch(s: GameState): void {
  const m = s.lastMatch;
  if (!m || m.forfeit) return;
  const riv = rivalryWith(s, m.rivalId);
  const wasNemesis = s.nemesis?.rivalId === m.rivalId;
  if (!riv && !wasNemesis) return;

  if (m.won) {
    s.club.sportPrestige = clamp(s.club.sportPrestige + 2);
    s.memorableMoments.push(`Semana ${s.week}: nos sacamos la espina contra ${m.rivalName} (${m.scoreFor}-${m.scoreAgainst}).`);
    logClubEvent(s, 'partido', `Revancha cumplida ante ${m.rivalName}: ${m.scoreFor}-${m.scoreAgainst}.`, Math.min(s.week, s.seasonLength));
    s.news.unshift({ week: s.week, text: `Nos sacamos la espina: le ganamos a ${m.rivalName} y el vestuario lo gritó como un título.`, tone: 'good' });
    if (wasNemesis) s.nemesis = null;
  } else if (riv && riv.heat >= 2) {
    s.news.unshift({ week: s.week, text: `Otra vez ${m.rivalName}. En el grupo ya ni cargadas quedan: bronca en serio.`, tone: 'bad' });
  }
}

// ---------- Noticias de la fecha ----------

export interface OtherResult {
  winnerName: string;
  loserName: string;
  winnerLegacyId: string;
  winnerTeamId?: string;
  winScore: number;
  loseScore: number;
  /** Probabilidad previa de que ganara el que ganó (para detectar batacazos). */
  winnerOdds: number;
}

/**
 * 1-2 noticias por fecha con lo que la simulación ya calculó y nunca contaba:
 * batacazos, goleadas y alguna figura inventada con nombre real del mundo.
 */
export function leagueNewsForWeek(s: GameState, results: OtherResult[], rng: Rng): void {
  if (results.length === 0) return;
  const news: { text: string; tone: 'good' | 'bad' | 'neutral'; prio: number }[] = [];

  const upset = results.filter((r) => r.winnerOdds < 0.38).sort((a, b) => a.winnerOdds - b.winnerOdds)[0];
  if (upset) {
    const loserRow = s.standings.find((row) => row.teamId !== 'club' && legacyName(s, row.teamId) === upset.loserName);
    const position = loserRow ? s.standings.filter((r) => r.wins > loserRow.wins).length + 1 : 0;
    news.push({
      prio: 3,
      tone: 'neutral',
      text:
        position > 0 && position <= 2
          ? `📰 Batacazo de la fecha: ${upset.winnerName} bajó a ${upset.loserName}, que venía arriba (${upset.winScore}-${upset.loseScore}).`
          : `📰 Sorpresa de la fecha: ${upset.winnerName} le ganó a ${upset.loserName} ${upset.winScore}-${upset.loseScore}. Nadie lo tenía.`,
    });
  }

  const paliza = results.filter((r) => r.winScore - r.loseScore >= 18).sort((a, b) => (b.winScore - b.loseScore) - (a.winScore - a.loseScore))[0];
  if (paliza && paliza !== upset) {
    news.push({
      prio: 2,
      tone: 'neutral',
      text: `📰 Paliza en la fecha: ${paliza.winnerName} aplastó ${paliza.winScore}-${paliza.loseScore} a ${paliza.loserName}. Se habló en todos los grupos.`,
    });
  }

  // La figura de la fecha: un nombre real del mundo, un número inventado creíble.
  if (rng.chance(0.5)) {
    const r = rng.pick(results);
    const team = teamByLegacyRival(s.world, r.winnerLegacyId);
    const roster = team ? teamRoster(s.world, team.id) : [];
    if (roster.length > 0) {
      const star = [...roster].sort((a, b) => b.level - a.level)[Math.floor(rng.next() * Math.min(3, roster.length))];
      news.push({
        prio: 1,
        tone: 'neutral',
        text: `📰 Figura de la fecha: ${worldPlayerName(star)} clavó ${rng.int(24, 34)} en la victoria de ${r.winnerName}.`,
      });
    }
  }

  news
    .sort((a, b) => b.prio - a.prio)
    .slice(0, 2)
    .forEach((n) => s.news.unshift({ week: Math.min(s.week, s.seasonLength), text: n.text, tone: n.tone }));
}

function legacyName(s: GameState, legacyId: string): string {
  return s.rivals.find((r) => r.id === legacyId)?.name ?? legacyId;
}
