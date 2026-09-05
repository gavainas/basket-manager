import { useState } from 'react';
import type { GameState, Player, Position } from '../game/types';
import { activePlayers } from '../game/match';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { feeChip, statusChip } from './helpers';

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

const POSITION_SHORT: Record<Position, string> = {
  Base: 'B',
  Escolta: 'E',
  Alero: 'A',
  'Ala-Pívot': 'AP',
  Pívot: 'P',
};

/**
 * Los grupos son por lo que cada jugador **espera**, no por quién juega: eso se
 * decide partido a partido en el quinteto.
 *
 * Decían "Titulares / Rotación / Suplentes" y se leía como la formación, así que
 * ver siete en el primer grupo parecía un bug. No lo es — que más jugadores se
 * crean titulares que los cinco que entran es la tensión central del juego (de
 * ahí salen las quejas por minutos y las promesas rotas). Lo que estaba mal era
 * el nombre.
 */
const GROUPS: { role: Player['expectedRole']; label: string }[] = [
  { role: 'titular', label: 'Se ven titulares' },
  { role: 'rotación', label: 'Esperan minutos' },
  { role: 'suplente', label: 'Vienen a acompañar' },
];

/** Dónde para cada posición sobre la media cancha (%; el aro queda abajo). */
const COURT_SPOTS: Record<Position, { x: number; y: number }> = {
  Base: { x: 50, y: 13 },
  Escolta: { x: 82, y: 36 },
  Alero: { x: 18, y: 36 },
  'Ala-Pívot': { x: 69, y: 64 },
  Pívot: { x: 31, y: 68 },
};

/** Mismos umbrales de color que las barras de las cards. */
function statCls(v: number): string {
  return v >= 65 ? 'stat-good' : v >= 40 ? 'stat-warn' : 'stat-bad';
}

function lastCls(v: number | null): string {
  if (v === null) return '';
  return v >= 7 ? 'stat-good' : v <= 3 ? 'stat-bad' : '';
}

/** Apodo entre comillas si tiene; si no, el apellido. */
function shortName(name: string): string {
  const nick = name.match(/"([^"]+)"/);
  if (nick) return nick[1];
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function avgRating(players: Player[]): number {
  if (players.length === 0) return 0;
  return Math.round(players.reduce((s, p) => s + p.visibleRating, 0) / players.length);
}

/**
 * Quinteto probable: el mejor disponible por posición (priorizando a los que
 * se ven titulares) y, si falta alguna posición, los mejores que sobren.
 */
function probableFive(players: Player[]): { player: Player; spot: { x: number; y: number } }[] {
  const roleRank: Record<Player['expectedRole'], number> = { titular: 0, rotación: 1, suplente: 2 };
  const pool = players
    .filter((p) => p.status !== 'lesionado')
    .sort((a, b) => roleRank[a.expectedRole] - roleRank[b.expectedRole] || b.visibleRating - a.visibleRating);

  const bySpot = new Map<Position, Player>();
  for (const pos of POSITION_ORDER) {
    const cand = pool.find((p) => p.position === pos && ![...bySpot.values()].includes(p));
    if (cand) bySpot.set(pos, cand);
  }
  for (const pos of POSITION_ORDER) {
    if (bySpot.size >= 5 || bySpot.has(pos)) continue;
    const cand = pool.find((p) => ![...bySpot.values()].includes(p));
    if (cand) bySpot.set(pos, cand);
  }
  return [...bySpot.entries()].map(([pos, player]) => ({ player, spot: COURT_SPOTS[pos] }));
}

/** Columnas ordenables: la pregunta "¿quién juega poco / falta más / debe?" se contesta en un click. */
type SortKey = 'nombre' | 'pos' | 'edad' | 'rating' | 'fis' | 'mot' | 'com' | 'afi' | 'ult' | 'min' | 'faltas' | 'cuota';

export function RosterSheet({ state }: { state: GameState }) {
  const active = activePlayers(state.players);
  const mvpCount = (id: string) => state.history.filter((m) => m.mvpId === id).length;
  const five = probableFive(active);
  const media = avgRating(five.map((f) => f.player));
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  const seasonMinutes = (p: Player) =>
    p.matchLog.filter((m) => m.season === state.seasonNumber).reduce((t, m) => t + m.minutes, 0);
  const seasonAbsences = (p: Player) =>
    p.timeline.filter((e) => e.season === state.seasonNumber && e.kind === 'ausencia').length;
  const owed = (p: Player) => (p.feeStatus === 'pendiente' ? Math.max(p.weeksUnpaid, 1) : 0);

  const VALUE: Record<SortKey, (p: Player) => number | string> = {
    nombre: (p) => p.name.replace(/"/g, ''),
    pos: (p) => POSITION_ORDER.indexOf(p.position),
    edad: (p) => p.age,
    rating: (p) => p.visibleRating,
    fis: (p) => p.physical,
    mot: (p) => p.motivation,
    com: (p) => p.commitment,
    afi: (p) => p.social,
    ult: (p) => p.lastRating ?? -1,
    min: (p) => seasonMinutes(p),
    faltas: (p) => seasonAbsences(p),
    cuota: (p) => owed(p),
  };

  // Click en un encabezado: ordena (numéricos de mayor a menor primero);
  // segundo click invierte; tercero vuelve al orden natural por grupos.
  const clickSort = (key: SortKey) => {
    const natural: 1 | -1 = key === 'nombre' || key === 'pos' ? 1 : -1;
    if (sort?.key !== key) setSort({ key, dir: natural });
    else if (sort.dir === natural) setSort({ key, dir: (natural * -1) as 1 | -1 });
    else setSort(null);
  };

  const Th = ({
    k,
    label,
    title,
    num,
  }: {
    k: SortKey;
    label: string;
    title?: string;
    num?: boolean;
  }) => (
    <th
      className={`sortable${num ? ' num' : ''}${sort?.key === k ? ' sorted' : ''}`}
      title={title ? `${title} — click para ordenar` : 'Click para ordenar'}
      onClick={() => clickSort(k)}
    >
      {label}
      {sort?.key === k && <span className="sort-arrow">{sort.dir === 1 ? '▲' : '▼'}</span>}
    </th>
  );

  const renderRow = (p: Player) => {
    const status = statusChip(p);
    const fee = feeChip(p);
    const mvp = mvpCount(p.id);
    return (
      <tr key={p.id}>
        <td className="sheet-avatar">
          <Avatar
            seed={p.id}
            age={p.age}
            size={24}
            appearance={p.appearance}
            expressionOverride={
              p.status === 'molesto' || p.status === 'al_borde' ? 2 : p.status === 'lesionado' ? 3 : undefined
            }
            title={p.name}
            personality={p.personality}
          />
        </td>
        <td className="sheet-name">
          <PlayerLink id={p.id}>{p.name}</PlayerLink>
          {mvp > 0 && (
            <span className="sheet-mvp" title={`MVP ×${mvp}`}>
              <Icon name="estrella" size={12} />
            </span>
          )}
        </td>
        <td title={p.position}>{POSITION_SHORT[p.position]}</td>
        <td className="num">{p.age}</td>
        <td className="num sheet-rating">≈{p.visibleRating}</td>
        <td className={`num ${statCls(p.physical)}`}>{p.physical}</td>
        <td className={`num ${statCls(p.motivation)}`}>{p.motivation}</td>
        <td className={`num ${statCls(p.commitment)}`}>{p.commitment}</td>
        <td className={`num ${statCls(p.social)}`}>{p.social}</td>
        <td className={`num ${lastCls(p.lastRating)}`}>{p.lastRating ?? '—'}</td>
        <td className="num">{seasonMinutes(p)}&apos;</td>
        <td className="num">{seasonAbsences(p) || '—'}</td>
        {/* En la planilla el estado normal va con guion, como el resto de las
            columnas: la fila mantiene la grilla y el ojo busca las que tienen
            algo escrito. */}
        <td>
          {status ? <span className={`sheet-tag ${status.cls}`}>{status.label}</span> : <span className="sheet-nada">—</span>}
        </td>
        <td>
          {fee ? <span className={`sheet-tag ${fee.cls}`}>{fee.label}</span> : <span className="sheet-nada">—</span>}
        </td>
      </tr>
    );
  };

  const sorted = sort
    ? [...active].sort((a, b) => {
        const va = VALUE[sort.key](a);
        const vb = VALUE[sort.key](b);
        const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
        return cmp * sort.dir;
      })
    : null;

  return (
    <div className="sheet-layout">
      <div className="table-wrap">
        <table className="planilla sheet">
          <thead>
            <tr>
              <th></th>
              <Th k="nombre" label="Jugador" />
              <Th k="pos" label="Pos" title="Posición" />
              <Th k="edad" label="Edad" num />
              <Th k="rating" label="≈" title="Valoración estimada" num />
              <Th k="fis" label="Fís" title="Físico" num />
              <Th k="mot" label="Mot" title="Motivación" num />
              <Th k="com" label="Com" title="Compromiso" num />
              <Th k="afi" label="Afi" title="Afinidad social" num />
              <Th k="ult" label="Últ" title="Nota del último partido" num />
              <Th k="min" label="Min" title="Minutos jugados esta temporada" num />
              <Th k="faltas" label="Falt" title="Faltazos de la temporada" num />
              <th>Estado</th>
              <Th k="cuota" label="Cuota" title="Semanas de cuota adeudadas" />
            </tr>
          </thead>
          {sorted ? (
            // Con un orden activo, la planilla es una sola lista: la pregunta
            // que trae el click ("¿quién juega poco?") no entiende de grupos.
            <tbody>{sorted.map(renderRow)}</tbody>
          ) : (
            GROUPS.map((g) => {
              const rows = active
                .filter((p) => p.expectedRole === g.role)
                .sort(
                  (a, b) =>
                    POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) ||
                    b.visibleRating - a.visibleRating
                );
              if (rows.length === 0) return null;
              return (
                <tbody key={g.role}>
                  <tr className="sheet-group">
                    <td colSpan={14}>
                      {g.label} ({rows.length}) · media ≈{avgRating(rows)}
                      {/* Si se creen titulares más de los que entran, la planilla lo
                          dice en voz alta: es de donde salen las quejas por minutos. */}
                      {g.role === 'titular' && rows.length > 5 && (
                        <span className="sheet-tension">
                          {' '}
                          · en la cancha entran 5: {rows.length - 5} van a mirar desde el banco
                        </span>
                      )}
                    </td>
                  </tr>
                  {rows.map(renderRow)}
                </tbody>
              );
            })
          )}
        </table>
      </div>

      <div className="sheet-side">
        <div className="sheet-media">
          <div className="sheet-media-num">≈{media}</div>
          <div className="sheet-media-label">Media del quinteto probable</div>
        </div>
        <div className="sheet-court">
          <svg viewBox="0 0 100 90" aria-hidden="true">
            <rect x="1" y="1" width="98" height="88" rx="3" fill="var(--bg-soft)" stroke="var(--border)" />
            <path d="M 6 89 L 6 62 A 44 44 0 0 1 94 62 L 94 89" fill="none" stroke="var(--border)" />
            <rect x="35" y="58" width="30" height="31" fill="none" stroke="var(--border)" />
            <circle cx="50" cy="58" r="11" fill="none" stroke="var(--border)" />
            <line x1="43" y1="85" x2="57" y2="85" stroke="var(--text-dim)" strokeWidth="1.4" />
            <circle cx="50" cy="81.5" r="2.6" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
          </svg>
          {five.map(({ player: p, spot }) => (
            <div key={p.id} className="court-slot" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
              <Avatar seed={p.id} age={p.age} size={34} appearance={p.appearance} title={p.name} personality={p.personality} />
              <div className="court-name">{shortName(p.name)}</div>
              <div className="court-rating">≈{p.visibleRating}</div>
            </div>
          ))}
        </div>
        <p className="sheet-court-note muted">
          El quinteto probable sale de la valoración y el rol esperado; el de verdad lo elegís en cada partido.
        </p>
      </div>
    </div>
  );
}
