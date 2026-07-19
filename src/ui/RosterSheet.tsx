import type { GameState, Player, Position } from '../game/types';
import { activePlayers } from '../game/match';
import { Avatar } from './Avatar';
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

const GROUPS: { role: Player['expectedRole']; label: string }[] = [
  { role: 'titular', label: 'Titulares' },
  { role: 'rotación', label: 'Rotación' },
  { role: 'suplente', label: 'Suplentes' },
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

export function RosterSheet({ state }: { state: GameState }) {
  const active = activePlayers(state.players);
  const mvpCount = (id: string) => state.history.filter((m) => m.mvpId === id).length;
  const five = probableFive(active);
  const media = avgRating(five.map((f) => f.player));

  return (
    <div className="sheet-layout">
      <div className="table-wrap">
        <table className="planilla sheet">
          <thead>
            <tr>
              <th></th>
              <th>Jugador</th>
              <th title="Posición">Pos</th>
              <th className="num">Edad</th>
              <th className="num" title="Valoración estimada">
                ≈
              </th>
              <th className="num" title="Físico">
                Fís
              </th>
              <th className="num" title="Motivación">
                Mot
              </th>
              <th className="num" title="Compromiso">
                Com
              </th>
              <th className="num" title="Afinidad social">
                Afi
              </th>
              <th className="num" title="Nota del último partido">
                Últ
              </th>
              <th>Estado</th>
              <th>Cuota</th>
            </tr>
          </thead>
          {GROUPS.map((g) => {
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
                  <td colSpan={12}>
                    {g.label} · media ≈{avgRating(rows)}
                  </td>
                </tr>
                {rows.map((p) => {
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
                        />
                      </td>
                      <td className="sheet-name">
                        <PlayerLink id={p.id}>{p.name}</PlayerLink>
                        {mvp > 0 && (
                          <span className="sheet-mvp" title={`MVP ×${mvp}`}>
                            ⭐
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
                      <td>
                        <span className={`sheet-tag ${status.cls}`}>{status.label}</span>
                      </td>
                      <td>
                        <span className={`sheet-tag ${fee.cls}`}>{fee.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
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
              <Avatar seed={p.id} age={p.age} size={34} appearance={p.appearance} title={p.name} />
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
