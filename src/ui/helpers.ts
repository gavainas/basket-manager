import type { Player, Rival, RivalStyle } from '../game/types';
import type { IconName } from './Icon';

export function initials(name: string): string {
  const clean = name.replace(/"[^"]*"\s*/g, '').trim();
  const parts = clean.split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function avgMotivation(players: Player[]): number {
  const active = players.filter((p) => !p.leftClub);
  if (active.length === 0) return 0;
  return Math.round(active.reduce((s, p) => s + p.motivation, 0) / active.length);
}

export function statusChip(p: Player): { label: string; cls: string } {
  switch (p.status) {
    case 'disponible':
      return { label: 'Disponible', cls: 'good' };
    case 'molesto':
      return { label: 'Molesto', cls: 'warn' };
    case 'lesionado':
      return { label: `Lesionado (${p.injuryWeeks} sem.)`, cls: 'bad' };
    case 'al_borde':
      return { label: '¡Al borde de irse!', cls: 'bad' };
  }
}

export function feeChip(p: Player): { label: string; cls: string } {
  switch (p.feeStatus) {
    case 'pagada':
      return { label: 'Cuota al día', cls: 'good' };
    case 'pendiente':
      return { label: `Debe ${Math.max(p.weeksUnpaid, 1)} sem.`, cls: 'bad' };
    case 'beca_total':
      return { label: 'Beca total', cls: 'accent' };
    case 'beca_parcial':
      return { label: 'Beca parcial', cls: 'accent' };
  }
}

export function roleLabel(p: Player): string {
  switch (p.expectedRole) {
    case 'titular':
      return 'Se ve titular · ~30 min';
    case 'rotación':
      return 'Rotación · ~18 min';
    case 'suplente':
      return 'Suplente · ~8 min';
  }
}

export function starsFor(rating: number): string {
  const stars = Math.max(1, Math.min(5, Math.round(rating / 18)));
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

export function rivalDifficulty(rival: Rival): { label: string; cls: string } {
  if (rival.strength < 52) return { label: 'Se lo ve accesible', cls: 'good' };
  if (rival.strength < 62) return { label: 'Rival parejo', cls: 'warn' };
  if (rival.strength < 72) return { label: 'Rival duro', cls: 'warn' };
  return { label: 'Candidato al título', cls: 'bad' };
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`;
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** '2026-04-06' → 'lunes 6 de abril'. */
export function formatDateLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

/** '2026-04-06' → '6/4'. */
export function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** Nombre de la fecha: 'Semana 4', 'Semifinales' o 'Finales' según la etapa. */
export function weekLabel(week: number, seasonLength: number): string {
  if (week <= seasonLength) return `Semana ${week}`;
  return week === seasonLength + 1 ? 'Semifinales' : 'Finales';
}

/** '2026-04-06' → 'Abril 2026'. */
export function monthLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const m = MONTHS[d.getUTCMonth()];
  return `${m[0].toUpperCase()}${m.slice(1)} ${d.getUTCFullYear()}`;
}

/**
 * El `icon` sale aparte del `label` a propósito: pegado al texto solo se puede
 * pintar un emoji, y un emoji de colores dentro de un chip es la firma más obvia
 * de interfaz generada. Separado, el llamador lo dibuja con `<Icon>` y hereda el
 * color del contexto.
 */
export function rivalStyleInfo(style: RivalStyle): {
  label: string;
  icon: IconName;
  desc: string;
  advice: string;
} {
  switch (style) {
    case 'tiradores':
      return {
        label: 'Tiradores',
        icon: 'tiradores',
        desc: 'Viven del tiro externo: la zona les regala tiros abiertos; la marca hombre los incomoda.',
        advice: 'Salí a marcarlos hombre mientras tengas piernas; la zona contra ellos es un regalo.',
      };
    case 'internos':
      return {
        label: 'Juego interior',
        icon: 'interior',
        desc: 'Grandotes que castigan cerca del aro: marcarlos hombre desgasta el doble; la zona les cierra la pintura.',
        advice: 'La zona les cierra la pintura sin fundirte. Si los marcás hombre, tené el banco listo.',
      };
    case 'corredores':
      return {
        label: 'Corredores',
        icon: 'corredores',
        desc: 'Corren toda la cancha los 40 minutos: si tu equipo se queda sin piernas, te pasan por arriba.',
        advice: 'Rotá el banco temprano y llegá con piernas al último cuarto: castigan al que se cansa.',
      };
    case 'equilibrado':
      return {
        label: 'Equilibrado',
        icon: 'equilibrado',
        desc: 'No tienen un punto débil claro: gana el que impone su juego.',
        advice: 'Sin ventajas de pizarrón: jugá a lo tuyo y cuidá las piernas para el cierre.',
      };
  }
}
