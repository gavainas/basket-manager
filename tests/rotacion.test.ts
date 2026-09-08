import { describe, expect, it } from 'vitest';
import { defaultMatchPlan, PLAN_MIN_BENCH } from '../src/game/match';
import { Rng } from '../src/game/rng';
import { weeklyGrievanceTriggers } from '../src/game/week';
import type { GameState } from '../src/game/types';
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
