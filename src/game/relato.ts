// El relato jugada a jugada (sep 2026, segundo paso de la referencia del
// partido). El motor simula por tramos de dos minutos: decide cuántos puntos
// hizo cada uno de los nuestros (`tramo.box`) y cuántos el rival. Acá esos
// puntos se convierten en canastas con minuto, marcador parcial y autor, de
// las dos camisetas, y lo que pasó en cada pelota muerta (cambios, minutos
// pedidos, la lesión) entra como una fila más en su minuto. Es lectura:
// determinista por partido, cuarto y tramo (semilla propia, no toca el RNG de
// la temporada), y suma exactamente lo que dice el marcador. Los cuartos sin
// tramos (partidas guardadas antes, el suplementario) se cuentan enteros.

import { cuartoN, rivalLineup, rivalQuarterBox, rivalTramoBox, TRAMOS_POR_CUARTO } from './match';
import { Rng, seedFromString } from './rng';
import type { GameState, LiveMatchState, LiveQuarter } from './types';

export interface Jugada {
  /** Minuto del partido ("7'"), acumulado entre cuartos. */
  minuto: string;
  /** El mismo instante como número (minutos del partido, con decimales): lo usa el reloj en vivo. */
  t: number;
  /** Marcador después de la jugada, "nosotros-ellos". */
  marcador: string;
  /** Marcador después de la jugada, en números. */
  f: number;
  a: number;
  lado: 'nosotros' | 'rival';
  pts: number;
  /** Quién anotó: id del jugador nuestro o de la persona del mundo rival (vacío si el rival no tiene plantel conocido, o si no es una canasta). */
  quienId: string;
  texto: string;
  sub?: string;
  /** Sin tipo es una canasta; 'cambio' es una entrada o salida; 'nota' es lo demás de la pelota muerta (minuto pedido, lesión, presión). */
  tipo?: 'cambio' | 'nota';
}

/** Corta los puntos de un jugador en canastas: triples, dobles y algún libre. */
function canastas(pts: number, rng: Rng): number[] {
  const out: number[] = [];
  let rest = pts;
  while (rest > 0) {
    if (rest >= 3 && rng.chance(0.28)) out.push(3);
    else if (rest >= 2 && (rest !== 3 || rng.chance(0.6))) out.push(2);
    else out.push(1);
    rest -= out[out.length - 1];
  }
  return out;
}

function apellido(nombre: string): string {
  const parts = nombre.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/);
  return parts[parts.length - 1];
}

const NUESTRAS: Record<number, string[]> = {
  3: ['¡Triple de {n}!', '{n} clava el triple desde la esquina.', 'Triple de {n} en transición.', '{n} la tira de lejos y la mete.'],
  2: [
    '{n} recibe de espaldas, gira y convierte.',
    'Bandeja de {n}.',
    '{n} la mete tras el rebote ofensivo.',
    'Doble de {n} en el poste bajo.',
    '{n} entra por el medio y convierte.',
    '{n} suma dos más.',
    '{n} define de media distancia.',
  ],
  1: ['{n} mete el libre.', 'Un libre de {n}.', '{n} convierte uno de dos desde la línea.'],
};

const RIVALES: Record<number, string[]> = {
  3: ['Triple de {n}.', '{n} la mete de tres sin marca.', 'Triple de {n} desde la esquina.'],
  2: [
    '{n} insiste en la pintura.',
    '{n} convierte de media distancia.',
    'Bandeja de {n} en contraataque.',
    '{n} gana el rebote y la mete.',
    '{n} anota de espaldas al aro.',
    '{n} suma dos.',
  ],
  1: ['Libre de {n}.', '{n} mete uno desde la línea.'],
};

const SUB_NUESTRAS = [
  'Gran lectura de {a} en la jugada.',
  'La asistencia fue de {a}.',
  'Se pidió la pelota y la puso.',
  '{a} lo encontró solo.',
  'El equipo la movió hasta encontrarlo.',
];

const SUB_RIVALES = ['Nos cuesta cerrar el rebote.', 'Llegamos tarde a la ayuda.', 'Nos ganaron la espalda.', 'Se nos escapó en la rotación.'];

const MOMENTOS_POR_CUARTO = 5;

/** Cuánto dura un cuarto en el reloj del partido (el suplementario, la mitad). */
export function largoDelCuarto(overtime?: boolean): number {
  return overtime ? 5 : 10;
}

/** Minuto del partido en el que arranca un cuarto. */
export function arranqueDelCuarto(live: LiveMatchState, qIndex: number): number {
  return live.quarters.slice(0, qIndex).reduce((t, x) => t + largoDelCuarto(x.overtime), 0);
}

/** Cuánto dura un tramo del cuarto en el reloj (el suplementario es un solo tramo). */
export function largoDelTramo(q: Pick<LiveQuarter, 'overtime'>): number {
  return q.overtime ? largoDelCuarto(true) : largoDelCuarto(false) / TRAMOS_POR_CUARTO;
}

/** Un cambio o una nota de la pelota muerta, como fila del relato. */
function filaDeNota(n: string, t: number, minuto: number, f: number, a: number): Jugada {
  const cambio = /cambio|entra |unidad|cerradores|titulares|movió el banco|🕘/i.test(n) && !n.startsWith('🚑');
  return { minuto: `${minuto}'`, t, marcador: `${f}-${a}`, f, a, lado: 'nosotros', pts: 0, quienId: '', texto: n, tipo: cambio ? 'cambio' : 'nota' };
}

interface Reparto {
  box: Record<string, number>;
  onCourt: string[];
  against: number;
  rivalBox: Record<string, number>;
  /** Lo que pasó en la pelota muerta antes de este tramo. */
  notas: string[];
}

/**
 * Las canastas de un reparto (un tramo, o un cuarto entero) en [t0, t0 + largo),
 * con el marcador corriendo desde f/a. Devuelve las jugadas y el marcador final.
 */
function jugadasDelReparto(
  state: GameState,
  live: LiveMatchState,
  r: Reparto,
  seed: string,
  t0: number,
  largo: number,
  base: number,
  f0: number,
  a0: number
): { jugadas: Jugada[]; f: number; a: number } {
  const rng = new Rng(seedFromString(seed));
  const nombreDe = (id: string) => state.players.find((p) => p.id === id)?.name ?? '';
  const rivalCourt = rivalLineup(state, live).court;

  type Evento = { lado: 'nosotros' | 'rival'; pts: number; quien: string; quienId: string; orden: number };
  const eventos: Evento[] = [];
  for (const [id, pts] of Object.entries(r.box)) {
    for (const c of canastas(pts, rng)) eventos.push({ lado: 'nosotros', pts: c, quien: apellido(nombreDe(id)), quienId: id, orden: rng.next() });
  }
  for (const p of rivalCourt) {
    for (const c of canastas(r.rivalBox[p.id] ?? 0, rng)) eventos.push({ lado: 'rival', pts: c, quien: p.lastName, quienId: p.id, orden: rng.next() });
  }
  // Si el rival no tiene plantel conocido, sus puntos igual entran al marcador.
  const rivalSinNombre = r.against - Object.values(r.rivalBox).reduce((t, n) => t + n, 0);
  for (const c of canastas(Math.max(0, rivalSinNombre), rng)) eventos.push({ lado: 'rival', pts: c, quien: live.rivalName, quienId: '', orden: rng.next() });
  eventos.sort((a, b) => a.orden - b.orden);

  const minutoDe = (t: number) => base + Math.max(1, Math.ceil(t - base));
  const jugadas: Jugada[] = [];
  let f = f0;
  let a = a0;
  // La pelota muerta abre el tramo: los cambios y las notas, antes de la primera canasta.
  // La lesión y el cambio de defensa del rival cierran el tramo: pasan al
  // final (del rival te enterás viéndolos jugar, no antes).
  const alFinal = (n: string) => n.startsWith('🚑') || n.startsWith('🛡');
  const lesion = r.notas.filter(alFinal);
  r.notas.filter((n) => !alFinal(n)).forEach((n, i) => jugadas.push(filaDeNota(n, t0 + i * 0.01, minutoDe(t0), f, a)));

  const compañeros = r.onCourt.map(nombreDe).filter(Boolean).map(apellido);
  eventos.forEach((e, i) => {
    if (e.lado === 'nosotros') f += e.pts;
    else a += e.pts;
    // Cada canasta cae en su parte del tramo, con un poco de ruido para que
    // no vengan a intervalos exactos; la última siempre antes de la pelota muerta.
    const paso = largo / eventos.length;
    const t = t0 + Math.min(largo - 0.05, paso * (i + 0.35 + rng.range(0, 0.55)));
    const pool = e.lado === 'nosotros' ? NUESTRAS[e.pts] : RIVALES[e.pts];
    const texto = rng.pick(pool).replace('{n}', e.quien);
    let sub: string | undefined;
    if (e.lado === 'nosotros' && rng.chance(0.4)) {
      const otro = compañeros.filter((n) => n !== e.quien);
      sub = rng.pick(SUB_NUESTRAS).replace('{a}', otro.length ? rng.pick(otro) : 'el equipo');
    } else if (e.lado === 'rival' && rng.chance(0.3)) {
      sub = rng.pick(SUB_RIVALES);
    }
    jugadas.push({ minuto: `${minutoDe(t)}'`, t, marcador: `${f}-${a}`, f, a, lado: e.lado, pts: e.pts, quienId: e.quienId, texto, sub });
  });
  lesion.forEach((n, i) => jugadas.push(filaDeNota(n, t0 + largo - 0.03 + i * 0.005, minutoDe(t0 + largo - 0.03), f, a)));
  return { jugadas, f, a };
}

/**
 * TODAS las jugadas de un cuarto (jugado o en curso), en el orden del reloj,
 * con el marcador después de cada una: las canastas, y en cada pelota muerta
 * los cambios y las notas. Es lo que el reloj en vivo va soltando minuto a
 * minuto. Devuelve [] si el cuarto todavía no tiene planilla (partidas
 * guardadas antes de este relato).
 */
export function jugadasDelCuarto(state: GameState, live: LiveMatchState, qIndex: number): Jugada[] {
  const q = cuartoN(live, qIndex);
  if (!q || !q.box) return [];
  const base = arranqueDelCuarto(live, qIndex);
  const largo = largoDelCuarto(q.overtime);
  const antes = live.quarters.slice(0, qIndex).reduce((t, x) => ({ f: t.f + x.for, a: t.a + x.against }), { f: 0, a: 0 });
  const claveBase = `relato:${live.rivalId}:${state.week}:${qIndex}`;

  if (!q.tramos || q.tramos.length === 0) {
    const r: Reparto = { box: q.box, onCourt: q.onCourt ?? [], against: q.against, rivalBox: rivalQuarterBox(state, live, qIndex), notas: [] };
    return jugadasDelReparto(state, live, r, `${claveBase}:${q.for}:${q.against}`, base, largo, base, antes.f, antes.a).jugadas;
  }

  const largoTramo = largoDelTramo(q);
  const todas: Jugada[] = [];
  let f = antes.f;
  let a = antes.a;
  q.tramos.forEach((t, k) => {
    const r: Reparto = { box: t.box, onCourt: t.onCourt, against: t.against, rivalBox: rivalTramoBox(state, live, qIndex, k), notas: t.notes ?? [] };
    const out = jugadasDelReparto(state, live, r, `${claveBase}:${k}:${t.for}:${t.against}`, base + k * largoTramo, largoTramo, base, f, a);
    todas.push(...out.jugadas);
    f = out.f;
    a = out.a;
  });
  return todas;
}

/**
 * Los momentos de un cuarto: hasta cinco canastas repartidas a lo largo, con el
 * cierre siempre. Para leer un cuarto ya jugado sin la lista entera.
 */
export function momentosDelCuarto(state: GameState, live: LiveMatchState, qIndex: number): Jugada[] {
  const todas = jugadasDelCuarto(state, live, qIndex).filter((j) => !j.tipo);
  if (todas.length <= MOMENTOS_POR_CUARTO) return todas;
  const elegidas: Jugada[] = [];
  for (let k = 0; k < MOMENTOS_POR_CUARTO; k++) {
    const idx = Math.round(((k + 1) / MOMENTOS_POR_CUARTO) * (todas.length - 1));
    if (!elegidas.includes(todas[idx])) elegidas.push(todas[idx]);
  }
  return elegidas;
}
