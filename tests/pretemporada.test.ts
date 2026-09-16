import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { activePlayers } from '../src/game/match';
import { confirmedPlayers, createPreseasonNewGame, inscriptionOffer } from '../src/game/preseason';
import type { GameState } from '../src/game/types';
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
    let ascensos = 0;
    for (let seed = 1; seed <= 16; seed++) {
      const a = paso({ ...subcampeon, seed }, { type: 'NEW_SEASON' });
      const log = a.preseason!.log;
      expect(log.some((l) => /El título pesa/.test(l))).toBe(false);
      if (log.some((l) => /El ascenso pesa/.test(l))) ascensos += 1;
    }
    expect(ascensos).toBeGreaterThan(0);
  });
});
