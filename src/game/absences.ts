// Ausencias con decisiones: cada motivo habilita acciones distintas, con
// probabilidad de éxito, costo, efecto en la relación y consecuencias sociales.
// Estructura de datos reutilizable: agregar un motivo es agregar una entrada.

import { clamp } from './balance';
import { bumpGrievance } from './mood';
import { affinity, coachAffinity, FRIEND_THRESHOLD } from './relations';
import { logPlayerEvent } from './timeline';
import { pickVoicedRng, type VoicePools } from './voices';
import type { GameState, Player } from './types';
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
  /**
   * Cómo falta cada arquetipo con ese mismo motivo: el cumplidor avisa el
   * lunes con el motivo real, el talentoso informal escribe a las 19:05. Es
   * opcional y parcial a propósito (ver `voices.ts`): donde no hay voz propia,
   * manda `excuses`.
   */
  voices?: VoicePools;
  actions: AbsenceActionId[];
}

/** Motivos estructurados: qué se puede intentar depende de la excusa. */
export const ABSENCE_REASONS: AbsenceReasonDef[] = [
  {
    id: 'mecanico',
    excuses: [
      'Tenía que llevar el auto al mecánico "sí o sí hoy". El mecánico es su cuñado.',
      'Se le quedó el auto en la vuelta de casa. Mandó foto del capó abierto, por las dudas.',
      'Le prestó el auto al hermano y volvió tarde. "Nunca más", juró, como todos los meses.',
    ],
    voices: {
      mercenario: ['Dice que el auto no arranca y que pagar un Uber hasta allá "no le cierra".'],
      cumplidor: ['Se le rompió el auto y avisó a las ocho de la mañana, con foto y presupuesto del taller.'],
      talentoso_informal: ['Tiene el auto roto hace tres semanas. Sigue "viendo qué hace".'],
      veterano: ['El auto en el taller y arriba de un ómnibus no se sube: "ya viajé bastante parado en mi vida".'],
    },
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
    voices: {
      social: ['Cumpleaños familiar con asado propio. Mandó foto de la mesa y la leyenda: "el próximo lo hago para el plantel".'],
      leal: ['Compromiso familiar sin escapatoria. Pidió disculpas dos veces y preguntó el resultado antes de que terminara el partido.'],
      cumplidor: ['Avisó el lunes: "el sábado tengo el cumpleaños de mi hija, no voy a estar". Puntual hasta para faltar.'],
      protagonista: ['Evento familiar impostergable. "Sin mí van a sufrir", avisó, medio en broma.'],
    },
    actions: ['segundo_tiempo', 'convencer', 'importancia'],
  },
  {
    id: 'trabajo',
    excuses: [
      'La mujer le recordó que "el básquet no paga las cuentas". La sentencia llegó anoche.',
      'La mujer no lo deja venir: ayer ya jugó un partido con los del trabajo y hoy "tocaba familia".',
      'Le cargaron horas extra a último momento y no se pudo negar: está juntando para las vacaciones.',
      'Cierre de mes en la oficina. "Salgo a las nueve, no llego ni loco", avisó resignado.',
    ],
    voices: {
      mercenario: ['Le salió una changa que se cobra esa misma noche. La eligió sin dudar ni un segundo.'],
      cumplidor: ['Le cayó laburo a último momento y se quedó: "si me voy ahora, queda todo tirado".'],
      competitivo: ['Se peleó con el jefe para poder salir y perdió. Lo contó con más bronca que el resultado del partido.'],
    },
    actions: ['segundo_tiempo', 'uber'],
  },
  {
    id: 'vago',
    excuses: [
      '"Se me complicó", mandó por WhatsApp a las 18:55. No dio más detalles.',
      'Dejó el visto en el grupo toda la tarde. Apareció a la noche: "uh, recién veo".',
      '"Estoy re al horno, hoy no me da", escribió. Nadie averiguó con qué.',
      'Se quedó dormido en el sillón. Lo confesó él mismo, sin culpa.',
    ],
    voices: {
      talentoso_informal: [
        '"Uh, me colgué", escribió a las 19:05. El partido era a las 19:00.',
        'Estaba en la playa "hasta recién". Recién eran las siete de la tarde.',
      ],
      mercenario: ['"Hoy no me sirve ir", puso, y no agregó nada más.'],
      social: ['Se quedó en un cumpleaños al que había ido "un ratito". Eran las nueve y seguía ahí.'],
      veterano: ['"Hoy el cuerpo me dijo que no", avisó. A esta altura se lo respeta y no se pregunta.'],
      protagonista: ['"Si voy a jugar veinte minutos, mejor descanso", tiró, sin que nadie le hubiera preguntado.'],
    },
    actions: ['insistir', 'companero', 'importancia'],
  },
  {
    id: 'nene',
    excuses: [
      'Cayó la esposa con la lista del súper y el nene con fiebre. No hubo caso.',
      'Le tocó llevar a la nena al cumpleaños de una compañerita. Peleó y perdió.',
      'Se quedó sin quién le cuide los chicos justo hoy. Preguntó en el grupo, sin suerte.',
    ],
    actions: ['segundo_tiempo', 'convencer'],
  },
  {
    // Día bloqueado de la agenda: lo avisó al firmar, cuesta más darlo vuelta.
    id: 'agenda',
    excuses: [
      'Compromiso fijo del día: te lo avisó cuando arregló venir.',
      'El día que te había marcado como imposible. Cumplió con avisar, al menos.',
      'Tiene su compromiso de siempre este día: quedó claro desde que firmó.',
    ],
    actions: ['segundo_tiempo', 'importancia'],
  },
  {
    // El momento del mundo (la Selección, el paro, el finde largo): la excusa
    // la pone la ciudad, no el jugador. Se puede intentar darlo vuelta.
    id: 'momento',
    excuses: [
      'Se sumó al plan del que se baja todo el mundo esta semana.',
      'Cayó en la volteada de la semana: tenía el plan armado hace rato.',
    ],
    actions: ['convencer', 'importancia'],
  },
  // --- Imprevistos de la vida: le pasan a cualquiera, hasta al capitán ---
  {
    id: 'enfermo',
    excuses: [
      'Cayó con fiebre y anginas. La voz al teléfono lo confirmaba: no está para correr.',
      'Gripe de cama. Mandó un audio con una voz que dio lástima al grupo entero.',
      'Pasó la noche con el estómago revuelto. "No me subo a un auto ni loco", avisó.',
    ],
    voices: {
      veterano: ['Anda con una gripe que "a los veinte se pasaba en un día". Ahora no.'],
      competitivo: ['Con fiebre y ofreciéndose igual. Hubo que decirle que no viniera.'],
    },
    actions: [], // contra la fiebre no hay charla técnica
  },
  {
    id: 'viaje',
    excuses: [
      'Está de viaje por el laburo: vuelve el lunes. Avisó apenas le confirmaron el pasaje.',
      'Se fue el finde largo con la familia. Lo tenía reservado hace meses y avisó con tiempo.',
    ],
    actions: [],
  },
  {
    id: 'guardia',
    excuses: [
      'Lo llamaron del trabajo por una urgencia: le tocó cubrir la guardia.',
      'Se cayó el sistema en la oficina y lo llamaron un domingo. "Salgo cuando pueda", prometió.',
      'Le pidieron que cubriera a un compañero que faltó. Dijo que sí antes de mirar el calendario.',
      'Quedó de urgencia en el trabajo: alguien tenía que quedarse y le tocó a él.',
    ],
    voices: {
      cumplidor: ['Le pidieron cubrir la guardia y dijo que sí antes de pensarlo. Después preguntó si servía llegar para el segundo tiempo.'],
      mercenario: ['Le pagan doble por quedarse. No hizo falta que lo pensara.'],
    },
    actions: ['segundo_tiempo'],
  },
];

/**
 * Elige una excusa sin repetir: ni la de otro compañero en la misma lista, ni
 * la que puso él la vez pasada. Dos "le tocó cubrir la guardia" seguidos
 * convierten a las personas en plantillas.
 *
 * Con el mismo criterio, la voz del arquetipo pesa pero no monopoliza: si el
 * mercenario faltara siempre con sus dos frases propias, cambiaríamos un molde
 * por otro más chico.
 */
export function pickExcuse(reason: AbsenceReasonDef, player: Player, used: Set<string>, rng: Rng): string {
  const excuse = pickVoicedRng(player.personality, reason.voices ?? {}, reason.excuses, rng, {
    used,
    avoid: player.lastExcuse,
  });
  player.lastExcuse = excuse;
  return excuse;
}

/** Imprevistos que no dependen del compromiso: se sortean parejo para todos. */
export const LIFE_REASON_IDS = ['enfermo', 'viaje', 'guardia'] as const;

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
  // Con la lista pasada sobre la hora no hay margen: te enteraste recién y el
  // partido es ya. Aceptar la baja es lo único que queda.
  if (state.callUpTiming === 'tarde' && actionId !== 'aceptar') return state;
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

  // Mandar a un compañero funciona si de verdad tiene un amigo en el plantel:
  // las sociedades del asado y las amistades pesan acá.
  let friend: Player | undefined;
  let friendAdj = 0;
  if (actionId === 'companero') {
    const candidates = s.players.filter((x) => !x.leftClub && x.id !== player.id && x.status !== 'lesionado');
    friend = candidates
      .map((x) => ({ x, aff: affinity(player, x, s.affinityBonus) }))
      .sort((a, b) => b.aff - a.aff)
      .filter((c) => c.aff >= FRIEND_THRESHOLD)[0]?.x;
    friendAdj = friend ? 0.18 : -0.12;
  }

  // Éxito según la relación con vos, su compromiso y lo que se juega.
  const bigGame = s.week > s.seasonLength || s.week === s.seasonLength;
  const chance = Math.max(
    0.05,
    Math.min(
      0.9,
      action.baseChance +
        (coachAffinity(player) - 50) * 0.004 +
        (player.commitment - 50) * 0.002 +
        (bigGame ? 0.15 : 0) +
        friendAdj
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
    } else if (actionId === 'companero' && friend) {
      entry.resolution = `${friend.name} lo pasó a buscar sin preguntar. Llegaron juntos, ya cambiados.`;
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
    // Presionarlo y que igual no venga deja marca: la próxima te atiende peor.
    if (actionId === 'insistir') bumpGrievance(s, player, 'trato');
    entry.resolution =
      actionId === 'insistir'
        ? 'No vino igual, y encima se pudrió de la insistencia.'
        : actionId === 'companero' && !friend
          ? 'Nadie del grupo se ofreció a ir a buscarlo. Eso también dice algo del vestuario.'
          : 'No hubo caso: esta semana no cuenta con él.';
  }

  s.seed = rng.nextSeed();
  return s;
}
