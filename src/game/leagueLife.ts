// La liga viva: árbitros con nombre y fama, rivalidades que se arman solas
// y noticias de la fecha. Casi todo se deriva de lo que ya se simula; acá
// solo se le pone nombre, memoria y voz.

import { clamp } from './balance';
import { loreOf } from '../data/clubLore';
import { fechaLabel, logClubEvent } from './timeline';
import { teamByLegacyRival, teamRoster, worldPlayerName } from './world';
import type { GameState } from './types';
import { Rng, seedFromString } from './rng';

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

/**
 * Al ganarle a un rival con historia: la espina se saca y el club lo celebra.
 * Devuelve el momento memorable que deja (si lo deja): quien cierra el partido
 * decide cuál de los momentos de la fecha se guarda, porque se guarda uno solo.
 */
export function settleRivalryAfterMatch(s: GameState): string | null {
  const m = s.lastMatch;
  if (!m || m.forfeit) return null;
  const riv = rivalryWith(s, m.rivalId);
  const wasNemesis = s.nemesis?.rivalId === m.rivalId;
  if (!riv && !wasNemesis) return null;

  if (m.won) {
    s.club.sportPrestige = clamp(s.club.sportPrestige + 2);
    // Sin clampear a la fase regular: una revancha en la final se anota en la final.
    logClubEvent(s, 'partido', `Revancha cumplida ante ${m.rivalName}: ${m.scoreFor}-${m.scoreAgainst}.`);
    s.news.unshift({ week: s.week, text: `Nos sacamos la espina: le ganamos a ${m.rivalName} y el vestuario lo gritó como un título.`, tone: 'good' });
    if (wasNemesis) s.nemesis = null;
    return `${fechaLabel(s)}: nos sacamos la espina contra ${m.rivalName} (${m.scoreFor}-${m.scoreAgainst}).`;
  }
  if (riv && riv.heat >= 2) {
    s.news.unshift({ week: s.week, text: `Otra vez ${m.rivalName}. En el grupo ya ni cargadas quedan: bronca en serio.`, tone: 'bad' });
  }
  return null;
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

  // El resto de la liga, con lo que el mundo sabe de cada club (sesión 4 de
  // design/MUNDO_REVISION_2026-10.md): los rasgos, los delegados y los
  // planteles rivales dan noticias que antes no existían. Se sortea una.
  // Con azar propio: no corre el azar de la temporada (los tests con semilla
  // fija recorren temporadas enteras y esperan lo mismo que antes).
  const extra = noticiasDelMundo(s, results, new Rng(seedFromString(`noticias_${s.seasonNumber}_${s.week}`)));
  if (extra) news.push({ prio: 1, tone: 'neutral', text: extra });

  news
    .sort((a, b) => b.prio - a.prio)
    .slice(0, 2)
    .forEach((n) => s.news.unshift({ week: Math.min(s.week, s.seasonLength), text: n.text, tone: n.tone }));
}

function legacyName(s: GameState, legacyId: string): string {
  return s.rivals.find((r) => r.id === legacyId)?.name ?? legacyId;
}

/** El delegado de un club rival, por nombre; "el delegado" si el mundo no lo tiene. */
function delegadoDe(s: GameState, clubName: string): string {
  const rival = s.rivals.find((r) => r.name === clubName);
  const team = rival ? teamByLegacyRival(s.world, rival.id) : undefined;
  return team?.delegate ?? 'el delegado';
}

function mayus(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Una noticia más de la fecha, sacada de lo que el mundo sabe: el que jugó
 * con seis, el delegado que protestó la planilla, el que estrenó camisetas,
 * el lesionado de ellos, el partido que se definió sobre la chicharra. Cada
 * resultado habilita las que le caben; se sortea una entre todas.
 */
function noticiasDelMundo(s: GameState, results: OtherResult[], rng: Rng): string | null {
  const cands: string[] = [];
  for (const r of results) {
    const diff = r.winScore - r.loseScore;
    const loserLore = loreOf(r.loserName);
    const winnerLore = loreOf(r.winnerName);
    const lr = loserLore?.rasgos ?? [];
    const wr = winnerLore?.rasgos ?? [];
    if (diff <= 2) {
      cands.push(`📰 ${r.winnerName} le ganó a ${r.loserName} por ${diff === 1 ? 'uno' : 'dos'}, sobre la chicharra (${r.winScore}-${r.loseScore}). Se discutió hasta en el estacionamiento.`);
    }
    if (lr.includes('siempre_seis')) {
      cands.push(`📰 ${r.loserName} jugó con seis otra vez y lo pagó contra ${r.winnerName} (${r.winScore}-${r.loseScore}). ${mayus(delegadoDe(s, r.loserName))} juró que "la semana que viene vienen todos".`);
    }
    if (lr.includes('delegado_pesado')) {
      cands.push(`📰 ${mayus(delegadoDe(s, r.loserName))} (${r.loserName}) protestó la planilla de ${r.winnerName} después del ${r.winScore}-${r.loseScore}. La liga la dio por buena en dos renglones.`);
    }
    if (lr.includes('llegan_tarde')) {
      cands.push(`📰 ${r.loserName} arrancó con cuatro contra ${r.winnerName} y entró al partido cuando ya iba ${Math.round(r.winScore / 4)}-${Math.round(r.loseScore / 5)}. Terminó ${r.winScore}-${r.loseScore}.`);
    }
    if (wr.includes('tercer_tiempo') || wr.includes('cantina')) {
      cands.push(`📰 En ${r.winnerName} festejaron el ${r.winScore}-${r.loseScore} a ${r.loserName} con asado en la cancha. ${mayus(delegadoDe(s, r.winnerName))} invitó a los rivales; fueron dos.`);
    }
    if (wr.includes('tribuna_brava') && diff >= 10) {
      cands.push(`📰 ${r.winnerName} pasó por arriba a ${r.loserName} (${r.winScore}-${r.loseScore}) con la tribuna encima: el bombo de ${winnerLore?.cancha ?? 'su cancha'} se escuchó desde la avenida.`);
    }
    if (wr.includes('de_traje') && rng.chance(0.5)) {
      cands.push(`📰 ${r.winnerName} estrenó camisetas en la victoria contra ${r.loserName}. Las viejas tenían doce años, según ${delegadoDe(s, r.winnerName)}, "y ganaban más".`);
    }
    if (lr.includes('dt_nuevo') && diff >= 12) {
      const rival = s.rivals.find((x) => x.name === r.loserName);
      const team = rival ? teamByLegacyRival(s.world, rival.id) : undefined;
      if (team?.coachName) cands.push(`📰 En ${r.loserName} ya se habla del puesto de ${team.coachName} después del ${r.loseScore}-${r.winScore} con ${r.winnerName}. Es el tercer DT en tres años.`);
    }
    if (lr.includes('historico') && diff >= 15) {
      cands.push(`📰 ${r.loserName}, con toda su historia, se comió un ${r.loseScore}-${r.winScore} de ${r.winnerName}. En la sede no se habla de otra cosa.`);
    }
  }
  // El lesionado de la liga: un plantel rival con un jugador parado.
  for (const rival of rng.shuffle(s.rivals).slice(0, 3)) {
    const team = teamByLegacyRival(s.world, rival.id);
    const roto = team ? teamRoster(s.world, team.id).find((wp) => wp.injuryWeeks > 0) : undefined;
    if (roto) {
      cands.push(`📰 ${worldPlayerName(roto)} (${rival.name}) salió lesionado: ${roto.injuryWeeks === 1 ? 'una semana' : `${roto.injuryWeeks} semanas`} afuera. Si nos toca enfrentarlos, no lo vamos a ver.`);
      break;
    }
  }
  return cands.length > 0 ? rng.pick(cands) : null;
}
