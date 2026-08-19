// Estado emocional unificado: la fuente única del humor de cada jugador.
//
// Antes había tres islas que no se hablaban: la emoción del postpartido (que
// se calculaba al mostrarla y no dejaba rastro), el estado `molesto` (que solo
// miraba la motivación) y las promesas (con su propio registro). El informe
// del partido decía "molesto por sus minutos" y a la semana siguiente el menú
// contestaba "no hay jugadores molestos".
//
// Acá vive la pieza que faltaba: la QUEJA ACTIVA. Una por jugador, la más
// grave. Nace cuando pasa algo concreto, ESCALA si el motivo se repite y vos
// no hacés nada, se CALMA si la atendés (con una charla o, mejor, con hechos)
// y DECAE sola cuando el motivo deja de repetirse. Todo lo demás —informe,
// radar de "qué mirar hoy", la acción de hablarle, los eventos y la ficha—
// lee de acá.

import { clamp } from './balance';
import { logPlayerEvent } from './timeline';
import type { GameState, Grievance, GrievanceCause, Player } from './types';

/**
 * Cuántas repeticiones del motivo hacen falta para escalar de nivel.
 * Medido con `npm run sim`: con umbrales más bajos (2 y 4) el plantel al que
 * nunca le das bola pierde 2+ jugadores por temporada y la economía se cae
 * atrás. Tres fechas es "se está haciendo costumbre"; seis es media temporada
 * comiéndose el banco, y ahí sí se justifica que se vaya.
 */
const HITS_TO_LEVEL2 = 3;
const HITS_TO_LEVEL3 = 6;

/** Semanas sin que el motivo se repita para que la bronca empiece a bajar. */
const WEEKS_TO_COOL = 3;

/** Gravedad relativa: si aparecen dos motivos, manda el más pesado. */
const CAUSE_RANK: Record<GrievanceCause, number> = {
  promesa: 5,
  minutos: 4,
  trato: 3,
  plata: 2,
  grupo: 1,
};

export const CAUSE_SHORT: Record<GrievanceCause, string> = {
  minutos: 'los minutos',
  promesa: 'la promesa incumplida',
  plata: 'la plata',
  trato: 'cómo lo trataron',
  grupo: 'el clima del grupo',
};

/**
 * Golpe de motivación al escalar de nivel: la bronca se paga. Va encima de lo
 * que ya descuenta el banco cada fecha, así que se queda corto a propósito, y
 * el nivel 1 no toca ningún número: una molestia es una anotación, no un
 * castigo. Recién cuando se hace costumbre pesa en el ánimo.
 */
const LEVEL_HIT = [0, 0, -4, -6];

export function isHot(p: Player): boolean {
  return (p.grievance?.level ?? 0) >= 2;
}

export function isBurning(p: Player): boolean {
  return (p.grievance?.level ?? 0) >= 3;
}

/** Nivel que le corresponde a una queja según cuánto se repitió (y si la ignoraste). */
function levelFor(g: Grievance): number {
  // Atenderla y que igual vuelva a pasar duele el doble: "te lo dije".
  const weight = g.hits + (g.attended ?? 0);
  if (weight >= HITS_TO_LEVEL3) return 3;
  if (weight >= HITS_TO_LEVEL2) return 2;
  return 1;
}

/**
 * Pasó algo que le da bronca. Si ya tenía una queja por el mismo motivo,
 * escala; si tenía una más leve por otro motivo, la reemplaza; si la que
 * tenía es más grave, esa manda y esto solo suma ruido.
 *
 * Devuelve el nivel resultante (0 si no quedó queja).
 */
export function bumpGrievance(
  s: GameState,
  p: Player,
  cause: GrievanceCause,
  opts: { floor?: number; note?: string } = {}
): number {
  if (p.leftClub) return 0;
  const week = Math.min(s.week, s.seasonLength);
  const current = p.grievance;

  if (current && current.season === s.seasonNumber && current.cause === cause) {
    current.hits += 1;
    current.lastHitWeek = week;
    const before = current.level;
    current.level = Math.max(current.level, levelFor(current), opts.floor ?? 1);
    if (current.level > before) escalated(s, p, current, opts.note);
    return current.level;
  }

  // Otra causa: solo desplaza a la anterior si pesa más de verdad.
  if (current && current.season === s.seasonNumber) {
    const beats = CAUSE_RANK[cause] > CAUSE_RANK[current.cause] || (opts.floor ?? 1) > current.level;
    if (!beats) {
      current.lastHitWeek = week; // sigue caliente, aunque hable de otra cosa
      return current.level;
    }
  }

  const fresh: Grievance = {
    cause,
    level: Math.max(1, opts.floor ?? 1),
    hits: 1,
    season: s.seasonNumber,
    sinceWeek: week,
    lastHitWeek: week,
    attended: 0,
  };
  p.grievance = fresh;
  if (fresh.level >= 2) escalated(s, p, fresh, opts.note);
  else p.motivation = clamp(p.motivation + LEVEL_HIT[fresh.level]);
  return fresh.level;
}

/** La bronca subió de escalón: se nota en el ánimo, en la historia y en las noticias. */
function escalated(s: GameState, p: Player, g: Grievance, note?: string): void {
  const week = Math.min(s.week, s.seasonLength);
  p.motivation = clamp(p.motivation + LEVEL_HIT[g.level]);
  const weeks = Math.max(1, week - g.sinceWeek + 1);
  const text =
    note ??
    (g.level >= 3
      ? `Se le acabó la paciencia con ${CAUSE_SHORT[g.cause]}: ${weeks} semanas masticando lo mismo.`
      : `Dejó de ser un comentario al pasar: ${CAUSE_SHORT[g.cause]} le calienta en serio.`);
  logPlayerEvent(p, s.seasonNumber, week, 'animo', text);
  s.news.unshift({
    week,
    text:
      g.level >= 3
        ? `${p.name} ya no lo disimula: ${CAUSE_SHORT[g.cause]} lo tiene al límite. O lo atendés o se va a pudrir.`
        : `${p.name} está caliente por ${CAUSE_SHORT[g.cause]}. Van ${weeks} semana${weeks > 1 ? 's' : ''}.`,
    tone: 'bad',
  });
}

/**
 * La atendiste. Una charla baja un escalón; los hechos (minutos, plata,
 * cumplir) la apagan. Queda anotado que la atendiste: si el motivo vuelve a
 * pasar igual, la próxima escala más rápido.
 */
export function sootheGrievance(s: GameState, p: Player, how: 'charla' | 'hechos'): void {
  const g = p.grievance;
  if (!g) return;
  const week = Math.min(s.week, s.seasonLength);
  if (how === 'hechos' || g.level <= 1) {
    p.grievance = null;
    logPlayerEvent(
      p,
      s.seasonNumber,
      week,
      'animo',
      how === 'hechos'
        ? `Se le pasó la bronca por ${CAUSE_SHORT[g.cause]}: esta vez fueron hechos, no charla.`
        : `Quedó a mano con el club: ${CAUSE_SHORT[g.cause]} dejó de ser tema.`
    );
    return;
  }
  g.level -= 1;
  g.hits = Math.max(0, g.hits - 1);
  g.attended = (g.attended ?? 0) + 1;
  logPlayerEvent(p, s.seasonNumber, week, 'animo', `Charla por ${CAUSE_SHORT[g.cause]}: bajó la espuma, pero el tema sigue.`);
}

/**
 * Versión sin estado ni relato: la usan los eventos que ya cuentan su propio
 * desenlace y solo necesitan que la bronca afloje un escalón.
 */
export function easeGrievance(p: Player): void {
  const g = p.grievance;
  if (!g) return;
  if (g.level <= 1) {
    p.grievance = null;
    return;
  }
  g.level -= 1;
  g.hits = Math.max(0, g.hits - 1);
  g.attended = (g.attended ?? 0) + 1;
}

/**
 * Decaimiento semanal: si el motivo no se repitió en unas semanas, la bronca
 * se enfría sola. Nadie sostiene el enojo para siempre… salvo que se lo
 * alimentes todas las fechas.
 */
export function decayGrievance(s: GameState, p: Player): void {
  const g = p.grievance;
  if (!g) return;
  const week = Math.min(s.week, s.seasonLength);
  if (g.season !== s.seasonNumber) {
    p.grievance = null;
    return;
  }
  if (week - g.lastHitWeek < WEEKS_TO_COOL) return;
  g.hits = Math.max(0, g.hits - 1);
  g.lastHitWeek = week - WEEKS_TO_COOL + 1; // el reloj vuelve a arrancar
  const next = Math.min(g.level, levelFor(g));
  if (next < 1 || g.hits === 0) {
    p.grievance = null;
    logPlayerEvent(p, s.seasonNumber, week, 'animo', `Se le pasó: ${CAUSE_SHORT[g.cause]} quedó atrás.`);
    return;
  }
  g.level = next;
}

/** Los que tienen algo pendiente con vos, del más caliente al menos. */
export function aggrieved(s: GameState, minLevel = 1): Player[] {
  return s.players
    .filter((p) => !p.leftClub && (p.grievance?.level ?? 0) >= minLevel)
    .sort(
      (a, b) =>
        (b.grievance!.level - a.grievance!.level) ||
        (b.grievance!.hits - a.grievance!.hits) ||
        (a.motivation - b.motivation)
    );
}

/** El motivo en una frase de dos palabras ("los minutos"), para armar textos. */
export function grievanceCause(p: Player): string | null {
  return p.grievance ? CAUSE_SHORT[p.grievance.cause] : null;
}

/** Ícono según cuán espesa está la bronca. */
/* grievanceIcon() se fue con los emoji de las notas: el nivel de la queja ya
   viaja en el `tone` de la HumanNote, y el color dice lo mismo sin un glifo. */

/** Frase corta para la ficha y la plantilla ("Caliente por los minutos · 3 semanas"). */
export function grievanceNote(p: Player, week: number): string | null {
  const g = p.grievance;
  if (!g) return null;
  const weeks = Math.max(1, week - g.sinceWeek + 1);
  const head = g.level >= 3 ? 'Al límite por' : g.level === 2 ? 'Caliente por' : 'Molesto por';
  return `${head} ${CAUSE_SHORT[g.cause]} · ${weeks} semana${weeks > 1 ? 's' : ''} con lo mismo`;
}

/** Qué le dirías si te lo cruzás hoy: alimenta el radar y la acción de hablarle. */
export function grievanceWarning(p: Player, week: number): string {
  const g = p.grievance!;
  const weeks = Math.max(1, week - g.sinceWeek + 1);
  switch (g.cause) {
    case 'minutos':
      return g.level >= 3
        ? `${p.name} lleva ${weeks} semanas comiéndose el banco y ya lo dice en voz alta. O juega o se va.`
        : `${p.name} viene masticando bronca por los minutos (${weeks} semana${weeks > 1 ? 's' : ''}). Una charla o un rato en cancha lo ordenan.`;
    case 'promesa':
      return g.level >= 3
        ? `${p.name} no te perdona la promesa rota y ya no le importa quién lo escuche.`
        : `${p.name} sigue con la promesa incumplida atragantada. Habría que dar la cara.`;
    case 'plata':
      return `${p.name} quedó dolido con el tema de la plata. En un club amateur eso se pudre rápido.`;
    case 'trato':
      return g.level >= 3
        ? `${p.name} siente que lo trataste mal y ya lo hizo saber en el grupo.`
        : `${p.name} quedó dolido por cómo se manejó lo suyo.`;
    case 'grupo':
      return `${p.name} no está cómodo en el vestuario. Si el clima no cambia, se despega.`;
  }
}

/**
 * El humor accionable de todo el plantel, ya priorizado. Lo usan la acción de
 * hablar, el radar y los eventos: todos miran la misma lista.
 */
export function upsetPlayers(s: GameState): Player[] {
  const candidates = s.players.filter(
    (p) => !p.leftClub && (isHot(p) || p.status === 'molesto' || p.status === 'al_borde')
  );
  // Primero el que está por irse, después el de la bronca más vieja y espesa,
  // y al final el que solo tiene la motivación por el piso.
  const urgency = (p: Player) =>
    (p.status === 'al_borde' ? 100 : 0) + (p.grievance?.level ?? 0) * 10 + (p.grievance?.hits ?? 0);
  return candidates.sort((a, b) => urgency(b) - urgency(a) || a.motivation - b.motivation);
}
