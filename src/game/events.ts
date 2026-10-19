import { addPairBonus, planAsado, weeksSinceAsado } from './asado';
import { BALANCE, clamp } from './balance';
import { contactoQueVuelve, LO_QUE_PIDE, shortName, vueltaDeLaLibreta } from './carrera';
import { affinity } from './relations';
import { worstPair } from './socialMap';
import { fechaLabel, logClubEvent, logPlayerEvent } from './timeline';
import { marketToPlayer, worldToMarket } from '../data/market';
import { createRecruit } from '../data/recruits';
import { loreOf, RASGOS, type ClubLore } from '../data/clubLore';
import { DIVISIONS } from '../data/worldData';
import { refereeOfWeek } from './leagueLife';
import { bumpGrievance, easeGrievance, sootheGrievance } from './mood';
import { listaY } from './nombres';
import { PERSONAJES } from './personajes';
import { dayLabel, mudarAlClub, teamByLegacyRival, teamRoster, worldPlayerName } from './world';
import type { ActiveEvent, DelayedNote, GameState, MatchResult, Player, Rival, ScheduledEvent, Team, TrialCandidate, WorldPlayer } from './types';
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
  pickTargets?: (state: GameState, rng: Rng) => { playerId?: string; playerId2?: string; contactId?: string } | null;
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

/**
 * Las fechas jugadas desde la nota del barrio (`racha_barrio`): la promesa se
 * hace en la planificación de una semana (`fromWeek`), antes del partido de
 * esa semana, así que cuentan ese partido y los que siguieron. Los forfeits
 * no cuentan: no se jugaron.
 */
function partidosDesdeLaNota(s: GameState, ev: ActiveEvent): MatchResult[] {
  const desde = ev.fromWeek ?? s.week - 3;
  return s.history.filter((m) => !m.forfeit && m.week >= desde && m.week < s.week);
}

/** Se cumplió "peleamos arriba" si se ganaron dos de las tres (o todas, si fueron menos). */
function promesaCumplida(s: GameState, ev: ActiveEvent): boolean {
  const desde = partidosDesdeLaNota(s, ev);
  if (desde.length === 0) return false;
  const ganados = desde.filter((m) => m.won).length;
  return desde.length >= 3 ? ganados >= 2 : ganados === desde.length;
}

/**
 * Cuántas semanas después cobra el barrio: tres, o antes si la fase regular
 * termina, para que la factura caiga a más tardar en las semifinales (la
 * semana que juegan todos los que entraron a los playoffs). Cero si ya no
 * queda fecha donde cobrarla.
 */
function semanasHastaLaFactura(s: GameState): number {
  return Math.max(0, Math.min(3, s.seasonLength + 1 - s.week));
}

/** Los números de la cena del club (sep 2026): una cadena de tres eslabones que junta plata cuando la caja anda corta. */
const CENA = {
  cajaTope: 400, // el tesorero la propone con menos que esto en caja
  precio: 8, // la tarjeta
  gasto: 50, // lo que pone la caja al anunciarla (parrilla, sonido, tarjetas)
  costoNoche: 40, // lo que se lleva la noche (carne, pan, el cantor)
  salon: 80, // cuántos entran
  ultimaRonda: 30, // lo que cuesta invitar la última
  gorraPorCabeza: 1.5, // lo que deja la gorra por comensal
};

/** Cuántas tarjetas se venden solas: el barrio compra según el cartel del club. */
function tarjetasVendidas(s: GameState): number {
  return Math.min(CENA.salon, Math.round(18 + s.club.socialPrestige * 0.45));
}

/** La tarjeta rebajada del segundo eslabón. */
function precioRebajado(): number {
  return Math.round(CENA.precio * 0.7);
}

/** Cuántos de los que compraron van de verdad: con el club ordenado, casi todos. */
function asistenciaCena(s: GameState, vendidas: number): number {
  return Math.min(CENA.salon, Math.round(vendidas * (0.7 + s.club.organization / 250)));
}

/** Lo que dejaron decididos los eslabones anteriores de la cena. */
function datosCena(ev: ActiveEvent): { vendidas: number; precio: number; manager: boolean } {
  const p = ev.payload ?? {};
  return { vendidas: p.vendidas ?? 20, precio: p.precio ?? CENA.precio, manager: (p.manager ?? 1) === 1 };
}

/** El organizador natural: el más social del plantel. */
function organizadorNatural(s: GameState): Player {
  const cands = actives(s).slice().sort((a, b) => b.social - a.social);
  return cands.find((p) => p.personality === 'social') ?? cands[0];
}

/** El rival de la fecha, para nombrarlo; en playoffs o sin fecha, "el club de enfrente". */
function rivalDeLaFecha(s: GameState): string {
  return s.rivals.find((r) => r.id === s.schedule[s.week - 1])?.name ?? 'el club de enfrente';
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
          // Lo que se arregla entre dos queda entre los dos: el vestuario lo ve.
          addPairBonus(s, a.id, b.id, 6);
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
      addPairBonus(s, a.id, b.id, -4);
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
      return `${p.name} acumula ${p.weeksUnpaid} semanas sin pagar la cuota. ${PERSONAJES.tesoreraLarga}, te mira fijo con el cuaderno abierto: "¿Y con este qué hacemos?"`;
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
    text: () => `${PERSONAJES.almaceneroLargo} de la esquina, ofrece $120 por única vez a cambio de que el equipo se saque fotos con la gorra de su negocio.`,
    options: () => [
      { label: 'Aceptar y posar sonrientes', hint: '+$120, algo de prestigio social' },
      { label: 'Rechazar con elegancia', hint: 'Sin plata, sin compromisos' },
    ],
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        s.club.money += 120;
        s.ledger.push({ week: s.week, concept: 'Foto con la gorra del almacén', amount: 120 });
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        return `Fotos con gorra y sonrisa. $120 para la caja y ${PERSONAJES.almacenero} feliz.`;
      }
      return `Declinaste con respeto. ${PERSONAJES.almacenero} prometió volver "cuando sean primera".`;
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
        const friend = createRecruit(rng, { minTechnique: 60, maxTechnique: 80, season: s.seasonNumber, taken: s.players.map((p) => p.name) });
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
          s.memorableMoments.push(`${fechaLabel(s)}: la charla que hizo que ${p.name} se quedara.`);
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
        // "X para una semana para curarse" se leía con los dos "para" pegados.
        return `${p.name} se toma ${p.injuryWeeks === 1 ? 'una semana' : 'dos semanas'} para curarse bien. Mejor prevenir.`;
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
          s.memorableMoments.push(`${fechaLabel(s)}: el festejo del viernes que terminó con todos cantando el himno del club (que no existe).`);
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
          s.memorableMoments.push(`${fechaLabel(s)}: el cumpleaños de ${p.name} terminó con torta en la cara y fotos épicas.`);
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
          s.memorableMoments.push(`${fechaLabel(s)}: la nota en "Pasión Deportiva Zonal" que compartió medio barrio.`);
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
          s.memorableMoments.push(`${fechaLabel(s)}: la despedida de ${p.name}, con discurso y camiseta firmada por todos.`);
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
        const kid = createRecruit(rng, { minTechnique: 35, maxTechnique: 52, season: s.seasonNumber, taken: s.players.map((p) => p.name) });
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
          `${fechaLabel(s)}: el veterano ${vet.name} y el joven ${star.name} combinaron para una jugada que gritó todo el club.`,
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

  {
    // La libreta sigue viva (modo Carrera, lo que quedaba de T3): el que no
    // firmó en el verano —dijo que no, dudó, o no lo llamaste— vuelve a
    // aparecer cuando el club ya es una cosa real. Cada contacto vuelve una
    // sola vez: firme o no, sale de la libreta pendiente.
    id: 'libreta_vuelve',
    title: 'Uno de la libreta',
    weight: 6,
    canFire: (s) => s.mode === 'carrera' && (s.libretaPendiente?.length ?? 0) > 0 && s.week >= 2 && actives(s).length < 14,
    pickTargets: (s, rng) => {
      const mp = contactoQueVuelve(s, rng);
      return mp ? { contactId: mp.id } : null;
    },
    text: (s, ev) => {
      const mp = s.libretaPendiente?.find((m) => m.id === ev.contactId);
      return mp ? vueltaDeLaLibreta(s, mp) : 'Ya no estaba en la libreta.';
    },
    options: (s, ev) => {
      const mp = s.libretaPendiente?.find((m) => m.id === ev.contactId);
      const pide = mp?.demand ? LO_QUE_PIDE[mp.demand] : null;
      return [
        {
          label: pide ? 'Que venga, dándole lo que pide' : 'Que venga',
          hint: pide ? `Se suma al plantel; ${pide} queda como promesa` : 'Se suma al plantel, sin condiciones',
        },
        ...(pide ? [{ label: 'Que venga, pero sin condiciones', hint: 'Capaz acepta igual… o se ofende y no viene' }] : []),
        { label: 'Ya está: el plantel se armó sin él', hint: 'No vuelve a aparecer. El que lo trajo lo va a sentir' },
      ];
    },
    resolve: (s, ev, opt, rng) => {
      const mp = s.libretaPendiente?.find((m) => m.id === ev.contactId);
      if (!mp) return 'Ya no estaba en la libreta.';
      s.libretaPendiente = (s.libretaPendiente ?? []).filter((m) => m.id !== mp.id);
      const v = shortName(mp.name);
      const traido = mp.viaDe && mp.viaDe !== 'vos' ? actives(s).find((p) => p.name === mp.viaDe) : undefined;
      const conCondiciones = !!mp.demand && opt === 0;
      const sinCondiciones = !!mp.demand && opt === 1;
      const noViene = mp.demand ? opt === 2 : opt === 1;

      if (noViene) {
        if (traido) {
          traido.motivation = clamp(traido.motivation - 4);
          return `Le dijiste que el plantel ya estaba. ${v} lo entendió, pero ${shortName(traido.name)} se lo tomó a mal: "Era mi gente".`;
        }
        return `Le dijiste que el plantel ya estaba. ${v} se lo tomó bien, o eso dijo. No va a volver a preguntar.`;
      }
      if (sinCondiciones && !rng.chance(mp.flexibility)) {
        if (traido) traido.motivation = clamp(traido.motivation - 2);
        return `Le dijiste que venga, pero sin ${LO_QUE_PIDE[mp.demand!]}. ${v} se quedó callado un rato y después: "Dejá, mejor no". No va a volver a preguntar.`;
      }

      const demandApplied = conCondiciones ? mp.demand : null;
      const feeStatus =
        demandApplied === 'beca'
          ? 'beca_total'
          : demandApplied === 'beca_parcial'
            ? 'beca_parcial'
            : mp.feeAttitude === 'completa'
              ? 'pagada'
              : mp.feeAttitude === 'parcial'
                ? 'beca_parcial'
                : 'beca_total';
      const role = demandApplied === 'titularidad' ? 'titular' : demandApplied === 'minutos' ? 'rotación' : mp.estTechnique >= 65 ? 'rotación' : 'suplente';
      const player = marketToPlayer(mp, feeStatus, role, s.seasonNumber, rng);
      const week = Math.min(s.week, s.seasonLength);
      player.timeline = [{ season: s.seasonNumber, week, kind: 'llegada', text: 'Se sumó con la temporada empezada: era de la libreta y volvió a aparecer.' }];
      s.players.push(player);
      // El desenlace muestra su cara, y su historia arranca acá.
      ev.playerId = player.id;
      if (demandApplied) {
        s.promises.push({ playerId: player.id, playerName: player.name, type: demandApplied, label: `${player.name}: ${LO_QUE_PIDE[demandApplied]}`, season: s.seasonNumber });
      }
      if (traido) traido.motivation = clamp(traido.motivation + 4);
      s.club.socialClimate = clamp(s.club.socialClimate + 2);
      s.news.unshift({ week: s.week, text: `Se sumó ${player.name}: era de la libreta y volvió a aparecer.`, tone: 'good' });
      logClubEvent(s, 'llegada', `Llegó ${player.name} (${player.position}) con la temporada empezada: uno de la libreta que volvió.`);
      const cierre = traido ? ` ${shortName(traido.name)} lo abrazó como si hubiera ganado algo.` : '';
      return demandApplied
        ? `${v} dijo que sí. Se suma al plantel, y ${LO_QUE_PIDE[demandApplied]} queda como promesa: si no cumplís, se va a acordar.${cierre}`
        : sinCondiciones
          ? `${v} lo pensó dos segundos: "Está bien, vengo igual". Se suma al plantel sin pedir nada.${cierre}`
          : `${v} dijo que sí. Se suma al plantel sin pedir nada.${cierre}`;
    },
  },

  {
    /* El primer evento que mira el historial de la temporada y no el estado de
       hoy (punto del roadmap: "eventos que dependan del historial del club").
       La comisión no aparece cuando alguien está molesto: aparece cuando la
       tabla viene mal tres fechas seguidas, que es cuando aparecería de
       verdad. Las tres salidas se pagan en monedas distintas —organización,
       vestuario o el crédito con la comisión— y ninguna es gratis. */
    id: 'comision_aprieta',
    title: 'La comisión pide explicaciones',
    weight: 9,
    canFire: (s) => {
      if (s.week > s.seasonLength) return false; // en playoffs se habla de otra cosa
      const jugados = s.history.filter((m) => !m.forfeit);
      return jugados.length >= 3 && jugados.slice(-3).every((m) => !m.won);
    },
    text: (s) => {
      const ultimas = s.history.filter((m) => !m.forfeit).slice(-3);
      const marcadores = ultimas.map((m) => `${m.scoreFor}-${m.scoreAgainst}`).join(', ');
      return `Te citan un martes a las nueve en la sede: los tres de la comisión (${PERSONAJES.comisionLarga}), el mate y una carpeta abierta. "Tres al hilo (${marcadores}). Nosotros ponemos la cara en el barrio, así que preguntamos: ¿qué está pasando?"`;
    },
    options: (s) => [
      { label: 'Dar la cara: mostrarles el plan y los números', hint: 'Ordena el club; la comisión te da tiempo' },
      {
        label: 'Bancar al plantel: "el equipo está, falta que entre"',
        hint: s.players.some((p) => !p.leftClub) ? 'El vestuario se entera y lo agradece; la comisión no' : 'La comisión no se va a conformar',
      },
      { label: 'Cargarle el muerto al plantel', hint: 'Te sacás la presión de encima; el grupo se entera igual' },
    ],
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        s.club.organization = clamp(s.club.organization + 7);
        s.club.socialClimate = clamp(s.club.socialClimate + 2);
        logClubEvent(s, 'hito', 'La comisión pidió explicaciones por la racha y se fue con un plan sobre la mesa.');
        return 'Planilla, minutos, lesionados y lo que viene. Se fueron sin aplaudir, pero se fueron tranquilos: "Seguimos hablando en dos fechas".';
      }
      if (opt === 1) {
        for (const p of actives(s)) p.motivation = clamp(p.motivation + 4);
        s.club.socialClimate = clamp(s.club.socialClimate + 5);
        s.club.sportPrestige = clamp(s.club.sportPrestige - 2);
        s.news.unshift({ week: s.week, text: 'El manager bancó al plantel delante de la comisión. En el grupo se enteraron en diez minutos.', tone: 'good' });
        logClubEvent(s, 'animo', 'Ante la comisión, el manager se puso al plantel al hombro en plena racha negativa.');
        return 'No diste un nombre. A los diez minutos ya estaba en el grupo del club: "Así da gusto". La comisión, en cambio, te miró de costado.';
      }
      // La salida cómoda: la comisión se conforma, el vestuario se entera.
      s.club.organization = clamp(s.club.organization + 3);
      s.club.socialClimate = clamp(s.club.socialClimate - 8);
      for (const p of actives(s).filter((x) => x.personality === 'leal' || x.personality === 'cumplidor')) {
        p.motivation = clamp(p.motivation - 6);
        upset(p);
      }
      s.news.unshift({ week: s.week, text: 'Se filtró lo que el manager dijo en la comisión: que el plantel no está a la altura.', tone: 'bad' });
      logClubEvent(s, 'animo', 'El manager le cargó la racha al plantel delante de la comisión, y el vestuario se enteró.');
      return 'La comisión se fue conforme. El problema es que en un club de barrio todo se sabe: para el jueves, el vestuario ya lo había leído en el grupo.';
    },
  },

  {
    /* El espejo de la comisión: el segundo evento que mira el historial. Con
       tres victorias al hilo el barrio se entera, y hay que decidir qué hacer
       con eso. Se dispara una vez por racha (cuando la racha es exactamente
       de tres), no cada semana que sigue ganando. La tercera salida es una
       promesa pública, y el barrio la cobra tres fechas después en un evento
       encadenado que vuelve a mirar el historial (`racha_factura`). */
    id: 'racha_barrio',
    title: 'El barrio se enteró de la racha',
    weight: 9,
    canFire: (s) => {
      if (s.week > s.seasonLength) return false; // en playoffs la racha es la copa
      if ((s.scheduledEvents ?? []).some((e) => e.defId === 'racha_factura')) return false; // ya hay una promesa abierta
      const jugados = s.history.filter((m) => !m.forfeit);
      if (jugados.length < 3) return false;
      const racha = jugados.slice(-3).every((m) => m.won);
      const anterior = jugados[jugados.length - 4];
      return racha && (!anterior || !anterior.won);
    },
    text: (s) => {
      const ultimas = s.history.filter((m) => !m.forfeit).slice(-3);
      const marcadores = ultimas.map((m) => `${m.scoreFor}-${m.scoreAgainst}`).join(', ');
      return `${PERSONAJES.almaceneroLargo}, te frena en la esquina con el diario del barrio doblado bajo el brazo: "Tres al hilo (${marcadores}), ¿eh? Acá se está hablando. El lunes va medio barrio a la cancha. ¿Qué hacemos?"`;
    },
    options: (s) => {
      const n = semanasHastaLaFactura(s);
      const cuando = n >= 3 ? 'en tres fechas' : n === 2 ? 'en dos fechas' : 'en la próxima fecha';
      return [
        { label: 'Abrir la cancha: cantina a full y la gorra en la puerta', hint: 'Entra plata y el barrio se acerca; el club anda a las corridas' },
        { label: 'Bajar la espuma: "todavía no ganamos nada"', hint: 'Ordena la cabeza del grupo; los que se agrandan, se desinflan' },
        { label: 'Agrandarse en la nota del barrio: "este año peleamos arriba"', hint: `El plantel se agranda; el barrio se lo anota y te lo cobra ${cuando}` },
      ];
    },
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        const recaudado = 30 + Math.round(s.club.socialPrestige / 3);
        s.club.money += recaudado;
        s.ledger.push({ week: s.week, concept: 'Cantina y gorra: el barrio vino a ver la racha', amount: recaudado });
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        s.club.organization = clamp(s.club.organization - 3);
        s.news.unshift({ week: s.week, text: `El gimnasio se llenó de vecinos por la racha: la cantina y la gorra dejaron $${recaudado}.`, tone: 'good' });
        logClubEvent(s, 'social', 'Con tres al hilo, el club abrió la cancha al barrio: cantina llena y gorra en la puerta.');
        return `Se llenó. Chorizos, gaseosa tibia y la gorra pasando de mano en mano: $${recaudado} para la caja y un montón de caras nuevas en la tribuna. Eso sí: la utilería fue un caos y el árbitro esperó diez minutos la planilla.`;
      }
      if (opt === 1) {
        s.club.organization = clamp(s.club.organization + 4);
        s.club.sportPrestige = clamp(s.club.sportPrestige + 1);
        for (const p of actives(s).filter((x) => x.personality === 'protagonista')) p.motivation = clamp(p.motivation - 3);
        logClubEvent(s, 'hito', 'Tres al hilo y el manager bajó la espuma: "todavía no ganamos nada".');
        return `"Todavía no ganamos nada", dijiste, y ${PERSONAJES.almacenero} asintió despacio. En el vestuario lo repitieron como consigna; a los que ya se veían campeones les cayó como un balde de agua.`;
      }
      for (const p of actives(s)) p.motivation = clamp(p.motivation + 5);
      s.club.socialClimate = clamp(s.club.socialClimate + 3);
      s.club.sportPrestige = clamp(s.club.sportPrestige + 2);
      s.news.unshift({ week: s.week, text: `El manager, en la página del barrio: "${s.club.name} pelea arriba este año".`, tone: 'good' });
      logClubEvent(s, 'hito', 'Con tres al hilo, el manager prometió en el barrio que el club pelea arriba.');
      chain(s, semanasHastaLaFactura(s), { defId: 'racha_factura', fromWeek: s.week });
      return 'Salió la nota con foto y todo: "Peleamos arriba". El grupo la compartió veinte veces y al entrenamiento fueron todos, hasta los que nunca van. El barrio te la guardó: en unas fechas te la va a recordar.';
    },
  },
  {
    /* El barrio pasa factura: el segundo eslabón de la racha, que vuelve a
       mirar el historial. Se cumplió la promesa si de las fechas que pasaron
       desde la nota se ganaron dos de tres (o todas, si fueron menos). Y si
       se cumplió, se puede redoblar: la cadena sigue mientras el club gane y
       vos te sigas agrandando. */
    id: 'racha_factura',
    title: 'El barrio se acuerda de lo que dijiste',
    weight: 0,
    chained: true,
    canFire: () => false,
    text: (s, ev) => {
      const desde = partidosDesdeLaNota(s, ev);
      const ganados = desde.filter((m) => m.won).length;
      const marcadores = desde.map((m) => `${m.scoreFor}-${m.scoreAgainst}`).join(', ');
      return promesaCumplida(s, ev)
        ? `${PERSONAJES.almacenero} te espera con el diario abierto en tu nota: "'Peleamos arriba', dijiste. Y mirá (${marcadores}): ${ganados} de ${desde.length}. Acá te hicieron caso, ¿eh?"`
        : `${PERSONAJES.almacenero} te muestra tu nota pegada al lado de la caja, con los resultados anotados en birome (${marcadores}): "'Peleamos arriba', decía acá. ${ganados === 0 ? 'Ni una.' : `${ganados} de ${desde.length}.`} El barrio se acuerda, ¿sabés?"`;
    },
    options: (s, ev) =>
      promesaCumplida(s, ev)
        ? [
            { label: 'Pasar por el almacén a agradecer', hint: 'El barrio te lo reconoce; se cierra acá' },
            // Redoblar sólo si queda fecha donde cobrarla.
            ...(semanasHastaLaFactura(s) > 0
              ? [{ label: 'Redoblar: "y falta lo mejor"', hint: 'El plantel se agranda otra vez; el barrio vuelve a anotar' }]
              : []),
          ]
        : [
            { label: 'Dar la cara en el grupo del barrio: "nos agrandamos de más"', hint: 'Cuesta algo de imagen; ordena el club' },
            { label: 'Hacerse el distraído', hint: 'El barrio se ríe y el vestuario lo escucha' },
          ],
    resolve: (s, ev, opt) => {
      if (promesaCumplida(s, ev)) {
        if (opt === 0 || semanasHastaLaFactura(s) === 0) {
          s.club.socialPrestige = clamp(s.club.socialPrestige + 4);
          s.news.unshift({ week: s.week, text: 'El barrio le tomó la palabra al club: prometió pelear arriba y está cumpliendo.', tone: 'good' });
          logClubEvent(s, 'hito', 'El club cumplió lo que prometió en el barrio: "peleamos arriba", y pelea.');
          return 'Fuiste con una docena de facturas y te tuvieron media hora contando el partido como si hubieran jugado ellos. En el barrio, el club es tema de conversación.';
        }
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        s.club.sportPrestige = clamp(s.club.sportPrestige + 2);
        for (const p of actives(s)) p.motivation = clamp(p.motivation + 3);
        s.news.unshift({ week: s.week, text: `El manager, otra vez en la página del barrio: "${s.club.name} va por todo".`, tone: 'good' });
        chain(s, semanasHastaLaFactura(s), { defId: 'racha_factura', fromWeek: s.week });
        return '"Y falta lo mejor", dijiste, y lo pusieron de título. El plantel se agrandó otra vez. El barrio, con la birome en la mano, siguió anotando.';
      }
      if (opt === 0) {
        s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
        s.club.organization = clamp(s.club.organization + 2);
        logClubEvent(s, 'animo', 'El club no cumplió lo que prometió en el barrio, y el manager dio la cara.');
        return 'Escribiste en el grupo del barrio: "Nos agrandamos de más. Seguimos laburando". Te cargaron un rato y después te dejaron en paz: dar la cara, en el barrio, vale.';
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 5);
      s.club.sportPrestige = clamp(s.club.sportPrestige - 2);
      s.club.socialClimate = clamp(s.club.socialClimate - 4);
      s.news.unshift({ week: s.week, text: 'En el barrio se ríen de la nota: "peleamos arriba", decía, y no se pudo.', tone: 'bad' });
      logClubEvent(s, 'animo', 'El club prometió pelear arriba, no cumplió, y el manager se hizo el distraído.');
      return 'No dijiste nada. La nota quedó pegada al lado de la caja del almacén, con los resultados en birome, y cada uno del plantel que pasó a comprar algo la vio.';
    },
  },

  // --- La cena del club: tres eslabones, una decisión distinta en cada uno ---
  {
    /* La cadena larga (roadmap: "cadenas de 3+ eslabones con decisiones
       distintas en cada uno"). El tesorero propone una cena show cuando la
       caja anda corta; la decisión de hoy es quién la lleva; dos semanas
       después, qué hacer con las tarjetas; y otras dos, cómo cerrar la noche.
       Lo decidido viaja en `payload` (tarjetas, precio, quién organiza). Una
       por temporada: la noche queda en la historia del club y `canFire` la
       busca ahí. */
    id: 'cena_propuesta',
    title: 'La tesorera quiere hacer una cena',
    weight: 7,
    canFire: (s) =>
      s.week >= 2 &&
      s.week <= s.seasonLength - 4 &&
      s.club.money < CENA.cajaTope &&
      actives(s).length >= 6 &&
      !(s.scheduledEvents ?? []).some((e) => e.defId.startsWith('cena_')) &&
      !s.clubTimeline.some((e) => e.season === s.seasonNumber && /cena show/i.test(e.text)),
    pickTargets: (s) => ({ playerId: organizadorNatural(s).id }),
    text: (s) =>
      `${PERSONAJES.tesoreraLarga}, trae la idea a la sede con el cuaderno abierto: una cena show en el club, la parrilla de la cantina, el hijo de Don Aldo cantando tangos y la tarjeta a $${CENA.precio}. "Se junta plata y se junta gente", dice, y mira la caja: $${s.club.money}. Alguien tiene que llevarla.`,
    options: (s, ev) => [
      { label: 'Llevarla vos: la parrilla, las tarjetas, el sonido', hint: `$${CENA.gasto} de la caja ahora; el club te ve en todo y se ordena` },
      { label: `Que la organice ${byId(s, ev.playerId).name}`, hint: `$${CENA.gasto} de la caja ahora; el grupo se prende, y si la noche sale mal es su papelón` },
      { label: 'Ahora no: el club no está para fiestas', hint: `Sin gasto y sin cena; ${PERSONAJES.tesorera} guarda el cuaderno` },
    ],
    resolve: (s, ev, opt) => {
      if (opt === 2) {
        s.club.socialPrestige = clamp(s.club.socialPrestige - 1);
        logClubEvent(s, 'hito', `${PERSONAJES.tesoreraLarga}, propuso una cena show y el club la dejó pasar.`);
        return `${PERSONAJES.tesorera} cerró el cuaderno sin decir nada. "Cuando quieran", dijo, y en el barrio alguno comentó que el club anda con la persiana medio baja.`;
      }
      s.club.money -= CENA.gasto;
      s.ledger.push({ week: s.week, concept: 'Cena show: parrilla, sonido y tarjetas', amount: -CENA.gasto });
      const org = byId(s, ev.playerId);
      if (opt === 0) {
        s.club.organization = clamp(s.club.organization + 3);
        chain(s, 2, { defId: 'cena_tarjetas', fromWeek: s.week, payload: { manager: 1 } });
        s.news.unshift({ week: s.week, text: `Se anunció la cena show del club para dentro de cuatro semanas. La lleva el manager, tarjeta a $${CENA.precio}.`, tone: 'neutral' });
        logClubEvent(s, 'social', 'El club anunció una cena show, con el manager al frente de todo.');
        return `Te quedaste con el cuaderno. Parrilla, sonido, tarjetas: en dos semanas se ve cómo viene la venta. ${PERSONAJES.tesorera} se fue contenta; el vestuario, con la tarjeta en la mano.`;
      }
      org.motivation = clamp(org.motivation + 6);
      s.club.socialClimate = clamp(s.club.socialClimate + 3);
      chain(s, 2, { defId: 'cena_tarjetas', playerId: org.id, fromWeek: s.week, payload: { manager: 0 } });
      s.news.unshift({ week: s.week, text: `Se anunció la cena show del club para dentro de cuatro semanas. La organiza ${org.name}, tarjeta a $${CENA.precio}.`, tone: 'good' });
      logClubEvent(s, 'social', `El club anunció una cena show, con ${org.name} al frente.`);
      logPlayerEvent(org, s.seasonNumber, Math.min(s.week, s.seasonLength), 'social', 'Le encargaron la cena show del club. Se lo tomó en serio: el grupo del club no habló de otra cosa esa semana.');
      return `${org.name} agarró el cuaderno como si fuera la pelota en la última: al rato ya había armado un grupo aparte con tres más. En dos semanas se ve cómo viene la venta.`;
    },
  },
  {
    id: 'cena_tarjetas',
    title: 'Las tarjetas de la cena',
    weight: 0,
    chained: true,
    canFire: () => false,
    text: (s, ev) => {
      const v = tarjetasVendidas(s);
      const org = ev.playerId ? s.players.find((p) => p.id === ev.playerId) : undefined;
      const quien = org
        ? `${org.name} dice que "faltan los de siempre: los que dicen que van y después vemos".`
        : 'Las vendiste vos, una por una, en el almacén y en la puerta del gimnasio.';
      return `A dos semanas de la cena, van ${v} tarjetas vendidas a $${CENA.precio}, con el salón para ${CENA.salon}. ${quien} ¿Qué hacemos con lo que falta?`;
    },
    options: (s) => [
      { label: `Bajar la tarjeta a $${precioRebajado()} para llenar el salón`, hint: 'Más gente y menos plata por cabeza; el barrio lo agradece' },
      { label: `Salir a vender a la hinchada de ${rivalDeLaFecha(s)}`, hint: 'Compran, pero al vestuario no le gusta ver esas camisetas en la cena' },
      { label: 'Dejarla como está: lo que se vendió, se vendió', hint: 'Sin sorpresas; el club se ordena para la noche' },
    ],
    resolve: (s, ev, opt) => {
      const base = tarjetasVendidas(s);
      let vendidas = base;
      let precio = CENA.precio;
      let desenlace: string;
      if (opt === 0) {
        vendidas = Math.min(CENA.salon, Math.round(base * 1.4));
        precio = precioRebajado();
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        desenlace = `Bajaste la tarjeta a $${precio} y en tres días se vendieron ${vendidas - base} más: el barrio entero preguntando si queda lugar.`;
      } else if (opt === 1) {
        vendidas = Math.min(CENA.salon, Math.round(base * 1.35));
        s.club.socialClimate = clamp(s.club.socialClimate - 3);
        s.club.socialPrestige = clamp(s.club.socialPrestige + 1);
        desenlace = `Fuiste a la cancha de ${rivalDeLaFecha(s)} con las tarjetas en el bolsillo y volviste con ${vendidas - base} vendidas. En el grupo del club, silencio: "¿vamos a cenar con esos?".`;
      } else {
        s.club.organization = clamp(s.club.organization + 2);
        desenlace = `Lo que se vendió, se vendió: ${vendidas} tarjetas. Las dos semanas que quedan van para la parrilla, el sonido y las mesas, y el club se ordena.`;
      }
      chain(s, 2, { defId: 'cena_noche', playerId: ev.playerId, fromWeek: ev.fromWeek, payload: { ...(ev.payload ?? {}), vendidas, precio } });
      return desenlace;
    },
  },
  {
    id: 'cena_noche',
    title: 'La noche de la cena',
    weight: 0,
    chained: true,
    canFire: () => false,
    text: (s, ev) => {
      const { vendidas, precio } = datosCena(ev);
      const asistencia = asistenciaCena(s, vendidas);
      const org = ev.playerId ? s.players.find((p) => p.id === ev.playerId) : undefined;
      const lleno = asistencia >= CENA.salon * 0.75 ? 'El salón, lleno.' : asistencia >= CENA.salon * 0.45 ? 'El salón, a medias pero con ruido.' : 'Mesas vacías al fondo: los de siempre no vinieron.';
      return `Sábado a la noche en el club: la parrilla humeando, el hijo de Don Aldo afinando y ${asistencia} de las ${vendidas} tarjetas sentadas a $${precio}. ${lleno} ${org ? `${org.name} corre de la cocina al sonido con la camiseta puesta.` : 'Vos, de la cocina al sonido, sin sentarte en toda la noche.'} Hay que cerrar la noche.`;
    },
    options: () => [
      { label: 'Cerrar con el brindis y las cuentas sobre la mesa', hint: 'La plata a la caja, y el barrio sabe cuánto: ordena el club' },
      { label: 'Invitar la última ronda para todos', hint: `$${CENA.ultimaRonda} menos a la caja; el ambiente y el barrio lo pagan con cariño` },
      { label: 'Pasar la gorra al final, "para la ficha del año que viene"', hint: 'Se junta un poco más; a algunos les cae mal' },
    ],
    resolve: (s, ev, opt, rng) => {
      const { vendidas, precio, manager } = datosCena(ev);
      const asistencia = asistenciaCena(s, vendidas);
      const org = ev.playerId ? s.players.find((p) => p.id === ev.playerId) : undefined;
      let neto = asistencia * precio - CENA.costoNoche;
      let papelon = '';
      // El riesgo de la noche: el jugador que organiza con el grupo espeso, o
      // el manager que lleva todo con el club desordenado.
      if (org && !manager && s.club.socialClimate < 50 && rng.chance(0.35)) {
        neto = Math.round(neto / 2);
        org.motivation = clamp(org.motivation - 6);
        bumpGrievance(s, org, 'grupo', { note: 'La cena que organizó terminó en discusión y se lo cargaron a él.' });
        s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
        papelon = ` A la mitad se apagó la parrilla y en la mesa del fondo se armó una discusión que ${org.name} tuvo que ir a parar: la noche terminó antes, con la mitad de la plata.`;
      } else if (manager && s.club.organization < 35 && rng.chance(0.3)) {
        neto = Math.round(neto * 0.7);
        s.club.organization = clamp(s.club.organization - 2);
        papelon = ' Se cortó el sonido dos veces y la parrilla arrancó tarde: la gente se fue antes del postre y la cuenta cerró más corta.';
      }
      let desenlace: string;
      if (opt === 0) {
        s.club.organization = clamp(s.club.organization + 3);
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        desenlace = `Brindis, aplauso para la parrilla y ${PERSONAJES.tesorera} leyendo las cuentas con el micrófono: $${Math.max(0, neto)} para la caja.`;
      } else if (opt === 1) {
        neto -= CENA.ultimaRonda;
        s.club.socialClimate = clamp(s.club.socialClimate + 6);
        s.club.socialPrestige = clamp(s.club.socialPrestige + 4);
        for (const p of actives(s)) p.motivation = clamp(p.motivation + 2);
        if (asistencia >= CENA.salon * 0.75 && !papelon) s.memorableMoments.push(`${fechaLabel(s)}: la cena show que llenó el salón del club, con la última ronda invitada.`);
        desenlace = `"¡La última la paga el club!", gritaste desde el sonido, y el salón se vino abajo. Quedaron $${Math.max(0, neto)} para la caja y una noche que el barrio va a contar.`;
      } else {
        const gorra = Math.round(asistencia * CENA.gorraPorCabeza);
        neto += gorra;
        s.club.socialClimate = clamp(s.club.socialClimate - 3);
        s.club.socialPrestige = clamp(s.club.socialPrestige - 1);
        for (const p of actives(s).filter((x) => x.personality === 'social' || x.personality === 'leal')) p.motivation = clamp(p.motivation - 2);
        desenlace = `La gorra pasó de mesa en mesa "para la ficha del año que viene" y juntó $${gorra} más: $${Math.max(0, neto)} para la caja. En la mesa de los jugadores alguno miró el plato: "ya pagamos la tarjeta".`;
      }
      neto = Math.max(0, neto);
      s.club.money += neto;
      s.ledger.push({ week: s.week, concept: `Cena show del club (${asistencia} personas)`, amount: neto });
      if (org && !papelon) {
        org.motivation = clamp(org.motivation + 4);
        org.social = clamp(org.social + 2);
        logPlayerEvent(org, s.seasonNumber, Math.min(s.week, s.seasonLength), 'social', `Organizó la cena show del club: ${asistencia} personas y $${neto} para la caja.`);
      }
      s.news.unshift({ week: s.week, text: `La cena show del club: ${asistencia} personas y $${neto} para la caja.${papelon ? ' Con papelón incluido.' : ''}`, tone: papelon ? 'bad' : 'good' });
      logClubEvent(s, 'hito', `La cena show del club: ${asistencia} personas y $${neto} para la caja.`);
      return `${desenlace}${papelon}`;
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
        const tryout = createRecruit(rng, { minTechnique: 55, maxTechnique: 78, season: s.seasonNumber, taken: s.players.map((p) => p.name) });
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
      // Si hay dos que no se bancan, son ellos los que se van a las manos.
      const roce = worstPair(s);
      if (roce) return { playerId: roce[0].id, playerId2: roce[1].id };
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
        addPairBonus(s, a.id, b.id, -2);
        return 'Los sentaste a los dos un partido. Entendieron el mensaje, aunque alguno lo mastica.';
      }
      if (opt === 1) {
        if (rng.chance(0.35 + s.club.socialClimate / 200)) {
          for (const p of [a, b]) p.social = clamp(p.social + 4);
          s.club.socialClimate = clamp(s.club.socialClimate + 6);
          addPairBonus(s, a.id, b.id, 6);
          return 'La charla destrabó todo: se dieron la mano de verdad. A veces alguien tiene que poner el pecho.';
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 3);
        addPairBonus(s, a.id, b.id, -3);
        chain(s, 2, { defId: 'bronca_secuela', playerId: a.id, playerId2: b.id });
        return 'La reunión no alcanzó: se dijeron las cosas, pero el clima quedó pesado. Esto no terminó acá.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 4);
      for (const p of [a, b]) bumpGrievance(s, p, 'grupo');
      addPairBonus(s, a.id, b.id, -5);
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
        addPairBonus(s, a.id, b.id, -4);
        return `Respaldaste a ${stays.name}. ${hurt.name} lo sintió como una traición y quedó picado.`;
      }
      if (opt === 1) {
        if (rng.chance(0.4)) {
          for (const p of [a, b]) p.motivation = clamp(p.motivation - 3);
          s.club.socialClimate = clamp(s.club.socialClimate + 4);
          addPairBonus(s, a.id, b.id, 2);
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
        // Enterrar el hacha se nota en el mapa: el roce deja de serlo.
        addPairBonus(s, a.id, b.id, 10);
        s.memorableMoments.push(`${fechaLabel(s)}: ${a.name} y ${b.name} enterraron el hacha tras semanas de tensión.`);
        return 'Hablaste con cada uno y funcionó: se pidieron disculpas frente al grupo. El vestuario respiró.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 5);
      addPairBonus(s, a.id, b.id, -4);
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

  // ======================================================================
  // Sesión 3 de design/MUNDO_REVISION_2026-10.md: los eventos que miran al
  // mundo. Hasta acá los eventos eran del vestuario, la caja y el plantel;
  // estos tienen del otro lado un club con nombre, un delegado, un DT, una
  // cancha, un árbitro o una figura del mundo, y usan lo que el mundo ya sabe
  // (clubLore.ts, leagueLife.ts, world.ts). Ninguno agrega campos al save.
  // ======================================================================

  {
    id: 'cambio_de_dia',
    title: 'El delegado rival pide cambiar el día',
    weight: 6,
    canFire: (s) => {
      const r = rivalDeLaSemana(s);
      return !!r && r.division.altDays.length > 0;
    },
    text: (s) => {
      const r = rivalDeLaSemana(s)!;
      const alt = r.division.altDays[0];
      return `${mayus(r.team.delegate)} (delegado de ${r.rival.name}) te llama un martes a la noche: "El ${r.division.gameDay} nos quedamos sin ${r.lore?.cancha ?? 'gimnasio'}. ¿Jugamos el ${alt}? La liga lo acepta si firmamos los dos".`;
    },
    options: (s) => {
      const r = rivalDeLaSemana(s)!;
      const alt = r.division.altDays[0];
      const pisados = actives(s).filter((p) => p.status !== 'lesionado' && p.agenda?.blockedDays.includes(alt));
      return [
        {
          label: `Firmar el cambio al ${alt}`,
          hint: pisados.length === 0 ? 'A nadie del plantel le pisa ese día' : `A ${listaY(pisados.map((p) => apellidoDe(p.name)))} le${pisados.length > 1 ? 's' : ''} pisa ese día`,
        },
        { label: '"La fecha es la fecha": que se arreglen', hint: 'El delegado se lo anota, y los delegados hablan entre ellos' },
      ];
    },
    resolve: (s, _ev, opt) => {
      const r = rivalDeLaSemana(s)!;
      const alt = r.division.altDays[0];
      if (opt === 0) {
        const pisados = actives(s).filter((p) => p.status !== 'lesionado' && p.agenda?.blockedDays.includes(alt));
        for (const p of pisados) {
          p.status = 'lesionado';
          p.injuryWeeks = 1;
          p.injuryReason = 'laboral';
          logPlayerEvent(p, s.seasonNumber, s.week, 'ausencia', `La fecha se pasó al ${alt} y ese día no puede: no está esta semana.`);
        }
        s.club.socialPrestige = clamp(s.club.socialPrestige + 1);
        logClubEvent(s, 'social', `El club le firmó a ${r.rival.name} el cambio de la fecha al ${alt}.`);
        if (pisados.length === 0) {
          return `Firmaste y ${r.team.delegate} te mandó tres emojis de aplauso. A nadie del plantel le pisaba el ${alt}: sale gratis, y en la liga se acuerdan de quién ayuda.`;
        }
        return `Firmaste. ${mayus(r.team.delegate)} te agradeció por audio, y ${listaY(pisados.map((p) => p.name))} ${pisados.length > 1 ? 'avisaron' : 'avisó'} enseguida: los ${dayLabel(alt)} no ${pisados.length > 1 ? 'pueden' : 'puede'}. Esta semana ${pisados.length > 1 ? 'no están' : 'no está'}.`;
      }
      s.club.organization = clamp(s.club.organization + 2);
      later(s, 1, {
        text: `${mayus(r.team.delegate)} (${r.rival.name}) anduvo diciendo en el grupo de delegados que ${s.club.name} "no ayuda a nadie". Dos delegados le dieron la razón.`,
        tone: 'neutral',
      });
      return `"La fecha es la fecha", le dijiste, y ${r.team.delegate} cortó con un "bueno, está bien" de esos que no están bien. Jugaron el ${r.division.gameDay} con lo que tenían.`;
    },
  },
  {
    id: 'gimnasio_rival_inundado',
    title: 'Se les llovió el gimnasio',
    weight: 5,
    canFire: (s) => {
      const r = rivalDeLaSemana(s);
      if (!r || s.week % 2 === 1) return false; // esta semana somos visitantes
      const rasgos = r.lore?.rasgos ?? [];
      return rasgos.includes('cancha_abierta') || rasgos.includes('agua_fria') || s.weekMoment?.id === 'tormenta';
    },
    text: (s) => {
      const r = rivalDeLaSemana(s)!;
      return `Se les llovió la cancha: en ${r.lore?.cancha ?? 'el gimnasio de ellos'} hay un balde en la línea de tres y el piso levantado. ${mayus(r.team.delegate)} (${r.rival.name}) pide jugar la fecha en nuestra cancha, de local en casa ajena. "Ustedes cobran la cantina, nosotros ponemos la planilla".`;
    },
    options: () => [
      { label: 'Prestar la cancha y abrir la cantina', hint: 'Entra plata del barrio; el club anda a las corridas' },
      { label: 'Prestarla sin cobrarles nada', hint: 'Un favor que la liga anota' },
      { label: 'Que lo resuelva la liga', hint: 'Sin trabajo extra, y sin amigos nuevos' },
    ],
    resolve: (s, _ev, opt) => {
      const r = rivalDeLaSemana(s)!;
      if (opt === 0) {
        const recaudado = 20 + Math.round(s.club.socialPrestige / 4);
        s.club.money += recaudado;
        s.ledger.push({ week: s.week, concept: `Cantina del partido prestado a ${r.rival.name}`, amount: recaudado });
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        s.club.organization = clamp(s.club.organization - 2);
        return `Se jugó en casa con las dos hinchadas y la cantina a full: $${recaudado} para la caja. Eso sí, ${PERSONAJES.cancheroLargo}, pidió que no se repita: "dos planillas, dos delegados y un solo vestuario".`;
      }
      if (opt === 1) {
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        s.club.socialClimate = clamp(s.club.socialClimate + 2);
        later(s, 2, {
          text: `${mayus(r.team.delegate)} (${r.rival.name}) mandó al grupo del club una caja de alfajores "por la cancha". Se terminaron en un entrenamiento.`,
          tone: 'good',
          climate: 1,
        });
        return `Les prestaste la cancha sin cobrar un peso. ${mayus(r.team.delegate)} no sabía qué decir, y en la liga lo dijeron por él: "así se hace".`;
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
      later(s, 1, {
        text: `La liga les consiguió cancha a ${r.rival.name} a último momento, lejos y sin tribuna. ${mayus(r.team.delegate)} te saludó seco en la planilla.`,
        tone: 'neutral',
      });
      return `Le dijiste ${al(r.team.delegate)} que lo resuelva la liga. Lo resolvieron, pero en la liga quedó la frase: "${s.club.name} no presta ni la cancha".`;
    },
  },
  {
    id: 'dt_rival_tienta',
    title: 'El DT de enfrente se quedó mirando',
    weight: 6,
    canFire: (s) => {
      const r = rivalDeLaSemana(s);
      return !!r && !!r.team.coachName && figuras(s).some((p) => p.technique >= 64 && p.status !== 'lesionado');
    },
    pickTargets: (s, rng) => {
      const cands = figuras(s).filter((p) => p.technique >= 64 && p.status !== 'lesionado');
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) => {
      const r = rivalDeLaSemana(s)!;
      const p = byId(s, ev.playerId);
      return `${r.team.coachName}, el DT de ${r.rival.name}, se quedó mirando el entrenamiento desde la puerta. A la noche le escribió a ${p.name}: "Con nosotros jugás los cuarenta minutos y la ficha la pone el club". ${p.name} te mostró el mensaje.`;
    },
    options: (s) => {
      const r = rivalDeLaSemana(s)!;
      return [
        { label: 'Pedirle de frente que se quede', hint: 'Funciona con los que tienen amigos acá' },
        { label: `Ir a hablar con ${r.team.coachName}: "a mis jugadores no"`, hint: 'Marca la cancha en la liga; alguno siente que decidís por él' },
        { label: 'Dejar que decida solo', hint: 'Los leales se quedan; los demás, depende' },
      ];
    },
    resolve: (s, ev, opt, rng) => {
      const r = rivalDeLaSemana(s)!;
      const p = byId(s, ev.playerId);
      const arraigado = p.personality === 'leal' || p.personality === 'veterano' || p.personality === 'cumplidor';
      if (opt === 0) {
        if (rng.chance(0.45 + p.social / 300 + (arraigado ? 0.3 : 0))) {
          p.motivation = clamp(p.motivation + 8);
          if (p.personality === 'protagonista') p.expectedRole = 'titular';
          calm(p);
          return `${p.name} te escuchó y borró el mensaje delante tuyo: "Acá tengo amigos, me quedo". ${p.personality === 'protagonista' ? 'Ahora espera ser el dueño de la pelota.' : 'No hizo falta prometerle nada.'}`;
        }
        p.motivation = clamp(p.motivation - 3);
        later(s, 2, {
          playerId: p.id,
          text: `${p.name} fue a entrenar un martes con ${r.rival.name}, "para ver cómo es". Volvió callado.`,
          tone: 'bad',
          motivation: -2,
        });
        return `${p.name} dijo "lo pienso" y se fue mirando el celular. No suena bien.`;
      }
      if (opt === 1) {
        s.club.sportPrestige = clamp(s.club.sportPrestige + 1);
        if (p.personality === 'protagonista' || p.personality === 'mercenario') {
          p.motivation = clamp(p.motivation - 5);
          bumpGrievance(s, p, 'trato', { note: 'El manager habló con otro DT por él, sin preguntarle.' });
          return `${r.team.coachName} se disculpó con las manos en alto: "era un mensaje nomás". ${p.name}, en cambio, se enteró de que hablaste por él y no le gustó: "¿Yo no tengo boca?".`;
        }
        p.motivation = clamp(p.motivation + 3);
        return `${r.team.coachName} se hizo el distraído: "era un mensaje nomás". ${p.name} se enteró de que fuiste a hablar por él y se lo tomó bien: "Gracias por bancarme".`;
      }
      if (arraigado || rng.chance(0.65)) {
        p.motivation = clamp(p.motivation + 2);
        return `${p.name} le contestó solo: "Gracias, pero acá estoy bien". Lo contó en el grupo con captura y todo.`;
      }
      makeLeave(s, p, `Se fue a ${r.rival.name}: el DT de ellos le ofreció la ficha y los cuarenta minutos.`);
      s.club.sportPrestige = clamp(s.club.sportPrestige - 3);
      return `${p.name} se fue a ${r.rival.name} y lo vas a tener enfrente. Lo avisó por el grupo, con un "gracias por todo" que nadie contestó.`;
    },
  },
  {
    id: 'asamblea_liga',
    title: 'Asamblea de delegados',
    weight: 7,
    canFire: (s) =>
      s.week >= 3 &&
      s.week < s.seasonLength &&
      s.rivals.length >= 4 &&
      !(s.eventLog ?? []).some((e) => e.id === 'asamblea_liga' && e.season === s.seasonNumber),
    text: (s) =>
      `La liga cita a asamblea de delegados en la sede, con mate y un orden del día en tres puntos: adelantar el horario de la fecha una hora, una cuota extra de $40 por club para pagar mejores árbitros, y multar al que presente la planilla con seis. Sos uno de los ${s.rivals.length + 1} votos.`,
    options: () => [
      { label: 'Votar el horario más temprano', hint: 'Los que solo llegan a los de 22:00 lo van a sufrir si sale' },
      { label: 'Votar los árbitros pagos', hint: 'Cuesta $40 si sale; la liga se pone seria' },
      { label: 'Votar la multa al que juega con seis', hint: 'Ordena la liga; a vos te conviene si tenés banco' },
    ],
    resolve: (s, _ev, opt) => {
      const mociones = ['horario', 'arbitros', 'seis'] as const;
      const total = s.rivals.length + 1;
      const resultados = mociones.map((m, i) => {
        const aFavor = s.rivals.filter((r) => hashVoto(`${r.name}|${m}|s${s.seasonNumber}`) < 0.5);
        const votos = aFavor.length + (i === opt ? 1 : 0);
        return { m, votos, pasa: votos * 2 > total, aliados: aFavor.map((r) => teamByLegacyRival(s.world, r.id)?.delegate ?? r.name) };
      });
      const mia = resultados[opt];
      const partes: string[] = [];
      if (mia.pasa) {
        s.club.sportPrestige = clamp(s.club.sportPrestige + 1);
        partes.push(`Tu moción salió, ${mia.votos} a ${total - mia.votos}${mia.aliados.length ? `, con ${listaY(mia.aliados.slice(0, 2))} de tu lado` : ''}.`);
      } else {
        partes.push(`Tu moción perdió, ${mia.votos} a ${total - mia.votos}${mia.aliados.length ? `; te acompañaron ${listaY(mia.aliados.slice(0, 2))}` : ': votaste solo'}.`);
      }
      for (const res of resultados) {
        if (!res.pasa) continue;
        if (res.m === 'horario') {
          const pisados = actives(s).filter((p) => p.agenda?.onlyTimes.length);
          for (const p of pisados) p.motivation = clamp(p.motivation - 3);
          partes.push(`Se adelanta el horario de la fecha${pisados.length ? `: ${listaY(pisados.map((p) => apellidoDe(p.name)))} ya ${pisados.length > 1 ? 'preguntaron' : 'preguntó'} cómo hace para salir antes del laburo` : ''}.`);
        } else if (res.m === 'arbitros') {
          s.club.money -= 40;
          s.ledger.push({ week: s.week, concept: 'Cuota extra de la liga: árbitros', amount: -40 });
          partes.push('Hay cuota extra para los árbitros: $40 que salieron de la caja esa misma noche.');
        } else {
          s.club.organization = clamp(s.club.organization + 2);
          partes.push('Desde la fecha que viene, planilla con seis es multa. Alguien aplaudió; era de Círculo.');
        }
      }
      logClubEvent(s, 'hito', `Asamblea de delegados: ${partes[0]}`);
      return partes.join(' ');
    },
  },
  {
    id: 'cantina_rival',
    title: 'El tercer tiempo de ellos',
    weight: 6,
    canFire: (s) => {
      const m = s.lastMatch;
      if (!m || m.forfeit || m.week % 2 === 1) return false; // la fecha pasada fuimos visitantes
      const rasgos = loreOf(m.rivalName)?.rasgos ?? [];
      return rasgos.includes('cantina') || rasgos.includes('tercer_tiempo');
    },
    text: (s) => {
      const m = s.lastMatch!;
      const team = teamByLegacyRival(s.world, m.rivalId);
      const lore = loreOf(m.rivalName);
      return `Después del partido en ${lore?.cancha ?? 'la cancha de ellos'}, ${team?.delegate ?? 'el delegado de ellos'} abrió la cantina: "Quédense, muchachos, que hay chorizos". Medio plantel ya está sentado y el otro medio mira el reloj.`;
    },
    options: () => [
      { label: 'Quedarse: el club paga una ronda ($25)', hint: 'Junta al grupo, y en la cantina se escuchan cosas' },
      { label: 'Quedarse un rato, sin gastar', hint: 'Cumple con la vecindad' },
      { label: 'Levantar al plantel: mañana se labura', hint: 'Los cumplidores lo agradecen; los sociales no' },
    ],
    resolve: (s, _ev, opt, rng) => {
      const m = s.lastMatch!;
      const team = teamByLegacyRival(s.world, m.rivalId);
      if (opt === 0) {
        const cost = Math.min(25, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: `Ronda en la cantina de ${m.rivalName}`, amount: -cost });
        s.club.socialClimate = clamp(s.club.socialClimate + 5);
        for (const p of rng.shuffle(actives(s)).slice(0, 3)) p.social = clamp(p.social + 1);
        const roster = team ? teamRoster(s.world, team.id) : [];
        const roto = roster.find((wp) => wp.injuryWeeks > 0);
        if (roto) {
          return `Chorizos, una ronda y la mesa larga. Entre vaso y vaso, uno de ellos soltó que ${worldPlayerName(roto)} está roto y no vuelve por ${roto.injuryWeeks === 1 ? 'una semana' : `${roto.injuryWeeks} semanas`}. Dato guardado.`;
        }
        const chismoso = roster.length ? rng.pick(roster) : null;
        return `Chorizos, una ronda y la mesa larga. ${chismoso ? `${worldPlayerName(chismoso)} terminó contando quién no se banca a quién en su vestuario.` : 'Se habló de todo menos de básquet.'} El grupo volvió a las dos de la mañana, cantando.`;
      }
      if (opt === 1) {
        s.club.socialClimate = clamp(s.club.socialClimate + 2);
        return 'Un chorizo cada uno, de parado, y a los autos. Quedó bien con los vecinos y nadie se quejó.';
      }
      for (const p of actives(s)) {
        if (p.personality === 'cumplidor') p.motivation = clamp(p.motivation + 1);
        if (p.personality === 'social') p.motivation = clamp(p.motivation - 2);
      }
      return `"Mañana se labura", dijiste, y los sociales se levantaron mirando la parrilla. ${mayus(team?.delegate ?? 'el delegado de ellos')} guardó los chorizos para la semana que viene.`;
    },
  },
  {
    id: 'clasico_barrio',
    title: 'El clásico del barrio',
    weight: 9,
    canFire: (s) => {
      const r = rivalDeLaSemana(s);
      const barrio = s.world.venues.find((v) => v.id === 'vn_user')?.neighborhood;
      return !!r && !!barrio && r.lore?.barrio === barrio;
    },
    text: (s) => {
      const r = rivalDeLaSemana(s)!;
      return `${r.rival.name} juega a seis cuadras: es el clásico del barrio. El del almacén ya puso el cartel en la vidriera y ${r.team.delegate} anda diciendo que ellos son "los del barrio de verdad".`;
    },
    options: () => [
      { label: 'Abrir la cancha y pasar la gorra', hint: 'Entra plata; el club anda a las corridas' },
      { label: 'Jugarlo como uno más', hint: 'Serio; a los que quieren cartel les falta algo' },
      { label: 'Contestar en la página del barrio', hint: 'El plantel se agranda; el barrio se lo anota' },
    ],
    resolve: (s, _ev, opt, rng) => {
      const r = rivalDeLaSemana(s)!;
      if (opt === 0) {
        const recaudado = 30 + Math.round(s.club.socialPrestige / 3);
        s.club.money += recaudado;
        s.ledger.push({ week: s.week, concept: `Gorra del clásico contra ${r.rival.name}`, amount: recaudado });
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        s.club.organization = clamp(s.club.organization - 3);
        logClubEvent(s, 'social', `El clásico del barrio contra ${r.rival.name} se jugó a cancha llena: $${recaudado} de gorra.`);
        return `Se llenó de vecinos, de los dos lados de la calle. La gorra dejó $${recaudado} y una discusión en la puerta sobre de qué lado de la avenida empieza el barrio.`;
      }
      if (opt === 1) {
        s.club.sportPrestige = clamp(s.club.sportPrestige + 1);
        for (const p of actives(s).filter((x) => x.personality === 'protagonista')) p.motivation = clamp(p.motivation - 2);
        return 'Lo preparaste como un partido más y el grupo lo entendió, menos los que querían salir en la foto. En la liga lo notaron: "serios, estos".';
      }
      for (const p of actives(s)) p.motivation = clamp(p.motivation + 4);
      if (!s.nemesis) s.nemesis = { rivalId: r.rival.id, reason: `el clásico del barrio contra ${r.rival.name} se puso personal en la página del barrio` };
      if (rng.chance(0.5)) {
        s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
        s.news.unshift({ week: s.week, text: `El manager, en la página del barrio: "El barrio ya sabe quién es quién". ${r.rival.name} contestó con un meme. Se viene caliente.`, tone: 'neutral' });
        return 'Tu respuesta se compartió más que la de ellos. El plantel llegó al entrenamiento repitiendo tu frase, y el clásico quedó a muerte.';
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
      s.news.unshift({ week: s.week, text: `La página del barrio publicó tu respuesta al lado de la tabla. ${r.rival.name} está arriba. Te cargaron hasta los del almacén.`, tone: 'bad' });
      return 'Contestaste y te lo cobraron: pusieron tu frase al lado de la tabla. El plantel se rió, pero llegó enchufado igual. El clásico quedó a muerte.';
    },
  },
  {
    id: 'arbitro_de_la_fecha',
    title: 'El juez que viene',
    weight: 5,
    canFire: (s) => {
      if (s.week > s.seasonLength) return false;
      const ref = refereeOfWeek(s);
      return (ref.style === 'protagonista' || ref.style === 'estricto') && actives(s).some(calenton);
    },
    pickTargets: (s, rng) => {
      const cands = actives(s).filter(calenton);
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) => {
      const ref = refereeOfWeek(s);
      const p = byId(s, ev.playerId);
      return `Esta fecha dirige ${mayus(ref.name)}: ${ref.blurb}. ${p.name} lo tiene atravesado desde la última técnica y ya avisó en el grupo que "hoy no se calla".`;
    },
    options: (s) => [
      { label: '"Hoy ni una palabra con el juez"', hint: 'Se guarda la bronca; no es gratis' },
      { label: 'Que juegue como siempre', hint: 'Con este juez, la técnica sale fácil' },
      { label: `Ir a saludar a ${mayus(refereeOfWeek(s).name)} antes del partido`, hint: 'A veces afloja el clima; a veces se nota demasiado' },
    ],
    resolve: (s, ev, opt, rng) => {
      const ref = refereeOfWeek(s);
      const p = byId(s, ev.playerId);
      if (opt === 0) {
        p.commitment = clamp(p.commitment + 2);
        p.motivation = clamp(p.motivation - 2);
        return `${p.name} asintió con la mandíbula apretada. Va a jugar con la boca cerrada, y eso, en él, es trabajo.`;
      }
      if (opt === 1) {
        p.motivation = clamp(p.motivation + 2);
        return `"Que juegue como siempre". ${p.name} sonrió. ${mayus(ref.name)} también va a dirigir como siempre.`;
      }
      if (rng.chance(0.5)) {
        s.club.socialClimate = clamp(s.club.socialClimate + 2);
        return `Fuiste a saludar a ${mayus(ref.name)} con un café. Se rió, te preguntó por el plantel y dijo "veremos". El grupo vio la escena y se relajó.`;
      }
      s.club.sportPrestige = clamp(s.club.sportPrestige - 2);
      s.news.unshift({ week: s.week, text: `Vieron al manager charlando con ${mayus(ref.name)} antes del partido. En la liga ya le pusieron nombre a la charla.`, tone: 'bad' });
      return `Fuiste a saludar a ${mayus(ref.name)} y te vieron. "¿Qué le fuiste a decir?", preguntó el delegado de enfrente, en voz alta, para que lo escuchen todos.`;
    },
  },
  {
    id: 'figura_rival_libre',
    title: 'La figura de ellos anda buscando',
    weight: 5,
    canFire: (s) => s.week <= s.seasonLength && s.club.money >= 40 && actives(s).length < 15 && !!figuraRivalSuelta(s),
    pickTargets: (s) => {
      const f = figuraRivalSuelta(s);
      return f ? { contactId: f.wp.id } : null;
    },
    text: (s, ev) => {
      const wp = s.world.players.find((x) => x.id === ev.contactId);
      if (!wp) return 'El dato ya quedó viejo.';
      const rival = s.rivals.find((r) => r.name === wp.clubName);
      const team = rival ? teamByLegacyRival(s.world, rival.id) : undefined;
      return `Te llega por un amigo de otro cuadro: ${worldPlayerName(wp)} (${wp.clubName}) se peleó con ${team?.coachName ?? 'el DT'} y hace dos semanas que no entrena. "Está buscando dónde jugar, y vos sos el primero que lo sabe".`;
    },
    options: (s, ev) => {
      const wp = s.world.players.find((x) => x.id === ev.contactId);
      const cost = wp ? costoDeIrABuscar(wp) : 40;
      return [
        { label: `Ir a buscarlo: $${cost} entre ficha y viáticos`, hint: 'Si viene, la liga habla; si no, se gasta igual una parte' },
        { label: `Pasarle el dato a ${PERSONAJES.tesorera} y esperar`, hint: 'Capaz aparece solo' },
        { label: 'No meterse en vestuario ajeno', hint: 'En la liga se nota, para bien' },
      ];
    },
    resolve: (s, ev, opt, rng) => {
      const wp = s.world.players.find((x) => x.id === ev.contactId);
      if (!wp) return 'Cuando fuiste a preguntar, ya había arreglado en otro lado.';
      const club = wp.clubName ?? 'su club';
      if (opt === 0) {
        const cost = costoDeIrABuscar(wp);
        const chance = Math.max(0.2, Math.min(0.85, 0.45 + (s.club.sportPrestige - wp.prestige) / 200 + s.club.socialClimate / 400));
        if (rng.chance(chance)) {
          s.club.money -= cost;
          s.ledger.push({ week: s.week, concept: `Ficha y viáticos de ${worldPlayerName(wp)}`, amount: -cost });
          const mp = worldToMarket(wp, club, rng);
          const player = marketToPlayer(mp, wp.personality === 'mercenario' ? 'beca_total' : 'pagada', 'rotación', s.seasonNumber, rng);
          const week = Math.min(s.week, s.seasonLength);
          player.timeline = [{ season: s.seasonNumber, week, kind: 'llegada', text: `Llegó a mitad de temporada desde ${club}, después de pelearse con el DT de allá.` }];
          s.players.push(player);
          const reg = s.world.registrations.find((r) => r.playerId === wp.id && r.status === 'activa');
          if (reg) {
            reg.status = 'baja';
            reg.endWeek = week;
          }
          mudarAlClub(s.world, mp);
          s.club.sportPrestige = clamp(s.club.sportPrestige + 2);
          for (const p of actives(s).filter((x) => x.personality === 'protagonista' && x.id !== player.id)) p.motivation = clamp(p.motivation - 2);
          s.news.unshift({ week: s.week, text: `${player.name} se sumó al plantel a mitad de temporada: venía de ${club}. En la liga se habló toda la semana.`, tone: 'good' });
          ev.playerId = player.id;
          return `Fuiste, lo escuchaste despotricar contra su DT una hora, y firmó. ${player.name} ya es nuestro, y en ${club} no lo pueden creer. Algún protagonista ya cuenta minutos.`;
        }
        const gastado = Math.min(15, cost);
        s.club.money -= gastado;
        s.ledger.push({ week: s.week, concept: `Viáticos para ir a ver a ${worldPlayerName(wp)}`, amount: -gastado });
        return `Fuiste, tomaste un café con ${worldPlayerName(wp)} y a la semana se amigó con su DT. Quedaron $${gastado} de nafta y una historia para el grupo.`;
      }
      if (opt === 1) {
        return `Le pasaste el dato a ${PERSONAJES.tesorera}, que lo anotó en el cuaderno. "Si viene solo, bienvenido". No vino.`;
      }
      s.club.sportPrestige = clamp(s.club.sportPrestige + 1);
      return `"No nos metemos en vestuario ajeno". El amigo de afuera se lo contó a medio mundo, y en la liga lo tomaron como lo que es: un gesto.`;
    },
  },
  {
    id: 'sponsor_hijo',
    title: 'El hijo del sponsor',
    weight: 5,
    canFire: (s) => !!s.sponsor && actives(s).length < 15,
    text: (s) =>
      `${s.sponsor!.name} manda un mensaje con foto: "Mi hijo tiene veinte años, mide uno noventa y juega más o menos. ¿Lo pueden probar? Es por los pibes, no por la plata". La plata, igual, la pone él.`,
    options: () => [
      { label: 'Sumarlo al plantel', hint: 'El sponsor pone más; alguno cuenta minutos' },
      { label: 'Que entrene con el grupo, sin ficha', hint: 'Queda bien con todos y no compromete nada' },
      { label: 'Decir que no', hint: 'El sponsor puede tomárselo a mal' },
    ],
    resolve: (s, _ev, opt, rng) => {
      const sp = s.sponsor!;
      if (opt === 0) {
        const kid = createRecruit(rng, { minTechnique: 30, maxTechnique: 46, season: s.seasonNumber, taken: s.players.map((p) => p.name) });
        kid.age = 20;
        kid.height = 190;
        kid.description = `El hijo del dueño de ${sp.name}. Juega más o menos, como dijo el padre, y nunca falta.`;
        kid.commitment = rng.int(70, 90);
        s.players.push(kid);
        sp.weekly = Math.min(BALANCE.economy.sponsorMaxWeekly, sp.weekly + 15);
        for (const p of actives(s).filter((x) => x.personality === 'protagonista' && x.id !== kid.id)) p.motivation = clamp(p.motivation - 2);
        s.news.unshift({ week: s.week, text: `Se sumó ${kid.name}, el hijo del sponsor. ${sp.name} subió el aporte a $${sp.weekly} por semana.`, tone: 'good' });
        return `${kid.name} llegó con championes nuevos y el padre en la tribuna. El aporte sube a $${sp.weekly} por semana, y algún protagonista ya preguntó si "el pibe" va a jugar.`;
      }
      if (opt === 1) {
        s.club.socialClimate = clamp(s.club.socialClimate + 1);
        later(s, 2, {
          text: `El hijo de ${sp.name} dejó de venir a entrenar: "mucho para mí". El padre lo entendió y sigue poniendo.`,
          tone: 'neutral',
        });
        return 'Entrenó con el grupo el martes y el jueves. Corre, salta y no sabe dónde pararse; el padre mira desde el auto. Todos contentos, por ahora.';
      }
      if (rng.chance(0.4)) {
        s.sponsor = null;
        s.sponsorWeeks = 0;
        s.news.unshift({ week: s.week, text: `${sp.name} cortó el aporte: "Si no hay lugar para mi hijo, no hay lugar para mi plata". Se fue el sponsor.`, tone: 'bad' });
        return `Le dijiste que no con todas las buenas palabras. Al día siguiente ${sp.name} cortó el contrato. Las buenas palabras no alcanzaron.`;
      }
      sp.weekly = Math.max(30, sp.weekly - 10);
      return `Le dijiste que no. ${sp.name} se lo tomó como un padre: con una semana de silencio y el aporte recortado a $${sp.weekly}.`;
    },
  },
  {
    id: 'ranking_canchas',
    title: 'El ranking de canchas del barrio',
    weight: 5,
    canFire: (s) => s.week <= s.seasonLength && s.club.organization < 60,
    text: (s) => {
      const venue = s.world.venues.find((v) => v.id === 'vn_user');
      return `"Pasión Deportiva Zonal" publicó el ranking de canchas de la liga y ${venue?.name ?? 'nuestra cancha'} salió última: "vestuario con una ducha y olor a humedad". En el grupo ya circula la captura.`;
    },
    options: () => [
      { label: 'Arreglar el vestuario ($80)', hint: 'Caro, pero se nota todo el año' },
      { label: 'Contestar la nota', hint: 'A veces se da vuelta; a veces vuelven con fotos' },
      { label: 'Dejarlo pasar', hint: 'El rival de la semana que viene lo va a usar' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        if (s.club.money < 80) {
          s.club.socialClimate = clamp(s.club.socialClimate - 3);
          return 'Fuiste a pedir presupuesto y volviste con la cara larga: no hay $80. El vestuario sigue oliendo a lo que huele.';
        }
        s.club.money -= 80;
        s.ledger.push({ week: s.week, concept: 'Arreglo del vestuario', amount: -80 });
        s.club.organization = clamp(s.club.organization + 5);
        s.club.socialPrestige = clamp(s.club.socialPrestige + 3);
        later(s, 3, { text: 'El vestuario nuevo ya tiene olor a pintura y dos duchas que andan. El próximo rival lo notó en voz alta.', tone: 'good', climate: 2 });
        return 'Pintura, una ducha más y un extractor. $80 que se van a notar cada vez que entre un rival al vestuario.';
      }
      if (opt === 1) {
        if (rng.chance(0.5)) {
          s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
          return 'Contestaste con humor ("la humedad es parte de la localía") y la página lo compartió. Se rieron con vos, no de vos.';
        }
        s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
        return 'Contestaste y la página volvió con fotos del vestuario, de cerca. Mejor no hubieras contestado.';
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
      const r = rivalDeLaSemana(s);
      later(s, 1, {
        text: r ? `${mayus(r.team.delegate)} (${r.rival.name}) pidió en la planilla "jugar con el vestuario cerrado, por el olor". Lo dijo para que lo escuchen.` : 'El ranking de canchas siguió circulando en los grupos de la liga.',
        tone: 'neutral',
      });
      return 'Lo dejaste pasar. La captura siguió dando vueltas una semana más, y el delegado de enfrente la tenía guardada.';
    },
  },
  {
    id: 'cancha_tomada',
    title: 'Acto escolar en el gimnasio',
    weight: 5,
    canFire: (s) => {
      const r = rivalDeLaSemana(s);
      return !!r && s.week % 2 === 1 && s.club.organization < 65; // esta semana somos locales
    },
    text: (s) => {
      const r = rivalDeLaSemana(s)!;
      return `${PERSONAJES.cancheroLargo}, avisa el miércoles: el ${r.division.gameDay} hay acto escolar en el gimnasio y la cancha no está. La liga ofrece jugar en ${r.lore?.cancha ?? 'la cancha de ellos'} (${r.lore?.barrio ?? 'su barrio'}), con su tribuna, o que consigas otra.`;
    },
    options: (s) => {
      const r = rivalDeLaSemana(s)!;
      const brava = r.lore?.rasgos.includes('tribuna_brava');
      return [
        { label: `Jugar en ${r.lore?.cancha ?? 'la cancha de ellos'}`, hint: brava ? `Tribuna brava: ${RASGOS.tribuna_brava.desc}` : 'De local en cancha ajena' },
        { label: 'Alquilar otra cancha ($60)', hint: 'Se juega en terreno neutral' },
        { label: 'Jugar en la plaza de deportes del barrio', hint: 'Gratis y con vecinos; imagen de club chico' },
      ];
    },
    resolve: (s, _ev, opt) => {
      const r = rivalDeLaSemana(s)!;
      if (opt === 0) {
        const brava = r.lore?.rasgos.includes('tribuna_brava');
        for (const p of actives(s)) {
          if (p.personality === 'protagonista') p.motivation = clamp(p.motivation + 2);
          else if (brava) p.motivation = clamp(p.motivation - 2);
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 2);
        return `Se juega en ${r.lore?.cancha ?? 'la cancha de ellos'}${brava ? ', con su tribuna encima' : ''}. A los que les gusta el escenario les brillaron los ojos; al resto, no tanto.`;
      }
      if (opt === 1) {
        if (s.club.money < 60) {
          s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
          s.club.socialClimate = clamp(s.club.socialClimate + 2);
          return 'No había $60 para la cancha: terminaron en la plaza de deportes, con perros y vecinos. Se rieron bastante.';
        }
        s.club.money -= 60;
        s.ledger.push({ week: s.week, concept: 'Cancha alquilada para la fecha', amount: -60 });
        s.club.organization = clamp(s.club.organization + 2);
        return 'Se consiguió un gimnasio neutral a diez cuadras. Caro, pero sin tribuna ajena ni perros.';
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
      s.club.socialClimate = clamp(s.club.socialClimate + 2);
      return 'La fecha se jugó en la plaza de deportes del barrio, con cemento, viento y vecinos con reposera. El rival protestó la planilla; el grupo lo contó como una anécdota.';
    },
  },
  {
    id: 'multa_liga',
    title: 'Mail del secretario de la liga',
    weight: 6,
    canFire: (s) => s.club.organization < 50 && !!s.lastMatch && !s.lastMatch.forfeit,
    text: (s) =>
      `Llega un mail de ${SECRETARIO_LIGA}, secretario de la liga: multa de $20 por entregar la planilla fuera de hora en el partido con ${s.lastMatch!.rivalName}. "Tercer aviso", dice, aunque es el primero que ves.`,
    options: () => [
      { label: 'Pagar y ordenar la planilla', hint: 'Cuesta $20; el club se ordena un poco' },
      { label: 'Apelar por escrito', hint: 'A veces la liga afloja; a veces quedás de llorón' },
      { label: 'No pagar', hint: 'La multa no se olvida: crece' },
    ],
    resolve: (s, _ev, opt, rng) => {
      if (opt === 0) {
        const cost = Math.min(20, Math.max(0, s.club.money));
        s.club.money -= cost;
        if (cost > 0) s.ledger.push({ week: s.week, concept: 'Multa de la liga: planilla fuera de hora', amount: -cost });
        s.club.organization = clamp(s.club.organization + 4);
        return `Pagaste los $20 y pusiste a alguien a cargo de la planilla. ${SECRETARIO_LIGA} contestó con un "recibido" sin punto final.`;
      }
      if (opt === 1) {
        if (rng.chance(0.5)) {
          s.club.organization = clamp(s.club.organization + 2);
          return `Mandaste una carta de dos carillas con el horario del árbitro como prueba. ${SECRETARIO_LIGA} dejó la multa sin efecto "por esta vez".`;
        }
        s.club.money -= 20;
        s.ledger.push({ week: s.week, concept: 'Multa de la liga: planilla fuera de hora', amount: -20 });
        s.club.sportPrestige = clamp(s.club.sportPrestige - 1);
        return `La apelación volvió rechazada en un renglón, y en la liga circuló tu carta de dos carillas. Pagaste los $20 y un poco de cartel.`;
      }
      s.club.sportPrestige = clamp(s.club.sportPrestige - 1);
      chain(s, 2, { defId: 'multa_duplicada' });
      return `No pagaste. ${SECRETARIO_LIGA} no contestó, que es lo que hace antes de volver a escribir.`;
    },
  },
  {
    id: 'multa_duplicada',
    title: 'Segundo mail del secretario',
    weight: 0,
    chained: true,
    canFire: () => false,
    text: () => `Segundo mail de ${SECRETARIO_LIGA}, en mayúsculas en el asunto: la multa impaga se duplicó a $40. "Sin más avisos", y abajo el número de cuenta de la liga.`,
    options: () => [
      { label: 'Pagar los $40 ahora', hint: 'Se termina acá' },
      { label: 'Que lo descuenten de donde quieran', hint: 'Lo descuentan, con recargo, y la liga se acuerda' },
    ],
    resolve: (s, _ev, opt) => {
      if (opt === 0) {
        s.club.money -= 40;
        s.ledger.push({ week: s.week, concept: 'Multa duplicada de la liga', amount: -40 });
        s.club.organization = clamp(s.club.organization + 1);
        return `Pagaste los $40 con la cara que se paga una multa duplicada. ${SECRETARIO_LIGA} contestó "recibido", esta vez con punto.`;
      }
      s.club.money -= 60;
      s.ledger.push({ week: s.week, concept: 'Multa de la liga descontada con recargo', amount: -60 });
      s.club.sportPrestige = clamp(s.club.sportPrestige - 2);
      return `La liga lo descontó de la ficha con $20 de recargo: $60. ${SECRETARIO_LIGA} lo anunció en el grupo de delegados, con nombre del club.`;
    },
  },
];

// ---------- Lo que necesitan los eventos del mundo ----------

/** El rival de la fecha con todo lo que el mundo sabe de él; null en playoffs o sin fecha. */
function rivalDeLaSemana(s: GameState): { rival: Rival; team: Team; lore: ClubLore | undefined; division: (typeof DIVISIONS)[number] } | null {
  if (s.week > s.seasonLength) return null;
  const rival = s.rivals.find((r) => r.id === s.schedule[s.week - 1]);
  if (!rival) return null;
  const team = teamByLegacyRival(s.world, rival.id);
  const division = DIVISIONS.find((d) => d.id === s.divisionId);
  if (!team || !division) return null;
  return { rival, team, lore: loreOf(rival.name), division };
}

/** El apellido para las pistas cortas ("A Silva y Pereyra les pisa"). */
function apellidoDe(name: string): string {
  const parts = name.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/);
  return parts[parts.length - 1];
}

/** Los que se calientan con el juez: con ellos la protesta termina en técnica. */
function calenton(p: Player): boolean {
  return p.personality === 'competitivo' || p.personality === 'protagonista';
}

/** Un nombre con artículo arrancando la frase: "El Flaco Medina", "Suárez", "Doña Marta". */
function mayus(nombre: string): string {
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

/** "a" más un nombre con artículo, contraído: "al Flaco Umpiérrez", "a la Colo Fernández", "a Tito Barrios". */
function al(nombre: string): string {
  return nombre.startsWith('el ') ? `al ${nombre.slice(3)}` : `a ${nombre}`;
}

/** Hash estable a [0, 1): los votos de la asamblea no cambian al releer el evento. */
function hashVoto(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Una figura rival que ya enfrentamos y que podría venir: la mejor que cumpla, determinista por semana. */
function figuraRivalSuelta(s: GameState): { wp: WorldPlayer } | null {
  const cands: WorldPlayer[] = [];
  for (const rival of s.rivals) {
    const team = teamByLegacyRival(s.world, rival.id);
    if (!team) continue;
    for (const wp of teamRoster(s.world, team.id)) {
      if (wp.level >= 62 && (wp.timesFaced ?? 0) >= 1 && wp.injuryWeeks === 0 && wp.clubName === rival.name) cands.push(wp);
    }
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
  return { wp: cands[Math.floor(hashVoto(`figura|${s.seasonNumber}|${s.week}`) * Math.min(3, cands.length))] };
}

/** Lo que cuesta ir a buscar a una figura del mundo a mitad de temporada. */
function costoDeIrABuscar(wp: WorldPlayer): number {
  return 30 + Math.round(wp.level * 0.8);
}

/** El secretario de la liga: manda mails, no saluda. */
const SECRETARIO_LIGA = 'Arocena';

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
  return { defId: e.defId, playerId: e.playerId, playerId2: e.playerId2, fromWeek: e.fromWeek, payload: e.payload };
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
