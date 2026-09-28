import type { GameState, Player } from '../game/types';
import { affinity, RIVALRY_THRESHOLD } from '../game/relations';
import { Busto } from './Busto';
import { Icon, type IconName } from './Icon';
import { PlayerLink } from './PlayerLink';
import { WorldPlayerLink } from './WorldPlayerLink';
import { Planilla } from './bloqueD';
import './liga.css';

interface Row {
  id: string;
  name: string;
  value: string;
  /** Algo más al lado del nombre, en gris (el club de un rival). */
  sub?: string;
  /** Es una persona del mundo (un rival), no uno de los nuestros: abre la otra ficha. */
  rival?: boolean;
}

/**
 * Un ranking: un bloque de la planilla, no una card. Los bloques se separan
 * con la línea punteada y el primero de cada uno va en negrita display.
 */
function Ranking({ title, icon, rows, empty }: { title: string; icon: IconName; rows: Row[]; empty?: string }) {
  return (
    <div className="lg-rk">
      <h4 className="lg-rk-tit">
        <Icon name={icon} size={14} /> {title}
      </h4>
      {rows.length === 0 ? (
        <p className="lg-rk-vacio">{empty ?? 'Todavía no hay datos: se construye jugando.'}</p>
      ) : (
        <ol className="lg-rk-lista">
          {rows.map((r, i) => (
            <li key={r.id} className={i === 0 ? 'primero' : ''}>
              <span className="lg-rk-pos">{i + 1}</span>
              <span className="lg-rk-nom">
                {r.rival ? <WorldPlayerLink id={r.id}>{r.name}</WorldPlayerLink> : <PlayerLink id={r.id}>{r.name}</PlayerLink>}
                {r.sub && <small> · {r.sub}</small>}
              </span>
              <span className="lg-rk-val">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Los rivales que más nos anotaron esta temporada, sumando la planilla de
 * ellos de cada informe (`MatchResult.rivalBox`, sep 2026). `history` se
 * vacía cada verano, así que es de esta temporada. Los informes de partidas
 * guardadas antes no traen la planilla rival y no cuentan.
 */
function verdugos(state: GameState): Row[] {
  const acum = new Map<string, { name: string; club: string; pts: number; partidos: number }>();
  for (const m of state.history) {
    for (const l of m.rivalBox ?? []) {
      if (!l.starter || l.points <= 0) continue;
      const prev = acum.get(l.playerId);
      if (prev) {
        prev.pts += l.points;
        prev.partidos += 1;
      } else acum.set(l.playerId, { name: l.name, club: m.rivalName, pts: l.points, partidos: 1 });
    }
  }
  return [...acum.entries()]
    .sort((a, b) => b[1].pts - a[1].pts)
    .slice(0, 5)
    .map(([id, x]) => ({
      id,
      name: x.name,
      rival: true,
      sub: x.club,
      value: `${x.pts} pts${x.partidos > 1 ? ` (${x.partidos} PJ)` : ''}`,
    }));
}

/**
 * Rankings del club (pestaña de la Liga, UI V1): los números deportivos y las
 * historias del vestuario. El héroe es el goleador, de pie, con su número; lo
 * demás son dos planillas, una por conversación, con los rankings adentro como
 * bloques y no como catorce cards.
 */
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
          .map((x) => ({ id: x.p.id, name: x.p.name, value: `${x.v}'` }));

  const goleadores = top((p) => sumLog(p, 'points'), (v) => `${v} pts`);
  const figuras = top(
    (p) => p.matchLog.filter((m) => m.mvp).length,
    (v) => `${v} ${v > 1 ? 'veces' : 'vez'} MVP`
  );
  const minutos = top((p) => sumLog(p, 'minutes'), (v) => `${v}'`);

  // El héroe: el goleador del club, con su cara.
  const goleador = goleadores[0] ? players.find((p) => p.id === goleadores[0].id) : undefined;
  const golPts = goleador ? sumLog(goleador, 'points') : 0;
  const golPJ = goleador ? goleador.matchLog.length : 0;

  return (
    <div className="lg-rankings">
      <section className="lg-hero v1-hero lg-rk-hero" aria-label="El goleador">
        {goleador ? (
          <>
            <div className="lg-rk-busto">
              <Busto seed={goleador.id} personality={goleador.personality} />
              <span className="lg-rk-piso" aria-hidden="true" />
            </div>
            <div className="lg-rk-hero-txt">
              <div className="v1-eyebrow">Los números del club · <b>el goleador</b></div>
              <h2 className="v1-titulo">
                <PlayerLink id={goleador.id}>{goleador.name}</PlayerLink>
              </h2>
              <div className="lg-rk-hero-fila">
              <div className="lg-rk-hero-cifras">
                <div className="v1-cifra">
                  {golPts}
                  <small>puntos</small>
                </div>
                <div className="v1-cifra lg-rk-chica">
                  {golPJ}
                  <small>{golPJ === 1 ? 'partido' : 'partidos'}</small>
                </div>
              </div>
              <p className="v1-frase lg-rk-frase">
                {[
                  { row: figuras[0], txt: 'la figura más veces' },
                  { row: minutos[0], txt: 'el que más juega' },
                  { row: lovedRows[0], txt: 'el más querido del vestuario' },
                ]
                  .filter((d) => d.row)
                  .map((d, i, todos) => (
                    <span key={i}>
                      {d.row.id === goleador.id ? (
                        <>
                          {todos.slice(0, i).some((x) => x.row.id === goleador.id) ? 'Y es' : 'También es'} {d.txt} ({d.row.value}).{' '}
                        </>
                      ) : (
                        <>
                          {d.txt.charAt(0).toUpperCase() + d.txt.slice(1)}: <b>{d.row.name}</b> ({d.row.value}).{' '}
                        </>
                      )}
                    </span>
                  ))}
              </p>
              </div>
            </div>
          </>
        ) : (
          <div className="lg-rk-hero-txt">
            <div className="v1-eyebrow">Los números del club</div>
            <h2 className="v1-titulo">Los rankings se construyen jugando</h2>
            <p className="v1-frase lg-rk-frase">Después del primer partido acá aparecen el goleador, la figura y los que más juegan.</p>
          </div>
        )}
      </section>

      <Planilla titulo="Los números" nota="con el club" className="lg-rk-plan">
        <div className="lg-rk-grilla c4">
          <Ranking title="Goleadores" icon="tiradores" rows={goleadores} />
          <Ranking title="Reboteros" icon="interior" rows={top((p) => sumLog(p, 'rebounds'), (v) => `${v} reb`)} />
          <Ranking title="Asistidores" icon="social" rows={top((p) => sumLog(p, 'assists'), (v) => `${v} ast`)} />
          <Ranking title="Nota media" icon="rankings" rows={rated} empty="Se necesitan al menos 2 partidos jugados." />
          <Ranking title="Más minutos" icon="reloj" rows={minutos} />
          <Ranking title="Menos cancha (temporada)" icon="cancha" rows={leastMinutes} empty="Todavía no se jugó: nadie quedó relegado." />
          <Ranking title="Figuras" icon="estrella" rows={figuras} />
          {/* El otro lado de la planilla: los rivales que más nos anotaron.
              Le da cara a la liga, y al que te clavó 20 lo vas a mirar distinto
              en la revancha. */}
          <Ranking
            title="Los que más nos lastimaron"
            icon="rayo"
            rows={verdugos(state)}
            empty="Todavía nadie nos anotó: se construye jugando."
          />
        </div>
      </Planilla>

      <Planilla titulo="El vestuario" nota="las otras historias" className="lg-rk-plan">
        <div className="lg-rk-grilla c3">
          <Ranking title="Más querido" icon="corazon" rows={lovedRows} />
          <Ranking title="Más conflictivo" icon="rayo" rows={conflictive} empty="Por ahora el vestuario está en paz." />
          <Ranking
            title="Más entrenamientos"
            icon="fisico"
            rows={top((p) => p.seasonTrainings, (v) => `${v} práctica${v > 1 ? 's' : ''}`)}
            empty="Nadie entrenó todavía esta temporada."
          />
          <Ranking
            title="Alma de la fiesta"
            icon="asado"
            rows={top(
              (p) => countTimeline(p, (k) => k === 'social'),
              (v) => `${v} movida${v > 1 ? 's' : ''}`
            )}
            empty="Nadie organizó nada todavía. ¿Un asado?"
          />
          <Ranking
            /* Cuenta las ausencias a fechas, con o sin aviso; la conducta de la
               ficha cuenta sólo las sin avisar. Decía "faltazos" y con "Faltó
               una vez" al lado parecía una contradicción. */
            title="Más ausencias"
            icon="cruz"
            rows={top(
              (p) => countTimeline(p, (k) => k === 'ausencia'),
              (v) => `${v} ausencia${v > 1 ? 's' : ''}`
            )}
            empty="Por ahora vinieron todos, siempre."
          />
          <Ranking
            title="Enfermería"
            icon="enfermeria"
            rows={top(
              (p) => countTimeline(p, (k, text) => k === 'lesion' && !text.startsWith('Recibió') && !text.startsWith('Se acomodó')),
              (v) => `${v} lesi${v > 1 ? 'ones' : 'ón'}`
            )}
            empty="Sin lesionados: a tocar madera."
          />
        </div>
      </Planilla>
    </div>
  );
}
