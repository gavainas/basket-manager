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
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}arte/${art})`,
        height: alto ?? 175,
      }}
      role="img"
      aria-label={alt}
    />
  );
}
