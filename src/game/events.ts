import { BALANCE, clamp } from './balance';
import { createRecruit } from '../data/recruits';
import type { ActiveEvent, GameState, Player } from './types';
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

/** Calma a un jugador molesto/al borde sin curar mágicamente una lesión. */
function calm(p: Player): void {
  if (p.status === 'molesto' || p.status === 'al_borde') {
    p.status = 'disponible';
  }
  p.weeksUpset = 0;
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
      return cands.length ? { playerId: rng.pick(cands).id } : null;
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
      return { playerId: cands[0].id, playerId2: cands[1].id };
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
          return 'La reunión terminó con un apretón de manos. El grupo valoró que alguien se hiciera cargo.';
        }
        s.club.socialClimate = clamp(s.club.socialClimate - 3);
        return 'La mediación quedó a mitad de camino: se saludan, pero la tensión sigue ahí.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 6);
      const worse = rng.pick([a, b]);
      worse.motivation = clamp(worse.motivation - 6);
      upset(worse);
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
    canFire: (s) => actives(s).length < 15 && actives(s).some((p) => p.personality === 'social' || p.personality === 'leal'),
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.personality === 'social' || p.personality === 'leal');
      return cands.length ? { playerId: rng.pick(cands).id } : null;
    },
    text: (s, ev) => `${byId(s, ev.playerId).name} trae un dato: "Tengo un amigo que jugó federado y anda buscando equipo. ¿Le digo que venga?"`,
    options: () => [
      { label: 'Que venga a probarse', hint: 'Refuerzo gratis, pero alguno puede celar minutos' },
      { label: 'Decir que no hay lugar', hint: 'El que invita se desilusiona' },
    ],
    resolve: (s, ev, opt, rng) => {
      const inviter = byId(s, ev.playerId);
      if (opt === 0) {
        const friend = createRecruit(rng, { minTechnique: 60, maxTechnique: 80, season: s.seasonNumber });
        friend.description = `Amigo de ${inviter.name}. Se nota que jugó en serio, falta ver si se engancha con el grupo.`;
        s.players.push(friend);
        inviter.motivation = clamp(inviter.motivation + 5);
        const protas = actives(s).filter((p) => p.personality === 'protagonista' && p.id !== friend.id);
        for (const p of protas) p.motivation = clamp(p.motivation - 2);
        s.news.unshift({ week: s.week, text: `Se probó y quedó ${friend.name}, amigo de ${inviter.name}.`, tone: 'good' });
        return `${friend.name} se sumó al plantel y se lo ve con nivel. Algún protagonista ya lo mira de reojo.`;
      }
      inviter.motivation = clamp(inviter.motivation - 6);
      return `${inviter.name} quedó desilusionado: "Era buenísimo, te aviso". Ojalá no lo tome a mal.`;
    },
  },
  {
    id: 'ausencia_clave',
    title: 'Baja de última hora',
    weight: 7,
    canFire: (s) => actives(s).filter((p) => p.status !== 'lesionado').length >= 6,
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.status !== 'lesionado' && p.technique >= 60);
      return cands.length ? { playerId: rng.pick(cands).id } : null;
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
      if (opt === 0) {
        p.social = clamp(p.social + 3);
        p.motivation = clamp(p.motivation + 2);
        return `${p.name} agradeció la comprensión. Esta semana no está; habrá que rearmar el quinteto.`;
      }
      p.motivation = clamp(p.motivation - 8);
      p.commitment = clamp(p.commitment + 4);
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
    canFire: (s) => actives(s).some((p) => p.technique >= 68 && p.motivation < 60),
    pickTargets: (s, rng) => {
      const cands = actives(s).filter((p) => p.technique >= 68 && p.motivation < 60);
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
      const cands = actives(s).filter((p) => p.commitment < 70);
      return cands.length ? { playerId: rng.pick(cands).id } : null;
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
];

/** Sortea un evento para la semana (o ninguno). Devuelve el ActiveEvent listo. */
export function rollEvent(state: GameState, rng: Rng): ActiveEvent | null {
  if (!rng.chance(BALANCE.weekly.eventChance)) return null;
  const eligible = EVENTS.filter((e) => e.canFire(state));
  if (eligible.length === 0) return null;
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng.range(0, totalWeight);
  for (const def of eligible) {
    roll -= def.weight;
    if (roll <= 0) {
      const targets = def.pickTargets ? def.pickTargets(state, rng) : {};
      if (targets === null) return null;
      return { defId: def.id, ...targets };
    }
  }
  return null;
}

export function getEvent(id: string): EventDef {
  const def = EVENTS.find((e) => e.id === id);
  if (!def) throw new Error(`Evento desconocido: ${id}`);
  return def;
}
