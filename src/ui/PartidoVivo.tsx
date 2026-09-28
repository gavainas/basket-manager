// El partido en vivo (UI V1, sep 2026 — design/UI_V1_GUIA.md y la lámina 05,
// cuadro 19 «Partido en vivo», de design/arte/referencias/). Nació junto al
// Tablero aprobado, así que habla su idioma:
//
// - el MARCADOR es el héroe, sin caja: los dos escudos y los tantos en voz
//   display sobre la tribuna (escena cab-partido), el cuarto y el reloj en el
//   medio, los parciales en una línea y las rachas escritas como frase;
// - la CANCHA en el centro con las caras de los diez, y abajo el relato (el
//   único panel que scrollea por dentro: crece jugada a jugada);
// - un equipo a cada lado, cada uno en UNA planilla: el nuestro con cómo se
//   cambia (quién decide, el plan, las unidades, la referencia) y el rival con
//   cómo defiende y sus piernas;
// - el PIE es la consola del DT: la pizarra (defensa y ataque) siempre a mano
//   a la izquierda, y a la derecha el minuto y el único naranja (jugar,
//   pausar o ir al informe), como en las otras etapas de la semana. El cambio
//   preparado aparece ahí arriba, en una tira.
//
// Lo que la referencia promete y el motor todavía no tiene (presión en tres
// niveles, ritmo, marca especial, energía individual del rival, relato jugada
// a jugada) no está: no se dibujan controles que no hacen nada. La referencia
// del ataque sí se elige (SET_STAR), y el quinteto rival es real: son las
// personas del mundo que vinieron hoy, con sus puntos repartidos cuarto a
// cuarto (rivalBoxScore, de lectura).

import { useContext, useEffect, useRef, useState } from 'react';
import { BALANCE } from '../game/balance';
import {
  courtFreshness,
  cuartosDe,
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
import { MatchClockContext, visibleScore, visibleVitals } from './matchPresentation';
import { Busto } from './Busto';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { PlayerLink } from './PlayerLink';
import { RivalLink } from './RivalLink';
import { WorldPlayerLink } from './WorldPlayerLink';
import { rivalDifficulty, rivalStyleInfo, weekLabel } from './helpers';
import { useEscape, useEspacio } from './teclas';
import './partido.css';

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
  { x: 58, y: 50 }, // Base
  { x: 46, y: 13 }, // Escolta
  { x: 46, y: 87 }, // Alero
  { x: 11, y: 34 }, // Ala-Pívot
  { x: 11, y: 66 }, // Pívot
];
/* Las fichas (la cara y el apellido) miden 84 × 60 px; la cancha, unos
   700 × 200 en la notebook. Con estas cotas no se tocan entre sí. */

/**
 * Dónde va la ficha de un jugador (centro, en % de la cancha), sin que se
 * salga: la ficha mide 84 × 60 px y la cancha recorta lo que desborda
 * (`overflow: hidden`), así que los grandes pegados al aro perdían la primera
 * letra ("ernández") y los de las puntas, media etiqueta abajo en la
 * notebook. Con `clamp()` el centro nunca queda a menos de media ficha del
 * borde; en una cancha ancha no cambia nada.
 */
function posicionFicha(xPct: number, yPct: number): React.CSSProperties {
  return {
    left: `clamp(42px, ${xPct}%, calc(100% - 42px))`,
    top: `clamp(31px, ${yPct}%, calc(100% - 31px))`,
  };
}

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
  return /cambio|entra |plan de cambios|unidad|cerradores|titulares|movió el banco|descansa|🕘|🚑|📋/i.test(n);
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
export function PartidoVivo({ state, dispatch }: Props) {
  const [saleSel, setSaleSel] = useState<string | null>(null);
  const [entraSel, setEntraSel] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todo' | 'puntos' | 'cambios'>('todo');
  const [verSuplentesRival, setVerSuplentesRival] = useState(false);
  const { reloj, setReloj } = useContext(MatchClockContext);
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
    const panel = fila?.closest('.vivo-relato-cuerpo');
    if (!reloj || !fila || !(panel instanceof HTMLElement) || panel.scrollHeight <= panel.clientHeight) return;
    const r = fila.getBoundingClientRect();
    const c = panel.getBoundingClientRect();
    // Si la fila no entra entera en el panel, se alinea arriba (y no se mueve
    // ida y vuelta entre un render y otro).
    if (r.height >= c.height - 6) panel.scrollTop += r.top - c.top;
    else if (r.bottom > c.bottom) panel.scrollTop += r.bottom - c.bottom + 6;
    else if (r.top < c.top) panel.scrollTop -= c.top - r.top + 6;
  });

  const jugarCuarto = () => {
    if (!live) return;
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

  /* La barra espaciadora hace lo que hace el botón principal del pie: jugar el
     cuarto, pausar el reloj o ir al informe. Con una incidencia sin resolver o
     mientras simula no hace nada, igual que el botón apagado. */
  useEspacio(
    !live
      ? null
      : reloj
        ? pausar
        : live.finished
          ? () => dispatch({ type: 'FINISH_MATCH' })
          : live.pendingIncident || simulando
            ? null
            : jugarCuarto
  );

  if (!live) return null;

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
  const ocultas: Jugada[] = reloj ? played.flatMap((_q, i) => i < reloj.q ? [] : jugadasDelCuarto(state, live, i).filter((j) => j.t > reloj.t)) : [];
  const ptsOcultos = (id: string) => ocultas.filter((j) => j.quienId === id).reduce((t, j) => t + j.pts, 0);
  const visibles = reloj ? jugadasDe(reloj.q) : [];
  const ultimaVisible = visibles.length > 0 ? visibles[visibles.length - 1] : null;
  const antesDelReloj = reloj ? played.slice(0, reloj.q).reduce((t, q) => ({ f: t.f + q.for, a: t.a + q.against }), { f: 0, a: 0 }) : null;
  const mostrado = visibleScore(state, live, reloj);
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

  const segundosReloj = reloj ? Math.floor(Math.min(relojFin, reloj.t) * 60 + 1e-6) : 0;
  const tiempoReloj = `${Math.floor(segundosReloj / 60)}:${String(segundosReloj % 60).padStart(2, '0')}`;
  const nombreCuarto = (i: number) => (played[i]?.overtime ? 'Suplementario' : `${Q_LABELS[Math.min(i, 3)]} cuarto`);
  const minutoEnCurso = live.enCurso ? arranqueDelCuarto(live, cuartosCerrados) + largoDelTramo(live.enCurso) * (live.enCurso.tramos?.length ?? 0) : 0;
  const momento = reloj
    ? `${nombreCuarto(reloj.q)} · ${tiempoReloj}${reloj.pausa ? ' · pausado' : ''}`
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
  const vitals = visibleVitals(live, reloj);
  const onCourt = vitals.onCourt.map(byId);
  const bench = live.squad.filter((id) => !vitals.onCourt.includes(id)).map(byId);
  const freshOf = (id: string) => Math.round(vitals.playerFresh[id] ?? 70);
  const minsOf = (id: string) => Math.floor((vitals.minutes[id] ?? 0) + 1e-6);
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
  const cambioEnCurso = (saleSel || entraSel) && !live.finished;
  // Escape deshace el cambio a medio armar; sin cambio armado, el marco lo usa para volver al Tablero.
  useEscape(() => {
    if (!cambioEnCurso) return false;
    cancelar();
    return true;
  });
  /* El cambio preparado vive en el pie, que es lo único que nunca se mueve
     (design/PLAN_MARCO_FIJO.md): con el scroll único, a 1366×768 un panel de
     cambio debajo del banco caía detrás del pie y tocar ⇄ dos veces no
     mostraba ningún botón. La tira "Sale → Entra" aparece arriba de los
     mandos, con Confirmar y Cancelar. */
  const nombreCorto = (id: string) => `${POS_ABBR[byId(id).position]} · ${shortName(byId(id).name)}`;
  const cambioEnPie = cambioEnCurso ? (
    <div className="vivo-cambio" role="group" aria-label="Cambio preparado">
      <span className="vivo-cambio-t"><Icon name="cambio" size={14} /> Cambio</span>
      <span className={`vivo-cambio-caja sale${saleSel ? '' : ' vacia'}`}>
        <small>Sale</small>
        <span>{saleSel ? nombreCorto(saleSel) : 'tocá ⇄ en uno de la cancha'}</span>
      </span>
      <span className="vivo-cambio-flecha">→</span>
      <span className={`vivo-cambio-caja entra${entraSel ? '' : ' vacia'}`}>
        <small>Entra</small>
        <span>{entraSel ? nombreCorto(entraSel) : 'tocá ⇄ en uno del banco'}</span>
      </span>
      <button className="vivo-confirmar" disabled={!preparado} onClick={confirmar}>
        Confirmar cambio
      </button>
      <button className="ghost" onClick={cancelar}>Cancelar</button>
    </div>
  ) : null;
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
    // Expulsado, con cinco faltas o sacado resentido: no vuelve a entrar hoy.
    const fuera = lado === 'bench' && (live.fueraDelPartido ?? []).includes(p.id);
    return (
      <div
        key={p.id}
        className={`vivo-j${sel ? (lado === 'court' ? ' sale' : ' entra') : ''}${fuera ? ' fuera' : ''}`}
        draggable={!live.finished && !fuera}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', p.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropFila(lado, p)}
        title={fuera ? `${p.name} · afuera por hoy: no vuelve a entrar` : `${p.name} · ${p.position} · piernas ${fresh} · ${minsOf(p.id)}' jugados`}
      >
        <span className="vivo-j-pos">{POS_ABBR[p.position]}</span>
        <span className="vivo-j-nom">
          <PlayerLink id={p.id}>{p.name}</PlayerLink>
          {esRef && <span className="vivo-j-ref" title="La referencia del ataque"><Icon name="estrella" size={11} /></span>}
          {/* El que salió por tu decisión y puede volver (el que guardaste con
              cuatro faltas, el que sacaste hasta que se enfríe) lleva
              "reservado". El que no vuelve hoy (resentido, expulsado, cinco
              faltas) ya va tachado y con su título: decirle también
              "reservado · vuelve cuando lo pongas vos" era contradecir la
              incidencia que acababa de prometer "se queda afuera lo que resta". */}
          {lado === 'bench' && !fuera && live.heldOut?.includes(p.id) && (
            <small className="vivo-j-nota" title="Reservado por tu decisión. Vuelve cuando lo pongas vos.">
              reservado
            </small>
          )}
          {fuera && <small className="vivo-j-nota">afuera</small>}
        </span>
        <span className="vivo-j-pts">{ptsOf(p.id)}</span>
        <span className="vivo-j-piernas" title={`Piernas ${fresh}`}>
          <span className="mini-medidor"><i className={legsCls(fresh)} style={{ width: `${fresh}%` }} /></span>
          <b className={legsCls(fresh)}>{fresh}</b>
        </span>
        <button
          className={`vivo-j-swap${sel ? ' on' : ''}`}
          disabled={live.finished || fuera}
          title={fuera ? 'Afuera por hoy' : lado === 'court' ? 'Sale' : 'Entra'}
          aria-label={lado === 'court' ? `Sacar a ${p.name}` : `Meter a ${p.name}`}
          onClick={() => (lado === 'court' ? setSaleSel(sel ? null : p.id) : setEntraSel(sel ? null : p.id))}
        >
          <Icon name="cambio" size={13} />
        </button>
      </div>
    );
  };

  const filaRival = (p: WorldPlayer, enCancha: boolean) => (
    <div key={p.id} className={`vivo-j rival${enCancha ? '' : ' banco'}`}>
      <span className="vivo-j-pos">{POS_ABBR[p.position]}</span>
      <span className="vivo-j-nom">
        <WorldPlayerLink id={p.id}>
          {p.firstName} {p.lastName}
        </WorldPlayerLink>
      </span>
      <span className="vivo-j-pts">{enCancha ? (rivalPts[p.id] ?? 0) : '–'}</span>
      <span className="vivo-j-nivel" title="Nivel estimado desde afuera">≈{p.level}</span>
    </div>
  );

  const nuestrosSlots = bySlots(onCourt);
  const rivalSlots = bySlots(rivalCinco.court);
  const dificultad = rivalDifficulty(rival);
  // El cuarto que se está jugando (o el que quedó en una pelota muerta), para marcarlo en los parciales.
  const cuartoActual = reloj ? reloj.q : live.enCurso ? cuartosCerrados : -1;
  const parcial = (i: number) => {
    const f = parcialDe(i, 'for');
    const a = parcialDe(i, 'against');
    return f === '–' && a === '–' ? '–' : `${f}-${a}`;
  };
  const colores = { '--nuestro': nuestrosColores[0], '--rival': rivalColores[0] } as React.CSSProperties;
  const hayDrama = hotStreak || coldStreak || comebackMode || holdMode || !!injuryNote;

  // La letra chica del partido, dicha una vez, debajo de la cancha.
  const leyenda = live.finished ? (
    <>Terminó el partido. <b>Espacio</b> abre el informe.</>
  ) : reloj ? (
    <>
      {live.minutoPedido
        ? 'Pediste minuto: corre en la próxima pelota muerta.'
        : reloj.pausa
          ? 'Reloj parado: armá el cambio y seguí cuando quieras.'
          : 'En vivo: los cambios y la táctica entran en la próxima pelota muerta.'}{' '}
      <b>Espacio</b> {reloj.pausa ? 'sigue' : 'pausa'}.
    </>
  ) : live.pendingIncident ? (
    <>Resolvé la incidencia antes de seguir jugando.</>
  ) : (
    <>
      {cansado && (
        <>
          <b className="warn">{shortName(cansado.name)} está cansado</b> ({freshOf(cansado.id)} de piernas).{' '}
          {recambio ? <>Tenés recambio en el banco: <b>{shortName(recambio.name)}</b> ({freshOf(recambio.id)}). </> : 'No queda nadie con más piernas en el banco. '}
        </>
      )}
      Piernas nuestras en cancha: <b>{Math.round(courtFreshness(live))}</b>.{' '}
      {live.enCurso ? 'La táctica entra en la próxima pelota muerta.' : 'La táctica se aplica desde el próximo cuarto; el rival también juega.'}{' '}
      <b>Espacio</b> juega.
    </>
  );

  return (
    <div className="partido-pantalla vivo">
      {/* ---------- El marcador: el héroe, sin caja ---------- */}
      <header className="vivo-marcador v1-hero" aria-label="Marcador">
        <div className="v1-eyebrow vivo-contexto">
          <b>{weekLabel(state.week, state.seasonLength).replace('Semana', 'Fecha')}</b>
          {' · '}{state.week <= state.seasonLength ? 'Fase regular' : 'Playoffs'}
          {' · '}<b className={`vivo-dif ${dificultad.cls}`}>{dificultad.label}</b>
          {' · '}<span title={`${style.desc} ${style.advice}`}>{style.label}</span>
        </div>
        <div className="vivo-versus">
          <div className="vivo-equipo">
            <Crest seed={nuestroClub?.id ?? 'club'} name={state.club.name} colors={nuestrosColores} founded={nuestroClub?.founded} size={64} />
            <div>
              <div className="vivo-nombre">{state.club.name}</div>
              <div className="vivo-sub">{barrioDe(nuestroEquipo?.venueId) || 'Local'}</div>
            </div>
          </div>
          <div className="vivo-tanto" data-lado="nuestro">
            <span className={diff < 0 ? 'abajo' : ''}>{totalFor}</span>
          </div>
          <div className="vivo-reloj">
            <span className="vivo-momento">
              {reloj && !reloj.pausa && <i className="vivo-punto" aria-hidden="true" />}
              {momento}
            </span>
            <span className="vivo-cuartos" title="Parciales por cuarto (nosotros-ellos)">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i === cuartoActual ? 'on' : i < cuartosCerrados ? 'jugado' : ''}>
                  <b>Q{i + 1}</b> {parcial(i)}
                </span>
              ))}
              {hasOT && (
                <span className="jugado">
                  <b>PR</b> {reloj ? '–' : `${played.find((q) => q.overtime)!.for}-${played.find((q) => q.overtime)!.against}`}
                </span>
              )}
            </span>
          </div>
          <div className="vivo-tanto" data-lado="rival">
            <span className={diff > 0 ? 'abajo' : ''}>{totalAgainst}</span>
          </div>
          <div className="vivo-equipo rival">
            <div>
              <div className="vivo-nombre"><RivalLink id={rival.id}>{rival.name}</RivalLink></div>
              <div className="vivo-sub">{barrioDe(rivalEquipo?.venueId) || 'Visitante'}</div>
            </div>
            <Crest seed={rivalClub?.id ?? rival.id} name={rival.name} colors={rivalColores} founded={rivalClub?.founded} size={64} />
          </div>
        </div>
        {hayDrama && (
          <p className="v1-frase vivo-drama">
            {hotStreak && lastQ && <span>Parcial <b className="good">{lastQ.for}-{lastQ.against}</b>: estamos en racha.</span>}
            {coldStreak && lastQ && <span>Nos metieron un <b className="bad">{lastQ.against}-{lastQ.for}</b>.</span>}
            {comebackMode && <span><b className="warn">{-diff} abajo</b>: a morder cada pelota.</span>}
            {holdMode && <span><b className="warn">Ojo</b>: {rival.name} sale a descontar.</span>}
            {injuryNote && <span className="vivo-drama-lesion">{injuryNote}</span>}
          </p>
        )}
      </header>

      {/* ---------- La cancha, con un equipo a cada lado ---------- */}
      <div className="vivo-cuerpo">
        <aside className="vivo-lado v1-planilla" aria-label="Nuestro equipo">
          <h3 className="vivo-lado-tit">
            <Crest seed={nuestroClub?.id ?? 'club'} name={state.club.name} colors={nuestrosColores} founded={nuestroClub?.founded} size={24} />
            <span>{state.club.name}</span>
          </h3>
          <div className="vivo-grupo"><span>En cancha</span><span>Pts</span><span>Piernas</span></div>
          {onCourt.map((p) => filaNuestra(p, 'court'))}
          <div className="vivo-grupo banco"><span>Banco</span></div>
          {bench.length > 0 ? bench.map((p) => filaNuestra(p, 'bench')) : <p className="vivo-vacio">No citaste suplentes: no hay cambios posibles.</p>}

          <div className="vivo-mandos v1-renglon">
            <div className="vivo-mando-fila">
              <span className="vivo-k">Cambios</span>
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
              <div className="vivo-mando-fila">
                <span className="vivo-k">Plan</span>
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
              <div className="vivo-mando-fila">
                <span className="vivo-k">Directiva</span>
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
            <div className="vivo-mando-fila">
              <span className="vivo-k">Unidad</span>
              <div className="vivo-unidades">
                {(
                  [
                    ['titulares', 'Titulares', 'Vuelven los cinco del arranque'],
                    ['segunda', '2da', 'Entra el banco: descansan los titulares'],
                    ['frescos', 'Frescos', 'Los cinco con más piernas ahora'],
                    ['cerradores', 'Cerradores', 'Los mejores acá y ahora, para cerrar'],
                  ] as const
                ).map(([id, label, tip]) => (
                  <button key={id} disabled={live.finished} title={tip} onClick={() => dispatch({ type: 'APPLY_PRESET', preset: id })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="vivo-mando-fila">
              <span className="vivo-k">Referencia</span>
              <select
                className="vivo-select"
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
          </div>
        </aside>

        <section className={`vivo-centro${live.pendingIncident && !reloj ? ' con-incidencia' : ''}`} aria-label="La cancha">
          <div className="vivo-cancha" style={colores}>
            <CanchaLineas />
            <div className="vivo-cancha-escudo">
              <Crest seed={nuestroClub?.id ?? 'club'} name={state.club.name} colors={nuestrosColores} founded={nuestroClub?.founded} size={40} />
            </div>
            {nuestrosSlots.map((p, i) =>
              p ? (
                <div
                  key={p.id}
                  className={`vivo-ficha nuestro${live.starId === p.id ? ' ref' : ''}${freshOf(p.id) < 45 ? ' fundido' : ''}${acabaDeAnotar === p.id ? ' anoto' : ''}`}
                  style={posicionFicha(HALF_SLOTS[i].x / 2, HALF_SLOTS[i].y)}
                  title={`${p.name} · ${p.position} · ${ptsOf(p.id)} pts · piernas ${freshOf(p.id)}`}
                >
                  <span className="vivo-ficha-cara"><Busto seed={p.id} personality={p.personality} /></span>
                  <span className="vivo-ficha-nom">{shortName(p.name)}</span>
                </div>
              ) : null
            )}
            {rivalSlots.map((p, i) =>
              p ? (
                <div
                  key={p.id}
                  className={`vivo-ficha rival${acabaDeAnotar === p.id ? ' anoto' : ''}`}
                  style={posicionFicha(100 - HALF_SLOTS[i].x / 2, HALF_SLOTS[i].y)}
                  title={`${p.firstName} ${p.lastName} · ${p.position} · nivel ≈${p.level}`}
                >
                  <span className="vivo-ficha-cara"><Busto seed={p.id} personality={p.personality} /></span>
                  <span className="vivo-ficha-nom">{p.lastName}</span>
                </div>
              ) : null
            )}
          </div>

          <p className="v1-frase vivo-leyenda">{leyenda}</p>

          {live.pendingIncident && !reloj ? (
            <div className="vivo-incidencia v1-planilla" role="alert">
              <div className="v1-eyebrow vivo-incidencia-k"><Icon name="alerta" size={15} /> Incidencia en la cancha</div>
              <p className="vivo-incidencia-txt">{live.pendingIncident.text}</p>
              <div className="vivo-opciones">
                {live.pendingIncident.options.map((opt, i) => (
                  <button key={i} onClick={() => dispatch({ type: 'INCIDENT_CHOICE', index: i })}>
                    <b>{opt.label}</b>
                    <span>{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : played.length > 0 ? (
            <div className="vivo-relato v1-planilla" style={colores}>
              <div className="vivo-relato-cab">
                <h3 className="v1-mano">El relato</h3>
                <span className="segmented vivo-filtro">
                  {(['todo', 'puntos', 'cambios'] as const).map((f) => (
                    <button key={f} className={filtro === f ? 'on' : ''} onClick={() => setFiltro(f)}>
                      {f === 'todo' ? 'Todo' : f === 'puntos' ? 'Puntos' : 'Cambios'}
                    </button>
                  ))}
                </span>
              </div>
              <div className="vivo-relato-cuerpo">
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
                  const parcialQ = reloj && i === reloj.q ? `${totalFor - antesDelReloj!.f}-${totalAgainst - antesDelReloj!.a}` : `${q.for}-${q.against}`;
                  return (
                    <div key={i} className={`vivo-q${enVivo ? ' en-vivo' : ''}`}>
                      <div className="vivo-q-cab">
                        <b>{q.overtime ? 'Suplementario' : `${Q_LABELS[i]} cuarto`}</b>
                        <span className="vivo-q-parcial">{parcialQ}</span>
                        {enVivo && <span className="vivo-q-vivo">● en juego</span>}
                        <span className="vivo-q-tactica">
                          {q.defense === 'presion' ? 'Presión' : q.defense === 'hombre' ? 'Hombre' : 'Zona'} ·{' '}
                          {q.attack === 'estrella' ? 'A la referencia' : q.attack === 'correr' ? 'Correr' : 'Colectivo'}
                        </span>
                      </div>
                      {enVivo && jugadas.length === 0 && <p className="vivo-vacio vivo-espera">Salta la pelota…</p>}
                      {jugadas.length > 0 && (
                        <div className="vivo-rj-lista">
                          {jugadas.map((j, n) => (
                            <div key={n} className={`vivo-rj ${j.lado}${j.tipo ? ` ${j.tipo}` : ''}${enVivo && n === jugadas.length - 1 ? ' nueva' : ''}`} ref={enVivo && n === jugadas.length - 1 ? ultimaFilaRef : undefined}>
                              <span className="vivo-rj-min">{j.minuto}</span>
                              <span className="vivo-rj-marcador">{j.marcador}</span>
                              {j.tipo ? (
                                <span className="vivo-rj-icono">{j.tipo === 'cambio' ? <Icon name="cambio" size={11} /> : '·'}</span>
                              ) : (
                                <span className="vivo-rj-punto" title={j.lado === 'nosotros' ? state.club.name : rival.name} />
                              )}
                              <span className="vivo-rj-texto">
                                <b>{j.texto}</b>
                                {j.sub && <span>{j.sub}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {notas.length > 0 && (
                        <ul className="vivo-notas">
                          {notas.map((n, j) => (
                            <li key={j} className={n.startsWith('🚑') ? 'lesion' : /racha|prendió el aro/.test(n) ? 'racha' : ''}>
                              {n}
                            </li>
                          ))}
                        </ul>
                      )}
                      {jugadas.length === 0 && notas.length === 0 && <p className="vivo-vacio">Cuarto parejo, sin sobresaltos.</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="vivo-relato vivo-previa v1-planilla">
              <div className="vivo-relato-cab">
                <h3 className="v1-mano">La previa</h3>
              </div>
              <div className="vivo-relato-cuerpo">
                <p className="vivo-previa-txt">
                  Elegí la defensa y el ataque abajo, mirá quién sale y quién queda en el banco, y tocá{' '}
                  <b>Jugar el 1er cuarto</b>. Entre cuarto y cuarto podés cambiar todo.
                </p>
                {live.pendingSubNotes.length > 0 && (
                  <ul className="vivo-notas">
                    {live.pendingSubNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="vivo-lado rival v1-planilla" aria-label={rival.name}>
          <h3 className="vivo-lado-tit">
            <Crest seed={rivalClub?.id ?? rival.id} name={rival.name} colors={rivalColores} founded={rivalClub?.founded} size={24} />
            <span><RivalLink id={rival.id}>{rival.name}</RivalLink></span>
          </h3>
          <p className="v1-frase vivo-defensa" title="Cómo están defendiendo. Cambian durante el partido, sin mirar tu pizarra: te enterás por el relato.">
            Defienden en <b>{RIVAL_DEFENSE_LABELS[defensaVista]}</b>. {PISTA_DEFENSA_RIVAL[defensaVista]}
          </p>
          <div className="vivo-grupo"><span>En cancha</span><span>Pts</span><span>Nivel</span></div>
          {rivalCinco.court.length > 0 ? (
            rivalCinco.court.map((p) => filaRival(p, true))
          ) : (
            <p className="vivo-vacio">Sin plantel conocido para este rival.</p>
          )}
          <div className="vivo-piernas-rival" title="Estado físico del equipo rival">
            <span className="vivo-k">Piernas</span>
            <span className="mini-medidor"><i className={legsCls(vitals.rivalFreshness)} style={{ width: `${vitals.rivalFreshness}%` }} /></span>
            <b className={legsCls(vitals.rivalFreshness)}>{Math.round(vitals.rivalFreshness)}</b>
          </div>
          {rivalCinco.bench.length > 0 && (
            <>
              <button className="vivo-mas" onClick={() => setVerSuplentesRival((v) => !v)}>
                {verSuplentesRival ? 'Ocultar suplentes ▴' : `Ver suplentes (${rivalCinco.bench.length}) ▾`}
              </button>
              {verSuplentesRival && rivalCinco.bench.map((p) => filaRival(p, false))}
            </>
          )}
        </aside>
      </div>

      {/* ---------- El pie: el botón del partido y la pizarra, siempre a mano ---------- */}
      <div className="partido-pie pie-fijo vivo-pie">
        {cambioEnPie}
        <div className="vivo-pie-fila">
          {live.finished ? (
            <p className="v1-frase vivo-final">
              Final: <b className={diff > 0 ? 'good' : diff < 0 ? 'bad' : ''}>{totalFor}-{totalAgainst}</b> contra {rival.name}.
            </p>
          ) : (
            <div className="vivo-pizarra" aria-label="La pizarra" title={reloj || live.enCurso ? 'Entra en la próxima pelota muerta.' : 'Se aplica desde el próximo cuarto.'}>
              <div className="vivo-pz">
                <span className="vivo-k">Defensa</span>
                <div className="segmented">
                  {(
                    [
                      ['zona', 'Zona', 'Ordenada y económica: cuida el físico. Ojo con los tiradores.'],
                      ['hombre', 'Hombre', 'Asfixia al rival, pero quema piernas. Fundidos, quedan pasillos.'],
                      ['presion', 'Presión', 'A toda cancha: el máximo castigo y el máximo desgaste. Sólo con piernas frescas.'],
                    ] as const
                  ).map(([id, label, tip]) => (
                    <button key={id} className={live.defense === id ? 'on' : ''} title={tip} onClick={() => dispatch({ type: 'SET_TACTIC', defense: id })}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="vivo-pz">
                <span className="vivo-k">Ataque</span>
                <div className="segmented">
                  {(
                    [
                      ['equipo', 'Colectivo', 'La mueven todos: menos brillo, más pases. Aprovecha la química del grupo.'],
                      ['estrella', 'A la referencia', 'Todo pasa por la referencia. Si está caliente es fiesta; si no, la esperan entre dos.'],
                      ['correr', 'Correr', 'Ida y vuelta: más puntos para los dos. Gana el que tiene piernas.'],
                    ] as const
                  ).map(([id, label, tip]) => (
                    <button key={id} className={live.attack === id ? 'on' : ''} title={tip} onClick={() => dispatch({ type: 'SET_TACTIC', attack: id })}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="vivo-botones">
            {reloj ? (
              <>
                {/* El botón apagado dice por qué: en el último tramo el cuarto ya
                    está cerrado en el motor (el reloj sólo lo cuenta) y no queda
                    pelota muerta donde meter el minuto; antes se apagaba mudo. */}
                <button
                  disabled={!live.enCurso || !!live.minutoPedido || minutosQueQuedan <= 0}
                  title={
                    minutosQueQuedan <= 0
                      ? 'Ya pediste los dos minutos del partido.'
                      : live.minutoPedido
                        ? 'Minuto pedido: corre en la próxima pelota muerta.'
                        : !live.enCurso
                          ? 'En este cuarto ya no queda pelota muerta: el minuto se pide en el próximo.'
                          : 'Corta el juego en la próxima pelota muerta: el rival ataca peor ese tramo y los cinco respiran. Tenés dos por partido.'
                  }
                  onClick={pedirMinuto}
                >
                  ⏱ Pedir minuto{minutosQueQuedan > 0 ? ` · ${minutosQueQuedan}` : ''}
                </button>
                <button onClick={saltar}>Saltar el cuarto ⏭</button>
                <button className="primary v1-cta" onClick={pausar}>
                  {reloj.pausa ? '▶ Seguir' : '❚❚ Pausar'}
                </button>
              </>
            ) : !live.finished ? (
              <>
                <button disabled={!!live.pendingIncident || simulando} title="Juega lo que falta de corrido, con tu plan de cambios (o el DT). Se frena sola si hay una incidencia." onClick={() => setSimulando(true)}>
                  {simulando ? 'Simulando…' : 'Simular el partido ⏩'}
                </button>
                {/* Con una incidencia sin resolver, el motivo va en el botón
                    mismo, no en letra chica al lado (sep 2026). */}
                <button className="primary v1-cta" disabled={!!live.pendingIncident || simulando} onClick={jugarCuarto}>
                  {live.pendingIncident
                    ? 'Resolvé la incidencia primero'
                    : live.enCurso
                      ? `▶ Seguir el ${Q_LABELS[Math.min(regularPlayed, 3)]} cuarto`
                      : `▶ Jugar el ${Q_LABELS[Math.min(regularPlayed, 3)]} cuarto`}
                </button>
              </>
            ) : (
              <button className="primary v1-cta" onClick={() => dispatch({ type: 'FINISH_MATCH' })}>
                Ver el informe del partido →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
