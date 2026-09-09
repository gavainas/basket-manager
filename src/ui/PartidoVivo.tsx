// El partido en vivo, según la referencia aprobada por Gabi el 2026-09-09
// (design/arte/referencias/2026-09-09-partido.png): la cabecera con los dos
// escudos y el marcador oscuro, nuestro equipo a la izquierda con el cambio
// preparado, la cancha con los diez en el medio y el relato debajo, el rival y
// el tablero táctico a la derecha.
//
// Lo que la referencia promete y el motor todavía no tiene (presión en tres
// niveles, ritmo, marca especial, energía individual del rival, relato jugada
// a jugada) no está: no se dibujan controles que no hacen nada. La referencia
// del ataque sí se elige (SET_STAR), y el quinteto rival es real: son las
// personas del mundo que vinieron hoy, con sus puntos repartidos cuarto a
// cuarto (rivalBoxScore, de lectura).

import { useState } from 'react';
import { BALANCE } from '../game/balance';
import { courtFreshness, rivalBoxScore, rivalLineup } from '../game/match';
import { jugadasDelCuarto } from '../game/relato';
import { clubByLegacyId, teamByLegacyRival, userTeam } from '../game/world';
import type { GameState, Player, Position, WorldPlayer } from '../game/types';
import type { GameAction } from '../state/gameReducer';
import { CountUp } from './CountUp';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { WorldPlayerLink } from './WorldPlayerLink';
import { rivalDifficulty, rivalStyleInfo, weekLabel } from './helpers';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

const POSITION_ORDER: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];
const POS_ABBR: Record<Position, string> = { Base: 'B', Escolta: 'E', Alero: 'A', 'Ala-Pívot': 'AP', Pívot: 'P' };
const Q_LABELS = ['1er', '2do', '3er', '4to'];

function shortName(name: string): string {
  const parts = name.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/);
  return parts[parts.length - 1];
}

/* Los cinco puestos sobre media cancha horizontal (en % de la mitad): el base
   atrás, los perimetrales en el medio, los grandes cerca del aro. La otra mitad
   se espeja. */
const HALF_SLOTS: { x: number; y: number }[] = [
  { x: 44, y: 50 }, // Base
  { x: 32, y: 13 }, // Escolta
  { x: 32, y: 87 }, // Alero
  { x: 11, y: 34 }, // Ala-Pívot
  { x: 11, y: 66 }, // Pívot
];

/** Media cancha por puesto: el orden de la pizarra, completado con los que sobren. */
function bySlots<T extends { position: Position }>(five: T[]): (T | null)[] {
  const slots: (T | null)[] = [null, null, null, null, null];
  const rest = [...five];
  POSITION_ORDER.forEach((pos, i) => {
    const idx = rest.findIndex((p) => p.position === pos);
    if (idx >= 0) {
      slots[i] = rest[idx];
      rest.splice(idx, 1);
    }
  });
  for (let i = 0; i < 5 && rest.length > 0; i++) if (!slots[i]) slots[i] = rest.shift()!;
  return slots;
}

function CanchaLineas() {
  return (
    <svg className="cancha-lineas" viewBox="0 0 600 340" preserveAspectRatio="none">
      <rect x="3" y="3" width="594" height="334" rx="8" />
      <line x1="300" y1="3" x2="300" y2="337" />
      <circle cx="300" cy="170" r="42" />
      <rect x="3" y="105" width="110" height="130" />
      <rect x="487" y="105" width="110" height="130" />
      <circle cx="113" cy="170" r="36" />
      <circle cx="487" cy="170" r="36" />
      <path d="M 3 40 L 60 40 A 150 150 0 0 1 60 300 L 3 300" />
      <path d="M 597 40 L 540 40 A 150 150 0 0 0 540 300 L 597 300" />
      <line x1="3" y1="148" x2="30" y2="148" />
      <line x1="3" y1="192" x2="30" y2="192" />
      <line x1="597" y1="148" x2="570" y2="148" />
      <line x1="597" y1="192" x2="570" y2="192" />
    </svg>
  );
}

/** Notas de cambios para el filtro "Cambios": entradas, salidas, el plan, el DT, la lesión. */
function esDeCambios(n: string): boolean {
  return /cambio|entra |plan de cambios|unidad|cerradores|titulares|movió el banco|descansa|🕘|🚑/i.test(n);
}

export function PartidoVivo({ state, dispatch }: Props) {
  const [saleSel, setSaleSel] = useState<string | null>(null);
  const [entraSel, setEntraSel] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todo' | 'puntos' | 'cambios'>('todo');
  const [verSuplentesRival, setVerSuplentesRival] = useState(false);

  const live = state.live;
  if (!live) return null;
  const rival = state.rivals.find((r) => r.id === live.rivalId)!;
  const style = rivalStyleInfo(rival.style);
  const world = state.world;
  const nuestroClub = world.clubs.find((c) => c.isUser);
  const rivalClub = clubByLegacyId(world, rival.id);
  const nuestroEquipo = userTeam(world);
  const rivalEquipo = teamByLegacyRival(world, rival.id);
  const barrioDe = (venueId?: string) => world.venues.find((v) => v.id === venueId)?.neighborhood ?? '';
  const nuestrosColores = state.club.colors ?? nuestroClub?.colors ?? ['#2d5c8a', '#e8e4dc'];
  const rivalColores = rivalClub?.colors ?? ['#9d3b3b', '#e8e4dc'];

  const played = live.quarters;
  const regularPlayed = played.filter((q) => !q.overtime).length;
  const totalFor = played.reduce((t, q) => t + q.for, 0);
  const totalAgainst = played.reduce((t, q) => t + q.against, 0);
  const diff = totalFor - totalAgainst;
  const hasOT = played.some((q) => q.overtime);
  const lastQ = played.length > 0 ? played[played.length - 1] : null;
  const lastDiff = lastQ ? lastQ.for - lastQ.against : 0;
  const hotStreak = !live.finished && lastQ !== null && lastDiff >= 6;
  const coldStreak = !live.finished && lastQ !== null && lastDiff <= -6;
  const comebackMode = !live.finished && played.length > 0 && diff <= -BALANCE.liveMatch.comebackDeficit;
  const holdMode = !live.finished && played.length > 0 && diff >= BALANCE.liveMatch.comebackDeficit;
  const injuryNote = lastQ?.notes.find((n) => n.startsWith('🚑')) ?? null;

  const momento = live.finished
    ? 'Final'
    : played.length === 0
      ? 'Antes del salto'
      : regularPlayed === 2 && !hasOT
        ? 'Entretiempo'
        : hasOT
          ? 'Suplementario'
          : `Fin del ${Q_LABELS[Math.min(regularPlayed, 4) - 1]} cuarto`;

  const byId = (id: string) => state.players.find((p) => p.id === id)!;
  const onCourt = live.onCourt.map(byId);
  const bench = live.squad.filter((id) => !live.onCourt.includes(id)).map(byId);
  const freshOf = (id: string) => Math.round(live.playerFresh[id] ?? 70);
  const minsOf = (id: string) => live.minutes[id] ?? 0;
  const ptsOf = (id: string) => live.stats[id]?.pts ?? 0;
  const legsCls = (v: number) => (v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad');

  const rivalCinco = rivalLineup(state, live);
  const rivalPts = rivalBoxScore(state, live);

  // El aviso de cansancio: alguien en cancha fundido y un recambio con piernas.
  const cansado = onCourt.find((p) => freshOf(p.id) < 45);
  const recambio = cansado ? bench.find((p) => freshOf(p.id) > freshOf(cansado.id) + 12) : undefined;

  // El cambio preparado: tocás el ⇄ de uno en cancha (sale) y el de uno del
  // banco (entra); se confirma en un solo lugar. El arrastre sigue valiendo.
  const preparado = saleSel && entraSel;
  const confirmar = () => {
    if (!saleSel || !entraSel) return;
    dispatch({ type: 'SUBSTITUTE', outId: saleSel, inId: entraSel });
    setSaleSel(null);
    setEntraSel(null);
  };
  const cancelar = () => {
    setSaleSel(null);
    setEntraSel(null);
  };
  const onDropFila = (lado: 'court' | 'bench', target: Player) => (e: React.DragEvent) => {
    e.preventDefault();
    if (live.finished) return;
    const dragged = e.dataTransfer.getData('text/plain');
    if (!dragged || dragged === target.id) return;
    const draggedOnCourt = live.onCourt.includes(dragged);
    if (draggedOnCourt === (lado === 'court')) return;
    setSaleSel(draggedOnCourt ? dragged : target.id);
    setEntraSel(draggedOnCourt ? target.id : dragged);
  };

  const filaNuestra = (p: Player, lado: 'court' | 'bench') => {
    const fresh = freshOf(p.id);
    const sel = lado === 'court' ? saleSel === p.id : entraSel === p.id;
    const esRef = live.starId === p.id && lado === 'court';
    return (
      <div
        key={p.id}
        className={`pv-fila-j${sel ? (lado === 'court' ? ' sale' : ' entra') : ''}`}
        draggable={!live.finished}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', p.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropFila(lado, p)}
        title={`${p.name} · ${p.position} · piernas ${fresh} · ${minsOf(p.id)}' jugados`}
      >
        <span className="pvj-pos">{POS_ABBR[p.position]}</span>
        <span className="pvj-nombre">
          <PlayerLink id={p.id}>{p.name}</PlayerLink>
          {esRef && <Icon name="estrella" size={10} />}
        </span>
        <span className="pvj-pts">{ptsOf(p.id)}</span>
        <span className="pvj-energia">
          <span className="mini-medidor"><i className={legsCls(fresh)} style={{ width: `${fresh}%` }} /></span>
          <b>{fresh}%</b>
        </span>
        <button
          className={`pvj-swap${sel ? ' on' : ''}`}
          disabled={live.finished}
          title={lado === 'court' ? 'Sale' : 'Entra'}
          aria-label={lado === 'court' ? `Sacar a ${p.name}` : `Meter a ${p.name}`}
          onClick={() => (lado === 'court' ? setSaleSel(sel ? null : p.id) : setEntraSel(sel ? null : p.id))}
        >
          <Icon name="cambio" size={13} />
        </button>
      </div>
    );
  };

  const filaRival = (p: WorldPlayer, enCancha: boolean) => (
    <div key={p.id} className={`pv-fila-j rival${enCancha ? '' : ' banco'}`}>
      <span className="pvj-pos">{POS_ABBR[p.position]}</span>
      <span className="pvj-nombre">
        <WorldPlayerLink id={p.id}>
          {p.firstName} {p.lastName}
        </WorldPlayerLink>
      </span>
      <span className="pvj-pts">{enCancha ? (rivalPts[p.id] ?? 0) : '–'}</span>
      <span className="pvj-nivel" title="Nivel estimado desde afuera">≈{p.level}</span>
    </div>
  );

  const nuestrosSlots = bySlots(onCourt);
  const rivalSlots = bySlots(rivalCinco.court);

  return (
    <div className="partido-pantalla pv">
      {/* ---------- Cabecera ---------- */}
      <div className="card pv-cabecera">
        <div className="pvc-contexto">
          <div className="pvc-semana">{weekLabel(state.week, state.seasonLength)}</div>
          <div className="pvc-fase">{state.week <= state.seasonLength ? 'Fase regular' : 'Playoffs'}</div>
          <div className="pvc-chips">
            <span className={`chip ${rivalDifficulty(rival).cls}`}>{rivalDifficulty(rival).label}</span>
            <span className="chip accent" title={`${style.desc} ${style.advice}`}>{style.label}</span>
          </div>
        </div>

        <div className="pvc-equipo">
          <Crest seed={nuestroClub?.id ?? 'club'} name={state.club.name} colors={nuestrosColores} founded={nuestroClub?.founded} size={56} />
          <div>
            <div className="pvc-nombre">{state.club.name}</div>
            <div className="pvc-sub">{barrioDe(nuestroEquipo?.venueId) || 'Local'}</div>
          </div>
        </div>

        <div className="pvc-marcador">
          <div className="pvc-tablero">
            <span className={`pvc-score ${diff > 0 ? 'win' : diff < 0 ? 'lose' : ''}`}><CountUp value={totalFor} /></span>
            <span className="pvc-vs">vs</span>
            <span className={`pvc-score ${diff < 0 ? 'win' : diff > 0 ? 'lose' : ''}`}><CountUp value={totalAgainst} /></span>
          </div>
          <div className="pvc-momento">{momento}</div>
          {(hotStreak || coldStreak || comebackMode || holdMode || injuryNote) && (
            <div className="pvc-drama">
              {hotStreak && lastQ && <span className="chip good">Parcial {lastQ.for}-{lastQ.against}: en racha</span>}
              {coldStreak && lastQ && <span className="chip bad">Nos metieron {lastQ.against}-{lastQ.for}</span>}
              {comebackMode && <span className="chip warn">{-diff} abajo: a morder cada pelota</span>}
              {holdMode && <span className="chip warn">Ojo: {rival.name} sale a descontar</span>}
              {injuryNote && <span className="chip bad">{injuryNote}</span>}
            </div>
          )}
        </div>

        <div className="pvc-equipo rival">
          <Crest seed={rivalClub?.id ?? rival.id} name={rival.name} colors={rivalColores} founded={rivalClub?.founded} size={56} />
          <div>
            <div className="pvc-nombre"><RivalLink id={rival.id}>{rival.name}</RivalLink></div>
            <div className="pvc-sub">{barrioDe(rivalEquipo?.venueId) || 'Visitante'}</div>
          </div>
        </div>

        <table className="pvc-cuartos" title="Parciales por cuarto">
          <thead>
            <tr>
              <th></th>
              {[0, 1, 2, 3].map((i) => <th key={i}>Q{i + 1}</th>)}
              {hasOT && <th>PR</th>}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{shortName(state.club.name) === state.club.name ? state.club.name : state.club.name}</td>
              {[0, 1, 2, 3].map((i) => <td key={i}>{played.filter((q) => !q.overtime)[i]?.for ?? '–'}</td>)}
              {hasOT && <td>{played.find((q) => q.overtime)!.for}</td>}
              <td className="total">{totalFor}</td>
            </tr>
            <tr>
              <td>{rival.name}</td>
              {[0, 1, 2, 3].map((i) => <td key={i}>{played.filter((q) => !q.overtime)[i]?.against ?? '–'}</td>)}
              {hasOT && <td>{played.find((q) => q.overtime)!.against}</td>}
              <td className="total">{totalAgainst}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---------- Cuerpo ---------- */}
      <div className="pv-cuerpo">
        {/* Nuestro equipo */}
        <div className="card pane pv-equipo">
          <h3 className="card-band pv-banda" style={{ background: nuestrosColores[0] }}>
            <span>Nuestro equipo</span>
            <span className="pv-banda-sub">{state.club.name}</span>
          </h3>
          <div className="pane-body">
            <div className="pv-grupo">En cancha</div>
            <div className="pv-cab-j"><span>Pos</span><span>Jugador</span><span>Pts</span><span>Energía</span><span /></div>
            {onCourt.map((p) => filaNuestra(p, 'court'))}
            <div className="pv-grupo banco">Banco</div>
            {bench.length > 0 ? (
              <>
                <div className="pv-cab-j"><span>Pos</span><span>Jugador</span><span>Pts</span><span>Energía</span><span /></div>
                {bench.map((p) => filaNuestra(p, 'bench'))}
              </>
            ) : (
              <p className="tactic-hint">No citaste suplentes: no hay cambios posibles.</p>
            )}

            {(saleSel || entraSel) && !live.finished && (
              <div className="pv-cambio">
                <div className="pv-cambio-t"><Icon name="cambio" size={14} /> Cambio preparado</div>
                <div className="pv-cambio-par">
                  <div className={`pv-cambio-caja sale${saleSel ? '' : ' vacia'}`}>
                    <span className="pv-cambio-k">Sale</span>
                    <span>{saleSel ? `${POS_ABBR[byId(saleSel).position]} · ${byId(saleSel).name}` : 'Tocá ⇄ en uno de la cancha'}</span>
                  </div>
                  <span className="pv-cambio-flecha">→</span>
                  <div className={`pv-cambio-caja entra${entraSel ? '' : ' vacia'}`}>
                    <span className="pv-cambio-k">Entra</span>
                    <span>{entraSel ? `${POS_ABBR[byId(entraSel).position]} · ${byId(entraSel).name}` : 'Tocá ⇄ en uno del banco'}</span>
                  </div>
                </div>
                <div className="pv-cambio-botones">
                  <button className="primary" disabled={!preparado} onClick={confirmar}>
                    Confirmar cambio
                  </button>
                  <button className="pv-link" onClick={cancelar}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* La cancha y el relato */}
        <div className="pv-centro">
          <div className="pv-cancha" style={{ '--nuestro': nuestrosColores[0], '--rival': rivalColores[0] } as React.CSSProperties}>
            <CanchaLineas />
            <div className="pv-cancha-escudo">
              <Crest seed={nuestroClub?.id ?? 'club'} name={state.club.name} colors={nuestrosColores} founded={nuestroClub?.founded} size={44} />
            </div>
            {nuestrosSlots.map((p, i) =>
              p ? (
                <div
                  key={p.id}
                  className={`pv-ficha nuestro${live.starId === p.id ? ' ref' : ''}${freshOf(p.id) < 45 ? ' fundido' : ''}`}
                  style={{ left: `${HALF_SLOTS[i].x / 2}%`, top: `${HALF_SLOTS[i].y}%` }}
                  title={`${p.name} · ${p.position} · ${ptsOf(p.id)} pts · piernas ${freshOf(p.id)}`}
                >
                  <span className="pv-ficha-num">{i + 1}</span>
                  <span className="pv-ficha-nombre">{shortName(p.name)}</span>
                </div>
              ) : null
            )}
            {rivalSlots.map((p, i) =>
              p ? (
                <div
                  key={p.id}
                  className="pv-ficha rival"
                  style={{ left: `${100 - HALF_SLOTS[i].x / 2}%`, top: `${HALF_SLOTS[i].y}%` }}
                  title={`${p.firstName} ${p.lastName} · ${p.position} · nivel ≈${p.level}`}
                >
                  <span className="pv-ficha-num">{i + 1}</span>
                  <span className="pv-ficha-nombre">{p.lastName}</span>
                </div>
              ) : null
            )}
          </div>

          {live.pendingIncident ? (
            <div className="card pane partido-relato partido-incidencia">
              <h3 className="card-band">
                <Icon name="alerta" size={17} /> Incidencia en la cancha
              </h3>
              <div className="pane-body">
                <p className="previa-consigna">{live.pendingIncident.text}</p>
                <div className="modal-like options" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {live.pendingIncident.options.map((opt, i) => (
                    <button key={i} style={{ textAlign: 'left' }} onClick={() => dispatch({ type: 'INCIDENT_CHOICE', index: i })}>
                      {opt.label}
                      <span className="opt-hint" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : played.length > 0 ? (
            <div className="card pane partido-relato pv-relato" style={{ '--nuestro': nuestrosColores[0], '--rival': rivalColores[0] } as React.CSSProperties}>
              <h3 className="card-band pv-relato-cab">
                <span><Icon name="chat" size={15} /> Relato del partido</span>
                <span className="segmented pv-filtro">
                  {(['todo', 'puntos', 'cambios'] as const).map((f) => (
                    <button key={f} className={filtro === f ? 'on' : ''} onClick={() => setFiltro(f)}>
                      {f === 'todo' ? 'Todo' : f === 'puntos' ? 'Puntos' : 'Cambios'}
                    </button>
                  ))}
                </span>
              </h3>
              <div className="pane-body">
                {[...played].reverse().map((q, k) => {
                  const i = played.length - 1 - k;
                  // Las jugadas (minuto, marcador, autor) y lo que se vio (las
                  // notas del motor). "Puntos" muestra sólo las jugadas;
                  // "Cambios", sólo las notas de cambios; "Todo", las dos.
                  const jugadas = filtro === 'cambios' ? [] : jugadasDelCuarto(state, live, i);
                  const notas = filtro === 'puntos' ? [] : filtro === 'cambios' ? q.notes.filter(esDeCambios) : q.notes;
                  if (jugadas.length === 0 && notas.length === 0 && filtro !== 'todo') return null;
                  return (
                    <div key={i} className="quarter-log">
                      <div className="quarter-head">
                        {q.overtime ? 'Suplementario' : `${Q_LABELS[i]} cuarto`} · {q.for}-{q.against}
                        <span className="chip" style={{ marginLeft: '0.5rem' }}>
                          {q.defense === 'presion' ? 'Presión' : q.defense === 'hombre' ? 'Hombre' : 'Zona'} ·{' '}
                          {q.attack === 'estrella' ? 'Estrella' : q.attack === 'correr' ? 'Correr' : 'Colectivo'}
                        </span>
                      </div>
                      {jugadas.length > 0 && (
                        <div className="rj-lista">
                          {jugadas.map((j, n) => (
                            <div key={n} className={`rj ${j.lado}`}>
                              <span className="rj-min">{j.minuto}</span>
                              <span className="rj-marcador">{j.marcador}</span>
                              <span className="rj-punto" title={j.lado === 'nosotros' ? state.club.name : rival.name} />
                              <span className="rj-texto">
                                <b>{j.texto}</b>
                                {j.sub && <span className="rj-sub">{j.sub}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {notas.length > 0 && (
                        <ul className="reason-list rj-notas">
                          {notas.map((n, j) => (
                            <li key={j} className={n.startsWith('🚑') ? 'note-injury' : /racha|prendió el aro/.test(n) ? 'note-hot' : ''}>
                              {n}
                            </li>
                          ))}
                        </ul>
                      )}
                      {jugadas.length === 0 && notas.length === 0 && <p className="tactic-hint">Cuarto parejo, sin sobresaltos.</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card pane partido-relato pv-relato">
              <h3 className="card-band">La previa</h3>
              <div className="pane-body">
                <p className="previa-consigna">
                  Elegí la defensa y el ataque en el tablero, mirá quién sale y quién queda en el banco, y tocá{' '}
                  <b>Jugar el 1er cuarto</b>. Entre cuarto y cuarto podés cambiar todo.
                </p>
                {live.pendingSubNotes.length > 0 && (
                  <ul className="reason-list">
                    {live.pendingSubNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {cansado && !live.finished && (
            <div className="pv-aviso">
              <Icon name="descanso" size={16} />
              <span>
                <b>{shortName(cansado.name)} está cansado</b> ({freshOf(cansado.id)} de piernas).{' '}
                {recambio ? `Tenés recambio en el banco: ${shortName(recambio.name)} (${freshOf(recambio.id)}).` : 'No queda nadie con más piernas en el banco.'}
              </span>
            </div>
          )}
        </div>

        {/* Rival y tablero táctico */}
        <div className="partido-col-scroll pv-derecha">
          <div className="card pv-equipo">
            <h3 className="card-band pv-banda" style={{ background: rivalColores[0] }}>
              <span><RivalLink id={rival.id}>{rival.name}</RivalLink></span>
              <Crest seed={rivalClub?.id ?? rival.id} name={rival.name} colors={rivalColores} founded={rivalClub?.founded} size={22} />
            </h3>
            <div className="pv-grupo">En cancha</div>
            {rivalCinco.court.length > 0 ? (
              <>
                <div className="pv-cab-j rival"><span>Pos</span><span>Jugador</span><span>Pts</span><span>Nivel</span></div>
                {rivalCinco.court.map((p) => filaRival(p, true))}
              </>
            ) : (
              <p className="tactic-hint">Sin plantel conocido para este rival.</p>
            )}
            <div className="pv-piernas-rival" title="Piernas del equipo rival (el motor las lleva por equipo, no por jugador)">
              <span>Piernas</span>
              <span className="mini-medidor"><i className={legsCls(live.rivalFreshness)} style={{ width: `${live.rivalFreshness}%` }} /></span>
              <b>{Math.round(live.rivalFreshness)}</b>
            </div>
            {rivalCinco.bench.length > 0 && (
              <>
                <button className="pv-link" onClick={() => setVerSuplentesRival((v) => !v)}>
                  {verSuplentesRival ? 'Ocultar suplentes' : `Ver suplentes (${rivalCinco.bench.length})`} {verSuplentesRival ? '▴' : '▾'}
                </button>
                {verSuplentesRival && rivalCinco.bench.map((p) => filaRival(p, false))}
              </>
            )}
          </div>

          <div className="card pv-tablero">
            <h3 className="card-band"><Icon name="pizarra" size={15} /> Tablero táctico</h3>
            <div className="pvt-fila">
              <span className="pvt-k">Defensa</span>
              <div className="segmented">
                {(
                  [
                    ['zona', 'Zona', 'Ordenada y económica: cuida el físico. Ojo con los tiradores.'],
                    ['hombre', 'Hombre', 'Asfixia al rival, pero quema piernas. Fundidos, quedan pasillos.'],
                    ['presion', 'Presión', 'A toda cancha: el máximo castigo y el máximo desgaste. Sólo con piernas frescas.'],
                  ] as const
                ).map(([id, label, tip]) => (
                  <button key={id} className={live.defense === id ? 'on' : ''} disabled={live.finished} title={tip} onClick={() => dispatch({ type: 'SET_TACTIC', defense: id })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pvt-fila">
              <span className="pvt-k">Ataque</span>
              <div className="segmented">
                {(
                  [
                    ['equipo', 'Colectivo', 'La mueven todos: menos brillo, más pases. Aprovecha la química del grupo.'],
                    ['estrella', 'A la referencia', 'Todo pasa por la referencia. Si está caliente es fiesta; si no, la esperan entre dos.'],
                    ['correr', 'Correr', 'Ida y vuelta: más puntos para los dos. Gana el que tiene piernas.'],
                  ] as const
                ).map(([id, label, tip]) => (
                  <button key={id} className={live.attack === id ? 'on' : ''} disabled={live.finished} title={tip} onClick={() => dispatch({ type: 'SET_TACTIC', attack: id })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pvt-fila">
              <span className="pvt-k">Referencia</span>
              <select
                className="pvt-select"
                value={live.starId}
                disabled={live.finished}
                title="A quién se la dan cuando el ataque es a la referencia. Si no elegís, es el mejor de los que están en cancha."
                onChange={(e) => dispatch({ type: 'SET_STAR', playerId: e.target.value })}
              >
                {onCourt.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{live.starLocked && p.id === live.starId ? ' (elegido)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="pvt-fila">
              <span className="pvt-k">Cambios</span>
              <div className="segmented">
                <button className={!live.autoRotation ? 'on' : ''} disabled={live.finished} title="Los cambios son tuyos" onClick={() => dispatch({ type: 'SET_AUTO_ROTATION', on: false })}>
                  Vos
                </button>
                <button className={live.autoRotation ? 'on' : ''} disabled={live.finished} title={state.coach ? `${state.coach.name} hace los cambios entre cuartos` : 'El DT hace los cambios entre cuartos'} onClick={() => dispatch({ type: 'SET_AUTO_ROTATION', on: true })}>
                  {state.coach ? `DT ${shortName(state.coach.name)}` : 'DT'}
                </button>
              </div>
            </div>
            {!live.autoRotation && bench.length > 0 && (
              <div className="pvt-fila">
                <span className="pvt-k">Plan</span>
                <div className="segmented">
                  <button className={(live.plan ?? 'manual') === 'rotar' ? 'on' : ''} disabled={live.finished} title="Frescos en el 2° cuarto, titulares en el 3°, cerradores al final. Un cambio a mano manda por ese cuarto." onClick={() => dispatch({ type: 'SET_MATCH_PLAN', plan: 'rotar' })}>
                    Rota solo
                  </button>
                  <button className={(live.plan ?? 'manual') === 'manual' ? 'on' : ''} disabled={live.finished} title="Los cinco se quedan hasta que vos los muevas" onClick={() => dispatch({ type: 'SET_MATCH_PLAN', plan: 'manual' })}>
                    A mano
                  </button>
                </div>
              </div>
            )}
            {live.autoRotation && (
              <div className="pvt-fila">
                <span className="pvt-k">Directiva</span>
                <div className="segmented">
                  <button className={(live.directive ?? 'ganar') === 'ganar' ? 'on' : ''} disabled={live.finished} title="Descansa fundidos y mete a los mejores para cerrar" onClick={() => dispatch({ type: 'SET_AUTO_ROTATION', on: true, directive: 'ganar' })}>
                    A ganar
                  </button>
                  <button className={live.directive === 'repartir' ? 'on' : ''} disabled={live.finished} title="Rota el banco: todos suman minutos" onClick={() => dispatch({ type: 'SET_AUTO_ROTATION', on: true, directive: 'repartir' })}>
                    Juegan todos
                  </button>
                </div>
              </div>
            )}
            <div className="pvt-fila">
              <span className="pvt-k">Unidad</span>
              <div className="pvt-presets">
                {(
                  [
                    ['titulares', 'Titulares', 'Vuelven los cinco del arranque'],
                    ['segunda', '2da', 'Entra el banco: descansan los titulares'],
                    ['frescos', 'Frescos', 'Los cinco con más piernas ahora'],
                    ['cerradores', 'Cerradores', 'Los mejores acá y ahora, para cerrar'],
                  ] as const
                ).map(([id, label, tip]) => (
                  <button key={id} className="small" disabled={live.finished} title={tip} onClick={() => dispatch({ type: 'APPLY_PRESET', preset: id })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="pvt-nota">Se aplica al próximo cuarto.</p>
          </div>
        </div>
      </div>

      {/* ---------- Pie ---------- */}
      <div className="partido-pie">
        <div className="confirm-bar">
          {!live.finished ? (
            <button className="primary" disabled={!!live.pendingIncident} onClick={() => dispatch({ type: 'PLAY_QUARTER' })}>
              ▶ Jugar el {Q_LABELS[Math.min(regularPlayed, 3)]} cuarto
            </button>
          ) : (
            <button className="primary" onClick={() => dispatch({ type: 'FINISH_MATCH' })}>
              Ver el informe del partido →
            </button>
          )}
          {!live.finished && !live.pendingIncident && (
            <span className="hint">Piernas nuestras en cancha: {Math.round(courtFreshness(live))}. Podés cambiar la táctica antes de cada cuarto; el rival también juega…</span>
          )}
          {live.pendingIncident && <span className="hint">Resolvé la incidencia antes de seguir jugando.</span>}
        </div>
      </div>
    </div>
  );
}
