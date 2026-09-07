import { beforeEach, describe, expect, it } from 'vitest';
import { WORLD_DIVISION_IDS } from '../src/data/worldData';
import { createNewGame, SAVE_VERSION } from '../src/game/week';
import { clearSave, loadGame, saveGame, saveStatus } from '../src/persistence/storage';

/** Un localStorage de mentira: el motor no lo tiene y los tests corren en Node. */
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  get length() {
    return store.size;
  },
};
(globalThis as unknown as { localStorage: typeof fakeStorage }).localStorage = fakeStorage;

const KEY = 'basket-manager-save-v1';

describe('guardar y cargar', () => {
  beforeEach(() => store.clear());

  it('sin partida guardada no hay nada que continuar', () => {
    expect(saveStatus()).toBe('none');
    expect(loadGame()).toBeNull();
  });

  it('lo que se guarda es lo que se carga', () => {
    const s = createNewGame(123);
    expect(saveGame(s)).toBe(true);
    expect(saveStatus()).toBe('ok');
    expect(loadGame()).toEqual(s);
    clearSave();
    expect(saveStatus()).toBe('none');
  });

  it('un save de una versión que esta build no conoce se declara incompatible, no se pisa', () => {
    const s = { ...createNewGame(123), saveVersion: SAVE_VERSION + 1 };
    store.set(KEY, JSON.stringify(s));
    expect(loadGame()).toBeNull();
    expect(saveStatus()).toBe('incompatible');
  });

  it('un save roto no tira el juego abajo', () => {
    store.set(KEY, '{esto no es json');
    expect(loadGame()).toBeNull();
    expect(saveStatus()).toBe('incompatible');
  });

  it('un save de antes de la pirámide (v21) migra hasta la versión actual con el mundo entero', () => {
    const viejo = createNewGame(321) as unknown as Record<string, unknown>;
    viejo.saveVersion = 21;
    delete viejo.worldDivisions;
    delete viejo.heldDivisionIds;
    for (const p of viejo.players as Record<string, unknown>[]) {
      delete p.grievance;
      // La basura de punto flotante que limpiaba la v23.
      p.physical = 77.96101502049714;
    }
    store.set(KEY, JSON.stringify(viejo));

    const s = loadGame();
    expect(s).not.toBeNull();
    expect(s!.saveVersion).toBe(SAVE_VERSION);
    expect(s!.heldDivisionIds).toEqual([]);
    expect(s!.players.every((p) => p.grievance === null)).toBe(true);
    expect(s!.players.every((p) => Number.isInteger(p.physical))).toBe(true);
    for (const id of WORLD_DIVISION_IDS) {
      if (id === s!.divisionId) expect(s!.worldDivisions[id]).toBeUndefined();
      else expect(Array.isArray(s!.worldDivisions[id])).toBe(true);
    }
    expect(s!.world.clubs.length).toBeGreaterThan(0);
  });
});
