import { describe, expect, it } from 'vitest';
import { computeRating } from '../src/game/rating';
import { weeklyEstimate } from '../src/game/economy';
import { moodFor, type EmotionContext } from '../src/game/emotions';
import { midSeasonObjectiveCheck } from '../src/game/objectives';
import { watchItems } from '../src/ui/watch';
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

/**
 * Las listas de nombres llevan coma y una sola "y": "A, B y C". Los sitios
 * que unían con `join(' y ')` decían "A y B y C" con tres (la visita de la
 * comisión a mitad de temporada con los tres objetivos flojos, los que faltan
 * al entrenamiento, los que llegan tarde al partido, las altas del radar).
 */
describe('las listas de tres con una sola "y" (sep 2026)', () => {
  it('la comisión a mitad de temporada no dice "X" y "Y" y "Z"', () => {
    const s = structuredClone(partidaNueva(21));
    s.week = 5;
    s.objectives = [
      { id: 'money', label: 'Cerrar la temporada con al menos $9000 en caja', target: 9000 },
      { id: 'position', label: 'Salir campeones', target: 0 },
      { id: 'wins', label: 'Ganar al menos 99 partidos', target: 99 },
    ];
    midSeasonObjectiveCheck(s);
    const noticia = s.news.find((n) => /Visita de la comisión/.test(n.text))!;
    expect(noticia.text).toContain('"Cerrar la temporada con al menos $9000 en caja", "Salir campeones" y "Ganar al menos 99 partidos" vienen flojos');
    expect(noticia.text).not.toMatch(/" y ".* y "/);
    const hito = s.clubTimeline.find((e) => /a mitad de temporada/.test(e.text))!;
    expect(hito.text).toContain('en riesgo "Cerrar la temporada con al menos $9000 en caja", "Salir campeones" y "Ganar al menos 99 partidos".');
  });

  it('el radar nombra a los tres que reciben el alta con coma y una sola "y"', () => {
    const s = structuredClone(partidaNueva(21));
    const tres = s.players.filter((p) => !p.leftClub).slice(0, 3);
    for (const p of tres) {
      p.status = 'lesionado';
      p.injuryWeeks = 1;
      p.injuryReason = 'fisica';
    }
    const alta = watchItems(s).find((i) => /reciben el alta/.test(i.text))!;
    expect(alta.text).toBe(`${tres[0].name}, ${tres[1].name} y ${tres[2].name} reciben el alta la próxima semana.`);
  });
});

describe('los que llegan para el segundo tiempo (sep 2026)', () => {
  it('con dos que llegan, el relato dice "Llegaron A y B … ya están para entrar"', () => {
    let s = resolverEventos(partidaNueva(11));
    s = paso(s, { type: 'CONFIRM_ACTIONS', timing: 'temprana' });
    s = paso(s, { type: 'PROCEED_TO_LINEUP' });
    s = paso(s, { type: 'AUTO_LINEUP' });
    s = paso(s, { type: 'START_MATCH' });
    // Un cuarto entero, resolviendo las incidencias que lo frenan.
    const cuarto = (st: GameState): GameState => {
      const n = st.live!.quarters.length;
      let guard = 0;
      while (st.live!.quarters.length === n) {
        if (++guard > 10) throw new Error('el cuarto no termina');
        st = st.live!.pendingIncident ? paso(st, { type: 'INCIDENT_CHOICE', index: 0 }) : paso(st, { type: 'PLAY_QUARTER' });
      }
      return st;
    };
    s = cuarto(cuarto(s));
    expect(s.live!.quarters.length).toBe(2);
    const banco = s.live!.squad.filter((id) => !s.live!.onCourt.includes(id)).slice(0, 2);
    expect(banco.length).toBe(2);
    const nombres = banco.map((id) => s.players.find((p) => p.id === id)!.name);
    s = cuarto({ ...s, live: { ...s.live!, lateIds: banco } });
    const relato = JSON.stringify(s.live);
    expect(relato).toContain(`🕘 Llegaron ${nombres[0]} y ${nombres[1]} para el segundo tiempo: ya están para entrar.`);
    expect(relato).not.toContain('Llegó ');
  });
});
