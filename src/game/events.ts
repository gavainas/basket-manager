import { planAsado, weeksSinceAsado } from './asado';
import { BALANCE, clamp } from './balance';
import { affinity } from './relations';
import { createRecruit } from '../data/recruits';
import { bumpGrievance, easeGrievance, sootheGrievance } from './mood';
import type { ActiveEvent, DelayedNote, GameState, Player, ScheduledEvent, TrialCandidate } from './types';
import type { Rng } from './rng';

export interface EventOptionDef {
  label: string;
  hint?: string;
}

export interface EventDef {
  id: string;
  title: string;
  weight: number;
  canFire: (state: GameState) => boolean;
  /** Si es true, no entra en el sorteo semanal: solo se dispara encadenado. */
  chained?: boolean;
  /** Elige jugadores implicados. Devuelve null si no hay objetivo válido. */
  pickTargets?: (state: GameState, rng: Rng) => { playerId?: string; playerId2?: string } | null;
  text: (state: GameState, ev: ActiveEvent) => string;
  options: (state: GameState, ev: ActiveEvent) => EventOptionDef[];
  /** Muta el estado (ya clonado) y devuelve el desenlace. */
  resolve: (state: GameState, ev: ActiveEvent, optionIndex: number, rng: Rng) => string;
}

function actives(s: GameState): Player[] {
  return s.players.filter((p) => !p.leftClub);
}

/** Las figuras de verdad: el top 3 de técnica del plantel. Si un evento habla de "tu figura", tiene que ser una de estas. */
function figuras(s: GameState): Player[] {
  return [...actives(s)].sort((a, b) => b.technique - a.technique).slice(0, 3);
}

function byId(s: GameState, id: string | undefined): Player {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new Error(`Jugador no encontrado en evento: ${id}`);
  return p;
}

/** Marca a un jugador como molesto sin pisar una lesión ni estados peores. */
function upset(p: Player): void {
  if (p.status === 'disponible' && p.motivation < BALANCE.weekly.lowMotivationThreshold) {
    p.status = 'molesto';
    p.weeksUpset = 0;
  }
}

/**
 * Calma a un jugador molesto/al borde sin curar mágicamente una lesión.
 * También afloja la queja que traía: el humor es uno solo, no puede quedar
 * "tranquilo" en un lado y "caliente" en el otro.
 */
function calm(p: Player): void {
  if (p.status === 'molesto' || p.status === 'al_borde') {
    p.status = 'disponible';
  }
  p.weeksUpset = 0;
  easeGrievance(p);
}

/** Agenda una reacción diferida: se comunica y aplica semanas después. */
function later(s: GameState, weeksAhead: number, note: Omit<DelayedNote, 'week' | 'season'>): void {
  (s.delayed ??= []).push({ ...note, season: s.seasonNumber, week: s.week + weeksAhead });
}

/** Encadena un evento interactivo: la decisión de hoy trae otra decisión semanas después. */
function chain(s: GameState, weeksAhead: number, ev: Omit<ScheduledEvent, 'week' | 'season'>): void {
  (s.scheduledEvents ??= []).push({ ...ev, season: s.seasonNumber, week: s.week + weeksAhead });
}

function makeLeave(s: GameState, p: Player, reason: string): void {
  p.leftClub = true;
  s.playersLeftCount += 1;
  s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
  s.news.unshift({ week: s.week, text: `${p.name} dejó el club. ${reason}`, tone: 'bad' });
}

export const EVENTS: EventDef[] = [
  {
    id: 'minutos',
    title: 'Reclamo de minutos',
    weight: 10,
    canFire: (s) => actives(s).some((p) => p.weeksBenched >= 1 && (p.personality === 'protagonista' || p.personality === 'competitivo')),
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.weeksBenched >= 1 && (p.personality === 'protagonista' || p.personality === 'competitivo'));
      if (!cands.length) return null;
      // Si alguno ya viene masticando bronca por los minutos, es ÉL el que te
      // encara: el evento cae sobre la historia que ya venía, no sobre un
      // nombre al azar.
      const hot = cands.filter((p) => p.grievance?.cause === 'minutos');
      return { playerId: rng.pick(hot.length ? hot : cands).id };
    },
    text: (s, ev) => `${byId(s, ev.playerId).name} te encara después del entrenamiento: "Vine a jugar, no a mirar. Si no cuento para vos, decímelo de frente".`,
    options: () => [
      { label: 'Prometerle protagonismo', hint: 'Se motiva, pero va a esperar ser titular' },
      { label: '"El puesto se gana en la cancha"', hint: 'Mensaje duro: puede caer mal' },
    ],
    resolve: (s, ev, opt) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        p.motivation = clamp(p.motivation + 10);
        p.expectedRole = 'titular';
        return `${p.name} se fue conforme. Ahora espera ser titular: si lo dejás en el banco, va a doler el doble.`;
      }
      p.motivation = clamp(p.motivation - 8);
      p.commitment = clamp(p.commitment + 3);
      upset(p);
      later(s, 2, {
        playerId: p.id,
        text: `${p.name} sigue rumiando aquella charla: "el puesto se gana en la cancha", repite imitándote.`,
        tone: 'neutral',
        motivation: -1,
      });
      return `${p.name} apretó los dientes. Quizás lo tome como desafío… o quizás empiece a mirar otros equipos.`;
    },
  },
  {
    id: 'discusion',
    title: 'Discusión en el vestuario',
    weight: 9,
    canFire: (s) => actives(s).length >= 2,
    pickTargets: (s, rng) => {
      const cands = rng.shuffle(actives(s));
      if (cands.length < 2) return null;
      // La pelea busca el roce real: del primero sorteado, el compañero con peor afinidad.
      const first = cands[0];
      const worst = cands
        .slice(1)
        .reduce((w, p) => (affinity(first, p, s.affinityBonus) < affinity(first, w, s.affinityBonus) ? p : w));
      return { playerId: first.id, playerId2: worst.id };
    },
    text: (s, ev) => `${byId(s, ev.playerId).name} y ${byId(s, ev.playerId2).name} se dijeron de todo por una marca mal hecha. El vestuario quedó cortado al medio.`,
    options: () => [
      { label: 'Mediar entre los dos', hint: 'Funciona mejor si el club está organizado' },
      { label: 'Que lo arreglen entre ellos', hint: 'El ambiente puede resentirse' },
    ],
    resolve: (s, ev, opt, rng) => {
      const a = byId(s, ev.playerId);
      const b = byId(s, ev.playerId2);
      if (opt === 0) {
        const success = rng.chance(0.45 + s.club.organization / 200);
        if (success) {
          s.club.socialClimate = clamp(s.club.socialClimate + 5);
          a.social = clamp(a.social + 3);
          b.social = clamp(b.social + 3);
          later(s, 1, {
            text: `${a.name} y ${b.name} se quedaron charlando después de entrenar: la pelea quedó oficialmente enterrada.`,
            tone: 'good',
            climate: 2,
          });
          return 'La reunión terminó con un apretón de manos. El grupo valoró que alguien se hiciera cargo.';
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 3);
        return 'La mediación quedó a mitad de camino: se saludan, pero la tensión sigue ahí.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 6);
      const worse = rng.pick([a, b]);
      worse.motivation = clamp(worse.motivation - 6);
      upset(worse);
      later(s, 2, {
        playerId: worse.id,
        text: `${worse.name} sigue masticando la pelea de hace dos semanas: en el grupo contesta seco.`,
        tone: 'bad',
        motivation: -2,
      });
      return `Nadie cedió. ${worse.name} quedó especialmente caliente y el ambiente se enrareció.`;
    },
  },
  {
    id: 'cuota_impaga',
    title: 'Otra cuota sin pagar',
    weight: 8,
    canFire: (s) => actives(s).some((p) => p.feeStatus === 'pendiente' && p.weeksUnpaid >= 2),
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.feeStatus === 'pendiente' && p.weeksUnpaid >= 2);
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) => {
      const p = byId(s, ev.playerId);
      return `${p.name} acumula ${p.weeksUnpaid} semanas sin pagar la cuota. El tesorero te mira fijo: "¿Y con este qué hacemos?"`;
    },
    options: () => [
      { label: 'Exigirle el pago ya', hint: 'Puede pagar… o calentarse' },
      { label: 'Darle una semana más', hint: 'Los cumplidores toman nota' },
      { label: 'Ofrecerle beca parcial', hint: 'Paga la mitad; el clima puede resentirse' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        if (rng.chance(0.2 + p.commitment / 130)) {
          const owed = BALANCE.economy.feeWeekly * Math.min(p.weeksUnpaid, 3);
          s.club.money += owed;
          s.ledger.push({ week: s.week, concept: `${p.name} puso al día su cuota`, amount: owed });
          p.feeStatus = 'pagada';
          p.weeksUnpaid = 0;
          p.motivation = clamp(p.motivation - 3);
          return `${p.name} pagó $${owed} de mala gana. Plata es plata.`;
        }
        p.motivation = clamp(p.motivation - 8);
        upset(p);
        bumpGrievance(s, p, 'trato', { note: 'Le cobraron la cuota como a un cliente y lo tomó personal.' });
        return `${p.name} se ofendió: "¿Me estás cobrando como a un cliente?". Sigue debiendo y quedó molesto.`;
      }
      if (opt === 1) {
        const cumplidores = actives(s).filter((x) => x.personality === 'cumplidor' && x.id !== p.id);
        for (const c of cumplidores) c.motivation = clamp(c.motivation - 2);
        return `Le diste aire a ${p.name}. Algún cumplidor anotó el gesto en la libreta mental.`;
      }
      p.feeStatus = 'beca_parcial';
      p.weeksUnpaid = 0;
      p.motivation = clamp(p.motivation + 8);
      if (p.grievance?.cause === 'plata') sootheGrievance(s, p, 'hechos');
      s.club.socialClimate = clamp(s.club.socialClimate - 3);
      return `${p.name} acepta pagar media cuota. Se queda tranquilo, aunque el arreglo no cayó bien en todos.`;
    },
  },
  {
    id: 'sponsor_local',
    title: 'Oferta del almacén',
    weight: 6,
    canFire: () => true,
    text: () => 'El almacenero de la esquina ofrece $120 por única vez a cambio de que el equipo se saque fotos con la gorra de su negocio.',
    options: () => [
      { label: 'Aceptar y posar sonrientes', hint: '+$120, algo de prestigio social' },
      { label: 'Rechazar con elegancia', hint: 'Sin plata, sin compromisos' },
    ],
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        s.club.money += 120;
        s.ledger.push({ week: s.week, concept: 'Foto con la gorra del almacén', amount: 120 });
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        return 'Fotos con gorra y sonrisa. $120 para la caja y el almacenero feliz.';
      }
      return 'Declinaste con respeto. El almacenero prometió volver "cuando sean primera".';
    },
  },
  {
    id: 'camiseta_perdida',
    title: 'Se perdió una camiseta',
    weight: 5,
    canFire: () => true,
    text: () => 'Apareció el bolso, pero falta la camiseta número 7. Nadie sabe nada, todos se miran.',
    options: () => [
      { label: 'Comprar una de repuesto', hint: 'Cuesta $40' },
      { label: 'Que juegue con una vieja desteñida', hint: 'La imagen del club sufre' },
    ],
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        if (s.club.money < 40) {
          s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
          return 'No había plata ni para eso. Camiseta vieja y papelón a medias.';
        }
        s.club.money -= 40;
        s.ledger.push({ week: s.week, concept: 'Camiseta de repuesto', amount: -40 });
        return 'Camiseta nueva encargada. Nadie en la liga se enteró del papelón.';
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
      s.club.organization = clamp(s.club.organization - 3);
      return 'El 7 jugó con una camiseta de otro tono. Hubo risitas en la tribuna de enfrente.';
    },
  },
  {
    id: 'amigo_talentoso',
    title: 'Un amigo con talento',
    weight: 6,
    canFire: (s) =>
      !s.trialCandidate && actives(s).length < 15 && actives(s).some((p) => p.personality === 'social' || p.personality === 'leal'),
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.personality === 'social' || p.personality === 'leal');
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) => `${byId(s, ev.playerId).name} trae un dato: "Tengo un amigo que jugó federado y anda buscando equipo. ¿Le digo que venga a probarse?"`,
    options: () => [
      { label: 'Que venga a probarse', hint: 'Entrena una semana y después decidís' },
      { label: 'Decir que no hay lugar', hint: 'El que invita se desilusiona' },
    ],
    resolve: (s, ev, opt, rng) => {
      const inviter = byId(s, ev.playerId);
      if (opt === 0) {
        const friend = createRecruit(rng, { minTechnique: 60, maxTechnique: 80, season: s.seasonNumber });
        friend.description = `Amigo de ${inviter.name}. Se nota que jugó en serio, falta ver si se engancha con el grupo.`;
        // No entra al plantel: queda a prueba, entrena una semana y recién ahí decidís.
        s.trialCandidate = {
          player: friend,
          inviterId: inviter.id,
          inviterName: inviter.name,
          arrivedWeek: s.week,
          practiceRating: null,
          practiceNote: '',
        };
        inviter.motivation = clamp(inviter.motivation + 3);
        s.news.unshift({ week: s.week, text: `Un amigo de ${inviter.name} se suma a entrenar para probarse.`, tone: 'neutral' });
        return `Le dijiste que se sume a la práctica. La semana que viene vas a ver cómo anduvo y ahí decidís si lo sumás.`;
      }
      inviter.motivation = clamp(inviter.motivation - 6);
      return `${inviter.name} quedó desilusionado: "Era buenísimo, te aviso". Ojalá no lo tome a mal.`;
    },
  },
  {
    id: 'prueba_amigo',
    title: 'La prueba del amigo',
    // No se sortea al azar: lo fuerza advanceWeek cuando el amigo ya entrenó.
    weight: 0,
    canFire: (s) => !!s.trialCandidate && s.trialCandidate.practiceRating !== null,
    text: (s) => {
      const tc = s.trialCandidate;
      if (!tc) return 'La prueba ya se resolvió.';
      const f = tc.player;
      return `Se probó ${f.name} (${f.position}, ${f.age} años), el amigo de ${tc.inviterName}. ${tc.practiceNote} (rindió ${tc.practiceRating}/10 en la práctica). ¿Lo sumás al plantel?`;
    },
    options: () => [
      { label: 'Sumarlo al plantel', hint: 'Refuerzo real, pero alguno puede celar minutos' },
      { label: 'Agradecerle: no es para el equipo', hint: 'Queda la buena onda, el que invita se desilusiona un poco' },
    ],
    resolve: (s, _ev, opt) => {
      const tc = s.trialCandidate;
      if (!tc) return 'La prueba ya no estaba pendiente.';
      s.trialCandidate = null;
      const inviter = s.players.find((p) => p.id === tc.inviterId && !p.leftClub);
      const friend = tc.player;
      if (opt === 0) {
        friend.joinedSeason = s.seasonNumber;
        s.players.push(friend);
        if (inviter) inviter.motivation = clamp(inviter.motivation + 5);
        const protas = actives(s).filter((p) => p.personality === 'protagonista' && p.id !== friend.id);
        for (const p of protas) p.motivation = clamp(p.motivation - 2);
        s.news.unshift({
          week: s.week,
          text: `${friend.name} se sumó al plantel tras probarse, invitado por ${tc.inviterName}.`,
          tone: 'good',
        });
        return `${friend.name} ya es parte del plantel. ${
          protas.length ? 'Algún protagonista lo mira de reojo por los minutos.' : 'El grupo lo recibió bien.'
        }`;
      }
      if (inviter) inviter.motivation = clamp(inviter.motivation - 6);
      s.news.unshift({ week: s.week, text: `${friend.name} se probó pero no quedó en el club.`, tone: 'neutral' });
      return `Le agradeciste la buena onda pero no quedó. ${tc.inviterName} lo tomó con cara larga: "Para mí jugaba, eh".`;
    },
  },
  {
    id: 'ausencia_clave',
    title: 'Baja de última hora',
    weight: 7,
    canFire: (s) => actives(s).filter((p) => p.status !== 'lesionado').length >= 6,
    pickTargets: (s, rng) => {
      // Preferimos que la baja duela (una figura), pero si el plantel no tiene
      // técnica alta, el laburo le complica la semana a cualquiera.
      const sanos = actives(s).filter((p) => p.status !== 'lesionado');
      const cands = sanos.filter((p) => p.technique >= 60);
      const pool = cands.length ? cands : sanos;
      return pool.length ? { playerId: rng.pick(pool).id } : null;
    },
    text: (s, ev) => `${byId(s, ev.playerId).name} avisa por audio: "No llego al partido de esta semana, me surgió algo del laburo. Perdón, en serio".`,
    options: () => [
      { label: 'Aceptarlo sin drama', hint: 'La vida amateur es así' },
      { label: 'Recriminarle el aviso tardío', hint: 'Puede caer pésimo' },
    ],
    resolve: (s, ev, opt) => {
      const p = byId(s, ev.playerId);
      p.status = 'lesionado'; // no disponible esta semana
      p.injuryWeeks = 1;
      p.injuryReason = 'laboral'; // no está roto: está laburando
      if (opt === 0) {
        p.social = clamp(p.social + 3);
        p.motivation = clamp(p.motivation + 2);
        return `${p.name} agradeció la comprensión. Esta semana no está; habrá que rearmar el quinteto.`;
      }
      p.motivation = clamp(p.motivation - 8);
      p.commitment = clamp(p.commitment + 4);
      bumpGrievance(s, p, 'trato');
      return `${p.name} respondió seco: "Ok". Igual no viene, y encima quedó picante el asunto.`;
    },
  },
  {
    id: 'quiere_abandonar',
    title: 'Quiere dejar el equipo',
    weight: 10,
    canFire: (s) => actives(s).some((p) => p.motivation < 40) && actives(s).length > 7,
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.motivation < 40);
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) => `${byId(s, ev.playerId).name} te manda un mensaje largo: no se está divirtiendo, siente que no aporta y está pensando en dejar.`,
    options: () => [
      { label: 'Convencerlo con una charla', hint: 'Depende del ambiente del club' },
      { label: 'Dejarlo ir sin vueltas', hint: 'Un jugador menos, y el grupo lo siente' },
      { label: 'Ofrecerle beca para que se quede', hint: 'Se queda, pero deja de pagar cuota' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        if (rng.chance(0.3 + s.club.socialClimate / 180 + p.social / 300)) {
          p.motivation = clamp(p.motivation + 15);
          calm(p);
          s.memorableMoments.push(`Semana ${s.week}: la charla que hizo que ${p.name} se quedara.`);
          return `${p.name} se emocionó con la charla: "Está bien, me quedo. Pero que esto mejore". Una para el recuerdo.`;
        }
        makeLeave(s, p, 'Ni la charla lo convenció.');
        return `Lo intentaste, pero ${p.name} ya tenía la decisión tomada. Se fue en buenos términos.`;
      }
      if (opt === 1) {
        makeLeave(s, p, 'Nadie lo retuvo.');
        s.club.socialClimate = clamp(s.club.socialClimate - 4);
        return `${p.name} dejó el grupo esa misma noche. Algunos sintieron que el club no pelea por su gente.`;
      }
      p.feeStatus = 'beca_total';
      p.weeksUnpaid = 0;
      p.motivation = clamp(p.motivation + 10);
      calm(p);
      s.club.socialClimate = clamp(s.club.socialClimate - 2);
      return `${p.name} acepta quedarse becado. Se queda, pero la caja del club lo va a notar.`;
    },
  },
  {
    id: 'lesion_leve',
    title: 'Molestia física',
    weight: 7,
    canFire: (s) => actives(s).some((p) => p.status !== 'lesionado'),
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.status !== 'lesionado');
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) => `${byId(s, ev.playerId).name} terminó el entrenamiento renqueando. Parece una molestia leve, pero el partido está cerca.`,
    options: () => [
      { label: 'Que pare hasta recuperarse', hint: 'Pierde 1-2 semanas, sin riesgos' },
      { label: 'Infiltrarlo y que juegue', hint: 'Disponible, pero puede terminar peor' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        p.status = 'lesionado';
        p.injuryWeeks = rng.int(1, 2);
        return `${p.name} para ${p.injuryWeeks === 1 ? 'una semana' : 'dos semanas'} para curarse bien. Mejor prevenir.`;
      }
      p.physical = clamp(p.physical - 15);
      if (rng.chance(0.3)) {
        p.status = 'lesionado';
        p.injuryWeeks = 3;
        s.news.unshift({ week: s.week, text: `${p.name} se rompió jugando infiltrado: 3 semanas afuera.`, tone: 'bad' });
        return `Salió mal: ${p.name} se resintió feo y estará 3 semanas afuera. La apuesta costó cara.`;
      }
      return `${p.name} apretó los dientes y va a estar disponible, aunque físicamente está lejos de su mejor versión.`;
    },
  },
  {
    id: 'donacion',
    title: 'Donación inesperada',
    weight: 4,
    canFire: () => true,
    text: () => 'Un exjugador del club, hoy comerciante, se acercó a la cancha: "Muchachos, quiero colaborar". Deja $80 para el equipo.',
    options: () => [
      { label: 'Agradecerle públicamente', hint: '+$80 y algo de prestigio social' },
      { label: 'Aceptar con perfil bajo', hint: '+$80 sin ruido' },
    ],
    resolve: (s, _ev, opt) => {
      s.club.money += 80;
      s.ledger.push({ week: s.week, concept: 'Donación de un exjugador', amount: 80 });
      if (opt === 0) {
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        return 'Se le agradeció con aplausos en el entrenamiento. La gente valora un club agradecido.';
      }
      return 'La plata entró a la caja sin anuncios. A veces lo simple es mejor.';
    },
  },
  {
    id: 'queja_organizacion',
    title: 'Quejas por la organización',
    weight: 8,
    canFire: (s) => s.club.organization < 45,
    text: () => 'Varios jugadores se quejan en el grupo: horarios que cambian, planillas que faltan, nadie sabe quién lleva las pelotas. "Esto es un kiosco", escribió uno.',
    options: () => [
      { label: 'Reconocerlo y ordenar todo', hint: 'Cuesta $30 en gestiones, mejora la organización' },
      { label: 'Restarle importancia', hint: 'Los cumplidores se van a enojar' },
    ],
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        const cost = Math.min(30, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: 'Puesta a punto organizativa', amount: -cost });
        s.club.organization = clamp(s.club.organization + 9);
        s.club.socialClimate = clamp(s.club.socialClimate + 3);
        return 'Planilla nueva, horarios fijos y responsables claros. El grupo notó el cambio enseguida.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 5);
      for (const p of actives(s).filter((x) => x.personality === 'cumplidor')) {
        p.motivation = clamp(p.motivation - 5);
        upset(p);
      }
      return '"Siempre lo mismo", cerró el chat. Los más ordenados del grupo quedaron masticando bronca.';
    },
  },
  {
    id: 'festejo_espontaneo',
    title: 'El grupo quiere festejar',
    weight: 5,
    canFire: (s) => s.lastMatch?.won === true,
    text: () => 'Después de la victoria, el grupo quedó arriba: proponen juntarse el viernes a festejar. Te invitan, obvio.',
    options: () => [
      { label: 'Sumarse y pagar una ronda', hint: 'Cuesta $30, gran gesto' },
      { label: 'Pasar un rato e irse temprano', hint: 'Cumplís sin gastar' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        const cost = Math.min(30, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: 'Ronda de festejo', amount: -cost });
        s.club.socialClimate = clamp(s.club.socialClimate + 8);
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        if (rng.chance(0.3)) {
          s.memorableMoments.push(`Semana ${s.week}: el festejo del viernes que terminó con todos cantando el himno del club (que no existe).`);
          return 'Noche redonda: hasta inventaron un himno del club. El grupo está más unido que nunca.';
        }
        return 'La ronda cayó de maravilla. El manager también sabe festejar.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate + 2);
      return 'Pasaste, saludaste y te fuiste. Nadie lo tomó a mal, pero tampoco sumó demasiado.';
    },
  },
  {
    id: 'oferta_rival',
    title: 'Un rival tienta a tu figura',
    weight: 7,
    // "Tu figura" tiene que ser la figura: solo tienta a los del top del plantel.
    canFire: (s) => figuras(s).some((p) => p.technique >= 68 && p.motivation < 60),
    pickTargets: (s, rng) => {
      const cands = figuras(s).filter((p) => p.technique >= 68 && p.motivation < 60);
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) =>
      `Te llega el rumor: un club rival le ofreció a ${byId(s, ev.playerId).name} camiseta titular asegurada y cuota gratis. Él todavía no dijo nada.`,
    options: () => [
      { label: 'Encararlo y prometerle protagonismo', hint: 'Puede retenerlo… o apurarlo' },
      { label: 'Becarlo para igualar la oferta', hint: 'Se queda, pero deja de pagar' },
      { label: 'No hacer nada y confiar', hint: 'Depende de su lealtad' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        if (rng.chance(0.4 + p.social / 250 + s.club.socialPrestige / 400)) {
          p.motivation = clamp(p.motivation + 12);
          p.expectedRole = 'titular';
          calm(p);
          return `${p.name} valoró que fueras de frente: "Acá tengo amigos, me quedo". Ahora espera ser importante.`;
        }
        p.motivation = clamp(p.motivation - 5);
        return `${p.name} escuchó todo con cara de póker. "Lo voy a pensar", dijo. No suena bien.`;
      }
      if (opt === 1) {
        p.feeStatus = 'beca_total';
        p.weeksUnpaid = 0;
        p.motivation = clamp(p.motivation + 10);
        calm(p);
        const cumplidores = actives(s).filter((x) => x.personality === 'cumplidor' && x.id !== p.id);
        for (const c of cumplidores) c.motivation = clamp(c.motivation - 3);
        return `${p.name} se queda con beca total. La billetera del club y algún cumplidor lo sintieron.`;
      }
      if (p.personality === 'leal' || p.personality === 'veterano' || rng.chance(0.5)) {
        p.motivation = clamp(p.motivation + 3);
        return `${p.name} rechazó la oferta solo: "Yo de acá no me muevo". La lealtad existe.`;
      }
      makeLeave(s, p, 'Se fue al club rival que lo tentó.');
      s.club.sportPrestige = clamp(s.club.sportPrestige - 3);
      return `${p.name} se fue al rival sin siquiera avisar en persona. Golpe duro para el grupo.`;
    },
  },
  {
    id: 'cancha_ocupada',
    title: 'Problema con la cancha',
    weight: 6,
    canFire: (s) => s.club.organization < 55,
    text: () => 'Llegan a entrenar y hay otro equipo en la cancha: el dueño vendió el horario dos veces. Nadie hizo el depósito a tiempo.',
    options: () => [
      { label: 'Pagar una cancha alternativa', hint: 'Cuesta $60, se entrena igual' },
      { label: 'Entrenar en la plaza', hint: 'Gratis, pero da imagen de club chico' },
    ],
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        if (s.club.money < 60) {
          s.club.socialClimate = clamp(s.club.socialClimate - 4);
          s.club.organization = clamp(s.club.organization - 3);
          return 'No había plata para otra cancha: medio equipo se volvió a su casa masticando bronca.';
        }
        s.club.money -= 60;
        s.ledger.push({ week: s.week, concept: 'Cancha alternativa de urgencia', amount: -60 });
        s.club.organization = clamp(s.club.organization + 2);
        return 'Se consiguió cancha a diez cuadras y se entrenó igual. Caro, pero el grupo valoró la reacción.';
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
      s.club.socialClimate = clamp(s.club.socialClimate + 3);
      for (const p of actives(s)) p.physical = clamp(p.physical - 2);
      return 'Entrenamiento en la plaza, con perros cruzando la cancha. Se rieron mucho, aunque de básquet hubo poco.';
    },
  },
  {
    id: 'arbitro_polemico',
    title: 'Bronca con el arbitraje',
    weight: 6,
    canFire: (s) => s.lastMatch !== null && !s.lastMatch.won && !s.lastMatch.forfeit,
    text: () => 'El grupo sigue caliente con el árbitro del último partido: dos fallos escandalosos en el cierre. Piden que el club haga un reclamo formal a la liga.',
    options: () => [
      { label: 'Presentar el reclamo', hint: 'Cuesta $20; la liga puede darte la razón' },
      { label: 'Dar vuelta la página', hint: 'Los más competitivos no lo van a entender' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        const cost = Math.min(20, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: 'Reclamo formal a la liga', amount: -cost });
        if (rng.chance(0.5)) {
          s.club.sportPrestige = clamp(s.club.sportPrestige + 3);
          for (const p of actives(s).filter((x) => x.personality === 'competitivo')) p.motivation = clamp(p.motivation + 4);
          return 'La liga admitió los errores y amonestó al árbitro. El plantel sintió que el club los defiende.';
        }
        s.club.sportPrestige = clamp(s.club.sportPrestige - 2);
        return 'La liga desestimó el reclamo y encima quedamos como llorones. Mejor ganar los partidos.';
      }
      for (const p of actives(s).filter((x) => x.personality === 'competitivo')) {
        p.motivation = clamp(p.motivation - 3);
      }
      return 'Decidiste no hacer olas. Los competitivos murmuraron algo sobre "un club sin sangre".';
    },
  },
  {
    id: 'cumpleanos',
    title: 'Cumpleaños en el plantel',
    weight: 5,
    canFire: (s) => actives(s).length >= 2,
    pickTargets: (s, rng) => ({ playerId: rng.pick(actives(s)).id }),
    text: (s, ev) => `Esta semana cumple años ${byId(s, ev.playerId).name}. En el grupo ya empezaron con los memes.`,
    options: () => [
      { label: 'Torta y festejo después de entrenar', hint: 'Cuesta $25, suma al grupo' },
      { label: 'Saludo en el grupo y a otra cosa', hint: 'Cumple el protocolo' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        const cost = Math.min(25, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: `Festejo de cumpleaños de ${p.name}`, amount: -cost });
        p.motivation = clamp(p.motivation + 8);
        p.social = clamp(p.social + 4);
        s.club.socialClimate = clamp(s.club.socialClimate + 5);
        later(s, 1, {
          text: `Siguen circulando fotos del cumpleaños de ${p.name} en el grupo. El clima quedó arriba.`,
          tone: 'good',
          climate: 1,
        });
        if (rng.chance(0.2)) {
          s.memorableMoments.push(`Semana ${s.week}: el cumpleaños de ${p.name} terminó con torta en la cara y fotos épicas.`);
          return `El festejo de ${p.name} se fue de las manos (para bien). Torta en la cara incluida.`;
        }
        return `Torta, velitas y abrazos para ${p.name}. Estas cosas hacen club.`;
      }
      p.motivation = clamp(p.motivation + 1);
      return `"¡Feliz cumple crack! 🎂" y veinte emojis. ${p.name} agradeció, aunque esperaba algo más.`;
    },
  },
  {
    id: 'periodista_barrial',
    title: 'La página del barrio quiere una nota',
    weight: 5,
    canFire: (s) => s.club.sportPrestige >= 50 || s.club.socialPrestige >= 55,
    text: () => 'La página de Facebook del barrio ("Pasión Deportiva Zonal") quiere hacer una nota sobre el club. Piden fotos y una entrevista al manager.',
    options: () => [
      { label: 'Dar la nota con todo el plantel', hint: 'Visibilidad para el club' },
      { label: 'Mantener perfil bajo', hint: 'Sin exposición, sin riesgos' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        s.club.socialPrestige = clamp(s.club.socialPrestige + 4);
        s.club.sportPrestige = clamp(s.club.sportPrestige + 2);
        for (const p of actives(s).filter((x) => x.personality === 'protagonista')) p.motivation = clamp(p.motivation + 4);
        if (rng.chance(0.25)) {
          s.memorableMoments.push(`Semana ${s.week}: la nota en "Pasión Deportiva Zonal" que compartió medio barrio.`);
          return 'La nota explotó en el barrio: cientos de compartidos. Los protagonistas están en su salsa.';
        }
        return 'Salió la nota con foto grupal. El club suena en el barrio y a más de uno le gustó verse.';
      }
      return 'Agradeciste y dijiste que no era el momento. El periodista lo entendió… por ahora.';
    },
  },
  {
    id: 'mudanza',
    title: 'Se muda de ciudad',
    weight: 4,
    canFire: (s) => actives(s).length > 8,
    pickTargets: (s, rng) => {
      // Los de bajo compromiso son los candidatos naturales, pero una mudanza
      // le puede tocar a cualquiera: si no hay, se sortea entre todos.
      const cands = actives(s).filter((p) => p.commitment < 70);
      const pool = cands.length ? cands : actives(s);
      return pool.length ? { playerId: rng.pick(pool).id } : null;
    },
    text: (s, ev) =>
      `${byId(s, ev.playerId).name} junta al grupo: consiguió trabajo en otra ciudad y se muda en dos semanas. Esta es su última semana en el club.`,
    options: () => [
      { label: 'Despedirlo con un asado', hint: 'Cuesta $40; el grupo lo va a recordar' },
      { label: 'Desearle suerte y seguir', hint: 'La vida sigue, el fixture también' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        const cost = Math.min(40, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: `Despedida de ${p.name}`, amount: -cost });
        s.club.socialClimate = clamp(s.club.socialClimate + 6);
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        makeLeave(s, p, 'Se mudó por trabajo, despedido como se debe.');
        if (rng.chance(0.4)) {
          s.memorableMoments.push(`Semana ${s.week}: la despedida de ${p.name}, con discurso y camiseta firmada por todos.`);
        }
        return `La despedida de ${p.name} terminó con camiseta firmada y algún lagrimón. Así se despide a los que hacen club.`;
      }
      makeLeave(s, p, 'Se mudó por trabajo.');
      s.club.socialClimate = clamp(s.club.socialClimate - 3);
      return `${p.name} se fue con un simple "suerte muchachos" en el grupo. Quedó un sabor amargo.`;
    },
  },
  {
    id: 'sobrino_socio',
    title: 'El sobrino del vecino',
    weight: 4,
    canFire: (s) => actives(s).length < 14,
    text: () =>
      'Un vecino histórico del club pide un favor: que su sobrino de 19 años entrene con ustedes. "No es Jordan, pero tiene ganas", admite.',
    options: () => [
      { label: 'Darle una oportunidad', hint: 'Suma un cuerpo al plantel y buena onda en el barrio' },
      { label: 'Decir que no hay lugar', hint: 'El vecino no lo va a olvidar' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        const kid = createRecruit(rng, { minTechnique: 35, maxTechnique: 52, season: s.seasonNumber });
        kid.age = 19;
        kid.description = 'El sobrino del vecino. Le falta juego, pero corre todo y no falta nunca.';
        kid.commitment = rng.int(75, 95);
        s.players.push(kid);
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        s.club.socialClimate = clamp(s.club.socialClimate + 2);
        s.news.unshift({ week: s.week, text: `Se sumó ${kid.name}, el sobrino del vecino. Puro entusiasmo.`, tone: 'good' });
        return `${kid.name} llegó con championes nuevos y ganas de comerse la cancha. El barrio habla bien del club.`;
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
      return 'Le dijiste que no con diplomacia. El vecino saludó frío en la puerta. Detalle a recordar.';
    },
  },
  {
    id: 'dos_mercenarios',
    title: 'Los que juegan por la plata',
    weight: 6,
    canFire: (s) =>
      actives(s).filter((p) => p.personality === 'mercenario' && p.feeStatus !== 'beca_total' && p.feeStatus !== 'beca_parcial').length >= 2,
    pickTargets: (s, rng) => {
      const cands = rng.shuffle(
        actives(s).filter((p) => p.personality === 'mercenario' && p.feeStatus !== 'beca_total' && p.feeStatus !== 'beca_parcial'),
      );
      if (cands.length < 2) return null;
      return { playerId: cands[0].id, playerId2: cands[1].id };
    },
    text: (s, ev) =>
      `${byId(s, ev.playerId).name} y ${byId(s, ev.playerId2).name} te encaran juntos: "Los que rendimos deberíamos tener la cuota bonificada. Si no, cada uno verá dónde le conviene jugar".`,
    options: () => [
      { label: 'Becar parcialmente a los dos', hint: 'Se quedan tranquilos; la caja lo siente' },
      { label: '"Acá nadie está por encima del club"', hint: 'Firme, pero pueden calentarse' },
      { label: 'Ofrecer un bono por rendimiento', hint: 'Ni beca ni portazo: cobran si juegan bien' },
    ],
    resolve: (s, ev, opt, rng) => {
      const a = byId(s, ev.playerId);
      const b = byId(s, ev.playerId2);
      if (opt === 0) {
        for (const p of [a, b]) {
          p.feeStatus = 'beca_parcial';
          p.weeksUnpaid = 0;
          p.motivation = clamp(p.motivation + 8);
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 4);
        return 'Los dos aceptaron media cuota y bajaron el tono. Algún cumplidor va a preguntar por qué ellos sí.';
      }
      if (opt === 1) {
        for (const p of [a, b]) {
          p.motivation = clamp(p.motivation - 7);
          upset(p);
        }
        const leaver = rng.pick([a, b]);
        later(s, 2, {
          playerId: leaver.id,
          text: `${leaver.name} dejó caer en el grupo que "anda viendo otras canchas". El planteo sigue picando.`,
          tone: 'bad',
          motivation: -2,
        });
        return 'Les marcaste la cancha. Asintieron sin ganas: la relación quedó fría y calculadora.';
      }
      for (const p of [a, b]) p.motivation = clamp(p.motivation + 4);
      s.club.socialClimate = clamp(s.club.socialClimate + 2);
      return 'Les gustó lo del premio por rendimiento: ahora juegan para cobrarlo. Al resto le pareció justo.';
    },
  },
  {
    id: 'veterano_protagonista',
    title: 'Choque de galones',
    weight: 7,
    canFire: (s) =>
      actives(s).some((p) => p.personality === 'veterano') && actives(s).some((p) => p.personality === 'protagonista'),
    pickTargets: (s, rng) => {
      const vets = actives(s).filter((p) => p.personality === 'veterano');
      const stars = actives(s).filter((p) => p.personality === 'protagonista');
      if (!vets.length || !stars.length) return null;
      return { playerId: rng.pick(vets).id, playerId2: rng.pick(stars).id };
    },
    text: (s, ev) =>
      `${byId(s, ev.playerId).name}, el más veterano, y ${byId(s, ev.playerId2).name}, la cara nueva que quiere la pelota, chocan por quién manda en la cancha. El grupo espera ver a quién respaldás.`,
    options: () => [
      { label: 'Respaldar la experiencia del veterano', hint: 'El veterano se agranda; el pibe se resiente' },
      { label: 'Darle las llaves al protagonista', hint: 'El pibe se enchufa; el veterano se siente descartado' },
      { label: 'Ponerlos a jugar juntos', hint: 'Depende del ambiente: puede unir o partir el grupo' },
    ],
    resolve: (s, ev, opt, rng) => {
      const vet = byId(s, ev.playerId);
      const star = byId(s, ev.playerId2);
      if (opt === 0) {
        vet.motivation = clamp(vet.motivation + 8);
        star.motivation = clamp(star.motivation - 6);
        upset(star);
        return `${vet.name} agradeció el respaldo con un asentimiento de capitán. ${star.name} apretó los labios: quiere demostrar que te equivocaste.`;
      }
      if (opt === 1) {
        star.motivation = clamp(star.motivation + 8);
        star.expectedRole = 'titular';
        vet.motivation = clamp(vet.motivation - 6);
        upset(vet);
        return `${star.name} se fue enchufadísimo, ya se siente el dueño del equipo. ${vet.name} se lo bancó en silencio, pero algo se rompió.`;
      }
      if (rng.chance(0.4 + s.club.socialClimate / 200)) {
        vet.social = clamp(vet.social + 4);
        star.social = clamp(star.social + 4);
        s.club.socialClimate = clamp(s.club.socialClimate + 6);
        s.memorableMoments.push(
          `Semana ${s.week}: el veterano ${vet.name} y el joven ${star.name} combinaron para una jugada que gritó todo el club.`,
        );
        return 'Los sentaste a hablar y prendió: el veterano guía, el pibe brilla. La sociedad promete.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 5);
      return 'El experimento no cuajó: siguen sin mirarse en la cancha. El vestuario quedó dividido en dos bandos.';
    },
  },
  {
    id: 'torneo_relampago',
    title: 'Torneo relámpago del finde',
    weight: 6,
    canFire: (s) => actives(s).filter((p) => p.status !== 'lesionado').length >= 6,
    text: () =>
      'Un club vecino arma un torneo relámpago el domingo: tres partidos en un día. Pagan $90 por participar y da roce, pero es una paliza física.',
    options: () => [
      { label: 'Anotarse y jugarlo a full', hint: '+$90 y prestigio, pero el plantel queda fundido' },
      { label: 'Ir con los suplentes', hint: 'Menos plata y roce, cuida a las figuras' },
      { label: 'Pasar: mejor descansar', hint: 'Sin plata, sin desgaste' },
    ],
    resolve: (s, _ev, opt, rng) => {
      const squad = actives(s).filter((x) => x.status !== 'lesionado');
      if (opt === 0) {
        s.club.money += 90;
        s.ledger.push({ week: s.week, concept: 'Torneo relámpago del finde', amount: 90 });
        s.club.sportPrestige = clamp(s.club.sportPrestige + 3);
        s.club.socialClimate = clamp(s.club.socialClimate + 4);
        for (const p of squad) p.physical = clamp(p.physical - 10);
        if (rng.chance(0.25)) {
          const hurt = rng.pick(squad);
          hurt.status = 'lesionado';
          hurt.injuryWeeks = rng.int(1, 2);
          s.news.unshift({
            week: s.week,
            text: `${hurt.name} salió tocado del torneo relámpago: para ${hurt.injuryWeeks === 1 ? 'una semana' : 'dos semanas'}.`,
            tone: 'bad',
          });
          return `Tres partidos en un día: $90, roce y risas, pero ${hurt.name} terminó lesionado. La cuenta salió mixta.`;
        }
        return 'Tres partidos, $90 a la caja y un grupo fundido pero feliz. El finde valió la pena.';
      }
      if (opt === 1) {
        s.club.money += 40;
        s.ledger.push({ week: s.week, concept: 'Torneo relámpago (suplentes)', amount: 40 });
        s.club.socialClimate = clamp(s.club.socialClimate + 3);
        for (const p of squad.filter((x) => x.expectedRole === 'suplente')) {
          p.physical = clamp(p.physical - 6);
          p.motivation = clamp(p.motivation + 5);
        }
        return 'Fueron los suplentes y se divirtieron como nunca: $40, minutos y confianza para los de atrás.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate + 1);
      return 'Preferiste cuidar las piernas. "La próxima vamos", quedó dando vueltas.';
    },
  },
  {
    id: 'clinic_exjugador',
    title: 'Clínica de un exjugador',
    weight: 5,
    canFire: (s) => actives(s).length >= 5,
    text: () =>
      'Un exjugador que llegó a la Liga B se ofrece a dar una clínica gratis: fundamentos, tiro, lectura de juego. Solo pide que le den bola y algo para el mate.',
    options: () => [
      { label: 'Organizar la clínica para todos', hint: 'Cuesta $20 de logística; varios mejoran' },
      { label: 'Agradecer, pero estamos a full', hint: 'Sin gasto, sin mejora' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        const cost = Math.min(20, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: 'Clínica de fundamentos', amount: -cost });
        const learners = rng.shuffle(actives(s)).slice(0, 3);
        for (const p of learners) {
          if (p.technique < 90) {
            p.technique += 1;
            p.techniqueGain += 1;
            if (p.techniqueGain % 2 === 0) p.visibleRating += 1;
          }
          p.motivation = clamp(p.motivation + 4);
        }
        s.club.socialClimate = clamp(s.club.socialClimate + 3);
        return `La clínica fue un golazo: ${learners.map((p) => p.name).join(', ')} salieron con cositas nuevas para probar. Y el mate voló.`;
      }
      return 'Le agradeciste y quedó para otra. El exjugador entendió: "Cuando quieran, avisen".';
    },
  },
  {
    id: 'grupo_caliente',
    title: 'Se picó el grupo de WhatsApp',
    weight: 6,
    canFire: (s) => actives(s).length >= 4,
    text: () =>
      'Alguien mandó un audio de política al grupo del equipo y se armó. Tres se pelearon, dos amenazaron con salirse y el resto pide silencio.',
    options: () => [
      { label: 'Poner orden: solo temas del club', hint: 'Los cumplidores lo agradecen' },
      { label: 'Dejar que se desahoguen', hint: 'El clima puede seguir caldeado' },
      { label: 'Cortar con un meme', hint: 'A veces la risa desactiva todo… o no' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        s.club.organization = clamp(s.club.organization + 3);
        s.club.socialClimate = clamp(s.club.socialClimate + 3);
        for (const p of actives(s).filter((x) => x.personality === 'cumplidor')) p.motivation = clamp(p.motivation + 3);
        return 'Pusiste la regla: el grupo es para el club. Bajó la espuma y los ordenados respiraron.';
      }
      if (opt === 1) {
        s.club.socialClimate = clamp(s.club.socialClimate - 5);
        return 'Los dejaste discutir y se fue de las manos: quedaron heridas que no eran de básquet.';
      }
      if (rng.chance(0.6)) {
        s.club.socialClimate = clamp(s.club.socialClimate + 5);
        return 'Tiraste un meme perfecto y todos se cagaron de risa. Crisis desactivada al mejor estilo grupo de amigos.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 2);
      return 'El meme no cayó bien en plena pelea. "No es momento de joder", te contestó uno.';
    },
  },

  // --- Eventos encadenados: una decisión de hoy trae otra decisión semanas después ---
  {
    id: 'prueba_jugador',
    title: 'Un jugador quiere probarse',
    weight: 6,
    canFire: (s) => actives(s).length < 14,
    text: () =>
      'Cayó un pibe al entrenamiento: dice que se mudó al barrio y busca equipo. Se lo ve con condiciones y pide entrenar unas semanas a prueba antes de decidir.',
    options: () => [
      { label: 'Tomarlo a prueba unas semanas', hint: 'Se suma al plantel; más adelante decidís si queda' },
      { label: 'El plantel ya está cerrado', hint: 'Sin riesgos, sin refuerzo' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        const tryout = createRecruit(rng, { minTechnique: 55, maxTechnique: 78, season: s.seasonNumber });
        tryout.description = 'A prueba en el club. Todavía se está ganando un lugar.';
        s.players.push(tryout);
        s.news.unshift({ week: s.week, text: `${tryout.name} se suma a prueba por unas semanas.`, tone: 'neutral' });
        chain(s, 3, { defId: 'prueba_veredicto', playerId: tryout.id });
        return `${tryout.name} entrena a prueba. En unas semanas vas a tener que decidir si se queda.`;
      }
      return 'Le agradeciste la buena onda pero le dijiste que el plantel está cerrado. Fue a probar suerte a otro lado.';
    },
  },
  {
    id: 'prueba_veredicto',
    title: 'Veredicto del jugador a prueba',
    weight: 0,
    chained: true,
    canFire: () => false,
    text: (s, ev) => `Se cumplió el período de prueba de ${byId(s, ev.playerId).name}. En el grupo ya te preguntan: ¿se queda o no?`,
    options: (s, ev) => {
      const p = byId(s, ev.playerId);
      const rindio = p.lastRating !== null && p.lastRating >= 6;
      return [
        { label: 'Confirmarlo como uno más', hint: rindio ? 'Rindió: buena incorporación' : 'Apostás a que levante' },
        { label: 'Agradecerle y soltarlo', hint: 'No sigue en el plantel' },
      ];
    },
    resolve: (s, ev, opt) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        p.description = 'Llegó a prueba y se ganó su lugar en el club.';
        p.motivation = clamp(p.motivation + 10);
        p.commitment = clamp(p.commitment + 5);
        s.club.socialClimate = clamp(s.club.socialClimate + 3);
        s.news.unshift({ week: s.week, text: `${p.name} pasó la prueba: es parte oficial del plantel.`, tone: 'good' });
        return `${p.name} quedó confirmado. Abrazos en la cancha: uno más para la familia.`;
      }
      p.leftClub = true;
      s.news.unshift({ week: s.week, text: `${p.name} no siguió tras el período de prueba.`, tone: 'neutral' });
      return 'Le agradeciste el esfuerzo, pero no quedó. Se fue con un apretón de manos y sin rencores.';
    },
  },
  {
    id: 'prestamo_club',
    title: 'Un jugador pide una mano',
    weight: 5,
    canFire: (s) => s.club.money >= 90 && actives(s).some((p) => p.commitment >= 55),
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.commitment >= 55);
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) =>
      `${byId(s, ev.playerId).name} te habla aparte, incómodo: se le rompió la moto y la necesita para laburar. Pregunta si el club puede prestarle $70 hasta fin de mes.`,
    options: () => [
      { label: 'Prestarle la plata del club', hint: '-$70 ahora; en unas semanas se verá si la devuelve' },
      { label: 'Proponer una colecta entre todos', hint: 'No sale de la caja; depende del ambiente' },
      { label: 'El club no puede ahora', hint: 'Se va con las manos vacías' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        s.club.money -= 70;
        s.ledger.push({ week: s.week, concept: `Préstamo a ${p.name}`, amount: -70 });
        p.motivation = clamp(p.motivation + 6);
        chain(s, 4, { defId: 'prestamo_saldado', playerId: p.id });
        return `${p.name} te lo agradeció mil veces: "Te lo devuelvo, quedate tranquilo". Ojalá sea de palabra.`;
      }
      if (opt === 1) {
        if (rng.chance(0.4 + s.club.socialClimate / 250)) {
          p.social = clamp(p.social + 5);
          s.club.socialClimate = clamp(s.club.socialClimate + 5);
          return `El grupo se cotizó y juntó la guita en un día. ${p.name} casi llora: "Esto es un equipo de verdad".`;
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 2);
        return `La colecta quedó a mitad de camino: algunos pusieron, otros hicieron la plancha. ${p.name} juntó una parte, incómodo.`;
      }
      p.motivation = clamp(p.motivation - 5);
      return `${p.name} entendió, pero se fue con la cara larga. "Está todo bien", dijo, sin que estuviera todo bien.`;
    },
  },
  {
    id: 'prestamo_saldado',
    title: 'La deuda de la moto',
    weight: 0,
    chained: true,
    canFire: () => false,
    text: (s, ev) => {
      const p = byId(s, ev.playerId);
      return p.commitment >= 60
        ? `Se cumplió el plazo y ${p.name} te devolvió los $70 en mano, agradecido: "El club me salvó, no me lo olvido más".`
        : `Se cumplió el plazo del préstamo, pero ${p.name} sigue corto de plata y no puede devolver los $70. Está muy incómodo.`;
    },
    options: (s, ev) => {
      const p = byId(s, ev.playerId);
      return p.commitment >= 60
        ? [
            { label: 'Agradecer y anotar el gesto', hint: 'Recuperás $70; sube la lealtad del grupo' },
            { label: 'Reinvertir esa plata en un asado', hint: 'La devuelve y armás juntada (-$40)' },
          ]
        : [
            { label: 'Darle más tiempo, sin drama', hint: 'El club no recupera aún, pero te la juega' },
            { label: 'Que lo pague con laburo para el club', hint: 'Salda con horas de utilería y gestión' },
            { label: 'Reclamarle firme el pago', hint: 'Puede aparecer la plata… o el enojo' },
          ];
    },
    resolve: (s, ev, opt) => {
      const p = byId(s, ev.playerId);
      if (p.commitment >= 60) {
        s.club.money += 70;
        s.ledger.push({ week: s.week, concept: `${p.name} devuelve el préstamo`, amount: 70 });
        if (opt === 0) {
          p.commitment = clamp(p.commitment + 5);
          s.club.socialClimate = clamp(s.club.socialClimate + 4);
          return `${p.name} saldó todo. El gesto (del club y del jugador) fortaleció el vínculo.`;
        }
        s.club.money -= 40;
        s.ledger.push({ week: s.week, concept: 'Asado del equipo', amount: -40 });
        s.club.socialClimate = clamp(s.club.socialClimate + 8);
        return `${p.name} devolvió los $70 y con parte de esa plata armaste un asado. Noche redonda para todos.`;
      }
      if (opt === 0) {
        p.motivation = clamp(p.motivation + 6);
        p.commitment = clamp(p.commitment + 3);
        return `Le diste aire sin hacerlo sentir mal. ${p.name} no se lo va a olvidar: "Sos un fenómeno".`;
      }
      if (opt === 1) {
        p.commitment = clamp(p.commitment + 6);
        s.club.organization = clamp(s.club.organization + 4);
        return `${p.name} salda la deuda a puro laburo: arma pelotas, marca la cancha, lleva las planillas. El club ganó un colaborador.`;
      }
      if (p.social >= 55) {
        s.club.money += 70;
        s.ledger.push({ week: s.week, concept: `${p.name} salda el préstamo a las apuradas`, amount: 70 });
        p.motivation = clamp(p.motivation - 4);
        return `${p.name} apareció con la plata al otro día, medio ofendido. Deuda saldada, relación algo tirante.`;
      }
      p.motivation = clamp(p.motivation - 8);
      upset(p);
      return `${p.name} lo tomó a mal: "Pensé que éramos un club, no una financiera". Quedó dolido y el club sigue sin ver la plata.`;
    },
  },
  {
    id: 'bronca_fuerte',
    title: 'Se fueron a las manos',
    weight: 6,
    canFire: (s) => actives(s).length >= 4 && s.club.socialClimate < 60,
    pickTargets: (s, rng) => {
      const cands = rng.shuffle(actives(s));
      if (cands.length < 2) return null;
      return { playerId: cands[0].id, playerId2: cands[1].id };
    },
    text: (s, ev) =>
      `${byId(s, ev.playerId).name} y ${byId(s, ev.playerId2).name} pasaron del empujón al agarrón en pleno entrenamiento. Los separaron entre todos. El grupo quedó helado.`,
    options: () => [
      { label: 'Sancionar a los dos por igual', hint: 'Autoridad, pero pueden sentirlo injusto' },
      { label: 'Reunión de los tres para limar asperezas', hint: 'Depende del ambiente: puede cerrar o abrir la herida' },
      { label: 'Mirar para otro lado', hint: 'Cosas del calor del momento… o una bomba de tiempo' },
    ],
    resolve: (s, ev, opt, rng) => {
      const a = byId(s, ev.playerId);
      const b = byId(s, ev.playerId2);
      if (opt === 0) {
        for (const p of [a, b]) {
          p.motivation = clamp(p.motivation - 5);
          bumpGrievance(s, p, 'trato');
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 2);
        s.club.organization = clamp(s.club.organization + 3);
        return 'Los sentaste a los dos un partido. Entendieron el mensaje, aunque alguno lo mastica.';
      }
      if (opt === 1) {
        if (rng.chance(0.35 + s.club.socialClimate / 200)) {
          for (const p of [a, b]) p.social = clamp(p.social + 4);
          s.club.socialClimate = clamp(s.club.socialClimate + 6);
          return 'La charla destrabó todo: se dieron la mano de verdad. A veces alguien tiene que poner el pecho.';
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 3);
        chain(s, 2, { defId: 'bronca_secuela', playerId: a.id, playerId2: b.id });
        return 'La reunión no alcanzó: se dijeron las cosas, pero el clima quedó pesado. Esto no terminó acá.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 4);
      for (const p of [a, b]) bumpGrievance(s, p, 'grupo');
      chain(s, 2, { defId: 'bronca_secuela', playerId: a.id, playerId2: b.id });
      return 'Hiciste la vista gorda. Por ahora se toleran, pero el rencor sigue ahí abajo, latente.';
    },
  },
  {
    id: 'bronca_secuela',
    title: 'La bronca que no cerró',
    weight: 0,
    chained: true,
    canFire: () => false,
    text: (s, ev) =>
      `Un par de semanas después, la interna entre ${byId(s, ev.playerId).name} y ${byId(s, ev.playerId2).name} volvió a estallar en el grupo. O se corta acá, o alguien se va.`,
    options: () => [
      { label: 'Bancar a uno y pedirle al otro que afloje', hint: 'Tomás partido: uno queda dolido' },
      { label: 'Ultimátum: se arreglan o afuera los dos', hint: 'Firme y arriesgado' },
      { label: 'Charla a fondo, uno por uno', hint: 'Último intento de reconciliación' },
    ],
    resolve: (s, ev, opt, rng) => {
      const a = byId(s, ev.playerId);
      const b = byId(s, ev.playerId2);
      if (opt === 0) {
        const stays = a.social >= b.social ? a : b;
        const hurt = stays === a ? b : a;
        stays.motivation = clamp(stays.motivation + 4);
        hurt.motivation = clamp(hurt.motivation - 8);
        upset(hurt);
        return `Respaldaste a ${stays.name}. ${hurt.name} lo sintió como una traición y quedó picado.`;
      }
      if (opt === 1) {
        if (rng.chance(0.4)) {
          for (const p of [a, b]) p.motivation = clamp(p.motivation - 3);
          s.club.socialClimate = clamp(s.club.socialClimate + 4);
          return 'El ultimátum los ordenó: prefieren aguantarse antes que irse. Tensa calma, pero calma al fin.';
        }
        const goes = rng.pick([a, b]);
        makeLeave(s, goes, 'Se fue tras la interna que nunca se arregló.');
        s.club.socialClimate = clamp(s.club.socialClimate - 3);
        return `${goes.name} agarró el bolso: "Así no juego más". La interna se cobró una baja.`;
      }
      if (rng.chance(0.45 + s.club.socialClimate / 250)) {
        for (const p of [a, b]) {
          p.social = clamp(p.social + 3);
          calm(p);
        }
        s.club.socialClimate = clamp(s.club.socialClimate + 7);
        s.memorableMoments.push(`Semana ${s.week}: ${a.name} y ${b.name} enterraron el hacha tras semanas de tensión.`);
        return 'Hablaste con cada uno y funcionó: se pidieron disculpas frente al grupo. El vestuario respiró.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 5);
      return 'Ni las charlas por separado alcanzaron. Se toleran a regañadientes y el grupo sigue partido.';
    },
  },
  {
    id: 'piden_asado',
    title: 'Piden asado',
    weight: 8,
    canFire: (s) =>
      s.club.money >= BALANCE.actions.asado.cost &&
      !s.actionsChosen.includes('asado') &&
      actives(s).length >= 6 &&
      weeksSinceAsado(s) >= 3,
    pickTargets: (s) => {
      // Lo pide el organizador natural: el más social del plantel.
      const cands = actives(s).slice().sort((a, b) => b.social - a.social);
      const organizer = cands.find((p) => p.personality === 'social') ?? cands[0];
      return organizer ? { playerId: organizer.id } : null;
    },
    text: (s, ev) =>
      `${byId(s, ev.playerId).name} te frena en el estacionamiento: "¿Hace cuánto que no comemos todos juntos? Yo consigo la parrilla, vos poné el club".`,
    options: () => [
      { label: 'Armarlo para esta semana', hint: `Queda agendado el asado (cuesta $${BALANCE.actions.asado.cost})` },
      { label: '"Ahora no da, hay que cuidar la caja"', hint: 'El grupo lo va a notar' },
    ],
    resolve: (s, ev, opt, rng) => {
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        if (!s.actionsChosen.includes('asado') && s.actionsChosen.length < BALANCE.actions.maxPerWeek) {
          s.actionsChosen.push('asado');
        }
        s.asadoPlan = planAsado(s, rng);
        const going = s.asadoPlan.rsvps.filter((r) => r.answer === 'va').length;
        p.motivation = clamp(p.motivation + 5);
        return `${p.name} mandó mensaje al grupo ahí mismo y ${going} confirmaron al toque. El asado quedó agendado: se hace al pasar lista.`;
      }
      p.motivation = clamp(p.motivation - 5);
      s.club.socialClimate = clamp(s.club.socialClimate - 2);
      later(s, 1, {
        playerId: p.id,
        text: `${p.name} guardó la parrilla sin comentarios. En el grupo quedó un "bueno, otra será" que se leyó fuerte.`,
        tone: 'bad',
        climate: -1,
      });
      return `${p.name} asintió sin discutir: "vos manejás la caja". Pero el grupo tenía ganas, y eso no se borra con un sticker.`;
    },
  },
];

/** ¿Siguen en el club los protagonistas que necesita el evento encadenado? */
function targetsAlive(s: GameState, e: ScheduledEvent): boolean {
  for (const id of [e.playerId, e.playerId2]) {
    if (!id) continue;
    const p = s.players.find((x) => x.id === id);
    if (!p || p.leftClub) return false;
  }
  return true;
}

/**
 * Toma el evento encadenado que corresponde a esta semana, si hay uno válido.
 * De paso descarta los que quedaron viejos (de temporadas pasadas o sin
 * protagonista). A diferencia del sorteo, un encadenado es una consecuencia
 * segura: se dispara sí o sí cuando vence, sin depender del azar.
 */
export function takeScheduledEvent(s: GameState): ActiveEvent | null {
  const queue = s.scheduledEvents ?? [];
  const alive = queue.filter((e) => e.season === s.seasonNumber && targetsAlive(s, e));
  const idx = alive.findIndex((e) => e.week <= s.week);
  s.scheduledEvents = idx === -1 ? alive : alive.filter((_, i) => i !== idx);
  if (idx === -1) return null;
  const e = alive[idx];
  return { defId: e.defId, playerId: e.playerId, playerId2: e.playerId2 };
}

/** Sortea un evento para la semana (o ninguno). Devuelve el ActiveEvent listo. */
export function rollEvent(state: GameState, rng: Rng): ActiveEvent | null {
  if (!rng.chance(BALANCE.weekly.eventChance)) return null;
  // Cooldown anti-repetición: el mismo chiste dos semanas seguidas deja de ser chiste.
  const onCooldown = new Set(
    (state.eventLog ?? [])
      .filter((e) => e.season === state.seasonNumber && state.week - e.week < BALANCE.weekly.eventCooldownWeeks)
      .map((e) => e.id)
  );
  const fireable = EVENTS.filter((e) => !e.chained && e.canFire(state));
  // Si todo lo posible está en cooldown (plantel muy estable), se relaja el
  // filtro antes que dejar la semana muda.
  const fresh = fireable.filter((e) => !onCooldown.has(e.id));
  let pool = fresh.length > 0 ? fresh : fireable;
  // Si el sorteado no encuentra a quién tocarle (pickTargets null), no se
  // pierde la semana: sale del pool y se vuelve a sortear entre los demás.
  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = rng.range(0, totalWeight);
    let def = pool[pool.length - 1];
    for (const cand of pool) {
      roll -= cand.weight;
      if (roll <= 0) {
        def = cand;
        break;
      }
    }
    const targets = def.pickTargets ? def.pickTargets(state, rng) : {};
    if (targets !== null) {
      state.eventLog = [...(state.eventLog ?? []), { id: def.id, season: state.seasonNumber, week: state.week }].slice(-24);
      return { defId: def.id, ...targets };
    }
    pool = pool.filter((e) => e !== def);
  }
  return null;
}

export function getEvent(id: string): EventDef {
  const def = EVENTS.find((e) => e.id === id);
  if (!def) throw new Error(`Evento desconocido: ${id}`);
  return def;
}

/**
 * El amigo a prueba entrenó esta semana: se define cómo se lo vio (nota 1-10 y
 * una frase). Sale de su nivel real con bastante ruido, así a veces sorprende y
 * a veces decepciona. La llama advanceWeek antes de forzar la decisión.
 */
export function rollTrialPractice(tc: TrialCandidate, rng: Rng): void {
  const raw = tc.player.technique * 0.1 + rng.range(-2, 2.2);
  const rating = Math.max(2, Math.min(10, Math.round(raw)));
  tc.practiceRating = rating;
  tc.practiceNote =
    rating >= 8
      ? 'La rompió en la práctica: pidió la pelota y jugó de memoria.'
      : rating >= 6
        ? 'Se lo vio bien: entiende el juego y se movió con los demás.'
        : rating >= 4
          ? 'Anduvo irregular: momentos buenos y otros para el olvido.'
          : 'Flojo: se lo vio lento y medio desconectado del grupo.';
}
