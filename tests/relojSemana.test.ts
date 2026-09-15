import { describe, expect, it } from 'vitest';
import { visibleScore, visibleVitals } from '../src/ui/matchPresentation';
import { jugadasDelCuarto } from '../src/game/relato';
import { weekTimeline } from '../src/game/weekTimeline';
import { partidaNueva, paso, resolverEventos } from './jugar';

function inicio() {
  let s = resolverEventos(partidaNueva(11));
  for (const a of [{ type: 'CONFIRM_ACTIONS', timing: 'temprana' }, { type: 'PROCEED_TO_LINEUP' }, { type: 'AUTO_LINEUP' }, { type: 'START_MATCH' }] as const) s = paso(s, a);
  return s;
}

describe('una sola presentación del tiempo', () => {
  it('al empezar el reloj no adelanta ni el marcador ni los minutos ni el desgaste', () => {
    const before = inicio();
    const s = paso(before, { type: 'PLAY_TRAMO' });
    const clock = { q: 0, t: 0, pausa: true };
    expect(visibleScore(s, s.live!, clock)).toEqual({ f: 0, a: 0 });
    expect(visibleVitals(s.live!, clock).minutes).toEqual(before.live!.minutes);
    expect(visibleVitals(s.live!, clock).playerFresh).toEqual(before.live!.playerFresh);
    for (const id of before.live!.onCourt) expect(visibleVitals(s.live!, { ...clock, t: 1 }).minutes[id]).toBe(1);
    expect(visibleVitals(s.live!, { ...clock, t: 2 }).minutes).toEqual(s.live!.minutes);
  });

  it('el marcador sigue cada aporte visible, también al pausar y saltar', () => {
    const s = paso(inicio(), { type: 'PLAY_QUARTER' });
    for (const j of jugadasDelCuarto(s, s.live!, 0)) {
      expect(visibleScore(s, s.live!, { q: 0, t: j.t, pausa: false })).toEqual({ f: j.f, a: j.a });
      expect(visibleScore(s, s.live!, { q: 0, t: j.t, pausa: true })).toEqual({ f: j.f, a: j.a });
    }
    expect(visibleScore(s, s.live!, null)).toEqual({ f: s.live!.quarters[0].for, a: s.live!.quarters[0].against });
  });

  it('no anticipa la recuperación del entretiempo ni muestra al cambio en el tramo anterior', () => {
    let s = inicio();
    s.live!.plan = 'manual';
    s = paso(s, { type: 'PLAY_QUARTER' });
    s.live!.pendingIncident = null;
    s = paso(s, { type: 'PLAY_TRAMO' });
    const oldFive = [...s.live!.onCourt];
    const entra = s.live!.squad.find(id => !oldFive.includes(id))!;
    s = paso(s, { type: 'SUBSTITUTE', outId: oldFive[0], inId: entra });
    s = paso(s, { type: 'PLAY_QUARTER' });
    expect(visibleVitals(s.live!, { q: 1, t: 11, pausa: true }).onCourt).toEqual(oldFive);
    const snapshot = s.live!.quarters[1].tramos![4].presentation!;
    const during = visibleVitals(s.live!, { q: 1, t: 19, pausa: true });
    expect(during.rivalFreshness).toBe((snapshot.before.rivalFreshness + snapshot.after.rivalFreshness) / 2);
    expect(visibleVitals(s.live!, null).rivalFreshness).toBe(s.live!.rivalFreshness);
  });

  it('el suplementario no adelanta sus cinco minutos ni sus puntos al reloj', () => {
    let s = inicio();
    s.live!.plan = 'manual';
    for (let i = 0; i < 4; i++) {
      s.live!.pendingIncident = null;
      s = paso(s, { type: 'PLAY_QUARTER' });
    }
    const live = s.live!;
    expect(live.quarters).toHaveLength(4);
    const before = { ...live.minutes };
    live.quarters.push({ for: 7, against: 5, overtime: true, onCourt: [...live.onCourt], box: { [live.onCourt[0]]: 7 }, defense: live.defense, attack: live.attack, notes: [] });
    for (const id of live.onCourt) live.minutes[id] += 5;
    const clock = { q: 4, t: 40, pausa: true };
    expect(visibleVitals(live, clock).minutes).toEqual(before);
    expect(visibleScore(s, live, clock)).toEqual(visibleScore(s, live, { q: 3, t: 40, pausa: true }));
    expect(visibleVitals(live, { ...clock, t: 45 }).minutes).toEqual(live.minutes);
  });

  it('saves anteriores sin instantáneas siguen pudiendo continuar', () => {
    let s = paso(inicio(), { type: 'PLAY_TRAMO' });
    delete s.live!.enCurso!.tramos![0].presentation;
    delete s.live!.heldOut;
    s = JSON.parse(JSON.stringify(s));
    s = paso(s, { type: 'PLAY_TRAMO' });
    expect(s.live!.enCurso!.tramos).toHaveLength(2);
    expect(s.live!.enCurso!.tramos![1].presentation).toBeDefined();
  });
});

describe('cronología semanal', () => {
  it.each(['temprana', 'tarde'] as const)('la convocatoria %s y el asado realizado no viajan al futuro', timing => {
    let s = resolverEventos(partidaNueva(11));
    s.actionsChosen = ['asado'];
    s = paso(s, { type: 'CONFIRM_ACTIONS', timing });
    expect(s.phase).toBe('callUp');
    const calendar = weekTimeline(s);
    expect(calendar.todayOffset).toBe(timing === 'tarde' ? 0 : -2);
    expect(calendar.callUpOffset).toBe(calendar.todayOffset);
    expect(calendar.asadoOffset).toBeLessThanOrEqual(calendar.todayOffset);
    expect(calendar.asadoLabel).toBe('Asado realizado');
    expect(calendar.callUpLabel).toBe('Lista enviada');
  });
  it('un asado de otra semana no se presenta como realizado esta semana', () => {
    const s = partidaNueva(11);
    s.actionsChosen = ['asado'];
    expect(weekTimeline(s).asadoLabel).toBe('Asado previsto');
  });
});
