// Estado emocional de cada jugador al terminar el partido: depende del
// resultado, sus minutos, su rendimiento, su rol esperado, su personalidad
// y las promesas que le hiciste. Centraliza los textos del vestuario.

import type { ClubPromise, Player, PlayerMood, PlayerEmotion } from './types';

interface EmotionContext {
  won: boolean;
  margin: number;
  minutes: number;
  rating: number | null;
  mvp: boolean;
  /** Estaba citado (jugara o no). */
  inSquad: boolean;
  /** Promesa activa de titularidad/minutos sin romper. */
  promisedMinutes: boolean;
  /** Semana de playoffs: el partido pesa más. */
  bigGame: boolean;
}

const LABELS: Record<PlayerEmotion, string> = {
  euforico: 'Eufórico',
  orgulloso: 'Orgulloso',
  contento: 'Contento',
  conforme: 'Conforme',
  indiferente: 'Indiferente',
  frustrado: 'Frustrado',
  molesto_minutos: 'Molesto por sus minutos',
  decepcionado: 'Decepcionado consigo',
};

export function moodFor(p: Player, ctx: EmotionContext): PlayerMood {
  const e = pickEmotion(p, ctx);
  return { playerId: p.id, name: p.name, emotion: e, label: LABELS[e], text: moodText(p, e, ctx) };
}

function pickEmotion(p: Player, ctx: EmotionContext): PlayerEmotion {
  const wantsMinutes =
    p.personality === 'protagonista' || p.expectedRole === 'titular' || ctx.promisedMinutes;

  // Jugó poco (o nada) y esperaba más: el resultado no lo tapa.
  if (ctx.inSquad && ctx.minutes === 0 && wantsMinutes) return 'molesto_minutos';
  if (ctx.inSquad && ctx.minutes > 0 && ctx.minutes < 15 && wantsMinutes) return 'molesto_minutos';
  if (!ctx.inSquad && wantsMinutes) return 'frustrado';

  if (ctx.mvp && ctx.won) return 'orgulloso';
  if (ctx.won && (ctx.rating ?? 0) >= 8) return 'euforico';
  if (!ctx.won && (ctx.rating ?? 5) <= 4 && ctx.minutes >= 15) return 'decepcionado';
  if (!ctx.won && p.personality === 'competitivo') return 'frustrado';
  if (ctx.won && ctx.minutes > 0) return 'contento';
  if (ctx.won) return p.personality === 'social' ? 'contento' : 'conforme';
  if (ctx.minutes === 0) return 'indiferente';
  return 'conforme';
}

function moodText(_p: Player, e: PlayerEmotion, ctx: EmotionContext): string {
  switch (e) {
    case 'euforico':
      return ctx.bigGame
        ? '"Estos partidos son los que uno juega toda la semana en la cabeza. ¡Vamos!"'
        : '"Noche redonda: ganamos y me salió todo. A festejarlo con una birra."';
    case 'orgulloso':
      return '"Cuando el equipo me necesitó, estuve. De esto se trata."';
    case 'contento':
      return '"Entré, defendí y ayudé al equipo. Buen triunfo."';
    case 'conforme':
      return '"Se hizo lo que había que hacer. Semana que viene, más."';
    case 'indiferente':
      return '"Otro partido más. Nos vemos el lunes."';
    case 'frustrado':
      return ctx.won
        ? '"Ganamos, bárbaro. Pero yo mirando de afuera no sumo nada."'
        : '"Así no. Algo tenemos que cambiar, y rápido."';
    case 'molesto_minutos':
      return ctx.won
        ? `"Ganamos, pero para jugar ${ctx.minutes || 'cero'} minutos no sé para qué vengo."`
        : '"Perdimos y ni siquiera me dieron la chance de ayudar. Doble bronca."';
    case 'decepcionado':
      return '"Hoy no estuve. El equipo merecía más de mí."';
  }
}

/** ¿Tiene promesa activa (sin romper) de titularidad o minutos esta temporada? */
export function hasMinutesPromise(promises: ClubPromise[], playerId: string, season: number): boolean {
  return promises.some(
    (pr) =>
      pr.playerId === playerId &&
      pr.season === season &&
      !pr.broken &&
      (pr.type === 'titularidad' || pr.type === 'minutos')
  );
}
