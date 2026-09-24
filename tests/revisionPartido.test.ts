import { describe, expect, it } from 'vitest';
import { quarterFlavor } from '../src/game/narrative';
import { Rng } from '../src/game/rng';
import { computeRating } from '../src/game/rating';
import { jugadasDelCuarto } from '../src/game/relato';
import { jugarPartidoEntero, partidaNueva, paso, resolverEventos } from './jugar';

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
    // "Un libre de X" sí se dice (20/9, relato.ts): un punto suelto no puede
    // ser otra cosa. Lo que no se inventa son los intentos, las asistencias y
    // los tipos de tiro que la planilla no registra.
    expect(jugadas.map(j => `${j.texto} ${j.sub ?? ''}`).join(' ')).not.toMatch(/asistencia|rebote|triple|bandeja|esquina|sin marca|de espaldas/i);
  });

  it('el color del relato sale del marcador: lo que dice la segunda línea pasó de verdad', () => {
    let s = inicio();
    s = paso(s, { type: 'PLAY_QUARTER' });
    const jugadas = jugadasDelCuarto(s, s.live!, 0).filter(j => !j.tipo);
    // No es una planilla: el mismo cuarto no se cuenta con cuatro frases.
    expect(new Set(jugadas.map(j => j.texto)).size).toBeGreaterThan(5);
    // Y cada nota del marcador coincide con lo que hizo el marcador en esa jugada.
    for (let i = 0; i < jugadas.length; i++) {
      const j = jugadas[i];
      if (!j.sub) continue;
      const antes = i === 0 ? 0 : jugadas[i - 1].f - jugadas[i - 1].a;
      const ahora = j.f - j.a;
      if (/igual/i.test(j.sub)) expect(ahora).toBe(0);
      if (/Damos vuelta|Pasamos al frente/i.test(j.sub)) expect(antes < 0 && ahora > 0).toBe(true);
      if (/Se ponen arriba|Nos pasan/i.test(j.sub)) expect(antes > 0 && ahora < 0).toBe(true);
      if (/un punto\.$/i.test(j.sub)) expect(Math.abs(ahora)).toBe(1);
      if (/Diez arriba/i.test(j.sub)) expect(ahora).toBeGreaterThanOrEqual(10);
      if (/Diez abajo/i.test(j.sub)) expect(ahora).toBeLessThanOrEqual(-10);
    }
  });

  // Dos apellidos iguales en equipos distintos pasa: el mundo genera nombres.
  it('"otra vez" es el mismo jugador, aunque el rival tenga un apellido repetido', () => {
    const s = jugarPartidoEntero(inicio());
    const jugadas = s.live!.quarters.flatMap((_q, i) => jugadasDelCuarto(s, s.live!, i)).filter(j => !j.tipo);
    jugadas.forEach((j, i) => {
      if (!/Otra vez|de nuevo|Insiste/i.test(j.texto)) return;
      const previa = jugadas[i - 1];
      expect(previa).toBeDefined();
      expect(previa.lado).toBe(j.lado);
      expect(previa.quienId).toBe(j.quienId);
    });
  });

  it('una referencia recién llegada no recibe el juicio de todo un partido', () => {
    const s = inicio();
    const p = s.players.find(p => p.id === s.live!.starId)!;
    s.live!.minutes[p.id] = 10;
    s.live!.stats[p.id].pts = 3;
    const notes = quarterFlavor({ qIndex: 2, ourQ: 15, rivalQ: 15, onCourt: [p], qPts: { [p.id]: 3 }, qReb: {}, starId: p.id, live: s.live! }, new Rng(1));
    expect(notes.join(' ')).not.toMatch(/desaparec|apenas/);
  });

  it('"le cuesta sumar" se dice una vez por partido, no en el 3er cuarto y otra vez en el 4to', () => {
    const s = inicio();
    const p = s.players.find(p => p.id === s.live!.starId)!;
    s.live!.minutes[p.id] = 20;
    s.live!.stats[p.id].pts = 2;
    const ctx = { ourQ: 15, rivalQ: 15, onCourt: [p], qPts: { [p.id]: 1 }, qReb: {}, starId: p.id, live: s.live! };
    const tercero = quarterFlavor({ ...ctx, qIndex: 2 }, new Rng(1));
    expect(tercero.join(' ')).toContain(`A ${p.name} le cuesta sumar: 2 puntos en 20 minutos`);
    // El 3er cuarto cerrado, con su nota; el 4to no la repite.
    s.live!.quarters.push({ for: 15, against: 15, defense: s.live!.defense, attack: s.live!.attack, notes: tercero });
    s.live!.minutes[p.id] = 30;
    s.live!.stats[p.id].pts = 4;
    const cuarto = quarterFlavor({ ...ctx, qIndex: 3 }, new Rng(1));
    expect(cuarto.join(' ')).not.toContain('le cuesta sumar');
  });

  it('19 puntos con nota mediocre no se describen como imparable', () => {
    const result = computeRating({ position: 'Alero', minutes: 40, points: 19, rebounds: 0, assists: 0, perf: 40, effective: 60, won: false, margin: -10, mvp: false });
    expect(result.rating).toBeLessThan(7);
    expect(result.comment).not.toMatch(/imparable|sin respuestas/i);
    expect(result.comment).toContain('19');
  });
});
