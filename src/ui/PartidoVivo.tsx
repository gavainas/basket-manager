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

import { useEffect, useRef, useState } from 'react';
import { BALANCE } from '../game/balance';
import {
  courtFreshness,
  cuartosDe,
  marcador,
  MINUTOS_POR_PARTIDO,
  RIVAL_DEFENSE_LABELS,
  rivalBoxScore,
  rivalDefenseDe,
  rivalDefensePorEstilo,
  rivalLineup,
} from '../game/match';
import { arranqueDelCuarto, jugadasDelCuarto, largoDelCuarto, largoDelTramo, type Jugada } from '../game/relato';
import { clubByLegacyId, teamByLegacyRival, userTeam } from '../game/world';
import type { DefenseTactic, GameState, Player, Position, WorldPlayer } from '../game/types';
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

/** Qué hacer contra cada defensa del rival: la pista corta, al lado de la defensa que le viste. */
const PISTA_DEFENSA_RIVAL: Record<DefenseTactic, string> = {
  presion: 'Mové la pelota, con piernas: sin piernas te la rompen.',
  hombre: 'Esperan entre dos a la referencia. Correr los rompe.',
  zona: 'La referencia con la mano caliente la castiga. Correr no sirve.',
};

/** Quien pidió menos movimiento no ve correr el reloj: el cuarto aparece jugado. */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Segundos reales que tarda un cuarto de diez minutos en el reloj en vivo. */
const SEGUNDOS_POR_CUARTO = 15;
const TICK_MS = 100;

/**
 * El reloj en vivo (sep 2026). El motor simula el cuarto por tramos de dos
 * minutos y la pantalla los CUENTA en tiempo: el reloj corre diez minutos en
 * unos quince segundos, las canastas van cayendo a medida que pasa el minuto,
 * el marcador sube con cada una y la cancha marca quién anotó. Cuando el
 * reloj llega al final del último tramo jugado, pide el siguiente: por eso
 * los cambios, la táctica y el minuto pedido entran en la próxima pelota
 * muerta, no en el próximo cuarto. Se puede pausar, saltar al final del
 * cuarto, o simular el partido entero.
 */
interface Reloj {
  /** El cuarto que se está contando. */
  q: number;
  /** Minuto del partido en el que va el reloj (con decimales). */
  t: number;
  pausa: boolean;
}

export function PartidoVivo({ state, dispatch }: Props) {
  const [saleSel, setSaleSel] = useState<string | null>(null);
  const [entraSel, setEntraSel] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todo' | 'puntos' | 'cambios'>('todo');
  const [verSuplentesRival, setVerSuplentesRival] = useState(false);
  const [reloj, setReloj] = useState<Reloj | null>(null);
  const [simulando, setSimulando] = useState(false);
  const ultimaFilaRef = useRef<HTMLDivElement | null>(null);
  const tramoPedidoRef = useRef<string>('');

  const live = state.live;
  const cuartos = live ? cuartosDe(live) : [];
  const cuartosJugados = cuartos.length;
  const relojCuarto = live && reloj ? cuartos[reloj.q] : undefined;
  const relojFin = live && reloj ? arranqueDelCuarto(live, reloj.q) + largoDelCuarto(relojCuarto?.overtime) : 0;
  // Hasta dónde puede correr el reloj: el final del último tramo que el motor
  // ya jugó (o la chicharra, si el cuarto está cerrado).
  const enCursoDelReloj = live && reloj && live.enCurso && reloj.q === live.quarters.length ? live.enCurso : null;
  const relojTope = enCursoDelReloj
    ? arranqueDelCuarto(live!, reloj!.q) + largoDelTramo(enCursoDelReloj) * (enCursoDelReloj.tramos?.length ?? 0)
    : relojFin;

  // El reloj avanza mientras no esté en pausa, hasta donde el motor llegó; al
  // llegar a la chicharra, si el motor ya jugó otro cuarto (el suplementario),
  // lo cuenta también.
  useEffect(() => {
    if (!reloj || reloj.pausa || !live) return;
    const paso = (largoDelCuarto(relojCuarto?.overtime) / SEGUNDOS_POR_CUARTO) * (TICK_MS / 1000);
    const id = window.setInterval(() => {
      setReloj((r) => {
        if (!r || r.pausa) return r;
        const t = Math.min(r.t + paso, relojTope);
        if (t < relojFin) return t === r.t ? r : { ...r, t };
        return cuartosJugados > r.q + 1 ? { q: r.q + 1, t: relojFin, pausa: false } : null;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [reloj, live, relojCuarto, relojFin, relojTope, cuartosJugados]);

  // La pelota muerta: cuando el reloj alcanza el final del último tramo
  // jugado, pide el siguiente al motor (una sola vez por tramo).
  useEffect(() => {
    if (!reloj || reloj.pausa || !live || !enCursoDelReloj || live.pendingIncident) return;
    if (reloj.t < relojTope - 1e-6) return;
    const clave = `${reloj.q}:${enCursoDelReloj.tramos?.length ?? 0}`;
    if (tramoPedidoRef.current === clave) return;
    tramoPedidoRef.current = clave;
    dispatch({ type: 'PLAY_TRAMO' });
  }, [reloj, live, enCursoDelReloj, relojTope, dispatch]);

  // Simular el partido: un cuarto tras otro, sin reloj, hasta el final o hasta
  // una incidencia que tenés que resolver vos.
  useEffect(() => {
    if (!simulando || !live) return;
    if (live.finished || live.pendingIncident) {
      setSimulando(false);
      return;
    }
    const id = window.setTimeout(() => dispatch({ type: 'PLAY_QUARTER' }), 60);
    return () => window.clearTimeout(id);
  }, [simulando, live, dispatch]);

  // La última canasta que cayó queda a la vista.
  // Se desplaza sólo el panel del relato, nunca la página: en el celular la
  // página es la que scrollea y no tiene que saltar con cada canasta.
  useEffect(() => {
    const fila = ultimaFilaRef.current;
    const panel = fila?.closest('.pane-body');
    if (!reloj || !fila || !(panel instanceof HTMLElement) || panel.scrollHeight <= panel.clientHeight) return;
    const r = fila.getBoundingClientRect();
    const c = panel.getBoundingClientRect();
    // Si la fila no entra entera en el panel, se alinea arriba (y no se mueve
    // ida y vuelta entre un render y otro).
    if (r.height >= c.height - 6) panel.scrollTop += r.top - c.top;
    else if (r.bottom > c.bottom) panel.scrollTop += r.bottom - c.bottom + 6;
    else if (r.top < c.top) panel.scrollTop -= c.top - r.top + 6;
  });

  if (!live) return null;

  const jugarCuarto = () => {
    if (reducedMotion()) {
      dispatch({ type: 'PLAY_QUARTER' });
      return;
    }
    // Arranca el cuarto (o lo sigue desde la pelota muerta en la que quedó) y
    // pone el reloj ahí: el motor va a jugar el próximo tramo.
    const q = live.quarters.length;
    const jugados = live.enCurso?.tramos?.length ?? 0;
    const t = arranqueDelCuarto(live, q) + (live.enCurso ? largoDelTramo(live.enCurso) * jugados : 0);
    tramoPedidoRef.current = `${q}:${jugados}`;
    dispatch({ type: 'PLAY_TRAMO' });
    setReloj({ q, t, pausa: false });
  };
  const saltar = () => {
    dispatch({ type: 'PLAY_QUARTER' });
    setReloj(null);
  };
  const pausar = () => setReloj((r) => (r ? { ...r, pausa: !r.pausa } : r));
  const pedirMinuto = () => dispatch({ type: 'PEDIR_MINUTO' });
  const minutosQueQuedan = MINUTOS_POR_PARTIDO - (live.minutosPedidos ?? 0);
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

  // Los cuartos que se ven: los jugados y el que está en curso.
  const played = cuartos;
  const hasOT = played.some((q) => q.overtime);

  // Con el reloj corriendo, la pantalla muestra el partido HASTA ese minuto:
  // las canastas que ya cayeron, el marcador que va, los puntos que cada uno
  // lleva. Lo que el motor ya sabe del resto del cuarto todavía no se ve.
  const jugadasDe = (i: number): Jugada[] => {
    const todas = jugadasDelCuarto(state, live, i);
    if (!reloj || i < reloj.q) return todas;
    if (i > reloj.q) return [];
    return todas.filter((j) => j.t <= reloj.t);
  };
  const ocultas: Jugada[] = reloj ? jugadasDelCuarto(state, live, reloj.q).filter((j) => j.t > reloj.t) : [];
  const ptsOcultos = (id: string) => ocultas.filter((j) => j.quienId === id).reduce((t, j) => t + j.pts, 0);
  const visibles = reloj ? jugadasDe(reloj.q) : [];
  const ultimaVisible = visibles.length > 0 ? visibles[visibles.length - 1] : null;
  const antesDelReloj = reloj ? played.slice(0, reloj.q).reduce((t, q) => ({ f: t.f + q.for, a: t.a + q.against }), { f: 0, a: 0 }) : null;
  const mostrado = reloj
    ? ultimaVisible
      ? { f: ultimaVisible.f, a: ultimaVisible.a }
      : antesDelReloj!
    : marcador(live);
  const totalFor = mostrado.f;
  const totalAgainst = mostrado.a;
  const diff = totalFor - totalAgainst;
  const parcialDe = (i: number, lado: 'for' | 'against'): number | string => {
    const q = played.filter((x) => !x.overtime)[i];
    if (!q) return '–';
    if (reloj && i > reloj.q) return '–';
    if (reloj && i === reloj.q) return lado === 'for' ? totalFor - antesDelReloj!.f : totalAgainst - antesDelReloj!.a;
    return q[lado];
  };
  // Los cuartos cerrados de verdad: sin el que corre en el reloj ni el que quedó en una pelota muerta.
  const cuartosCerrados = live.quarters.length;
  const regularPlayed = live.quarters.filter((q) => !q.overtime).length;
  const enDescanso = !reloj && !live.enCurso;
  const lastQ = cuartosCerrados > 0 ? live.quarters[cuartosCerrados - 1] : null;
  const lastDiff = lastQ ? lastQ.for - lastQ.against : 0;
  const hotStreak = enDescanso && !live.finished && lastQ !== null && lastDiff >= 6;
  const coldStreak = enDescanso && !live.finished && lastQ !== null && lastDiff <= -6;
  const comebackMode = enDescanso && !live.finished && played.length > 0 && diff <= -BALANCE.liveMatch.comebackDeficit;
  const holdMode = enDescanso && !live.finished && played.length > 0 && diff >= BALANCE.liveMatch.comebackDeficit;
  const injuryNote = enDescanso ? (lastQ?.notes.find((n) => n.startsWith('🚑')) ?? null) : null;

  const minutoReloj = reloj ? Math.min(relojFin, Math.floor(reloj.t) + (reloj.t % 1 > 0 ? 1 : 0)) : 0;
  const nombreCuarto = (i: number) => (played[i]?.overtime ? 'Suplementario' : `${Q_LABELS[Math.min(i, 3)]} cuarto`);
  const minutoEnCurso = live.enCurso ? arranqueDelCuarto(live, cuartosCerrados) + largoDelTramo(live.enCurso) * (live.enCurso.tramos?.length ?? 0) : 0;
  const momento = reloj
    ? `${nombreCuarto(reloj.q)} · ${minutoReloj}'${reloj.pausa ? ' · pausado' : ''}`
    : live.enCurso
      ? `${nombreCuarto(cuartosCerrados)} · ${minutoEnCurso}' · pelota muerta`
      : live.finished
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
  const ptsOf = (id: string) => (live.stats[id]?.pts ?? 0) - ptsOcultos(id);
  const legsCls = (v: number) => (v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad');

  const rivalCinco = rivalLineup(state, live);
  // La defensa del rival que VISTE: con el reloj corriendo, la del último
  // tramo que terminó (el cambio se anuncia al final del tramo, no antes).
  const defensaVista: DefenseTactic = (() => {
    if (!reloj) return rivalDefenseDe(live, rival);
    let vista: DefenseTactic | undefined;
    cuartos.forEach((q, i) => {
      if (i > reloj.q) return;
      const base = arranqueDelCuarto(live, i);
      const len = largoDelTramo(q);
      (q.tramos ?? []).forEach((t, k) => {
        if (i < reloj.q || base + (k + 1) * len <= reloj.t + 1e-6) vista = t.rivalDefense ?? vista;
      });
    });
    return vista ?? rivalDefensePorEstilo(rival.style);
  })();
  const rivalPtsTotal = rivalBoxScore(state, live);
  const rivalPts: Record<string, number> = {};
  for (const [id, n] of Object.entries(rivalPtsTotal)) rivalPts[id] = n - ptsOcultos(id);
  // Quién acaba de anotar: la ficha late un momento en la cancha.
  const acabaDeAnotar = reloj && ultimaVisible && reloj.t - ultimaVisible.t < 0.9 ? ultimaVisible.quienId : null;

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
              {[0, 1, 2, 3].map((i) => <td key={i}>{parcialDe(i, 'for')}</td>)}
              {hasOT && <td>{reloj ? '–' : played.find((q) => q.overtime)!.for}</td>}
              <td className="total">{totalFor}</td>
            </tr>
            <tr>
              <td>{rival.name}</td>
              {[0, 1, 2, 3].map((i) => <td key={i}>{parcialDe(i, 'against')}</td>)}
              {hasOT && <td>{reloj ? '–' : played.find((q) => q.overtime)!.against}</td>}
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
                  className={`pv-ficha nuestro${live.starId === p.id ? ' ref' : ''}${freshOf(p.id) < 45 ? ' fundido' : ''}${acabaDeAnotar === p.id ? ' anoto' : ''}`}
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
                  className={`pv-ficha rival${acabaDeAnotar === p.id ? ' anoto' : ''}`}
                  style={{ left: `${100 - HALF_SLOTS[i].x / 2}%`, top: `${HALF_SLOTS[i].y}%` }}
                  title={`${p.firstName} ${p.lastName} · ${p.position} · nivel ≈${p.level}`}
                >
                  <span className="pv-ficha-num">{i + 1}</span>
                  <span className="pv-ficha-nombre">{p.lastName}</span>
                </div>
              ) : null
            )}
          </div>

          {live.pendingIncident && !reloj ? (
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
                  // Con el reloj corriendo, los cuartos que todavía no empezaron no existen.
                  if (reloj && i > reloj.q) return null;
                  const enVivo = (reloj !== null && i === reloj.q) || (reloj === null && i === cuartosCerrados && !!live.enCurso);
                  // Las jugadas (minuto, marcador, autor; los cambios y las
                  // notas de cada pelota muerta) y lo que se vio del cuarto
                  // entero (las notas del motor, sin repetir las que ya están
                  // en su minuto). "Puntos" muestra sólo las canastas;
                  // "Cambios", sólo las entradas y salidas; "Todo", todo.
                  const jugadas = jugadasDe(i).filter((j) => (filtro === 'puntos' ? !j.tipo : filtro === 'cambios' ? j.tipo === 'cambio' : true));
                  const enTramos = new Set((q.tramos ?? []).flatMap((t) => t.notes ?? []));
                  const notasDelCuarto = q.notes.filter((n) => !enTramos.has(n));
                  const notas = enVivo || filtro === 'puntos' ? [] : filtro === 'cambios' ? notasDelCuarto.filter(esDeCambios) : notasDelCuarto;
                  if (jugadas.length === 0 && notas.length === 0 && filtro !== 'todo' && !enVivo) return null;
                  const parcial = reloj && i === reloj.q ? `${totalFor - antesDelReloj!.f}-${totalAgainst - antesDelReloj!.a}` : `${q.for}-${q.against}`;
                  return (
                    <div key={i} className={`quarter-log${enVivo ? ' en-vivo' : ''}`}>
                      <div className="quarter-head">
                        {q.overtime ? 'Suplementario' : `${Q_LABELS[i]} cuarto`} · {parcial}
                        {enVivo && <span className="rj-vivo">● en juego</span>}
                        <span className="chip" style={{ marginLeft: '0.5rem' }}>
                          {q.defense === 'presion' ? 'Presión' : q.defense === 'hombre' ? 'Hombre' : 'Zona'} ·{' '}
                          {q.attack === 'estrella' ? 'Estrella' : q.attack === 'correr' ? 'Correr' : 'Colectivo'}
                        </span>
                      </div>
                      {enVivo && jugadas.length === 0 && <p className="tactic-hint rj-espera">Salta la pelota…</p>}
                      {jugadas.length > 0 && (
                        <div className="rj-lista">
                          {jugadas.map((j, n) => (
                            <div key={n} className={`rj ${j.lado}${j.tipo ? ` ${j.tipo}` : ''}${enVivo && n === jugadas.length - 1 ? ' nueva' : ''}`} ref={enVivo && n === jugadas.length - 1 ? ultimaFilaRef : undefined}>
                              <span className="rj-min">{j.minuto}</span>
                              <span className="rj-marcador">{j.marcador}</span>
                              {j.tipo ? (
                                <span className="rj-icono">{j.tipo === 'cambio' ? <Icon name="cambio" size={11} /> : '·'}</span>
                              ) : (
                                <span className="rj-punto" title={j.lado === 'nosotros' ? state.club.name : rival.name} />
                              )}
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

          {cansado && !live.finished && !reloj && (
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
            <div className="pv-defensa-rival" title="Cómo están defendiendo. Cambian durante el partido, sin mirar tu pizarra: te enterás por el relato.">
              <span>Defienden</span>
              <b>{RIVAL_DEFENSE_LABELS[defensaVista]}</b>
              <span className="pv-defensa-pista">{PISTA_DEFENSA_RIVAL[defensaVista]}</span>
            </div>
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
            <p className="pvt-nota">{reloj || live.enCurso ? 'Entra en la próxima pelota muerta.' : 'Se aplica desde el próximo cuarto.'}</p>
          </div>
        </div>
      </div>

      {/* ---------- Pie ---------- */}
      <div className="partido-pie">
        <div className="confirm-bar pv-pie">
          {reloj ? (
            <>
              <button className="primary" onClick={pausar}>
                {reloj.pausa ? '▶ Seguir' : '❚❚ Pausar'}
              </button>
              <button
                disabled={!live.enCurso || !!live.minutoPedido || minutosQueQuedan <= 0}
                title="Corta el juego en la próxima pelota muerta: el rival ataca peor ese tramo y los cinco respiran. Tenés dos por partido."
                onClick={pedirMinuto}
              >
                ⏱ Minuto{minutosQueQuedan > 0 ? ` (${minutosQueQuedan})` : ''}
              </button>
              <button onClick={saltar}>Saltar el cuarto ⏭</button>
              <span className="hint">
                {live.minutoPedido
                  ? 'Pediste minuto: corre en la próxima pelota muerta.'
                  : reloj.pausa
                    ? 'Reloj parado: armá el cambio y seguí cuando quieras.'
                    : 'En vivo: los cambios y la táctica entran en la próxima pelota muerta.'}
              </span>
            </>
          ) : !live.finished ? (
            <>
              <button className="primary" disabled={!!live.pendingIncident || simulando} onClick={jugarCuarto}>
                {live.enCurso ? `▶ Seguir el ${Q_LABELS[Math.min(regularPlayed, 3)]} cuarto` : `▶ Jugar el ${Q_LABELS[Math.min(regularPlayed, 3)]} cuarto`}
              </button>
              <button disabled={!!live.pendingIncident || simulando} title="Juega lo que falta de corrido, con tu plan de cambios (o el DT). Se frena sola si hay una incidencia." onClick={() => setSimulando(true)}>
                {simulando ? 'Simulando…' : 'Simular el partido ⏩'}
              </button>
              {!live.pendingIncident && (
                <span className="hint">Piernas nuestras en cancha: {Math.round(courtFreshness(live))}. Podés cambiar la táctica antes de cada cuarto; el rival también juega…</span>
              )}
              {live.pendingIncident && <span className="hint">Resolvé la incidencia antes de seguir jugando.</span>}
            </>
          ) : (
            <button className="primary" onClick={() => dispatch({ type: 'FINISH_MATCH' })}>
              Ver el informe del partido →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
