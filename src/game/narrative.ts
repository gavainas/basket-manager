// Narrativa del partido: incidencias deportivas por cuarto e incidencias
// arbitrales con decisiones del manager. Centraliza textos y plantillas.
// El arbitraje siempre se presenta como percepción del equipo, no como verdad.

import { clamp } from './balance';
import { fragilityOf } from './injuries';
import { refIncidentFactor } from './leagueLife';
import { fueraDelPartido, reemplazar, rivalLineup } from './match';
import type { GameState, LiveMatchState, PendingRefIncident, Player, RiesgoPendiente } from './types';
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
  if (star && ctx.qIndex >= 2 && (ctx.live.minutes[star.id] ?? 0) >= 20 && starTotal <= 4) {
    out.push(`A ${star.name} le cuesta sumar: ${starTotal} punto${starTotal === 1 ? '' : 's'} en ${ctx.live.minutes[star.id]} minutos.`);
  } else if (topGuard && (ctx.qPts[topGuard.id] ?? 0) >= 8 && rng.chance(0.6)) {
    out.push(`${topGuard.name} sumó ${ctx.qPts[topGuard.id]} puntos en este cuarto.`);
  } else if (topBig && (ctx.qPts[topBig.id] ?? 0) >= 8 && rng.chance(0.6)) {
    out.push(`${topBig.name} aportó ${ctx.qPts[topBig.id]} puntos en este cuarto.`);
  } else if (bigRebs >= 6 && rng.chance(0.5)) {
    out.push(`Nuestros internos juntaron ${bigRebs} rebotes en el cuarto.`);
  }

  // Mejora táctica: cambió la defensa y el rival anotó bastante menos.
  const prev = ctx.live.quarters[ctx.live.quarters.length - 1];
  if (prev && prev.defense !== ctx.live.defense && ctx.rivalQ <= prev.against - 4) {
    out.push(
      `El equipo mejoró con la ${ctx.live.defense === 'zona' ? 'zona' : ctx.live.defense === 'hombre' ? 'marca individual' : 'presión'} y el rival anotó ${ctx.rivalQ} puntos, contra ${prev.against} del cuarto anterior.`
    );
  }

  return out.slice(0, 1);
}

// ---------- Incidencias del partido ----------
//
// Sep 2026, pedido de Gabi: más situaciones, y que la misma opción no sea
// siempre la buena. Cada incidencia se arma con el contexto (el árbitro, la
// personalidad del jugador, su cuerpo, el marcador) y las pistas de las
// opciones lo dicen: no revelan la probabilidad, pero sí la señal. Lo que una
// decisión deja pendiente (la segunda técnica, la quinta falta) se resuelve
// en el próximo cuarto, en un tramo al azar, y se ve en el relato.

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

const ROCES = [
  '{n} y {r} se trabaron en un rebote y se dijeron de todo. Los separaron los compañeros.',
  '{r} le pegó un codazo a {n} sin pelota y {n} fue a buscarlo. Quedaron cara a cara.',
  '{n} festejó una canasta en la cara de {r}, y {r} se lo cobró en la jugada siguiente. Se calentó la cosa.',
];

const RESENTIDOS = [
  '{n} cayó mal después de un rebote y se quedó agarrándose el tobillo. Se levantó solo y dice que aguanta.',
  '{n} sintió un tirón atrás del muslo al correr una contra. Camina raro, pero pide seguir.',
  '{n} chocó con un rival y quedó dolorido en la rodilla. Dice que fue el golpe, nada más.',
];

/** Elige un texto que todavía no se haya usado en este partido. */
function freshIncident(live: LiveMatchState, options: string[], rng: Rng): string {
  const used = (live.usedIncidents ??= []);
  const fresh = options.filter((o) => !used.includes(o));
  const text = rng.pick(fresh.length > 0 ? fresh : options);
  used.push(text);
  return text;
}

/** Los que se calientan: con ellos las protestas terminan en técnica. */
export function esCalenton(p: Player): boolean {
  return p.personality === 'competitivo' || p.personality === 'protagonista';
}

/** Los que escuchan: veteranos, cumplidores, leales. Con ellos hablar alcanza. */
function escucha(p: Player): boolean {
  return p.personality === 'veterano' || p.personality === 'cumplidor' || p.personality === 'leal';
}

/** El árbitro que saca la técnica fácil. */
function refSevero(live: LiveMatchState): boolean {
  return live.refStyle === 'estricto' || live.refStyle === 'protagonista';
}

function refNombre(live: LiveMatchState): string {
  return live.refName ?? 'el árbitro';
}

function apellido(nombre: string): string {
  const parts = nombre.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/);
  return parts[parts.length - 1];
}

/**
 * Sortea una incidencia tras el cuarto. Puede dejar una decisión pendiente
 * (no en el último cuarto: ahí ya no hay próximo cuarto donde pagarla).
 */
export function rollRefIncident(s: GameState, live: LiveMatchState, onCourt: Player[], qIndex: number, rng: Rng): string | null {
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

  // Último cuarto: sin decisión pendiente, sólo el clima con los jueces.
  if (qIndex >= 3) {
    live.refTension = clamp(tension + 1, 0, 5);
    const note = freshIncident(live, REF_MOOD_NOTES, rng);
    return live.refName ? note.replace('los jueces', live.refName) : note;
  }

  // Entre los calentones en cancha se sortea: que no sea siempre el mismo el
  // que acumula todas las técnicas de la temporada.
  const hotheads = onCourt.filter(esCalenton);
  const hothead = hotheads.length > 0 ? rng.pick(hotheads) : rng.pick(onCourt);
  const aggressive = live.defense === 'hombre' || live.defense === 'presion';
  const freshOf = (id: string) => live.playerFresh[id] ?? 70;
  const fragil = onCourt.filter((p) => fragilityOf(p) >= 45 || freshOf(p.id) < 40);

  // Qué puede pasar hoy, según el partido: con marca agresiva hay faltas, con
  // un casero hay fallos en contra, con alguien fundido o frágil hay tirones.
  const opciones: { kind: PendingRefIncident['kind']; w: number }[] = [
    { kind: 'falta_dudosa', w: 3 },
    { kind: 'tecnica', w: 2.5 },
    { kind: 'roce', w: 2 },
    { kind: 'cuatro_faltas', w: qIndex >= 1 ? (aggressive ? 3 : 1.5) : 0 },
    { kind: 'resentido', w: fragil.length > 0 ? 1.8 : 0.6 },
    { kind: 'casero', w: live.refStyle === 'casero' ? 3 : tension >= 3 ? 1 : 0 },
  ];
  const total = opciones.reduce((t, o) => t + o.w, 0);
  let roll = rng.next() * total;
  let kind: PendingRefIncident['kind'] = 'falta_dudosa';
  for (const o of opciones) {
    roll -= o.w;
    if (roll <= 0) {
      kind = o.kind;
      break;
    }
  }

  const ref = refNombre(live);
  const severo = refSevero(live);

  if (kind === 'falta_dudosa') {
    live.refTension = clamp(tension + 1, 0, 5);
    const frio = hotheads.length > 0 ? hotheads[0] : null;
    live.pendingIncident = {
      kind: 'falta_dudosa',
      text: freshIncident(live, DOUBTFUL_FOULS, rng),
      options: [
        {
          label: 'Calmar al equipo',
          hint: frio ? `Baja la tensión. A ${apellido(frio.name)} le cuesta enfriarse: puede salir apagado.` : 'Baja la tensión: a jugar, que el partido sigue.',
        },
        {
          label: 'Respaldar la protesta',
          hint: severo
            ? `Con ${ref}, cortito con las protestas, suele terminar en otra técnica.`
            : live.refStyle === 'permisivo'
              ? `${ref} deja pasar: el grupo se siente defendido y sale a morder.`
              : `Con ${ref} es una moneda al aire: el grupo se une, o cae una técnica.`,
        },
        { label: 'Que nadie hable con los jueces', hint: 'Perfil bajo. Seguro, pero al que se comió la falta lo dejás solo.' },
      ],
    };
    return 'Una falta dudosa encendió al banco.';
  }

  if (kind === 'tecnica') {
    live.refTension = clamp(tension + 1, 0, 5);
    // La técnica queda en el prontuario: a la tercera del año, la mesa pide informe.
    hothead.seasonTechs = (hothead.seasonTechs ?? 0) + 1;
    const nth = hothead.seasonTechs;
    const text =
      nth >= 3
        ? `Técnica para ${hothead.name}… la tercera de la temporada. Los jueces anotan con ganas: se viene un informe a la liga.`
        : nth === 2
          ? `Otra técnica para ${hothead.name}, segunda en el año. En la mesa de control ya lo tienen fichado: una más y hay suspensión.`
          : freshIncident(
              live,
              [
                `Técnica para ${hothead.name} por protestar. El equipo siente que el fallo fue injusto; el árbitro, no.`,
                `${hothead.name} le dijo a los jueces lo que nadie se anima: técnica y a callarse.`,
                `Aplauso irónico de ${hothead.name} tras el fallo: el árbitro no se lo dejó pasar. Técnica.`,
              ],
              rng
            );
    const esRef = live.starId === hothead.id;
    live.pendingIncident = {
      kind: 'tecnica',
      playerId: hothead.id,
      playerName: hothead.name,
      text,
      options: [
        { label: 'Cambiarlo ya', hint: esRef ? 'Seguro. Es tu referencia: la perdés un rato.' : 'Seguro: se enfría en el banco.' },
        {
          label: 'Bancarlo y calmarlo',
          hint: esCalenton(hothead)
            ? 'Es calentón: si vuelve a protestar es la segunda técnica, y afuera.'
            : 'Con él suele alcanzar: sigue en cancha, más frío.',
        },
        { label: 'Usar la bronca', hint: `Más intensidad este cuarto. Con ${ref} ${severo ? 'es jugar con fuego' : 'puede pasar'}.` },
      ],
    };
    return nth >= 2 ? `Técnica para ${hothead.name} por protestar (${nth}ª de la temporada).` : `Técnica para ${hothead.name} por protestar.`;
  }

  if (kind === 'roce') {
    const rivalCourt = rivalLineup(s, live).court;
    const r = rivalCourt.length > 0 ? rng.pick(rivalCourt).lastName : `el ${rng.int(4, 15)} de ${live.rivalName}`;
    live.pendingIncident = {
      kind: 'roce',
      playerId: hothead.id,
      playerName: hothead.name,
      text: freshIncident(live, ROCES, rng).replace(/\{n\}/g, apellido(hothead.name)).replace(/\{r\}/g, r),
      options: [
        { label: 'Cambiarlo hasta que se enfríe', hint: 'Sale ahora; lo volvés a poner cuando quieras.' },
        {
          label: 'Hablarle desde el banco',
          hint: escucha(hothead) ? 'Lo escucha: sigue en cancha y a otra cosa.' : 'Es calentón: puede volver a cruzarse, y eso es técnica.',
        },
        {
          label: 'Dejar que se calienten',
          hint: `El equipo sale a morder (más intensidad). Si sigue, es técnica${severo ? `, y con ${ref} puede ser expulsión` : ''}.`,
        },
      ],
    };
    return `${apellido(hothead.name)} se cruzó con ${r}.`;
  }

  if (kind === 'cuatro_faltas') {
    const cand = onCourt.filter((p) => !(live.fueraDelPartido ?? []).includes(p.id));
    const p = cand.length > 0 ? rng.pick(cand) : hothead;
    const esRef = live.starId === p.id;
    live.pendingIncident = {
      kind: 'cuatro_faltas',
      playerId: p.id,
      playerName: p.name,
      text: `${p.name} ya tiene cuatro faltas y falta medio partido. Una más y se va.${esRef ? ' Es tu referencia.' : ''}`,
      options: [
        { label: 'Sacarlo y guardarlo para el final', hint: 'Descansa ahora. Lo ponés cuando quieras.' },
        { label: 'Dejarlo, que juegue con cuidado', hint: 'Defiende más blando: el rival anota un poco más. La quinta puede caer igual.' },
        { label: 'Dejarlo a full', hint: 'Rinde entero, pero la quinta está a un manotazo.' },
      ],
    };
    return `${p.name} llegó a cuatro faltas.`;
  }

  if (kind === 'resentido') {
    const p = fragil.length > 0 ? rng.pick(fragil) : rng.pick(onCourt);
    const frag = fragilityOf(p);
    const cuerpo = frag >= 45 ? 'se resiente seguido' : frag <= 20 ? 'tiene un cuerpo noble' : 'se lesiona lo normal';
    live.pendingIncident = {
      kind: 'resentido',
      playerId: p.id,
      playerName: p.name,
      text: `${freshIncident(live, RESENTIDOS, rng).replace(/\{n\}/g, p.name)} Tiene ${p.age} y ${cuerpo}.`,
      options: [
        { label: 'Sacarlo ya, no arriesgar', hint: 'Se queda afuera lo que resta del partido. Sin lesión.' },
        {
          label: 'Que siga si aguanta',
          hint: frag >= 45 ? 'Con su historial, es probable que termine en el kinesiólogo.' : 'Probablemente aguante. Probablemente.',
        },
      ],
    };
    return `${apellido(p.name)} se resintió.`;
  }

  // casero
  live.refTension = clamp(tension + 1, 0, 5);
  live.pendingIncident = {
    kind: 'casero',
    text: `${ref} cobra todo en contra: dos faltas seguidas que nadie vio, y el gimnasio festeja cada silbato.`,
    options: [
      { label: 'Meter zona para no hacer faltas', hint: 'Menos contacto, menos silbatos. Y la zona es la zona.' },
      { label: 'Hablar con la mesa', hint: 'A veces baja la temperatura. A veces la sube.' },
      { label: 'Bancársela', hint: 'Nada cambia. Los jueces se olvidan solos… o no.' },
    ],
  };
  return `${ref} cobra en contra y el equipo lo siente.`;
}

/** Resuelve la decisión del manager ante la incidencia pendiente. */
export function resolveIncident(state: GameState, choice: number, rng: Rng): GameState {
  const s: GameState = structuredClone(state);
  const live = s.live;
  const inc = live?.pendingIncident;
  if (!live || !inc) return s;

  const note = (text: string) => live.pendingSubNotes.push(text);
  const byId = (id: string) => s.players.find((x) => x.id === id);
  const jugador = inc.playerId ? byId(inc.playerId) : undefined;
  const onCourt = live.onCourt.map(byId).filter((p): p is Player => !!p);
  const ref = refNombre(live);
  const severo = refSevero(live);
  const riesgo = (playerId: string, kind: RiesgoPendiente['kind'], chance: number) => {
    live.riesgos = [...(live.riesgos ?? []), { playerId, kind, chance }];
  };
  const sacar = (p: Player, porQue: string) => {
    if (!live.onCourt.includes(p.id)) return `${p.name} ya no estaba en cancha.`;
    const sub = reemplazar(s, live, p.id);
    live.heldOut = [...new Set([...(live.heldOut ?? []), p.id])];
    live.manualBreak = true;
    return `${porQue} ${sub ? `Entró ${sub.name}.` : 'No quedaba recambio: seguimos con cuatro.'}`;
  };

  if (inc.kind === 'falta_dudosa') {
    const calenton = onCourt.find(esCalenton);
    if (choice === 0) {
      live.refTension = Math.max(0, (live.refTension ?? 0) - 2);
      if (calenton && rng.chance(0.4)) {
        live.atkModNext = 0.97;
        note(`El equipo bajó un cambio, pero ${calenton.name} se enfrió con el reto: sale apagado.`);
      } else {
        note('El equipo recuperó la concentración: a jugar, que el partido sigue.');
      }
    } else if (choice === 1) {
      const tecnica = severo ? rng.chance(0.6) : live.refStyle === 'permisivo' ? false : rng.chance(0.35);
      if (tecnica && calenton) {
        calenton.seasonTechs = (calenton.seasonTechs ?? 0) + 1;
        live.refTension = clamp((live.refTension ?? 0) + 2, 0, 5);
        note(`Respaldaste la protesta y ${ref} la cortó de un silbato: técnica para ${calenton.name}, que era el que más gritaba.`);
      } else {
        live.rageBoost = true;
        live.refTension = clamp((live.refTension ?? 0) + (live.refStyle === 'permisivo' ? 0 : 1), 0, 5);
        note('El plantel valoró que defendieras al grupo: salen a morder. Los jueces tomaron nota del reclamo.');
      }
    } else {
      live.refTension = Math.max(0, (live.refTension ?? 0) - 1);
      const solo = onCourt.find((p) => p.personality === 'protagonista');
      if (solo && rng.chance(0.3)) {
        live.atkModNext = 0.98;
        note(`Perfil bajo. ${solo.name} sintió que lo dejaron solo con la falta, y juega con eso en la cabeza.`);
      } else {
        note('Perfil bajo: nadie le habló más a los jueces.');
      }
    }
  } else if (inc.kind === 'tecnica' && jugador) {
    if (choice === 0) {
      if (live.onCourt.includes(jugador.id)) {
        const sub = reemplazar(s, live, jugador.id);
        live.heldOut = [...new Set([...(live.heldOut ?? []), jugador.id])];
        live.manualBreak = true;
        note(sub ? `Sacaste a ${jugador.name} antes de la segunda técnica: entró ${sub.name}.` : `${jugador.name} sale. No queda recambio: seguimos con cuatro.`);
        if (sub) live.refTension = Math.max(0, (live.refTension ?? 0) - 1);
      }
    } else if (choice === 1) {
      live.refTension = Math.max(0, (live.refTension ?? 0) - 1);
      if (esCalenton(jugador)) riesgo(jugador.id, 'expulsion', 0.35);
      note(`Hablaste con ${jugador.name}: sigue en cancha, ${esCalenton(jugador) ? 'jurando que se calla, y marcado por los jueces' : 'más frío y a otra cosa'}.`);
    } else {
      live.rageBoost = true;
      live.refTension = clamp((live.refTension ?? 0) + 1, 0, 5);
      riesgo(jugador.id, 'expulsion', severo ? 0.35 : 0.15);
      note(`La bronca como combustible: el equipo sale a morder, con ${ref} mirando de cerca a ${jugador.name}.`);
    }
  } else if (inc.kind === 'roce' && jugador) {
    if (choice === 0) {
      note(sacar(jugador, `Sacaste a ${jugador.name} hasta que se enfríe.`));
    } else if (choice === 1) {
      if (escucha(jugador)) note(`${jugador.name} escuchó desde el banco, asintió y siguió jugando.`);
      else {
        riesgo(jugador.id, 'tecnica', 0.3);
        note(`Le hablaste a ${jugador.name} desde el banco. Dijo que sí con la cabeza, pero sigue mirando al rival.`);
      }
    } else {
      live.rageBoost = true;
      if (severo) riesgo(jugador.id, 'expulsion', 0.3);
      else riesgo(jugador.id, 'tecnica', 0.35);
      note(`Dejaste que se calienten: el equipo sale a morder, y ${ref} ya tiene a ${jugador.name} entre ceja y ceja.`);
    }
  } else if (inc.kind === 'cuatro_faltas' && jugador) {
    if (choice === 0) {
      note(sacar(jugador, `Guardaste a ${jugador.name} con cuatro faltas para el final.`));
    } else if (choice === 1) {
      live.defModNext = 1.03;
      riesgo(jugador.id, 'quinta', 0.25);
      note(`${jugador.name} sigue con cuatro, defendiendo con las manos atrás.`);
    } else {
      riesgo(jugador.id, 'quinta', 0.5);
      note(`${jugador.name} sigue a full con cuatro faltas. Todos contienen la respiración en cada rebote.`);
    }
  } else if (inc.kind === 'resentido' && jugador) {
    if (choice === 0) {
      fueraDelPartido(live, jugador.id);
      note(sacar(jugador, `Sacaste a ${jugador.name} resentido: no vuelve hoy, pero mañana está entero.`));
    } else {
      const frag = fragilityOf(jugador);
      live.riesgoLesion = { ...(live.riesgoLesion ?? {}), [jugador.id]: frag >= 45 ? 6 : 3 };
      note(`${jugador.name} siguió en cancha, resentido. Cada corrida es una apuesta.`);
    }
  } else if (inc.kind === 'casero') {
    if (choice === 0) {
      live.defense = 'zona';
      live.refTension = Math.max(0, (live.refTension ?? 0) - 1);
      note(`Metiste zona para no regalar faltas: menos contacto, menos silbatos de ${ref}.`);
    } else if (choice === 1) {
      if (rng.chance(0.4)) {
        live.refTension = Math.max(0, (live.refTension ?? 0) - 2);
        note(`Hablaste con la mesa con buenos modos. ${ref} bajó un cambio.`);
      } else {
        live.refTension = clamp((live.refTension ?? 0) + 1, 0, 5);
        note(`Fuiste a la mesa y ${ref} te vio venir: "Volvé al banco". Ahora también te tiene fichado a vos.`);
      }
    } else {
      note(`Te la bancaste. ${ref} siguió cobrando lo suyo y el equipo jugó con eso.`);
    }
  }

  live.pendingIncident = null;
  rng.next();
  return s;
}
