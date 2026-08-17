// Amigos en otros cuadros: relaciones que cruzan clubes. Se derivan de forma
// determinista (sin guardar nada ni migrar saves) y escriben durante la
// semana: data del próximo rival, invitaciones a picados y color de la liga.

import { clamp } from './balance';
import { affinity } from './relations';
import { logPlayerEvent } from './timeline';
import { teamByLegacyRival, teamRoster, worldPlayerName } from './world';
import type { GameState, Player, Team, WorldPlayer } from './types';
import type { Rng } from './rng';

/** Hash simple y estable a [0, 1) — mismo espíritu que el de relations.ts. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export interface AbroadFriendship {
  player: Player;
  friend: WorldPlayer;
  team: Team;
  /** De dónde se conocen (color estable por par). */
  origin: string;
}

const ORIGINS = [
  'Se conocen del barrio de toda la vida.',
  'Fueron juntos a la facultad.',
  'Compañeros de laburo hace años.',
  'Jugaron juntos en las formativas.',
];

/**
 * Las amistades que cruzan clubes, derivadas al mirar. Prioriza historias
 * reales (ex compañeros: previousTeam) y completa con vínculos estables por
 * hash. Máximo un puñado: si todos tienen un amigo afuera, ninguno importa.
 */
export function friendshipsAbroad(state: GameState): AbroadFriendship[] {
  const actives = state.players.filter((p) => !p.leftClub).sort((a, b) => a.id.localeCompare(b.id));
  if (actives.length === 0) return [];
  const out: AbroadFriendship[] = [];
  const usedPlayers = new Set<string>();

  for (const rival of state.rivals) {
    if (out.length >= 5) break;
    const team = teamByLegacyRival(state.world, rival.id);
    if (!team) continue;
    const roster = teamRoster(state.world, team.id);
    if (roster.length === 0) continue;

    // Historia real primero: el que jugó en ese club tiene un ex compañero ahí.
    const exPlayer = actives.find((p) => !usedPlayers.has(p.id) && p.previousTeam === rival.name);
    if (exPlayer) {
      const friend = roster[Math.floor(hash01(exPlayer.id + '|' + team.id) * roster.length)];
      out.push({ player: exPlayer, friend, team, origin: `Ex compañeros en ${rival.name}.` });
      usedPlayers.add(exPlayer.id);
      continue;
    }

    // Vínculo estable por hash: no todos los equipos tienen uno.
    if (hash01(team.id + ':amistad') < 0.45) {
      const candidates = actives.filter((p) => !usedPlayers.has(p.id));
      if (candidates.length === 0) continue;
      const player = candidates[Math.floor(hash01(team.id + ':nuestro') * candidates.length)];
      const friend = roster[Math.floor(hash01(team.id + ':suyo') * roster.length)];
      out.push({
        player,
        friend,
        team,
        origin: ORIGINS[Math.floor(hash01(player.id + friend.id) * ORIGINS.length)],
      });
      usedPlayers.add(player.id);
    }
  }
  return out;
}

/** Las amistades de afuera de un jugador puntual (para su ficha). */
export function friendshipsOf(state: GameState, playerId: string): AbroadFriendship[] {
  return friendshipsAbroad(state).filter((f) => f.player.id === playerId);
}

/**
 * Un mensaje de un amigo de otro cuadro durante la semana (a veces).
 * Si el amigo juega contra nosotros esta fecha, la data vale oro: cuenta
 * quién no llega en su equipo. El resto del año: picados, videos y rumores.
 * Se llama desde advanceWeek con la semana ya avanzada.
 */
export function maybeFriendMessage(s: GameState, rng: Rng): void {
  if (s.week > s.seasonLength) return;
  if (!rng.chance(0.32)) return;
  const friendships = friendshipsAbroad(s);
  if (friendships.length === 0) return;
  const f = rng.pick(friendships);
  const friendName = worldPlayerName(f.friend);
  const nextRivalId = s.schedule[s.week - 1];

  let text: string;
  let tone: 'good' | 'neutral' | 'bad' = 'neutral';

  if (f.team.legacyRivalId === nextRivalId) {
    // Esta semana jugamos contra el equipo del amigo: data de primera mano.
    const roster = teamRoster(s.world, f.team.id);
    const injured = roster.find((wp) => wp.injuryWeeks > 0);
    if (injured) {
      text = `💬 ${friendName} (${f.team.name}) le escribió a ${f.player.name}: "El finde no llega ${worldPlayerName(injured)}, está roto. No digas que te dije".`;
      tone = 'good';
    } else {
      text = `💬 ${friendName} (${f.team.name}) a ${f.player.name}, antes del partido: "Vamos con todos, avisá. Después birra, como siempre".`;
    }
  } else {
    const roll = rng.next();
    if (roll < 0.2) {
      // Picado para dos: se lleva a un compañero (la amistad interna importa).
      const compa = s.players
        .filter((p) => !p.leftClub && p.id !== f.player.id)
        .map((p) => ({ p, aff: affinity(f.player, p, s.affinityBonus) }))
        .sort((a, b) => b.aff - a.aff)[0];
      if (compa && compa.aff >= 60) {
        text = `💬 ${friendName} (${f.team.name}) armó picado y pidió que vayan ${f.player.name} y ${compa.p.name}: "traé al otro, que la última vez la rompió". Volvieron enchufados.`;
        compa.p.motivation = clamp(compa.p.motivation + 2);
      } else {
        text = `💬 ${friendName} (${f.team.name}) invitó a ${f.player.name} a un picado del jueves: "sin roscas, juego y birra". Volvió enchufado.`;
      }
      tone = 'good';
      f.player.motivation = clamp(f.player.motivation + 2);
      f.player.social = clamp(f.player.social + 1);
    } else if (roll < 0.4) {
      text = `💬 Rumor vía ${f.player.name}: en ${f.team.name} se dijeron de todo después del último partido. Vestuario caliente el de ellos.`;
    } else if (roll < 0.55) {
      const pos = rng.pick(['base', 'escolta', 'alero', 'ala-pívot', 'pívot']);
      text = `💬 Chisme de mercado vía ${f.player.name}: un ${pos} de ${f.team.name} está buscando equipo. "Te aviso antes que a nadie", le dijo ${friendName}.`;
    } else if (roll < 0.7) {
      text = `💬 ${friendName} (${f.team.name}) le escribió a ${f.player.name} desde la costa: "acá ni me acuerdo del básquet". Foto de reposera incluida.`;
    } else if (roll < 0.85) {
      text = `💬 ${friendName} (${f.team.name}) le preguntó a ${f.player.name} cómo viene el equipo: "los miro de afuera y están para pelear arriba, eh".`;
      tone = 'good';
    } else {
      text = `💬 ${friendName} (${f.team.name}) le mandó a ${f.player.name} el video de su triple del finde. "Aprendé", decía el mensaje.`;
    }
  }

  s.news.unshift({ week: s.week, text, tone });
  logPlayerEvent(f.player, s.seasonNumber, s.week, 'social', text.replace('💬 ', ''));
}
