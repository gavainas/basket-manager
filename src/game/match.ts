import { BALANCE, clamp } from './balance';
import type { GameState, MatchResult, Player, Position } from './types';
import type { Rng } from './rng';

const ALL_POSITIONS: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

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
  return state.players
    .filter((p) => isSelectable(p) && state.rotation.includes(p.id) && !state.starters.includes(p.id))
    .slice(0, BALANCE.rotation.maxPlayers);
}

interface TeamEval {
  strength: number;
  baseSkill: number;
  physicalAvg: number;
  motivationAvg: number;
  missingPositions: number;
  chemistry01: number;
  starterMinutes: number;
  rotationCount: number;
}

export function evaluateTeam(state: GameState, starterIds: string[]): TeamEval {
  const starters = state.players.filter((p) => starterIds.includes(p.id));
  const rotation = state.players
    .filter((p) => isSelectable(p) && state.rotation.includes(p.id) && !starterIds.includes(p.id))
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

function buildReasons(evalTeam: TeamEval, rivalStrength: number, luck: number, won: boolean): string[] {
  const reasons: { weight: number; text: string }[] = [];
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
  if (evalTeam.starterMinutes >= 38)
    reasons.push({ weight: 9, text: 'Sin recambio en el banco: los titulares llegaron fundidos al último cuarto.' });
  else if (evalTeam.rotationCount >= 4)
    reasons.push({ weight: 6, text: 'La rotación larga mantuvo piernas frescas hasta el final.' });
  if (luck > 6) reasons.push({ weight: luck, text: won ? 'La pelota entró en los momentos justos.' : 'Ni con suerte alcanzó.' });
  if (luck < -6) reasons.push({ weight: -luck, text: 'La pelota no quiso entrar; hubo mala fortuna.' });

  reasons.sort((a, b) => b.weight - a.weight);
  const top = reasons.slice(0, 3).map((r) => r.text);
  if (top.length === 0) top.push(won ? 'Fue un partido parejo que se definió por detalles.' : 'Partido parejo que se escapó por detalles.');
  return top;
}

/** Reparte un marcador total en 4 cuartos con variación creíble. */
function splitQuarters(total: number, rng: Rng): number[] {
  const base = total / 4;
  const qs = [0, 0, 0, 0].map(() => Math.max(4, Math.round(base + rng.range(-5, 5))));
  let diff = total - qs.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0 && i < 100) {
    const idx = i % 4;
    const step = diff > 0 ? 1 : -1;
    if (qs[idx] + step >= 2) {
      qs[idx] += step;
      diff -= step;
    }
    i++;
  }
  return qs;
}

function buildHighlights(
  perfs: { p: Player; perf: number }[],
  won: boolean,
  margin: number,
  rivalName: string,
  rng: Rng
): string[] {
  const lines: string[] = [];
  const hero = perfs[0].p;
  const second = perfs.length > 1 ? perfs[1].p : hero;
  const worst = perfs[perfs.length - 1].p;

  lines.push(
    rng.pick([
      `${hero.name} arrancó encendido: dos triples seguidos en el primer cuarto.`,
      `${hero.name} marcó el ritmo desde el arranque y contagió al resto.`,
      `Gran primer tiempo de ${hero.name}, imposible de frenar cerca del aro.`,
    ])
  );
  lines.push(
    rng.pick([
      `${second.name} sostuvo al equipo con defensa y rebotes cuando el partido se trabó.`,
      `Una bandeja a tablero de ${second.name} sobre el cierre del tercer cuarto levantó al banco.`,
      `${second.name} repartió juego y orden en los minutos calientes.`,
    ])
  );
  if (won && margin <= 6) {
    lines.push(`Final de infarto: ${hero.name} metió los libres decisivos y ${rivalName} se quedó sin nafta.`);
  } else if (won && margin > 15) {
    lines.push('El último cuarto fue un monólogo: hasta el banco sumó minutos y puntos.');
  } else if (!won && margin <= 6) {
    lines.push(`Se escapó sobre la chicharra: la última pelota no quiso entrar y ${rivalName} festejó.`);
  } else if (!won) {
    lines.push(
      rng.pick([
        `A ${worst.name} no le salió una en toda la noche, y el equipo lo sintió.`,
        `${rivalName} castigó cada pérdida con puntos fáciles de contra.`,
      ])
    );
  }
  return lines;
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
    if (socials.length > 0) notes.push(`${rng.pick(socials).name} organizó unas pizzas post partido. Sumó al ambiente.`);
  }
  return notes.slice(0, 2);
}

/**
 * Simula el partido de la semana. Muta un clon del estado y lo devuelve con
 * resultado, efectos sobre jugadores/club y tabla actualizada.
 */
export function simulateMatch(state: GameState, rng: Rng): GameState {
  const s: GameState = structuredClone(state);
  const rivalId = s.schedule[s.week - 1];
  const rival = s.rivals.find((r) => r.id === rivalId)!;
  const starters = s.players.filter((p) => s.starters.includes(p.id) && isSelectable(p));

  let result: MatchResult;

  if (starters.length < 5) {
    // No hay quinteto completo: se pierde por forfeit.
    const [low, high] = BALANCE.match.forfeitScore;
    result = {
      week: s.week,
      rivalId,
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
    };
    s.players = s.players.map((p) =>
      p.leftClub ? p : { ...p, motivation: clamp(p.motivation - 8) }
    );
    s.club.sportPrestige = clamp(s.club.sportPrestige - 5);
    s.club.socialPrestige = clamp(s.club.socialPrestige - 3);
  } else {
    const evalTeam = evaluateTeam(s, s.starters);
    const rivalEff = rival.strength * rng.range(0.92, 1.08);
    const luck = rng.range(-BALANCE.match.randomPoints, BALANCE.match.randomPoints);
    const diff = (evalTeam.strength - rivalEff) * BALANCE.match.strengthToPoints + luck;

    let scoreFor = Math.round(BALANCE.match.baseScore + diff / 2 + rng.range(-4, 4));
    let scoreAgainst = Math.round(BALANCE.match.baseScore - diff / 2 + rng.range(-4, 4));
    scoreFor = Math.max(31, scoreFor);
    scoreAgainst = Math.max(31, scoreAgainst);
    if (scoreFor === scoreAgainst) {
      // Suplementario: gana el que llegó mejor.
      if (diff >= 0) scoreFor += rng.int(1, 3);
      else scoreAgainst += rng.int(1, 3);
    }
    const won = scoreFor > scoreAgainst;
    const margin = Math.abs(scoreFor - scoreAgainst);

    // Minutos: dependen de cuántos jugadores de rotación entran.
    const rotation = rotationPlayers(s);
    const { starterMinutes, subMinutes } = minutesPlan(rotation.length);
    const wearStarter = Math.round(starterMinutes * BALANCE.rotation.wearPerMinute);
    const wearSub = Math.round(subMinutes * BALANCE.rotation.wearPerMinute);

    // Rendimiento individual y MVP (la rotación también compite, pesada por minutos).
    const perfs = starters.map((p) => ({ p, perf: playerEffective(p) * rng.range(0.78, 1.22) }));
    perfs.sort((a, b) => b.perf - a.perf);
    const rotPerfs = rotation.map((p) => ({ p, perf: playerEffective(p) * rng.range(0.78, 1.22) }));
    const minutesWeight = starterMinutes > 0 ? Math.sqrt(subMinutes / starterMinutes) : 0;
    const mvpCandidates = [
      ...perfs.map((x) => ({ p: x.p, score: x.perf })),
      ...rotPerfs.map((x) => ({ p: x.p, score: x.perf * minutesWeight })),
    ];
    mvpCandidates.sort((a, b) => b.score - a.score);
    const mvp = mvpCandidates[0].p;
    const mvpFromBench = !starters.some((st) => st.id === mvp.id);

    const effects: string[] = [];
    const B = BALANCE.matchEffects;
    const upset = won && rival.strength > evalTeam.baseSkill + 5;

    s.players = s.players.map((p) => {
      if (p.leftClub) return p;
      const np = { ...p };
      const started = starters.some((st) => st.id === p.id);
      const rotated = rotation.some((r) => r.id === p.id);

      if (started) {
        const perf = perfs.find((x) => x.p.id === p.id)!.perf;
        np.lastRating = Math.max(1, Math.min(10, Math.round(perf / 10)));
        np.physical = clamp(np.physical - wearStarter + rng.range(-3, 3));
        np.weeksBenched = 0;
        np.confidence = clamp(np.confidence + (np.lastRating >= 7 ? 5 : np.lastRating <= 3 ? -5 : 0));
      } else if (rotated) {
        const perf = rotPerfs.find((x) => x.p.id === p.id)!.perf;
        np.lastRating = Math.max(1, Math.min(10, Math.round(perf / 10)));
        np.physical = clamp(np.physical - wearSub + rng.range(-2, 2));
        np.weeksBenched = 0;
        np.confidence = clamp(np.confidence + (np.lastRating >= 7 ? 3 : np.lastRating <= 3 ? -3 : 0));
        if (np.personality === 'protagonista' || np.expectedRole === 'titular') {
          // Jugar desde el banco no les alcanza, pero molesta menos que no jugar.
          np.motivation = clamp(np.motivation + B.rotationMotivationHit);
          if (np.motivation < BALANCE.weekly.lowMotivationThreshold && np.status === 'disponible') {
            np.status = 'molesto';
            np.weeksUpset = 0;
          }
        } else if (np.expectedRole === 'suplente') {
          np.motivation = clamp(np.motivation + B.subMinutesBoost);
        }
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

      const moraleDelta = won ? B.winMotivation : B.lossMotivation;
      const personalityScale = np.personality === 'competitivo' ? 1.5 : np.personality === 'social' ? 0.6 : 1;
      np.motivation = clamp(np.motivation + moraleDelta * personalityScale);

      if (np.id === mvp.id) {
        np.confidence = clamp(np.confidence + B.mvpConfidence);
        np.motivation = clamp(np.motivation + 4);
      }
      return np;
    });

    const prestigeDelta = won ? B.winSportPrestige + (upset ? B.upsetWinBonus : 0) : margin > 18 ? B.lossSportPrestige - 1 : B.lossSportPrestige;
    s.club.sportPrestige = clamp(s.club.sportPrestige + prestigeDelta);
    if (won) s.club.socialClimate = clamp(s.club.socialClimate + 3);
    else if (margin > 15) s.club.socialClimate = clamp(s.club.socialClimate - 4);

    effects.push(`Motivación del plantel ${won ? '+' : ''}${won ? B.winMotivation : B.lossMotivation}`);
    effects.push(`Prestigio deportivo ${prestigeDelta >= 0 ? '+' : ''}${prestigeDelta}`);
    effects.push(`Titulares: ~${starterMinutes} min en cancha (desgaste -${wearStarter} aprox.)`);
    if (rotation.length > 0)
      effects.push(`Rotación: ${rotation.length} jugador${rotation.length > 1 ? 'es' : ''} con ~${subMinutes} min (desgaste -${wearSub}).`);
    else effects.push('Sin rotación: los titulares jugaron los 40 minutos y terminaron fundidos.');
    if (upset) effects.push('¡Batacazo! Ganarle a un rival superior sumó prestigio extra.');

    const summary = won
      ? margin > 15
        ? `Victoria contundente ante ${rival.name}. El equipo fue superior de principio a fin.`
        : `Triunfo trabajado contra ${rival.name}, definido en el cierre.`
      : margin > 15
        ? `Dura derrota contra ${rival.name}. Nunca estuvimos en partido.`
        : `Derrota ajustada ante ${rival.name}. Se escapó por detalles.`;

    const qFor = splitQuarters(scoreFor, rng);
    const qAgainst = splitQuarters(scoreAgainst, rng);

    const highlights = buildHighlights(perfs, won, margin, rival.name, rng);
    if (mvpFromBench) highlights.push(`${mvp.name} entró desde el banco y cambió el partido: figura inesperada.`);

    result = {
      week: s.week,
      rivalId,
      rivalName: rival.name,
      scoreFor,
      scoreAgainst,
      quarters: qFor.map((f, i) => ({ for: f, against: qAgainst[i] })),
      highlights,
      won,
      forfeit: false,
      mvpId: mvp.id,
      mvpName: mvp.name,
      summary,
      reasons: buildReasons(evalTeam, rival.strength, luck, won),
      lockerRoom: lockerRoomNotes(s, { won, margin }, starters, won ? mvp : null, rng),
      effects,
    };

    if (upset) s.memorableMoments.push(`Semana ${s.week}: batacazo histórico ante ${rival.name} (${scoreFor}-${scoreAgainst}).`);
    if (won && margin >= 25) s.memorableMoments.push(`Semana ${s.week}: paliza inolvidable a ${rival.name} por ${margin} puntos.`);
  }

  // Tabla: resultado propio.
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
  s.phase = 'matchResult';
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
export function suggestRotation(players: Player[], starterIds: string[]): string[] {
  return players
    .filter((p) => isSelectable(p) && !starterIds.includes(p.id))
    .sort((a, b) => playerEffective(b) - playerEffective(a))
    .slice(0, BALANCE.rotation.maxPlayers)
    .map((p) => p.id);
}

/** Quinteto sugerido: los 5 disponibles más fuertes cubriendo posiciones. */
export function suggestStarters(players: Player[]): string[] {
  const selectable = players.filter(isSelectable).sort((a, b) => playerEffective(b) - playerEffective(a));
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
