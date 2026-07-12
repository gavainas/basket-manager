// Convocatoria previa al partido: cada semana se confirma quién viene.
// Por lo general vienen todos, pero los de poco compromiso a veces fallan
// con alguna excusa, o directamente se lesionaron jugando en otro lado.

import { ABSENCE_REASONS } from './absences';
import { BALANCE } from './balance';
import { isSelectable } from './match';
import { logPlayerEvent } from './timeline';
import type { CallUpEntry, GameState } from './types';
import type { Rng } from './rng';

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
  const entries: CallUpEntry[] = [];
  let outCount = 0;

  for (const p of rng.shuffle(s.players.filter((x) => isSelectable(x)))) {
    const risk = Math.max(0, C.commitmentThreshold - p.commitment) / 100;
    let excuseChance = risk * C.excuseChanceFactor;
    if (p.personality === 'talentoso_informal') excuseChance += C.informalExtra;
    if (p.status === 'molesto' || p.status === 'al_borde') excuseChance += C.upsetExtra;
    const injuryChance = risk * C.injuryChanceFactor;

    if (outCount < C.maxOut && rng.chance(injuryChance)) {
      const weeks = rng.int(C.injuryWeeksMin, C.injuryWeeksMax);
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
    } else if (outCount < C.maxOut && rng.chance(excuseChance)) {
      const reason = rng.pick(ABSENCE_REASONS);
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
