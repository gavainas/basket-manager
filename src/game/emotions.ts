// Estado emocional de cada jugador al terminar el partido: depende del
// resultado, sus minutos, su rendimiento, su rol esperado, su personalidad
// y las promesas que le hiciste. Centraliza los textos del vestuario.

import type { ClubPromise, GrievanceCause, Player, PlayerMood, PlayerEmotion } from './types';

export interface EmotionContext {
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
  /** Nivel de la queja que ya venía arrastrando (0 = ninguna): la bronca escala. */
  grievanceLevel?: number;
  /** Semanas que lleva con esa bronca, para que el reclamo tenga memoria. */
  grievanceWeeks?: number;
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

export function moodFor(p: Player, ctx: EmotionContext, salt = 0, used?: Set<string>): PlayerMood {
  const e = pickEmotion(p, ctx);
  return {
    playerId: p.id,
    name: p.name,
    emotion: e,
    label: LABELS[e],
    text: moodText(e, ctx, textSeed(p.id, salt), used),
    cause: causeOf(e, ctx),
  };
}

/**
 * Los humores de todo el plantel de una sola pasada, sin que dos jugadores
 * repitan la misma frase en la misma pantalla (cuatro tipos diciendo "hoy
 * entraba todo" era la marca de la casa, y no en el buen sentido).
 */
export function buildMoods(
  players: Player[],
  ctxOf: (p: Player) => EmotionContext,
  salt = 0
): PlayerMood[] {
  const used = new Set<string>();
  return players.map((p) => moodFor(p, ctxOf(p), salt, used));
}

/**
 * La causa de queja del partido, sin armar el texto: el informe necesita
 * saberlo ANTES de escribir la frase, para que la frase ya salga escalada.
 */
export function moodCauseFor(p: Player, ctx: EmotionContext): GrievanceCause | undefined {
  return causeOf(pickEmotion(p, ctx), ctx);
}

/** ¿Esto que sintió es materia de queja con el club? (lo consume `mood.ts`) */
function causeOf(e: PlayerEmotion, ctx: EmotionContext): GrievanceCause | undefined {
  if (e === 'molesto_minutos') return 'minutos';
  // El frustrado de la derrota no te reclama nada: el que quedó afuera de la
  // lista queriendo jugar, sí.
  if (e === 'frustrado' && !ctx.inSquad) return 'minutos';
  return undefined;
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
  // El que no pisó la cancha no habla como si hubiera jugado: sin minutos no
  // hay "entré, defendí y ayudé". Va antes que cualquier frase de partido.
  if (ctx.minutes === 0) return ctx.won ? 'conforme' : 'indiferente';
  if (ctx.won) return 'contento';
  return 'conforme';
}

/**
 * Frases de vestuario por emoción. `used` es el registro de lo ya dicho en
 * esta misma pantalla: si la frase que toca ya salió, se corre a la siguiente
 * del pool en vez de repetirla.
 */
function moodText(e: PlayerEmotion, ctx: EmotionContext, seed: number, used?: Set<string>): string {
  const pick = (options: string[]) => {
    const start = seed % options.length;
    for (let i = 0; i < options.length; i++) {
      const opt = options[(start + i) % options.length];
      if (!used?.has(opt)) {
        used?.add(opt);
        return opt;
      }
    }
    return options[start]; // pool agotado: alguien va a repetir, y está bien
  };
  const weeks = ctx.grievanceWeeks ?? 0;
  switch (e) {
    case 'euforico':
      return ctx.bigGame
        ? pick([
            '"Estos partidos son los que uno juega toda la semana en la cabeza. ¡Vamos!"',
            '"Para esto uno banca todo el año: qué noche, por favor."',
            '"Que alguien guarde la planilla de hoy, la quiero enmarcar."',
            '"Llamé a mi vieja desde el vestuario. Lloramos los dos, no lo voy a negar."',
            '"Esta la contamos en el asado por diez años, mínimo."',
          ])
        : pick([
            '"Noche redonda: ganamos y me salió todo. A festejarlo con una birra."',
            '"Hoy entraba todo. Hasta la de tres que tiré cayendo casi de espaldas."',
            '"Avisen en el grupo que la próxima ronda la pago yo."',
            '"¿Vieron el aro? Estaba gigante. Hoy no fallaba ni queriendo."',
            '"Esta camiseta no se lava, eh. Trae suerte."',
            '"Días como hoy son los que le explican a mi mujer por qué juego."',
            '"Me quedaría a jugar otro partido ahora mismo, en serio."',
            '"Que no se corte, eh. Así, todas las semanas."',
          ]);
    case 'orgulloso':
      return pick([
        '"Cuando el equipo me necesitó, estuve. De esto se trata."',
        '"Los años no vienen solos, pero hoy respondí. Contento por el grupo."',
        '"Me tocó dar un paso al frente y lo di. Así se gana."',
        '"Que los pibes anoten: así se juegan estos partidos."',
        '"Hoy duermo tranquilo: cuando me buscaron, aparecí."',
        '"No siempre te toca ser el que la mete. Hoy me tocó y no la esquivé."',
        '"Después me duele todo, pero ahora no lo siento."',
      ]);
    case 'contento':
      return pick([
        '"Entré, defendí y ayudé al equipo. Buen triunfo."',
        '"Cumplí con lo mío y nos llevamos el partido. Bien ahí."',
        '"Buen clima, buen partido. Así dan ganas de venir a entrenar."',
        '"Sumé mis minutos, aporté lo mío y ganamos. No pido más nada."',
        '"De a poco me voy soltando. Y si el equipo gana, todo vale doble."',
        '"Los minutos que me dieron los aproveché. Es lo que hay que hacer."',
        '"Salimos todos enteros y ganamos. ¿Qué más querés?"',
      ]);
    case 'conforme':
      // El que no jugó no puede hablar del partido como si lo hubiera jugado.
      return ctx.minutes === 0
        ? pick([
            '"Ganamos, que es lo que importa. Yo hoy fui hinchada."',
            '"Desde el banco se ve todo más fácil, eh. Bien el equipo."',
            '"No jugué, pero me vuelvo contento igual. Se ganó."',
            '"Alentando también se suma. Hoy me tocó eso."',
            '"Tranquilo, ya va a llegar mi partido. Hoy jugaron bien los que jugaron."',
          ])
        : pick([
            '"Se hizo lo que había que hacer. Semana que viene, más."',
            '"Partido cumplido. Ahora a casa, que mañana madrugo."',
            '"Bien. Sin mucho más para decir: bien."',
            '"Ni para enmarcar ni para quemar: un partido más."',
            '"Contento por el grupo. Lo mío, correcto: hice mi trabajo."',
            '"Ni lo mejor ni lo peor. Se jugó y listo."',
            '"Lo importante es que no se lesionó nadie."',
          ]);
    case 'indiferente':
      return pick([
        '"Otro partido más. Nos vemos el lunes."',
        '"¿Terminó? Bueno, avisen a qué hora es el próximo."',
        '"Yo vengo, juego lo que me toque y no molesto."',
        '"Todo bien, todo bien. ¿Alguien me acerca hasta el centro?"',
        '"Cumplí. Si el DT está conforme, yo también. Más o menos."',
        '"Se perdió. Pasa. Mañana laburo temprano igual."',
        '"Ni me despeiné hoy. En fin, la semana que viene será."',
      ]);
    case 'frustrado':
      // Si ya viene con bronca acumulada, la frase deja de ser una queja suelta
      // y pasa a tener memoria: es la misma historia, más adentro.
      if (!ctx.inSquad && (ctx.grievanceLevel ?? 0) >= 2) {
        return (ctx.grievanceLevel ?? 0) >= 3
          ? pick([
              `"${weeks} semanas sin entrar en la lista. Ya está, me quedó claro dónde estoy parado."`,
              '"No me avises más para el partido, avisame cuando me necesites de verdad."',
              '"Vengo, me cambio, miro y me voy. Un día de estos dejo de venir."',
            ])
          : pick([
              `"Otra vez afuera de la lista. Van ${weeks} semanas, ya no es casualidad."`,
              '"Che, ¿me estás bajando o es mi impresión? Preguntá al grupo, no soy solo yo."',
              '"Ni citado. Alguna explicación en algún momento me van a tener que dar."',
            ]);
      }
      return ctx.won
        ? pick([
            '"Ganamos, bárbaro. Pero yo mirando de afuera no sumo nada."',
            '"Me alegro por el grupo, en serio. Ahora, ¿yo para qué me cambio?"',
            '"Buena victoria. Igual algún día me gustaría participar, digo."',
            '"Toda la semana entrenando para terminar de asistente del bidón."',
            '"Sí, ganamos, aplaudo. ¿Se nota mucho que aplaudo con bronca?"',
          ])
        : pick([
            '"Así no. Algo tenemos que cambiar, y rápido."',
            '"Perder se pierde, pero así duele el doble."',
            '"Me voy caliente. Mejor no me hablen hasta el jueves."',
            '"Hoy no me consuela nadie. Mañana sí, hoy no."',
            '"¿Alguien anotó la patente del camión que nos pasó por arriba?"',
            '"Esto no se arregla hablando, se arregla entrenando."',
            '"No me molesta perder. Me molesta perder así."',
          ]);
    case 'molesto_minutos':
      if ((ctx.grievanceLevel ?? 0) >= 3) {
        return pick([
          `"${weeks} semanas igual. No es un mal día, es una decisión tuya y ya la entendí."`,
          '"Dejá, no me expliques nada. A fin de año hablamos, si es que sigo."',
          `"${ctx.minutes || 'Cero'} minutos otra vez. Se lo dije al grupo: así no sigo."`,
        ]);
      }
      if ((ctx.grievanceLevel ?? 0) === 2) {
        return pick([
          `"Van ${weeks} fechas con lo mismo. Ya te lo dije de buena manera, eh."`,
          '"No es el partido de hoy, es que se está haciendo costumbre."',
          '"Me estás usando de bulto para llenar la planilla. Bárbaro."',
        ]);
      }
      return ctx.won
        ? pick([
            `"Ganamos, pero para jugar ${ctx.minutes || 'cero'} minutos no sé para qué vengo."`,
            '"Felicitaciones a los que jugaron. Yo vine a hidratarme, parece."',
            '"Buenísimo el triunfo. Yo de espectador lo disfruté igual, eh."',
            '"Gran victoria. Yo hice el precalentamiento más largo de mi vida."',
            '"El banco cómodo, eso sí. Ya me hice amigo de los de la tribuna."',
            '"Me alegro, de verdad. Igual me voy con un gustito raro."',
          ])
        : pick([
            '"Perdimos y ni siquiera me dieron la chance de ayudar. Doble bronca."',
            '"Ni cuando va perdiendo el equipo me miran al banco. Tomo nota."',
            '"Para mirar desde afuera me quedo en casa, que la silla es más cómoda."',
            '"Perdimos por poco. Capaz con alguien fresco desde el banco… no sé, digo."',
            '"Yo vine a jugar. Para mirar tengo el sillón de casa, y con mate."',
            '"Perder así, sin siquiera despeinarme, es lo peor que hay."',
          ]);
    case 'decepcionado':
      return pick([
        '"Hoy no estuve. El equipo merecía más de mí."',
        '"Noche para el olvido. La próxima la pago con creces."',
        '"No me salió una. Prefiero ni ver el video del partido."',
        '"Pido disculpas al grupo. Esta semana entreno doble."',
        '"Esa pelota que regalé me va a dar vueltas en la cabeza toda la semana."',
        '"Me pesaron las piernas desde el arranque. Sin excusas igual."',
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
