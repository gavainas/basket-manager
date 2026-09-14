// El sponsor como contrato con condiciones (sep 2026, la economía con arco).
// Un comercio del barrio pone plata por semana y pide algo a cambio: ganar,
// que el club tenga cartel, no hacer papelones, que el plantel pague la
// cuota. Si cumplís, renueva (y sube el aporte); si no, se va con una
// frase. La condición se mide con lo que el juego ya sabe: el historial, el
// prestigio social y las cuotas.

import { BALANCE, clamp } from './balance';
import { weeklyFee } from './economy';
import type { GameState, SponsorCondicion, SponsorContract } from './types';
import type { Rng } from './rng';

interface SponsorDef {
  id: string;
  name: string;
  weekly: number;
  weeks: number;
  condicion: SponsorCondicion;
  meta: number;
  /** Cómo lo dice el comerciante al firmar. */
  frase: string;
}

/** Los comercios del barrio que ponen plata, cada uno con lo suyo. */
export const SPONSORS: SponsorDef[] = [
  { id: 'pizzeria', name: 'La pizzería de la esquina', weekly: 70, weeks: 4, condicion: 'ganar', meta: 2, frase: '"Yo pongo, pero quiero ver ganar. Dos de cuatro y seguimos."' },
  { id: 'ferreteria', name: 'La ferretería de Don Aldo', weekly: 80, weeks: 5, condicion: 'sin_papelon', meta: 20, frase: '"Perder se pierde, pero que no me hagan pasar vergüenza con una paliza."' },
  { id: 'cerveceria', name: 'La cervecería artesanal', weekly: 90, weeks: 4, condicion: 'publico', meta: 55, frase: '"A mí me sirve que el club suene en el barrio. Si no suena, no me sirve."' },
  { id: 'gimnasio', name: 'El gimnasio de la avenida', weekly: 60, weeks: 6, condicion: 'ganar', meta: 3, frase: '"Seis semanas. Ganen la mitad y renovamos sin discutir."' },
  { id: 'inmobiliaria', name: 'La inmobiliaria Techera', weekly: 100, weeks: 4, condicion: 'cuotas', meta: 80, frase: '"Yo financio a un club serio. Que el plantel pague la cuota: si no pagan ellos, ¿por qué yo?"' },
  { id: 'futbol5', name: 'La cancha de fútbol 5 del túnel', weekly: 65, weeks: 5, condicion: 'sin_papelon', meta: 18, frase: '"Somos vecinos. Hagan un papelón grande y me lo cobran a mí en el mostrador."' },
];

/** La condición, dicha para la pantalla. */
export function condicionTexto(c: SponsorContract): string {
  switch (c.condicion) {
    case 'ganar':
      return `ganar ${c.meta} de los ${c.weeksTotal} partidos del contrato (van ${c.progreso})`;
    case 'publico':
      return `terminar el contrato con el prestigio social en ${c.meta} o más`;
    case 'sin_papelon':
      return `no perder ningún partido por ${c.meta} o más`;
    case 'cuotas':
      return `terminar el contrato con el ${c.meta}% del plantel al día con la cuota`;
  }
}

/** Un contrato nuevo con un comercio que no sea el que acaba de irse. */
export function ofrecerSponsor(s: GameState, rng: Rng): SponsorContract {
  const ultimo = s.sponsor?.id;
  const pool = SPONSORS.filter((d) => d.id !== ultimo);
  const def = rng.pick(pool.length > 0 ? pool : SPONSORS);
  return { id: def.id, name: def.name, weekly: def.weekly, weeksLeft: def.weeks, weeksTotal: def.weeks, condicion: def.condicion, meta: def.meta, progreso: 0, renovaciones: 0 };
}

export function fraseDe(id: string): string {
  return SPONSORS.find((d) => d.id === id)?.frase ?? '';
}

/** ¿Está cumplida la condición, mirando el club hoy? (Las de "ganar" se llevan en `progreso`.) */
export function condicionCumplida(s: GameState, c: SponsorContract): boolean {
  switch (c.condicion) {
    case 'ganar':
      return c.progreso >= c.meta;
    case 'publico':
      return s.club.socialPrestige >= c.meta;
    case 'sin_papelon':
      return true; // si hubo papelón, el contrato ya se cortó
    case 'cuotas': {
      const activos = s.players.filter((p) => !p.leftClub);
      const alDia = activos.filter((p) => weeklyFee(p) > 0 || p.feeStatus === 'beca_total' || p.feeStatus === 'beca_parcial').length;
      return activos.length > 0 && (alDia / activos.length) * 100 >= c.meta;
    }
  }
}

/**
 * La semana del sponsor: cobra, mide el partido de la fecha contra la
 * condición, y al terminar el contrato renueva o se va. Muta `s` (clonado).
 */
export function semanaDelSponsor(s: GameState): void {
  const c = s.sponsor;
  if (!c) return;
  const E = BALANCE.economy;

  s.club.money += c.weekly;
  s.ledger.push({ week: s.week, concept: `Aporte de ${c.name}`, amount: c.weekly });

  // Lo que pasó en la cancha esta semana.
  const m = s.lastMatch;
  if (m && !m.forfeit) {
    if (c.condicion === 'ganar' && m.won) c.progreso += 1;
    if (c.condicion === 'sin_papelon' && !m.won && m.scoreAgainst - m.scoreFor >= c.meta) {
      s.sponsor = null;
      s.sponsorWeeks = 0;
      s.club.socialPrestige = clamp(s.club.socialPrestige - 2);
      s.news.unshift({ week: s.week, text: `${c.name} cortó el contrato después de la paliza: "Con esto no quiero que me asocien". Se fue el sponsor.`, tone: 'bad' });
      return;
    }
  }

  c.weeksLeft -= 1;
  s.sponsorWeeks = c.weeksLeft;
  if (c.weeksLeft > 0) return;

  if (condicionCumplida(s, c)) {
    c.renovaciones += 1;
    c.weekly = Math.min(E.sponsorMaxWeekly, c.weekly + E.sponsorRenewBonus);
    c.weeksLeft = c.weeksTotal;
    c.progreso = 0;
    s.sponsorWeeks = c.weeksLeft;
    s.club.socialPrestige = clamp(s.club.socialPrestige + 1);
    s.news.unshift({ week: s.week, text: `${c.name} renovó: cumpliste lo que pedía y ahora pone $${c.weekly} por semana.`, tone: 'good' });
  } else {
    s.sponsor = null;
    s.sponsorWeeks = 0;
    s.news.unshift({ week: s.week, text: `Terminó el contrato con ${c.name} y no renovó: pedía ${condicionTexto(c)}.`, tone: 'neutral' });
  }
}
