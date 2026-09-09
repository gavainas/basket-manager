import { describe, expect, it } from 'vitest';
import { rivalBoxScore, rivalLineup } from '../src/game/match';
import { jugarPartidoEntero, partidaNueva, paso, resolverEventos } from './jugar';

function hastaElPartido(seed = 11) {
  let s = resolverEventos(partidaNueva(seed));
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  return paso(s, { type: 'START_MATCH' });
}

describe('el partido en vivo según la referencia (sep 2026)', () => {
  it('el quinteto rival son personas del mundo que vinieron hoy, cinco en cancha y el resto al banco', () => {
    const s = hastaElPartido(11);
    const ids = s.live!.rivalSquad!.presentIds!;
    expect(ids.length).toBeGreaterThanOrEqual(5);
    const { court, bench } = rivalLineup(s, s.live!);
    expect(court).toHaveLength(5);
    expect(new Set(court.map((p) => p.id)).size).toBe(5);
    expect(court.length + bench.length).toBe(ids.length);
    for (const p of court) expect(ids).toContain(p.id);
  });

  it('los puntos rivales se reparten entre su quinteto y suman el marcador, sin tocar el azar de la temporada', () => {
    let s = jugarPartidoEntero(hastaElPartido(11));
    const contra = s.live!.quarters.reduce((t, q) => t + q.against, 0);
    const a = rivalBoxScore(s, s.live!);
    const b = rivalBoxScore(s, s.live!);
    expect(Object.values(a).reduce((t, n) => t + n, 0)).toBe(contra);
    expect(a).toEqual(b);
    expect(s.seed).toBe(s.seed); // leer la planilla rival no cambia el estado
    s = paso(s, { type: 'FINISH_MATCH' });
    expect(s.phase).toBe('matchResult');
  });

  it('la referencia elegida queda fija mientras siga en cancha, y se suelta cuando sale', () => {
    let s = hastaElPartido(11);
    const live = s.live!;
    const noEsLaMejor = live.onCourt.find((id) => id !== live.starId)!;
    s = paso(s, { type: 'SET_STAR', playerId: noEsLaMejor });
    expect(s.live!.starId).toBe(noEsLaMejor);
    expect(s.live!.starLocked).toBe(true);
    // Un cambio de otro jugador no la mueve.
    const sale = s.live!.onCourt.find((id) => id !== noEsLaMejor)!;
    const entra = s.live!.squad.find((id) => !s.live!.onCourt.includes(id))!;
    s = paso(s, { type: 'SUBSTITUTE', outId: sale, inId: entra });
    expect(s.live!.starId).toBe(noEsLaMejor);
    // Sacarla la suelta: vuelve a ser el mejor de los que están.
    const entra2 = s.live!.squad.find((id) => !s.live!.onCourt.includes(id))!;
    s = paso(s, { type: 'SUBSTITUTE', outId: noEsLaMejor, inId: entra2 });
    expect(s.live!.starId).not.toBe(noEsLaMejor);
    expect(s.live!.onCourt).toContain(s.live!.starId);
    expect(s.live!.starLocked).toBeFalsy();
    // Sólo se puede elegir a uno que esté en cancha.
    const enBanco = s.live!.squad.find((id) => !s.live!.onCourt.includes(id))!;
    const antes = s.live!.starId;
    s = paso(s, { type: 'SET_STAR', playerId: enBanco });
    expect(s.live!.starId).toBe(antes);
  });
});
