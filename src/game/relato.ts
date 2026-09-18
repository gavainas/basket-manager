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

/** Reparte puntos en aportes visuales de 1–3: no representa intentos ni tipos de tiro. */
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

// El reparto visual no conoce intentos, tipos de tiro ni asistencias por jugada:
// cuenta aportes al marcador, y no convierte una reconstrucción en hechos
// inventados (nada de "triple desde la esquina" ni "la asistencia fue de X").
//
// Pero el marcador SÍ es un hecho, y es de donde sale el color: quién anota,
// cuántos, y qué pasa con el partido cuando entran esos puntos —se empata, se
// da vuelta, se estira, van siete sin respuesta—. Esas líneas son ciertas
// siempre, y son las que hacen que el relato se lea como un partido y no como
// una planilla.
// El de un punto no canta la cifra siempre: con cinco jugadores repartiendo
// dos minutos, el motor deja muchos aportes de uno y "suma de a uno" veinte
// veces por cuarto suena a tambor. La cantidad exacta está en el marcador de
// al lado.
const PUNTOS: Record<number, string[]> = {
  1: ['Anota {n}.', 'Suma {n}.', '{n}, uno más.', 'Un punto de {n}.'],
  2: ['Dos de {n}.', '{n} suma dos.', 'Anota {n}: dos más.', 'Dos más para {n}.'],
  3: ['Tres de una para {n}.', '{n} mete tres de golpe.', 'Tres puntos juntos de {n}.'],
};

/** Contra qué defensa se jugó el tramo: es un dato del tramo, no un invento. */
const CONTRA: Record<string, string[]> = {
  zona: ['Contra la zona, ', 'Con la zona armada enfrente, '],
  hombre: ['Con marca individual encima, ', 'Mano a mano en toda la cancha, '],
  presion: ['Contra la presión, ', 'Con la presión encima, '],
};

/** Vuelve a anotar el mismo, sin que nadie del otro lado haya contestado. */
const REPITE = ['Otra vez {n}.', '{n} de nuevo.', 'Insiste {n}: {p} más.'];

/**
 * Lo que el marcador dice después de la canasta. Sale de restar dos números
 * que el motor ya calculó, así que nunca afirma nada que no haya pasado; y
 * calla cuando no hay nada que contar, que es la mayoría de las veces.
 */
function notaDelMarcador(
  antes: number,
  ahora: number,
  racha: number,
  lado: 'nosotros' | 'rival',
  f: number,
  a: number,
  rng: Rng
): string | undefined {
  const nuestra = lado === 'nosotros';
  // En un partido parejo el empate se repite mucho: no se canta siempre.
  if (ahora === 0) return rng.chance(0.7) ? rng.pick([`Partido igualado: ${f}-${a}.`, 'Quedamos iguales.', 'Todo igual.']) : undefined;
  if (antes < 0 && ahora > 0) return rng.pick([`Damos vuelta el partido: ${f}-${a}.`, 'Pasamos al frente.']);
  if (antes > 0 && ahora < 0) return rng.pick([`Se ponen arriba: ${f}-${a}.`, 'Nos pasan en el marcador.']);
  if (racha >= 7) return nuestra ? `Parcial nuestro de ${racha} sin respuesta.` : `Parcial de ${racha} del rival.`;
  if (ahora >= 10 && antes < 10) return 'Diez arriba: el partido se acomoda.';
  if (ahora <= -10 && antes > -10) return 'Diez abajo: se hace cuesta arriba.';
  if (Math.abs(ahora) === 1 && rng.chance(0.4)) return nuestra ? 'Queda todo en un punto.' : 'Nos dejan a un punto.';
  if (racha >= 5 && rng.chance(0.5)) return nuestra ? `Van ${racha} seguidos nuestros.` : `Van ${racha} seguidos de ellos.`;
  return undefined;
}

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
  const cambio = /cambio|entra |unidad|cerradores|titulares|movió el banco|🕘|📋/i.test(n) && !n.startsWith('🚑') && !n.startsWith('🟥');
  return { minuto: `${minuto}'`, t, marcador: `${f}-${a}`, f, a, lado: 'nosotros', pts: 0, quienId: '', texto: n, tipo: cambio ? 'cambio' : 'nota' };
}

interface Reparto {
  box: Record<string, number>;
  onCourt: string[];
  against: number;
  rivalBox: Record<string, number>;
  /** Lo que pasó en la pelota muerta antes de este tramo. */
  notas: string[];
  /** Con qué defensa jugó el rival el tramo, si quedó anotada. */
  defensaRival?: string;
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
  // El que anotó dos veces en estos dos minutos a veces las mete seguidas: el
  // orden ya es una reconstrucción, y juntarlas no afirma nada que no haya
  // pasado —anotó las dos acá—, pero se ve al que está caliente.
  const porAutor = new Map<string, Evento[]>();
  for (const e of eventos) {
    const k = `${e.lado}:${e.quienId || e.quien}`;
    porAutor.set(k, [...(porAutor.get(k) ?? []), e]);
  }
  for (const suyas of porAutor.values()) {
    if (suyas.length < 2 || !rng.chance(0.55)) continue;
    suyas.slice(1).forEach((e, i) => (e.orden = suyas[0].orden + (i + 1) * 1e-6));
  }
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

  // El parcial y la seguidilla se cuentan sólo dentro del tramo: así lo que
  // dice el relato pasó de verdad. Se pierde algún parcial que viene del tramo
  // anterior, pero nunca se canta uno que no existió.
  let rachaLado: 'nosotros' | 'rival' | '' = '';
  let racha = 0;
  let ultimoAutor = '';
  eventos.forEach((e, i) => {
    const antes = f - a;
    if (e.lado === 'nosotros') f += e.pts;
    else a += e.pts;
    racha = e.lado === rachaLado ? racha + e.pts : e.pts;
    rachaLado = e.lado;
    // Cada canasta cae en su parte del tramo, con un poco de ruido para que
    // no vengan a intervalos exactos; la última siempre antes de la pelota muerta.
    const paso = largo / eventos.length;
    const t = t0 + Math.min(largo - 0.05, paso * (i + 0.35 + rng.range(0, 0.55)));
    // "Otra vez X" tiene que ser el MISMO X: dos apellidos iguales en equipos
    // distintos pasa (el mundo genera nombres), así que la comparación va por
    // jugador y lado, no por apellido.
    const autor = `${e.lado}:${e.quienId || e.quien}`;
    const repite = autor === ultimoAutor && e.quien !== '';
    // De vez en cuando la canasta nuestra dice contra qué defensa fue: da
    // textura sin inventar nada, porque la defensa del tramo está guardada.
    const contra = !repite && e.lado === 'nosotros' && r.defensaRival && rng.chance(0.1) ? rng.pick(CONTRA[r.defensaRival] ?? []) : '';
    const frase = rng
      .pick(repite ? REPITE : PUNTOS[e.pts])
      .replace('{n}', e.quien)
      .replace('{p}', e.pts === 1 ? 'uno' : e.pts === 2 ? 'dos' : 'tres');
    // Con prefijo la frase sigue: en minúscula, salvo que arranque con el
    // apellido ("…, Cardozo suma uno más", no "…, cardozo suma uno más").
    const texto = contra ? contra + (frase.startsWith(e.quien) ? frase : frase[0].toLowerCase() + frase.slice(1)) : frase;
    const sub = notaDelMarcador(antes, f - a, racha, e.lado, f, a, rng);
    ultimoAutor = autor;
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
    const r: Reparto = { box: t.box, onCourt: t.onCourt, against: t.against, rivalBox: rivalTramoBox(state, live, qIndex, k), notas: t.notes ?? [], defensaRival: t.rivalDefense };
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
