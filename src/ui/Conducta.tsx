import { conductLabel } from '../game/conduct';
import type { Player } from '../game/types';

/**
 * La conducta de un jugador, como la vio el club (T2). Reemplaza al número de
 * compromiso en todas las pantallas: la etiqueta se afina con las fechas y los
 * hechos van en el tooltip o debajo, según el lugar.
 */

/** Para una columna de planilla: la versión corta, con el color del veredicto. */
export function ConductaCorta({ p }: { p: Player }) {
  const c = conductLabel(p);
  return (
    <span className={`conducta ${c.cls}`} title={`${c.label}. ${c.detail}`}>
      {c.short}
    </span>
  );
}

/** Para la ficha: la frase entera y los hechos que la sostienen. */
export function ConductaFicha({ p }: { p: Player }) {
  const c = conductLabel(p);
  return (
    <div className="conducta-ficha">
      <span className={`chip ${c.cls}`}>{c.label}</span>
      <p className="muted">{c.detail}</p>
    </div>
  );
}
