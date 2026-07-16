import { SAVE_VERSION } from '../game/week';
import { appearanceFromSeed } from '../game/appearance';
import { buildCoachMarket } from '../game/coach';
import { suggestRotation } from '../game/match';
import { buildWorld } from '../game/world';
import { Rng, seedFromString as seedFrom } from '../game/rng';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { RIVALS } from '../data/rivals';
import { USER_DIVISION_ID } from '../data/worldData';
import { rollBackground } from '../data/backgrounds';
import type { GameState } from '../game/types';

const KEY = 'basket-manager-save-v1';

/** Devuelve false si el guardado falló (storage bloqueado o lleno). */
export function saveGame(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    // Sin espacio o storage bloqueado: el juego sigue sin guardar.
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // Migración liviana: v2 solo carece del palmarés.
    if (parsed.saveVersion === 2) {
      parsed.pastSeasons = parsed.pastSeasons ?? [];
      parsed.saveVersion = 3;
    }
    // v3 → v4: se agregó la rotación elegible.
    if (parsed.saveVersion === 3) {
      parsed.rotation = suggestRotation(parsed.players, parsed.starters);
      parsed.saveVersion = 4;
    }
    // v4 → v5: contadores de entrenamiento por jugador.
    if (parsed.saveVersion === 4) {
      for (const p of parsed.players) {
        p.seasonTrainings = p.seasonTrainings ?? 0;
        p.techniqueGain = p.techniqueGain ?? 0;
      }
      parsed.saveVersion = 5;
    }
    // v5 → v6: promesas y pretemporada.
    if (parsed.saveVersion === 5) {
      parsed.promises = parsed.promises ?? [];
      parsed.preseason = parsed.preseason ?? null;
      parsed.saveVersion = 6;
    }
    // v6 → v7: convocatoria, partido en vivo y estilos de los rivales.
    if (parsed.saveVersion === 6) {
      parsed.callUp = parsed.callUp ?? [];
      parsed.live = null;
      for (const r of parsed.rivals) {
        r.style = r.style ?? RIVALS.find((d) => d.id === r.id)?.style ?? 'equilibrado';
      }
      parsed.saveVersion = 7;
    }
    // v7 → v8: cambios de jugadores en el partido (el formato de live cambió).
    if (parsed.saveVersion === 7) {
      parsed.live = null;
      if (parsed.phase === 'match') parsed.phase = 'lineup';
      parsed.saveVersion = 8;
    }
    // v8 → v9: ficha personal del jugador (datos, historial y timeline).
    if (parsed.saveVersion === 8) {
      for (const p of parsed.players) {
        const rng = new Rng(seedFrom(p.id + p.name));
        const bg = rollBackground(p.position, rng);
        p.height = p.height ?? bg.height;
        p.hand = p.hand ?? bg.hand;
        p.profession = p.profession ?? bg.profession;
        p.previousTeam = p.previousTeam ?? bg.previousTeam;
        p.joinedSeason = p.joinedSeason ?? 1;
        p.matchLog = p.matchLog ?? [];
        p.timeline = p.timeline ?? [
          { season: p.joinedSeason, week: 0, kind: 'llegada', text: 'Llegó al club.' },
        ];
      }
      parsed.saveVersion = 9;
    }
    // v9 → v10: planilla de estadísticas (puntos, rebotes, asistencias).
    if (parsed.saveVersion === 9) {
      for (const p of parsed.players) {
        for (const m of p.matchLog) {
          m.points = m.points ?? 0;
          m.rebounds = m.rebounds ?? 0;
          m.assists = m.assists ?? 0;
        }
      }
      for (const r of parsed.history) r.box = r.box ?? [];
      if (parsed.lastMatch) parsed.lastMatch.box = parsed.lastMatch.box ?? [];
      if (parsed.live) {
        parsed.live.stats = parsed.live.stats ?? Object.fromEntries(
          parsed.live.squad.map((id: string) => [id, { pts: 0, reb: 0, ast: 0 }])
        );
      }
      parsed.saveVersion = 10;
    }
    // v10 → v11: historia del club (sembrada con los momentos memorables).
    if (parsed.saveVersion === 10) {
      parsed.clubTimeline =
        parsed.clubTimeline ??
        parsed.memorableMoments.map((text: string) => ({
          season: parsed.seasonNumber,
          week: 0,
          kind: 'partido',
          text,
        }));
      parsed.saveVersion = 11;
    }
    // v11 → v12: el mundo (ligas, equipos, jugadores rivales, fixture).
    if (parsed.saveVersion === 11) {
      parsed.world = buildWorld(parsed, new Rng(seedFrom(`world_${parsed.seed}`)));
      // El formato del partido en vivo cambió: si había uno a medias, vuelve al quinteto.
      parsed.live = null;
      if (parsed.phase === 'match') parsed.phase = 'lineup';
      parsed.saveVersion = 12;
    }
    // v12 → v13: playoffs (Copa de Oro / Copa de Plata).
    if (parsed.saveVersion === 12) {
      parsed.playoffs = parsed.playoffs ?? null;
      parsed.saveVersion = 13;
    }
    // v13 → v14: ficha institucional del club (fundación y prestigio).
    if (parsed.saveVersion === 13) {
      for (const c of parsed.world.clubs) {
        const rng = new Rng(seedFrom(`club_${c.id}`));
        const rival = parsed.rivals.find((r) => `cl_${r.id}` === c.id);
        c.founded = c.founded ?? (c.isUser ? 2026 - parsed.seasonNumber : 2025 + parsed.seasonNumber - rng.int(4, 45));
        c.sportPrestige =
          c.sportPrestige ??
          (c.isUser
            ? parsed.club.sportPrestige
            : Math.max(15, Math.min(90, Math.round((rival?.strength ?? 50) + rng.int(-8, 8)))));
        c.socialPrestige = c.socialPrestige ?? (c.isUser ? parsed.club.socialPrestige : rng.int(30, 80));
      }
      parsed.saveVersion = 14;
    }
    // v14 → v15: retrato persistente por jugador (congela la cara aunque el
    // generador gane variantes más adelante).
    if (parsed.saveVersion === 14) {
      for (const p of parsed.players) {
        p.appearance = p.appearance ?? appearanceFromSeed(p.id, p.age);
      }
      parsed.saveVersion = 15;
    }
    // v15 → v16: cuerpo técnico (DT y candidatos de la temporada).
    if (parsed.saveVersion === 15) {
      parsed.coach = parsed.coach ?? null;
      parsed.coachMarket = parsed.coachMarket ?? buildCoachMarket(parsed.seasonNumber, parsed.seed);
      for (const t of parsed.world.teams) {
        if (t.legacyRivalId && t.legacyRivalId !== 'club' && !t.coachName) {
          const rng = new Rng(seedFrom(`dt_${t.id}`));
          const rival = parsed.rivals.find((r) => r.id === t.legacyRivalId);
          t.coachName = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
          t.coachType = (rival?.strength ?? 50) >= 68 ? 'pago' : rng.chance(0.25) ? 'jugador' : 'honorario';
        }
      }
      parsed.saveVersion = 16;
    }
    // v16 → v17: amigo a prueba (entrena una semana antes de decidir sumarlo).
    if (parsed.saveVersion === 16) {
      parsed.trialCandidate = parsed.trialCandidate ?? null;
      parsed.saveVersion = 17;
    }
    // v17 → v18: la divisional del club pasa a ser estado (habilita ascensos/descensos).
    if (parsed.saveVersion === 17) {
      parsed.divisionId = parsed.divisionId ?? USER_DIVISION_ID;
      parsed.saveVersion = 18;
    }
    if (parsed.saveVersion !== SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignorar
  }
}
