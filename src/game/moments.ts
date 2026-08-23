// Momentos del mundo: la ciudad también juega. Una semana cualquiera, juega
// la Selección, hay paro de ómnibus o cae un finde largo — y la convocatoria
// lo siente EN LOS DOS EQUIPOS, sin mirar el compromiso de nadie. El momento
// se anuncia al arrancar la semana (previa y calendario), así que se puede
// planificar: no es mala suerte, es la vida avisando.

import { BALANCE } from './balance';
import { DIVISIONS } from '../data/worldData';
import type { GameState, Player, WeekDay, WorldPlayer } from './types';
import type { Rng } from './rng';

const DAYS: WeekDay[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** El día n lugares antes de otro (para "la víspera del partido"). */
function daysBefore(day: WeekDay, n: number): WeekDay {
  const i = DAYS.indexOf(day);
  return DAYS[(i - n + 14) % 7];
}

export interface WeekMomentDef {
  id: string;
  title: string;
  /** Día del momento, relativo al día de partido. */
  day: (gameDay: WeekDay) => WeekDay;
  /** Anuncio de la previa (sale en noticias y en el calendario). */
  announce: (gameDay: WeekDay) => string;
  /** Prob. de que un jugador TUYO falte por esto. No mira el compromiso. */
  userChance: (p: Player) => number;
  /** Excusas propias del momento (se sortean sin repetir en la lista). */
  excuses: string[];
  /** Prob. de que un jugador RIVAL falte por lo mismo: el mundo es parejo. */
  rivalChance: (p: WorldPlayer) => number;
  /** Nota de la previa rival ("a ellos también se les van"). */
  rivalNote: (count: number) => string;
  /** El momento le suma gente al asado de la semana (se juntan igual). */
  asadoBoost?: number;
}

export const WEEK_MOMENTS: WeekMomentDef[] = [
  {
    id: 'seleccion',
    title: 'Juega la Selección',
    day: (gameDay) => gameDay,
    announce: (gameDay) =>
      `La Selección juega un repechaje el ${gameDay} a la noche — el mismo día de la fecha. Media ciudad va a estar mirando eso, y los planteles de TODA la liga van a juntar monedas.`,
    // A la cancha van todos: el compromiso con el club no compite con la
    // camiseta del país. Los sociales arman banda y arrastran.
    userChance: (p) => 0.14 + (p.social >= 70 ? 0.08 : 0),
    excuses: [
      'Consiguió entradas para la Selección hace un mes. "Esto no se repite", se disculpó.',
      'Se va a verla a la casa del cuñado con proyector. Invitó a medio plantel, encima.',
      'Juntada de la barra de siempre para el partido de la Selección. "Es LA fecha", argumentó.',
      'El hermano lo sumó al viaje al estadio a último momento. No lo dudó ni un segundo.',
    ],
    rivalChance: () => 0.18,
    rivalNote: (n) =>
      n === 1
        ? 'La Selección también les pegó a ellos: uno se fue a la cancha.'
        : `La Selección también les pegó a ellos: ${n} se fueron a verla.`,
    asadoBoost: 0.15,
  },
  {
    id: 'paro',
    title: 'Paro de transporte',
    day: (gameDay) => gameDay,
    announce: (gameDay) =>
      `Anunciaron paro de ómnibus para el ${gameDay}. El que no tiene auto o vive lejos la va a pelear — acá y en todos los clubes de la liga.`,
    userChance: (p) => (p.agenda && p.agenda.distanceKm > 30 ? 0.4 : 0.06),
    excuses: [
      'Sin ómnibus no llega: vive del otro lado de la ciudad y nadie lo podía pasar a buscar.',
      'El paro lo dejó a pie. "Si arranco caminando llego para el descuento", calculó.',
      'Entre el paro y la lluvia de la tarde, no consiguió cómo moverse.',
    ],
    rivalChance: (p) => (p.availability.distanceKm > 30 ? 0.4 : 0.07),
    rivalNote: (n) =>
      n === 1
        ? 'El paro también los golpeó: uno de los de lejos no llega.'
        : `El paro también los golpeó: ${n} de ellos quedaron a pie.`,
  },
  {
    id: 'finde_largo',
    title: 'Finde largo',
    day: (gameDay) => daysBefore(gameDay, 1),
    announce: () =>
      'Cayó finde largo y media ciudad se va. Las escapadas familiares no miran el fixture: va a faltar gente en todas las canchas.',
    // La familia no pregunta el compromiso: le pasa al capitán igual que al colgado.
    userChance: () => 0.13,
    excuses: [
      'La familia reservó la escapada del finde largo hace meses. Perdió la pulseada sin pelearla.',
      'Se fue a la costa con los amigos: "lo tenía pago de antes del fixture", juró.',
      'Aprovechó el feriado para visitar a los viejos al interior. Vuelve el lunes.',
    ],
    rivalChance: () => 0.13,
    rivalNote: (n) =>
      n === 1
        ? 'El finde largo también los desarmó: uno de ellos se fue de escapada.'
        : `El finde largo también los desarmó: se les fueron ${n} de escapada.`,
  },
  {
    id: 'recital',
    title: 'Recital en el parque',
    day: (gameDay) => gameDay,
    announce: (gameDay) =>
      `Hay un recital enorme en el parque el ${gameDay}. Los más pibes de todos los planteles consiguieron entradas hace meses.`,
    userChance: (p) => (p.age <= 25 ? 0.22 : 0.03),
    excuses: [
      'Tiene entradas para el recital desde marzo. "Lo siento, esto es sagrado", avisó.',
      'Va al recital con la novia: era eso o la relación, explicó sin que le preguntaran.',
      'Campamento en la puerta del recital desde temprano. Mandó foto de la fila.',
    ],
    rivalChance: (p) => (p.age <= 25 ? 0.22 : 0.03),
    rivalNote: (n) =>
      n === 1
        ? 'El recital les vació el banco: un pibe de ellos fue con entradas.'
        : `El recital les vació el banco: ${n} pibes de ellos tenían entradas.`,
  },
  {
    id: 'mundialito',
    title: 'Final del Mundialito del barrio',
    day: (gameDay) => daysBefore(gameDay, 1),
    announce: () =>
      'El Mundialito de fútbol del barrio define la final este finde. Medio vestuario juega o va a hinchar — y en los otros clubes pasa lo mismo.',
    userChance: (p) => (p.social >= 65 ? 0.18 : 0.05),
    excuses: [
      'Juega la final del Mundialito con los del barrio. "Es una final, entendeme", pidió.',
      'Va a la final del Mundialito a hinchar por los primos. Prometió venir directo… nadie le creyó.',
      'Quedó de parrillero oficial de la final del barrio. El puesto no se delega.',
    ],
    rivalChance: () => 0.1,
    rivalNote: (n) =>
      n === 1
        ? 'El Mundialito del barrio también les sacó uno.'
        : `El Mundialito del barrio también les sacó ${n}.`,
  },
  {
    id: 'tormenta',
    title: 'Temporal anunciado',
    day: (gameDay) => gameDay,
    announce: (gameDay) =>
      `Anuncian temporal fuerte para el ${gameDay}. Se juega igual (el gimnasio es techado), pero llegar va a ser otra historia — para los dos equipos.`,
    userChance: (p) => 0.08 + (p.agenda && p.agenda.distanceKm > 50 ? 0.2 : 0),
    excuses: [
      'Con el temporal se le inundó la entrada de la casa: se quedó achicando agua.',
      'La ruta desde donde vive estaba cortada por el agua. Mandó video del arroyo.',
      '"Con esta agua no saco el auto ni loco", avisó apenas arrancó a llover.',
    ],
    rivalChance: (p) => 0.08 + (p.availability.distanceKm > 50 ? 0.2 : 0),
    rivalNote: (n) =>
      n === 1
        ? 'El temporal también los complicó: uno de ellos quedó aislado.'
        : `El temporal también los complicó: ${n} de ellos no llegaron.`,
  },
];

export function momentById(id: string | undefined | null): WeekMomentDef | undefined {
  return id ? WEEK_MOMENTS.find((m) => m.id === id) : undefined;
}

/** El día de partido de la divisional del club (para fechar el momento). */
export function userGameDay(s: GameState): WeekDay {
  return DIVISIONS.find((d) => d.id === s.divisionId)?.gameDay ?? 'lunes';
}

/**
 * Sortea el momento del mundo de la semana que arranca. Solo fase regular, no
 * repite el de la semana pasada, y lo anuncia en noticias: el chiste es verlo
 * venir y planificar, no enterarse al pasar lista.
 */
export function rollWeekMoment(s: GameState, rng: Rng): void {
  const previous = s.weekMoment?.id ?? null;
  s.weekMoment = null;
  if (s.week > s.seasonLength) return;
  if (!rng.chance(BALANCE.moments.chance)) return;
  const pool = WEEK_MOMENTS.filter((m) => m.id !== previous);
  const def = rng.pick(pool);
  const gameDay = userGameDay(s);
  const day = def.day(gameDay);
  const text = def.announce(gameDay);
  s.weekMoment = { id: def.id, title: def.title, text, day };
  s.news.unshift({ week: s.week, text: `📅 ${def.title}: ${text}`, tone: 'neutral' });
}
