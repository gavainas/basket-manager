import { SAVE_VERSION } from '../game/week';
import type { GameState } from '../game/types';

const KEY = 'basket-manager-save-v1';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sin espacio o storage bloqueado: el juego sigue sin guardar.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
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
