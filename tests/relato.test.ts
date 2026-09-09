import { describe, expect, it } from 'vitest';
import { arranqueDelCuarto, jugadasDelCuarto, largoDelCuarto, momentosDelCuarto } from '../src/game/relato';
import { jugarPartidoEntero, partidaNueva, paso, resolverEventos } from './jugar';

function partidoJugado(seed = 11) {
  let s = resolverEventos(partidaNueva(seed));
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  s = paso(s, { type: 'START_MATCH' });
  return jugarPartidoEntero(s);
}

describe('el relato jugada a jugada', () => {
  it('cada cuarto guarda quién hizo los puntos, y suman el parcial', () => {
    const s = partidoJugado(11);
    for (const q of s.live!.quarters) {
      expect(q.box).toBeDefined();
      expect(Object.values(q.box!).reduce((t, n) => t + n, 0)).toBe(q.for);
      expect(q.onCourt).toHaveLength(5);
    }
  });

  it('todas las canastas del cuarto suman el parcial, cierran con el marcador, y van en orden en el reloj', () => {
    const s = partidoJugado(11);
    const live = s.live!;
    let f = 0;
    let a = 0;
    live.quarters.forEach((q, i) => {
      const jugadas = jugadasDelCuarto(s, live, i);
      expect(jugadas.length).toBeGreaterThan(0);
      expect(jugadas.filter((j) => j.lado === 'nosotros').reduce((t, j) => t + j.pts, 0)).toBe(q.for);
      expect(jugadas.filter((j) => j.lado === 'rival').reduce((t, j) => t + j.pts, 0)).toBe(q.against);
      f += q.for;
      a += q.against;
      const ultima = jugadas[jugadas.length - 1];
      expect(ultima.marcador).toBe(`${f}-${a}`);
      expect([ultima.f, ultima.a]).toEqual([f, a]);
      const inicio = arranqueDelCuarto(live, i);
      const fin = inicio + largoDelCuarto(q.overtime);
      for (let k = 0; k < jugadas.length; k++) {
        const j = jugadas[k];
        expect(j.t).toBeGreaterThanOrEqual(inicio);
        expect(j.t).toBeLessThan(fin);
        if (k > 0) expect(j.t).toBeGreaterThan(jugadas[k - 1].t);
        expect(j.texto.length).toBeGreaterThan(3);
        expect(j.texto).not.toContain('{n}');
        expect(j.sub ?? '').not.toContain('{a}');
        if (j.lado === 'nosotros') expect(q.onCourt).toContain(j.quienId);
      }
    });
  });

  it('los momentos son a lo sumo cinco por cuarto y siempre incluyen el cierre', () => {
    const s = partidoJugado(11);
    const live = s.live!;
    live.quarters.forEach((_q, i) => {
      const todas = jugadasDelCuarto(s, live, i);
      const momentos = momentosDelCuarto(s, live, i);
      expect(momentos.length).toBeLessThanOrEqual(5);
      expect(momentos[momentos.length - 1]).toEqual(todas[todas.length - 1]);
    });
  });

  it('es determinista y no toca el estado', () => {
    const s = partidoJugado(11);
    const antes = JSON.stringify(s);
    const a = jugadasDelCuarto(s, s.live!, 0);
    const b = jugadasDelCuarto(s, s.live!, 0);
    expect(a).toEqual(b);
    expect(JSON.stringify(s)).toBe(antes);
  });

  it('hay jugadas de las dos camisetas', () => {
    const s = partidoJugado(11);
    const lados = new Set(s.live!.quarters.flatMap((_q, i) => jugadasDelCuarto(s, s.live!, i)).map((j) => j.lado));
    expect(lados.has('nosotros')).toBe(true);
    expect(lados.has('rival')).toBe(true);
  });
});
