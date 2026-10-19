// La previa que se pica: la semana tiene voz entre clubes. Un jugador REAL
// del rival (persona del mundo, con cara y historial) tira la primera piedra,
// alguien de tu vestuario contesta según su personalidad, y algunas semanas
// el delegado rival dobla la apuesta: un asado al resultado. Todo alimenta el
// feed de la previa (efímero, de la semana) y deja una línea en las noticias.

import { BALANCE, clamp } from './balance';
import { loreOf, type Rasgo } from '../data/clubLore';
import { rivalryWith } from './leagueLife';
import { clubIdentity, teamByLegacyRival, teamRoster, worldPlayerName, type ClubArchetype } from './world';
import type { BanterMessage, GameState, Player } from './types';
import { Rng, seedFromString } from './rng';

/**
 * Lo que dice un club según su carácter (clubIdentity): un plantel de pibes
 * y uno de veteranos no pican igual. Sesión 4 de design/MUNDO_REVISION_2026-10.md.
 */
const OPENERS_POR_CARACTER: Record<ClubArchetype, string[]> = {
  juvenil: [
    'Nuestro más viejo tiene veintitrés. ¿El de ustedes cuántos nietos tiene?',
    'Después del partido salimos. Si quieren venir, avisen, aunque capaz no aguantan.',
    'Avisen qué defensa van a hacer, así la estudiamos en el ómnibus.',
  ],
  veterano: [
    'Hace veinte años que les ganamos a equipos como ustedes. No es amenaza, es estadística.',
    'Nosotros no corremos: esperamos. Ustedes van a venir solos.',
    'A la cancha se entra callado. Lo digo por experiencia, no por ustedes.',
  ],
  estrella: [
    'Guarden un cartel para nuestro base. Lo van a necesitar para explicar lo que pasó.',
    'Dejen de mirar la tabla y empiecen a mirar a nuestro 7. Después no digan que no avisamos.',
    'Pregunta: ¿tienen a alguien que lo marque? Es por organizar la planilla.',
  ],
  parejo: [
    'Acá no hay figura, son doce. Elijan a quién marcar.',
    'Nosotros cumplimos: once en la planilla. No pregunto por ustedes para no incomodar.',
    'Ni mejores ni peores que ustedes. Por eso vamos a ganar: no nos confiamos.',
  ],
};

/** Lo que un club dice por sus rasgos; los de la cancha, sólo cuando se juega en la de ellos. */
const OPENERS_POR_RASGO: Partial<Record<Rasgo, { frase: string; enSuCancha: boolean }>> = {
  tribuna_brava: { frase: 'Traigan tapones para los oídos. Nuestra gente compró bombo nuevo.', enSuCancha: true },
  cancha_chica: { frase: 'Ojo con la pared del fondo. Está a un metro y ya conoce a varios.', enSuCancha: true },
  agua_fria: { frase: 'Hay ducha. Caliente, no. Avisen si quieren que les pongamos la pava.', enSuCancha: true },
  cantina: { frase: 'Después de perder pueden quedarse a comer. Se cobra igual.', enSuCancha: true },
  aro_torcido: { frase: 'Nuestro aro tiene su manera. Nosotros la sabemos.', enSuCancha: true },
  cancha_abierta: { frase: 'Miren el pronóstico antes de venir. Acá el viento también juega, y es de los nuestros.', enSuCancha: true },
  piso_resbaloso: { frase: 'Traigan championes nuevos. El piso lo enceramos el martes, justo.', enSuCancha: true },
  tablero_viejo: { frase: 'Los tableros son de madera. Los tiros de tabla no vuelven, ya les aviso.', enSuCancha: true },
  vestuario_compartido: { frase: 'Vestuario compartido: la charla técnica se escucha. Hagan la de ustedes en el auto.', enSuCancha: true },
  de_traje: { frase: 'Vayan de saco. Nosotros vamos.', enSuCancha: false },
  siempre_seis: { frase: 'Esta vez juntamos siete. Así que ya saben: no hay excusa de banco.', enSuCancha: false },
  nunca_faltan: { frase: 'Nosotros vamos a estar los once, como siempre. ¿Ustedes llegan a diez?', enSuCancha: false },
  llegan_tarde: { frase: 'Capaz llegamos con cuatro al salto inicial. Esperen tranquilos, que después vamos cayendo.', enSuCancha: false },
  tercer_tiempo: { frase: 'Ganen o pierdan hay asado. Si pierden, lo pagan ustedes: es la tradición nuestra.', enSuCancha: false },
  historico: { frase: 'Pasen por la sede antes del partido y miren las vitrinas. Después no digan que no sabían.', enSuCancha: false },
  pibes: { frase: 'Nuestro más viejo tiene veintitrés. Les llevamos el hielo nosotros, no se gasten.', enSuCancha: false },
  delegado_pesado: { frase: 'Nuestro delegado ya revisó la planilla de ustedes. Tiene dos preguntas.', enSuCancha: false },
};

const OPENERS_GENERICOS = [
  'Che, ¿este año van a traer banco o siguen jugando seis?',
  'Pregunta seria: ¿el gimnasio de ustedes ya tiene los aros derechos?',
  'Nos vemos en la cancha. Traigan hielo… para los tobillos, digo.',
  'Avisen si necesitan que les mandemos la dirección de la cancha. La última vez llegaron tarde.',
  'Nos dijeron que entrenan los jueves. Nosotros también, pero al básquet.',
  'Mandamos el video del último partido de ustedes al grupo. Nos reímos mucho, con respeto.',
  'Ya elegimos el corte para el asado de después. Lo pagan ustedes, ¿no?',
  'Pregunta para el delegado de ustedes: ¿la planilla la traen o la inventan ahí?',
];

/** Frases del rival según el contexto (el que pica sabe por qué pica). */
function rivalOpeners(s: GameState, rivalName: string, rng: Rng): string[] {
  const rivalId = s.schedule[s.week - 1];
  const meetings = s.history.filter((m) => m.rivalId === rivalId);
  const last = meetings[meetings.length - 1];
  const openers: string[] = [];
  // La voz del club: su carácter y sus rasgos pesan más que el chiste genérico.
  const identity = clubIdentity(rivalName);
  openers.push(...OPENERS_POR_CARACTER[identity.archetype]);
  const enSuCancha = s.week % 2 === 0;
  for (const rasgo of loreOf(rivalName)?.rasgos ?? []) {
    const o = OPENERS_POR_RASGO[rasgo];
    if (o && (!o.enSuCancha || enSuCancha)) openers.push(o.frase, o.frase);
  }

  if (last && !last.won) {
    openers.push(
      `¿Se acuerdan del ${last.scoreAgainst}-${last.scoreFor}? Nosotros sí. Guardamos el video.`,
      `El otro día pasé el video del último partido en el grupo. Buenos recuerdos. Nos vemos en la cancha.`
    );
  }
  if (last && last.won) {
    openers.push(
      `La otra vez se nos escapó. Esta no. Avisen si necesitan que les guardemos hielo para después.`,
      `Venimos con bronca del último cruce. En el próximo cruce la devolvemos con intereses.`
    );
  }
  const clubRow = s.standings.find((r) => r.teamId === 'club');
  const rivalRow = s.standings.find((r) => r.teamId === rivalId);
  if (clubRow && rivalRow && rivalRow.wins > clubRow.wins) {
    openers.push(`Miren la tabla antes de venir, así no se sorprenden.`);
  }
  if (clubRow && rivalRow && clubRow.wins > rivalRow.wins) {
    openers.push(`Arriba en la tabla se está cómodo, ¿no? Disfruten hasta el ${rng.int(60, 80)} a ${rng.int(50, 59)}.`);
  }
  if (s.weekMoment?.id === 'seleccion') {
    openers.push(`Ojo que juega la Selección y después no valen las excusas de "nos faltaron cinco".`);
  }
  // Azar propio: dos genéricos por semana sin correr el azar de la temporada
  // (los tests con semilla fija recorren temporadas enteras).
  const propio = new Rng(seedFromString(`previa_${s.seasonNumber}_${s.week}`));
  openers.push(propio.pick(OPENERS_GENERICOS), propio.pick(OPENERS_GENERICOS));
  void rng;
  return openers;
}

/** La respuesta de tu vestuario, con la voz del que contesta. */
function ownReply(p: Player, rng: Rng): string {
  const pools: Partial<Record<Player['personality'], string[]>> = {
    protagonista: [
      'Que hablen ahora. En la cancha el que habla soy yo.',
      'Guarden ese mensaje. Lo vamos a leer de nuevo después del partido.',
    ],
    competitivo: [
      'Menos chat y más cancha. Ahí nos vemos.',
      'Perfecto. Más leña para el partido.',
    ],
    social: [
      'Jaja, buenísimo, después del partido asado igual, ¿no? Pero primero los pasamos por arriba.',
      'Los queremos igual, muchachos. Igual en el partido ni un rebote les dejamos.',
    ],
    veterano: [
      'Hace veinte años que escucho lo mismo. Después el partido lo juegan los nervios.',
      'Bien, que gasten pólvora en el grupo. A la cancha se entra callado.',
    ],
    mercenario: ['Que aposten algo si están tan seguros.'],
    talentoso_informal: ['Jaja, me colgué y recién leo. Igual les ganamos.'],
    leal: ['Acá nadie se esconde. En el partido, con la nuestra.'],
    cumplidor: ['Nosotros vamos a estar los doce, puntuales. Que ellos digan lo mismo.'],
  };
  const pool = pools[p.personality] ?? ['En el partido se contesta en la cancha.'];
  return rng.pick(pool);
}

/**
 * Sortea la previa de la semana: quién pica, quién contesta y si el delegado
 * rival apuesta el asado. Corre al arrancar la semana (con el rival ya fijo).
 */
export function rollWeekBanter(s: GameState, rng: Rng): void {
  s.weekBanter = null;
  if (s.asadoBet && s.asadoBet.week !== s.week) s.asadoBet = null;
  const rivalId = s.schedule[s.week - 1];
  const rival = s.rivals.find((r) => r.id === rivalId);
  if (!rival) return;
  const rivalry = rivalryWith(s, rival.id);
  const chance = BALANCE.banter.chance + (rivalry ? 0.25 : 0);
  if (!rng.chance(Math.min(0.92, chance))) return;

  const team = teamByLegacyRival(s.world, rival.id);
  const roster = team ? teamRoster(s.world, team.id) : [];
  if (roster.length === 0) return;
  // Habla su figura, o alguien que ya te cruzaste (la cara conocida pica más).
  const known = roster.filter((p) => (p.timesFaced ?? 0) >= 1);
  const sorted = [...roster].sort((a, b) => b.level - a.level);
  const speaker = known.length > 0 && rng.chance(0.55) ? rng.pick(known) : sorted[Math.floor(rng.next() * Math.min(3, sorted.length))];

  const messages: BanterMessage[] = [];
  const opener = rng.pick(rivalOpeners(s, rival.name, rng));
  messages.push({
    side: 'rival',
    name: worldPlayerName(speaker),
    worldPlayerId: speaker.id,
    personality: speaker.personality,
    age: speaker.age,
    text: opener,
  });

  // Contesta el que nunca se calla: protagonista > competitivo > social.
  const active = s.players.filter((p) => !p.leftClub && p.status !== 'lesionado');
  const responder =
    active.find((p) => p.personality === 'protagonista') ??
    active.find((p) => p.personality === 'competitivo') ??
    active.find((p) => p.personality === 'social') ??
    active[0];
  if (responder) {
    messages.push({
      side: 'own',
      name: responder.name,
      playerId: responder.id,
      personality: responder.personality,
      age: responder.age,
      text: ownReply(responder, rng),
    });
  }
  if (rivalry && rng.chance(0.6)) {
    messages.push({
      side: 'rival',
      name: worldPlayerName(speaker),
      worldPlayerId: speaker.id,
      personality: speaker.personality,
      age: speaker.age,
      text: rng.pick([
        'Está picante esto. Me gusta. En la cancha se define.',
        'Así da gusto. Nos vemos en la cancha, no borren el chat.',
      ]),
    });
  }

  // La apuesta del asado: el delegado rival dobla la previa.
  const betChance = BALANCE.banter.betChance + (rivalry ? BALANCE.banter.betRivalryBonus : 0);
  if (!s.asadoBet && rng.chance(betChance)) {
    const delegate = clubIdentity(rival.name).delegate;
    messages.push({
      side: 'delegado',
      name: `${delegate} (delegado de ${rival.name})`,
      text: `Muchachos, para que la cosa tenga sabor: ¿jugamos un asado? El que pierde lo paga completo, con cuenta del carnicero y todo. ¿Van?`,
      isBet: true,
    });
    s.asadoBet = { week: s.week, rivalId: rival.id, rivalName: rival.name, status: 'propuesta' };
  }

  s.weekBanter = { week: s.week, messages };
  s.news.unshift({
    week: s.week,
    text: `💬 La previa se picó: ${worldPlayerName(speaker)} (${rival.name}) anduvo hablando en los grupos. El vestuario ya contestó.`,
    tone: 'neutral',
  });
}

/** El manager contesta la apuesta del delegado rival. */
export function respondAsadoBet(state: GameState, accept: boolean): GameState {
  const s: GameState = structuredClone(state);
  const bet = s.asadoBet;
  if (!bet || bet.week !== s.week || bet.status !== 'propuesta') return state;
  bet.status = accept ? 'aceptada' : 'rechazada';
  if (accept) {
    s.news.unshift({
      week: s.week,
      text: `🤝 Apuesta sellada con ${bet.rivalName}: el que pierde el partido paga el asado. El plantel ya está eligiendo el corte.`,
      tone: 'neutral',
    });
    s.weekBanter?.messages.push({
      side: 'delegado',
      name: `Delegado de ${bet.rivalName}`,
      text: 'Hecho. Palabra de delegado. Que gane el mejor (nosotros).',
    });
  } else {
    s.weekBanter?.messages.push({
      side: 'delegado',
      name: `Delegado de ${bet.rivalName}`,
      text: 'Jaja, se corrieron. Bueno, igual nos vemos en la cancha. Cobardes pero puntuales, espero.',
    });
  }
  return s;
}

/**
 * Liquida la apuesta después del partido. Ganarla vale un asado pagado por el
 * rival (el próximo que organices sale gratis); perderla cuesta la parrilla
 * entera y un poco de clima. Se llama desde concludeMatch.
 */
export function settleAsadoBet(s: GameState): string | null {
  const bet = s.asadoBet;
  const m = s.lastMatch;
  if (!bet || !m || bet.week !== s.week || bet.status !== 'aceptada') return null;
  if (m.won) {
    bet.status = 'ganada';
    s.asadoBetPrize = { rivalName: bet.rivalName };
    s.club.socialClimate = clamp(s.club.socialClimate + 4);
    s.news.unshift({
      week: s.week,
      text: `🍖 La apuesta se cobra: ${bet.rivalName} paga el asado. El grupo ya está pasando la lista de cortes al delegado de ellos.`,
      tone: 'good',
    });
    return `Apuesta ganada: el asado lo paga ${bet.rivalName}`;
  }
  bet.status = 'perdida';
  s.club.money -= BALANCE.banter.betStake;
  s.ledger.push({ week: s.week, concept: `El asado de la apuesta (perdimos con ${bet.rivalName})`, amount: -BALANCE.banter.betStake });
  s.club.socialClimate = clamp(s.club.socialClimate - 2);
  s.news.unshift({
    week: s.week,
    text: `🍖 La apuesta se paga: perdimos y el asado de ${bet.rivalName} corre por nuestra cuenta ($${BALANCE.banter.betStake}). El delegado de ellos mandó la lista de cortes… con postre.`,
    tone: 'bad',
  });
  return `Apuesta perdida: pagamos el asado de ${bet.rivalName} ($${BALANCE.banter.betStake})`;
}
