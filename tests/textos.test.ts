import { describe, expect, it } from 'vitest';
import { computeRating } from '../src/game/rating';
import { weeklyEstimate } from '../src/game/economy';
import { partidaNueva } from './jugar';

/**
 * Los textos que llevan un número tienen que concordar cuando el número es 1:
 * "1 puntos", "1 jugadores" se leían en la nota del jugador, en Finanzas y en
 * la gorra de las cuotas atrasadas.
 */
describe('los plurales con 1 (sep 2026)', () => {
  it('la nota de una noche floja no dice "1 puntos, 1 rebotes y 1 asistencias"', () => {
    const r = computeRating({
      position: 'Alero',
      minutes: 20,
      points: 1,
      rebounds: 1,
      assists: 1,
      perf: 40,
      effective: 70,
      won: false,
      margin: -20,
      mvp: false,
    });
    expect(r.rating).toBeLessThan(6);
    expect(r.comment).toContain('1 punto,');
    expect(r.comment).toContain('1 rebote y');
    expect(r.comment).toContain('1 asistencia en');
    expect(r.comment).not.toMatch(/\b1 (puntos|rebotes|asistencias)\b/);
  });

  it('el "cumplió con su rol" también concuerda con un punto', () => {
    const r = computeRating({
      position: 'Pívot',
      minutes: 20,
      points: 1,
      rebounds: 4,
      assists: 0,
      perf: 74,
      effective: 70,
      won: true,
      margin: 5,
      mvp: false,
    });
    if (r.comment.startsWith('Cumplió con su rol')) expect(r.comment).toContain('1 punto,');
    expect(r.comment).not.toMatch(/\b1 puntos\b/);
  });

  it('las cuotas de Finanzas dicen "1 jugador" cuando paga uno solo', () => {
    const s = partidaNueva(11);
    const activos = s.players.filter((p) => !p.leftClub);
    // Todos becados salvo uno: queda un solo pagador.
    for (const p of activos.slice(1)) p.feeStatus = 'beca_total';
    activos[0].feeStatus = 'pagada';
    const est = weeklyEstimate(s);
    expect(est.income[0].concept).toBe('Cuotas (1 jugador al día)');
  });
});
