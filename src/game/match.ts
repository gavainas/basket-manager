import { addPairBonus } from './asado';
import { BALANCE, clamp } from './balance';
import { buildMoods, hasMinutesPromise, moodCauseFor, type EmotionContext } from './emotions';
import { fragilityOf, MATCH_INJURY_NOTES, rollInjuryWeeks } from './injuries';
import { leagueNewsForWeek, refereeOfWeek, rivalryWith, settleRivalryAfterMatch, type OtherResult } from './leagueLife';
import { bumpGrievance, sootheGrievance } from './mood';
import { fallbackNote, quarterFlavor, rollRefIncident } from './narrative';
import { computeRating, type PlayerRating } from './rating';
import { logClubEvent, logPlayerEvent } from './timeline';
import { rollRivalMatchday, USER_TEAM_ID } from './world';
import type {
  BoxScoreLine,
  GameState,
  LineupPreset,
  LiveMatchState,
  MatchResult,
  Player,
  PlayerMood,
  Position,
  Rival,
  TeamEval,
} from './types';
import type { Rng } from './rng';

const ALL_POSITIONS: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
const Q_NAMES = ['1er cuarto', '2do cuarto', '3er cuarto', '4to cuarto'];

/** Fuerza efectiva de un jugador: técnica modulada por físico, motivación y confianza. */
export function playerEffective(p: Player): number {
  const physicalFactor = 0.55 + 0.45 * (p.physical / 100);
  const motivationFactor = 0.72 + 0.28 * (p.motivation / 100);
  const confidenceFactor = 0.9 + 0.2 * (p.confidence / 100);
  return p.technique * physicalFactor * motivationFactor * confidenceFactor;
}

export function isSelectable(p: Player): boolean {
  return !p.leftClub && p.status !== 'lesionado' && !(p.suspendedWeeks && p.suspendedWeeks > 0);
}

export function activePlayers(players: Player[]): Player[] {
  return players.filter((p) => !p.leftClub);
}

/** Ids de los que faltan al partido de esta semana con alguna excusa. */
export function matchAbsentIds(state: GameState): Set<string> {
  return new Set(state.callUp.filter((c) => c.status === 'ausente').map((c) => c.playerId));
}

/** Disponible para el partido de la semana: sano, en el club y sin excusa. */
export function availableForMatch(state: GameState, p: Player): boolean {
  return isSelectable(p) && !matchAbsentIds(state).has(p.id);
}

/** Ids que no pueden ARRANCAR el partido: los ausentes y los que avisaron que
 *  llegan para el segundo tiempo (esos solo entran desde el banco). */
export function noStartIds(state: GameState): Set<string> {
  const ids = matchAbsentIds(state);
  for (const c of state.callUp) {
    if (c.lateArrival && c.status === 'confirmado') ids.add(c.playerId);
  }
  return ids;
}

/**
 * Repara titulares y rotación después de cualquier cambio de disponibilidad
 * (descansar a un fundido, una gestión de ausencia, un evento). Saca a los que
 * ya no pueden jugar y, si el quinteto quedó incompleto, lo vuelve a sugerir:
 * nunca más un forfeit con banco de sobra por un titular que quedó "fantasma".
 * Muta el estado recibido (que debe ser un clon).
 */
export function sanitizeLineup(s: GameState): void {
  const absent = matchAbsentIds(s);
  const noStart = noStartIds(s);
  const byId = (id: string) => s.players.find((p) => p.id === id);

  s.starters = s.starters.filter((id) => {
    const p = byId(id);
    return !!p && isSelectable(p) && !noStart.has(id);
  });
  if (s.starters.length < 5) {
    s.starters = suggestStarters(s.players, noStart);
    s.rotation = suggestRotation(s.players, s.starters, absent);
    return;
  }
  s.rotation = s.rotation.filter((id) => {
    const p = byId(id);
    return !!p && isSelectable(p) && !absent.has(id) && !s.starters.includes(id);
  });
}

/** ¿Puede pisar la cancha ahora? Los que llegan al segundo tiempo, recién
 *  desde el 3er cuarto (con 2 cuartos ya jugados). */
function canEnterCourt(live: LiveMatchState, playerId: string): boolean {
  return live.quarters.length >= 2 || !(live.lateIds ?? []).includes(playerId);
}

/**
 * Una nota de color que no se repite en el mismo partido: elige una variante
 * libre del pool y la anota como usada. Si ya salieron todas, calla — el
 * silencio es mejor que el eco ("La pelota se mueve sola…" tres veces por
 * partido era la repetición más visible del juego).
 */
function freshLiveNote(live: LiveMatchState, pool: string[], rng: Rng): string | null {
  const used = (live.usedIncidents ??= []);
  const fresh = pool.filter((t) => !used.includes(t));
  if (fresh.length === 0) return null;
  const text = rng.pick(fresh);
  used.push(text);
  return text;
}

/** Minutos estimados de titulares y rotación según cuántos suplentes entran. */
export function minutesPlan(rotationCount: number): { starterMinutes: number; subMinutes: number } {
  const R = BALANCE.rotation;
  const n = Math.min(rotationCount, R.maxPlayers);
  const subMinutes = n > 0 ? R.minutesPerSub : 0;
  const starterMinutes = Math.round((R.totalMinutes - n * subMinutes) / 5);
  return { starterMinutes, subMinutes };
}

/** Jugadores de la rotación que efectivamente pueden entrar (disponibles y no titulares). */
export function rotationPlayers(state: GameState): Player[] {
  const absent = matchAbsentIds(state);
  return state.players
    .filter(
      (p) => isSelectable(p) && !absent.has(p.id) && state.rotation.includes(p.id) && !state.starters.includes(p.id)
    )
    .slice(0, BALANCE.rotation.maxPlayers);
}

export function evaluateTeam(state: GameState, starterIds: string[]): TeamEval {
  const absent = matchAbsentIds(state);
  const starters = state.players.filter((p) => starterIds.includes(p.id) && !absent.has(p.id));
  const rotation = state.players
    .filter(
      (p) => isSelectable(p) && !absent.has(p.id) && state.rotation.includes(p.id) && !starterIds.includes(p.id)
    )
    .slice(0, BALANCE.rotation.maxPlayers);

  const { starterMinutes, subMinutes } = minutesPlan(rotation.length);
  const overload = Math.max(0, starterMinutes - BALANCE.rotation.overloadThreshold);
  const staminaFactor = 1 - overload * BALANCE.rotation.overloadPenaltyPerMin;

  const starterEff = starters.map(playerEffective);
  const rotEff = rotation.map(playerEffective);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

  const baseSkill = avg(starters.map((p) => p.technique));
  const covered = new Set(starters.map((p) => p.position));
  const missingPositions = ALL_POSITIONS.filter((pos) => !covered.has(pos)).length;

  const socialAvg = avg(starters.map((p) => p.social));
  // El asado de la semana entra a la cancha: mesa llena empuja, papelón pesa.
  const asadoGlow =
    state.lastAsado && state.lastAsado.week === state.week
      ? state.lastAsado.tier === 'fieston'
        ? 0.06
        : state.lastAsado.tier === 'bueno'
          ? 0.03
          : state.lastAsado.tier === 'papelon'
            ? -0.05
            : 0
      : 0;
  const chemistry01 = Math.max(0, Math.min(1, (0.6 * state.club.socialClimate + 0.4 * socialAvg) / 100 + asadoGlow));
  const chemFactor = 0.94 + 0.12 * chemistry01;
  const orgFactor = 0.97 + 0.06 * (state.club.organization / 100);
  const coverageFactor = 1 - missingPositions * BALANCE.match.positionMissingPenalty;

  // Fuerza ponderada por minutos: los titulares cargan más peso, pero jugar
  // sin recambio los penaliza (staminaFactor) y una rotación larga los cuida.
  const R = BALANCE.rotation;
  const rawStrength =
    (avg(starterEff) * staminaFactor * starterMinutes * 5 + avg(rotEff) * subMinutes * rotation.length) /
    R.totalMinutes;

  return {
    strength: rawStrength * chemFactor * orgFactor * coverageFactor,
    baseSkill,
    physicalAvg: avg(starters.map((p) => p.physical)),
    motivationAvg: avg(starters.map((p) => p.motivation)),
    missingPositions,
    chemistry01,
    starterMinutes,
    rotationCount: rotation.length,
  };
}

/** El signo de una clave: qué resultado explica. Un elogio no explica una
 *  derrota (y viceversa): las claves que contradicen el marcador confunden
 *  más de lo que cuentan, así que se filtran por resultado. */
type ReasonSign = 'pro' | 'contra' | 'neutro';
interface Reason {
  weight: number;
  text: string;
  sign: ReasonSign;
}

function buildReasons(
  evalTeam: TeamEval,
  rivalStrength: number,
  luck: number,
  won: boolean,
  extra: Reason[] = []
): string[] {
  const reasons: Reason[] = [...extra];
  const gap = evalTeam.baseSkill - rivalStrength;

  if (gap > 7) reasons.push({ weight: gap, text: 'La diferencia de nivel estuvo a favor nuestro.', sign: 'pro' });
  if (gap < -7) reasons.push({ weight: -gap, text: 'El rival tenía un equipo superior en los papeles.', sign: 'contra' });
  if (evalTeam.physicalAvg < 55)
    reasons.push({ weight: 60 - evalTeam.physicalAvg, text: 'El equipo llegó con las piernas pesadas.', sign: 'contra' });
  if (evalTeam.physicalAvg > 78)
    reasons.push({ weight: evalTeam.physicalAvg - 70, text: 'La frescura física se notó en el último cuarto.', sign: 'pro' });
  if (evalTeam.motivationAvg < 50)
    reasons.push({ weight: 60 - evalTeam.motivationAvg, text: 'Varios jugadores estaban desmotivados y se notó.', sign: 'contra' });
  if (evalTeam.motivationAvg > 78)
    reasons.push({ weight: evalTeam.motivationAvg - 70, text: 'El equipo salió enchufado desde el arranque.', sign: 'pro' });
  if (evalTeam.missingPositions > 0)
    reasons.push({
      weight: evalTeam.missingPositions * 9,
      text: `Faltó cubrir ${evalTeam.missingPositions === 1 ? 'una posición natural' : `${evalTeam.missingPositions} posiciones naturales`} en el quinteto.`,
      sign: 'contra',
    });
  if (evalTeam.chemistry01 > 0.72)
    reasons.push({ weight: 8, text: 'La química del grupo empujó en los momentos calientes.', sign: 'pro' });
  if (evalTeam.chemistry01 < 0.45)
    reasons.push({ weight: 10, text: 'El mal ambiente del vestuario se trasladó a la cancha.', sign: 'contra' });
  if (luck > 6)
    reasons.push(
      won
        ? { weight: luck, text: 'La pelota entró en los momentos justos.', sign: 'pro' }
        : { weight: luck, text: 'Ni con suerte alcanzó: el rival fue más.', sign: 'contra' }
    );
  if (luck < -6)
    reasons.push(
      won
        ? { weight: -luck, text: 'Ganamos hasta con la pelota esquiva: doble mérito.', sign: 'pro' }
        : { weight: -luck, text: 'La pelota no quiso entrar; hubo mala fortuna.', sign: 'contra' }
    );

  // Solo claves que explican lo que pasó: elogios si ganaste, deudas si perdiste.
  const fits = reasons.filter((r) => r.sign === 'neutro' || (won ? r.sign === 'pro' : r.sign === 'contra'));
  fits.sort((a, b) => b.weight - a.weight);
  const top = fits.slice(0, 3).map((r) => r.text);
  if (top.length === 0)
    top.push(won ? 'Fue un partido parejo que se definió por detalles.' : 'Partido parejo que se escapó por detalles.');
  return top;
}

function lockerRoomNotes(
  state: GameState,
  result: { won: boolean; margin: number; shortHanded?: boolean; clutch?: boolean; comeback?: boolean; squadCount?: number },
  starters: Player[],
  mvp: Player | null,
  rng: Rng
): string[] {
  const notes: string[] = [];

  // La épica manda: si el partido tuvo historia, el vestuario habla de eso.
  const n = result.squadCount ?? 0;
  if (result.shortHanded && result.won) {
    notes.push(`Los ${n} que estuvieron se abrazaron como campeones. Gesta para contar en el asado por años.`);
  } else if (result.shortHanded && !result.won) {
    notes.push(`"Con ${n} no se podía más", dijo alguien. Adentro del vestuario nadie reprochó nada. Adentro.`);
  } else if (result.comeback) {
    notes.push('El vestuario tardó en creerlo: la remontada se festejó dos veces.');
  } else if (result.clutch && result.won) {
    notes.push('Ganada en la hora: gritos, abrazos y alguna lágrima disimulada.');
  } else if (result.clutch && !result.won) {
    notes.push('"La teníamos…", repetía el banco. La derrota en la hora es la que más cuesta dormir.');
  }

  const matchAbsent = matchAbsentIds(state);
  const benched = state.players.filter(
    (p) =>
      isSelectable(p) &&
      !matchAbsent.has(p.id) &&
      !starters.some((s) => s.id === p.id) &&
      !state.rotation.includes(p.id) &&
      p.personality === 'protagonista'
  );

  if (benched.length > 0 && rng.chance(0.7)) {
    const b = rng.pick(benched);
    notes.push(`${b.name} se fue del vestuario sin saludar: quería ser titular.`);
  }
  if (result.won && mvp && rng.chance(0.6)) {
    notes.push(`El grupo despidió a ${mvp.name} con aplausos: partidazo.`);
  }
  if (!result.won && result.margin > 15) {
    const vets = starters.filter((p) => p.personality === 'veterano');
    if (vets.length > 0) notes.push(`${rng.pick(vets).name} pidió la palabra: "Esto se levanta entrenando, no señalando culpables".`);
    else notes.push('El vestuario quedó en silencio después de la paliza.');
  }
  if (!result.won) {
    const comps = starters.filter((p) => p.personality === 'competitivo');
    if (comps.length > 0 && rng.chance(0.5)) notes.push(`${rng.pick(comps).name} pateó un bolso: no tolera perder.`);
  }
  if (result.won && rng.chance(0.4)) {
    const socials = state.players.filter((p) => isSelectable(p) && p.personality === 'social');
    if (socials.length > 0) {
      const host = rng.pick(socials);
      notes.push(`${host.name} organizó unas pizzas post partido. Sumó al ambiente.`);
      logPlayerEvent(host, state.seasonNumber, state.week, 'social', 'Organizó las pizzas post victoria para todo el grupo.');
    }
  }
  return notes.slice(0, 2);
}

/** Tabla, partidos de los demás rivales, historial y noticias: común a todo final de partido. */
function concludeMatch(s: GameState, result: MatchResult, rng: Rng): void {
  const rivalId = result.rivalId;
  // En playoffs (semana > fase regular) la tabla queda congelada: los cruces
  // de copa no suman a la fase regular y los resuelve el módulo de playoffs.
  const isPlayoffs = s.week > s.seasonLength;
  if (!isPlayoffs) {
    const clubRow = s.standings.find((r) => r.teamId === 'club')!;
    const rivalRow = s.standings.find((r) => r.teamId === rivalId)!;
    if (result.won) {
      clubRow.wins += 1;
      rivalRow.losses += 1;
    } else {
      clubRow.losses += 1;
      rivalRow.wins += 1;
    }
    clubRow.pointsFor += result.scoreFor;
    clubRow.pointsAgainst += result.scoreAgainst;
    rivalRow.pointsFor += result.scoreAgainst;
    rivalRow.pointsAgainst += result.scoreFor;
  }

  // Resultado del usuario al fixture del mundo.
  const userFx = s.world.fixtures.find((f) => f.week === s.week && f.isUserMatch);
  if (userFx) {
    userFx.status = 'jugado';
    const userHome = userFx.homeTeamId === USER_TEAM_ID;
    userFx.scoreHome = userHome ? result.scoreFor : result.scoreAgainst;
    userFx.scoreAway = userHome ? result.scoreAgainst : result.scoreFor;
  }

  // Los demás partidos de la divisional salen del fixture (tabla y calendario coherentes).
  const otherFixtures = isPlayoffs ? [] : s.world.fixtures.filter((f) => f.week === s.week && !f.isUserMatch);
  const otherResults: OtherResult[] = [];
  for (const fx of otherFixtures) {
    const homeRivalId = s.world.teams.find((t) => t.id === fx.homeTeamId)?.legacyRivalId;
    const awayRivalId = s.world.teams.find((t) => t.id === fx.awayTeamId)?.legacyRivalId;
    const a = s.rivals.find((r) => r.id === homeRivalId);
    const b = s.rivals.find((r) => r.id === awayRivalId);
    if (!a || !b) continue;
    const pa = a.strength ** 2 / (a.strength ** 2 + b.strength ** 2);
    const aWins = rng.chance(pa);
    const rowA = s.standings.find((r) => r.teamId === a.id)!;
    const rowB = s.standings.find((r) => r.teamId === b.id)!;
    const winScore = rng.int(62, 88);
    const loseScore = winScore - rng.int(2, 20);
    if (aWins) {
      rowA.wins += 1;
      rowB.losses += 1;
      rowA.pointsFor += winScore;
      rowA.pointsAgainst += loseScore;
      rowB.pointsFor += loseScore;
      rowB.pointsAgainst += winScore;
    } else {
      rowB.wins += 1;
      rowA.losses += 1;
      rowB.pointsFor += winScore;
      rowB.pointsAgainst += loseScore;
      rowA.pointsFor += loseScore;
      rowA.pointsAgainst += winScore;
    }
    fx.status = 'jugado';
    fx.scoreHome = aWins ? winScore : loseScore;
    fx.scoreAway = aWins ? loseScore : winScore;
    otherResults.push({
      winnerName: aWins ? a.name : b.name,
      loserName: aWins ? b.name : a.name,
      winnerLegacyId: aWins ? a.id : b.id,
      winScore,
      loseScore,
      winnerOdds: aWins ? pa : 1 - pa,
    });
  }

  s.lastMatch = result;
  s.history.push(result);
  s.news.unshift({
    week: s.week,
    text: result.forfeit
      ? `Perdimos por forfeit contra ${result.rivalName}.`
      : `${result.won ? 'Victoria' : 'Derrota'} ${result.scoreFor}-${result.scoreAgainst} vs ${result.rivalName}.`,
    tone: result.won ? 'good' : 'bad',
  });
  // La liga habla: revanchas cumplidas y lo que pasó en las otras canchas.
  settleRivalryAfterMatch(s);
  leagueNewsForWeek(s, otherResults, rng);
  s.live = null;
  s.phase = 'matchResult';
}

/** No hay quinteto completo: se pierde por forfeit. */
function simulateForfeit(s: GameState, rival: Rival, rng: Rng): GameState {
  const [low, high] = BALANCE.match.forfeitScore;
  const result: MatchResult = {
    week: s.week,
    rivalId: rival.id,
    rivalName: rival.name,
    scoreFor: low,
    scoreAgainst: high,
    quarters: [],
    highlights: [],
    won: false,
    forfeit: true,
    mvpId: null,
    mvpName: null,
    summary: `No llegamos a juntar cinco jugadores disponibles y perdimos los puntos contra ${rival.name}.`,
    reasons: ['El club no pudo presentar un quinteto completo.'],
    lockerRoom: ['La vergüenza del forfeit golpeó al grupo entero.'],
    effects: ['Motivación general -8', 'Prestigio deportivo -5', 'Prestigio social -3'],
    box: [],
  };
  s.players = s.players.map((p) => (p.leftClub ? p : { ...p, motivation: clamp(p.motivation - 8) }));
  s.club.sportPrestige = clamp(s.club.sportPrestige - 5);
  s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
  logClubEvent(s, 'ausencia', `Papelón: perdimos por forfeit contra ${rival.name} por no juntar cinco.`);
  concludeMatch(s, result, rng);
  return s;
}

/**
 * Arranca el partido de la semana: sortea el rendimiento del día de cada
 * jugador y deja el estado en fase 'match' para jugarlo cuarto a cuarto.
 * Si no hay quinteto completo, resuelve el forfeit directamente.
 */
export function startLiveMatch(state: GameState, rng: Rng): GameState {
  const s: GameState = structuredClone(state);
  const rivalId = s.schedule[s.week - 1];
  const rival = s.rivals.find((r) => r.id === rivalId)!;
  const absent = matchAbsentIds(s);
  const noStart = noStartIds(s);
  // El forfeit es no juntar 5 en la planilla. Los que llegan al segundo tiempo
  // cuentan para la planilla, pero no pueden arrancar: si por ellos el quinteto
  // inicial queda corto, se arranca con menos y entran en el 3er cuarto.
  const present = s.players.filter((p) => isSelectable(p) && !absent.has(p.id));
  if (present.length < 5) return simulateForfeit(s, rival, rng);
  const starters = s.players.filter((p) => s.starters.includes(p.id) && isSelectable(p) && !noStart.has(p.id));
  if (starters.length === 0) return simulateForfeit(s, rival, rng);

  const M = BALANCE.liveMatch;
  const evalTeam = evaluateTeam(s, s.starters);
  const rotation = rotationPlayers(s);
  const squad = [...starters, ...rotation];

  const perfs: Record<string, number> = {};
  const playerFresh: Record<string, number> = {};
  const minutes: Record<string, number> = {};
  const stats: Record<string, { pts: number; reb: number; ast: number }> = {};
  for (const p of squad) {
    perfs[p.id] = playerEffective(p) * rng.range(0.78, 1.22);
    // El jugador-DT juega pensando en los cambios: el doble rol se paga.
    if (s.coach?.type === 'jugador' && s.coach.playerId === p.id) {
      perfs[p.id] *= 0.94;
    }
    playerFresh[p.id] = clamp(M.freshStartBase + M.freshStartPhysical * p.physical);
    // Llega para el segundo tiempo: entra sin calentar y con menos nafta.
    if (s.callUp.some((c) => c.playerId === p.id && c.lateArrival)) {
      playerFresh[p.id] = Math.round(playerFresh[p.id] * 0.88);
    }
    minutes[p.id] = 0;
    stats[p.id] = { pts: 0, reb: 0, ast: 0 };
  }
  const star = [...starters].sort((a, b) => playerEffective(b) - playerEffective(a))[0];

  // La convocatoria del rival se sortea recién el día del partido.
  const rivalSquad = rollRivalMatchday(s, rivalId, rng);

  // La previa: el árbitro anunciado y la historia con este rival, si la hay.
  const ref = refereeOfWeek(s);
  const prematchNotes = [...rivalSquad.notes, `Dirige ${ref.name}: ${ref.blurb}.`];
  const rivalry = rivalryWith(s, rivalId);
  if (rivalry) prematchNotes.push(`🔥 ${rivalry.text}`);

  // Los que avisaron que llegan al segundo tiempo: citados, pero sin pisar la
  // cancha hasta el 3er cuarto. Si el arranque queda corto por ellos, se avisa.
  const lateIds = squad
    .filter((p) => s.callUp.some((c) => c.playerId === p.id && c.lateArrival && c.status === 'confirmado'))
    .map((p) => p.id);
  if (starters.length < 5) {
    const lateNames = s.players
      .filter((p) => lateIds.includes(p.id))
      .map((p) => p.name)
      .join(' y ');
    prematchNotes.push(
      `Arrancamos con ${starters.length}: ${lateNames || 'el resto'} llega${lateIds.length > 1 ? 'n' : ''} para el segundo tiempo.`
    );
  }

  s.live = {
    rivalId,
    rivalName: rival.name,
    quarters: [],
    finished: false,
    defense: 'zona',
    attack: 'equipo',
    refName: ref.name,
    refStyle: ref.style,
    squad: squad.map((p) => p.id),
    onCourt: starters.map((p) => p.id),
    playerFresh,
    minutes,
    stats,
    pendingSubNotes: prematchNotes,
    rivalSquad: { presentCount: rivalSquad.presentCount, mod: rivalSquad.mod, notes: rivalSquad.notes },
    refTension: 0,
    rageBoost: false,
    pendingIncident: null,
    lateIds,
    // Con DT contratado, los cambios arrancan en sus manos y con su directiva.
    autoRotation: !!s.coach,
    directive: s.coach?.directive ?? 'ganar',
    rivalFreshness: clamp(M.rivalFreshStart + rng.int(-4, 4)),
    starId: star.id,
    starName: star.name,
    perfs,
    hombreQuarters: 0,
    estrellaQuarters: 0,
    luckTotal: 0,
    rivalPush: false,
    eval: evalTeam,
  };
  s.phase = 'match';
  return s;
}

/**
 * Cambio entre cuartos: sale un jugador de la cancha y entra uno del banco.
 * Devuelve el mismo estado si el cambio no es válido. Sin azar: puro swap.
 */
export function substitute(state: GameState, outId: string, inId: string): GameState {
  const live = state.live;
  if (!live || live.finished) return state;
  if (!live.onCourt.includes(outId) || live.onCourt.includes(inId) || !live.squad.includes(inId)) return state;

  const outP = state.players.find((p) => p.id === outId);
  const inP = state.players.find((p) => p.id === inId);
  if (!outP || !inP || !isSelectable(inP)) return state;
  // El que llega al segundo tiempo no puede entrar antes del 3er cuarto.
  if (!canEnterCourt(live, inId)) return state;

  const onCourt = live.onCourt.map((id) => (id === outId ? inId : id));
  const courtPlayers = state.players.filter((p) => onCourt.includes(p.id));
  const star = [...courtPlayers].sort((a, b) => playerEffective(b) - playerEffective(a))[0];

  return {
    ...state,
    live: {
      ...live,
      onCourt,
      starId: star.id,
      starName: star.name,
      pendingSubNotes: [...live.pendingSubNotes, `Cambio: entra ${inP.name} por ${outP.name}.`],
    },
  };
}

/** Piernas promedio de los que están en cancha. */
export function courtFreshness(live: { onCourt: string[]; playerFresh: Record<string, number> }): number {
  const vals = live.onCourt.map((id) => live.playerFresh[id] ?? 70);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export const PRESET_LABELS: Record<LineupPreset, string> = {
  titulares: 'Titulares',
  segunda: '2da unidad',
  frescos: 'Piernas frescas',
  cerradores: 'Cerradores',
};

/** Los 5 del preset, elegidos entre los citados del partido. */
function presetFive(state: GameState, live: LiveMatchState, preset: LineupPreset): string[] {
  const squad = live.squad
    .map((id) => state.players.find((p) => p.id === id))
    .filter((p): p is Player => !!p && isSelectable(p) && canEnterCourt(live, p.id));
  const freshOf = (id: string) => live.playerFresh[id] ?? 70;
  const originalStarters = new Set(state.starters);

  let ordered: Player[];
  switch (preset) {
    case 'titulares':
      ordered = [...squad.filter((p) => originalStarters.has(p.id)), ...squad.filter((p) => !originalStarters.has(p.id))];
      break;
    case 'segunda':
      // El banco primero; se completa con los titulares menos usados.
      ordered = [
        ...squad.filter((p) => !originalStarters.has(p.id)).sort((a, b) => playerEffective(b) - playerEffective(a)),
        ...squad.filter((p) => originalStarters.has(p.id)).sort((a, b) => (live.minutes[a.id] ?? 0) - (live.minutes[b.id] ?? 0)),
      ];
      break;
    case 'frescos':
      ordered = [...squad].sort((a, b) => freshOf(b.id) - freshOf(a.id));
      break;
    case 'cerradores':
      // Los mejores acá y ahora: nivel del día pesado por las piernas que quedan.
      ordered = [...squad].sort(
        (a, b) =>
          (live.perfs[b.id] ?? playerEffective(b)) * (0.7 + 0.3 * (freshOf(b.id) / 100)) -
          (live.perfs[a.id] ?? playerEffective(a)) * (0.7 + 0.3 * (freshOf(a.id) / 100))
      );
      break;
  }
  return ordered.slice(0, 5).map((p) => p.id);
}

/** Aplica un quinteto predefinido (cambios entre cuartos, con nota al relato). */
export function applyLineupPreset(state: GameState, preset: LineupPreset): GameState {
  const s: GameState = structuredClone(state);
  const live = s.live;
  if (!live || live.finished) return s;
  const five = presetFive(s, live, preset);
  if (five.length < 5) return s;
  const changed = five.some((id) => !live.onCourt.includes(id));
  live.onCourt = five;
  const courtPlayers = s.players.filter((p) => live.onCourt.includes(p.id));
  const star = [...courtPlayers].sort((a, b) => playerEffective(b) - playerEffective(a))[0];
  live.starId = star.id;
  live.starName = star.name;
  if (changed) live.pendingSubNotes.push(`↺ A la cancha la unidad "${PRESET_LABELS[preset]}".`);
  return s;
}

/**
 * Piloto automático de cambios: corre antes de cada cuarto si está activado.
 * "Ganar": descansa a los fundidos y mete a los mejores para cerrar.
 * "Repartir": además se asegura de que el banco sume minutos.
 */
function autoRotate(s: GameState, live: LiveMatchState): void {
  if (!live.autoRotation) return;
  const qIndex = live.quarters.length;
  if (qIndex === 0) return; // el arranque es tuyo

  const freshOf = (id: string) => live.playerFresh[id] ?? 70;
  const byId = (id: string) => s.players.find((p) => p.id === id)!;
  const dt = s.coach ? s.coach.name : 'el DT';
  const notes: string[] = [];

  // Un DT con poca lectura de juego aguanta de más a los fundidos.
  const tiredThreshold = s.coach ? 30 + s.coach.tactics * 0.28 : 45;

  if (live.directive === 'repartir' && qIndex <= 2) {
    // Que todos toquen la pelota: entran los que todavía no jugaron.
    const cold = live.squad
      .filter((id) => !live.onCourt.includes(id) && (live.minutes[id] ?? 0) === 0 && canEnterCourt(live, id))
      .slice(0, 2);
    for (const inId of cold) {
      const outId = [...live.onCourt].sort((a, b) => (live.minutes[b] ?? 0) - (live.minutes[a] ?? 0))[0];
      if (!outId) break;
      live.onCourt = live.onCourt.map((id) => (id === outId ? inId : id));
      notes.push(`${dt} movió el banco: entra ${byId(inId).name} por ${byId(outId).name}.`);
    }
  }

  if (qIndex === 3 && live.directive !== 'repartir') {
    // Último cuarto: cierran los mejores disponibles.
    const closers = presetFive(s, live, 'cerradores');
    if (closers.some((id) => !live.onCourt.includes(id))) {
      live.onCourt = closers;
      notes.push(`↺ ${dt} mandó a los cerradores para el último cuarto.`);
    }
  } else {
    // Regla general: el fundido descansa si hay recambio con piernas.
    for (const outId of [...live.onCourt]) {
      if (freshOf(outId) >= tiredThreshold) continue;
      const candidate = live.squad
        .filter((id) => !live.onCourt.includes(id) && isSelectable(byId(id)) && canEnterCourt(live, id))
        .sort((a, b) => freshOf(b) - freshOf(a))[0];
      if (candidate && freshOf(candidate) > freshOf(outId) + 12) {
        live.onCourt = live.onCourt.map((id) => (id === outId ? candidate : id));
        notes.push(`Cambio de ${dt}: entra ${byId(candidate).name} por ${byId(outId).name}, que pedía el cambio.`);
      }
    }
  }

  if (notes.length > 0) {
    const courtPlayers = s.players.filter((p) => live.onCourt.includes(p.id));
    const star = [...courtPlayers].sort((a, b) => playerEffective(b) - playerEffective(a))[0];
    live.starId = star.id;
    live.starName = star.name;
    live.pendingSubNotes.push(...notes.slice(0, 2));
  }
}

/** Reparte un total entero entre ids según pesos (el resto se sortea). */
function distribute(total: number, weights: { id: string; w: number }[], rng: Rng): Record<string, number> {
  const sum = weights.reduce((t, x) => t + Math.max(0.01, x.w), 0);
  const out: Record<string, number> = {};
  let assigned = 0;
  for (const x of weights) {
    const v = Math.floor((total * Math.max(0.01, x.w)) / sum);
    out[x.id] = v;
    assigned += v;
  }
  const ids = weights.map((x) => x.id);
  for (let rest = total - assigned; rest > 0; rest--) {
    out[rng.pick(ids)] += 1;
  }
  return out;
}

const REB_POS_WEIGHT: Record<Position, number> = { Base: 0.9, Escolta: 1.1, Alero: 1.7, 'Ala-Pívot': 2.4, Pívot: 3 };
const AST_POS_WEIGHT: Record<Position, number> = { Base: 3, Escolta: 1.8, Alero: 1.2, 'Ala-Pívot': 0.8, Pívot: 0.6 };

/** Juega el próximo cuarto con las tácticas y los 5 en cancha de state.live. */
export function playQuarter(state: GameState, rng: Rng): GameState {
  const s: GameState = structuredClone(state);
  const live = s.live;
  if (!live || live.finished) return s;

  const M = BALANCE.liveMatch;
  const rival = s.rivals.find((r) => r.id === live.rivalId)!;
  const qIndex = live.quarters.length; // 0..3
  const notes: string[] = [];

  // El piloto automático hace sus cambios antes de que arranque el cuarto.
  autoRotate(s, live);

  // En el entretiempo caen los que venían del trabajo: ya pueden entrar.
  if (qIndex === 2 && (live.lateIds ?? []).length > 0) {
    const lateNames = (live.lateIds ?? [])
      .map((id) => s.players.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(' y ');
    if (lateNames) live.pendingSubNotes.unshift(`🕘 Llegó ${lateNames} para el segundo tiempo: ya está para entrar.`);
  }

  // Si en cancha hay menos de 5 (arranque corto o lesión sin recambio), se
  // completa con el banco disponible apenas se pueda.
  while (live.onCourt.length < 5) {
    const cand = live.squad
      .filter((id) => {
        const p = s.players.find((x) => x.id === id);
        return !!p && isSelectable(p) && !live.onCourt.includes(id) && canEnterCourt(live, id);
      })
      .sort((a, b) => (live.playerFresh[b] ?? 70) - (live.playerFresh[a] ?? 70))[0];
    if (!cand) break;
    live.onCourt.push(cand);
    const name = s.players.find((x) => x.id === cand)?.name;
    if (name) live.pendingSubNotes.push(`Entra ${name}: el equipo completa el quinteto.`);
  }

  // Cambios hechos en el descanso: abren el relato del cuarto.
  notes.push(...live.pendingSubNotes);
  live.pendingSubNotes = [];

  const onCourt = live.onCourt.map((id) => s.players.find((p) => p.id === id)!);
  const teamFresh = courtFreshness(live);

  const sumFor = live.quarters.reduce((t, q) => t + q.for, 0);
  const sumAgainst = live.quarters.reduce((t, q) => t + q.against, 0);

  // Si el rival entra al último cuarto perdiendo por mucho, presiona a fondo.
  if (qIndex === 3 && sumFor - sumAgainst >= M.pushDeficit) {
    live.rivalPush = true;
    for (const id of live.onCourt) live.playerFresh[id] = clamp((live.playerFresh[id] ?? 70) - M.pushFreshCost);
    notes.push(`${rival.name} adelantó líneas y presiona a toda cancha: hay que aguantar el cierre.`);
  }

  // Remontadas: el que va abajo sale a morder y el que va cómodo afloja.
  // Empuje en puntos, proporcional al déficit: nada está sentenciado.
  let momentumPts = 0;
  if (qIndex > 0) {
    const diff = sumFor - sumAgainst;
    if (diff <= -M.comebackDeficit) {
      momentumPts = Math.min(M.comebackMaxPoints, -diff * M.comebackFactor);
      const n = freshLiveNote(
        live,
        [
          'Abajo en el marcador, el equipo salió con otra cara: a morder cada pelota.',
          'La desventaja despertó al equipo: otra intensidad, otra defensa.',
          'Nadie quiere irse con esta derrota: el equipo aprieta los dientes y va.',
        ],
        rng
      );
      if (n) notes.push(n);
    } else if (diff >= M.comebackDeficit) {
      momentumPts = -Math.min(M.comebackMaxPoints, diff * M.comebackFactor);
      const n = freshLiveNote(
        live,
        [
          `${rival.name} no se entrega: salió a descontar con todo.`,
          `${rival.name} achica el partido a pura garra: nada está sellado.`,
          `Del otro banco piden una más: ${rival.name} sigue vivo.`,
        ],
        rng
      );
      if (n) notes.push(n);
    }
  }

  // --- Ataque: la fuerza sale de los 5 en cancha, cada uno con sus piernas ---
  const freshOf = (id: string) => live.playerFresh[id] ?? 70;
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const effAvg = avg(
    onCourt.map((p) => playerEffective(p) * (M.freshFactorMin + M.freshFactorSpan * (freshOf(p.id) / 100)))
  );
  const covered = new Set(onCourt.map((p) => p.position));
  const missing = ALL_POSITIONS.filter((pos) => !covered.has(pos)).length;
  const coverageFactor = 1 - missing * BALANCE.match.positionMissingPenalty;
  const chemFactor = 0.94 + 0.12 * live.eval.chemistry01;
  const orgFactor = 0.97 + 0.06 * (s.club.organization / 100);

  const star = [...onCourt].sort((a, b) => playerEffective(b) - playerEffective(a))[0];
  const starEff = Math.max(1, playerEffective(star));
  const hot = (live.perfs[star.id] ?? starEff) / starEff; // 0.78..1.22
  let atkMult: number;
  // Las notas de color no se repiten dentro del partido (freshLiveNote): si el
  // pool se agota, el relato calla y hablan el marcador y las piernas.
  let flavor: string | null = null;
  if (live.attack === 'estrella') {
    atkMult = M.estrellaBase + M.estrellaHotSpan * (hot - 0.78) - M.estrellaDecay * live.estrellaQuarters;
    if (hot > 1.08)
      flavor = freshLiveNote(
        live,
        [`${star.name} está encendido: la pide y la mete.`, `Todo pasa por ${star.name}, y hoy tiene la mano caliente.`],
        rng
      );
    else if (hot < 0.92)
      flavor = freshLiveNote(
        live,
        [
          `${star.name} no tiene la mano y el plan de dársela siempre a él hace agua.`,
          `Insistimos con ${star.name}, pero hoy no le cae una.`,
        ],
        rng
      );
    else if (live.estrellaQuarters >= 2)
      flavor = freshLiveNote(live, [`El rival ya le tomó la mano a ${star.name}: lo esperan entre dos.`], rng);
  } else if (live.attack === 'correr') {
    atkMult = M.correrBase + M.correrFreshSpan * (teamFresh / 100);
    flavor =
      teamFresh >= 60
        ? freshLiveNote(
            live,
            ['Corremos cada rebote: puntos fáciles de contraataque.', 'El partido se juega a nuestro ritmo: correr y correr.'],
            rng
          )
        : freshLiveNote(
            live,
            ['Queremos correr pero no queda nafta: las contras las hacen ellos.'],
            rng
          );
  } else {
    atkMult = M.equipoBase + M.equipoChemBonus * live.eval.chemistry01;
    if (live.eval.chemistry01 > 0.7 && rng.chance(0.5))
      flavor = freshLiveNote(
        live,
        [
          'La pelota se mueve sola: el equipo juega de memoria y de buen humor.',
          'Tres pases de más en cada ataque, y siempre queda uno solo abajo del aro.',
          'Se nota el buen clima: el que la mueve festeja igual que el que la mete.',
        ],
        rng
      );
  }
  if (flavor) notes.push(flavor);
  if (missing > 0) {
    const pos = ALL_POSITIONS.find((p) => !covered.has(p));
    const n = freshLiveNote(
      live,
      [`Con este quinteto falta un ${pos} natural y se nota.`, `Seguimos sin ${pos} de oficio en cancha, y el rival lo huele.`],
      rng
    );
    if (n) notes.push(n);
  }

  // Bronca canalizada y tensión con los jueces: pegan en la concentración.
  if (live.rageBoost) {
    atkMult *= 1.05;
    live.rageBoost = false;
  }
  atkMult *= 1 - 0.012 * (live.refTension ?? 0);

  // Si el DT maneja los cambios, su lectura del juego suma (o resta).
  if (live.autoRotation && s.coach) {
    atkMult *= 1 + (s.coach.tactics - 55) * 0.0012;
  }

  const atk = effAvg * chemFactor * orgFactor * coverageFactor * atkMult;

  // --- Defensa ---
  const pushDef = (pool: string[]) => {
    const n = freshLiveNote(live, pool, rng);
    if (n) notes.push(n);
  };
  let defMult = 1;
  if (live.defense === 'presion') {
    if (teamFresh < M.presionTiredThreshold) {
      defMult = M.presionTiredMult;
      pushDef([
        'Presionamos sin piernas y nos pasan con dos pases: regalo tras regalo.',
        'La presión sin nafta es un colador: cada salida rival termina en bandeja.',
      ]);
    } else if (
      // La presión es una apuesta: un rival con buen manejo la puede romper.
      rng.chance(
        M.presionBreakBase +
          Math.max(0, rival.strength - 55) * M.presionBreakStrength +
          (rival.style === 'corredores' ? 0.12 : 0)
      )
    ) {
      defMult = M.presionBreakMult;
      pushDef([
        'Nos leyeron la presión: dos pases largos y bandeja. La apuesta salió cara.',
        'Rompieron la presión de memoria: pase por arriba y dos puntos fáciles.',
      ]);
    } else {
      defMult = M.presionRivalMult;
      pushDef([
        'La presión a toda cancha ahoga la salida del rival: pelotas recuperadas y bandejas.',
        'La presión les hace contar los segundos: sacan la pelota a los tumbos.',
      ]);
    }
    if (rival.style === 'tiradores') defMult *= M.tiradoresVsHombre;
  } else if (live.defense === 'hombre') {
    if (teamFresh >= M.hombreTiredThreshold) {
      defMult = M.hombreRivalMult;
      pushDef([
        'La marca individual asfixia la salida del rival.',
        'Cada uno con el suyo y sin regalar un centímetro: el rival no encuentra tiros cómodos.',
      ]);
    } else {
      defMult = M.hombreTiredMult;
      pushDef([
        'Queremos presionar pero las piernas no llegan: quedan pasillos por todos lados.',
      ]);
    }
    if (rival.style === 'tiradores') defMult *= M.tiradoresVsHombre;
    if (rival.style === 'internos')
      pushDef(['Chocar con sus grandotes cuesta doble: cada marca es una batalla.']);
  } else {
    if (rival.style === 'tiradores') {
      defMult *= M.tiradoresVsZona;
      pushDef([
        'La zona les deja tiros abiertos y sus tiradores no perdonan.',
        'Mueven la pelota hasta encontrar al tirador libre contra la zona: y la meten.',
      ]);
    }
    if (rival.style === 'internos') defMult *= M.internosVsZona;
  }
  if (rival.style === 'corredores') {
    defMult *= 1 + M.corredoresTiredBoost * (1 - teamFresh / 100);
    if (teamFresh < 45)
      pushDef(['Nos corren la cancha entera y llegamos siempre tarde a las marcas.']);
  }
  // El rival aprende: cuartos y cuartos de defensa agresiva le enseñan a salir.
  if ((live.defense === 'hombre' || live.defense === 'presion') && live.hombreQuarters >= 2) {
    defMult *= 1 + M.aggressiveAdapt * (live.hombreQuarters - 1);
    pushDef(['El rival ya sabe salir contra nuestra marca: la rompen de memoria.']);
  }
  if (teamFresh < 30) pushDef(['El equipo juega de memoria: no quedan piernas.']);

  const rivalFreshFactor = M.freshFactorMin + M.freshFactorSpan * (live.rivalFreshness / 100);
  const rivalEff =
    rival.strength *
    (live.rivalSquad?.mod ?? 1) *
    rng.range(1 - M.rivalDayVariance, 1 + M.rivalDayVariance) *
    rivalFreshFactor *
    (live.rivalPush ? M.pushRivalBoost : 1);

  // --- Marcador del cuarto ---
  const luck = rng.range(-M.luckPerQuarter, M.luckPerQuarter);
  live.luckTotal += luck;
  // Correr la cancha sube el ritmo: más posesiones (y puntos) para los dos.
  const pace = live.attack === 'correr' ? M.correrPace : 0;
  const qBase = BALANCE.match.baseScore / 4 + pace;
  const diffQ = ((atk - rivalEff) * BALANCE.match.strengthToPoints) / 4 + luck + momentumPts;

  // Rachas: a veces a un equipo se le prende el aro y mete un parcial que
  // cambia el partido. Le puede tocar a cualquiera, incluso a los dos.
  let ourRacha = 0;
  let rivalRacha = 0;
  if (rng.chance(M.rachaChance)) {
    ourRacha = rng.int(M.rachaMin, M.rachaMax);
    notes.push(
      freshLiveNote(
        live,
        [
          'Entramos en racha: cae un triple atrás de otro y el banco está de pie.',
          'Se prendió el aro nuestro: minutos de no fallar ni de espaldas.',
          'Parcial nuestro a pura corrida: el gimnasio se vino abajo.',
        ],
        rng
      ) ?? 'Otra racha nuestra: el aro está enorme.'
    );
  }
  if (rng.chance(M.rachaChance)) {
    rivalRacha = rng.int(M.rachaMin, M.rachaMax);
    notes.push(
      freshLiveNote(
        live,
        [
          `A ${rival.name} se le prendió el aro: meten de todos lados.`,
          `Racha de ${rival.name}: tres ataques, tres canastas, y minuto pedido a tiempo.`,
        ],
        rng
      ) ?? `${rival.name} vuelve a embocar todo.`
    );
  }

  const ourQ = Math.max(4, Math.round(qBase + diffQ / 2 + rng.range(-1.5, 1.5)) + ourRacha);
  const rivalQ = Math.max(4, Math.round((qBase - diffQ / 2 + rng.range(-1.5, 1.5)) * defMult) + rivalRacha);

  const qDiff = ourQ - rivalQ;
  if (qDiff >= 6) notes.push(`Parcial demoledor: ${ourQ}-${rivalQ} en el ${Q_NAMES[qIndex]}.`);
  else if (qDiff <= -6) notes.push(`Nos pasaron por arriba: ${ourQ}-${rivalQ} en el ${Q_NAMES[qIndex]}.`);

  // --- Planilla del cuarto: puntos, rebotes y asistencias ---
  const perfOf = (id: string) => live.perfs[id] ?? 50;
  const qPts = distribute(
    ourQ,
    onCourt.map((p) => ({
      id: p.id,
      w: perfOf(p.id) * (live.attack === 'estrella' && p.id === star.id ? M.estrellaPtsBias : 1),
    })),
    rng
  );
  const qReb = distribute(
    rng.int(M.boxRebMin, M.boxRebMax),
    onCourt.map((p) => ({ id: p.id, w: REB_POS_WEIGHT[p.position] * (0.6 + perfOf(p.id) / 150) })),
    rng
  );
  const qAst = distribute(
    rng.int(M.boxAstMin, M.boxAstMax) + (live.attack === 'equipo' ? M.equipoAstExtra : 0),
    onCourt.map((p) => ({ id: p.id, w: AST_POS_WEIGHT[p.position] * (0.6 + perfOf(p.id) / 150) })),
    rng
  );
  for (const p of onCourt) {
    const st = live.stats[p.id] ?? (live.stats[p.id] = { pts: 0, reb: 0, ast: 0 });
    st.pts += qPts[p.id] ?? 0;
    st.reb += qReb[p.id] ?? 0;
    st.ast += qAst[p.id] ?? 0;
  }
  const qTop = [...onCourt].sort((a, b) => (qPts[b.id] ?? 0) - (qPts[a.id] ?? 0))[0];
  if ((qPts[qTop.id] ?? 0) >= 7) notes.push(`${qTop.name} metió ${qPts[qTop.id]} puntos en el ${Q_NAMES[qIndex]}.`);

  // Incidencias deportivas y arbitrales del cuarto.
  notes.push(...quarterFlavor({ qIndex, ourQ, rivalQ, onCourt, qPts, qReb, starId: star.id, live }, rng));
  const refNote = rollRefIncident(live, onCourt, qIndex, rng);
  if (refNote) notes.push(refNote);
  if (notes.length === 0) notes.push(fallbackNote(rng));

  // --- Desgaste y minutos ---
  if (live.defense === 'hombre' || live.defense === 'presion') live.hombreQuarters += 1;
  if (live.attack === 'estrella') live.estrellaQuarters += 1;

  for (const p of onCourt) {
    let drain = M.playerDrainBase;
    if (live.defense === 'hombre') drain += M.playerDrainHombre + (rival.style === 'internos' ? M.internosHombreDrain : 0);
    if (live.defense === 'presion') drain += M.presionDrainExtra + (rival.style === 'internos' ? M.internosHombreDrain : 0);
    if (live.attack === 'correr') drain += M.correrDrainExtra;
    drain += Math.max(0, 60 - p.physical) * M.playerDrainLowPhysical;
    live.playerFresh[p.id] = clamp(freshOf(p.id) - Math.round(drain));
    live.minutes[p.id] = (live.minutes[p.id] ?? 0) + M.quarterMinutes;
  }
  for (const id of live.squad) {
    if (!live.onCourt.includes(id)) live.playerFresh[id] = clamp((live.playerFresh[id] ?? 70) + M.benchRecovery);
  }

  // Lesiones en cancha: correr fundido o defender a los golpes pasa factura,
  // y a los frágiles les pasa más seguido. Sale de la cancha y queda de baja.
  const aggressiveDef = live.defense === 'hombre' || live.defense === 'presion';
  const injuryDiffMult = BALANCE.absenceDifficulty[s.absenceDifficulty ?? 'medio'].injury;
  for (const p of onCourt) {
    const frag = fragilityOf(p);
    let injChance = M.matchInjuryBase * (0.5 + frag / 60) * injuryDiffMult;
    if (freshOf(p.id) < 35) injChance *= M.matchInjuryTiredMult;
    if (aggressiveDef) injChance *= M.matchInjuryAggressiveMult;
    // Jugarlo fundido fue tu decisión al pasar lista: el cuerpo la cobra.
    if (s.callUp.some((c) => c.playerId === p.id && c.playingExhausted)) injChance *= 1.6;
    if (!rng.chance(injChance)) continue;

    const weeks = rollInjuryWeeks(frag, rng);
    const how = rng.pick(MATCH_INJURY_NOTES);
    const real = s.players.find((x) => x.id === p.id)!;
    real.status = 'lesionado';
    real.injuryWeeks = weeks;
    logPlayerEvent(real, s.seasonNumber, s.week, 'lesion', `Se lesionó en pleno partido: ${how}`);
    live.injuries = [...(live.injuries ?? []), { playerId: p.id, name: p.name, weeks }];

    // Sale y entra el recambio con más piernas; sin banco, quedan cuatro.
    const sub = live.squad
      .filter((id) => !live.onCourt.includes(id) && canEnterCourt(live, id))
      .map((id) => s.players.find((x) => x.id === id)!)
      .filter((x) => isSelectable(x))
      .sort((a, b) => (live.playerFresh[b.id] ?? 70) - (live.playerFresh[a.id] ?? 70))[0];
    live.onCourt = live.onCourt.filter((id) => id !== p.id);
    if (sub) live.onCourt.push(sub.id);
    notes.unshift(
      `🚑 ${p.name} ${how} ${sub ? `Entra ${sub.name} en su lugar.` : 'No queda recambio: seguimos con cuatro.'}`
    );
    if (live.starId === p.id && live.onCourt.length > 0) {
      const court = s.players.filter((x) => live.onCourt.includes(x.id));
      const newStar = [...court].sort((a, b) => playerEffective(b) - playerEffective(a))[0];
      live.starId = newStar.id;
      live.starName = newStar.name;
    }
    break; // una lesión por cuarto alcanza para el drama
  }

  // Aviso de fundidos, para invitar al cambio.
  const gassed = onCourt.filter((p) => (live.playerFresh[p.id] ?? 70) < 30);
  if (gassed.length > 0 && qIndex < 3) notes.push(`${gassed[0].name} está fundido y mira al banco: pide el cambio.`);

  let rivalDrain = rival.style === 'corredores' ? M.rivalDrain - 2 : M.rivalDrain;
  if (live.defense === 'hombre') rivalDrain += M.hombreRivalDrain;
  if (live.defense === 'presion') rivalDrain += M.presionRivalDrain;
  if (live.attack === 'correr') rivalDrain += 2;
  // Si vinieron cortos de banco, se funden más rápido.
  if ((live.rivalSquad?.presentCount ?? 10) <= 6) rivalDrain += 2;
  live.rivalFreshness = clamp(live.rivalFreshness - rivalDrain);

  if (qIndex === 1) {
    for (const id of live.squad) live.playerFresh[id] = clamp((live.playerFresh[id] ?? 70) + M.halftimeRecovery);
    live.rivalFreshness = clamp(live.rivalFreshness + M.halftimeRecovery);
  }

  live.quarters.push({ for: ourQ, against: rivalQ, defense: live.defense, attack: live.attack, notes: notes.slice(0, 5) });

  // --- Final y suplementario ---
  if (qIndex === 3) {
    const totalFor = sumFor + ourQ;
    const totalAgainst = sumAgainst + rivalQ;
    if (totalFor === totalAgainst) {
      let ourOT = rng.int(5, 10);
      let rivalOT = rng.int(5, 10);
      if (ourOT === rivalOT) {
        if (atk >= rivalEff) ourOT += rng.int(1, 3);
        else rivalOT += rng.int(1, 3);
      }
      for (const id of live.onCourt) live.minutes[id] = (live.minutes[id] ?? 0) + M.otMinutes;
      const otPts = distribute(
        ourOT,
        live.onCourt.map((id) => ({ id, w: perfOf(id) })),
        rng
      );
      for (const id of live.onCourt) {
        const st = live.stats[id] ?? (live.stats[id] = { pts: 0, reb: 0, ast: 0 });
        st.pts += otPts[id] ?? 0;
      }
      live.quarters.push({
        for: ourOT,
        against: rivalOT,
        defense: live.defense,
        attack: live.attack,
        overtime: true,
        notes: [
          ourOT > rivalOT
            ? 'Suplementario de infarto: lo ganamos con carácter.'
            : 'Suplementario de infarto: se escapó en el final.',
        ],
      });
    }
    live.finished = true;
  }

  return s;
}

/** Cierra el partido jugado: efectos sobre jugadores y club, tabla e informe. */
export function finishLiveMatch(state: GameState, rng: Rng): GameState {
  const s: GameState = structuredClone(state);
  const live = s.live;
  if (!live || !live.finished) return s;

  const M = BALANCE.liveMatch;
  const rival = s.rivals.find((r) => r.id === live.rivalId)!;
  const absent = matchAbsentIds(s);
  const starters = s.players.filter((p) => s.starters.includes(p.id) && isSelectable(p) && !absent.has(p.id));
  const evalTeam = live.eval;

  const scoreFor = live.quarters.reduce((t, q) => t + q.for, 0);
  const scoreAgainst = live.quarters.reduce((t, q) => t + q.against, 0);
  const won = scoreFor > scoreAgainst;
  const margin = Math.abs(scoreFor - scoreAgainst);

  // Desgaste según minutos realmente jugados; la defensa agresiva suma cansancio
  // extra (la presión a toda cancha gasta el doble que la marca hombre).
  const totalMinutes = 40 + (live.quarters.some((q) => q.overtime) ? M.otMinutes : 0);
  const hombreQ = live.quarters.filter((q) => !q.overtime && q.defense === 'hombre').length;
  const presionQ = live.quarters.filter((q) => !q.overtime && q.defense === 'presion').length;
  const extraWear = hombreQ * M.hombreWearPerQuarter + presionQ * M.hombreWearPerQuarter * 2;
  const minutesOf = (id: string) => live.minutes[id] ?? 0;
  const wearFor = (mins: number) =>
    Math.round(mins * BALANCE.rotation.wearPerMinute + (extraWear * mins) / totalMinutes);

  // Rendimiento individual y MVP: pesa el rendimiento del día por los minutos jugados.
  const played = s.players
    .filter((p) => live.squad.includes(p.id) && minutesOf(p.id) > 0)
    .map((p) => ({ p, perf: live.perfs[p.id] ?? playerEffective(p), mins: minutesOf(p.id) }));
  played.sort((a, b) => b.perf - a.perf);
  const mvpCandidates = played
    .map((x) => ({ p: x.p, score: x.perf * Math.sqrt(x.mins / totalMinutes) }))
    .sort((a, b) => b.score - a.score);
  const mvp = mvpCandidates.length > 0 ? mvpCandidates[0].p : starters[0];
  const mvpFromBench = !starters.some((st) => st.id === mvp.id);

  // Nota del partido por jugador: producción según el rol + su día + contexto.
  const ratings: Record<string, PlayerRating> = {};
  for (const x of played) {
    const st = live.stats[x.p.id] ?? { pts: 0, reb: 0, ast: 0 };
    ratings[x.p.id] = computeRating({
      position: x.p.position,
      minutes: x.mins,
      points: st.pts,
      rebounds: st.reb,
      assists: st.ast,
      perf: x.perf,
      effective: playerEffective(x.p),
      won,
      margin,
      mvp: x.p.id === mvp.id,
    });
  }

  const effects: string[] = [];
  const B = BALANCE.matchEffects;
  const upset = won && rival.strength > evalTeam.baseSkill + 5;

  // La épica del resultado: con lo justo, en la hora, o de atrás.
  const shortHanded = live.squad.length <= B.shortHandedSquad;
  const clutch = margin <= B.clutchMargin;
  let runFor = 0;
  let runAgainst = 0;
  let maxDeficit = 0;
  for (const q of live.quarters) {
    runFor += q.for;
    runAgainst += q.against;
    maxDeficit = Math.max(maxDeficit, runAgainst - runFor);
  }
  const comeback = won && maxDeficit >= B.comebackDeficit;

  // Cuánto pega el resultado en el ánimo: la gesta con 7 vale más que la
  // paliza, y la derrota ajustada duele menos que el baile.
  const baseMorale = shortHanded
    ? won
      ? B.shortHandedWinMotivation
      : B.shortHandedLossMotivation
    : won
      ? margin >= B.blowoutMargin
        ? B.blowoutWinMotivation
        : clutch
          ? B.closeWinMotivation
          : B.winMotivation
      : margin >= B.blowoutMargin
        ? B.blowoutLossMotivation
        : clutch
          ? B.closeLossMotivation
          : B.lossMotivation;

  s.players = s.players.map((p) => {
    if (p.leftClub) return p;
    const np = { ...p };
    const mins = live.squad.includes(p.id) ? minutesOf(p.id) : 0;

    if (mins >= 20) {
      // Cargó con el peso del partido.
      np.lastRating = ratings[p.id]?.rating ?? 5;
      np.physical = clamp(np.physical - wearFor(mins) + rng.range(-3, 3));
      np.weeksBenched = 0;
      // Con la nota recalibrada, el 7 es buen partido y el 4 noche floja: la
      // confianza sube con lo bueno pero deja de ser un trinquete (las noches
      // flojas ahora existen y descuentan).
      np.confidence = clamp(np.confidence + (np.lastRating >= 7 ? 4 : np.lastRating <= 4 ? -4 : 0));
    } else if (mins > 0) {
      // Sumó minutos desde el banco.
      np.lastRating = ratings[p.id]?.rating ?? 5;
      np.physical = clamp(np.physical - wearFor(mins) + rng.range(-2, 2));
      np.weeksBenched = 0;
      // La vara del banco es la de su rol: con pocos minutos la nota ancla más
      // abajo, así que un 6 ya es "cumplió y suma" (con la vara del titular,
      // el suplente no crecía nunca y las estrategias que rotan lo pagaban).
      np.confidence = clamp(np.confidence + (np.lastRating >= 6 ? 3 : np.lastRating <= 4 ? -3 : 0));
      if (np.personality === 'protagonista' || np.expectedRole === 'titular') {
        // Jugar poco no les alcanza, pero molesta menos que no jugar.
        np.motivation = clamp(np.motivation + B.rotationMotivationHit);
        if (np.motivation < BALANCE.weekly.lowMotivationThreshold && np.status === 'disponible') {
          np.status = 'molesto';
          np.weeksUpset = 0;
        }
      } else if (np.expectedRole === 'suplente') {
        np.motivation = clamp(np.motivation + B.subMinutesBoost);
      }
    } else if (absent.has(np.id)) {
      // Faltó con excusa: ni desgaste ni resentimiento por banco. Se lo perdió.
      return np;
    } else if (isSelectable(np)) {
      np.physical = clamp(np.physical - BALANCE.match.physicalWearBench);
      np.weeksBenched += 1;
      const wantsMinutes =
        np.personality === 'protagonista' ||
        (np.expectedRole === 'titular' && np.weeksBenched >= 2) ||
        (np.expectedRole === 'rotación' && np.weeksBenched >= 3);
      if (wantsMinutes) {
        const hit =
          np.expectedRole === 'rotación' && np.personality !== 'protagonista'
            ? B.rotationMotivationHit
            : B.benchedMotivationHit;
        np.motivation = clamp(np.motivation + hit);
        if (np.motivation < BALANCE.weekly.lowMotivationThreshold && np.status === 'disponible') {
          np.status = 'molesto';
          np.weeksUpset = 0;
        }
      }
    }

    if (mins > 0 && np.lastRating !== null) {
      const st = live.stats[np.id] ?? { pts: 0, reb: 0, ast: 0 };
      np.matchLog = [
        ...np.matchLog,
        {
          season: s.seasonNumber,
          week: s.week,
          rivalName: rival.name,
          minutes: mins,
          rating: np.lastRating,
          mvp: np.id === mvp.id,
          won,
          points: st.pts,
          rebounds: st.reb,
          assists: st.ast,
        },
      ];
    }

    // Un DT que llega al grupo suaviza las derrotas y contagia en las victorias.
    const coachTouch = s.coach && s.coach.people >= 70 ? 1 : 0;
    const moraleDelta = baseMorale + coachTouch;
    const personalityScale = np.personality === 'competitivo' ? 1.5 : np.personality === 'social' ? 0.6 : 1;
    // Techo blando: la alegría rinde menos cuanto más arriba está el ánimo
    // (ganar seguido ya no clava a todo el plantel en 99). Perder pega entero.
    const softcap =
      moraleDelta > 0
        ? Math.max(B.moraleSoftcapMinFactor, (100 - np.motivation) / B.moraleSoftcapSpan)
        : 1;
    np.motivation = clamp(np.motivation + moraleDelta * personalityScale * Math.min(1, softcap));

    if (np.id === mvp.id) {
      np.confidence = clamp(np.confidence + B.mvpConfidence);
      np.motivation = clamp(np.motivation + 4);
      np.timeline = [
        ...np.timeline,
        {
          season: s.seasonNumber,
          week: s.week,
          kind: 'partido' as const,
          text: `Figura del partido ante ${rival.name} (${won ? 'victoria' : 'derrota'} ${scoreFor}-${scoreAgainst}).`,
        },
      ];
    }
    return np;
  });

  const prestigeDelta =
    (won ? B.winSportPrestige + (upset ? B.upsetWinBonus : 0) : margin > 18 ? B.lossSportPrestige - 1 : B.lossSportPrestige) +
    (shortHanded && won ? 1 : 0);
  s.club.sportPrestige = clamp(s.club.sportPrestige + prestigeDelta);
  if (won) s.club.socialClimate = clamp(s.club.socialClimate + 3);
  else if (margin > 15) s.club.socialClimate = clamp(s.club.socialClimate - 4);

  // Confianza y memoria de la épica (los np ya están asignados a s.players).
  const byIdNow = (id: string) => s.players.find((p) => p.id === id);
  if (clutch && won) {
    for (const id of live.onCourt) {
      const p = byIdNow(id);
      if (p) p.confidence = clamp(p.confidence + B.clutchConfidence);
    }
    if (rng.chance(0.4)) s.memorableMoments.push(`Semana ${s.week}: la ganamos en la hora contra ${rival.name} (${scoreFor}-${scoreAgainst}).`);
  }
  if (clutch && !won) {
    for (const x of played) {
      const p = byIdNow(x.p.id);
      if (p && p.personality === 'competitivo') p.motivation = clamp(p.motivation - 2);
    }
  }
  if (comeback) {
    for (const x of played) {
      const p = byIdNow(x.p.id);
      if (p) p.confidence = clamp(p.confidence + 3);
    }
    s.memorableMoments.push(`Semana ${s.week}: de ${maxDeficit} abajo a ganarle a ${rival.name}. Remontada para contar.`);
    s.news.unshift({ week: s.week, text: `Remontada épica ante ${rival.name}: estuvimos ${maxDeficit} abajo y la dimos vuelta.`, tone: 'good' });
  }
  if (!won && margin >= B.blowoutMargin) {
    for (const p of starters) {
      const real = byIdNow(p.id);
      if (real) real.confidence = clamp(real.confidence - 3);
    }
  }
  if (shortHanded) {
    const n = live.squad.length;
    if (won) {
      s.memorableMoments.push(`Semana ${s.week}: ganamos siendo ${n}. Los que estuvieron, estuvieron.`);
      s.news.unshift({ week: s.week, text: `Gesta con lo justo: le ganamos a ${rival.name} siendo ${n}. El barrio todavía lo comenta.`, tone: 'good' });
      logClubEvent(s, 'partido', `Gesta: victoria ante ${rival.name} con solo ${n} jugadores.`, Math.min(s.week, s.seasonLength));
      for (const x of played) {
        const p = byIdNow(x.p.id);
        if (p) logPlayerEvent(p, s.seasonNumber, Math.min(s.week, s.seasonLength), 'hito', `Estuvo el día de la gesta: ganarle a ${rival.name} siendo ${n}.`);
      }
    } else {
      // Con lo justo nadie reprocha el resultado… el tema es quiénes faltaron.
      const weakAbsent = s.callUp.filter(
        (c) => c.status === 'ausente' && c.reasonId && !['enfermo', 'viaje', 'guardia', 'agenda'].includes(c.reasonId)
      );
      if (weakAbsent.length > 0) {
        for (const c of weakAbsent) {
          const faltador = byIdNow(c.playerId);
          if (!faltador) continue;
          for (const x of played) addPairBonus(s, x.p.id, faltador.id, -1);
          logPlayerEvent(faltador, s.seasonNumber, Math.min(s.week, s.seasonLength), 'ausencia', `Faltó con excusa floja el día que el equipo jugó con ${n}. El grupo tomó nota.`);
        }
        const names = weakAbsent.map((c) => c.playerName).join(' y ');
        s.news.unshift({ week: s.week, text: `Quedó picando en el grupo: ${names} faltó justo cuando el equipo fue con ${n}.`, tone: 'bad' });
      }
    }
  }

  const moraleTag = shortHanded
    ? won
      ? ` (gesta con ${live.squad.length})`
      : ` (con ${live.squad.length}, nadie reprocha nada)`
    : won && comeback
      ? ' (remontada épica)'
      : clutch
        ? won
          ? ' (ganada en la hora)'
          : ' (perdida en la hora: duele distinto)'
        : margin >= B.blowoutMargin
          ? won
            ? ' (paliza a favor)'
            : ' (paliza en contra)'
          : '';
  effects.push(`Motivación del plantel ${baseMorale >= 0 ? '+' : ''}${baseMorale}${moraleTag}`);
  effects.push(`Prestigio deportivo ${prestigeDelta >= 0 ? '+' : ''}${prestigeDelta}${shortHanded && won ? ' (la liga habla de la gesta)' : ''}`);
  const mostUsed = [...played].sort((a, b) => b.mins - a.mins);
  if (mostUsed.length > 0) {
    effects.push(
      `Minutos: ${played.length} jugador${played.length > 1 ? 'es' : ''} sumaron cancha; el más exigido, ${mostUsed[0].p.name} (${mostUsed[0].mins}', desgaste -${wearFor(mostUsed[0].mins)} aprox.).`
    );
    const ironmen = mostUsed.filter((x) => x.mins >= totalMinutes);
    if (ironmen.length > 0)
      effects.push(
        `${ironmen.map((x) => x.p.name).join(', ')} ${
          ironmen.length > 1 ? 'jugaron todo el partido: terminaron fundidos' : 'jugó todo el partido: terminó fundido'
        }.`
      );
  }
  if (hombreQ + presionQ > 0)
    effects.push(
      `Defensa agresiva (${[hombreQ > 0 ? `hombre ×${hombreQ}` : '', presionQ > 0 ? `presión ×${presionQ}` : '']
        .filter(Boolean)
        .join(', ')}): desgaste extra repartido entre los que la corrieron.`
    );
  if (upset) effects.push('¡Batacazo! Ganarle a un rival superior sumó prestigio extra.');
  for (const inj of live.injuries ?? []) {
    effects.push(`🚑 ${inj.name} salió lesionado: ${inj.weeks} semana${inj.weeks > 1 ? 's' : ''} de baja.`);
    s.news.unshift({
      week: s.week,
      text: `${inj.name} se lesionó en el partido: ${inj.weeks} semana${inj.weeks > 1 ? 's' : ''} afuera.`,
      tone: 'bad',
    });
  }
  // Tres técnicas en el año: el informe llega a la liga y cae la suspensión.
  for (const p of s.players) {
    if ((p.seasonTechs ?? 0) >= BALANCE.suspension.techsForSuspension) {
      p.seasonTechs = 0;
      p.suspendedWeeks = BALANCE.suspension.weeks;
      effects.push(`🟥 ${p.name} acumuló ${BALANCE.suspension.techsForSuspension} técnicas: una fecha de suspensión.`);
      s.news.unshift({
        week: s.week,
        text: `La liga suspendió a ${p.name} por acumulación de técnicas: se pierde la próxima fecha.`,
        tone: 'bad',
      });
      logPlayerEvent(p, s.seasonNumber, s.week, 'hito', 'Suspendido una fecha por acumulación de faltas técnicas. Fama de calentón en toda la liga.');
    }
  }

  // Claves tácticas del resultado.
  const endFresh = courtFreshness(live);
  const star = s.players.find((p) => p.id === live.starId);
  const starEff = star ? Math.max(1, playerEffective(star)) : 1;
  const hot = star ? (live.perfs[star.id] ?? starEff) / starEff : 1;
  const zonaQuarters = live.quarters.filter((q) => !q.overtime && q.defense === 'zona').length;
  const subsMade = played.filter((x) => !starters.some((st) => st.id === x.p.id)).length;
  const extraReasons: Reason[] = [];
  if (live.hombreQuarters >= 3) {
    if (endFresh < 35 && !won)
      extraReasons.push({ weight: 11, text: 'La defensa agresiva todo el partido nos dejó sin piernas en el cierre.', sign: 'contra' });
    else if (won) extraReasons.push({ weight: 8, text: 'La presión constante incomodó al rival de principio a fin.', sign: 'pro' });
  }
  if (live.estrellaQuarters >= 3) {
    if (hot < 0.92) extraReasons.push({ weight: 10, text: `Apostamos todo a ${live.starName} y no era su noche.`, sign: 'contra' });
    else if (hot > 1.08) extraReasons.push({ weight: 10, text: `${live.starName} cargó el equipo al hombro y respondió.`, sign: 'pro' });
  }
  if (rival.style === 'tiradores' && zonaQuarters >= 3)
    extraReasons.push({ weight: 9, text: 'La zona les regaló tiros abiertos a sus tiradores toda la noche.', sign: 'contra' });
  if (rival.style === 'corredores' && endFresh < 35)
    extraReasons.push({ weight: 9, text: 'Su ritmo de contraataque castigó nuestras piernas gastadas.', sign: 'contra' });
  if (subsMade >= 3 && endFresh > 55)
    extraReasons.push({ weight: 7, text: 'Los cambios mantuvieron piernas frescas hasta el final.', sign: 'pro' });
  if (subsMade === 0 && endFresh < 35)
    extraReasons.push({ weight: 8, text: 'Sin tocar el banco, el quinteto llegó fundido al cierre.', sign: 'contra' });
  if (s.lastAsado && s.lastAsado.week === s.week) {
    // Si hubo asado, su clave le gana a la genérica de química: es la misma
    // historia, contada con nombre y apellido.
    if (s.lastAsado.tier === 'fieston' || s.lastAsado.tier === 'bueno')
      extraReasons.push({ weight: 11, text: 'El asado de la semana se notó: el grupo entró de buen humor y conectado.', sign: 'pro' });
    else if (s.lastAsado.tier === 'papelon')
      extraReasons.push({ weight: 11, text: 'Las caras largas del asado fallido entraron a la cancha con el equipo.', sign: 'contra' });
  }

  const summary = won
    ? margin > 15
      ? `Victoria contundente ante ${rival.name}. El equipo fue superior de principio a fin.`
      : `Triunfo trabajado contra ${rival.name}, definido en el cierre.`
    : margin > 15
      ? `Dura derrota contra ${rival.name}. Nunca estuvimos en partido.`
      : `Derrota ajustada ante ${rival.name}. Se escapó por detalles.`;

  // El relato del informe sale de lo que realmente pasó cuarto a cuarto
  // (sin repetir la misma observación de cuartos consecutivos).
  // Sin tope corto: el informe cuenta el partido entero (antes cortaba en el
  // 2do cuarto y se perdía la racha del final, que es justo lo que se relee).
  const seenNotes = new Set<string>();
  const highlights = live.quarters.flatMap((q, i) =>
    q.notes
      .filter((n) => !seenNotes.has(n) && (seenNotes.add(n), true))
      .map((n) => `${q.overtime ? 'Suplementario' : Q_NAMES[i]}: ${n}`)
  );
  if (mvpFromBench) highlights.push(`${mvp.name} entró desde el banco y cambió el partido: figura inesperada.`);

  const lockerRoom = lockerRoomNotes(
    s,
    { won, margin, shortHanded, clutch, comeback, squadCount: live.squad.length },
    starters,
    won ? mvp : null,
    rng
  );
  const absentOnes = s.callUp.filter((c) => c.status === 'ausente');
  if (!won && absentOnes.length > 0 && lockerRoom.length < 2) {
    lockerRoom.push(`"Para el picado nunca falta", tiró uno del grupo cuando se habló de la ausencia de ${absentOnes[0].playerName}.`);
  }

  const statsOf = (id: string) => live.stats[id] ?? { pts: 0, reb: 0, ast: 0 };
  const box: BoxScoreLine[] = played
    .map(({ p, mins }) => ({
      playerId: p.id,
      name: p.name,
      minutes: mins,
      points: statsOf(p.id).pts,
      rebounds: statsOf(p.id).reb,
      assists: statsOf(p.id).ast,
      rating: ratings[p.id]?.rating ?? 5,
      mvp: p.id === mvp.id,
      comment: ratings[p.id]?.comment,
    }))
    .sort((a, b) => b.points - a.points);

  // Cómo quedó cada uno: el resultado no tapa los minutos que no jugaste.
  const bigGame = s.week > s.seasonLength;
  const moodPlayers = s.players.filter((p) => !p.leftClub && isSelectable(p) && !absent.has(p.id));
  const moodCtx = (p: Player): EmotionContext => ({
    won,
    margin,
    minutes: minutesOf(p.id),
    rating: ratings[p.id]?.rating ?? null,
    mvp: p.id === mvp.id,
    inSquad: live.squad.includes(p.id),
    promisedMinutes: hasMinutesPromise(s.promises, p.id, s.seasonNumber),
    bigGame,
    grievanceLevel: p.grievance?.cause === 'minutos' ? p.grievance.level : 0,
    grievanceWeeks: p.grievance ? Math.max(1, Math.min(s.week, s.seasonLength) - p.grievance.sinceWeek + 1) : 0,
  });

  // Lo que sintió hoy deja rastro: alimenta su queja activa (o la apaga si le
  // diste cancha). Va ANTES de escribir las frases, para que la frase ya salga
  // escalada: "van 3 fechas con lo mismo" en vez de la queja de siempre.
  for (const p of moodPlayers) {
    const cause = moodCauseFor(p, moodCtx(p));
    if (cause) bumpGrievance(s, p, cause);
    else if (p.grievance?.cause === 'minutos' && minutesOf(p.id) >= 15) sootheGrievance(s, p, 'hechos');
  }

  const moods: PlayerMood[] = buildMoods(moodPlayers, moodCtx, s.week);

  const result: MatchResult = {
    week: s.week,
    rivalId: rival.id,
    rivalName: rival.name,
    scoreFor,
    scoreAgainst,
    quarters: live.quarters.map((q) => ({ for: q.for, against: q.against })),
    highlights,
    won,
    forfeit: false,
    mvpId: mvp.id,
    mvpName: mvp.name,
    summary,
    reasons: buildReasons(evalTeam, rival.strength, live.luckTotal, won, extraReasons),
    lockerRoom,
    effects,
    box,
    moods,
  };

  if (upset) {
    s.memorableMoments.push(`Semana ${s.week}: batacazo histórico ante ${rival.name} (${scoreFor}-${scoreAgainst}).`);
    logClubEvent(s, 'partido', `Batacazo histórico ante ${rival.name} (${scoreFor}-${scoreAgainst}).`);
  }
  if (won && margin >= 25) {
    s.memorableMoments.push(`Semana ${s.week}: paliza inolvidable a ${rival.name} por ${margin} puntos.`);
    logClubEvent(s, 'partido', `Paliza inolvidable a ${rival.name} por ${margin} puntos.`);
  }

  concludeMatch(s, result, rng);
  return s;
}

/** Posición del club en la tabla (1 = primero). */
export function clubPosition(state: GameState): number {
  const sorted = [...state.standings].sort(
    (a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)
  );
  return sorted.findIndex((r) => r.teamId === 'club') + 1;
}

/** Rotación sugerida: los mejores disponibles que no son titulares. */
export function suggestRotation(players: Player[], starterIds: string[], absent: Set<string> = new Set()): string[] {
  return players
    .filter((p) => isSelectable(p) && !absent.has(p.id) && !starterIds.includes(p.id))
    .sort((a, b) => playerEffective(b) - playerEffective(a))
    .slice(0, BALANCE.rotation.maxPlayers)
    .map((p) => p.id);
}

/** Quinteto sugerido: los 5 disponibles más fuertes cubriendo posiciones. */
export function suggestStarters(players: Player[], absent: Set<string> = new Set()): string[] {
  const selectable = players
    .filter((p) => isSelectable(p) && !absent.has(p.id))
    .sort((a, b) => playerEffective(b) - playerEffective(a));
  const chosen: Player[] = [];
  // Primero, el mejor por posición.
  for (const pos of ALL_POSITIONS) {
    const best = selectable.find((p) => p.position === pos && !chosen.includes(p));
    if (best) chosen.push(best);
  }
  // Completar con los mejores restantes.
  for (const p of selectable) {
    if (chosen.length >= 5) break;
    if (!chosen.includes(p)) chosen.push(p);
  }
  return chosen.slice(0, 5).map((p) => p.id);
}
