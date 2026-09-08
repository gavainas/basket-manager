import { LIFE_REASON_IDS } from './absences';
import { Rng, seedFromString } from './rng';
import type { CallUpEntry, ConductRecord, GameState, MarketPlayer, Player, Presencia } from './types';

/**
 * El compromiso se descubre (T2 del diagnóstico de septiembre).
 *
 * Antes `commitment` era un número visible en cinco pantallas: sabías quién
 * era cumplidor antes de convocarlo una sola vez. Ahora el número queda
 * adentro del motor (sigue decidiendo quién falla, quién paga y quién
 * entrena) y lo que ve el jugador es la **ficha de conducta**: lo que el club
 * efectivamente vio. De ahí sale una etiqueta observada con el mismo patrón
 * que el scouting de rivales: ruido alto al principio, que baja con evidencia.
 *
 * Tres reglas le dan el sabor:
 * 1. La primera impresión puede mentir: la etiqueta sale de hechos al azar, y
 *    el que arranca cumpliendo puede aflojar (por eso guardamos las últimas).
 * 2. Las referencias al fichar son interesadas: el amigo miente por lealtad,
 *    el ex DT exagera para sacárselo de encima (ver `marketReference`).
 * 3. El asado y la convocatoria son herramientas de información, no sólo de
 *    humor: cada una escribe en la ficha.
 */

export function emptyRecord(): ConductRecord {
  return {
    convocado: 0,
    presente: 0,
    avisoATiempo: 0,
    faltoSinAvisar: 0,
    cuotaEnFecha: 0,
    cuotaTarde: 0,
    asadosInvitado: 0,
    asadosFue: 0,
    ultimas: [],
  };
}

/** La ficha para leer: los saves viejos no la tienen y arrancan en cero. */
export function recordOf(p: Player): ConductRecord {
  return p.record ?? emptyRecord();
}

/** La ficha para escribir: se crea al primer hecho. */
function touch(p: Player): ConductRecord {
  if (!p.record) p.record = emptyRecord();
  return p.record;
}

/** Motivos de ausencia que cuentan como "avisó": la vida, la agenda pactada, el momento del mundo. */
const AVISADOS = new Set<string>([...LIFE_REASON_IDS, 'agenda', 'momento']);

/**
 * Cómo se cuenta una respuesta a la convocatoria. `null` si no cuenta: el
 * lesionado no falta, está lesionado. El fundido al que VOS mandaste a
 * descansar vino: es tu decisión, no su falta.
 */
export function presenciaDe(e: CallUpEntry): Presencia | null {
  if (e.status === 'lesionado') return null;
  if (e.status === 'confirmado') return 'p';
  if (e.exhausted && e.resolved) return 'p';
  if (e.lastMinute) return 'f';
  if (e.reasonId && AVISADOS.has(e.reasonId)) return 'a';
  return 'f';
}

/**
 * Anota la convocatoria de la semana en la ficha de cada uno. Se llama al
 * salto inicial, cuando la lista ya es definitiva: después de las gestiones
 * (el que diste vuelta cuenta como presente) y de las bajas sobre la hora.
 */
export function recordCallUpConduct(s: GameState): void {
  for (const e of s.callUp) {
    const p = s.players.find((x) => x.id === e.playerId);
    if (!p || p.leftClub) continue;
    const k = presenciaDe(e);
    if (!k) continue;
    const r = touch(p);
    r.convocado += 1;
    if (k === 'p') r.presente += 1;
    else if (k === 'a') r.avisoATiempo += 1;
    else r.faltoSinAvisar += 1;
    r.ultimas = [...r.ultimas, k].slice(-8);
  }
}

/** La cuota de la semana: pagó en fecha o debe. */
export function recordFee(p: Player, paid: boolean): void {
  const r = touch(p);
  if (paid) r.cuotaEnFecha += 1;
  else r.cuotaTarde += 1;
}

/** El asado: lo invitaste, y fue o no fue. */
export function recordAsado(p: Player, went: boolean): void {
  const r = touch(p);
  r.asadosInvitado += 1;
  if (went) r.asadosFue += 1;
}

// ---------- La etiqueta observada ----------

export type ConductCls = '' | 'good' | 'warn' | 'bad';

export interface ConductReading {
  /** La frase entera, para la ficha. */
  label: string;
  /** La versión corta, para una columna de planilla. */
  short: string;
  cls: ConductCls;
  /** Los hechos detrás de la frase. */
  detail: string;
  /** Cuánta evidencia hay: nada (0-2 fechas), primeras (3-5), firme (6+). */
  nivel: 'nada' | 'primeras' | 'firme';
}

function detailOf(r: ConductRecord): string {
  const parts: string[] = [];
  if (r.convocado > 0) {
    let s = `Vino a ${r.presente} de ${r.convocado} fecha${r.convocado === 1 ? '' : 's'}`;
    if (r.avisoATiempo > 0) s += `, avisó ${r.avisoATiempo}`;
    if (r.faltoSinAvisar > 0) s += `, faltó sin avisar ${r.faltoSinAvisar}`;
    parts.push(s + '.');
  }
  const cuotas = r.cuotaEnFecha + r.cuotaTarde;
  if (cuotas > 0) {
    parts.push(r.cuotaTarde === 0 ? 'La cuota, siempre en fecha.' : `Debió la cuota ${r.cuotaTarde} de ${cuotas} semanas.`);
  }
  if (r.asadosInvitado > 0) {
    parts.push(`Asados: fue a ${r.asadosFue} de ${r.asadosInvitado}.`);
  }
  return parts.join(' ');
}

/** Lo que el club puede decir de él hoy, con la evidencia que tiene. */
export function conductLabel(p: Player): ConductReading {
  const r = recordOf(p);
  const n = r.convocado;
  const faltas = r.faltoSinAvisar;
  const detail = detailOf(r);

  if (n < 3) {
    return {
      label: 'Recién llega: no sabemos de qué palo es',
      short: 'No sabemos todavía',
      cls: '',
      detail: n === 0 ? 'Todavía no lo convocaste a ninguna fecha.' : detail,
      nivel: 'nada',
    };
  }

  if (n <= 5) {
    if (faltas === 0) return { label: 'Parece de los que están', short: 'Parece que está', cls: 'good', detail, nivel: 'primeras' };
    if (faltas === 1) return { label: 'Faltó una vez: todavía no dice nada', short: 'Una falta', cls: '', detail, nivel: 'primeras' };
    return { label: `Ya faltó ${faltas} veces`, short: `Ya faltó ${faltas}`, cls: 'warn', detail, nivel: 'primeras' };
  }

  const ratioF = faltas / n;
  const ratioP = r.presente / n;
  let reading: ConductReading;
  if (ratioF <= 0.1 && ratioP >= 0.75) {
    reading = { label: 'De los que están siempre', short: 'Está siempre', cls: 'good', detail, nivel: 'firme' };
  } else if (ratioF >= 0.34) {
    reading = { label: 'Aparece cuando quiere', short: 'Cuando quiere', cls: 'bad', detail, nivel: 'firme' };
  } else {
    reading = { label: 'Va cuando puede', short: 'Cuando puede', cls: 'warn', detail, nivel: 'firme' };
  }

  // La tendencia: la primera impresión puede mentir en los dos sentidos.
  const last3 = r.ultimas.slice(-3);
  const fRecientes = last3.filter((k) => k === 'f').length;
  if (reading.cls === 'good' && fRecientes >= 2) {
    reading.detail = `Ojo: de las últimas tres, faltó ${fRecientes} sin avisar. ${detail}`;
    reading.cls = 'warn';
  } else if (reading.cls === 'bad' && last3.length === 3 && last3.every((k) => k === 'p')) {
    reading.detail = `Viene enderezándose: las últimas tres, presente. ${detail}`;
    reading.cls = 'warn';
  }
  return reading;
}

/** Para ordenar una planilla por conducta: sin evidencia va al final. */
export function conductScore(p: Player): number {
  const r = recordOf(p);
  if (r.convocado < 3) return -1;
  return Math.round((r.presente / r.convocado) * 100 - (r.faltoSinAvisar / r.convocado) * 50);
}

/** Lo que se dice de un jugador de otro club: fama, no ficha. */
export function famaDeCumplidor(commitment: number): string {
  if (commitment >= 70) return 'Tiene fama de cumplidor: dicen que no falta nunca.';
  if (commitment >= 50) return 'Dicen que va cuando puede.';
  return 'Tiene fama de faltador.';
}

// ---------- Las referencias al fichar ----------

export interface MarketReference {
  /** Quién habla. */
  who: string;
  /** Lo que dice, tal cual. */
  quote: string;
}

type Tier = 'alto' | 'medio' | 'bajo';
const tierOf = (v: number): Tier => (v >= 70 ? 'alto' : v >= 50 ? 'medio' : 'bajo');

const AMIGO: Record<Tier, string> = {
  alto: '"Es buena gente, paga la cuota, eso seguro. Traelo."',
  medio: '"Es de los que están. Alguna vez falla, como todos, pero está."',
  bajo: '"Un poco colgado, no te voy a mentir… pero cuando viene, viene."',
};
const EX_COMPANERO: Record<Tier, string> = {
  alto: '"Nunca faltó a un partido, y era el primero en llegar al asado."',
  medio: '"Cumple. Con el laburo a veces se le complica, pero avisa."',
  bajo: '"Mirá, jugador es. Después… no le pidas la cuota en fecha."',
};
const EX_DT: Record<Tier, string> = {
  alto: '"Un soldado. Te lo firmo. Y si lo llevás, mejor para todos."',
  medio: '"Rinde, y con un DT que lo cuide rinde más. Yo no tuve tiempo."',
  bajo: '"Talento tiene. Lo demás se trabaja. Llevátelo, dale."',
};
const RUMORES: Record<Tier, string> = {
  alto: 'Dicen que es un fierro: que no falta nunca.',
  medio: 'Dicen que va cuando puede.',
  bajo: 'Dicen que aparece cuando quiere. Dicen.',
};

/**
 * Al fichar no ves conducta: ves lo que dice quien lo trajo, y cada uno tiene
 * su interés. Tu gente miente por lealtad, el ex compañero es el más honesto,
 * el ex DT exagera para sacárselo de encima, y el barrio dice cualquier cosa.
 * El sesgo va en el número (la frase sale de la escala de siempre), con
 * semilla fija por jugador: la referencia no cambia cada vez que la mirás.
 */
export function marketReference(mp: MarketPlayer): MarketReference {
  const rng = new Rng(seedFromString(`ref_${mp.id}_${mp.name}`));
  // La libreta del modo Carrera: al que abrió su agenda para traerlo lo
  // recomienda como recomienda un amigo, por lealtad.
  if (mp.viaDe && mp.viaDe !== 'vos') {
    return { who: `${mp.viaDe}, que lo trae`, quote: AMIGO[tierOf(mp.commitment + rng.int(8, 20))] };
  }
  switch (mp.knowledge) {
    case 'desconocido':
      return { who: 'Nadie que conozcas', quote: 'No hay a quién preguntarle: es una apuesta.' };
    case 'poco_conocido':
      return { who: 'Lo que se dice por ahí', quote: RUMORES[tierOf(mp.commitment + rng.int(-18, 18))] };
    case 'referencias':
      return { who: 'Su ex DT', quote: EX_DT[tierOf(mp.commitment + rng.int(4, 16))] };
    case 'conocido':
      return { who: 'Un ex compañero', quote: EX_COMPANERO[tierOf(mp.commitment + rng.int(-4, 8))] };
    case 'muy_conocido':
      return { who: 'Tu gente del plantel', quote: AMIGO[tierOf(mp.commitment + rng.int(8, 20))] };
  }
}
