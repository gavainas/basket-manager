// Scouting amateur progresivo: al rival se lo conoce jugándole, compartiendo
// liga y con el boca a boca. La información puede ser aproximada, vieja o
// directamente errónea. DEBUG_FULL_SCOUTING muestra todo para testear.

import { Rng, seedFromString } from './rng';
import { attendChance, divisionOfTeam, teamByLegacyRival, teamRoster, userFixtureOfWeek, worldPlayerName } from './world';
import type { GameState, WorldPlayer } from './types';

/** Interruptor de desarrollo: true = ver toda la información del rival. */
export const DEBUG_FULL_SCOUTING = false;

export type KnowledgeLevel = 0 | 1 | 2 | 3;

export const KNOWLEDGE_LABELS: Record<KnowledgeLevel, string> = {
  0: 'Desconocido',
  1: 'Conocimiento básico',
  2: 'Conocimiento medio',
  3: 'Conocimiento avanzado',
};

/**
 * Cuánto conocemos a un rival: compartir liga da lo básico, media temporada
 * de comentarios suma, y haberlo enfrentado es lo que más enseña.
 */
export function scoutingLevel(state: GameState, rivalLegacyId: string): KnowledgeLevel {
  if (DEBUG_FULL_SCOUTING) return 3;
  let level = 1; // compartimos liga: algo se sabe
  if (state.week >= 6 || state.seasonNumber > 1) level += 1; // boca a boca de la liga
  if (state.history.some((m) => m.rivalId === rivalLegacyId)) level += 1; // ya lo enfrentamos
  return Math.min(3, level) as KnowledgeLevel;
}

/** Etiqueta del nivel de un rival: nada de números salvo debug. Con poco
 *  conocimiento la estimación mete ruido y a veces directamente no sirve. */
export function perceivedLevel(state: GameState, wp: WorldPlayer, knowledge: KnowledgeLevel): string {
  if (DEBUG_FULL_SCOUTING) return `≈${wp.level}`;
  const rng = new Rng(seedFromString(`lbl_${wp.id}_s${state.seasonNumber}_k${knowledge}`));
  if (knowledge <= 1 && rng.chance(0.2)) return 'estimación poco confiable';
  const noise = knowledge >= 3 ? 0 : rng.int(-9, 9);
  const v = wp.level + noise;
  if (v < 45) return 'flojo';
  if (v < 58) return 'correcto';
  if (v < 70) return 'buen jugador';
  return 'figura';
}

export interface ScoutViewEntry {
  playerId: string;
  name: string;
  detail: string;
}

export interface ScoutView {
  rivalName: string;
  knowledge: KnowledgeLevel;
  knowledgeLabel: string;
  /** Lectura general del equipo (siempre disponible). */
  teamLines: string[];
  probable: ScoutViewEntry[];
  doubtful: ScoutViewEntry[];
  out: ScoutViewEntry[];
  debug: boolean;
}

const STYLE_READS: Record<string, string> = {
  internos: 'Equipo físicamente fuerte: viven del juego cerca del aro.',
  tiradores: 'Equipo de mano caliente: si los dejás tirar, te pasan por arriba.',
  corredores: 'Corren toda la cancha los 40 minutos.',
  equilibrado: 'Equipo parejo, sin un punto débil evidente.',
};

/** Motivo mostrable: solo lo estructural se conoce; lo puntual es rumor. */
function visibleReason(p: WorldPlayer, gameDay: string, knowledge: KnowledgeLevel): string {
  if (p.injuryWeeks > 0) return 'lesionado';
  if (knowledge >= 3) {
    if (p.availability.distanceKm > 50) return `vive en ${p.availability.residence}`;
    if (p.availability.blockedDays.includes(gameDay as never)) return `suele faltar los ${gameDay}`;
    if (p.availability.onlyTimes.length > 0) return 'solo llega a los partidos de 22:00';
  }
  return 'se comenta que podría no llegar';
}

/** Arma la vista de scouting del próximo rival según cuánto lo conocemos. */
export function buildScoutView(state: GameState): ScoutView | null {
  if (state.week > state.seasonLength + 2) return null;
  const rivalId = state.schedule[state.week - 1];
  if (!rivalId) return null;
  const rival = state.rivals.find((r) => r.id === rivalId);
  const team = teamByLegacyRival(state.world, rivalId);
  const division = team ? divisionOfTeam(state.world, team.id) : undefined;
  if (!rival || !team || !division) return null;

  const knowledge = scoutingLevel(state, rivalId);
  const fixture = userFixtureOfWeek(state.world, state.week);
  const time = fixture?.time ?? division.gameTimes[0];
  const rng = new Rng(seedFromString(`scout_${state.world.season.id}_w${state.week}`));
  const roster = teamRoster(state.world, team.id).sort((a, b) => b.level - a.level);

  const view: ScoutView = {
    rivalName: rival.name,
    knowledge,
    knowledgeLabel: KNOWLEDGE_LABELS[knowledge],
    teamLines: [],
    probable: [],
    doubtful: [],
    out: [],
    debug: DEBUG_FULL_SCOUTING,
  };

  // Lectura general: siempre hay algo que se comenta.
  view.teamLines.push(STYLE_READS[rival.style] ?? 'No hay demasiada información disponible.');
  const avgAttend = roster.reduce((t, p) => t + p.availability.baseChance, 0) / Math.max(1, roster.length);
  view.teamLines.push(avgAttend >= 0.75 ? 'Suelen llevar bastante gente.' : 'Más de una vez llegaron cortos de banco.');

  if (knowledge <= 1 && !DEBUG_FULL_SCOUTING) {
    // Básico: apenas el nombre que suena y algún rumor.
    const star = roster[0];
    if (star) view.teamLines.push(`${worldPlayerName(star)} parece ser uno de sus mejores jugadores.`);
    const rumor = roster.find((p) => p.injuryWeeks > 0 || attendChance(p, division, time) < 0.4);
    if (rumor && rng.chance(0.7)) {
      view.teamLines.push(
        rumor.injuryWeeks > 0
          ? `Se comenta que ${rumor.firstName} ${rumor.lastName} está lesionado.`
          : `Se comenta que ${rumor.firstName} podría no llegar.`
      );
    }
    view.teamLines.push('No hay demasiada información disponible: habrá que verlos en cancha.');
    return view;
  }

  for (const p of roster) {
    const entry = { playerId: p.id, name: worldPlayerName(p) };
    if (p.injuryWeeks > 0) {
      view.out.push({ ...entry, detail: 'lesionado' });
      continue;
    }
    const perceived = attendChance(p, division, time) + rng.range(-0.15, 0.15);
    if (perceived >= 0.7) {
      view.probable.push({ ...entry, detail: perceivedLevel(state, p, knowledge) });
    } else if (perceived >= 0.3) {
      view.doubtful.push({ ...entry, detail: visibleReason(p, division.gameDay, knowledge) });
    } else {
      view.out.push({ ...entry, detail: visibleReason(p, division.gameDay, knowledge) });
    }
  }

  // Con conocimiento medio, las dudas son solo rumores y la lista se recorta.
  if (knowledge === 2 && !DEBUG_FULL_SCOUTING) {
    view.probable = view.probable.slice(0, 6);
    view.doubtful = view.doubtful.map((e) => ({ ...e, detail: 'se comenta que podría no llegar' }));
    view.out = view.out.filter((e) => e.detail === 'lesionado');
  }

  return view;
}
