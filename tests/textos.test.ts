import { describe, expect, it } from 'vitest';
import { computeRating } from '../src/game/rating';
import { weeklyEstimate } from '../src/game/economy';
import { moodFor, type EmotionContext } from '../src/game/emotions';
import type { GameState } from '../src/game/types';
import { partidaNueva, paso, resolverEventos } from './jugar';

/** Un partido en la previa, con el juez que se pida y una incidencia de "casero" puesta a mano. */
function conJuezCasero(refName: string): GameState {
  let s = resolverEventos(partidaNueva(11));
  s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
  s = paso(s, { type: 'PROCEED_TO_LINEUP' });
  s = paso(s, { type: 'AUTO_LINEUP' });
  s = paso(s, { type: 'START_MATCH' });
  return { ...s, live: { ...s.live!, refName, pendingIncident: { kind: 'casero', text: 'prueba', options: [] } } };
}

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

  it('la bronca con memoria concuerda con una sola fecha o semana', () => {
    const s = partidaNueva(11);
    const p = s.players[0];
    const base: EmotionContext = { won: true, margin: 5, minutes: 0, rating: null, mvp: false, inSquad: true, promisedMinutes: false, bigGame: false };
    const frases = new Set<string>();
    for (let salt = 0; salt < 12; salt++) {
      frases.add(moodFor(p, { ...base, grievanceLevel: 2, grievanceWeeks: 1 }, salt).text);
      frases.add(moodFor(p, { ...base, grievanceLevel: 3, grievanceWeeks: 1 }, salt).text);
      frases.add(moodFor(p, { ...base, inSquad: false, won: false, grievanceLevel: 2, grievanceWeeks: 1 }, salt).text);
      frases.add(moodFor(p, { ...base, inSquad: false, won: false, grievanceLevel: 3, grievanceWeeks: 1 }, salt).text);
    }
    for (const f of frases) expect(f).not.toMatch(/\b1 (fechas|semanas)\b|Van 1\b/);
    expect([...frases].some((f) => /Va una fecha con lo mismo|Una semana/.test(f))).toBe(true);
  });
});

/**
 * El juez anunciado lleva artículo a veces ("el Flaco Medina", "la Colo
 * Ramírez") y el relato lo declina: "del Flaco Medina", "El Flaco Medina
 * bajó un cambio". Antes: "silbatos de el Flaco Medina", "el Flaco Medina
 * siguió cobrando" empezando la frase en minúscula.
 */
describe('el juez con artículo (sep 2026)', () => {
  it('"del Flaco Medina" y "El Flaco Medina" al empezar la frase', () => {
    const zona = paso(conJuezCasero('el Flaco Medina'), { type: 'INCIDENT_CHOICE', index: 0 });
    expect(zona.live!.pendingSubNotes.at(-1)).toContain('menos silbatos del Flaco Medina.');
    const banca = paso(conJuezCasero('el Flaco Medina'), { type: 'INCIDENT_CHOICE', index: 2 });
    expect(banca.live!.pendingSubNotes.at(-1)).toContain('Te la bancaste. El Flaco Medina siguió cobrando');
  });

  it('"de la Colo Ramírez" y "de Suárez" quedan como están', () => {
    const colo = paso(conJuezCasero('la Colo Ramírez'), { type: 'INCIDENT_CHOICE', index: 0 });
    expect(colo.live!.pendingSubNotes.at(-1)).toContain('menos silbatos de la Colo Ramírez.');
    const suarez = paso(conJuezCasero('Suárez'), { type: 'INCIDENT_CHOICE', index: 0 });
    expect(suarez.live!.pendingSubNotes.at(-1)).toContain('menos silbatos de Suárez.');
  });
});
