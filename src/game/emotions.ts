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

/** Hash estable para elegir una frase distinta por jugador y semana. */
function textSeed(id: string, salt: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) + salt * 13) >>> 0;
}

export function moodFor(p: Player, ctx: EmotionContext, salt = 0): PlayerMood {
  const e = pickEmotion(p, ctx);
  return { playerId: p.id, name: p.name, emotion: e, label: LABELS[e], text: moodText(e, ctx, textSeed(p.id, salt)) };
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

/** Frases de vestuario por emoción: varias por caso, para que no se repitan. */
function moodText(e: PlayerEmotion, ctx: EmotionContext, seed: number): string {
  const pick = (options: string[]) => options[seed % options.length];
  switch (e) {
    case 'euforico':
      return ctx.bigGame
        ? pick([
            '"Estos partidos son los que uno juega toda la semana en la cabeza. ¡Vamos!"',
            '"Para esto uno banca todo el año: qué noche, por favor."',
            '"Que alguien guarde la planilla de hoy, la quiero enmarcar."',
          ])
        : pick([
            '"Noche redonda: ganamos y me salió todo. A festejarlo con una birra."',
            '"Hoy entraba todo. Hasta la de tres que tiré cayendo casi de espaldas."',
            '"Avisen en el grupo que la próxima ronda la pago yo."',
          ]);
    case 'orgulloso':
      return pick([
        '"Cuando el equipo me necesitó, estuve. De esto se trata."',
        '"Los años no vienen solos, pero hoy respondí. Contento por el grupo."',
        '"Me tocó dar un paso al frente y lo di. Así se gana."',
      ]);
    case 'contento':
      return pick([
        '"Entré, defendí y ayudé al equipo. Buen triunfo."',
        '"Cumplí con lo mío y nos llevamos el partido. Bien ahí."',
        '"Buen clima, buen partido. Así dan ganas de venir a entrenar."',
      ]);
    case 'conforme':
      return pick([
        '"Se hizo lo que había que hacer. Semana que viene, más."',
        '"Partido cumplido. Ahora a casa, que mañana madrugo."',
        '"Bien. Sin mucho más para decir: bien."',
      ]);
    case 'indiferente':
      return pick([
        '"Otro partido más. Nos vemos el lunes."',
        '"¿Terminó? Bueno, avisen a qué hora es el próximo."',
        '"Yo vengo, juego lo que me toque y no molesto."',
      ]);
    case 'frustrado':
      return ctx.won
        ? pick([
            '"Ganamos, bárbaro. Pero yo mirando de afuera no sumo nada."',
            '"Me alegro por el grupo, en serio. Ahora, ¿yo para qué me cambio?"',
            '"Buena victoria. Igual algún día me gustaría participar, digo."',
          ])
        : pick([
            '"Así no. Algo tenemos que cambiar, y rápido."',
            '"Perder se pierde, pero así duele el doble."',
            '"Me voy caliente. Mejor no me hablen hasta el jueves."',
          ]);
    case 'molesto_minutos':
      return ctx.won
        ? pick([
            `"Ganamos, pero para jugar ${ctx.minutes || 'cero'} minutos no sé para qué vengo."`,
            '"Felicitaciones a los que jugaron. Yo vine a hidratarme, parece."',
            '"Buenísimo el triunfo. Yo de espectador lo disfruté igual, eh."',
          ])
        : pick([
            '"Perdimos y ni siquiera me dieron la chance de ayudar. Doble bronca."',
            '"Ni cuando va perdiendo el equipo me miran al banco. Tomo nota."',
            '"Para mirar desde afuera me quedo en casa, que la silla es más cómoda."',
          ]);
    case 'decepcionado':
      return pick([
        '"Hoy no estuve. El equipo merecía más de mí."',
        '"Noche para el olvido. La próxima la pago con creces."',
        '"No me salió una. Prefiero ni ver el video del partido."',
      ]);
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
