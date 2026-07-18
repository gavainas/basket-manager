// Convocatoria previa al partido: cada semana se confirma quién viene.
// Por lo general vienen todos, pero los de poco compromiso a veces fallan
// con alguna excusa, o directamente se lesionaron jugando en otro lado.

import { ABSENCE_REASONS, LIFE_REASON_IDS } from './absences';
import { BALANCE } from './balance';
import { fragilityOf, rollInjuryWeeks } from './injuries';
import { isSelectable } from './match';
import { logPlayerEvent } from './timeline';
import { userFixtureOfWeek } from './world';
import type { CallUpEntry, GameState, WeekDay } from './types';
import type { Rng } from './rng';

const DAY_OF_DATE: WeekDay[] = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const INJURY_NOTES = [
  'Jugó ayer un picado en el club del barrio y volvió renqueando: tobillo hinchado.',
  'Se anotó en un torneo relámpago de la oficina y le agarró un tirón en el isquio.',
  'Ayer "un partidito tranquilo" con los primos: dedo doblado y muñeca vendada.',
  'Apareció con la rodilla vendada. "Fue en el trabajo", jura. Nadie preguntó más.',
  'Jugó anoche para otro equipo "de prestado" y se resintió la pantorrilla.',
];

/**
 * Sortea la convocatoria del partido de la semana. Muta el estado recibido
 * (que debe ser un clon): marca lesiones reales y arma la lista de respuestas.
 */
export function rollCallUp(s: GameState, rng: Rng): void {
  const C = BALANCE.callUp;
  // La dificultad elegida al crear la partida escala cuánto falta la gente.
  const D = BALANCE.absenceDifficulty[s.absenceDifficulty ?? 'medio'];
  const entries: CallUpEntry[] = [];
  let outCount = 0;

  // Día y hora del partido de la semana, para cruzarlos con las agendas.
  const fx = userFixtureOfWeek(s.world, s.week);
  const matchDay: WeekDay | null = fx?.date ? DAY_OF_DATE[new Date(`${fx.date}T00:00:00Z`).getUTCDay()] : null;
  const matchTime = fx?.time ?? null;

  // Los imprevistos de la vida no miran el compromiso; las excusas flojas sí.
  const lifeReasons = ABSENCE_REASONS.filter((r) => (LIFE_REASON_IDS as readonly string[]).includes(r.id));
  const excuseReasons = ABSENCE_REASONS.filter(
    (r) => !(LIFE_REASON_IDS as readonly string[]).includes(r.id) && r.id !== 'agenda'
  );

  for (const p of rng.shuffle(s.players.filter((x) => isSelectable(x)))) {
    const risk = Math.max(0, C.commitmentThreshold - p.commitment) / 100;
    let excuseChance = risk * C.excuseChanceFactor;
    if (p.personality === 'talentoso_informal') excuseChance += C.informalExtra;
    if (p.status === 'molesto' || p.status === 'al_borde') excuseChance += C.upsetExtra;
    // Los que viven lejos fallan un poco más: el viaje no siempre cierra.
    if (p.agenda && p.agenda.distanceKm > 50) excuseChance += 0.06;
    excuseChance *= D.excuse;
    // Romperse jugando en otro lado: los frágiles caen más, y jugar poco
    // comprometido en todos lados multiplica las chances.
    const injuryChance =
      (C.injuryBase + risk * C.injuryChanceFactor) * (0.5 + fragilityOf(p) / 100) * D.injury;

    // Agenda: el día bloqueado que te avisó cuando firmó (casi siempre se cumple).
    if (p.agenda && matchDay && p.agenda.blockedDays.includes(matchDay) && outCount < D.maxOut && rng.chance(0.85)) {
      const player = s.players.find((x) => x.id === p.id)!;
      const note = `Los ${matchDay} no puede: compromiso fijo. Te lo avisó cuando arregló venir.`;
      entries.push({ playerId: p.id, playerName: p.name, status: 'ausente', note, reasonId: 'agenda' });
      logPlayerEvent(player, s.seasonNumber, s.week, 'ausencia', `Faltó al partido. ${note}`);
      outCount += 1;
      continue;
    }

    // Horario: si el partido no es en su franja, llega para el segundo tiempo.
    if (
      p.agenda &&
      matchTime &&
      ((p.agenda.onlyTimes.length > 0 && !p.agenda.onlyTimes.includes(matchTime) && rng.chance(0.7)) ||
        rng.chance(p.agenda.lateChance * 0.5))
    ) {
      entries.push({
        playerId: p.id,
        playerName: p.name,
        status: 'confirmado',
        note: 'Sale del trabajo y viaja directo: llega para el segundo tiempo.',
        lateArrival: true,
      });
      continue;
    }

    if (outCount < D.maxOut && rng.chance(injuryChance)) {
      const weeks = rollInjuryWeeks(fragilityOf(p), rng);
      const player = s.players.find((x) => x.id === p.id)!;
      player.status = 'lesionado';
      player.injuryWeeks = weeks;
      const note = rng.pick(INJURY_NOTES);
      entries.push({
        playerId: p.id,
        playerName: p.name,
        status: 'lesionado',
        note: `${note} Se pierde ${weeks === 1 ? 'esta semana' : `${weeks} semanas`}.`,
      });
      logPlayerEvent(player, s.seasonNumber, s.week, 'lesion', note);
      s.news.unshift({
        week: s.week,
        text: `${p.name} se lesionó jugando en otro lado: ${weeks} semana${weeks > 1 ? 's' : ''} afuera.`,
        tone: 'bad',
      });
      outCount += 1;
    } else if (outCount < D.maxOut && rng.chance(C.lifeChance * D.life)) {
      // La vida: enfermedad, viaje o guardia. Le toca a cualquiera, sin aviso.
      const reason = rng.pick(lifeReasons);
      const excuse = rng.pick(reason.excuses);
      const player = s.players.find((x) => x.id === p.id)!;
      entries.push({ playerId: p.id, playerName: p.name, status: 'ausente', note: excuse, reasonId: reason.id });
      logPlayerEvent(player, s.seasonNumber, s.week, 'ausencia', `Faltó al partido. ${excuse}`);
      outCount += 1;
    } else if (outCount < D.maxOut && rng.chance(excuseChance)) {
      const reason = rng.pick(excuseReasons);
      const excuse = rng.pick(reason.excuses);
      const player = s.players.find((x) => x.id === p.id)!;
      entries.push({ playerId: p.id, playerName: p.name, status: 'ausente', note: excuse, reasonId: reason.id });
      logPlayerEvent(player, s.seasonNumber, s.week, 'ausencia', `Faltó al partido. ${excuse}`);
      outCount += 1;
    } else {
      entries.push({ playerId: p.id, playerName: p.name, status: 'confirmado', note: null });
    }
  }

  // Bajas primero, después los confirmados por nombre.
  const rank = { lesionado: 0, ausente: 1, confirmado: 2 } as const;
  entries.sort((a, b) => rank[a.status] - rank[b.status] || a.playerName.localeCompare(b.playerName));
  s.callUp = entries;
}
