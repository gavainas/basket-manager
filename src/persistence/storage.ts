import { SAVE_VERSION } from '../game/week';
import { suggestRotation } from '../game/match';
import type { GameState } from '../game/types';

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
