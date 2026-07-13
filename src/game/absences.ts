// Ausencias con decisiones: cada motivo habilita acciones distintas, con
// probabilidad de éxito, costo, efecto en la relación y consecuencias sociales.
// Estructura de datos reutilizable: agregar un motivo es agregar una entrada.

import { clamp } from './balance';
import { coachAffinity } from './relations';
import { logPlayerEvent } from './timeline';
import type { GameState } from './types';
import type { Rng } from './rng';

export type AbsenceActionId =
  | 'aceptar'
  | 'convencer'
  | 'insistir'
  | 'segundo_tiempo'
  | 'uber'
  | 'companero'
  | 'importancia';

export interface AbsenceActionDef {
  id: AbsenceActionId;
  label: string;
  hint: string;
  cost: number;
  baseChance: number;
}

export const ABSENCE_ACTIONS: Record<AbsenceActionId, AbsenceActionDef> = {
  aceptar: { id: 'aceptar', label: 'Aceptar que no viene', hint: 'Sin dramas: la vida está primero', cost: 0, baseChance: 1 },
  convencer: { id: 'convencer', label: 'Intentar convencerlo', hint: 'Una charla de manager a jugador', cost: 0, baseChance: 0.45 },
  insistir: { id: 'insistir', label: 'Insistir', hint: 'Presionarlo: puede venir… o pudrirse', cost: 0, baseChance: 0.35 },
  segundo_tiempo: { id: 'segundo_tiempo', label: 'Que venga al segundo tiempo', hint: 'Llega tarde, pero llega (solo banco)', cost: 0, baseChance: 0.6 },
  uber: { id: 'uber', label: 'Pagarle un Uber', hint: 'Cuesta $25 de la caja del club', cost: 25, baseChance: 0.65 },
  companero: { id: 'companero', label: 'Mandar a un compañero a buscarlo', hint: 'Que lo pase a buscar alguien del grupo', cost: 0, baseChance: 0.5 },
  importancia: { id: 'importancia', label: 'Recordarle lo que se juega', hint: 'Apelar a la camiseta', cost: 0, baseChance: 0.4 },
};

export interface AbsenceReasonDef {
  id: string;
  excuses: string[];
  actions: AbsenceActionId[];
}

/** Motivos estructurados: qué se puede intentar depende de la excusa. */
export const ABSENCE_REASONS: AbsenceReasonDef[] = [
  {
    id: 'mecanico',
    excuses: ['Tenía que llevar el auto al mecánico "sí o sí hoy". El mecánico es su cuñado.'],
    actions: ['convencer', 'uber', 'importancia'],
  },
  {
    id: 'familia',
    excuses: [
      'Cumpleaños de la suegra. Dijo que prefería mil veces venir, pero perdió la votación.',
      'Aniversario de casados. Se olvidó el año pasado: este año no se jugaba otra.',
      'Cumple de 15 de la sobrina. Prometió llegar para el segundo tiempo; nadie le creyó.',
      'Quedó de armar el asado familiar. Mandó foto del fuego encendido como prueba.',
      'Se fue al camping con la familia política. "Sin señal", fue lo último que se supo.',
    ],
    actions: ['segundo_tiempo', 'convencer', 'importancia'],
  },
  {
    id: 'trabajo',
    excuses: [
      'La mujer le recordó que "el básquet no paga las cuentas". La sentencia llegó anoche.',
      'La mujer no lo deja venir: ayer ya jugó un partido con los del trabajo y hoy "tocaba familia".',
    ],
    actions: ['segundo_tiempo', 'uber'],
  },
  {
    id: 'vago',
    excuses: ['"Se me complicó", mandó por WhatsApp a las 18:55. No dio más detalles.'],
    actions: ['insistir', 'companero', 'importancia'],
  },
  {
    id: 'nene',
    excuses: ['Cayó la esposa con la lista del súper y el nene con fiebre. No hubo caso.'],
    actions: ['segundo_tiempo', 'convencer'],
  },
  {
    // Día bloqueado de la agenda: lo avisó al firmar, cuesta más darlo vuelta.
    id: 'agenda',
    excuses: ['Compromiso fijo del día: te lo avisó cuando arregló venir.'],
    actions: ['segundo_tiempo', 'importancia'],
  },
];

export function reasonById(id: string): AbsenceReasonDef | undefined {
  return ABSENCE_REASONS.find((r) => r.id === id);
}

/**
 * Resuelve una acción del manager ante una ausencia. Un solo intento por
 * jugador: si falla, no vino y capaz encima se pudrió.
 */
export function attemptAbsenceAction(
  state: GameState,
  playerId: string,
  actionId: AbsenceActionId,
  rng: Rng
): GameState {
  const s: GameState = structuredClone(state);
  const entry = s.callUp.find((c) => c.playerId === playerId && c.status === 'ausente' && !c.resolved);
  const player = s.players.find((p) => p.id === playerId);
  const action = ABSENCE_ACTIONS[actionId];
  if (!entry || !player || !action) return s;

  entry.resolved = true;

  if (actionId === 'aceptar') {
    player.motivation = clamp(player.motivation + 1);
    entry.resolution = 'Le dijiste que no pasa nada. Lo valoró: la vida está primero.';
    s.seed = rng.nextSeed();
    return s;
  }

  if (action.cost > 0 && s.club.money < action.cost) {
    entry.resolved = false;
    return state;
  }

  // Éxito según la relación con vos, su compromiso y lo que se juega.
  const bigGame = s.week > s.seasonLength || s.week === s.seasonLength;
  const chance = Math.max(
    0.05,
    Math.min(
      0.9,
      action.baseChance + (coachAffinity(player) - 50) * 0.004 + (player.commitment - 50) * 0.002 + (bigGame ? 0.15 : 0)
    )
  );

  if (action.cost > 0) {
    s.club.money -= action.cost;
    s.ledger.push({ week: s.week, concept: `Uber para ${player.name}`, amount: -action.cost });
  }

  if (rng.chance(chance)) {
    entry.status = 'confirmado';
    if (actionId === 'segundo_tiempo') {
      entry.lateArrival = true;
      entry.resolution = 'Aceptó: llega para el segundo tiempo. Solo puede entrar desde el banco.';
    } else {
      entry.resolution = 'Funcionó: viene al partido. Excusa archivada hasta la próxima.';
    }
    player.motivation = clamp(player.motivation + 2);
    logPlayerEvent(player, s.seasonNumber, s.week, 'animo', `Iba a faltar y lo diste vuelta (${action.label.toLowerCase()}).`);

    // Consecuencia social: el plantel mira cómo tratás a cada uno.
    if (rng.chance(0.35)) {
      const topThree = [...s.players]
        .filter((p) => !p.leftClub)
        .sort((a, b) => b.visibleRating - a.visibleRating)
        .slice(0, 3);
      const isStar = topThree.some((p) => p.id === player.id);
      if (isStar && (actionId === 'uber' || actionId === 'convencer')) {
        s.club.socialClimate = clamp(s.club.socialClimate - 2);
        s.news.unshift({
          week: s.week,
          text: `Parte del plantel sintió que las figuras reciben un trato preferencial (${player.name}).`,
          tone: 'bad',
        });
        entry.resolution += ' Aunque en el grupo alguno levantó la ceja.';
      } else {
        s.club.socialClimate = clamp(s.club.socialClimate + 2);
        s.news.unshift({
          week: s.week,
          text: `El grupo valoró que hicieras el esfuerzo para que ${player.name} llegara.`,
          tone: 'good',
        });
      }
    }
  } else {
    const hit = actionId === 'insistir' ? -4 : -1;
    player.motivation = clamp(player.motivation + hit);
    entry.resolution =
      actionId === 'insistir'
        ? 'No vino igual, y encima se pudrió de la insistencia.'
        : 'No hubo caso: esta semana no cuenta con él.';
  }

  s.seed = rng.nextSeed();
  return s;
}
