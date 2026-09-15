import { describe, expect, it } from 'vitest';
import { getEvent } from '../src/game/events';
import { Rng } from '../src/game/rng';
import type { GameState, MatchResult } from '../src/game/types';
import { partidaNueva } from './jugar';

/** Un partido terminado, con lo justo para el historial. */
function partido(week: number, won: boolean): MatchResult {
  return {
    week,
    rivalId: 'r1',
    rivalName: 'Unión Vecinal',
    scoreFor: won ? 70 : 60,
    scoreAgainst: won ? 60 : 70,
    quarters: [],
    highlights: [],
    won,
    forfeit: false,
    mvpId: null,
    mvpName: null,
    summary: '',
    reasons: [],
    lockerRoom: [],
    effects: [],
    box: [],
  };
}

/** Una partida en curso con el historial que le pongas. */
function conHistorial(resultados: boolean[], week = resultados.length + 1): GameState {
  const s = partidaNueva(4);
  return { ...s, week, history: resultados.map((won, i) => partido(i + 1, won)) };
}

const comision = getEvent('comision_aprieta');

describe('la comisión pide explicaciones (sep 2026)', () => {
  it('aparece recién con tres derrotas seguidas, y no antes', () => {
    expect(comision.canFire(conHistorial([]))).toBe(false);
    expect(comision.canFire(conHistorial([false, false]))).toBe(false);
    expect(comision.canFire(conHistorial([false, false, false]))).toBe(true);
    // Una victoria en el medio corta la racha.
    expect(comision.canFire(conHistorial([false, true, false, false]))).toBe(false);
    // Y la última ganada también.
    expect(comision.canFire(conHistorial([false, false, false, true]))).toBe(false);
  });

  it('en playoffs no aparece: ahí se habla de otra cosa', () => {
    const s = conHistorial([false, false, false]);
    expect(comision.canFire({ ...s, week: s.seasonLength + 1 })).toBe(false);
  });

  it('el texto les pone los marcadores de las tres fechas en la cara', () => {
    const s = conHistorial([true, false, false, false]);
    const texto = comision.text(s, { defId: 'comision_aprieta' });
    expect(texto).toContain('60-70');
    expect(texto).not.toContain('70-60'); // la ganada no cuenta
  });

  it('dar la cara ordena el club; bancar al plantel lo levanta y cuesta crédito', () => {
    const base = conHistorial([false, false, false]);
    const rng = new Rng(1);

    const plan = structuredClone(base);
    comision.resolve(plan, { defId: 'comision_aprieta' }, 0, rng);
    expect(plan.club.organization).toBeGreaterThan(base.club.organization);

    const banca = structuredClone(base);
    const moralAntes = banca.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    comision.resolve(banca, { defId: 'comision_aprieta' }, 1, rng);
    const moralDespues = banca.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    expect(moralDespues.some((m, i) => m > moralAntes[i])).toBe(true);
    expect(banca.club.socialClimate).toBeGreaterThan(base.club.socialClimate);
    expect(banca.club.sportPrestige).toBeLessThan(base.club.sportPrestige);
  });

  it('cargarle el muerto al plantel se paga en el vestuario, y queda escrito', () => {
    const s = conHistorial([false, false, false]);
    const antes = s.club.socialClimate;
    const leales = s.players.filter((p) => !p.leftClub && (p.personality === 'leal' || p.personality === 'cumplidor'));
    const moralAntes = leales.map((p) => p.motivation);

    comision.resolve(s, { defId: 'comision_aprieta' }, 2, new Rng(1));

    expect(s.club.socialClimate).toBeLessThan(antes);
    const moralDespues = s.players
      .filter((p) => !p.leftClub && (p.personality === 'leal' || p.personality === 'cumplidor'))
      .map((p) => p.motivation);
    expect(moralDespues.every((m, i) => m <= moralAntes[i])).toBe(true);
    // Se entera el barrio (noticia) y queda en la historia del club.
    expect(s.news[0].text).toContain('no está a la altura');
    expect(s.clubTimeline.some((e) => e.text.includes('le cargó la racha al plantel'))).toBe(true);
  });
});
