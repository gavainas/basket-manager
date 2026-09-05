// Planillas de los equipos que NO jugás vos.
//
// El motor en vivo (`match.ts`) reparte cuarto a cuarto lo del club. Acá se
// resuelve el resto de la liga de una sola vez: la planilla del rival de la
// fecha y la de los partidos entre rivales que se juegan sin vos. Es la misma
// idea que ya usa el reparto propio — puesto + perfil + rendimiento del día —
// pero para un partido entero en una sola pasada.
//
// Sin esto, la mitad de cada planilla quedaba vacía y las tablas de líderes de
// la liga sólo podían mostrar a los tuyos.

import { BALANCE } from './balance';
import { profileFrom } from './profile';
import type { Position, StatLine } from './types';
import type { Rng } from './rng';

/** Alguien a quien repartirle una planilla, venga de donde venga. */
export interface StatSubject {
  id: string;
  name: string;
  position: Position;
  /** Cuánto rinde, 0-100. */
  level: number;
}

export interface BoxLine extends StatLine {
  id: string;
  name: string;
  position: Position;
}

const REB_POS: Record<Position, number> = { Base: 0.9, Escolta: 1.1, Alero: 1.7, 'Ala-Pívot': 2.4, Pívot: 3 };
const AST_POS: Record<Position, number> = { Base: 3, Escolta: 1.8, Alero: 1.2, 'Ala-Pívot': 0.8, Pívot: 0.6 };

/** Reparte un total entero según pesos; el resto se sortea. */
function repartir(total: number, pesos: { id: string; w: number }[], rng: Rng): Record<string, number> {
  const out: Record<string, number> = {};
  if (pesos.length === 0 || total <= 0) {
    for (const x of pesos) out[x.id] = 0;
    return out;
  }
  const suma = pesos.reduce((t, x) => t + Math.max(0.01, x.w), 0);
  let asignado = 0;
  for (const x of pesos) {
    const v = Math.floor((total * Math.max(0.01, x.w)) / suma);
    out[x.id] = v;
    asignado += v;
  }
  const ids = pesos.map((x) => x.id);
  for (let resto = total - asignado; resto > 0; resto--) out[rng.pick(ids)] += 1;
  return out;
}

function pickWeighted<T>(items: T[], peso: (x: T) => number, rng: Rng): T | null {
  if (items.length === 0) return null;
  const pesos = items.map((x) => Math.max(0.0001, peso(x)));
  const total = pesos.reduce((t, w) => t + w, 0);
  let r = rng.range(0, total);
  for (let i = 0; i < items.length; i++) {
    r -= pesos[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * La planilla de un equipo para un partido entero.
 *
 * `puntos` es el marcador que ya está decidido: esto sólo lo reparte. Los
 * mejores juegan más y anotan más, pero el reparto usa el **rendimiento del
 * día** (nivel × azar), así que cualquiera puede tener su noche.
 */
export function repartirPlanilla(sujetos: StatSubject[], puntos: number, rng: Rng): BoxLine[] {
  const M = BALANCE.liveMatch;
  if (sujetos.length === 0) return [];

  // Los ocho de la rotación: en el básquet de barrio el resto mira.
  const orden = [...sujetos].sort((a, b) => b.level - a.level);
  const rotacion = orden.slice(0, 8);
  const resto = orden.slice(8);

  // Minutos: el quinteto juega casi todo y el banco entra poco, igual que en
  // el partido en vivo (donde los puntos se reparten entre los CINCO que están
  // en cancha). Si acá se repartiera parejo entre ocho, los titulares del club
  // coparían todas las tablas de líderes de la liga sólo por eso.
  //
  // La PROFUNDIDAD varía por partido: hay noches en que un DT rival mueve el
  // banco y noches en que juega con cinco. Sin esta variación los rivales
  // concentraban siempre y sus goleadores le sacaban 10 puntos de promedio a
  // los tuyos apenas rotabas una vez.
  const banco = rng.range(0.12, 0.55);
  const minutosDe = (i: number) =>
    i < 5 ? rng.range(0.82, 1) : i < 7 ? banco * rng.range(0.7, 1.3) : banco * rng.range(0, 0.5);
  const dia = new Map<string, number>();
  rotacion.forEach((s, i) => {
    dia.set(s.id, Math.max(4, s.level * rng.range(0.72, 1.28) * minutosDe(i)));
  });
  for (const s of resto) dia.set(s.id, 0);

  const perf = (s: StatSubject) => dia.get(s.id) ?? 0;
  const pf = (s: StatSubject) => profileFrom(s.id, s.position);
  const juegan = rotacion.filter((s) => perf(s) > 0);

  const pts = repartir(
    puntos,
    juegan.map((s) => ({ id: s.id, w: Math.pow(perf(s), M.boxPtsConcentracion) })),
    rng
  );
  const reb = repartir(
    Math.round(rng.int(M.boxRebMin, M.boxRebMax) * 4),
    juegan.map((s) => ({ id: s.id, w: REB_POS[s.position] * (0.45 + pf(s).inside / 100) * (0.6 + perf(s) / 150) })),
    rng
  );
  const ast = repartir(
    Math.round(rng.int(M.boxAstMin, M.boxAstMax) * 4),
    juegan.map((s) => ({ id: s.id, w: AST_POS[s.position] * (0.45 + pf(s).vision / 100) * (0.6 + perf(s) / 150) })),
    rng
  );

  // Triples: sobre los puntos ya repartidos, nunca más de los que anotó.
  const t3: Record<string, number> = {};
  for (const s of juegan) t3[s.id] = 0;
  const totalTriples = Math.round((puntos * M.boxTripleShare * rng.range(0.7, 1.3)) / 3);
  for (let i = 0; i < totalTriples; i++) {
    const elegibles = juegan.filter((s) => (pts[s.id] ?? 0) - t3[s.id] * 3 >= 3);
    const elegido = pickWeighted(elegibles, (s) => Math.pow(pf(s).outside, 2.2), rng);
    if (!elegido) break;
    t3[elegido.id] += 1;
  }

  // Tapones: uno o dos por partido, para el que vive abajo del aro.
  const blk: Record<string, number> = {};
  for (const s of juegan) blk[s.id] = 0;
  // ~1.1 por partido, para que empate con lo que produce el motor en vivo
  // (si el rival tapara la mitad que nosotros, se notaría en las tablas).
  const totalTapones = rng.chance(0.7) ? (rng.chance(0.35) ? 2 : 1) : 0;
  for (let i = 0; i < totalTapones; i++) {
    const elegido = pickWeighted(juegan, (s) => Math.pow(pf(s).inside, 2.4), rng);
    if (elegido) blk[elegido.id] += 1;
  }

  return orden.map((s) => ({
    id: s.id,
    name: s.name,
    position: s.position,
    pts: pts[s.id] ?? 0,
    t3: t3[s.id] ?? 0,
    reb: reb[s.id] ?? 0,
    ast: ast[s.id] ?? 0,
    blk: blk[s.id] ?? 0,
    games: perf(s) > 0 ? 1 : 0,
  }));
}

/** Suma una planilla al acumulado de la temporada (muta el acumulado). */
export function acumular(acc: Record<string, StatLine>, lineas: BoxLine[]): void {
  for (const l of lineas) {
    if (l.games === 0) continue;
    const a = (acc[l.id] ??= { pts: 0, t3: 0, reb: 0, ast: 0, blk: 0, games: 0 });
    a.pts += l.pts;
    a.t3 += l.t3;
    a.reb += l.reb;
    a.ast += l.ast;
    a.blk += l.blk;
    a.games += 1;
  }
}

// ---------- Tablas de líderes ----------

export type StatKey = 'pts' | 't3' | 'reb' | 'ast' | 'blk';

export interface LeaderRow {
  playerId: string;
  name: string;
  clubName: string;
  isUserClub: boolean;
  games: number;
  /** El total de la temporada en la categoría pedida. */
  total: number;
  /** Promedio por partido, que es como se lee un líder. */
  average: number;
}

export const STAT_LABELS: Record<StatKey, { titulo: string; corto: string }> = {
  pts: { titulo: 'Goleadores', corto: 'Pts' },
  t3: { titulo: 'Triples', corto: 'T3' },
  ast: { titulo: 'Asistencias', corto: 'As' },
  reb: { titulo: 'Rebotes', corto: 'Reb' },
  blk: { titulo: 'Tapones', corto: 'Tap' },
};

/**
 * Los líderes de la divisional en una categoría. Cruza el acumulado con los
 * nombres: los del club salen de `players`, los demás del mundo.
 *
 * Pide un mínimo de partidos para que el que jugó una fecha y metió 20 no
 * encabece la tabla de promedios toda la temporada.
 */
export function leaders(
  stats: Record<string, StatLine>,
  key: StatKey,
  ctx: {
    userPlayers: { id: string; name: string }[];
    worldPlayers: { id: string; firstName: string; lastName: string; clubName?: string }[];
    userClubName: string;
  },
  opts: { limit?: number; minGames?: number } = {}
): LeaderRow[] {
  const limit = opts.limit ?? 10;
  // Sin un piso de partidos, el que jugó una fecha y metió 20 encabeza la
  // tabla de promedios todo el año.
  const minGames = opts.minGames ?? 3;
  const rows: LeaderRow[] = [];

  for (const [id, line] of Object.entries(stats)) {
    if (line.games < minGames) continue;
    const total = line[key];
    if (total <= 0) continue;
    const propio = ctx.userPlayers.find((p) => p.id === id);
    if (propio) {
      rows.push({
        playerId: id,
        name: propio.name,
        clubName: ctx.userClubName,
        isUserClub: true,
        games: line.games,
        total,
        average: total / line.games,
      });
      continue;
    }
    const wp = ctx.worldPlayers.find((p) => p.id === id);
    if (!wp) continue;
    rows.push({
      playerId: id,
      name: `${wp.firstName} ${wp.lastName}`,
      clubName: wp.clubName ?? 'Sin club',
      isUserClub: false,
      games: line.games,
      total,
      average: total / line.games,
    });
  }

  return rows.sort((a, b) => b.average - a.average || b.total - a.total).slice(0, limit);
}
