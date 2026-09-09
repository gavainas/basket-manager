import { describe, expect, it } from 'vitest';
import { jugadasDelCuarto } from '../src/game/relato';
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

  it('las jugadas cierran con el marcador del cuarto, van en orden, y son a lo sumo cinco por cuarto', () => {
    const s = partidoJugado(11);
    const live = s.live!;
    let f = 0;
    let a = 0;
    live.quarters.forEach((q, i) => {
      f += q.for;
      a += q.against;
      const jugadas = jugadasDelCuarto(s, live, i);
      expect(jugadas.length).toBeGreaterThan(0);
      expect(jugadas.length).toBeLessThanOrEqual(5);
      expect(jugadas[jugadas.length - 1].marcador).toBe(`${f}-${a}`);
      const minutos = jugadas.map((j) => parseInt(j.minuto, 10));
      for (let k = 1; k < minutos.length; k++) expect(minutos[k]).toBeGreaterThanOrEqual(minutos[k - 1]);
      for (const j of jugadas) {
        expect(j.texto.length).toBeGreaterThan(3);
        expect(j.texto).not.toContain('{n}');
        expect(j.sub ?? '').not.toContain('{a}');
      }
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
