// El relato jugada a jugada (sep 2026, segundo paso de la referencia del
// partido). El motor simula por cuarto: decide cuántos puntos hizo cada uno
// de los nuestros (`q.box`) y cuántos el rival. Acá esos puntos se convierten
// en canastas con minuto, marcador parcial y autor, de las dos camisetas, y
// se eligen los momentos que se muestran. Es lectura: determinista por
// partido y cuarto (semilla propia, no toca el RNG de la temporada), y suma
// exactamente lo que dice el marcador.

import { rivalLineup, rivalQuarterBox } from './match';
import { Rng, seedFromString } from './rng';
import type { GameState, LiveMatchState } from './types';

export interface Jugada {
  /** Minuto del partido ("7'"), acumulado entre cuartos. */
  minuto: string;
  /** Marcador después de la jugada, "nosotros-ellos". */
  marcador: string;
  lado: 'nosotros' | 'rival';
  pts: number;
  texto: string;
  sub?: string;
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

/**
 * Las jugadas de un cuarto que se muestran: hasta cinco momentos, siempre con
 * el último (el cierre del cuarto con su marcador). Devuelve [] si el cuarto
 * todavía no tiene planilla (partidas guardadas antes de este relato).
 */
export function jugadasDelCuarto(state: GameState, live: LiveMatchState, qIndex: number): Jugada[] {
  const q = live.quarters[qIndex];
  if (!q || !q.box) return [];
  const rng = new Rng(seedFromString(`relato:${live.rivalId}:${state.week}:${qIndex}:${q.for}:${q.against}`));
  const nombreDe = (id: string) => state.players.find((p) => p.id === id)?.name ?? '';
  const rivalCourt = rivalLineup(state, live).court;
  const rivalBox = rivalQuarterBox(state, live, qIndex);

  type Evento = { lado: 'nosotros' | 'rival'; pts: number; quien: string; orden: number };
  const eventos: Evento[] = [];
  for (const [id, pts] of Object.entries(q.box)) {
    for (const c of canastas(pts, rng)) eventos.push({ lado: 'nosotros', pts: c, quien: apellido(nombreDe(id)), orden: rng.next() });
  }
  for (const p of rivalCourt) {
    for (const c of canastas(rivalBox[p.id] ?? 0, rng)) eventos.push({ lado: 'rival', pts: c, quien: p.lastName, orden: rng.next() });
  }
  // Si el rival no tiene plantel conocido, sus puntos igual entran al marcador.
  const rivalSinNombre = q.against - Object.values(rivalBox).reduce((t, n) => t + n, 0);
  for (const c of canastas(Math.max(0, rivalSinNombre), rng)) eventos.push({ lado: 'rival', pts: c, quien: live.rivalName, orden: rng.next() });
  eventos.sort((a, b) => a.orden - b.orden);
  if (eventos.length === 0) return [];

  // Marcador al arrancar el cuarto, y el reloj: diez minutos por cuarto, cinco el suplementario.
  const antes = live.quarters.slice(0, qIndex).reduce((t, x) => ({ f: t.f + x.for, a: t.a + x.against }), { f: 0, a: 0 });
  const base = live.quarters.slice(0, qIndex).reduce((t, x) => t + (x.overtime ? 5 : 10), 0);
  const largo = q.overtime ? 5 : 10;

  const todas: Jugada[] = [];
  let f = antes.f;
  let a = antes.a;
  const compañeros = (q.onCourt ?? []).map(nombreDe).filter(Boolean).map(apellido);
  eventos.forEach((e, i) => {
    if (e.lado === 'nosotros') f += e.pts;
    else a += e.pts;
    const minuto = base + Math.max(1, Math.min(largo, Math.ceil(((i + 1) / eventos.length) * largo)));
    const pool = e.lado === 'nosotros' ? NUESTRAS[e.pts] : RIVALES[e.pts];
    const texto = rng.pick(pool).replace('{n}', e.quien);
    let sub: string | undefined;
    if (e.lado === 'nosotros' && rng.chance(0.4)) {
      const otro = compañeros.filter((n) => n !== e.quien);
      sub = rng.pick(SUB_NUESTRAS).replace('{a}', otro.length ? rng.pick(otro) : 'el equipo');
    } else if (e.lado === 'rival' && rng.chance(0.3)) {
      sub = rng.pick(SUB_RIVALES);
    }
    todas.push({ minuto: `${minuto}'`, marcador: `${f}-${a}`, lado: e.lado, pts: e.pts, texto, sub });
  });

  // Los momentos: repartidos a lo largo del cuarto, con el cierre siempre.
  if (todas.length <= MOMENTOS_POR_CUARTO) return todas;
  const elegidas: Jugada[] = [];
  for (let k = 0; k < MOMENTOS_POR_CUARTO; k++) {
    const idx = Math.round(((k + 1) / MOMENTOS_POR_CUARTO) * (todas.length - 1));
    if (!elegidas.includes(todas[idx])) elegidas.push(todas[idx]);
  }
  return elegidas;
}
