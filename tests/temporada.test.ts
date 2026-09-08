import { describe, expect, it } from 'vitest';
import { createRecruit } from '../src/data/recruits';
import { activePlayers } from '../src/game/match';
import { Rng } from '../src/game/rng';
import { jugarFecha, jugarTemporada, partidaNueva } from './jugar';

describe('una temporada entera por el reducer', () => {
  const final = jugarTemporada(partidaNueva(2026));

  it('termina en el cierre de temporada, no en game over', () => {
    expect(final.phase).toBe('seasonEnd');
    expect(final.gameOverReason).toBeNull();
  });

  it('la tabla cierra: tantas victorias como derrotas, y el club jugó todas las fechas', () => {
    const wins = final.standings.reduce((n, r) => n + r.wins, 0);
    const losses = final.standings.reduce((n, r) => n + r.losses, 0);
    expect(wins).toBe(losses);
    const club = final.standings.find((r) => r.teamId === 'club')!;
    expect(club.wins + club.losses).toBe(final.seasonLength);
    expect(club.pointsFor).toBeGreaterThan(0);
    expect(club.pointsAgainst).toBeGreaterThan(0);
  });

  it('cada fecha de la fase regular quedó en la historia y nadie perdió por forfeit', () => {
    const regular = final.history.filter((m) => m.week <= final.seasonLength);
    expect(regular).toHaveLength(final.seasonLength);
    expect(regular.every((m) => !m.forfeit)).toBe(true);
    expect(regular.every((m) => m.scoreFor !== m.scoreAgainst)).toBe(true);
  });

  it('el fixture del mundo registra el resultado del club fecha a fecha', () => {
    const jugados = final.world.fixtures.filter((f) => f.isUserMatch && f.status === 'jugado');
    expect(jugados.length).toBeGreaterThanOrEqual(final.seasonLength);
  });

  it('el conteo del plantel es uno solo: los que no se fueron', () => {
    const enElPlantel = activePlayers(final.players).length;
    expect(enElPlantel).toBe(final.players.filter((p) => !p.leftClub).length);
    expect(final.playersLeftCount).toBe(final.players.filter((p) => p.leftClub).length);
    expect(enElPlantel).toBeGreaterThanOrEqual(5);
  });

  it('los atributos siguen siendo enteros entre 0 y 100 después de toda la temporada', () => {
    for (const p of final.players) {
      for (const k of ['physical', 'motivation', 'commitment', 'social', 'technique', 'confidence'] as const) {
        expect(Number.isInteger(p[k]), `${p.name}.${k} = ${p[k]}`).toBe(true);
        expect(p[k]).toBeGreaterThanOrEqual(0);
        expect(p[k]).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('la convocatoria', () => {
  it('cita sólo a jugadores del club, una vez cada uno, y siempre deja alguien para jugar', () => {
    let s = partidaNueva(31);
    for (let fecha = 0; fecha < 4; fecha++) {
      const antes = s;
      s = jugarFecha(s);
      const partido = s.history[s.history.length - 1];
      expect(partido.week).toBe(antes.week);
      expect(partido.forfeit).toBeFalsy();
    }
    // La lista de la última fecha jugada sigue en el estado hasta la próxima.
    const ids = s.callUp.map((e) => e.playerId);
    expect(new Set(ids).size).toBe(ids.length);
    const activos = new Set(activePlayers(s.players).map((p) => p.id));
    expect(ids.every((id) => activos.has(id))).toBe(true);
  });
});

describe('el azar con semilla', () => {
  it('la misma semilla da la misma temporada, resultado por resultado', () => {
    const a = jugarTemporada(partidaNueva(77));
    const b = jugarTemporada(partidaNueva(77));
    const marcador = (s: typeof a) => s.history.map((m) => `${m.week}:${m.scoreFor}-${m.scoreAgainst}`);
    expect(marcador(a)).toEqual(marcador(b));
    expect(a.club.money).toBe(b.club.money);
  });

  it('un recluta sale del RNG y del plantel, no de un contador del módulo', () => {
    const taken = ['Lucas Camejo', 'Emi Duarte'];
    const a = createRecruit(new Rng(9), { taken });
    createRecruit(new Rng(1)); // otro recluta en el medio no cambia al siguiente
    const b = createRecruit(new Rng(9), { taken });
    expect(b.id).toBe(a.id);
    expect(b.name).toBe(a.name);
    expect(taken).not.toContain(a.name);
  });

  it('semillas distintas dan temporadas distintas', () => {
    const a = jugarTemporada(partidaNueva(77));
    const b = jugarTemporada(partidaNueva(78));
    const marcador = (s: typeof a) => s.history.map((m) => `${m.scoreFor}-${m.scoreAgainst}`);
    expect(marcador(a)).not.toEqual(marcador(b));
  });
});
