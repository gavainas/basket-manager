import { SAVE_VERSION } from '../game/week';
import { suggestRotation } from '../game/match';
import { Rng } from '../game/rng';
import { RIVALS } from '../data/rivals';
import { rollBackground } from '../data/backgrounds';
import type { GameState } from '../game/types';

/** Semilla estable a partir de un string, para migraciones deterministas. */
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const KEY = 'basket-manager-save-v1';

/** Devuelve false si el guardado falló (storage bloqueado o lleno). */
export function saveGame(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    // Sin espacio o storage bloqueado: el juego sigue sin guardar.
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // Migración liviana: v2 solo carece del palmarés.
    if (parsed.saveVersion === 2) {
      parsed.pastSeasons = parsed.pastSeasons ?? [];
      parsed.saveVersion = 3;
    }
    // v3 → v4: se agregó la rotación elegible.
    if (parsed.saveVersion === 3) {
      parsed.rotation = suggestRotation(parsed.players, parsed.starters);
      parsed.saveVersion = 4;
    }
    // v4 → v5: contadores de entrenamiento por jugador.
    if (parsed.saveVersion === 4) {
      for (const p of parsed.players) {
        p.seasonTrainings = p.seasonTrainings ?? 0;
        p.techniqueGain = p.techniqueGain ?? 0;
      }
      parsed.saveVersion = 5;
    }
    // v5 → v6: promesas y pretemporada.
    if (parsed.saveVersion === 5) {
      parsed.promises = parsed.promises ?? [];
      parsed.preseason = parsed.preseason ?? null;
      parsed.saveVersion = 6;
    }
    // v6 → v7: convocatoria, partido en vivo y estilos de los rivales.
    if (parsed.saveVersion === 6) {
      parsed.callUp = parsed.callUp ?? [];
      parsed.live = null;
      for (const r of parsed.rivals) {
        r.style = r.style ?? RIVALS.find((d) => d.id === r.id)?.style ?? 'equilibrado';
      }
      parsed.saveVersion = 7;
    }
    // v7 → v8: cambios de jugadores en el partido (el formato de live cambió).
    if (parsed.saveVersion === 7) {
      parsed.live = null;
      if (parsed.phase === 'match') parsed.phase = 'lineup';
      parsed.saveVersion = 8;
    }
    // v8 → v9: ficha personal del jugador (datos, historial y timeline).
    if (parsed.saveVersion === 8) {
      for (const p of parsed.players) {
        const rng = new Rng(seedFrom(p.id + p.name));
        const bg = rollBackground(p.position, rng);
        p.height = p.height ?? bg.height;
        p.hand = p.hand ?? bg.hand;
        p.profession = p.profession ?? bg.profession;
        p.previousTeam = p.previousTeam ?? bg.previousTeam;
        p.joinedSeason = p.joinedSeason ?? 1;
        p.matchLog = p.matchLog ?? [];
        p.timeline = p.timeline ?? [
          { season: p.joinedSeason, week: 0, kind: 'llegada', text: 'Llegó al club.' },
        ];
      }
      parsed.saveVersion = 9;
    }
    // v9 → v10: planilla de estadísticas (puntos, rebotes, asistencias).
    if (parsed.saveVersion === 9) {
      for (const p of parsed.players) {
        for (const m of p.matchLog) {
          m.points = m.points ?? 0;
          m.rebounds = m.rebounds ?? 0;
          m.assists = m.assists ?? 0;
        }
      }
      for (const r of parsed.history) r.box = r.box ?? [];
      if (parsed.lastMatch) parsed.lastMatch.box = parsed.lastMatch.box ?? [];
      if (parsed.live) {
        parsed.live.stats = parsed.live.stats ?? Object.fromEntries(
          parsed.live.squad.map((id: string) => [id, { pts: 0, reb: 0, ast: 0 }])
        );
      }
      parsed.saveVersion = 10;
    }
    // v10 → v11: historia del club (sembrada con los momentos memorables).
    if (parsed.saveVersion === 10) {
      parsed.clubTimeline =
        parsed.clubTimeline ??
        parsed.memorableMoments.map((text: string) => ({
          season: parsed.seasonNumber,
          week: 0,
          kind: 'partido',
          text,
        }));
      parsed.saveVersion = 11;
    }
    if (parsed.saveVersion !== SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignorar
  }
}
