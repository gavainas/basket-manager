import type { ReactNode } from 'react';
import type { Personality } from '../game/types';
import { Busto } from './Busto';
import './modales.css';

/**
 * La ficha que se abre encima de cualquier pantalla (UI V1): jugador, rival,
 * club, liga, jugador del mundo. Nació junto al Tablero aprobado y habla su
 * idioma (design/UI_V1_GUIA.md):
 *
 * - a la izquierda, el HÉROE sin caja, directo sobre el velo azul noche: la
 *   persona de pie (escala L de la Art Bible §9) o el escudo, el nombre en voz
 *   display y la línea que lo define;
 * - a la derecha, UNA planilla con los datos en renglones punteados y, si
 *   hace falta, las pestañas arriba.
 *
 * El velo (`.modal-backdrop`) cierra al hacer click afuera, como siempre; la
 * ficha entera frena el click para que tocar el héroe no la cierre.
 */
export function Ficha({
  onClose,
  label,
  heroe,
  pestanas,
  children,
  clase,
}: {
  onClose: () => void;
  /** Nombre accesible del diálogo (el nombre de quien es la ficha). */
  label: string;
  heroe: ReactNode;
  pestanas?: ReactNode;
  children: ReactNode;
  clase?: string;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`ficha${clase ? ` ${clase}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <section className="ficha-heroe v1-hero">{heroe}</section>
        <div className="ficha-hoja v1-planilla">
          <button className="ficha-cerrar" onClick={onClose} title="Cerrar (Esc)" aria-label="Cerrar">
            ✕
          </button>
          {pestanas}
          <div className="ficha-cuerpo">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** La persona de pie sobre la línea del parquet, grande: la escala L. */
export function FichaDePie({ seed, personality, gris }: { seed: string; personality?: Personality; gris?: boolean }) {
  return (
    <div className="ficha-depie" aria-hidden="true">
      <Busto seed={seed} personality={personality} gris={gris} />
      <span className="ficha-depie-piso" />
    </div>
  );
}

/** Una sección de la planilla: título display con la línea punteada abajo. */
export function Seccion({ titulo, extra, children }: { titulo: ReactNode; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="ficha-seccion">
      <h4 className="ficha-sub">
        {titulo}
        {extra && <span className="ficha-sub-extra">{extra}</span>}
      </h4>
      {children}
    </section>
  );
}

/** Un renglón de planilla: la etiqueta chica a la izquierda, el dato a la derecha. */
export function Renglon({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="data-row">
      <span className="data-label">{label}</span>
      <span className="data-value">{children}</span>
    </div>
  );
}

/** La cara chica, redonda, para las filas densas (escala S): la del Tablero. */
export function Carita({ seed, personality }: { seed: string; personality?: Personality }) {
  return (
    <span className="ficha-carita" aria-hidden="true">
      <Busto seed={seed} personality={personality} />
    </span>
  );
}
