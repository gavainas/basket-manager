// Íconos de línea, inline y sin dependencias: la referencia tiene uno en cada
// pestaña y en cada módulo de recursos, y es mucho de lo que la hace ver
// terminada. Nada de emoji acá — los emoji son de colores y sobre una banda de
// color quedan sucios.
//
// Reglas del set, para que sumar uno nuevo no rompa la familia:
// - Lienzo 24×24, solo trazo (nunca relleno), grosor 1.8, puntas redondeadas.
// - Cada dibujo llega a los bordes 3 y 21: si uno queda chico, se nota en fila.
// - El color sale de `currentColor`, así hereda el contexto (cromo, banda, tinta).

export type IconName =
  | 'tablero'
  | 'plantel'
  | 'finanzas'
  | 'liga'
  | 'agenda'
  | 'rankings'
  | 'historia'
  | 'semana'
  | 'caja'
  | 'gimnasio'
  | 'asado'
  | 'salir';

const PATHS: Record<IconName, string> = {
  // Tablero: la grilla del resumen.
  tablero: 'M3 4h7v6H3z M14 4h7v10h-7z M3 14h7v6H3z M14 18h7v3h-7z',
  // Plantel: dos personas, una adelante.
  plantel: 'M9 11a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z M3 20.5c0-3.3 2.7-6 6-6s6 2.7 6 6 M16.4 5.4a3.2 3.2 0 010 6 M17.6 15c2.6.7 4.4 3 4.4 5.5',
  // Finanzas: billetera con la solapa.
  finanzas: 'M3 7.5h18v12H3z M3 11.5h18 M16 15.5h2.5',
  // Liga: el trofeo.
  liga: 'M8 4h8v4.5a4 4 0 01-8 0z M8 5.5H5.5V8a2.5 2.5 0 002.5 2.5 M16 5.5h2.5V8a2.5 2.5 0 01-2.5 2.5 M12 12.5v3.5 M8.5 20h7 M10 16h4l.8 4h-5.6z',
  // Agenda: el almanaque de la fecha.
  agenda: 'M4 6h16v15H4z M4 10.5h16 M8.5 3v3.5 M15.5 3v3.5 M8 14.5h3',
  // Rankings: las barras de la tabla.
  rankings: 'M4 20.5V11 M10 20.5V4.5 M16 20.5v-6.5 M21 20.5H3',
  // Historia: el cuaderno del club.
  historia: 'M5 3.5h14v17H5z M8.5 3.5v17 M11.5 8h4.5 M11.5 12h4.5 M11.5 16h3',
  // Semana: avanzar.
  semana: 'M7 4.5l8 7.5-8 7.5 M15 4.5l5 7.5-5 7.5',
  // Caja: el fajo de la comisión.
  caja: 'M3 8.5h18v10H3z M3 12h18 M12 4.5h6v4',
  // Gimnasio: el galpón alquilado.
  gimnasio: 'M3 10.5L12 4l9 6.5 M5 10v10.5h14V10 M9.5 20.5v-6h5v6',
  // Asado: la parrilla con las brasas.
  asado: 'M4 11.5h16 M6.5 11.5v7 M17.5 11.5v7 M9 4.5c0 1.5-1.5 2-1.5 3.5 M12 3.5c0 1.8-1.5 2.3-1.5 4 M15 4.5c0 1.5-1.5 2-1.5 3.5',
  // Salir: la puerta.
  salir: 'M10 3.5H4.5v17H10 M14.5 8l-4 4 4 4 M10.5 12H21',
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
