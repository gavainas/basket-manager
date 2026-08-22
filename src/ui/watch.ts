import type { GameState } from '../game/types';
import { BALANCE } from '../game/balance';
import { refereeOfWeek } from '../game/leagueLife';
import { activePlayers } from '../game/match';
import type { NoteKind } from '../game/humanState';
import { aggrieved, grievanceWarning } from '../game/mood';
import { objectiveStatus } from '../game/objectives';

/**
 * Qué mirar hoy, repartido por tile del inicio.
 *
 * Antes esto era una lista en el tablero: el aviso vivía lejos de la pantalla
 * que lo resuelve y había que leerlo entero para saber a dónde ir. Ahora cada
 * urgencia se cuelga del tile que la arregla — el menú de inicio se enciende
 * solo y entrar al menú *es* leer el aviso.
 */
export type TileId =
  | 'lista'
  | 'quinteto'
  | 'partido'
  | 'tabla'
  | 'calendario'
  | 'rankings'
  | 'plantilla'
  | 'vestuario'
  | 'cuerpo'
  | 'cuotas'
  | 'gastos'
  | 'objetivos'
  | 'noticias'
  | 'historia';

export interface WatchItem {
  /* Misma clasificación que las notas humanas: el ícono dice de qué habla y
     `cls` si es bueno o malo. Ver NoteKind en game/humanState.ts. */
  kind: NoteKind;
  cls: 'bad' | 'warn' | 'good';
  text: string;
  tile: TileId;
}

/** Lo urgente de la semana: lo que un manager miraría primero, sin recortar. */
export function watchItems(state: GameState): WatchItem[] {
  const items: WatchItem[] = [];
  const active = activePlayers(state.players);

  for (const p of active.filter((x) => x.status === 'al_borde')) {
    items.push({
      kind: 'alerta',
      cls: 'bad',
      text: `${p.name} está al borde de dejar el club: una charla o minutos pueden salvarlo.`,
      tile: 'vestuario',
    });
  }
  const fixedCosts = 245 + (state.coach?.weeklyWage ?? 0);
  if (state.club.money < fixedCosts) {
    items.push({
      kind: 'plata',
      cls: 'bad',
      text: `La caja no cubre la semana: $${state.club.money} contra ~$${fixedCosts} de gastos fijos.`,
      tile: 'gastos',
    });
  }
  // Las quejas vivas primero, con nombre y motivo: es la misma lista que ve la
  // acción de hablar, así lo que dice el informe del sábado sigue estando acá.
  const week = Math.min(state.week, state.seasonLength);
  const hot = aggrieved(state, 2).filter((p) => p.status !== 'al_borde');
  for (const p of hot.slice(0, 2)) {
    items.push({
      kind: 'animo',
      cls: p.grievance!.level >= 3 ? 'bad' : 'warn',
      text: grievanceWarning(p, week),
      tile: 'vestuario',
    });
  }
  const upset = active.filter((x) => x.status === 'molesto' && !hot.includes(x));
  if (upset.length > 0) {
    items.push({
      kind: 'animo',
      cls: 'warn',
      text:
        upset.length === 1
          ? `${upset[0].name} está molesto con cómo vienen las cosas.`
          : `${upset.length} jugadores están molestos: el vestuario pide atención.`,
      tile: 'vestuario',
    });
  }
  // "Lesionado" junta dos historias distintas: el que está roto de verdad y el
  // que no viene porque el laburo no lo deja. Cada una con su texto.
  const returning = active.filter((x) => x.status === 'lesionado' && x.injuryWeeks === 1);
  const injured = active.filter((x) => x.status === 'lesionado');
  if (returning.length > 0) {
    const backPhys = returning.filter((p) => p.injuryReason !== 'laboral');
    const backWork = returning.filter((p) => p.injuryReason === 'laboral');
    if (backPhys.length > 0) {
      items.push({
        kind: 'fisico',
        cls: 'good',
        text: `${backPhys.map((p) => p.name).join(' y ')} ${backPhys.length > 1 ? 'reciben' : 'recibe'} el alta la próxima semana.`,
        tile: 'plantilla',
      });
    }
    if (backWork.length > 0) {
      items.push({
        kind: 'fisico',
        cls: 'good',
        text: `${backWork.map((p) => p.name).join(' y ')} ${backWork.length > 1 ? 'se sacan' : 'se saca'} el laburo de encima: la semana que viene ${backWork.length > 1 ? 'vuelven' : 'vuelve'}.`,
        tile: 'plantilla',
      });
    }
  } else if (injured.length > 0) {
    const phys = injured.filter((p) => p.injuryReason !== 'laboral');
    const work = injured.filter((p) => p.injuryReason === 'laboral');
    if (phys.length > 0) {
      items.push({
        kind: 'fisico',
        cls: 'warn',
        text: `${phys.length === 1 ? `${phys[0].name} sigue` : `${phys.length} jugadores siguen`} en la enfermería.`,
        tile: 'plantilla',
      });
    }
    if (work.length > 0) {
      items.push({
        kind: 'fisico',
        cls: 'warn',
        text: `${work.length === 1 ? `${work[0].name} sigue enredado` : `${work.length} jugadores siguen enredados`} con el laburo: básquet, por ahora, nada.`,
        tile: 'plantilla',
      });
    }
  }
  const suspended = active.filter((x) => (x.suspendedWeeks ?? 0) > 0);
  for (const p of suspended) {
    items.push({
      kind: 'alerta',
      cls: 'bad',
      text: `${p.name} está suspendido: esta fecha la mira desde la tribuna.`,
      tile: 'quinteto',
    });
  }
  const hotheads = active.filter((x) => (x.seasonTechs ?? 0) === 2 && (x.suspendedWeeks ?? 0) === 0);
  const weekRef = refereeOfWeek(state);
  for (const p of hotheads) {
    const strictRef = weekRef.style === 'estricto' || weekRef.style === 'protagonista';
    items.push({
      kind: 'alerta',
      cls: strictRef ? 'bad' : 'warn',
      text: strictRef
        ? `${p.name} acumula 2 técnicas y esta fecha dirige ${weekRef.name} (${weekRef.blurb}). Una protesta y se va.`
        : `${p.name} acumula 2 técnicas en el año: una más y se pierde una fecha.`,
      tile: 'partido',
    });
  }
  const exhausted = active.filter((x) => x.status !== 'lesionado' && x.physical <= BALANCE.callUp.exhaustedThreshold);
  if (exhausted.length > 0) {
    items.push({
      kind: 'fisico',
      cls: 'warn',
      text:
        exhausted.length === 1
          ? `${exhausted[0].name} viene fundido: al pasar lista vas a tener que decidir si lo cuidás.`
          : `${exhausted.length} jugadores vienen fundidos: al pasar lista habrá que decidir quién descansa.`,
      tile: 'lista',
    });
  }
  const debtors = active.filter((x) => x.feeStatus === 'pendiente' && x.weeksUnpaid >= 2);
  if (debtors.length > 0) {
    items.push({
      kind: 'plata',
      cls: 'warn',
      text: `${debtors.length === 1 ? `${debtors[0].name} debe` : `${debtors.length} jugadores deben`} la cuota hace ${debtors.length === 1 ? `${debtors[0].weeksUnpaid} semanas` : 'rato'}: pasar la gorra cuesta caro después.`,
      tile: 'cuotas',
    });
  }
  // Los encargos de la comisión ahora se cobran al cierre: si alguno viene
  // flojo, el radar lo avisa antes de que sea tarde. Recién desde la semana 3,
  // que arrancar la temporada "en riesgo" no asusta a nadie.
  if (state.week >= 3 && state.week <= state.seasonLength) {
    const statuses = state.objectives.map((o) => ({ o, st: objectiveStatus(state, o, false) }));
    const atRisk = statuses.filter(({ st }) => st === 'en_riesgo' || st === 'fallado');
    if (atRisk.length > 0) {
      items.push({
        kind: 'alerta',
        cls: atRisk.some(({ st }) => st === 'fallado') ? 'bad' : 'warn',
        text:
          atRisk.length === 1
            ? `La comisión mira de reojo: "${atRisk[0].o.label}" viene flojo.`
            : `${atRisk.length} objetivos de la comisión vienen flojos, y al cierre se cobran.`,
        tile: 'objetivos',
      });
    }
  }
  if (state.secondTeam && !state.secondTeam.finished) {
    const fit = state.players.filter(
      (p) => state.secondTeam!.playerIds.includes(p.id) && !p.leftClub && p.status !== 'lesionado'
    ).length;
    if (fit < 6) {
      items.push({
        kind: 'cancha',
        cls: 'warn',
        text: `El segundo equipo llega justo: ${fit} fichas en condiciones para su fecha.`,
        tile: 'tabla',
      });
    }
  }

  const order = { bad: 0, warn: 1, good: 2 } as const;
  return items.sort((a, b) => order[a.cls] - order[b.cls]);
}

/** Lo mismo, agrupado por tile: el inicio pregunta "¿qué tengo que decir acá?". */
export function watchByTile(state: GameState): Map<TileId, WatchItem[]> {
  const map = new Map<TileId, WatchItem[]>();
  for (const item of watchItems(state)) {
    map.set(item.tile, [...(map.get(item.tile) ?? []), item]);
  }
  return map;
}
