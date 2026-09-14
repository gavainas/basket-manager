import { describe, expect, it } from 'vitest';
import { canEnterCourt } from '../src/game/match';
import { esCalenton } from '../src/game/narrative';
import type { GameState, PendingRefIncident } from '../src/game/types';
import { jugarPartidoEntero, partidaNueva, paso, resolverEventos } from './jugar';

function hastaElPartido(seed = 11) {
  let s = resolverEventos(partidaNueva(seed));
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  return paso(s, { type: 'START_MATCH' });
}

/** Un cuarto jugado y una incidencia puesta a mano, para decidir sobre ella. */
function conIncidencia(s: GameState, inc: Omit<PendingRefIncident, 'text' | 'options'>, refStyle?: GameState['live'] extends infer L ? (L extends { refStyle?: infer R } ? R : never) : never): GameState {
  s = s.live!.pendingIncident ? paso(s, { type: 'INCIDENT_CHOICE', index: 0 }) : s;
  s = paso(s, { type: 'PLAY_QUARTER' });
  return { ...s, live: { ...s.live!, refStyle: refStyle ?? s.live!.refStyle, pendingIncident: { ...inc, text: 'prueba', options: [] } } };
}

describe('las incidencias del partido (sep 2026)', () => {
  it('con cuatro faltas, sacarlo lo guarda en el banco y puede volver; dejarlo deja un riesgo de quinta', () => {
    let s = hastaElPartido(11);
    const p = s.live!.onCourt[0];
    s = conIncidencia(s, { kind: 'cuatro_faltas', playerId: p });
    const guardado = paso(s, { type: 'INCIDENT_CHOICE', index: 0 });
    expect(guardado.live!.onCourt).not.toContain(p);
    expect(guardado.live!.onCourt).toHaveLength(5);
    expect(canEnterCourt(guardado.live!, p)).toBe(true);
    const aFull = paso(s, { type: 'INCIDENT_CHOICE', index: 2 });
    expect(aFull.live!.onCourt).toContain(p);
    expect(aFull.live!.riesgos?.some((r) => r.playerId === p && r.kind === 'quinta')).toBe(true);
    const conCuidado = paso(s, { type: 'INCIDENT_CHOICE', index: 1 });
    expect(conCuidado.live!.defModNext).toBeGreaterThan(1);
  });

  it('la quinta falta se cumple en algún tramo del cuarto siguiente (en alguna semilla) y el jugador no vuelve', () => {
    let quintas = 0;
    for (let seed = 1; seed <= 16; seed++) {
      // Plan a mano: si el plan lo rota al banco, el riesgo no corre (no está en cancha).
      let s = paso(hastaElPartido(seed), { type: 'SET_MATCH_PLAN', plan: 'manual' });
      const p = s.live!.onCourt[0];
      s = conIncidencia(s, { kind: 'cuatro_faltas', playerId: p });
      s = paso(s, { type: 'INCIDENT_CHOICE', index: 2 });
      s = s.live!.pendingIncident ? paso(s, { type: 'INCIDENT_CHOICE', index: 0 }) : s;
      s = paso(s, { type: 'PLAY_QUARTER' });
      const q = s.live!.quarters[1];
      const nota = (q.tramos ?? []).some((t) => (t.notes ?? []).some((n) => n.startsWith('🟥') && /quinta/.test(n)));
      if (nota) {
        quintas += 1;
        expect(s.live!.fueraDelPartido).toContain(p);
        expect(s.live!.onCourt).not.toContain(p);
        expect(canEnterCourt(s.live!, p)).toBe(false);
        // Y no se lo puede meter de nuevo.
        const entra = s.live!.onCourt[0];
        const igual = paso(s, { type: 'SUBSTITUTE', outId: entra, inId: p });
        expect(igual.live!.onCourt).not.toContain(p);
      }
      // El riesgo se consumió: no queda colgado para el cuarto siguiente.
      expect(s.live!.riesgos).toBeUndefined();
    }
    expect(quintas).toBeGreaterThan(0);
  });

  it('el resentido que sacás queda afuera sin lesión; el que sigue, juega con más riesgo', () => {
    let s = hastaElPartido(11);
    const p = s.live!.onCourt[1];
    s = conIncidencia(s, { kind: 'resentido', playerId: p });
    const afuera = paso(s, { type: 'INCIDENT_CHOICE', index: 0 });
    expect(afuera.live!.fueraDelPartido).toContain(p);
    expect(afuera.live!.onCourt).not.toContain(p);
    expect(afuera.players.find((x) => x.id === p)!.status).not.toBe('lesionado');
    const sigue = paso(s, { type: 'INCIDENT_CHOICE', index: 1 });
    expect(sigue.live!.onCourt).toContain(p);
    expect(sigue.live!.riesgoLesion?.[p]).toBeGreaterThan(1);
  });

  it('respaldar la protesta con un árbitro estricto a veces termina en técnica; con uno permisivo, nunca', () => {
    let tecnicasEstricto = 0;
    let tecnicasPermisivo = 0;
    for (let seed = 1; seed <= 16; seed++) {
      // El cuarto ya jugado es el mismo para los dos árbitros: sólo cambia quién decide después.
      const jugado = conIncidencia(hastaElPartido(seed), { kind: 'falta_dudosa' });
      const calenton = jugado.live!.onCourt.map((id) => jugado.players.find((p) => p.id === id)!).find(esCalenton);
      if (!calenton) continue;
      const antes = calenton.seasonTechs ?? 0;
      const conArbitro = (refStyle: 'estricto' | 'permisivo') => ({ ...jugado, live: { ...jugado.live!, refStyle } });
      const estricto = paso(conArbitro('estricto'), { type: 'INCIDENT_CHOICE', index: 1 });
      if ((estricto.players.find((p) => p.id === calenton.id)!.seasonTechs ?? 0) > antes) tecnicasEstricto += 1;
      const permisivo = paso(conArbitro('permisivo'), { type: 'INCIDENT_CHOICE', index: 1 });
      if ((permisivo.players.find((p) => p.id === calenton.id)!.seasonTechs ?? 0) > antes) tecnicasPermisivo += 1;
      expect(permisivo.live!.rageBoost).toBe(true);
    }
    expect(tecnicasEstricto).toBeGreaterThan(0);
    expect(tecnicasPermisivo).toBe(0);
  });

  it('bancar al calentón con técnica deja el riesgo de la segunda; cambiarlo lo saca', () => {
    let s = hastaElPartido(11);
    const calenton = s.live!.onCourt.map((id) => s.players.find((p) => p.id === id)!).find(esCalenton) ?? s.players.find((p) => s.live!.onCourt.includes(p.id))!;
    s = conIncidencia(s, { kind: 'tecnica', playerId: calenton.id, playerName: calenton.name });
    const cambiado = paso(s, { type: 'INCIDENT_CHOICE', index: 0 });
    expect(cambiado.live!.onCourt).not.toContain(calenton.id);
    const bancado = paso(s, { type: 'INCIDENT_CHOICE', index: 1 });
    expect(bancado.live!.onCourt).toContain(calenton.id);
    if (esCalenton(calenton)) expect(bancado.live!.riesgos?.some((r) => r.kind === 'expulsion')).toBe(true);
    const bronca = paso(s, { type: 'INCIDENT_CHOICE', index: 2 });
    expect(bronca.live!.rageBoost).toBe(true);
    expect(bronca.live!.riesgos?.some((r) => r.kind === 'expulsion')).toBe(true);
  });

  it('con el árbitro casero, meter zona cambia la defensa', () => {
    let s = hastaElPartido(11);
    s = paso(s, { type: 'SET_TACTIC', defense: 'presion' });
    s = conIncidencia(s, { kind: 'casero' }, 'casero');
    const zona = paso(s, { type: 'INCIDENT_CHOICE', index: 0 });
    expect(zona.live!.defense).toBe('zona');
  });

  it('a lo largo de muchos partidos aparecen incidencias de varias clases, y nunca en el último cuarto', () => {
    const clases = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      let s = hastaElPartido(seed);
      let guard = 0;
      while (s.live && !s.live.finished && ++guard < 40) {
        if (s.live.pendingIncident) {
          clases.add(s.live.pendingIncident.kind);
          expect(s.live.quarters.length).toBeLessThan(4);
          s = paso(s, { type: 'INCIDENT_CHOICE', index: 0 });
        } else {
          s = paso(s, { type: 'PLAY_QUARTER' });
        }
      }
      expect(s.live!.finished).toBe(true);
    }
    expect(clases.size).toBeGreaterThanOrEqual(3);
  });

  it('el partido entero sigue cerrando con el informe', () => {
    let s = jugarPartidoEntero(hastaElPartido(7));
    s = paso(s, { type: 'FINISH_MATCH' });
    expect(s.phase).toBe('matchResult');
  });
});
