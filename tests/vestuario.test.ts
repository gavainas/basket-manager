import { describe, expect, it } from 'vitest';
import { buildSocialMap } from '../src/game/socialMap';
import { affinity, FRIEND_THRESHOLD } from '../src/game/relations';
import type { GameState } from '../src/game/types';
import { jugarFecha, partidaNueva } from './jugar';

/** Ids de los que el mapa nombra en las mesas, entre los sueltos y entre los aislados. */
function nombrados(s: GameState) {
  const map = buildSocialMap(s);
  return {
    map,
    ids: [
      ...map.groups.flatMap((g) => g.members.map((m) => m.id)),
      ...map.sueltos.map((e) => e.p.id),
      ...map.loners.map((e) => e.p.id),
    ],
  };
}

describe('el vestuario por dentro (sep 2026: cuenta a todo el plantel)', () => {
  it('cada jugador del plantel aparece exactamente una vez: en una mesa, suelto o por la suya', () => {
    for (const seed of [1, 7, 42, 123, 2026]) {
      let s = partidaNueva(seed);
      const activos = s.players.filter((p) => !p.leftClub).map((p) => p.id).sort();
      const antes = nombrados(s);
      expect([...antes.ids].sort()).toEqual(activos);

      // Después de unas fechas (asados no, pero sí peleas y sociedades del
      // partido mueven las afinidades) sigue cerrando la cuenta.
      for (let i = 0; i < 3; i++) s = jugarFecha(s);
      const despues = nombrados(s);
      const activosDespues = s.players.filter((p) => !p.leftClub).map((p) => p.id).sort();
      expect([...despues.ids].sort()).toEqual(activosDespues);
    }
  });

  it('el suelto se junta con su compañero más cercano, y el texto lo nombra', () => {
    const s = partidaNueva(42);
    const { map } = nombrados(s);
    const activos = s.players.filter((p) => !p.leftClub);
    expect(map.sueltos.length + map.loners.length + map.groups.length).toBeGreaterThan(0);
    for (const e of map.sueltos) {
      expect(e.closest.id).not.toBe(e.p.id);
      const v = affinity(e.p, e.closest, s.affinityBonus);
      for (const q of activos) {
        if (q.id === e.p.id) continue;
        expect(affinity(e.p, q, s.affinityBonus)).toBeLessThanOrEqual(v);
      }
      expect(e.text).toContain(e.closest.name);
      // Un suelto no es aislado: con alguien se lleva bien.
      expect(v).toBeGreaterThanOrEqual(50);
      // Y no forma grupo con nadie: ningún lazo llega al umbral de mesa (77).
      expect(v).toBeLessThan(77);
      if (e.mesa) {
        expect(e.mesa.members.some((m) => m.id === e.closest.id)).toBe(true);
        expect(e.text).toContain(e.mesa.label);
      }
      if (v >= FRIEND_THRESHOLD) expect(e.text).toMatch(/Amigo de|Se junta con/);
    }
  });

  it('en un plantel donde nadie se lleva bien con nadie, todos van por la suya y no hay sueltos', () => {
    const s = partidaNueva(3);
    const frio: GameState = structuredClone(s);
    // Sin nada compartido y con lo social por el piso, ningún lazo llega a 50.
    frio.affinityBonus = {};
    for (const p of frio.players) p.social = 0;
    const map = buildSocialMap(frio);
    expect(map.groups).toEqual([]);
    expect(map.sueltos).toEqual([]);
    expect(map.loners.length).toBe(frio.players.filter((p) => !p.leftClub).length);
  });
});
