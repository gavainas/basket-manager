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
  // Secciones y recursos
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
  | 'salir'
  // Cabezales de card
  | 'destacado'
  | 'chat'
  | 'inscripcion'
  | 'vestuario'
  | 'alerta'
  // Estilo de rival
  | 'tiradores'
  | 'interior'
  | 'corredores'
  | 'equilibrado'
  // Categorías de nota humana (ver NOTE_ICON en humanState)
  | 'animo'
  | 'fisico'
  | 'plata'
  | 'social'
  | 'cancha'
  // La purga de emojis de cromo (Sprint 4): los estados y marcas que antes
  // eran emoji pasan al set de línea.
  | 'pelota'
  | 'estrella'
  | 'reloj'
  | 'corazon'
  | 'enfermeria'
  | 'laburo'
  | 'cruz'
  | 'rayo';

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

  // ---- Cabezales de card ----
  // Destacado: la chinche del corcho.
  destacado: 'M12 13.5V21 M8 4h8 M9.5 4v5.5L6.5 13h11L14.5 9.5V4',
  // Chat: el globo del grupo.
  chat: 'M3.5 5h17v11.5H9L4.5 21v-4.5H3.5z M8 9h8 M8 12.5h5',
  // Inscripción: la planilla de la liga.
  inscripcion: 'M6 4.5h12v16.5H6z M9.5 3h5v3h-5z M9 11h6 M9 15h4',
  // Vestuario: la camiseta colgada.
  vestuario: 'M8.5 4L4 6.5V11h3v10h10V11h3V6.5L15.5 4 M8.5 4a3.5 3.5 0 007 0',
  // Alerta: el triángulo del incidente.
  alerta: 'M12 3.5L21.5 20.5H2.5z M12 9.5v5 M12 17.5v.5',

  // ---- Estilo de rival ----
  // Tiradores: la diana.
  tiradores: 'M12 3.5v3 M12 17.5v3 M3.5 12h3 M17.5 12h3 M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9 M12 11a1 1 0 000 2 1 1 0 000-2',
  // Juego interior: los hombros anchos que castigan cerca del aro.
  interior: 'M12 3.5a2.6 2.6 0 100 5.2 2.6 2.6 0 000-5.2 M4 20.5v-4.8c0-2.9 3.6-5 8-5s8 2.1 8 5v4.8 M8 20.5v-4 M16 20.5v-4',
  // Corredores: la flecha de la contra.
  corredores: 'M3 17.5h9 M3 12h13 M3 6.5h7 M16.5 12l4.5-5.5 M16.5 12l4.5 5.5',
  // Equilibrado: la balanza.
  equilibrado: 'M12 4v16 M6 20.5h12 M4 8h16 M4 8l-2.5 5h5z M20 8l2.5 5h-5z',

  // ---- Categorías de nota humana ----
  // Ánimo: la cara, sin decir si está bien o mal — eso lo dice el color.
  animo: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17 M9 10h.5 M14.5 10h.5 M8.5 15h7',
  // Físico: el pulso del estado.
  fisico: 'M3 12h3.5l2-5 3 10 2.5-5H21',
  // Plata: la moneda de la cuota.
  plata: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17 M12 7v10 M14.5 9.5a2.5 2.5 0 00-5 .5c0 2.5 5 1.5 5 4a2.5 2.5 0 01-5 .5',
  // Social: dos que hablan.
  social: 'M9 4.5a3 3 0 100 6 3 3 0 000-6 M3.5 20.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5 M16 5.5h5v5h-1.5v3l-2.5-3H16z',
  // Cancha: el banco de suplentes.
  cancha: 'M3.5 11h17 M5.5 11v9.5 M18.5 11v9.5 M6.5 11V6.5h11V11 M12 6.5V11',

  // ---- Marcas de estado (ex emojis de cromo) ----
  // Pelota: el balón con sus gajos.
  pelota: 'M12 3a9 9 0 100 18 9 9 0 000-18 M12 3v18 M3 12h18 M5.6 5.8c2.4 1.8 2.4 10.6 0 12.4 M18.4 5.8c-2.4 1.8-2.4 10.6 0 12.4',
  // Estrella: la figura del partido.
  estrella: 'M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9-5.2-3-5.2 3 1.2-5.9-4.4-4 5.9-.7z',
  // Reloj: llegadas, minutos y esperas.
  reloj: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17 M12 7.5V12l3.5 2.5',
  // Corazón: el más querido del vestuario.
  corazon: 'M12 20.5S3.5 15 3.5 9.2A4.4 4.4 0 018 4.8c1.8 0 3.2 1 4 2.4.8-1.4 2.2-2.4 4-2.4a4.4 4.4 0 014.5 4.4c0 5.8-8.5 11.3-8.5 11.3z',
  // Enfermería: la cruz del botiquín.
  enfermeria: 'M4 6.5h16v13H4z M4 6.5l2-3h12l2 3 M12 9.5v7 M8.5 13h7',
  // Laburo: el maletín del que no llega por trabajo.
  laburo: 'M3.5 8h17v12h-17z M3.5 13h17 M9.5 8V5.5h5V8 M10.5 13v2.5h3V13',
  // Cruz: el faltazo (no vino).
  cruz: 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17 M9 9l6 6 M15 9l-6 6',
  // Rayo: el roce que salta chispas.
  rayo: 'M13.5 3L5.5 13.5H11L9.5 21l8-10.5H12z',
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
