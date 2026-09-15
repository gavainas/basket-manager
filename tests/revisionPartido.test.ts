import { describe, expect, it } from 'vitest';
import { quarterFlavor } from '../src/game/narrative';
import { Rng } from '../src/game/rng';
import { computeRating } from '../src/game/rating';
import { jugadasDelCuarto } from '../src/game/relato';
import { partidaNueva, paso, resolverEventos } from './jugar';

function inicio() {
  let s = resolverEventos(partidaNueva(11));
  for (const action of [{ type: 'CONFIRM_ACTIONS', timing: 'temprana' }, { type: 'PROCEED_TO_LINEUP' }, { type: 'AUTO_LINEUP' }, { type: 'START_MATCH' }] as const) s = paso(s, action);
  return s;
}

describe('regresiones de la partida observada', () => {
  it.each(['rotar', 'dt'] as const)('guardar por cuatro faltas prevalece sobre %s hasta la vuelta manual, incluso al recargar', (modo) => {
    let s = inicio();
    s.live!.plan = 'manual';
    for (let i = 0; i < 3; i++) {
      s.live!.pendingIncident = null;
      s = paso(s, { type: 'PLAY_QUARTER' });
    }
    const id = s.live!.onCourt[0];
    s.live!.perfs[id] = 200; // el mejor cerrador: el plan querría devolverlo
    s.live!.playerFresh[id] = 100;
    s.live!.pendingIncident = { kind: 'cuatro_faltas', playerId: id, text: 'Cuatro faltas', options: [] };
    s = paso(s, { type: 'INCIDENT_CHOICE', index: 0 });
    s.live!.autoRotation = modo === 'dt';
    s.live!.plan = 'rotar';
    s = JSON.parse(JSON.stringify(s));
    const guardado = paso(s, { type: 'PLAY_TRAMO' });
    expect(guardado.live!.enCurso!.tramos![0].onCourt).not.toContain(id);
    const vuelve = paso(s, { type: 'SUBSTITUTE', outId: s.live!.onCourt[0], inId: id });
    expect(vuelve.live!.onCourt).toContain(id);
    expect(vuelve.live!.heldOut ?? []).not.toContain(id);
  });

  it('el relato no adjudica asistencias, rebotes ofensivos ni tipos de tiro que no registra la planilla', () => {
    let s = inicio();
    s = paso(s, { type: 'PLAY_QUARTER' });
    const jugadas = jugadasDelCuarto(s, s.live!, 0).filter(j => !j.tipo);
    expect(jugadas.length).toBeGreaterThan(0);
    expect(jugadas.map(j => `${j.texto} ${j.sub ?? ''}`).join(' ')).not.toMatch(/asistencia|rebote|triple|libre|bandeja|esquina|sin marca|de espaldas/i);
  });

  it('una referencia recién llegada no recibe el juicio de todo un partido', () => {
    const s = inicio();
    const p = s.players.find(p => p.id === s.live!.starId)!;
    s.live!.minutes[p.id] = 10;
    s.live!.stats[p.id].pts = 3;
    const notes = quarterFlavor({ qIndex: 2, ourQ: 15, rivalQ: 15, onCourt: [p], qPts: { [p.id]: 3 }, qReb: {}, starId: p.id, live: s.live! }, new Rng(1));
    expect(notes.join(' ')).not.toMatch(/desaparec|apenas/);
  });

  it('19 puntos con nota mediocre no se describen como imparable', () => {
    const result = computeRating({ position: 'Alero', minutes: 40, points: 19, rebounds: 0, assists: 0, perf: 40, effective: 60, won: false, margin: -10, mvp: false });
    expect(result.rating).toBeLessThan(7);
    expect(result.comment).not.toMatch(/imparable|sin respuestas/i);
    expect(result.comment).toContain('19');
  });
});
