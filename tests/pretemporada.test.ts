import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { activePlayers } from '../src/game/match';
import { computeSeasonEvaluation } from '../src/game/evaluation';
import { confirmedPlayers, createPreseasonNewGame, inscriptionOffer } from '../src/game/preseason';
import { PRESEASON_EVENTS } from '../src/game/preseasonEvents';
import type { GameState } from '../src/game/types';
import { marketToPlayer, worldToMarket } from '../src/data/market';
import { Rng } from '../src/game/rng';
import { fechaCorta, semanaDeCierre } from '../src/game/timeline';
import { largoDeTemporada } from '../src/ui/Timeline';
import { jugarTemporada, partidaNueva, paso } from './jugar';

/** Avanza la pretemporada semana a semana sin contactar a nadie y la cierra. */
function cerrarSinJugarla(s: GameState): GameState {
  let guard = 0;
  while (s.phase === 'preseason') {
    if (++guard > 12) throw new Error('la pretemporada no cierra nunca');
    const ps = s.preseason!;
    if (ps.pendingEvent) {
      s = paso(s, { type: 'PS_RESOLVE_EVENT', optionIndex: 0 });
      s = paso(s, { type: 'PS_DISMISS_EVENT_OUTCOME' });
      continue;
    }
    s = ps.week >= ps.totalWeeks ? paso(s, { type: 'PS_CLOSE' }) : paso(s, { type: 'PS_ADVANCE' });
  }
  return s;
}

describe('la pretemporada de una partida nueva', () => {
  const inicio = paso(null as unknown as GameState, { type: 'LOAD', state: createPreseasonNewGame(5) });

  it('arranca con la inscripción abierta y sin liga elegida', () => {
    expect(inicio.phase).toBe('preseason');
    expect(inicio.preseason!.week).toBe(1);
    expect(inicio.preseason!.chosenDivisionId).toBeNull();
    expect(inicio.preseason!.gestionesLeft).toBe(BALANCE.preseason.gestionesPerWeek);
  });

  it('la oferta de ligas tiene al menos la de siempre (abierta) y una alternativa', () => {
    const offer = inscriptionOffer(inicio);
    expect(offer.length).toBeGreaterThanOrEqual(2);
    const actual = offer.find((o) => o.isCurrent)!;
    expect(actual).toBeDefined();
    expect(actual.locked).toBeFalsy();
    expect(actual.trusts).toBe(true);
    for (const o of offer) {
      expect(o.weeks).toBeGreaterThan(0);
      expect(o.gameTimes.length).toBeGreaterThan(0);
    }
  });

  it('no deja elegir una liga que no está en la oferta o que te rechaza', () => {
    const cerrada = inscriptionOffer(inicio).find((o) => o.locked);
    const s1 = paso(inicio, { type: 'PS_CHOOSE_LEAGUE', divisionId: 'dv_no_existe' });
    expect(s1.preseason!.chosenDivisionId).toBeNull();
    if (cerrada) {
      const s2 = paso(inicio, { type: 'PS_CHOOSE_LEAGUE', divisionId: cerrada.divisionId });
      expect(s2.preseason!.chosenDivisionId).toBeNull();
    }
  });

  it('elegir la liga de siempre y cerrar deja al club inscripto y con plantel para jugar', () => {
    const actual = inscriptionOffer(inicio).find((o) => o.isCurrent)!;
    let s = paso(inicio, { type: 'PS_CHOOSE_LEAGUE', divisionId: actual.divisionId });
    expect(s.preseason!.chosenDivisionId).toBe(actual.divisionId);

    s = cerrarSinJugarla(s);
    expect(s.phase).toBe('preseasonEnd');
    expect(s.preseason!.summary).not.toBeNull();

    s = paso(s, { type: 'START_SEASON' });
    expect(s.phase).toBe('planning');
    expect(s.week).toBe(1);
    // "Arrancaste con" es la caja del arranque de la temporada, no la de antes de la pretemporada.
    expect(s.startingMoney).toBe(s.club.money);
    expect(s.divisionId).toBe(actual.divisionId);
    expect(activePlayers(s.players).length).toBeGreaterThanOrEqual(BALANCE.preseason.minPlayers);
    // La temporada que arranca es coherente con la liga elegida.
    expect(s.seasonLength).toBe(s.rivals.length);
    expect(s.schedule).toHaveLength(s.seasonLength);
    expect(s.standings).toHaveLength(s.rivals.length + 1);
    expect(s.standings.every((r) => r.wins === 0 && r.losses === 0)).toBe(true);
  });

  it('cerrar sin elegir liga te anota igual en la de siempre, con recargo', () => {
    const cajaAntes = inicio.club.money;
    const s = cerrarSinJugarla(inicio);
    expect(s.phase).toBe('preseasonEnd');
    const actual = inscriptionOffer(inicio).find((o) => o.isCurrent)!;
    const jugando = paso(s, { type: 'START_SEASON' });
    expect(jugando.divisionId).toBe(actual.divisionId);
    expect(jugando.club.money).toBeLessThan(cajaAntes);
    expect(confirmedPlayers(s).length).toBeGreaterThanOrEqual(BALANCE.preseason.minPlayers);
  });
});

describe('la tesorera mira la ficha de verdad', () => {
  const evento = PRESEASON_EVENTS.find((e) => e.id === 'ps_rifa_urgente')!;
  const base = paso(null as unknown as GameState, { type: 'LOAD', state: createPreseasonNewGame(5) });
  const actual = inscriptionOffer(base).find((o) => o.isCurrent)!;
  const conCaja = (money: number, week = base.preseason!.totalWeeks - 1): GameState => {
    const s: GameState = structuredClone(base);
    s.club.money = money;
    s.preseason!.week = week;
    s.preseason!.chosenDivisionId = actual.divisionId;
    return s;
  };

  it('no avisa que "la caja no llega" cuando la caja cubre la ficha y el mantenimiento que queda', () => {
    // Una semana antes del cierre queda un mantenimiento por pagar.
    const sobra = conCaja(actual.fee + BALANCE.preseason.weeklyUpkeep + 10);
    expect(evento.canFire(sobra)).toBe(false);
  });

  it('avisa cuando falta, y dice cuánto cuesta la ficha de la liga elegida', () => {
    const corta = conCaja(actual.fee - 50);
    expect(evento.canFire(corta)).toBe(true);
    expect(evento.text(corta, [])).toContain(`hay $${actual.fee - 50} y la inscripción cuesta $${actual.fee}`);
    // Cubre la ficha pero no el mantenimiento que queda: lo dice con las dos cifras.
    const justa = conCaja(actual.fee + 10);
    expect(evento.canFire(justa)).toBe(true);
    expect(evento.text(justa, [])).toContain(`de acá al cierre se van otros $${BALANCE.preseason.weeklyUpkeep}`);
  });
});

describe('el cierre no se contradice con el que firmó y después se borró', () => {
  it('no lo lista como fichaje ni le deja una promesa viva: está en "no siguieron"', () => {
    let s = paso(null as unknown as GameState, { type: 'LOAD', state: createPreseasonNewGame(5) });
    s = { ...s, club: { ...s.club, money: 5000 } };
    const mp = s.preseason!.market.find((m) => m.status === 'disponible')!;
    s = paso(s, { type: 'PS_OPEN_NEGOTIATION', id: mp.id, isMarket: true });
    s = paso(s, { type: 'PS_NEGOTIATE', decision: 'accept' });
    s = paso(s, { type: 'PS_DISMISS_OUTCOME' });
    const fichado = s.players.find((p) => !p.leftClub && p.name === mp.name)!;
    expect(fichado).toBeDefined();
    expect(s.preseason!.continuity[fichado.id]).toBe('confirmado');
    // Se borra antes del cierre (el evento "Un confirmado se borró"), con una
    // promesa hecha en la negociación.
    const conPromesa: GameState = structuredClone(s);
    conPromesa.preseason!.continuity[fichado.id] = 'no_respondio';
    if (!conPromesa.promises.some((pr) => pr.playerId === fichado.id)) {
      conPromesa.promises.push({ playerId: fichado.id, playerName: fichado.name, type: 'cuota', label: `${fichado.name}: Pagar media cuota`, season: s.seasonNumber });
    }
    const fin = cerrarSinJugarla(conPromesa);
    expect(fin.phase).toBe('preseasonEnd');
    const summary = fin.preseason!.summary!;
    expect(summary.lost.some((e) => e.id === fichado.id)).toBe(true);
    expect(summary.signed.some((e) => e.label === fichado.name)).toBe(false);
    expect(summary.roster.some((e) => e.id === fichado.id)).toBe(false);
    expect(summary.promises.some((l) => l.includes(fichado.name))).toBe(false);
    expect(fin.promises.some((pr) => pr.playerId === fichado.id)).toBe(false);
    // El que firmó y sigue, en cambio, es fichaje con ficha.
    const sigue = cerrarSinJugarla(s).preseason!.summary!;
    expect(sigue.signed.some((e) => e.id === fichado.id)).toBe(true);
  });
});

describe('de una temporada a la siguiente', () => {
  it('el cierre abre la pretemporada con el mismo plantel, y el verano mueve al mundo', () => {
    // Sin gestión del manager la caja puede quebrar antes del cierre (hallazgo
    // 13 del diagnóstico): acá se mide el paso de temporada, no la economía.
    const arranque = partidaNueva(9);
    const fin = jugarTemporada({ ...arranque, club: { ...arranque.club, money: 3000 } });
    expect(fin.phase).toBe('seasonEnd');
    const personasAntes = new Set(fin.world.players.map((p) => p.id));

    const ps = paso(fin, { type: 'NEW_SEASON' });
    expect(ps.phase).toBe('preseason');
    expect(ps.seasonNumber).toBe(fin.seasonNumber + 1);
    expect(ps.pastSeasons).toHaveLength(fin.pastSeasons.length + 1);
    // Los que estaban siguen siendo los mismos ids: nadie se regenera.
    const idsAntes = new Set(activePlayers(fin.players).map((p) => p.id));
    for (const p of activePlayers(ps.players)) expect(idsAntes.has(p.id)).toBe(true);
    // El mundo tiene memoria: la mayoría de las personas del año pasado siguen ahí.
    const siguen = ps.world.players.filter((p) => personasAntes.has(p.id)).length;
    expect(siguen / personasAntes.size).toBeGreaterThan(0.6);
  });

  it('la historia del club anota el cierre después de los playoffs, con su etiqueta, y recuerda cuántas fechas tuvo cada temporada', () => {
    // Antes: "T1 · Sem 9 · Cierra la temporada 1" encima de "T1 · Sem 10 ·
    // Quedamos afuera en la semifinal", y la semifinal decía "Sem 10".
    const arranque = partidaNueva(9);
    const fin = jugarTemporada({ ...arranque, club: { ...arranque.club, money: 3000 } });
    const ps = paso(fin, { type: 'NEW_SEASON' });
    const cierre = ps.clubTimeline.find((e) => /^Cierra la temporada 1/.test(e.text))!;
    expect(cierre.week).toBe(semanaDeCierre(fin));
    expect(fechaCorta(cierre.week, fin.seasonLength)).toBe('Cierre');
    expect(fechaCorta(fin.seasonLength + 1, fin.seasonLength)).toBe('Semis');
    expect(fechaCorta(fin.seasonLength + 2, fin.seasonLength)).toBe('Final');
    expect(fechaCorta(fin.seasonLength, fin.seasonLength)).toBe(`Sem ${fin.seasonLength}`);
    expect(fechaCorta(0, fin.seasonLength)).toBe('Pretemp.');
    // Ningún hito de la temporada 1 quedó anotado después del cierre.
    const idx = ps.clubTimeline.indexOf(cierre);
    for (const e of ps.clubTimeline.slice(0, idx)) if (e.season === 1) expect(e.week).toBeLessThanOrEqual(cierre.week);
    // Y el palmarés recuerda las fechas de la temporada, para etiquetar sus semanas.
    expect(ps.pastSeasons.at(-1)!.seasonLength).toBe(fin.seasonLength);
    expect(largoDeTemporada({ ...ps, seasonLength: 7 })(1)).toBe(fin.seasonLength);
    expect(largoDeTemporada({ ...ps, seasonLength: 7 })(2)).toBe(7);
  });

  it('el dúo que viene junto desde el mundo se muda al club: el pool no los tiene dos veces', () => {
    // El fuzz lo encontró: firmados por el evento, seguían en el pool como
    // libres, y al verano siguiente "se acomodaban solos" en otro club con tu
    // mismo jugador adentro (dos "Alejo Camejo", uno nuestro y uno rival).
    const arranque = partidaNueva(9);
    const fin = jugarTemporada({ ...arranque, club: { ...arranque.club, money: 3000 } });
    let s = paso(fin, { type: 'NEW_SEASON' });
    const rng = new Rng(3);
    const [wa, wb] = s.world.players.slice(0, 2);
    const a = { ...worldToMarket(wa, 'Otro Club', rng), demand: null };
    const b = { ...worldToMarket(wb, 'Otro Club', rng), demand: null };
    s = {
      ...s,
      club: { ...s.club, money: 5000 },
      preseason: { ...s.preseason!, market: [...s.preseason!.market, a, b], pendingEvent: { defId: 'ps_duo_amigos', targetIds: [a.id, b.id] } },
    };
    s = paso(s, { type: 'PS_RESOLVE_EVENT', optionIndex: 0 });
    expect(s.players.map((p) => p.name)).toEqual(expect.arrayContaining([a.name, b.name]));
    expect(s.world.players.some((wp) => wp.id === wa.id || wp.id === wb.id)).toBe(false);
  });
});

describe('la memoria entre temporadas: el título y la bronca cruzan el verano', () => {
  const arranque = partidaNueva(9);
  const fin = jugarTemporada({ ...arranque, club: { ...arranque.club, money: 3000 } });
  const confirmados = (s: GameState) => Object.values(s.preseason!.continuity).filter((c) => c === 'confirmado').length;

  it('el que se fue masticando bronca no vuelve como si nada, y la pretemporada lo cuenta', () => {
    // Un leal, que siempre confirma, con una ruptura viva al cierre.
    const leal = activePlayers(fin.players).find((p) => p.personality === 'leal') ?? activePlayers(fin.players)[0];
    const conBronca: GameState = structuredClone(fin);
    const p = conBronca.players.find((x) => x.id === leal.id)!;
    p.grievance = { cause: 'minutos', level: 3, hits: 4, season: fin.seasonNumber, sinceWeek: 3, lastHitWeek: fin.seasonLength };
    p.grudge = null;
    let vistos = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const ps = paso({ ...conBronca, seed }, { type: 'NEW_SEASON' });
      const st = ps.preseason!.continuity[leal.id];
      // Red de seguridad aparte (mínimo de confirmados), la bronca nunca deja un "confirmado" limpio.
      if (st === 'confirmado') continue;
      vistos += 1;
      expect(['quiere_irse', 'pide_condicion', 'dudando']).toContain(st);
      if (st === 'pide_condicion') expect(ps.preseason!.playerDemands[leal.id]).toBe('minutos');
      expect(ps.preseason!.log.some((l) => l.includes(leal.name) && /bronca|cuenta hecha|bolso/.test(l))).toBe(true);
    }
    expect(vistos).toBeGreaterThan(0);
    // Sin bronca, el leal confirma siempre.
    const sinBronca = paso({ ...fin, seed: 1 }, { type: 'NEW_SEASON' });
    expect(sinBronca.preseason!.continuity[leal.id]).toBe('confirmado');
  });

  it('el campeón vuelve con más ganas y menos ganas de irse', () => {
    const campeon: GameState = structuredClone(fin);
    campeon.playoffs = { qualified: true, userCup: 'oro', ties: [], champions: { oro: 'club' } };
    let conTitulo = 0;
    let sinTitulo = 0;
    let logs = 0;
    for (let seed = 1; seed <= 16; seed++) {
      const a = paso({ ...campeon, seed }, { type: 'NEW_SEASON' });
      const b = paso({ ...fin, playoffs: null, seed }, { type: 'NEW_SEASON' });
      conTitulo += confirmados(a);
      sinTitulo += confirmados(b);
      if (a.preseason!.log.some((l) => /El título pesa/.test(l))) logs += 1;
      const moralA = activePlayers(a.players).reduce((t, p) => t + p.motivation, 0) / activePlayers(a.players).length;
      const moralB = activePlayers(b.players).reduce((t, p) => t + p.motivation, 0) / activePlayers(b.players).length;
      expect(moralA).toBeGreaterThan(moralB);
    }
    expect(conTitulo).toBeGreaterThan(sinTitulo);
    expect(logs).toBeGreaterThan(0);
  });

  it('el subcampeón que sube sin copa lo cuenta como ascenso, no como título', () => {
    // Perdió la final de la Copa de Oro: no hay título, pero los dos finalistas suben.
    const rival = fin.rivals[0];
    const subcampeon: GameState = structuredClone(fin);
    subcampeon.playoffs = {
      qualified: true,
      userCup: 'oro',
      ties: [
        { id: 'f', cup: 'oro', round: 'final', week: fin.seasonLength + 2, homeId: 'club', awayId: rival.id, scoreHome: 60, scoreAway: 70, winnerId: rival.id, isUserMatch: true },
      ],
      champions: { oro: rival.id },
    };
    // El cierre lo llama subcampeón sólo si la final perdida fue la de Oro:
    // la de Plata (los del 5° al 8°) es "Finalistas de la Copa de Plata".
    expect(computeSeasonEvaluation(subcampeon).outcomeTitle).toMatch(/Subcampeones/);
    const plata: GameState = structuredClone(subcampeon);
    plata.playoffs = { ...plata.playoffs!, userCup: 'plata', ties: [{ ...plata.playoffs!.ties[0], cup: 'plata' }], champions: { plata: rival.id } };
    expect(computeSeasonEvaluation(plata).outcomeTitle).toMatch(/Finalistas de la Copa de Plata/);
    expect(computeSeasonEvaluation(plata).outcomeTitle).not.toMatch(/Subcampeones/);
    let ascensos = 0;
    for (let seed = 1; seed <= 16; seed++) {
      const a = paso({ ...subcampeon, seed }, { type: 'NEW_SEASON' });
      const log = a.preseason!.log;
      expect(log.some((l) => /El título pesa/.test(l))).toBe(false);
      if (log.some((l) => /El ascenso pesa/.test(l))) ascensos += 1;
      // Y la inscripción no le dice "tu categoría de siempre" a la divisional
      // que pisa por primera vez: le dice que subió, y de dónde.
      expect(a.divisionId).not.toBe(fin.divisionId);
      expect(a.preseason!.movido).toEqual({ kind: 'ascenso', fromDivisionId: fin.divisionId });
      // Y el palmarés anota en qué categoría se jugó y que el año terminó subiendo.
      const ultima = a.pastSeasons[a.pastSeasons.length - 1];
      expect(ultima.division).toMatch(/Liga Universitaria · Divisional/);
      expect(ultima.moved?.kind).toBe('ascenso');
      expect(ultima.moved?.to).toBeTruthy();
      const actual = inscriptionOffer(a).find((o) => o.isCurrent)!;
      expect(actual.note).toMatch(/La categoría a la que subiste/);
      expect(actual.note).not.toMatch(/de siempre/);
      expect(actual.trusts).toBe(true);
    }
    expect(ascensos).toBeGreaterThan(0);
    // Sin movimiento, la de siempre sigue siendo la de siempre.
    const quieto = paso({ ...fin, playoffs: null, seed: 1 }, { type: 'NEW_SEASON' });
    expect(quieto.preseason!.movido).toBeUndefined();
    expect(inscriptionOffer(quieto).find((o) => o.isCurrent)!.note).toMatch(/de siempre/);
    expect(quieto.pastSeasons[quieto.pastSeasons.length - 1].moved).toBeUndefined();
  });
});

/**
 * El id del fichado lleva la temporada: los ids de mercado (mk1, mk2…) se
 * repiten cada verano, y sin ella el mk5 de la T2 heredaba el id del mk5 de la
 * T1 si los nombres medían lo mismo. Dos personas con un id: las estadísticas
 * se sumaban en una y la ficha abría la otra. Lo encontró el fuzz (sep 2026).
 */
describe('el id del fichado es único entre temporadas (sep 2026)', () => {
  it('el mismo lugar del mercado da ids distintos en la T1 y la T2', () => {
    const s = createPreseasonNewGame(5);
    const mp = s.preseason!.market[0];
    const t1 = marketToPlayer(mp, 'pagada', 'suplente', 1, new Rng(1));
    const t2 = marketToPlayer(mp, 'pagada', 'suplente', 2, new Rng(1));
    expect(t1.id).not.toBe(t2.id);
    expect(t1.id).toMatch(/^sg_1_/);
    expect(t2.id).toMatch(/^sg_2_/);
    // Y dos lugares distintos del mismo mercado tampoco se pisan.
    const otro = marketToPlayer(s.preseason!.market[1], 'pagada', 'suplente', 1, new Rng(1));
    expect(otro.id).not.toBe(t1.id);
  });
});
