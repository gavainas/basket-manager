import type { ReactNode } from 'react';
import type { Personality } from '../game/types';
import { ARCHIVO, varianteFor } from './Avatar';

/**
 * El jugador de pie (UI V1, Tablero aprobado): el retrato ilustrado recortado
 * como busto, sin marco, apoyado sobre la línea del parquet. Es la escala M de
 * la Art Bible (§9): cabeza y torso, no la foto carnet de la lista.
 *
 * Usa el mismo archivo por arquetipo que `Avatar` y la misma variante estable
 * (espejo) por persona, así la cara es la misma en la tira, la ficha y el
 * partido. Sin personalidad no hay retrato ilustrado: cae al hueco neutro.
 */
export function Busto({ seed, personality, gris = false }: { seed: string; personality?: Personality; gris?: boolean }) {
  const src = personality ? `${import.meta.env.BASE_URL}arte/${ARCHIVO[personality]}` : null;
  return (
    <span
      className={`busto${varianteFor(seed) === 1 ? ' espejo' : ''}${gris ? ' gris' : ''}`}
      style={src ? { backgroundImage: `url(${src})` } : undefined}
      aria-hidden="true"
    />
  );
}

export interface PersonaDePie {
  id: string;
  nombre: string;
  personality?: Personality;
  /** Puesto u otra línea corta debajo del nombre. */
  sub?: string;
  /** El estado que importa, escrito: «Al borde», «Fundido». Sólo si hay algo. */
  estado?: { cls: 'good' | 'warn' | 'bad'; label: string } | null;
  /** Fuera de la línea: no está disponible (en gris, después del corte). */
  fuera?: boolean;
  title?: string;
  onClick?: () => void;
}

/**
 * La fila de personas sobre el parquet. Los disponibles se reparten a todo el
 * ancho; los que no están van al final, después de una línea fina y en gris.
 * `extra` se dibuja a la izquierda del corte (por ejemplo, un contador).
 */
export function FilaDePie({ personas, compacta = false, extra }: { personas: PersonaDePie[]; compacta?: boolean; extra?: ReactNode }) {
  const dentro = personas.filter((p) => !p.fuera);
  const fuera = personas.filter((p) => p.fuera);
  const una = (p: PersonaDePie) => (
    <button key={p.id} className={`depie${p.fuera ? ' fuera' : ''}`} onClick={p.onClick} title={p.title ?? p.nombre}>
      <Busto seed={p.id} personality={p.personality} gris={p.fuera} />
      <span className="depie-sombra" aria-hidden="true" />
      <span className="depie-lab">
        <span className="depie-nom">{p.nombre}</span>
        {p.sub && <span className="depie-sub">{p.sub}</span>}
        {p.estado && <span className={`depie-est ${p.estado.cls}`}>{p.estado.label}</span>}
      </span>
    </button>
  );
  return (
    <div className={`fila-depie${compacta ? ' compacta' : ''}`}>
      <div className="fila-depie-linea" aria-hidden="true" />
      <div className="fila-depie-gente">
        {dentro.map(una)}
        {extra}
        {fuera.length > 0 && <span className="fila-depie-corte" aria-hidden="true" />}
        {fuera.map(una)}
      </div>
    </div>
  );
}
