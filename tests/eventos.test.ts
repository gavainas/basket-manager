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

const racha = getEvent('racha_barrio');
const factura = getEvent('racha_factura');
const ev = (defId: string) => ({ defId });

describe('el barrio se enteró de la racha (sep 2026, el segundo evento que mira el historial)', () => {
  it('aparece con tres victorias seguidas, una sola vez por racha', () => {
    expect(racha.canFire(conHistorial([]))).toBe(false);
    expect(racha.canFire(conHistorial([true, true]))).toBe(false);
    expect(racha.canFire(conHistorial([true, true, true]))).toBe(true);
    expect(racha.canFire(conHistorial([false, true, true, true]))).toBe(true);
    // La cuarta seguida no lo vuelve a disparar: la racha ya se contó.
    expect(racha.canFire(conHistorial([true, true, true, true]))).toBe(false);
    // Una derrota en el medio la corta.
    expect(racha.canFire(conHistorial([true, false, true, true]))).toBe(false);
  });

  it('en playoffs no aparece, ni con una promesa todavía abierta', () => {
    const s = conHistorial([true, true, true]);
    expect(racha.canFire({ ...s, week: s.seasonLength + 1 })).toBe(false);
    expect(racha.canFire({ ...s, scheduledEvents: [{ defId: 'racha_factura', season: s.seasonNumber, week: s.week + 2 }] })).toBe(false);
  });

  it('el texto trae los tres marcadores', () => {
    const s = conHistorial([false, true, true, true]);
    const texto = racha.text(s, ev('racha_barrio'));
    expect(texto).toContain('70-60, 70-60, 70-60');
    expect(texto).not.toContain('60-70');
  });

  it('abrir la cancha deja plata en el libro y prestigio social, y desordena; bajar la espuma ordena', () => {
    const base = conHistorial([true, true, true]);
    const rng = new Rng(1);

    const cancha = structuredClone(base);
    racha.resolve(cancha, ev('racha_barrio'), 0, rng);
    expect(cancha.club.money).toBeGreaterThan(base.club.money);
    expect(cancha.ledger[cancha.ledger.length - 1].amount).toBe(cancha.club.money - base.club.money);
    expect(cancha.club.socialPrestige).toBeGreaterThan(base.club.socialPrestige);
    expect(cancha.club.organization).toBeLessThan(base.club.organization);
    expect(cancha.scheduledEvents ?? []).toHaveLength(0);

    const espuma = structuredClone(base);
    racha.resolve(espuma, ev('racha_barrio'), 1, rng);
    expect(espuma.club.organization).toBeGreaterThan(base.club.organization);
    expect(espuma.club.money).toBe(base.club.money);
  });

  it('agrandarse levanta al plantel y deja la promesa agendada para tres semanas después', () => {
    const s = conHistorial([true, true, true]);
    const moralAntes = s.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    racha.resolve(s, ev('racha_barrio'), 2, new Rng(1));
    const moralDespues = s.players.filter((p) => !p.leftClub).map((p) => p.motivation);
    expect(moralDespues.some((m, i) => m > moralAntes[i])).toBe(true);
    expect(s.scheduledEvents).toEqual([{ defId: 'racha_factura', season: s.seasonNumber, week: s.week + 3, fromWeek: s.week }]);
    expect(s.news[0].text).toContain('pelea arriba');
  });

  it('cerca del cierre, la factura cae a más tardar en las semifinales', () => {
    // Racha en la semana 8 de 9: el barrio cobra en la semana 10 (semis), con dos fechas jugadas.
    const s = conHistorial([false, false, false, false, false, true, true, true], 8);
    expect(s.seasonLength).toBe(9);
    racha.resolve(s, ev('racha_barrio'), 2, new Rng(1));
    expect(s.scheduledEvents).toEqual([{ defId: 'racha_factura', season: s.seasonNumber, week: 10, fromWeek: 8 }]);
  });

  it('el barrio cobra la promesa mirando las fechas que siguieron a la nota, no las de la racha', () => {
    const cobra = { defId: 'racha_factura', fromWeek: 4 };
    // Cumplida: dos de tres desde la nota (semanas 4, 5 y 6). Agradecer cierra la cadena con prestigio social.
    const bien = conHistorial([true, true, true, true, false, true], 7);
    expect(factura.options(bien, cobra)[0].label).toContain('agradecer');
    expect(factura.text(bien, cobra)).toContain('2 de 3');
    const antes = bien.club.socialPrestige;
    factura.resolve(bien, cobra, 0, new Rng(1));
    expect(bien.club.socialPrestige).toBeGreaterThan(antes);
    expect(bien.scheduledEvents ?? []).toHaveLength(0);

    // Cumplida y redoblada: la cadena sigue tres semanas más, contando desde hoy.
    const redobla = conHistorial([true, true, true, true, false, true], 7);
    factura.resolve(redobla, cobra, 1, new Rng(1));
    expect(redobla.scheduledEvents).toEqual([{ defId: 'racha_factura', season: redobla.seasonNumber, week: 10, fromWeek: 7 }]);

    // Incumplida: una de tres desde la nota (la racha de antes no cuenta). Hacerse el distraído se paga en imagen y en el vestuario.
    const mal = conHistorial([true, true, true, false, false, true], 7);
    expect(factura.options(mal, cobra)[0].label).toContain('Dar la cara');
    expect(factura.text(mal, cobra)).toContain('1 de 3');
    const social = mal.club.socialPrestige;
    const clima = mal.club.socialClimate;
    factura.resolve(mal, cobra, 1, new Rng(1));
    expect(mal.club.socialPrestige).toBeLessThan(social);
    expect(mal.club.socialClimate).toBeLessThan(clima);
    expect(mal.news[0].tone).toBe('bad');

    // Dar la cara cuesta menos imagen que esconderse.
    const cara = conHistorial([true, true, true, false, false, true], 7);
    factura.resolve(cara, cobra, 0, new Rng(1));
    expect(cara.club.socialPrestige).toBeGreaterThan(mal.club.socialPrestige);

    // En las semifinales ya no hay dónde cobrar otra: no se ofrece redoblar.
    const semis = conHistorial([true, true, true, true, true, true, true, true, true], 10);
    expect(factura.options(semis, { defId: 'racha_factura', fromWeek: 8 }).map((o) => o.label)).toEqual(['Pasar por el almacén a agradecer']);
  });
});
