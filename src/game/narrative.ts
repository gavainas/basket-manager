// Narrativa del partido: incidencias deportivas por cuarto e incidencias
// arbitrales con decisiones del manager. Centraliza textos y plantillas.
// El arbitraje siempre se presenta como percepción del equipo, no como verdad.

import { clamp } from './balance';
import { refIncidentFactor } from './leagueLife';
import type { GameState, LiveMatchState, Player } from './types';
import type { Rng } from './rng';

// (la forma serializable de la incidencia pendiente vive en types.ts)

// ---------- Incidencias deportivas ----------

interface FlavorContext {
  qIndex: number; // 0..3
  ourQ: number;
  rivalQ: number;
  onCourt: Player[];
  qPts: Record<string, number>;
  qReb: Record<string, number>;
  starId: string;
  live: LiveMatchState;
}

const FALLBACK_NOTES = [
  'Cuarto de trámite: mucho roce y poco básquet.',
  'Partido cortado, al ritmo de los silbatos.',
  'Intercambio de canastas sin que nadie se despegue.',
  'Cuarto trabado: las defensas mandaron.',
];

export function fallbackNote(rng: Rng): string {
  return rng.pick(FALLBACK_NOTES);
}

/** Hasta una incidencia deportiva extra por cuarto, según lo que pasó de verdad. */
export function quarterFlavor(ctx: FlavorContext, rng: Rng): string[] {
  const out: string[] = [];
  const interior = ctx.onCourt.filter((p) => p.position === 'Ala-Pívot' || p.position === 'Pívot');
  const guards = ctx.onCourt.filter((p) => p.position === 'Base' || p.position === 'Escolta');

  const topGuard = [...guards].sort((a, b) => (ctx.qPts[b.id] ?? 0) - (ctx.qPts[a.id] ?? 0))[0];
  const topBig = [...interior].sort((a, b) => (ctx.qPts[b.id] ?? 0) - (ctx.qPts[a.id] ?? 0))[0];
  const bigRebs = interior.reduce((t, p) => t + (ctx.qReb[p.id] ?? 0), 0);

  // La figura desaparecida: pasada la mitad, sigue sin aparecer.
  const star = ctx.onCourt.find((p) => p.id === ctx.starId);
  const starTotal = star ? ctx.live.stats[star.id]?.pts ?? 0 : 99;
  if (star && ctx.qIndex >= 2 && starTotal <= 4) {
    out.push(`A ${star.name} lo desaparecieron del partido: apenas ${starTotal} punto${starTotal === 1 ? '' : 's'} hasta acá.`);
  } else if (topGuard && (ctx.qPts[topGuard.id] ?? 0) >= 8 && rng.chance(0.6)) {
    out.push(`${topGuard.name} metió dos triples seguidos y obligó al rival a pedir minuto.`);
  } else if (topBig && (ctx.qPts[topBig.id] ?? 0) >= 8 && rng.chance(0.6)) {
    out.push(`Dominio interior: ${topBig.name} castigó una y otra vez abajo del aro.`);
  } else if (bigRebs >= 6 && rng.chance(0.5)) {
    out.push('Los tableros fueron nuestros: segundas y terceras oportunidades en cada ataque.');
  }

  // Mejora táctica: cambió la defensa y el rival anotó bastante menos.
  const prev = ctx.live.quarters[ctx.live.quarters.length - 1];
  if (prev && prev.defense !== ctx.live.defense && ctx.rivalQ <= prev.against - 4) {
    out.push(
      `El equipo mejoró con la ${ctx.live.defense === 'zona' ? 'zona' : ctx.live.defense === 'hombre' ? 'marca individual' : 'presión'} y frenó las penetraciones del rival.`
    );
  }

  return out.slice(0, 1);
}

// ---------- Incidencias arbitrales ----------

/** La misma falta dudosa contada igual tres partidos seguidos deja de ser una falta. */
const DOUBTFUL_FOULS = [
  'Una falta dudosa sobre el cierre encendió al banco: todos mirando a los jueces.',
  'Cargaron una falta en ataque que nadie vio: el banco se levantó entero a protestar.',
  'Un pasos inexistente en el mejor momento nuestro. El grito fue unánime desde afuera.',
  'No cobraron una falta clarísima abajo del aro y el que la recibió quedó en el piso, mirando al árbitro.',
  'Dudosa en la línea de tres: el árbitro sacó dos tiros libres y de nuestro lado juraban que eran tres.',
];

const REF_MOOD_NOTES = [
  'El equipo siente que los jueces están cobrando distinto en cada aro.',
  'Dos criterios distintos según el aro: eso creen todos de este lado de la cancha.',
  'Cada silbato de los jueces enciende un poco más al banco.',
  'De nuestro lado ya nadie discute las jugadas: discuten los fallos.',
];

/** Elige un texto que todavía no se haya usado en este partido. */
function freshIncident(live: LiveMatchState, options: string[], rng: Rng): string {
  const used = (live.usedIncidents ??= []);
  const fresh = options.filter((o) => !used.includes(o));
  const text = rng.pick(fresh.length > 0 ? fresh : options);
  used.push(text);
  return text;
}

/** Sortea una incidencia arbitral tras el cuarto. Puede dejar una decisión pendiente. */
export function rollRefIncident(
  live: LiveMatchState,
  onCourt: Player[],
  qIndex: number,
  rng: Rng
): string | null {
  const tension = live.refTension ?? 0;
  // El árbitro anunciado no es decorado: con un estricto o un protagonista
  // pasan más cosas; con un permisivo, la noche suele ser tranquila.
  const chance = (0.2 + tension * 0.06) * refIncidentFactor(live.refStyle);
  if (!rng.chance(chance)) return null;

  // De vez en cuando, los jueces la sacan barata.
  if (tension >= 2 && rng.chance(0.25)) {
    live.refTension = 0;
    return 'Los jueces dejaron jugar este cuarto y nadie se acordó de ellos. Bajó la temperatura.';
  }

  const hothead =
    onCourt.find((p) => p.personality === 'competitivo' || p.personality === 'protagonista') ??
    rng.pick(onCourt);

  const roll = rng.next();
  if (roll < 0.4 && qIndex < 3) {
    live.refTension = clamp(tension + 1, 0, 5);
    live.pendingIncident = {
      kind: 'falta_dudosa',
      text: freshIncident(live, DOUBTFUL_FOULS, rng),
      options: [
        { label: 'Calmar al equipo', hint: 'Recuperar la concentración: acá se juega' },
        { label: 'Respaldar la protesta', hint: 'El grupo se siente defendido, pero el árbitro toma nota' },
        { label: 'Que nadie hable con los jueces', hint: 'Perfil bajo y a otra cosa' },
      ],
    };
    return 'Una falta dudosa encendió al banco.';
  }
  if (roll < 0.65 && qIndex < 3) {
    live.refTension = clamp(tension + 1, 0, 5);
    // La técnica queda en el prontuario: a la tercera del año, la mesa pide informe.
    hothead.seasonTechs = (hothead.seasonTechs ?? 0) + 1;
    const nth = hothead.seasonTechs;
    const text =
      nth >= 3
        ? `Técnica para ${hothead.name}… la tercera de la temporada. Los jueces anotan con ganas: se viene un informe a la liga.`
        : nth === 2
          ? `Otra técnica para ${hothead.name}, segunda en el año. En la mesa de control ya lo tienen fichado: una más y hay suspensión.`
          : `Técnica para ${hothead.name} por protestar. El equipo siente que el fallo fue injusto; el árbitro, no.`;
    live.pendingIncident = {
      kind: 'tecnica',
      playerId: hothead.id,
      playerName: hothead.name,
      text,
      options: [
        { label: 'Cambiarlo ya', hint: 'Antes de que una segunda técnica lo mande afuera' },
        { label: 'Bancarlo y calmarlo', hint: 'Sigue en cancha, pero marcado por los jueces' },
        { label: 'Usar la bronca', hint: 'Canalizar el enojo: más intensidad, más riesgo' },
      ],
    };
    return nth >= 2 ? `Técnica para ${hothead.name} por protestar (${nth}ª de la temporada).` : `Técnica para ${hothead.name} por protestar.`;
  }
  live.refTension = clamp(tension + 1, 0, 5);
  const note = freshIncident(live, REF_MOOD_NOTES, rng);
  return live.refName ? note.replace('los jueces', live.refName) : note;
}

/** Resuelve la decisión del manager ante la incidencia pendiente. */
export function resolveIncident(state: GameState, choice: number, rng: Rng): GameState {
  const s: GameState = structuredClone(state);
  const live = s.live;
  const inc = live?.pendingIncident;
  if (!live || !inc) return s;

  const note = (text: string) => live.pendingSubNotes.push(text);

  if (inc.kind === 'falta_dudosa') {
    if (choice === 0) {
      live.refTension = Math.max(0, (live.refTension ?? 0) - 2);
      note('El equipo recuperó la concentración: a jugar, que el partido sigue.');
    } else if (choice === 1) {
      live.rageBoost = true;
      live.refTension = clamp((live.refTension ?? 0) + 1, 0, 5);
      note('El plantel valoró que defendieras al grupo, pero los jueces tomaron nota del reclamo.');
    } else {
      live.refTension = Math.max(0, (live.refTension ?? 0) - 1);
      note('Perfil bajo: nadie le habló más a los jueces.');
    }
  } else if (inc.kind === 'tecnica') {
    if (choice === 0 && inc.playerId) {
      const bench = live.squad.filter((id) => !live.onCourt.includes(id));
      const inId = bench.sort((a, b) => (live.playerFresh[b] ?? 0) - (live.playerFresh[a] ?? 0))[0];
      if (inId && live.onCourt.includes(inc.playerId)) {
        live.onCourt = live.onCourt.map((id) => (id === inc.playerId ? inId : id));
        const inName = s.players.find((p) => p.id === inId)?.name ?? 'un suplente';
        note(`Sacaste a ${inc.playerName} antes de la segunda técnica: entró ${inName}.`);
        live.refTension = Math.max(0, (live.refTension ?? 0) - 1);
      } else {
        note(`${inc.playerName} se quedó sin recambio: sigue en cancha, con la técnica a cuestas.`);
      }
    } else if (choice === 1) {
      live.refTension = Math.max(0, (live.refTension ?? 0) - 1);
      note(`Hablaste con ${inc.playerName}: sigue en cancha, más frío pero marcado por los jueces.`);
    } else {
      live.rageBoost = true;
      live.refTension = clamp((live.refTension ?? 0) + 1, 0, 5);
      note('La bronca como combustible: el equipo sale a morder, con los jueces mirando de cerca.');
    }
  }

  live.pendingIncident = null;
  rng.next();
  return s;
}
