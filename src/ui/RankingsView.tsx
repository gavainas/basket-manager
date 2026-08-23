import type { GameState, Player } from '../game/types';
import { affinity, RIVALRY_THRESHOLD } from '../game/relations';
import { Icon, type IconName } from './Icon';
import { PlayerLink } from './PlayerLink';

interface Row {
  id: string;
  name: string;
  value: string;
}

function RankingCard({ title, icon, rows, empty }: { title: string; icon: IconName; rows: Row[]; empty?: string }) {
  return (
    <div className="card ranking-card">
      <h3>
        <Icon name={icon} size={16} /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {empty ?? 'Todavía no hay datos: se construye jugando.'}
        </p>
      ) : (
        <ol className="ranking-list">
          {rows.map((r, i) => (
            <li key={r.id}>
              <span className="rk-pos">{i + 1}</span>
              <span className="rk-name">
                <PlayerLink id={r.id}>{r.name}</PlayerLink>
              </span>
              <span className="rk-value">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Rankings del club: los números deportivos y las historias del vestuario. */
export function RankingsView({ state }: { state: GameState }) {
  const players = state.players.filter((p) => !p.leftClub);

  const top = (score: (p: Player) => number, fmt: (v: number) => string, min = 1): Row[] =>
    players
      .map((p) => ({ p, v: score(p) }))
      .filter((x) => x.v >= min)
      .sort((a, b) => b.v - a.v)
      .slice(0, 5)
      .map((x) => ({ id: x.p.id, name: x.p.name, value: fmt(x.v) }));

  const sumLog = (p: Player, field: 'points' | 'rebounds' | 'assists' | 'minutes') =>
    p.matchLog.reduce((t, m) => t + (m[field] ?? 0), 0);

  // Nota media: solo con al menos 2 partidos jugados.
  const rated = players
    .filter((p) => p.matchLog.length >= 2)
    .map((p) => ({
      p,
      avg: p.matchLog.reduce((t, m) => t + m.rating, 0) / p.matchLog.length,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map((x) => ({ id: x.p.id, name: x.p.name, value: `${x.avg.toFixed(1)} (${x.p.matchLog.length} PJ)` }));

  const lovedRows = players
    .map((p) => {
      const others = players.filter((t) => t.id !== p.id);
      const avg = others.length
        ? others.reduce((t, o) => t + affinity(o, p, state.affinityBonus), 0) / others.length
        : 0;
      return { p, v: Math.round(avg) };
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((x) => ({ id: x.p.id, name: x.p.name, value: `${x.v}/100` }));

  const conflictive = top(
    (p) => players.filter((t) => t.id !== p.id && affinity(t, p, state.affinityBonus) <= RIVALRY_THRESHOLD).length,
    (v) => `${v} roce${v > 1 ? 's' : ''}`
  );

  const countTimeline = (p: Player, pred: (kind: string, text: string) => boolean) =>
    p.timeline.filter((e) => pred(e.kind, e.text)).length;

  // Quién juega poco ESTA temporada: el dato que antes había que reconstruir
  // de memoria (los demás rankings son de la carrera con el club; este habla
  // del reparto de minutos de hoy). Los lesionados no cuentan como relegados.
  const leastMinutes: Row[] =
    state.history.length === 0
      ? []
      : players
          .filter((p) => p.status !== 'lesionado')
          .map((p) => ({
            p,
            v: p.matchLog.filter((m) => m.season === state.seasonNumber).reduce((t, m) => t + m.minutes, 0),
          }))
          .sort((a, b) => a.v - b.v)
          .slice(0, 5)
          .map((x) => ({ id: x.p.id, name: x.p.name, value: `${x.v}' esta temporada` }));

  return (
    <div>
      <h2 className="section-title">
        <Icon name="pelota" size={17} /> Los números
      </h2>
      <div className="grid cols-3">
        <RankingCard title="Goleadores" icon="tiradores" rows={top((p) => sumLog(p, 'points'), (v) => `${v} pts`)} />
        <RankingCard title="Reboteros" icon="interior" rows={top((p) => sumLog(p, 'rebounds'), (v) => `${v} reb`)} />
        <RankingCard title="Asistidores" icon="social" rows={top((p) => sumLog(p, 'assists'), (v) => `${v} ast`)} />
        <RankingCard title="Nota media" icon="rankings" rows={rated} empty="Se necesitan al menos 2 partidos jugados." />
        <RankingCard title="Más minutos" icon="reloj" rows={top((p) => sumLog(p, 'minutes'), (v) => `${v}'`)} />
        <RankingCard
          title="Menos cancha"
          icon="cancha"
          rows={leastMinutes}
          empty="Todavía no se jugó: nadie quedó relegado."
        />
        <RankingCard
          title="Figuras"
          icon="estrella"
          rows={top(
            (p) => p.matchLog.filter((m) => m.mvp).length,
            (v) => `${v} ${v > 1 ? 'veces' : 'vez'} MVP`
          )}
        />
      </div>

      <h2 className="section-title">
        <Icon name="vestuario" size={17} /> El vestuario
      </h2>
      <div className="grid cols-3">
        <RankingCard title="Más querido" icon="corazon" rows={lovedRows} />
        <RankingCard
          title="Más conflictivo"
          icon="rayo"
          rows={conflictive}
          empty="Por ahora el vestuario está en paz."
        />
        <RankingCard
          title="Más entrenamientos"
          icon="fisico"
          rows={top((p) => p.seasonTrainings, (v) => `${v} práctica${v > 1 ? 's' : ''}`)}
          empty="Nadie entrenó todavía esta temporada."
        />
        <RankingCard
          title="Alma de la fiesta"
          icon="asado"
          rows={top(
            (p) => countTimeline(p, (k) => k === 'social'),
            (v) => `${v} movida${v > 1 ? 's' : ''}`
          )}
          empty="Nadie organizó nada todavía. ¿Un asado?"
        />
        <RankingCard
          title="Más impuntual"
          icon="cruz"
          rows={top(
            (p) => countTimeline(p, (k) => k === 'ausencia'),
            (v) => `${v} faltazo${v > 1 ? 's' : ''}`
          )}
          empty="Por ahora vinieron todos, siempre."
        />
        <RankingCard
          title="Enfermería"
          icon="enfermeria"
          rows={top(
            (p) => countTimeline(p, (k, text) => k === 'lesion' && !text.startsWith('Recibió') && !text.startsWith('Se acomodó')),
            (v) => `${v} lesi${v > 1 ? 'ones' : 'ón'}`
          )}
          empty="Sin lesionados: a tocar madera."
        />
      </div>
    </div>
  );
}
