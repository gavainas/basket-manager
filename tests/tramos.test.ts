import { describe, expect, it } from 'vitest';
import { cuartosDe, marcador, MINUTOS_POR_PARTIDO, TRAMOS_POR_CUARTO } from '../src/game/match';
import { jugadasDelCuarto } from '../src/game/relato';
import type { GameState } from '../src/game/types';
import { jugarPartidoEntero, partidaNueva, paso, resolverEventos } from './jugar';

function hastaElPartido(seed = 11) {
  let s = resolverEventos(partidaNueva(seed));
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  return paso(s, { type: 'START_MATCH' });
}

function tramo(s: GameState) {
  s = s.live!.pendingIncident ? paso(s, { type: 'INCIDENT_CHOICE', index: 0 }) : s;
  return paso(s, { type: 'PLAY_TRAMO' });
}

describe('el motor por tramos (sep 2026)', () => {
  it('un tramo abre el cuarto en curso y el quinto lo cierra, con el marcador y los minutos que suman', () => {
    let s = hastaElPartido(11);
    for (let k = 1; k < TRAMOS_POR_CUARTO; k++) {
      s = tramo(s);
      expect(s.live!.quarters).toHaveLength(0);
      expect(s.live!.enCurso).toBeDefined();
      expect(s.live!.enCurso!.tramos).toHaveLength(k);
      const m = marcador(s.live!);
      expect(m.f).toBe(s.live!.enCurso!.for);
      expect(m.a).toBe(s.live!.enCurso!.against);
    }
    s = tramo(s);
    expect(s.live!.enCurso).toBeUndefined();
    expect(s.live!.quarters).toHaveLength(1);
    const q = s.live!.quarters[0];
    expect(q.tramos).toHaveLength(TRAMOS_POR_CUARTO);
    expect(q.tramos!.reduce((t, x) => t + x.for, 0)).toBe(q.for);
    expect(q.tramos!.reduce((t, x) => t + x.against, 0)).toBe(q.against);
    expect(Object.values(q.box!).reduce((t, n) => t + n, 0)).toBe(q.for);
    for (const id of q.onCourt!) expect(s.live!.minutes[id]).toBe(10);
  });

  it('jugar el cuarto de una es lo mismo que jugar sus cinco tramos: cierra donde estaba', () => {
    let s = hastaElPartido(11);
    s = tramo(s);
    s = tramo(s);
    s = paso(s, { type: 'PLAY_QUARTER' });
    expect(s.live!.enCurso).toBeUndefined();
    expect(s.live!.quarters).toHaveLength(1);
    expect(s.live!.quarters[0].tramos).toHaveLength(TRAMOS_POR_CUARTO);
    // Y el próximo cuarto arranca de cero.
    s = tramo(s);
    expect(s.live!.quarters).toHaveLength(1);
    expect(s.live!.enCurso!.tramos).toHaveLength(1);
  });

  it('un cambio con la pelota en juego entra en el próximo tramo, y queda en el relato en su minuto', () => {
    let s = hastaElPartido(11);
    s = tramo(s);
    s = tramo(s);
    const sale = s.live!.onCourt[0];
    const entra = s.live!.squad.find((id) => !s.live!.onCourt.includes(id))!;
    s = paso(s, { type: 'SUBSTITUTE', outId: sale, inId: entra });
    s = tramo(s);
    const t = s.live!.enCurso!.tramos![2];
    expect(t.onCourt).toContain(entra);
    expect(t.onCourt).not.toContain(sale);
    expect(t.notes?.some((n) => /^Cambio: entra/.test(n))).toBe(true);
    // El que entró suma minutos desde ese tramo; el que salió, no.
    expect(s.live!.minutes[entra]).toBe(2);
    expect(s.live!.minutes[sale]).toBe(4);
    const filas = jugadasDelCuarto(s, s.live!, 0);
    const cambio = filas.find((j) => j.tipo === 'cambio');
    expect(cambio).toBeDefined();
    expect(cambio!.t).toBe(4);
    // Las canastas del tramo nuevo son del quinteto nuevo.
    for (const j of filas.filter((j) => !j.tipo && j.lado === 'nosotros' && j.t >= 4)) expect(t.onCourt).toContain(j.quienId);
  });

  it('pedir minuto corre en el próximo tramo, hay dos por partido, y sólo con la pelota en juego', () => {
    let s = hastaElPartido(11);
    // Antes del salto no se puede.
    s = paso(s, { type: 'PEDIR_MINUTO' });
    expect(s.live!.minutoPedido).toBeFalsy();
    s = tramo(s);
    s = paso(s, { type: 'PEDIR_MINUTO' });
    expect(s.live!.minutoPedido).toBe(true);
    expect(s.live!.minutosPedidos).toBe(1);
    // No se acumulan dos seguidos.
    s = paso(s, { type: 'PEDIR_MINUTO' });
    expect(s.live!.minutosPedidos).toBe(1);
    s = tramo(s);
    expect(s.live!.minutoPedido).toBe(false);
    expect(s.live!.enCurso!.tramos![1].notes?.some((n) => /Minuto pedido/.test(n))).toBe(true);
    s = paso(s, { type: 'PEDIR_MINUTO' });
    s = tramo(s);
    expect(s.live!.minutosPedidos).toBe(MINUTOS_POR_PARTIDO);
    s = paso(s, { type: 'PEDIR_MINUTO' });
    expect(s.live!.minutoPedido).toBeFalsy();
    expect(s.live!.minutosPedidos).toBe(MINUTOS_POR_PARTIDO);
  });

  it('el partido entero cierra igual que antes: cuatro cuartos con tramos, el marcador es la suma, y el informe sale', () => {
    let s = jugarPartidoEntero(hastaElPartido(11));
    expect(s.live!.finished).toBe(true);
    expect(s.live!.enCurso).toBeUndefined();
    const regulares = s.live!.quarters.filter((q) => !q.overtime);
    expect(regulares).toHaveLength(4);
    for (const q of regulares) expect(q.tramos).toHaveLength(TRAMOS_POR_CUARTO);
    expect(cuartosDe(s.live!)).toEqual(s.live!.quarters);
    const mins = s.live!.onCourt.reduce((t, id) => t + s.live!.minutes[id], 0);
    expect(mins).toBeGreaterThan(0);
    s = paso(s, { type: 'FINISH_MATCH' });
    expect(s.phase).toBe('matchResult');
    expect(s.lastMatch!.scoreFor).toBe(regulares.reduce((t, q) => t + q.for, 0) + (s.lastMatch!.quarters.length > 4 ? s.lastMatch!.quarters[4].for : 0));
  });

  it('el rival responde: si le metemos un parcial, pide minuto (en alguna semilla)', () => {
    let pidio = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = jugarPartidoEntero(hastaElPartido(seed));
      if (s.live!.quarters.some((q) => (q.tramos ?? []).some((t) => (t.notes ?? []).some((n) => /pide minuto/.test(n))))) pidio += 1;
    }
    expect(pidio).toBeGreaterThan(0);
  });
});
