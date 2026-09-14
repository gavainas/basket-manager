import type { CSSProperties } from 'react';

/**
 * Banda ilustrada arriba de una card.
 *
 * El arte vive en `public/arte/` y se referencia con `BASE_URL` (el proyecto usa
 * base relativa: un path absoluto apuntaría a la raíz del dominio). Va como
 * fondo y no como <img> a propósito: si el archivo falta, queda una franja del
 * color de la sección y la pantalla sigue entera.
 *
 * Es arte provisional (ver design/ART_PIPELINE.md): se reemplaza pisando el
 * archivo, y sacar la banda es borrar una línea en la vista que la usa.
 */
export function Cabecera({ art, alt, alto }: { art: string; alt: string; alto?: number }) {
  return (
    <div
      className="cabecera-arte"
      // El alto pedido es el techo: en una ventana baja la banda cede
      // (ver `.cabecera-arte` en styles.css). A 720p se llevaba un tercio del
      // panel y el plantel de la pretemporada mostraba dos jugadores.
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}arte/${art})`,
        '--cab-alto': `${alto ?? 175}px`,
      } as CSSProperties}
      role="img"
      aria-label={alt}
    />
  );
}
