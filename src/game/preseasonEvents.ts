import { BALANCE, clamp } from './balance';
import { createRecruit } from '../data/recruits';
import { marketToPlayer } from '../data/market';
import { Rng } from './rng';
import type { GameState, MarketPlayer, Player, PreseasonEventState } from './types';

export interface PreseasonEventDef {
  id: string;
  title: string;
  weight: number;
  canFire: (s: GameState) => boolean;
  /** Elige los implicados (ids de jugadores o fichables). Null si no hay objetivo. */
  pickTargets?: (s: GameState, rng: Rng) => string[] | null;
  text: (s: GameState, targetIds: string[]) => string;
  options: (s: GameState, targetIds: string[]) => { label: string; hint?: string }[];
  /** Muta el estado (ya clonado) y devuelve el desenlace. */
  resolve: (s: GameState, targetIds: string[], optionIndex: number, rng: Rng) => string;
}

// ---------- Helpers ----------

function confirmed(s: GameState): Player[] {
  const p = s.preseason!;
  return s.players.filter((x) => !x.leftClub && p.continuity[x.id] === 'confirmado');
}

function playerById(s: GameState, id: string): Player {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new Error(`Jugador no encontrado en evento de pretemporada: ${id}`);
  return p;
}

function marketById(s: GameState, id: string): MarketPlayer {
  const mp = s.preseason!.market.find((m) => m.id === id);
  if (!mp) throw new Error(`Fichable no encontrado en evento de pretemporada: ${id}`);
  return mp;
}

function log(s: GameState, text: string): void {
  s.preseason!.log.unshift(`S${s.preseason!.week}: ${text}`);
}

function spend(s: GameState, concept: string, amount: number): void {
  s.club.money -= amount;
  s.ledger.push({ week: 0, concept, amount: -amount });
  s.preseason!.moneySpent += amount;
}

function earn(s: GameState, concept: string, amount: number): void {
  s.club.money += amount;
  s.ledger.push({ week: 0, concept, amount });
}

// ---------- Eventos ----------

export const PRESEASON_EVENTS: PreseasonEventDef[] = [
  {
    id: 'ps_beca_exigida',
    title: 'La figura pide beca',
    weight: 10,
    canFire: (s) => confirmed(s).some((p) => p.feeStatus === 'pagada' && p.visibleRating >= 62),
    pickTargets: (s, rng) => {
      const cands = confirmed(s).filter((p) => p.feeStatus === 'pagada' && p.visibleRating >= 62);
      return cands.length ? [rng.pick(cands).id] : null;
    },
    text: (s, ids) =>
      `${playerById(s, ids[0]).name} te frena antes del picado: "En otros clubes me quieren y no pagaría un peso. Acá pago cuota como cualquiera. Became o lo pienso".`,
    options: () => [
      { label: 'Becarlo', hint: 'Se asegura su continuidad, pero la cuota no entra y alguno va a protestar' },
      { label: 'Negarse', hint: 'Puede empezar a dudar de seguir' },
    ],
    resolve: (s, ids, opt, rng) => {
      const p = playerById(s, ids[0]);
      if (opt === 0) {
        p.feeStatus = 'beca_total';
        p.motivation = clamp(p.motivation + 10);
        s.promises.push({ playerId: p.id, playerName: p.name, type: 'beca', label: `${p.name}: No pagar cuota (beca total)`, season: s.seasonNumber });
        for (const c of confirmed(s).filter((x) => x.personality === 'cumplidor')) c.motivation = clamp(c.motivation - 3);
        log(s, `Becaste a ${p.name} para retenerlo.`);
        return `${p.name} queda becado y confirmado. Algún cumplidor ya murmuró: "¿Y yo por qué pago?".`;
      }
      if (rng.chance(0.6)) {
        s.preseason!.continuity[p.id] = 'dudando';
        return `${p.name} apretó los dientes: "Está bien, pero lo voy a pensar". Ahora está dudando.`;
      }
      p.commitment = clamp(p.commitment + 3);
      return `${p.name} lo aceptó mejor de lo esperado: "Tenés razón, acá somos todos iguales".`;
    },
  },
  {
    id: 'ps_duo_amigos',
    title: 'Vienen juntos o no viene ninguno',
    weight: 8,
    canFire: (s) => s.preseason!.market.filter((m) => m.status === 'disponible' && !m.demand).length >= 2,
    pickTargets: (s, rng) => {
      const cands = s.preseason!.market.filter((m) => m.status === 'disponible' && !m.demand);
      if (cands.length < 2) return null;
      const shuffled = rng.shuffle(cands);
      return [shuffled[0].id, shuffled[1].id];
    },
    text: (s, ids) => {
      const a = marketById(s, ids[0]);
      const b = marketById(s, ids[1]);
      const cost = a.signingCost + b.signingCost;
      return `${a.name} y ${b.name} juegan juntos desde chicos y avisan: o los fichás a los dos, o no viene ninguno. Costaría $${cost} en total.`;
    },
    options: (s, ids) => {
      const cost = marketById(s, ids[0]).signingCost + marketById(s, ids[1]).signingCost;
      return [
        { label: `Fichar a los dos ($${cost})`, hint: 'Dos refuerzos de un saque, si alcanza la caja' },
        { label: 'Dejarlo pasar', hint: 'Se pierden las dos opciones' },
      ];
    },
    resolve: (s, ids, opt, rng) => {
      const a = marketById(s, ids[0]);
      const b = marketById(s, ids[1]);
      if (opt === 1) {
        a.status = 'perdido';
        b.status = 'perdido';
        return 'Les deseaste suerte. Van a jugar juntos, pero en otro club.';
      }
      const cost = a.signingCost + b.signingCost;
      if (s.club.money < cost) {
        return `No te alcanza la caja para los dos ($${cost}). El dúo sigue esperando... por ahora.`;
      }
      if (cost > 0) spend(s, `Fichaje doble: ${a.name} y ${b.name}`, cost);
      for (const mp of [a, b]) {
        const player = marketToPlayer(mp, mp.feeAttitude === 'completa' ? 'pagada' : mp.feeAttitude === 'parcial' ? 'beca_parcial' : 'beca_total', 'suplente', s.seasonNumber, rng);
        s.players.push(player);
        s.preseason!.continuity[player.id] = 'confirmado';
        mp.status = 'fichado';
      }
      // Vienen juntos: se potencian entre ellos.
      s.club.socialClimate = clamp(s.club.socialClimate + 3);
      log(s, `Fichaje doble: ${a.name} y ${b.name} llegan juntos.`);
      return `¡${a.name} y ${b.name} son del club! Llegaron juntos, con la química ya hecha.${rng.chance(0.5) ? ' En el primer picado se entendieron de memoria.' : ''}`;
    },
  },
  {
    id: 'ps_veterano_vuelve',
    title: 'Un viejo conocido quiere volver',
    weight: 7,
    canFire: () => true,
    text: () =>
      '"El Griego" Kalitis, histórico del club, apareció por la cancha: "Me pica el bichito, ¿me anotás? Cuota completa, la pago sin drama. Eso sí: mis rodillas ya no son las de antes".',
    options: () => [
      { label: 'Sumarlo al plantel', hint: 'Paga cuota completa; físico justo pero pesa en el vestuario' },
      { label: 'Decirle que no con cariño', hint: 'El grupo lo va a lamentar un poco' },
    ],
    resolve: (s, _ids, opt, rng) => {
      if (opt === 0) {
        const vet = createRecruit(rng, { minTechnique: 52, maxTechnique: 62, season: s.seasonNumber });
        vet.name = '"Griego" Kalitis';
        vet.previousTeam = 'Histórico del club: vuelve del retiro';
        vet.age = 36;
        vet.physical = rng.int(38, 50);
        vet.social = 90;
        vet.commitment = 85;
        vet.personality = 'veterano';
        vet.expectedRole = 'suplente';
        vet.description = 'Histórico del club. Vuelve para una última vuelta olímpica, o al menos para el tercer tiempo.';
        s.players.push(vet);
        s.preseason!.continuity[vet.id] = 'confirmado';
        s.club.socialClimate = clamp(s.club.socialClimate + 5);
        log(s, 'El Griego Kalitis volvió al club.');
        return 'El Griego se puso la camiseta ahí mismo. El grupo lo recibió con un aplauso: el vestuario ya vale más.';
      }
      s.club.socialClimate = clamp(s.club.socialClimate - 2);
      return 'Se fue con una sonrisa triste: "Avisame si les falta gente". Algunos veteranos del club fruncieron el ceño.';
    },
  },
  {
    id: 'ps_malas_referencias',
    title: 'Malas referencias',
    weight: 8,
    canFire: (s) => s.preseason!.market.some((m) => m.status === 'disponible' && m.socialRep < 45),
    pickTargets: (s, rng) => {
      const cands = s.preseason!.market.filter((m) => m.status === 'disponible' && m.socialRep < 45);
      return cands.length ? [rng.pick(cands).id] : null;
    },
    text: (s, ids) => {
      const mp = marketById(s, ids[0]);
      return `Tu capitán te manda un audio sobre ${mp.name}: "Ojo con ese. Como jugador no te digo nada, pero en ${mp.previousTeam} terminaron todos peleados con él".`;
    },
    options: () => [
      { label: 'Bajarlo de la lista', hint: 'Te evitás un posible problema de vestuario' },
      { label: 'Seguir igual, pero averiguar más', hint: 'Mejorás tus referencias sobre él' },
    ],
    resolve: (s, ids, opt, rng) => {
      const mp = marketById(s, ids[0]);
      if (opt === 0) {
        mp.status = 'rechazo';
        return `Listo: ${mp.name} queda descartado. El capitán te manda un pulgar arriba.`;
      }
      mp.estTechnique = Math.round(clamp(mp.technique + rng.range(-5, 5), 20, 95));
      mp.estPhysical = Math.round(clamp(mp.physical + rng.range(-5, 5), 20, 95));
      if (mp.knowledge === 'desconocido' || mp.knowledge === 'poco_conocido') mp.knowledge = 'referencias';
      return `Hiciste unas llamadas más sobre ${mp.name}. Ahora tenés una idea mucho más clara de lo que puede dar en la cancha… y de lo que puede romper afuera.`;
    },
  },
  {
    id: 'ps_rifa_urgente',
    title: 'La caja no llega',
    weight: 12,
    canFire: (s) => s.club.money < BALANCE.economy.inscriptionFee + 150,
    text: (s) =>
      `La tesorera te muestra la planilla: hay $${s.club.money} y la inscripción cuesta $${BALANCE.economy.inscriptionFee}. "Podemos armar una rifa relámpago este fin de semana, pero hay que ponerse ya".`,
    options: () => [
      { label: 'Organizar la rifa ($25)', hint: 'Recauda según el prestigio social' },
      { label: 'No hay tiempo para eso', hint: 'La caja queda como está' },
    ],
    resolve: (s, _ids, opt, rng) => {
      if (opt === 1) return 'Decidiste no dispersarte. La tesorera guardó la planilla sin decir nada, pero lo dijo todo.';
      if (s.club.money < 25) return 'No había ni para los premios de la rifa. La tesorera se fue meneando la cabeza.';
      spend(s, 'Premios de la rifa relámpago', 25);
      const income = Math.round(rng.int(80, 200) * (0.7 + (s.club.socialPrestige / 100) * 0.6));
      earn(s, 'Rifa relámpago de pretemporada', income);
      log(s, `La rifa relámpago dejó $${income}.`);
      return `El barrio respondió: la rifa dejó $${income} limpios para la inscripción.`;
    },
  },
  {
    id: 'ps_sponsor_logo',
    title: 'Sponsor con condiciones',
    weight: 8,
    canFire: () => true,
    text: () =>
      'El dueño de la ferretería ofrece $140 para la pretemporada, pero quiere su logo bien grande en el pecho de la camiseta. "Grande, eh. Que se vea desde la tribuna".',
    options: () => [
      { label: 'Aceptar la plata', hint: '+$140 ahora; a los socios tradicionales no les gusta' },
      { label: 'La camiseta no se toca', hint: 'Los socios lo valoran' },
    ],
    resolve: (s, _ids, opt) => {
      if (opt === 0) {
        earn(s, 'Aporte de la ferretería (logo en camiseta)', 140);
        s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
        log(s, 'La ferretería puso $140 a cambio del logo en el pecho.');
        return 'Trato hecho: $140 a la caja. En el grupo de socios ya circula un fotomontaje de la camiseta con el logo gigante.';
      }
      s.club.socialPrestige = clamp(s.club.socialPrestige + 2);
      return '"La camiseta no se toca". La frase se repitió toda la semana entre los socios, con orgullo.';
    },
  },
  {
    id: 'ps_trae_amigo',
    title: 'Uno trae a otro',
    weight: 9,
    canFire: (s) => confirmed(s).some((p) => p.personality === 'social' || p.personality === 'leal'),
    pickTargets: (s, rng) => {
      const cands = confirmed(s).filter((p) => p.personality === 'social' || p.personality === 'leal');
      return cands.length ? [rng.pick(cands).id] : null;
    },
    text: (s, ids) =>
      `${playerById(s, ids[0]).name} te escribe: "Tengo un amigo que quiere jugar. No te puedo decir cuánto vale porque soy amigo, pero es buena gente y paga cuota, eso seguro".`,
    options: () => [
      { label: 'Que venga', hint: 'Un jugador más, nivel sorpresa' },
      { label: 'Mejor no sumar incógnitas', hint: 'El plantel queda como está' },
    ],
    resolve: (s, ids, opt, rng) => {
      const sponsor = playerById(s, ids[0]);
      if (opt === 1) {
        sponsor.motivation = clamp(sponsor.motivation - 3);
        return `${sponsor.name} lo entendió, aunque le quedó un gustito amargo: "Bueno, después no digas que no te ofrecí gente".`;
      }
      const friend = createRecruit(rng, { minTechnique: 40, maxTechnique: 70, season: s.seasonNumber });
      friend.description = `Amigo de ${sponsor.name}. Nadie sabe bien cuánto vale, pero paga la cuota.`;
      s.players.push(friend);
      s.preseason!.continuity[friend.id] = 'confirmado';
      sponsor.motivation = clamp(sponsor.motivation + 5);
      log(s, `Se sumó ${friend.name}, amigo de ${sponsor.name}.`);
      return `Se sumó ${friend.name} (${friend.position}). ${sponsor.name} lo abrazó como si hubieran ganado algo. Cuánto vale en la cancha, se verá.`;
    },
  },
  {
    id: 'ps_confirmado_desaparece',
    title: 'Un confirmado se borró',
    weight: 8,
    canFire: (s) => confirmed(s).some((p) => p.personality !== 'leal' && p.personality !== 'veterano'),
    pickTargets: (s, rng) => {
      const cands = confirmed(s).filter((p) => p.personality !== 'leal' && p.personality !== 'veterano');
      return cands.length ? [rng.pick(cands).id] : null;
    },
    text: (s, ids) =>
      `${playerById(s, ids[0]).name} había confirmado, pero hace una semana que no aparece ni contesta. Alguien lo vio entrenando en otra cancha.`,
    options: () => [
      { label: 'Llamarlo ya mismo', hint: 'Encararlo antes de que se enfríe' },
      { label: 'Darle espacio', hint: 'Queda como "no respondió" y habrá que gestionarlo' },
    ],
    resolve: (s, ids, opt, rng) => {
      const p = playerById(s, ids[0]);
      if (opt === 0 && rng.chance(0.6)) {
        p.motivation = clamp(p.motivation + 4);
        return `Lo llamaste sin vueltas. ${p.name} se rió: "Estaba probando zapatillas nuevas, tranquilo. Sigo firme".`;
      }
      s.preseason!.continuity[p.id] = 'no_respondio';
      return opt === 0
        ? `${p.name} no atendió. La cosa no pinta bien: queda como "no respondió".`
        : `Le diste espacio. ${p.name} queda en la lista de los que no responden.`;
    },
  },
];

export function getPreseasonEvent(id: string): PreseasonEventDef {
  const def = PRESEASON_EVENTS.find((e) => e.id === id);
  if (!def) throw new Error(`Evento de pretemporada desconocido: ${id}`);
  return def;
}

/** Sortea el evento de la semana de pretemporada (o null). */
export function rollPreseasonEvent(s: GameState, rng: Rng): PreseasonEventState | null {
  const eligible = PRESEASON_EVENTS.filter((e) => e.canFire(s));
  if (eligible.length === 0) return null;
  const total = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng.range(0, total);
  for (const def of eligible) {
    roll -= def.weight;
    if (roll <= 0) {
      const targets = def.pickTargets ? def.pickTargets(s, rng) : [];
      if (targets === null) continue;
      return { defId: def.id, targetIds: targets };
    }
  }
  return null;
}

/** Resuelve el evento de pretemporada pendiente. */
export function resolvePreseasonEvent(state: GameState, optionIndex: number): GameState {
  const pending = state.preseason?.pendingEvent;
  if (!pending) return state;
  const s: GameState = structuredClone(state);
  const rng = new Rng(s.seed);
  const def = getPreseasonEvent(pending.defId);
  const outcome = def.resolve(s, pending.targetIds, optionIndex, rng);
  s.preseason!.eventOutcome = outcome;
  s.preseason!.pendingEvent = null;
  s.seed = rng.nextSeed();
  return s;
}
