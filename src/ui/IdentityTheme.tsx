import type { CSSProperties, ReactNode } from 'react';
import { paletteOf, type ClubIdentity } from '../game/identity';

/**
 * Los colores del club, en un solo lugar.
 *
 * Envuelve lo que tenga que vestirse del club y declara las variables CSS que
 * usan las vistas. Nadie escribe un hex del club en un componente ni en
 * `styles.css`: todo sale de acá, derivado de los dos colores que eligió el
 * manager (ver `paletteOf`).
 *
 * El alcance es a propósito: las variables viven en este contenedor, no en
 * `:root`, así una pantalla que no esté envuelta (el menú principal, la galería
 * de retratos) queda intacta. Por la misma razón el semáforo —`--good`,
 * `--warn`, `--bad`— no se toca nunca: una lesión es roja aunque el club sea
 * rojo.
 */
export function IdentityTheme({
  identity,
  children,
  as: Tag = 'div',
  className,
}: {
  identity: ClubIdentity;
  children: ReactNode;
  as?: 'div' | 'section';
  className?: string;
}) {
  const p = paletteOf(identity);
  const vars = {
    '--club-primary': p.primary,
    '--club-secondary': p.secondary,
    '--club-on-primary': p.onPrimary,
    '--club-on-secondary': p.onSecondary,
    '--club-chrome': p.onChrome,
    '--club-panel': p.onPanel,
    '--club-on-panel': p.onPanelInk,
    '--club-portrait': p.portrait,
    '--club-portrait-ink': p.portraitInk,
    '--club-wash': p.wash,
  } as CSSProperties;

  return (
    <Tag className={className ? `club-theme ${className}` : 'club-theme'} style={vars}>
      {children}
    </Tag>
  );
}
