import { describe, expect, it } from 'vitest';
import { getAction } from '../src/game/actions';
import { BALANCE } from '../src/game/balance';
import { applyWeeklyEconomy } from '../src/game/economy';
import { Rng } from '../src/game/rng';
import { condicionCumplida, SPONSORS } from '../src/game/sponsors';
import { createNewGame } from '../src/game/week';
import type { GameState, SponsorContract } from '../src/game/types';
import { jugarFecha, partidaNueva, paso, resolverEventos } from './jugar';

/** Busca sponsor hasta conseguirlo (el azar dice que sí en alguna semana). */
function conSponsor(seed: number): GameState {
  let s = partidaNueva(seed);
  for (let i = 0; i < 6 && !s.sponsor; i++) {
    s = resolverEventos(s);
    s = paso(s, { type: 'TOGGLE_ACTION', id: 'sponsor' });
    s = jugarFecha(s);
  }
  return s;
}

describe('la economía con arco (sep 2026)', () => {
  it('buscar sponsor firma un contrato con condiciones, que paga por semana y se ve en la estimación', () => {
    const s = conSponsor(11);
    expect(s.sponsor).toBeTruthy();
    const c = s.sponsor!;
    expect(SPONSORS.some((d) => d.id === c.id)).toBe(true);
    expect(c.weekly).toBeGreaterThan(0);
    expect(s.sponsorWeeks).toBe(c.weeksLeft);
    expect(s.ledger.some((e) => e.concept.startsWith('Aporte de ') && e.amount === c.weekly)).toBe(true);
    expect(s.news.some((n) => /auspicia al club/.test(n.text) && /Pide /.test(n.text))).toBe(true);
    // No se puede buscar otro mientras hay uno.
    expect(getAction('sponsor').available(s).ok).toBe(false);
  });

  it('el contrato renueva si cumplís y sube el aporte; si no cumplís, se va y lo dice', () => {
    const base = partidaNueva(11);
    const contrato = (extra: Partial<SponsorContract>): SponsorContract => ({
      id: 'gimnasio',
      name: 'El gimnasio de la avenida',
      weekly: 60,
      weeksLeft: 1,
      weeksTotal: 6,
      condicion: 'ganar',
      meta: 3,
      progreso: 3,
      renovaciones: 0,
      ...extra,
    });
    const cumple: GameState = structuredClone({ ...base, sponsor: contrato({}), sponsorWeeks: 1, lastMatch: null });
    applyWeeklyEconomy(cumple, new Rng(1));
    expect(cumple.sponsor!.renovaciones).toBe(1);
    expect(cumple.sponsor!.weekly).toBe(60 + BALANCE.economy.sponsorRenewBonus);
    expect(cumple.sponsor!.weeksLeft).toBe(6);
    expect(cumple.sponsorWeeks).toBe(6);
    expect(cumple.news.some((n) => /renovó/.test(n.text))).toBe(true);

    const falla: GameState = structuredClone({ ...base, sponsor: contrato({ progreso: 1 }), sponsorWeeks: 1, lastMatch: null });
    applyWeeklyEconomy(falla, new Rng(1));
    expect(falla.sponsor).toBeNull();
    expect(falla.sponsorWeeks).toBe(0);
    expect(falla.news.some((n) => /no renovó: pedía ganar 3/.test(n.text))).toBe(true);
  });

  it('una paliza corta en el acto el contrato del que no quiere papelones', () => {
    const base = partidaNueva(11);
    const s: GameState = structuredClone({
      ...base,
      sponsor: { id: 'ferreteria', name: 'La ferretería de Don Aldo', weekly: 80, weeksLeft: 4, weeksTotal: 5, condicion: 'sin_papelon' as const, meta: 20, progreso: 0, renovaciones: 0 },
      sponsorWeeks: 4,
      lastMatch: { ...base.history[0], week: 1, rivalId: 'r1', rivalName: 'X', scoreFor: 40, scoreAgainst: 70, won: false, forfeit: false } as GameState['lastMatch'],
    });
    applyWeeklyEconomy(s, new Rng(1));
    expect(s.sponsor).toBeNull();
    expect(s.news.some((n) => /cortó el contrato después de la paliza/.test(n.text))).toBe(true);
  });

  it('las condiciones se miden con lo que el club es hoy', () => {
    const s = partidaNueva(11);
    const c = (condicion: SponsorContract['condicion'], meta: number, progreso = 0): SponsorContract => ({
      id: 'x', name: 'x', weekly: 1, weeksLeft: 1, weeksTotal: 1, condicion, meta, progreso, renovaciones: 0,
    });
    expect(condicionCumplida(s, c('ganar', 2, 1))).toBe(false);
    expect(condicionCumplida(s, c('ganar', 2, 2))).toBe(true);
    expect(condicionCumplida(s, c('publico', s.club.socialPrestige))).toBe(true);
    expect(condicionCumplida(s, c('publico', s.club.socialPrestige + 1))).toBe(false);
    expect(condicionCumplida(s, c('cuotas', 0))).toBe(true);
    expect(condicionCumplida(s, c('cuotas', 101))).toBe(false);
  });

  it('la rifa rinde menos si le vendés otra al barrio enseguida', () => {
    let rindioMenos = 0;
    for (let seed = 1; seed <= 8; seed++) {
      let s = resolverEventos(partidaNueva(seed));
      s = { ...s, club: { ...s.club, organization: 80, money: 800 } };
      s = paso(s, { type: 'TOGGLE_ACTION', id: 'raffle' });
      s = jugarFecha(s);
      const rifas1 = s.ledger.filter((e) => /Recaudación de la rifa/.test(e.concept));
      expect(rifas1).toHaveLength(1);
      expect(s.ultimaRifa).toBe(1);
      s = resolverEventos(s);
      s = { ...s, club: { ...s.club, organization: 80, money: 800 } };
      s = paso(s, { type: 'TOGGLE_ACTION', id: 'raffle' });
      s = jugarFecha(s);
      const rifas2 = s.ledger.filter((e) => /Recaudación de la rifa/.test(e.concept));
      expect(rifas2).toHaveLength(2);
      if (rifas2[1].amount < rifas2[0].amount) rindioMenos += 1;
    }
    // Con el factor de fatiga (0,6) la segunda rinde menos casi siempre; el azar del monto puede ganarle alguna vez.
    expect(rindioMenos).toBeGreaterThanOrEqual(5);
  });

  it('el moroso se pone al día solo a veces, y el imprevisto sin caja se arregla con alambre', () => {
    const base = partidaNueva(11);
    const moroso = base.players.find((p) => !p.leftClub && p.feeStatus === 'pagada')!;
    let pago = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s: GameState = structuredClone(base);
      const p = s.players.find((x) => x.id === moroso.id)!;
      p.feeStatus = 'pendiente';
      p.weeksUnpaid = 3;
      applyWeeklyEconomy(s, new Rng(seed));
      const pagoEl = s.ledger.find((e) => e.concept === `${p.name} se puso al día con la cuota`);
      if (pagoEl) {
        pago += 1;
        expect(pagoEl.amount).toBe(BALANCE.economy.feeWeekly * BALANCE.economy.morosoPagaMaxSemanas);
        expect(s.players.find((x) => x.id === moroso.id)!.feeStatus).toBe('pagada');
      }
    }
    expect(pago).toBeGreaterThan(0);
    expect(pago).toBeLessThan(60);

    // Sin caja, el imprevisto no quiebra al club: cuesta organización.
    let alambres = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s: GameState = structuredClone(base);
      s.club.money = 20;
      const org = s.club.organization;
      applyWeeklyEconomy(s, new Rng(seed));
      if (s.news.some((n) => /se arregló con alambre/.test(n.text))) {
        alambres += 1;
        expect(s.club.organization).toBeLessThan(org);
        // El imprevisto no pasó por la caja: ningún gasto que no sea de los fijos.
        const fijos = /Alquiler|Árbitros|Sueldo|Cuota del fiado/;
        const nuevos = s.ledger.slice(base.ledger.length);
        expect(nuevos.filter((e) => e.amount < 0 && !fijos.test(e.concept))).toHaveLength(0);
      }
    }
    expect(alambres).toBeGreaterThan(0);
  });

  it('la dificultad también es de caja: Fácil arranca con colchón, Difícil más corto', () => {
    const facil = createNewGame(3, 'facil');
    const medio = createNewGame(3, 'medio');
    const dificil = createNewGame(3, 'dificil');
    expect(facil.club.money).toBe(medio.club.money + BALANCE.absenceDifficulty.facil.cajaExtra);
    expect(dificil.club.money).toBe(medio.club.money + BALANCE.absenceDifficulty.dificil.cajaExtra);
    expect(facil.startingMoney).toBe(facil.club.money);
  });
});
