import { describe, expect, it } from 'vitest';
import { getEvent } from '../src/game/events';
import { Rng } from '../src/game/rng';
import { buildSocialMap } from '../src/game/socialMap';
import { affinity, FRIEND_THRESHOLD, pairKey, RIVALRY_THRESHOLD } from '../src/game/relations';
import type { GameState } from '../src/game/types';
import { jugarFecha, partidaNueva, paso } from './jugar';

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

/** Un plantel con una pareja que no se banca: los dos primeros, con lo vivido en contra. */
function conRoce(seed: number): { s: GameState; a: string; b: string } {
  const s: GameState = structuredClone(partidaNueva(seed));
  const activos = s.players.filter((p) => !p.leftClub);
  const [a, b] = activos;
  s.affinityBonus = { ...(s.affinityBonus ?? {}), [pairKey(a.id, b.id)]: -12 };
  a.social = 20;
  b.social = 20;
  if (affinity(a, b, s.affinityBonus) > RIVALRY_THRESHOLD) throw new Error('el par de prueba no llega a roce');
  return { s, a: a.id, b: b.id };
}

describe('el mapa social juega (sep 2026): las peleas caen sobre el roce real y las charlas lo mueven', () => {
  it('"Se fueron a las manos" elige a los dos que no se bancan, si los hay', () => {
    for (const seed of [1, 2, 3]) {
      const { s, a, b } = conRoce(seed);
      const map = buildSocialMap(s);
      const roce = map.pairs.find((p) => p.kind === 'roce')!;
      expect([roce.a.id, roce.b.id].sort()).toEqual([a, b].sort());
      const t = getEvent('bronca_fuerte').pickTargets!(s, new Rng(seed))!;
      expect([t.playerId, t.playerId2].sort()).toEqual([a, b].sort());
    }
  });

  it('sin roce, la pelea sigue cayendo entre dos al azar', () => {
    const s = partidaNueva(4);
    for (const p of s.players) p.social = 90;
    expect(buildSocialMap(s).pairs.some((p) => p.kind === 'roce')).toBe(false);
    const t = getEvent('bronca_fuerte').pickTargets!(s, new Rng(4))!;
    expect(t.playerId).toBeTruthy();
    expect(t.playerId2).toBeTruthy();
    expect(t.playerId).not.toBe(t.playerId2);
  });

  it('enterrar el hacha sube la afinidad del par y el roce desaparece del vestuario; mirar para otro lado la baja', () => {
    const { s, a, b } = conRoce(1);
    const key = pairKey(a, b);
    // El desenlace de la secuela: la charla a fondo, con una semilla que la hace funcionar.
    let enterrado: GameState | null = null;
    for (let seed = 1; seed <= 40 && !enterrado; seed++) {
      const conEvento: GameState = { ...structuredClone(s), seed, pendingEvent: { defId: 'bronca_secuela', playerId: a, playerId2: b } };
      const r = paso(conEvento, { type: 'RESOLVE_EVENT', optionIndex: 2 });
      if (/enterraron el hacha/.test(r.memorableMoments.join(' '))) enterrado = r;
    }
    expect(enterrado).not.toBeNull();
    expect(enterrado!.affinityBonus[key]).toBeGreaterThan(s.affinityBonus[key]);
    expect(buildSocialMap(enterrado!).pairs.some((p) => p.kind === 'roce' && [p.a.id, p.b.id].sort().join() === [a, b].sort().join())).toBe(false);

    // Mirar para otro lado en la pelea: el par queda peor (el bonus ya estaba en el piso: no baja de -12, pero no sube).
    const pelea: GameState = { ...structuredClone(s), seed: 7, pendingEvent: { defId: 'bronca_fuerte', playerId: a, playerId2: b } };
    const vista = paso(pelea, { type: 'RESOLVE_EVENT', optionIndex: 2 });
    expect(vista.affinityBonus[key]).toBeLessThanOrEqual(s.affinityBonus[key]);
    // Y con un par que arranca en cero, la vista gorda lo baja de verdad.
    const neutro: GameState = { ...structuredClone(s), seed: 7, affinityBonus: {}, pendingEvent: { defId: 'bronca_fuerte', playerId: a, playerId2: b } };
    expect(paso(neutro, { type: 'RESOLVE_EVENT', optionIndex: 2 }).affinityBonus[key]).toBeLessThan(0);
  });
});

describe('el radar avisa del roce cuando el ambiente está bajo (sep 2026)', () => {
  it('con dos que no se bancan y el clima flojo, el tile del vestuario lo dice; con buen clima, no', async () => {
    const { watchItems } = await import('../src/ui/watch');
    const { s, a, b } = conRoce(1);
    const nombres = s.players.filter((p) => p.id === a || p.id === b).map((p) => p.name);
    const frio: GameState = { ...s, club: { ...s.club, socialClimate: 45 } };
    const aviso = watchItems(frio).find((i) => /no se bancan/.test(i.text));
    expect(aviso).toBeTruthy();
    expect(aviso!.tile).toBe('vestuario');
    for (const n of nombres) expect(aviso!.text).toContain(n);
    const calido: GameState = { ...s, club: { ...s.club, socialClimate: 75 } };
    expect(watchItems(calido).some((i) => /no se bancan/.test(i.text))).toBe(false);
  });
});
