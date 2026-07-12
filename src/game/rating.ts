// Nota del partido por jugador: producción según el rol, rendimiento respecto
// a su nivel y contexto del resultado. Centraliza también las frases del informe.

import type { Position } from './types';

export interface RatingInput {
  position: Position;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  /** Rendimiento del día (sorteado) vs. su nivel esperado. */
  perf: number;
  effective: number;
  won: boolean;
  margin: number;
  mvp: boolean;
}

export interface PlayerRating {
  rating: number; // 1-10
  comment: string;
}

/** Qué vale cada estadística según el puesto: al base se le piden asistencias,
 *  al interno rebotes. Los puntos valen para todos. */
const ROLE_WEIGHTS: Record<Position, { ast: number; reb: number }> = {
  Base: { ast: 2.1, reb: 0.8 },
  Escolta: { ast: 1.5, reb: 0.9 },
  Alero: { ast: 1.1, reb: 1.2 },
  'Ala-Pívot': { ast: 0.9, reb: 1.5 },
  Pívot: { ast: 0.8, reb: 1.7 },
};

export function computeRating(input: RatingInput): PlayerRating {
  const w = ROLE_WEIGHTS[input.position];
  const value = input.points + input.assists * w.ast + input.rebounds * w.reb;
  // Tope a la producción por minuto: un cameo caliente no vale un 10.
  const perMin = Math.min(0.78, value / Math.max(1, input.minutes));

  // Producción por minuto llevada a nota; el día bueno/malo (perf vs nivel)
  // aproxima la eficiencia y la defensa que la planilla no registra.
  const hot = input.perf / Math.max(1, input.effective); // 0.78..1.22
  let rating = 3.0 + perMin * 7.2 + (hot - 1) * 4 + (input.won ? 0.4 : -0.4);
  if (input.won && input.margin > 15) rating += 0.2;

  // Con pocos minutos la muestra es chica: la nota se acerca al "cumplió".
  const sample = Math.min(1, input.minutes / 16);
  rating = 5.6 * (1 - sample) + rating * sample;

  if (input.mvp) rating = Math.max(rating, 8);
  const final = Math.max(1, Math.min(10, Math.round(rating)));
  return { rating: final, comment: buildComment(input, final) };
}

function buildComment(i: RatingInput, rating: number): string {
  const { points: pts, rebounds: reb, assists: ast, minutes: min } = i;
  const guard = i.position === 'Base' || i.position === 'Escolta';

  if (min < 15 && rating >= 6)
    return `Entró desde el banco y cumplió: ${pts} punto${pts === 1 ? '' : 's'} y trabajo serio en ${min} minutos.`;
  if (ast >= 6 && guard)
    return `Manejó el ritmo del equipo y repartió ${ast} asistencias: fue quien rompió la defensa rival.`;
  if (reb >= 9) return `Dueño de los tableros: ${reb} rebotes que valieron oro allá abajo.`;
  if (pts >= 18) return `Imparable de cara al aro: ${pts} puntos y el rival sin respuestas.`;
  if (rating >= 8)
    return `Partidazo completo: ${pts} puntos, ${reb} rebote${reb === 1 ? '' : 's'} y ${ast} asistencia${ast === 1 ? '' : 's'}.`;
  if (rating >= 6) return `Cumplió con su rol: ${pts} puntos, aporte silencioso y pocas licencias.`;
  if (rating === 5) return `Ni fu ni fa: ${pts} punto${pts === 1 ? '' : 's'} en una noche discreta.`;
  if (ast === 0 && guard) return `Noche floja: el juego no pasó por sus manos y aportó poco (${pts} pts).`;
  return `Noche floja: poca producción (${pts} pts) y sin peso en el juego.`;
}
