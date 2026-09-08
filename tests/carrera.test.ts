import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { buildLibreta, favorChance } from '../src/game/carrera';
import { marketReference } from '../src/game/conduct';
import { activePlayers } from '../src/game/match';
import { createCareerNewGame, startPreseason } from '../src/game/preseason';
import { Rng } from '../src/game/rng';
import type { GameState } from '../src/game/types';
import { jugarTemporada, paso } from './jugar';

const C = BALANCE.carrera;
const MIN = BALANCE.preseason.minPlayers;

function fundar(seed: number): GameState {
  return paso(null as unknown as GameState, {
    type: 'LOAD',
    state: createCareerNewGame(seed, 'medio', { clubName: 'Club de Prueba', colors: ['#111111', '#eeeeee'] }),
  });
}

/** Cierra eventos y modales pendientes de la pretemporada. */
function limpiar(s: GameState): GameState {
  let guard = 0;
  while (s.preseason && (s.preseason.pendingEvent || s.preseason.actionOutcome || s.preseason.eventOutcome)) {
    if (++guard > 10) throw new Error('modales sin fin');
    if (s.preseason.pendingEvent) {
      s = paso(s, { type: 'PS_RESOLVE_EVENT', optionIndex: 0 });
      s = paso(s, { type: 'PS_DISMISS_EVENT_OUTCOME' });
    }
    if (s.preseason?.actionOutcome) s = paso(s, { type: 'PS_DISMISS_OUTCOME' });
    if (s.preseason?.eventOutcome) s = paso(s, { type: 'PS_DISMISS_EVENT_OUTCOME' });
  }
  return s;
}

/** Le pide el favor a un contacto y cierra el desenlace. */
function pedir(s: GameState, id: string): GameState {
  s = paso(s, { type: 'PS_OPEN_NEGOTIATION', id, isMarket: true });
  s = paso(s, { type: 'PS_NEGOTIATE', decision: 'accept' });
  return limpiar(s);
}

/** Pide favores a todos los disponibles, semana a semana, hasta cerrar. */
function jugarLibreta(s: GameState, seed: number): GameState {
  const rng = new Rng(seed);
  let guard = 0;
  while (s.phase === 'preseason') {
    if (++guard > 40) throw new Error('la libreta no termina');
    s = limpiar(s);
    const ps = s.preseason!;
    const disponibles = rng.shuffle(ps.market.filter((m) => m.status === 'disponible'));
    if (ps.gestionesLeft > 0 && disponibles.length > 0) {
      s = pedir(s, disponibles[0].id);
      continue;
    }
    s = ps.week >= ps.totalWeeks ? paso(s, { type: 'PS_CLOSE' }) : paso(s, { type: 'PS_ADVANCE' });
  }
  return s;
}

describe('fundar el club (modo Carrera)', () => {
  const s = fundar(3);

  it('arranca sin plantel, con la libreta abierta y el nombre y los colores elegidos', () => {
    expect(s.mode).toBe('carrera');
    expect(s.phase).toBe('preseason');
    expect(s.players).toHaveLength(0);
    expect(s.club.name).toBe('Club de Prueba');
    expect(s.club.colors).toEqual(['#111111', '#eeeeee']);
    expect(s.club.money).toBe(C.startingMoney);
    expect(s.preseason!.libreta).toBe(true);
    expect(s.preseason!.chosenDivisionId).toBeNull();
  });

  it('la libreta tiene entre 6 y 8 contactos, el íntimo primero, todos favores sin pase', () => {
    const libreta = s.preseason!.market;
    expect(libreta.length).toBeGreaterThanOrEqual(C.contactosMin);
    expect(libreta.length).toBeLessThanOrEqual(C.contactosMax);
    expect(libreta[0].knowledge).toBe('muy_conocido');
    expect(libreta[0].relacion).toMatch(/toda la vida/);
    for (const c of libreta) {
      expect(c.signingCost).toBe(0);
      expect(c.viaDe).toBe('vos');
      expect(c.relacion).toBeTruthy();
      expect(c.porQue).toBeTruthy();
    }
    expect(new Set(libreta.map((c) => c.name)).size).toBe(libreta.length);
  });

  it('el íntimo dice que sí siempre; a los demás les cuesta más sin nadie confirmado', () => {
    const [intimo, otro] = s.preseason!.market;
    expect(favorChance(s, intimo)).toBe(1);
    expect(favorChance(s, otro)).toBe(C.favorBase);
  });

  it('la libreta se genera igual con la misma semilla', () => {
    const a = buildLibreta(new Rng(9)).map((c) => c.name);
    const b = buildLibreta(new Rng(9)).map((c) => c.name);
    expect(a).toEqual(b);
  });
});

describe('pedir favores', () => {
  it('firmar al íntimo lo suma al plantel confirmado y abre su agenda', () => {
    let s = fundar(3);
    const intimo = s.preseason!.market[0];
    const antes = s.preseason!.market.length;
    s = pedir(s, intimo.id);
    expect(activePlayers(s.players)).toHaveLength(1);
    expect(s.preseason!.continuity[s.players[0].id]).toBe('confirmado');
    expect(s.preseason!.market.find((m) => m.id === intimo.id)!.status).toBe('fichado');
    const nuevos = s.preseason!.market.slice(antes);
    expect(nuevos.length).toBeGreaterThanOrEqual(1);
    for (const n of nuevos) {
      expect(n.viaDe).toBe(intimo.name);
      expect(n.relacion).toContain(intimo.name.split(' ')[0]);
      expect(n.knowledge).toBe('referencias');
    }
  });

  it('el que lo trae lo recomienda como amigo: la referencia miente por lealtad', () => {
    let s = fundar(3);
    s = pedir(s, s.preseason!.market[0].id);
    const traido = s.preseason!.market.find((m) => m.viaDe !== 'vos')!;
    const ref = marketReference(traido);
    expect(ref.who).toContain('que lo trae');
    expect(ref.quote).not.toMatch(/cuando quiere/);
  });

  it('un favor negado deja al contacto disponible con una duda; a la segunda dice que no', () => {
    // Semillas distintas hasta encontrar una negativa: el favor es azar.
    let encontrado = false;
    for (let seed = 1; seed < 40 && !encontrado; seed++) {
      let s = fundar(seed);
      const otro = s.preseason!.market[1];
      s = pedir(s, otro.id);
      const mp = s.preseason!.market.find((m) => m.id === otro.id)!;
      if (mp.status === 'disponible') {
        encontrado = true;
        expect(mp.dudas).toBe(1);
        expect(activePlayers(s.players)).toHaveLength(0);
        expect(s.preseason!.gestionesLeft).toBe(BALANCE.preseason.gestionesPerWeek - 1);
        // Insistir puede terminar en un no definitivo.
        let s2 = pedir(s, otro.id);
        const mp2 = s2.preseason!.market.find((m) => m.id === otro.id)!;
        expect(['fichado', 'disponible', 'rechazo']).toContain(mp2.status);
        if (mp2.status === 'disponible') {
          s2 = pedir(s2, otro.id);
          expect(s2.preseason!.market.find((m) => m.id === otro.id)!.status).toMatch(/fichado|rechazo/);
        }
      }
    }
    expect(encontrado).toBe(true);
  });

  it('con más confirmados el favor es más fácil', () => {
    let s = fundar(3);
    const otro = s.preseason!.market[1];
    const antes = favorChance(s, otro);
    s = pedir(s, s.preseason!.market[0].id);
    expect(favorChance(s, otro)).toBeGreaterThan(antes);
  });
});

describe('ocho en cuatro semanas', () => {
  it('cerrar sin los ocho termina la partida antes de la primera fecha, sin jugadores de emergencia', () => {
    let s = fundar(3);
    s = pedir(s, s.preseason!.market[0].id);
    for (let i = 0; i < 3; i++) s = paso(limpiar(s), { type: 'PS_ADVANCE' });
    s = paso(limpiar(s), { type: 'PS_CLOSE' });
    expect(s.phase).toBe('gameOver');
    expect(s.gameOverReason).toMatch(/no juntaste/i);
    expect(activePlayers(s.players)).toHaveLength(1);
    expect(s.preseason!.summary!.emergency).toHaveLength(0);
  });

  it('pidiendo favores todas las semanas se puede llegar, y la temporada arranca con el club nuevo', () => {
    let llego: GameState | null = null;
    for (let seed = 1; seed < 30 && !llego; seed++) {
      const s = jugarLibreta(fundar(seed), seed);
      if (s.phase === 'preseasonEnd') llego = s;
    }
    expect(llego).not.toBeNull();
    const s = paso(llego!, { type: 'START_SEASON' });
    expect(s.phase).toBe('planning');
    expect(s.mode).toBe('carrera');
    expect(activePlayers(s.players).length).toBeGreaterThanOrEqual(MIN);
    expect(s.club.name).toBe('Club de Prueba');
    expect(s.world.clubs.find((c) => c.isUser)!.colors).toEqual(['#111111', '#eeeeee']);
  });

  it('y también se puede perder: no todas las carreras llegan', () => {
    const resultados = new Set<string>();
    for (let seed = 1; seed < 30; seed++) resultados.add(jugarLibreta(fundar(seed), seed).phase);
    expect(resultados.has('gameOver')).toBe(true);
    expect(resultados.has('preseasonEnd')).toBe(true);
  });

  it('el mercado de verdad llega en la segunda temporada', () => {
    let llego: GameState | null = null;
    for (let seed = 1; seed < 30 && !llego; seed++) {
      const s = jugarLibreta(fundar(seed), seed);
      if (s.phase === 'preseasonEnd') llego = s;
    }
    let s = paso(llego!, { type: 'START_SEASON' });
    s = jugarTemporada({ ...s, club: { ...s.club, money: 3000 } });
    expect(s.phase).toBe('seasonEnd');
    s = startPreseason(s);
    expect(s.mode).toBe('carrera');
    expect(s.preseason!.libreta).toBeFalsy();
    expect(s.preseason!.market.length).toBeGreaterThanOrEqual(10);
    expect(s.club.colors).toEqual(['#111111', '#eeeeee']);
  });
});
