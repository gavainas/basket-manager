import { BALANCE, clamp } from './balance';
import { logPlayerEvent } from './timeline';
import type { BoxScoreLine, GameState, MatchResult, Player, Position, Rival, TeamEval } from './types';
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
  return !p.leftClub && p.status !== 'lesionado';
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
  const chemistry01 = (0.6 * state.club.socialClimate + 0.4 * socialAvg) / 100;
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

function buildReasons(
  evalTeam: TeamEval,
  rivalStrength: number,
  luck: number,
  won: boolean,
  extra: { weight: number; text: string }[] = []
): string[] {
  const reasons: { weight: number; text: string }[] = [...extra];
  const gap = evalTeam.baseSkill - rivalStrength;

  if (gap > 7) reasons.push({ weight: gap, text: 'La diferencia de nivel estuvo a favor nuestro.' });
  if (gap < -7) reasons.push({ weight: -gap, text: 'El rival tenía un equipo superior en los papeles.' });
  if (evalTeam.physicalAvg < 55) reasons.push({ weight: 60 - evalTeam.physicalAvg, text: 'El equipo llegó con las piernas pesadas.' });
  if (evalTeam.physicalAvg > 78) reasons.push({ weight: evalTeam.physicalAvg - 70, text: 'La frescura física se notó en el último cuarto.' });
  if (evalTeam.motivationAvg < 50) reasons.push({ weight: 60 - evalTeam.motivationAvg, text: 'Varios jugadores estaban desmotivados y se notó.' });
  if (evalTeam.motivationAvg > 78) reasons.push({ weight: evalTeam.motivationAvg - 70, text: 'El equipo salió enchufado desde el arranque.' });
  if (evalTeam.missingPositions > 0)
    reasons.push({
      weight: evalTeam.missingPositions * 9,
      text: `Faltó cubrir ${evalTeam.missingPositions === 1 ? 'una posición natural' : `${evalTeam.missingPositions} posiciones naturales`} en el quinteto.`,
    });
  if (evalTeam.chemistry01 > 0.72) reasons.push({ weight: 8, text: 'La química del grupo empujó en los momentos calientes.' });
  if (evalTeam.chemistry01 < 0.45) reasons.push({ weight: 10, text: 'El mal ambiente del vestuario se trasladó a la cancha.' });
  if (luck > 6) reasons.push({ weight: luck, text: won ? 'La pelota entró en los momentos justos.' : 'Ni con suerte alcanzó.' });
  if (luck < -6) reasons.push({ weight: -luck, text: 'La pelota no quiso entrar; hubo mala fortuna.' });

  reasons.sort((a, b) => b.weight - a.weight);
  const top = reasons.slice(0, 3).map((r) => r.text);
  if (top.length === 0) top.push(won ? 'Fue un partido parejo que se definió por detalles.' : 'Partido parejo que se escapó por detalles.');
  return top;
}

function lockerRoomNotes(state: GameState, result: { won: boolean; margin: number }, starters: Player[], mvp: Player | null, rng: Rng): string[] {
  const notes: string[] = [];
  const benched = state.players.filter(
    (p) =>
      isSelectable(p) &&
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

  // Partidos entre los demás rivales para que la tabla viva.
  const others = rng.shuffle(s.rivals.filter((r) => r.id !== rivalId));
  for (let i = 0; i + 1 < others.length; i += 2) {
    const a = others[i];
    const b = others[i + 1];
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
  const starters = s.players.filter((p) => s.starters.includes(p.id) && isSelectable(p) && !absent.has(p.id));

  if (starters.length < 5) return simulateForfeit(s, rival, rng);

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
    playerFresh[p.id] = clamp(M.freshStartBase + M.freshStartPhysical * p.physical);
    minutes[p.id] = 0;
    stats[p.id] = { pts: 0, reb: 0, ast: 0 };
  }
  const star = [...starters].sort((a, b) => playerEffective(b) - playerEffective(a))[0];

  s.live = {
    rivalId,
    rivalName: rival.name,
    quarters: [],
    finished: false,
    defense: 'zona',
    attack: 'equipo',
    squad: squad.map((p) => p.id),
    onCourt: starters.map((p) => p.id),
    playerFresh,
    minutes,
    stats,
    pendingSubNotes: [],
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
  if (live.attack === 'estrella') {
    atkMult = M.estrellaBase + M.estrellaHotSpan * (hot - 0.78) - M.estrellaDecay * live.estrellaQuarters;
    if (hot > 1.08) notes.push(`${star.name} está encendido: la pide y la mete.`);
    else if (hot < 0.92) notes.push(`${star.name} no tiene la mano y el plan de dársela siempre a él hace agua.`);
    else if (live.estrellaQuarters >= 2) notes.push(`El rival ya le tomó la mano a ${star.name}: lo esperan entre dos.`);
  } else {
    atkMult = M.equipoBase + M.equipoChemBonus * live.eval.chemistry01;
    if (live.eval.chemistry01 > 0.7 && rng.chance(0.5)) notes.push('La pelota se mueve sola: el equipo juega de memoria y de buen humor.');
  }
  if (missing > 0) notes.push(`Con este quinteto falta un ${ALL_POSITIONS.find((pos) => !covered.has(pos))} natural y se nota.`);

  const atk = effAvg * chemFactor * orgFactor * coverageFactor * atkMult;

  // --- Defensa ---
  let defMult = 1;
  if (live.defense === 'hombre') {
    if (teamFresh >= M.hombreTiredThreshold) {
      defMult = M.hombreRivalMult;
      notes.push('La marca individual asfixia la salida del rival.');
    } else {
      defMult = M.hombreTiredMult;
      notes.push('Queremos presionar pero las piernas no llegan: quedan pasillos por todos lados.');
    }
    if (rival.style === 'tiradores') defMult *= M.tiradoresVsHombre;
    if (rival.style === 'internos') notes.push('Chocar con sus grandotes cuesta doble: cada marca es una batalla.');
  } else {
    if (rival.style === 'tiradores') {
      defMult *= M.tiradoresVsZona;
      notes.push('La zona les deja tiros abiertos y sus tiradores no perdonan.');
    }
    if (rival.style === 'internos') defMult *= M.internosVsZona;
  }
  if (rival.style === 'corredores') {
    defMult *= 1 + M.corredoresTiredBoost * (1 - teamFresh / 100);
    if (teamFresh < 45) notes.push('Nos corren la cancha entera y llegamos siempre tarde a las marcas.');
  }
  if (teamFresh < 30) notes.push('El equipo juega de memoria: no quedan piernas.');

  const rivalFreshFactor = M.freshFactorMin + M.freshFactorSpan * (live.rivalFreshness / 100);
  const rivalEff = rival.strength * rng.range(0.94, 1.06) * rivalFreshFactor * (live.rivalPush ? M.pushRivalBoost : 1);

  // --- Marcador del cuarto ---
  const luck = rng.range(-M.luckPerQuarter, M.luckPerQuarter);
  live.luckTotal += luck;
  const qBase = BALANCE.match.baseScore / 4;
  const diffQ = ((atk - rivalEff) * BALANCE.match.strengthToPoints) / 4 + luck;
  const ourQ = Math.max(4, Math.round(qBase + diffQ / 2 + rng.range(-1.5, 1.5)));
  const rivalQ = Math.max(4, Math.round((qBase - diffQ / 2 + rng.range(-1.5, 1.5)) * defMult));

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

  // --- Desgaste y minutos ---
  if (live.defense === 'hombre') live.hombreQuarters += 1;
  if (live.attack === 'estrella') live.estrellaQuarters += 1;

  for (const p of onCourt) {
    let drain = M.playerDrainBase;
    if (live.defense === 'hombre') drain += M.playerDrainHombre + (rival.style === 'internos' ? M.internosHombreDrain : 0);
    drain += Math.max(0, 60 - p.physical) * M.playerDrainLowPhysical;
    live.playerFresh[p.id] = clamp(freshOf(p.id) - Math.round(drain));
    live.minutes[p.id] = (live.minutes[p.id] ?? 0) + M.quarterMinutes;
  }
  for (const id of live.squad) {
    if (!live.onCourt.includes(id)) live.playerFresh[id] = clamp((live.playerFresh[id] ?? 70) + M.benchRecovery);
  }

  // Aviso de fundidos, para invitar al cambio.
  const gassed = onCourt.filter((p) => (live.playerFresh[p.id] ?? 70) < 30);
  if (gassed.length > 0 && qIndex < 3) notes.push(`${gassed[0].name} está fundido y mira al banco: pide el cambio.`);

  let rivalDrain = rival.style === 'corredores' ? M.rivalDrain - 2 : M.rivalDrain;
  if (live.defense === 'hombre') rivalDrain += M.hombreRivalDrain;
  live.rivalFreshness = clamp(live.rivalFreshness - rivalDrain);

  if (qIndex === 1) {
    for (const id of live.squad) live.playerFresh[id] = clamp((live.playerFresh[id] ?? 70) + M.halftimeRecovery);
    live.rivalFreshness = clamp(live.rivalFreshness + M.halftimeRecovery);
  }

  live.quarters.push({ for: ourQ, against: rivalQ, defense: live.defense, attack: live.attack, notes: notes.slice(0, 4) });

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

  // Desgaste según minutos realmente jugados; la marca hombre suma cansancio extra.
  const totalMinutes = 40 + (live.quarters.some((q) => q.overtime) ? M.otMinutes : 0);
  const extraWear = live.hombreQuarters * M.hombreWearPerQuarter;
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

  const effects: string[] = [];
  const B = BALANCE.matchEffects;
  const upset = won && rival.strength > evalTeam.baseSkill + 5;

  s.players = s.players.map((p) => {
    if (p.leftClub) return p;
    const np = { ...p };
    const mins = live.squad.includes(p.id) ? minutesOf(p.id) : 0;

    if (mins >= 20) {
      // Cargó con el peso del partido.
      const perf = played.find((x) => x.p.id === p.id)!.perf;
      np.lastRating = Math.max(1, Math.min(10, Math.round(perf / 10)));
      np.physical = clamp(np.physical - wearFor(mins) + rng.range(-3, 3));
      np.weeksBenched = 0;
      np.confidence = clamp(np.confidence + (np.lastRating >= 7 ? 5 : np.lastRating <= 3 ? -5 : 0));
    } else if (mins > 0) {
      // Sumó minutos desde el banco.
      const perf = played.find((x) => x.p.id === p.id)!.perf;
      np.lastRating = Math.max(1, Math.min(10, Math.round(perf / 10)));
      np.physical = clamp(np.physical - wearFor(mins) + rng.range(-2, 2));
      np.weeksBenched = 0;
      np.confidence = clamp(np.confidence + (np.lastRating >= 7 ? 3 : np.lastRating <= 3 ? -3 : 0));
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

    const moraleDelta = won ? B.winMotivation : B.lossMotivation;
    const personalityScale = np.personality === 'competitivo' ? 1.5 : np.personality === 'social' ? 0.6 : 1;
    np.motivation = clamp(np.motivation + moraleDelta * personalityScale);

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

  const prestigeDelta = won ? B.winSportPrestige + (upset ? B.upsetWinBonus : 0) : margin > 18 ? B.lossSportPrestige - 1 : B.lossSportPrestige;
  s.club.sportPrestige = clamp(s.club.sportPrestige + prestigeDelta);
  if (won) s.club.socialClimate = clamp(s.club.socialClimate + 3);
  else if (margin > 15) s.club.socialClimate = clamp(s.club.socialClimate - 4);

  effects.push(`Motivación del plantel ${won ? '+' : ''}${won ? B.winMotivation : B.lossMotivation}`);
  effects.push(`Prestigio deportivo ${prestigeDelta >= 0 ? '+' : ''}${prestigeDelta}`);
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
  if (live.hombreQuarters > 0)
    effects.push(`Marca hombre en ${live.hombreQuarters} cuarto${live.hombreQuarters > 1 ? 's' : ''}: desgaste extra repartido entre los que la corrieron.`);
  if (upset) effects.push('¡Batacazo! Ganarle a un rival superior sumó prestigio extra.');

  // Claves tácticas del resultado.
  const endFresh = courtFreshness(live);
  const star = s.players.find((p) => p.id === live.starId);
  const starEff = star ? Math.max(1, playerEffective(star)) : 1;
  const hot = star ? (live.perfs[star.id] ?? starEff) / starEff : 1;
  const zonaQuarters = live.quarters.filter((q) => !q.overtime && q.defense === 'zona').length;
  const subsMade = played.filter((x) => !starters.some((st) => st.id === x.p.id)).length;
  const extraReasons: { weight: number; text: string }[] = [];
  if (live.hombreQuarters >= 3) {
    if (endFresh < 35 && !won)
      extraReasons.push({ weight: 11, text: 'Marcar hombre todo el partido nos dejó sin piernas en el cierre.' });
    else if (won) extraReasons.push({ weight: 8, text: 'La marca individual incomodó al rival de principio a fin.' });
  }
  if (live.estrellaQuarters >= 3) {
    if (hot < 0.92) extraReasons.push({ weight: 10, text: `Apostamos todo a ${live.starName} y no era su noche.` });
    else if (hot > 1.08) extraReasons.push({ weight: 10, text: `${live.starName} cargó el equipo al hombro y respondió.` });
  }
  if (rival.style === 'tiradores' && zonaQuarters >= 3)
    extraReasons.push({ weight: 9, text: 'La zona les regaló tiros abiertos a sus tiradores toda la noche.' });
  if (rival.style === 'corredores' && endFresh < 35)
    extraReasons.push({ weight: 9, text: 'Su ritmo de contraataque castigó nuestras piernas gastadas.' });
  if (subsMade >= 3 && endFresh > 55)
    extraReasons.push({ weight: 7, text: 'Los cambios mantuvieron piernas frescas hasta el final.' });
  if (subsMade === 0 && endFresh < 35)
    extraReasons.push({ weight: 8, text: 'Sin tocar el banco, el quinteto llegó fundido al cierre.' });

  const summary = won
    ? margin > 15
      ? `Victoria contundente ante ${rival.name}. El equipo fue superior de principio a fin.`
      : `Triunfo trabajado contra ${rival.name}, definido en el cierre.`
    : margin > 15
      ? `Dura derrota contra ${rival.name}. Nunca estuvimos en partido.`
      : `Derrota ajustada ante ${rival.name}. Se escapó por detalles.`;

  // El relato del informe sale de lo que realmente pasó cuarto a cuarto
  // (sin repetir la misma observación de cuartos consecutivos).
  const seenNotes = new Set<string>();
  const highlights = live.quarters
    .flatMap((q, i) =>
      q.notes
        .filter((n) => !seenNotes.has(n) && (seenNotes.add(n), true))
        .map((n) => `${q.overtime ? 'Suplementario' : Q_NAMES[i]}: ${n}`)
    )
    .slice(0, 6);
  if (mvpFromBench) highlights.push(`${mvp.name} entró desde el banco y cambió el partido: figura inesperada.`);

  const lockerRoom = lockerRoomNotes(s, { won, margin }, starters, won ? mvp : null, rng);
  const absentOnes = s.callUp.filter((c) => c.status === 'ausente');
  if (!won && absentOnes.length > 0 && lockerRoom.length < 2) {
    lockerRoom.push(`"Para el picado nunca falta", tiró uno del grupo cuando se habló de la ausencia de ${absentOnes[0].playerName}.`);
  }

  const statsOf = (id: string) => live.stats[id] ?? { pts: 0, reb: 0, ast: 0 };
  const box: BoxScoreLine[] = played
    .map(({ p, perf, mins }) => ({
      playerId: p.id,
      name: p.name,
      minutes: mins,
      points: statsOf(p.id).pts,
      rebounds: statsOf(p.id).reb,
      assists: statsOf(p.id).ast,
      rating: Math.max(1, Math.min(10, Math.round(perf / 10))),
      mvp: p.id === mvp.id,
    }))
    .sort((a, b) => b.points - a.points);

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
  };

  if (upset) s.memorableMoments.push(`Semana ${s.week}: batacazo histórico ante ${rival.name} (${scoreFor}-${scoreAgainst}).`);
  if (won && margin >= 25) s.memorableMoments.push(`Semana ${s.week}: paliza inolvidable a ${rival.name} por ${margin} puntos.`);

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
