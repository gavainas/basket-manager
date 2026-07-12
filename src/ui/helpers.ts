import type { Player, Rival, RivalStyle } from '../game/types';

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

export function rivalStyleInfo(style: RivalStyle): { label: string; desc: string } {
  switch (style) {
    case 'tiradores':
      return {
        label: '🎯 Tiradores',
        desc: 'Viven del tiro externo: la zona les regala tiros abiertos; la marca hombre los incomoda.',
      };
    case 'internos':
      return {
        label: '🏋 Juego interior',
        desc: 'Grandotes que castigan cerca del aro: marcarlos hombre desgasta el doble; la zona les cierra la pintura.',
      };
    case 'corredores':
      return {
        label: '🏃 Corredores',
        desc: 'Corren toda la cancha los 40 minutos: si tu equipo se queda sin piernas, te pasan por arriba.',
      };
    case 'equilibrado':
      return {
        label: '⚖ Equilibrado',
        desc: 'No tienen un punto débil claro: gana el que impone su juego.',
      };
  }
}
