// Estados humanos: la frase contextual que acompaña a cada número.
// Regla de diseño (design/DESIGN.md): si el motor sabe el "por qué", la UI
// no muestra la cifra sola. Este módulo centraliza esas frases.

import { grievanceCause, grievanceNote } from './mood';
import { affinity, coachAffinity, FRIEND_THRESHOLD, RIVALRY_THRESHOLD } from './relations';
import type { GameState, Player, PlayerEmotion } from './types';

/**
 * Categoría de la nota. La UI la dibuja con un ícono de línea del set propio.
 *
 * Antes cada nota traía su emoji y había diecinueve distintos (😠 🩹 💸 🪑 🥵 🫥
 * 💪 ⚡ 🍻 🧊 👊 …). Dos problemas: los emoji de colores dentro de una interfaz
 * son la firma más obvia de pantalla generada, y a 16px nadie distingue "fundido"
 * de "desmotivado" — diecinueve glifos únicos es ruido, no sistema.
 *
 * Seis categorías más el `tone` que ya existía alcanzan: el ícono dice de qué
 * habla la nota y el color dice si es buena o mala.
 */
export type NoteKind = 'animo' | 'fisico' | 'plata' | 'social' | 'cancha' | 'agenda' | 'alerta';

export interface HumanNote {
  kind: NoteKind;
  text: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  /** Jugador mencionado por nombre en el texto: la UI lo vuelve un link a su ficha. */
  refId?: string;
  refName?: string;
}

/** Expresión del retrato (índice de Appearance.expression) para cada emoción postpartido. */
export const EMOTION_EXPRESSION: Record<PlayerEmotion, number> = {
  euforico: 1,
  orgulloso: 1,
  contento: 1,
  conforme: 0,
  indiferente: 0,
  frustrado: 2,
  molesto_minutos: 2,
  decepcionado: 3,
};

/**
 * Frases contextuales sobre cómo está un jugador, de la más urgente a la menos.
 * La card muestra la primera; la ficha las muestra todas.
 */
export function playerNotes(state: GameState, p: Player): HumanNote[] {
  const notes: HumanNote[] = [];
  const promises = state.promises.filter((pr) => pr.playerId === p.id && pr.season === state.seasonNumber);

  // La queja activa manda: es la misma que ve el radar y la acción de hablar,
  // con su historia ("van 3 semanas") en vez de una foto suelta.
  const grievance = grievanceNote(p, Math.min(state.week, state.seasonLength));

  if (p.status === 'al_borde') {
    const why = grievanceCause(p);
    notes.push({
      kind: 'alerta',
      text: why
        ? `Al borde de irse por ${why}: una semana más así y busca otro club.`
        : 'Al borde de irse: una semana más así y busca otro club.',
      tone: 'bad',
    });
  } else if (grievance) {
    notes.push({ kind: 'animo', text: grievance, tone: p.grievance!.level >= 2 ? 'bad' : 'warn' });
  } else if (p.status === 'molesto') {
    if (p.weeksBenched >= 2 && p.expectedRole === 'titular') {
      notes.push({
        kind: 'animo',
        text: `Molesto: esperaba ser titular y lleva ${p.weeksBenched} semanas mirando desde el banco.`,
        tone: 'bad',
      });
    } else if (p.weeksBenched >= 2) {
      notes.push({ kind: 'animo', text: `Molesto: lleva ${p.weeksBenched} semanas sin arrancar de titular.`, tone: 'bad' });
    } else {
      notes.push({ kind: 'animo', text: 'Viene molesto: en el vestuario se lo nota callado.', tone: 'bad' });
    }
  } else if (p.status === 'lesionado') {
    notes.push({
      kind: 'fisico',
      text: `Lesionado: le queda${p.injuryWeeks > 1 ? 'n' : ''} ${p.injuryWeeks} semana${p.injuryWeeks > 1 ? 's' : ''} de recuperación.`,
      tone: 'bad',
    });
  }

  const broken = promises.find((pr) => pr.broken);
  if (broken) {
    notes.push({ kind: 'social', text: 'Le rompiste una promesa: de eso no se olvida.', tone: 'bad' });
  } else if (p.grudge && p.grudge.season < state.seasonNumber && p.grudge.season >= state.seasonNumber - 1) {
    // El rencor cruzó de temporada: lo va a poner sobre la mesa cuando negocien.
    notes.push({
      kind: 'social',
      text: `Sigue masticando la promesa rota del año pasado (${p.grudge.label.replace(`${p.name}: `, '').toLowerCase()}).`,
      tone: 'bad',
    });
  } else if (promises.length > 0) {
    notes.push({
      kind: 'social',
      text: `Le prometiste ${promises[0].label.replace(`${p.name}: `, '').toLowerCase()}: lo tiene anotado.`,
      tone: 'warn',
    });
  }

  if (p.feeStatus === 'pendiente') {
    notes.push(
      p.weeksUnpaid >= 3
        ? { kind: 'plata', text: `Debe ${p.weeksUnpaid} semanas de cuota: en la comisión ya se comenta.`, tone: 'bad' }
        : { kind: 'plata', text: 'Cuota atrasada: dice que la semana que viene se pone al día.', tone: 'warn' }
    );
  } else if (p.feeStatus === 'beca_total' || p.feeStatus === 'beca_parcial') {
    notes.push({ kind: 'plata', text: 'Juega con beca: el club lo banca para que esté.', tone: 'neutral' });
  }

  if (p.agenda && p.agenda.notes.length > 0) {
    notes.push({
      kind: 'agenda',
      text: p.agenda.notes.join(' '),
      tone: p.agenda.blockedDays.length > 0 || p.agenda.onlyTimes.length > 0 ? 'warn' : 'neutral',
    });
  }

  if (p.status === 'disponible' && p.weeksBenched >= 3 && p.expectedRole !== 'suplente') {
    notes.push({ kind: 'cancha', text: `Lleva ${p.weeksBenched} semanas sin ser titular; por ahora no dijo nada.`, tone: 'warn' });
  }

  if (p.lastRating !== null && p.lastRating >= 8) {
    notes.push({ kind: 'animo', text: `Viene de un partidazo (${p.lastRating}/10): está en confianza.`, tone: 'good' });
  } else if (p.lastRating !== null && p.lastRating <= 3) {
    notes.push({ kind: 'animo', text: `El último partido fue para el olvido (${p.lastRating}/10).`, tone: 'warn' });
  }

  if (p.physical <= 35 && p.status !== 'lesionado') {
    notes.push({ kind: 'fisico', text: 'Fundido: entre el trabajo y los partidos necesita un respiro.', tone: 'warn' });
  }
  if (p.motivation <= 35 && p.status === 'disponible') {
    notes.push({ kind: 'animo', text: 'Desmotivado: viene a entrenar sin ganas.', tone: 'warn' });
  } else if (p.motivation >= 85 && p.status === 'disponible') {
    notes.push({ kind: 'animo', text: 'A pleno: de los primeros en llegar al entrenamiento.', tone: 'good' });
  }

  // Relaciones al final: son estables semana a semana, así no acaparan el
  // único renglón de la card (la ficha las muestra igual, entre todas).
  const mates = state.players.filter((x) => !x.leftClub && x.id !== p.id);
  let bestMate: Player | undefined, worstMate: Player | undefined;
  let bestVal = -1, worstVal = 101;
  for (const m of mates) {
    const v = affinity(p, m, state.affinityBonus);
    if (v > bestVal) { bestVal = v; bestMate = m; }
    if (v < worstVal) { worstVal = v; worstMate = m; }
  }
  if (worstMate && worstVal <= RIVALRY_THRESHOLD) {
    notes.push({ kind: 'social', text: `No se banca a ${worstMate.name}: mejor no dejarlos marcándose en la práctica.`, tone: 'warn', refId: worstMate.id, refName: worstMate.name });
  }
  if (bestMate && bestVal >= FRIEND_THRESHOLD) {
    notes.push({ kind: 'social', text: `Íntimo de ${bestMate.name}: donde va uno, va el otro.`, tone: 'good', refId: bestMate.id, refName: bestMate.name });
  }
  const coach = coachAffinity(p);
  if (coach <= 30) {
    notes.push({ kind: 'social', text: 'La relación con vos viene fría: contesta con monosílabos.', tone: 'warn' });
  } else if (coach >= 80) {
    notes.push({ kind: 'social', text: 'Con vos tiene buena onda: es de los que te bancan en el grupo.', tone: 'good' });
  }

  return notes;
}
