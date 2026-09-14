import { describe, expect, it } from 'vitest';
import { defaultMatchPlan, isSelectable, PLAN_MIN_BENCH, posicionesSinCubrir } from '../src/game/match';
import { Rng } from '../src/game/rng';
import { weeklyGrievanceTriggers } from '../src/game/week';
import type { GameState, Position } from '../src/game/types';
import { jugarFecha, jugarPartidoEntero, partidaNueva, paso, resolverEventos } from './jugar';

/** Una partida nueva llevada hasta el salto inicial de la fecha 1, con el quinteto sugerido. */
function hastaElPartido(seed: number) {
  let s = resolverEventos(partidaNueva(seed));
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  return paso(s, { type: 'START_MATCH' });
}

function cuarto(s: GameState) {
  s = s.live!.pendingIncident ? paso(s, { type: 'INCIDENT_CHOICE', index: 0 }) : s;
  return paso(s, { type: 'PLAY_QUARTER' });
}

describe('T4 · jugar con cinco dejó de ser el default', () => {
  it('el plan por defecto rota si hay banco, y queda a mano si no', () => {
    expect(defaultMatchPlan(0)).toBe('manual');
    expect(defaultMatchPlan(PLAN_MIN_BENCH - 1)).toBe('manual');
    expect(defaultMatchPlan(PLAN_MIN_BENCH)).toBe('rotar');
    expect(defaultMatchPlan(5)).toBe('rotar');
  });

  it('sin DT y con banco, el partido arranca con el plan "rotar" y el banco suma minutos', () => {
    const inicio = hastaElPartido(11);
    expect(inicio.phase).toBe('match');
    expect(inicio.coach).toBeNull();
    const banco = inicio.live!.squad.filter((id) => !inicio.live!.onCourt.includes(id));
    expect(banco.length).toBeGreaterThanOrEqual(PLAN_MIN_BENCH);
    expect(inicio.live!.plan).toBe('rotar');

    // 1er cuarto: el arranque es tuyo. 2° cuarto: entra la unidad de piernas frescas.
    let s = cuarto(inicio);
    expect(s.live!.onCourt).toEqual(inicio.live!.onCourt);
    s = cuarto(s);
    expect(s.live!.quarters[1].notes.some((n) => /Plan de cambios/.test(n))).toBe(true);
    expect(banco.some((id) => (s.live!.minutes[id] ?? 0) > 0)).toBe(true);

    // Al final del partido, los cinco del arranque no jugaron los 40 minutos.
    s = jugarPartidoEntero(s);
    const titulares = inicio.live!.onCourt;
    expect(titulares.every((id) => s.live!.minutes[id] < 40)).toBe(true);
    expect(banco.reduce((t, id) => t + (s.live!.minutes[id] ?? 0), 0)).toBeGreaterThan(0);
  });

  it('con el plan "a mano" los cinco se quedan hasta que vos los muevas', () => {
    let s = hastaElPartido(11);
    s = paso(s, { type: 'SET_MATCH_PLAN', plan: 'manual' });
    expect(s.live!.plan).toBe('manual');
    const arranque = s.live!.onCourt;
    s = cuarto(s);
    s = cuarto(s);
    if (!(s.live!.injuries ?? []).length) {
      expect(s.live!.onCourt).toEqual(arranque);
      expect(s.live!.quarters[1].notes.some((n) => /Plan de cambios/.test(n))).toBe(false);
    }
  });

  it('un cambio a mano en el descanso frena el plan por ese cuarto, y el siguiente vuelve a rotar', () => {
    let s = hastaElPartido(11);
    s = cuarto(s);
    const sale = s.live!.onCourt[0];
    const entra = s.live!.squad.find((id) => !s.live!.onCourt.includes(id))!;
    s = paso(s, { type: 'SUBSTITUTE', outId: sale, inId: entra });
    expect(s.live!.onCourt).toContain(entra);
    expect(s.live!.manualBreak).toBe(true);
    s = cuarto(s);
    // El 2° cuarto se jugó con el quinteto que dejaste, no con "frescos".
    expect(s.live!.quarters[1].notes.some((n) => /respeta los cambios/.test(n))).toBe(true);
    expect(s.live!.quarters[1].notes.some((n) => /Plan de cambios/.test(n))).toBe(false);
    expect(s.live!.manualBreak).toBe(false);
    // El 3° cuarto vuelve al plan: titulares.
    s = cuarto(s);
    expect(s.live!.quarters[2].notes.some((n) => /Plan de cambios: vuelven los titulares/.test(n))).toBe(true);
  });
});

const POSICIONES: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

/** Los que pueden entrar en este partido, en cancha y en el banco. */
function cancha(s: GameState) {
  const live = s.live!;
  const puede = (id: string) => isSelectable(s.players.find((p) => p.id === id)!) && !(live.fueraDelPartido ?? []).includes(id);
  return {
    enCancha: live.onCourt.filter(puede),
    banco: live.squad.filter((id) => !live.onCourt.includes(id) && puede(id)),
  };
}

const jugador = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;

describe('la rotación respeta las posiciones (lo que quedaba del informe de testing)', () => {
  it('"Piernas frescas" no deja un puesto sin cubrir si hay con quién cubrirlo', () => {
    // Primer cuarto jugado; en el descanso el plan manda a los frescos.
    const s = cuarto(hastaElPartido(11));
    const { enCancha, banco } = cancha(s);
    if (enCancha.length < 5 || banco.length < 5) return;
    // Los cinco del banco son los más frescos, pero son dos bases y ningún
    // pívot; el pívot con piernas es un titular. Ingenuamente, "frescos" lo
    // dejaría afuera.
    const posBanco: Position[] = ['Base', 'Base', 'Escolta', 'Alero', 'Ala-Pívot'];
    banco.forEach((id, i) => {
      jugador(s, id).position = posBanco[i] ?? 'Alero';
      s.live!.playerFresh[id] = 95 - i;
    });
    enCancha.forEach((id, i) => {
      jugador(s, id).position = POSICIONES[i];
      s.live!.playerFresh[id] = i === 4 ? 70 : 30;
    });
    const s2 = cuarto(s);
    expect(s2.live!.quarters[1].notes.some((n) => /Piernas frescas/.test(n))).toBe(true);
    const cinco = s2.live!.quarters[1].onCourt!.map((id) => jugador(s2, id));
    expect(posicionesSinCubrir(cinco)).toEqual([]);
    expect(cinco.some((p) => p.id === enCancha[4])).toBe(true);
  });

  it('el DT que lee el juego cambia a un fundido por uno de su puesto; el que no, mete al más fresco y el relato lo dice', () => {
    const conDT = (tactics: number) => {
      const base = cuarto(hastaElPartido(11));
      const profe = base.coachMarket.find((c) => c.profile === 'profe')!;
      const s: GameState = { ...base, coach: { ...profe, tactics, directive: 'ganar' }, live: { ...base.live!, autoRotation: true, plan: 'manual' } };
      const { enCancha, banco } = cancha(s);
      if (enCancha.length < 5 || banco.length < 2) return null;
      // El base en cancha está fundido y es el único base; en el banco hay un
      // base con piernas y un alero todavía más fresco.
      enCancha.forEach((id, i) => {
        jugador(s, id).position = POSICIONES[i];
        s.live!.playerFresh[id] = i === 0 ? 10 : 90;
      });
      banco.forEach((id, i) => {
        jugador(s, id).position = i === 0 ? 'Base' : 'Alero';
        s.live!.playerFresh[id] = i === 0 ? 80 : 95;
      });
      const s2 = cuarto(s);
      return { s2, saliente: enCancha[0], baseDelBanco: banco[0], aleroFresco: banco[1] };
    };

    const lee = conDT(75);
    if (lee) {
      const notas = lee.s2.live!.quarters[1].notes;
      expect(notas.some((n) => /Cambio de .*: entra/.test(n))).toBe(true);
      expect(lee.s2.live!.quarters[1].onCourt).toContain(lee.baseDelBanco);
      expect(lee.s2.live!.quarters[1].onCourt).not.toContain(lee.saliente);
      expect(notas.some((n) => /Quedamos sin base/.test(n))).toBe(false);
    }

    const noLee = conDT(40);
    if (noLee) {
      const notas = noLee.s2.live!.quarters[1].notes;
      expect(noLee.s2.live!.quarters[1].onCourt).toContain(noLee.aleroFresco);
      expect(noLee.s2.live!.quarters[1].onCourt).not.toContain(noLee.saliente);
      expect(notas.some((n) => /Quedamos sin base natural, y a .* no le quita el sueño/.test(n))).toBe(true);
    }
    expect(lee ?? noLee).not.toBeNull();
  });
});

describe('la directiva "repartir" del DT', () => {
  it('mete de a dos a los que no jugaron, y el que lee el juego los cambia por el más jugado de su puesto', () => {
    const base = cuarto(hastaElPartido(11));
    const profe = base.coachMarket.find((c) => c.profile === 'profe')!;
    const s: GameState = {
      ...base,
      coach: { ...profe, tactics: 75, directive: 'repartir' },
      live: { ...base.live!, autoRotation: true, directive: 'repartir', plan: 'manual' },
    };
    const { enCancha, banco } = cancha(s);
    if (enCancha.length < 5 || banco.length < 3) return;
    // El banco espeja los puestos de la cancha: cada frío tiene a quién reemplazar.
    enCancha.forEach((id, i) => {
      jugador(s, id).position = POSICIONES[i];
    });
    banco.forEach((id, i) => {
      jugador(s, id).position = POSICIONES[i % 5];
      s.live!.minutes[id] = 0;
    });
    const s2 = cuarto(s);
    const nota = s2.live!.quarters[1].notes.find((n) => /movió el banco: entran/.test(n));
    expect(nota).toBeDefined();
    expect(nota!.split(' por ').length - 1).toBe(2);
    const cinco = s2.live!.quarters[1].onCourt!.map((id) => jugador(s2, id));
    expect(posicionesSinCubrir(cinco)).toEqual([]);
    expect(banco.slice(0, 2).every((id) => s2.live!.quarters[1].onCourt!.includes(id))).toBe(true);
  });
});

describe('T4 · las otras broncas tienen gatillo', () => {
  /** Tres fechas jugadas, y la historia reescrita como tres derrotas seguidas. */
  function conRachaPerdedora(seed: number): GameState {
    let s = partidaNueva(seed);
    for (let i = 0; i < 3; i++) s = jugarFecha(s);
    const history = s.history.map((m) => ({ ...m, won: false }));
    return { ...s, history, lastMatch: { ...s.lastMatch!, won: false } };
  }

  it('el que paga la cuota y pierde seguido termina quejándose por la plata (en alguna semana)', () => {
    const base = conRachaPerdedora(5);
    const pagan = base.players.filter(
      (p) => !p.leftClub && (p.personality === 'mercenario' || p.personality === 'competitivo' || p.personality === 'protagonista')
    );
    expect(pagan.length).toBeGreaterThan(0);
    let plata = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = structuredClone(base);
      weeklyGrievanceTriggers(s, new Rng(seed));
      if (s.players.some((p) => p.grievance?.cause === 'plata')) plata += 1;
    }
    expect(plata).toBeGreaterThan(0);
  });

  it('con el clima por el piso, el "social" se queja del grupo', () => {
    const base = partidaNueva(5);
    const social = base.players.find((p) => p.personality === 'social');
    if (!social) return;
    base.club.socialClimate = 20;
    let grupo = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = structuredClone(base);
      weeklyGrievanceTriggers(s, new Rng(seed));
      if (s.players.some((p) => p.grievance?.cause === 'grupo')) grupo += 1;
    }
    expect(grupo).toBeGreaterThan(0);
  });

  it('nunca dispara más de una bronca por semana', () => {
    const base = conRachaPerdedora(5);
    base.club.socialClimate = 20;
    for (let seed = 1; seed <= 20; seed++) {
      const s = structuredClone(base);
      const antes = s.players.filter((p) => p.grievance).length;
      weeklyGrievanceTriggers(s, new Rng(seed));
      const despues = s.players.filter((p) => p.grievance).length;
      expect(despues - antes).toBeLessThanOrEqual(1);
    }
  });
});
