// La previa que se pica: la semana tiene voz entre clubes. Un jugador REAL
// del rival (persona del mundo, con cara y historial) tira la primera piedra,
// alguien de tu vestuario contesta según su personalidad, y algunas semanas
// el delegado rival dobla la apuesta: un asado al resultado. Todo alimenta el
// feed de la previa (efímero, de la semana) y deja una línea en las noticias.

import { BALANCE, clamp } from './balance';
import { rivalryWith } from './leagueLife';
import { clubIdentity, teamByLegacyRival, teamRoster, worldPlayerName } from './world';
import type { BanterMessage, GameState, Player } from './types';
import type { Rng } from './rng';

/** Frases del rival según el contexto (el que pica sabe por qué pica). */
function rivalOpeners(s: GameState, rivalName: string, rng: Rng): string[] {
  const rivalId = s.schedule[s.week - 1];
  const meetings = s.history.filter((m) => m.rivalId === rivalId);
  const last = meetings[meetings.length - 1];
  const openers: string[] = [];

  if (last && !last.won) {
    openers.push(
      `¿Se acuerdan del ${last.scoreAgainst}-${last.scoreFor}? Nosotros sí. Guardamos el video.`,
      `El otro día pasé el video del último partido en el grupo. Buenos recuerdos. Nos vemos el finde.`
    );
  }
  if (last && last.won) {
    openers.push(
      `La otra vez se nos escapó. Esta no. Avisen si necesitan que les guardemos hielo para después.`,
      `Venimos con bronca del último cruce. El sábado la devolvemos con intereses.`
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
  openers.push(
    `Che, ¿este año van a traer banco o siguen jugando seis?`,
    `Pregunta seria: ¿el gimnasio de ustedes ya tiene los aros derechos?`,
    `Nos vemos el finde. Traigan hielo… para los tobillos, digo.`
  );
  void rivalName;
  return openers;
}

/** La respuesta de tu vestuario, con la voz del que contesta. */
function ownReply(p: Player, rng: Rng): string {
  const pools: Partial<Record<Player['personality'], string[]>> = {
    protagonista: [
      'Que hablen ahora. El sábado el que habla soy yo.',
      'Guarden ese mensaje. Lo vamos a leer de nuevo el domingo.',
    ],
    competitivo: [
      'Menos chat y más cancha. Ahí nos vemos.',
      'Perfecto. Más leña para el sábado.',
    ],
    social: [
      'Jaja, buenísimo, después del partido asado igual, ¿no? Pero primero los pasamos por arriba.',
      'Los queremos igual, muchachos. Igual el sábado ni un rebote les dejamos.',
    ],
    veterano: [
      'Hace veinte años que escucho lo mismo. Después el partido lo juegan los nervios.',
      'Bien, que gasten pólvora en el grupo. A la cancha se entra callado.',
    ],
    mercenario: ['Que aposten algo si están tan seguros.'],
    talentoso_informal: ['Jaja, me colgué y recién leo. Igual les ganamos.'],
    leal: ['Acá nadie se esconde. El sábado, en la cancha, con la nuestra.'],
    cumplidor: ['Nosotros vamos a estar los doce, puntuales. Que ellos digan lo mismo.'],
  };
  const pool = pools[p.personality] ?? ['El sábado se contesta en la cancha.'];
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
        'Está picante esto. Me gusta. El finde se define.',
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
      text: 'Jaja, se corrieron. Bueno, igual nos vemos el finde. Cobardes pero puntuales, espero.',
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
