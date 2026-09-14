import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { rivalDefenseFactor, rivalDefensePorEstilo, TRAMOS_POR_CUARTO } from '../src/game/match';
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

describe('la defensa del rival (sep 2026)', () => {
  it('arranca según su estilo y queda anotada en cada tramo', () => {
    const s = hastaElPartido(11);
    const rival = s.rivals.find((r) => r.id === s.live!.rivalId)!;
    expect(s.live!.rivalDefense).toBe(rivalDefensePorEstilo(rival.style));
    const fin = jugarPartidoEntero(s);
    for (const q of fin.live!.quarters.filter((x) => !x.overtime)) {
      expect(q.tramos).toHaveLength(TRAMOS_POR_CUARTO);
      for (const t of q.tramos!) expect(['zona', 'hombre', 'presion']).toContain(t.rivalDefense);
    }
  });

  it('cambia a lo sumo una vez por cuarto, y cada cambio deja su nota al final del tramo', () => {
    let cambios = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = jugarPartidoEntero(hastaElPartido(seed));
      s.live!.quarters.forEach((q, qi) => {
        const tramos = q.tramos ?? [];
        let enElCuarto = 0;
        tramos.forEach((t, k) => {
          const antes = k > 0 ? tramos[k - 1].rivalDefense : (s.live!.quarters[qi - 1]?.tramos?.at(-1)?.rivalDefense ?? t.rivalDefense);
          const nota = (t.notes ?? []).some((n) => n.startsWith('🛡'));
          if (t.rivalDefense !== antes) {
            enElCuarto += 1;
            expect(nota).toBe(true);
          } else {
            expect(nota).toBe(false);
          }
        });
        expect(enElCuarto).toBeLessThanOrEqual(1);
        cambios += enElCuarto;
      });
      // En el relato, la nota del rival cae al final de su tramo: te enterás viéndolos.
      s.live!.quarters.forEach((_q, qi) => {
        const filas = jugadasDelCuarto(s, s.live!, qi);
        for (const j of filas.filter((x) => x.texto.startsWith('🛡'))) {
          const enTramo = (j.t - (qi * 10)) % 2;
          expect(enTramo).toBeGreaterThan(1.9);
        }
      });
    }
    expect(cambios).toBeGreaterThan(0);
  });

  it('el efecto es chico y depende de cómo estás vos: responder sin piernas no sirve', () => {
    const R = BALANCE.liveMatch.rivalDefensa;
    // Contra la presión, mover la pelota con piernas rinde; sin piernas, regalo aunque muevas la pelota.
    expect(rivalDefenseFactor('presion', 'equipo', 80, 1)).toBe(R.presionVsEquipo);
    expect(rivalDefenseFactor('presion', 'equipo', 40, 1)).toBe(R.presionFundidos);
    expect(rivalDefenseFactor('presion', 'estrella', 80, 1.2)).toBe(R.presionBase);
    // Contra la marca hombre, la referencia sufre salvo que esté caliente; correr rinde.
    expect(rivalDefenseFactor('hombre', 'estrella', 80, 1)).toBe(R.hombreVsEstrella);
    expect(rivalDefenseFactor('hombre', 'estrella', 80, 1.1)).toBe(1);
    expect(rivalDefenseFactor('hombre', 'correr', 80, 1)).toBe(R.hombreVsCorrer);
    // Contra la zona, sólo la referencia caliente la castiga; correr no sirve.
    expect(rivalDefenseFactor('zona', 'estrella', 80, 1)).toBe(1);
    expect(rivalDefenseFactor('zona', 'estrella', 80, 1.1)).toBe(R.zonaVsEstrellaCaliente);
    expect(rivalDefenseFactor('zona', 'correr', 80, 1)).toBe(R.zonaVsCorrer);
    // Todo dentro de ±10%: responder bien vale puntos, no partidos.
    for (const def of ['zona', 'hombre', 'presion'] as const)
      for (const atk of ['equipo', 'estrella', 'correr'] as const)
        for (const fresh of [30, 60, 90])
          for (const hot of [0.9, 1, 1.1]) {
            const f = rivalDefenseFactor(def, atk, fresh, hot);
            expect(f).toBeGreaterThanOrEqual(0.9);
            expect(f).toBeLessThanOrEqual(1.1);
          }
  });

  it('el minuto pedido del rival está apagado, y una partida guardada sin defensa rival juega igual', () => {
    expect(BALANCE.liveMatch.rivalPideMinuto).toBe(false);
    let s = hastaElPartido(11);
    const sinDefensa: GameState = { ...s, live: { ...s.live!, rivalDefense: undefined } };
    s = jugarPartidoEntero(sinDefensa);
    expect(s.live!.finished).toBe(true);
    for (const q of s.live!.quarters) for (const t of q.tramos ?? []) expect((t.notes ?? []).some((n) => /pide minuto/.test(n))).toBe(false);
  });
});
