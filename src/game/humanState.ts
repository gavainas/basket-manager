// Estados humanos: la frase contextual que acompaña a cada número.
// Regla de diseño (design/DESIGN.md): si el motor sabe el "por qué", la UI
// no muestra la cifra sola. Este módulo centraliza esas frases.

import type { GameState, Player, PlayerEmotion } from './types';

export interface HumanNote {
  icon: string;
  text: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
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

  if (p.status === 'al_borde') {
    notes.push({ icon: '🚨', text: 'Al borde de irse: una semana más así y busca otro club.', tone: 'bad' });
  } else if (p.status === 'molesto') {
    if (p.weeksBenched >= 2 && p.expectedRole === 'titular') {
      notes.push({
        icon: '😠',
        text: `Molesto: esperaba ser titular y lleva ${p.weeksBenched} semanas mirando desde el banco.`,
        tone: 'bad',
      });
    } else if (p.weeksBenched >= 2) {
      notes.push({ icon: '😠', text: `Molesto: lleva ${p.weeksBenched} semanas sin arrancar de titular.`, tone: 'bad' });
    } else {
      notes.push({ icon: '😠', text: 'Viene molesto: en el vestuario se lo nota callado.', tone: 'bad' });
    }
  } else if (p.status === 'lesionado') {
    notes.push({
      icon: '🩹',
      text: `Lesionado: le queda${p.injuryWeeks > 1 ? 'n' : ''} ${p.injuryWeeks} semana${p.injuryWeeks > 1 ? 's' : ''} de recuperación.`,
      tone: 'bad',
    });
  }

  const broken = promises.find((pr) => pr.broken);
  if (broken) {
    notes.push({ icon: '💔', text: 'Le rompiste una promesa: de eso no se olvida.', tone: 'bad' });
  } else if (promises.length > 0) {
    notes.push({
      icon: '🤝',
      text: `Le prometiste ${promises[0].label.replace(`${p.name}: `, '').toLowerCase()}: lo tiene anotado.`,
      tone: 'warn',
    });
  }

  if (p.feeStatus === 'pendiente') {
    notes.push(
      p.weeksUnpaid >= 3
        ? { icon: '💸', text: `Debe ${p.weeksUnpaid} semanas de cuota: en la comisión ya se comenta.`, tone: 'bad' }
        : { icon: '💸', text: 'Cuota atrasada: dice que la semana que viene se pone al día.', tone: 'warn' }
    );
  } else if (p.feeStatus === 'beca_total' || p.feeStatus === 'beca_parcial') {
    notes.push({ icon: '🎓', text: 'Juega con beca: el club lo banca para que esté.', tone: 'neutral' });
  }

  if (p.status === 'disponible' && p.weeksBenched >= 3 && p.expectedRole !== 'suplente') {
    notes.push({ icon: '🪑', text: `Lleva ${p.weeksBenched} semanas sin ser titular; por ahora no dijo nada.`, tone: 'warn' });
  }

  if (p.lastRating !== null && p.lastRating >= 8) {
    notes.push({ icon: '🔥', text: `Viene de un partidazo (${p.lastRating}/10): está en confianza.`, tone: 'good' });
  } else if (p.lastRating !== null && p.lastRating <= 3) {
    notes.push({ icon: '🕳', text: `El último partido fue para el olvido (${p.lastRating}/10).`, tone: 'warn' });
  }

  if (p.physical <= 35 && p.status !== 'lesionado') {
    notes.push({ icon: '🥵', text: 'Fundido: entre el trabajo y los partidos necesita un respiro.', tone: 'warn' });
  }
  if (p.motivation <= 35 && p.status === 'disponible') {
    notes.push({ icon: '🫥', text: 'Desmotivado: viene a entrenar sin ganas.', tone: 'warn' });
  } else if (p.motivation >= 85 && p.status === 'disponible') {
    notes.push({ icon: '⚡', text: 'A pleno: de los primeros en llegar al entrenamiento.', tone: 'good' });
  }

  return notes;
}
