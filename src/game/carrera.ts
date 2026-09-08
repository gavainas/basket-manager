import { BALANCE } from './balance';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { genAvailability } from './world';
import type { DemandType, GameState, MarketPlayer, Personality, Position } from './types';
import type { Rng } from './rng';

/**
 * Modo Carrera: el club desde cero (T3 del diagnóstico de septiembre).
 *
 * La fantasía que pidió Gabi es la contraria a la pretemporada de siempre:
 * **no tenés equipo, tenés amigos**. En vez de un catálogo de 16 fichables
 * ordenable por nivel, la primera pretemporada abre con una libreta de 6 a 8
 * contactos reales —el del laburo, el primo, el que jugaba con vos antes de
 * la rodilla, el pibe del edificio—, cada uno con un *por qué vendría* y un
 * *qué te va a pedir*. Nada de "nivel 69".
 *
 * Fichar es **pedir un favor**, no pagar un pase: el primer sí es el fácil
 * (tu íntimo); del segundo en adelante preguntan "¿y quién más va?" (ver
 * `favorChance`). Y es una **bola de nieve**: cada firmado abre 1 a 3
 * contactos suyos, con su propia referencia interesada (el amigo que lo trae
 * miente por lealtad, como en `conduct.ts`). El plantel se arma por red
 * social, no por lista.
 *
 * La restricción es dura: **8 en 4 semanas o no hay temporada** (ver
 * `closePreseason`). El catálogo de 16 no desaparece: se gana en la segunda
 * temporada, cuando el club ya tiene cartel.
 */

const C = BALANCE.carrera;
const POSITIONS: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

interface ContactSeed {
  relacion: string;
  porQue: string;
  personality: Personality;
  tech: [number, number];
  age: [number, number];
  commitment: [number, number];
  demand: DemandType | null;
  feeAttitude: MarketPlayer['feeAttitude'];
  previousTeam: string;
  intimo?: boolean;
}

/** La libreta del arranque: el íntimo siempre está; el resto se sortea. */
const LIBRETA: ContactSeed[] = [
  {
    relacion: 'Tu amigo de toda la vida',
    porQue: 'Vendría aunque el club fuera de bochas: "si vos armás algo, yo estoy".',
    personality: 'leal',
    tech: [42, 58],
    age: [27, 33],
    commitment: [78, 92],
    demand: null,
    feeAttitude: 'completa',
    previousTeam: 'Sin club',
    intimo: true,
  },
  {
    relacion: 'El del laburo',
    porQue: 'Juega los jueves con los de la oficina y se aburre: quiere algo en serio.',
    personality: 'competitivo',
    tech: [46, 64],
    age: [26, 34],
    commitment: [55, 80],
    demand: 'minutos',
    feeAttitude: 'completa',
    previousTeam: 'Sin club este año',
  },
  {
    relacion: 'Tu primo',
    porQue: 'Le debés una del casamiento. Viene, pero va a pedir algo.',
    personality: 'social',
    tech: [40, 60],
    age: [24, 32],
    commitment: [50, 75],
    demand: 'beca_parcial',
    feeAttitude: 'parcial',
    previousTeam: 'Club de su barrio',
  },
  {
    relacion: 'El que jugaba con vos antes de la rodilla',
    porQue: 'Dejó cuando vos dejaste. Volver juntos le cierra, pero quiere jugar, no mirar.',
    personality: 'protagonista',
    tech: [52, 70],
    age: [28, 35],
    commitment: [55, 78],
    demand: 'titularidad',
    feeAttitude: 'completa',
    previousTeam: 'Retirado hace un año',
  },
  {
    relacion: 'El pibe del edificio',
    porQue: 'Tiene veinte años y mide uno noventa y cinco. No sabe nada, pero corre todo el día.',
    personality: 'cumplidor',
    tech: [34, 50],
    age: [19, 22],
    commitment: [60, 85],
    demand: null,
    feeAttitude: 'completa',
    previousTeam: 'Sin club',
  },
  {
    relacion: 'Tu cuñado',
    porQue: 'Tu hermana dice que necesita salir de la casa. Él dice que juega "más o menos".',
    personality: 'talentoso_informal',
    tech: [38, 56],
    age: [30, 38],
    commitment: [35, 60],
    demand: 'sin_entrenar',
    feeAttitude: 'completa',
    previousTeam: 'Sin club',
  },
  {
    relacion: 'El de la facultad',
    porQue: 'Jugó en la liga universitaria hace años. Antes de decir que sí, pregunta contra quién se juega.',
    personality: 'competitivo',
    tech: [52, 68],
    age: [27, 33],
    commitment: [55, 80],
    demand: 'competitivo',
    feeAttitude: 'completa',
    previousTeam: 'Volvió de estudiar afuera',
  },
  {
    relacion: 'El vecino de la cancha',
    porQue: 'Se para a mirar todos los picados del parque. Nunca nadie lo invitó.',
    personality: 'cumplidor',
    tech: [40, 58],
    age: [25, 36],
    commitment: [65, 88],
    demand: null,
    feeAttitude: 'completa',
    previousTeam: 'Sin club',
  },
  {
    relacion: 'Tu ex compañero de la liga',
    porQue: 'Se quedó sin club este año. Le queda cerca y le gusta cómo pensás el juego.',
    personality: 'veterano',
    tech: [55, 70],
    age: [31, 37],
    commitment: [60, 85],
    demand: 'minutos',
    feeAttitude: 'completa',
    previousTeam: 'Sin club este año',
  },
  {
    relacion: 'El mercenario del barrio',
    porQue: 'Juega bien y lo sabe. Va a donde le paguen la cuota, y te lo dice en la cara.',
    personality: 'mercenario',
    tech: [58, 72],
    age: [25, 31],
    commitment: [35, 55],
    demand: 'beca',
    feeAttitude: 'beca',
    previousTeam: 'Club de su barrio',
  },
];

/** La agenda de un firmado: quiénes son para él, y por qué vendrían. */
const AGENDA: { relacion: (via: string) => string; porQue: (via: string) => string }[] = [
  { relacion: (v) => `Primo de ${v}`, porQue: (v) => `"Si va ${v}, voy", dijo, sin preguntar mucho más.` },
  { relacion: (v) => `Compañero de laburo de ${v}`, porQue: (v) => `${v} lo tiene al lado en la oficina y lo viene convenciendo hace semanas.` },
  { relacion: (v) => `Amigo de la facultad de ${v}`, porQue: (v) => `Jugaban juntos en los recreos de la facu. ${v} jura que "tira de tres".` },
  { relacion: (v) => `Vecino de ${v}`, porQue: (v) => `Se cruzan en el ascensor. Nunca habló de básquet hasta que ${v} le contó del club.` },
  { relacion: (v) => `Ex compañero de club de ${v}`, porQue: (v) => `Jugaron juntos hace años. ${v} dice que sigue "igual de bicho".` },
  { relacion: (v) => `El cuñado de ${v}`, porQue: (v) => `Lo trae ${v} medio a la fuerza: "le hace falta salir de casa".` },
];

const shortName = (name: string): string => {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  return name.trim().split(/\s+/)[0];
};

function uniqueName(rng: Rng, taken: Set<string>): string {
  for (let i = 0; i < 40; i++) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (!taken.has(name)) {
      taken.add(name);
      return name;
    }
  }
  const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${rng.int(2, 9)}`;
  taken.add(name);
  return name;
}

function contactFrom(
  rng: Rng,
  taken: Set<string>,
  opts: {
    relacion: string;
    porQue: string;
    personality: Personality;
    tech: [number, number];
    age: [number, number];
    commitment: [number, number];
    demand: DemandType | null;
    feeAttitude: MarketPlayer['feeAttitude'];
    previousTeam: string;
    knowledge: MarketPlayer['knowledge'];
    viaDe: string;
    abre: number;
  }
): MarketPlayer {
  const technique = rng.int(opts.tech[0], opts.tech[1]);
  const commitment = rng.int(opts.commitment[0], opts.commitment[1]);
  const noise = opts.knowledge === 'muy_conocido' ? 3 : opts.knowledge === 'conocido' ? 6 : 11;
  const name = uniqueName(rng, taken);
  const id = `ct${rng.int(0, 0xffffff).toString(36)}`;
  return {
    id,
    name,
    age: rng.int(opts.age[0], opts.age[1]),
    height: rng.int(172, 198),
    position: rng.pick(POSITIONS),
    previousTeam: opts.previousTeam,
    technique,
    physical: rng.int(55, 85),
    commitment,
    social: rng.int(45, 85),
    personality: opts.personality,
    sportRep: rng.int(10, 40),
    socialRep: rng.int(30, 70),
    // Un favor no tiene pase.
    signingCost: 0,
    feeAttitude: opts.feeAttitude,
    demand: opts.demand,
    flexibility: rng.range(0.3, 0.7),
    knowledge: opts.knowledge,
    knowledgeSource: opts.porQue,
    availability: 'libre',
    agenda: genAvailability(commitment, commitment, rng),
    status: 'disponible',
    estTechnique: Math.round(Math.max(20, Math.min(95, technique + rng.range(-noise, noise)))),
    estPhysical: Math.round(Math.max(20, Math.min(95, 70 + rng.range(-noise, noise)))),
    contacted: false,
    relacion: opts.relacion,
    porQue: opts.porQue,
    viaDe: opts.viaDe,
    abre: opts.abre,
    dudas: 0,
  };
}

/** La libreta del arranque: 6 a 8 contactos, el íntimo siempre primero. */
export function buildLibreta(rng: Rng): MarketPlayer[] {
  const taken = new Set<string>();
  const n = rng.int(C.contactosMin, C.contactosMax);
  const intimo = LIBRETA.find((c) => c.intimo)!;
  const resto = rng.shuffle(LIBRETA.filter((c) => !c.intimo)).slice(0, n - 1);
  return [intimo, ...resto].map((c) =>
    contactFrom(rng, taken, {
      ...c,
      knowledge: c.intimo ? 'muy_conocido' : 'conocido',
      viaDe: 'vos',
      abre: c.intimo ? rng.int(2, C.abreMax) : rng.int(C.abreMin, C.abreMax),
    })
  );
}

/**
 * La bola de nieve: el que firmó abre su agenda. Sus contactos llegan con
 * referencia de él (interesada, claro), y cada uno abre menos que el
 * anterior: la red se agota.
 */
export function abrirAgenda(via: MarketPlayer, rng: Rng, takenNames: string[]): MarketPlayer[] {
  const taken = new Set(takenNames);
  const n = via.abre ?? 0;
  const v = shortName(via.name);
  const demands: (DemandType | null)[] = [null, null, null, 'minutos', 'beca_parcial', 'ambiente'];
  return rng.shuffle(AGENDA).slice(0, n).map((a) =>
    contactFrom(rng, taken, {
      relacion: a.relacion(v),
      porQue: a.porQue(v),
      personality: rng.pick(['social', 'cumplidor', 'competitivo', 'talentoso_informal', 'leal'] as Personality[]),
      tech: [40, 68],
      age: [21, 35],
      commitment: [40, 85],
      demand: rng.pick(demands),
      feeAttitude: rng.chance(0.8) ? 'completa' : 'parcial',
      previousTeam: rng.pick(['Sin club', 'Club de su barrio', 'Sin club este año']),
      knowledge: 'referencias',
      viaDe: via.name,
      abre: rng.int(0, Math.max(0, n - 1)),
    })
  );
}

/**
 * ¿Dice que sí? El íntimo, siempre. Los demás miran cuántos ya están y si el
 * que los trajo firmó: "¿y quién más va?" es la pregunta que arma el club.
 */
export function favorChance(s: GameState, mp: MarketPlayer): number {
  if (mp.knowledge === 'muy_conocido' && mp.viaDe === 'vos') return 1;
  const p = s.preseason;
  const confirmados = s.players.filter((x) => !x.leftClub && (!p || p.continuity[x.id] === 'confirmado')).length;
  let chance = C.favorBase + confirmados * C.favorPorConfirmado;
  if (mp.viaDe && mp.viaDe !== 'vos') {
    const via = s.players.find((x) => !x.leftClub && x.name === mp.viaDe);
    if (via) chance += C.favorAmigoDentro;
  }
  return Math.min(C.favorMax, chance);
}

/** Lo que contesta cuando todavía no lo convenciste. */
export function favorRefusal(mp: MarketPlayer, confirmados: number, ultima: boolean): string {
  const v = shortName(mp.name);
  if (ultima) {
    return `${v} fue sincero: "Mirá, dejá, no me da el tiempo. Si el año que viene siguen, avisame". No va a venir.`;
  }
  if (confirmados === 0) {
    return `${v} escuchó todo, sonrió y preguntó: "¿Y quién más va?". Sin nadie confirmado no lo convenciste. Volvé cuando tengas gente.`;
  }
  return `${v} preguntó quién más iba. Le nombraste a ${confirmados === 1 ? 'uno' : `los ${confirmados}`} y no le alcanzó: "Cuando sean más, hablamos".`;
}
