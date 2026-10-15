import type { CrestDesign } from './crest';
import { clubInitials } from './crest';

/**
 * Identidad del club: lo que el manager elige al fundarlo.
 *
 * Vive **dentro de la partida** (`state.club.identity`) y es opcional a
 * propósito: los saves anteriores no la tienen y no se les hace migración ni se
 * les sube `SAVE_VERSION` — si subiéramos la versión, `loadGame` devolvería null
 * y la partida guardada de Gabi se perdería. Para esas partidas,
 * `identityOf(state)` deriva una identidad por defecto del club que ya existe
 * (su nombre, sus iniciales), así el juego se comporta igual que siempre.
 *
 * Nada de acá toca las mecánicas: es nombre, colores y dibujo.
 */

/** Diseño de camiseta. Tres, que es lo que un club de barrio manda a hacer. */
export type KitDesign = 'lisa' | 'franjas' | 'banda';

export interface ClubIdentity {
  /** Nombre completo: "Atlético El Parque". */
  name: string;
  /** Nombre corto para tablas y chips: "El Parque". */
  shortName: string;
  /** 1 a 3 letras para el escudo y la camiseta. */
  initials: string;
  neighborhood: string;
  city: string;
  colors: {
    /** Color de campo del escudo y de la camiseta. */
    primary: string;
    /** Vivo: partición del escudo, franjas, detalles. */
    secondary: string;
  };
  /** Índices sobre las listas de `Crest.tsx` (ver CREST_VARIANTS). */
  crest: {
    shape: number;
    partition: number;
    charge: number;
    stars: number;
  };
  kit: KitDesign;
  venueName: string;
}

export const IDENTITY_LIMITS = {
  name: { min: 3, max: 28 },
  shortName: { min: 2, max: 18 },
  initials: { min: 1, max: 3 },
  neighborhood: { min: 0, max: 24 },
  city: { min: 0, max: 24 },
  venueName: { min: 3, max: 30 },
} as const;

/** El club de siempre: lo que ve quien no toca nada y lo que heredan los saves viejos. */
export const DEFAULT_IDENTITY: ClubIdentity = {
  name: 'Atlético El Parque',
  shortName: 'El Parque',
  initials: 'EP',
  neighborhood: 'Parque Batlle',
  city: 'Montevideo',
  colors: { primary: '#2d5c8a', secondary: '#e8e4dc' },
  crest: { shape: 0, partition: 4, charge: 1, stars: 0 },
  kit: 'lisa',
  venueName: 'Gimnasio del Parque',
};

/** Puntos de partida del editor: no son "temas", son clubes creíbles. */
export const IDENTITY_PRESETS: { label: string; identity: ClubIdentity }[] = [
  { label: 'El Parque', identity: DEFAULT_IDENTITY },
  {
    label: 'La Cantera',
    identity: {
      name: 'Club Atlético La Cantera',
      shortName: 'La Cantera',
      initials: 'LC',
      neighborhood: 'La Teja',
      city: 'Montevideo',
      colors: { primary: '#1d1f24', secondary: '#f2c230' },
      crest: { shape: 1, partition: 2, charge: 2, stars: 1 },
      kit: 'franjas',
      venueName: 'Galpón de La Teja',
    },
  },
  {
    label: 'Unión Norte',
    identity: {
      name: 'Unión del Norte',
      shortName: 'Unión Norte',
      initials: 'UN',
      neighborhood: 'Belvedere',
      city: 'Montevideo',
      colors: { primary: '#f4f1ea', secondary: '#2a4f9b' },
      crest: { shape: 0, partition: 1, charge: 3, stars: 0 },
      kit: 'banda',
      venueName: 'Polideportivo del Norte',
    },
  },
  {
    label: 'Bohemios',
    identity: {
      name: 'Bohemios de la Plaza',
      shortName: 'Bohemios',
      initials: 'BP',
      neighborhood: 'Palermo',
      city: 'Montevideo',
      colors: { primary: '#5b2a86', secondary: '#f4f1ea' },
      crest: { shape: 4, partition: 5, charge: 4, stars: 3 },
      kit: 'banda',
      venueName: 'Cancha de la Plaza',
    },
  },
];

/**
 * La identidad de esta partida, con red para los saves que no la tienen.
 *
 * Para una partida vieja arma una identidad desde el club que ya existe: el
 * nombre guardado manda, las iniciales salen de él y el resto son los valores
 * de siempre. Nada cambia de aspecto respecto de lo que esa partida ya mostraba.
 */
export function identityOf(state: { club: { name: string; identity?: ClubIdentity } }): ClubIdentity {
  const guardada = state.club.identity;
  if (guardada) return guardada;
  const nombre = state.club.name || DEFAULT_IDENTITY.name;
  return {
    ...DEFAULT_IDENTITY,
    name: nombre,
    shortName: nombre === DEFAULT_IDENTITY.name ? DEFAULT_IDENTITY.shortName : nombre,
    initials: clubInitials(nombre),
  };
}

/** El escudo que le corresponde: las iniciales salen de la identidad, no del azar. */
export function crestDesignOf(identity: ClubIdentity): CrestDesign {
  return {
    shape: identity.crest.shape,
    partition: identity.crest.partition,
    charge: identity.crest.charge,
    stars: identity.crest.stars,
    initials: identity.initials,
  };
}

// ---------- Color: contraste y legibilidad ----------
//
// El club elige los colores, pero la interfaz tiene que seguir leyéndose con
// cualquiera de ellos. Amarillo sobre blanco y violeta sobre grafito son los dos
// casos que rompen todo, así que la tinta y los acentos se calculan, no se
// eligen. Las fórmulas son las de WCAG 2.1 (luminancia relativa y ratio de
// contraste); el objetivo es 4.5:1 para texto y 3:1 para bordes y detalles.

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Luminancia relativa WCAG. */
export function luminance(hex: string): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Ratio de contraste WCAG entre dos colores (1 a 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** La tinta que se lee sobre ese color: la del sistema, clara u oscura. */
export function inkOn(hex: string): string {
  return contrast(hex, '#20242a') >= contrast(hex, '#f6f4f1') ? '#20242a' : '#f6f4f1';
}

function mezclar(hex: string, hacia: string, cuanto: number): string {
  const [r1, g1, b1] = parseHex(hex);
  const [r2, g2, b2] = parseHex(hacia);
  return toHex([r1 + (r2 - r1) * cuanto, g1 + (g2 - g1) * cuanto, b1 + (b2 - b1) * cuanto]);
}

/**
 * El mismo color del club, corrido hasta que se lea sobre `fondo`.
 *
 * Un club negro sobre la barra grafito desaparece y uno blanco sobre panel
 * también: en vez de prohibir colores, se aclara u oscurece el tono hasta
 * alcanzar el ratio pedido. Mantiene el matiz, que es lo que el manager eligió.
 */
export function readableOn(color: string, fondo: string, ratio = 4.5): string {
  if (contrast(color, fondo) >= ratio) return color;
  const fondoClaro = luminance(fondo) > 0.4;
  const destino = fondoClaro ? '#14161a' : '#ffffff';
  let mejor = color;
  for (let paso = 1; paso <= 20; paso++) {
    mejor = mezclar(color, destino, paso / 20);
    if (contrast(mejor, fondo) >= ratio) return mejor;
  }
  return mejor;
}

/** Aclara (positivo) u oscurece (negativo) sin cambiar el matiz. */
export function shift(hex: string, cuanto: number): string {
  return cuanto >= 0 ? mezclar(hex, '#ffffff', cuanto) : mezclar(hex, '#000000', -cuanto);
}

/**
 * Los colores derivados que usa la interfaz, todos a partir de los dos que
 * eligió el manager. Un solo lugar donde se decide: las vistas leen variables
 * CSS (ver ui/IdentityTheme.tsx) y nunca un hex suelto.
 */
export interface ClubPalette {
  primary: string;
  secondary: string;
  /** Tinta legible sobre el primario y sobre el secundario. */
  onPrimary: string;
  onSecondary: string;
  /** El primario corrido para leerse sobre el chrome grafito. */
  onChrome: string;
  /** El primario corrido para leerse sobre panel claro (sirve de fondo de banda). */
  onPanel: string;
  /** Tinta legible **sobre** `onPanel`, que no es el primario sino su versión corrida. */
  onPanelInk: string;
  /** Fondo de los retratos del plantel: el primario, pero nunca ilegible. */
  portrait: string;
  portraitInk: string;
  /** Versión muy suave para rellenos grandes. */
  wash: string;
}

export const CHROME = '#32353a';
export const PANEL = '#f6f4f1';

/**
 * De los dos colores del club, el que mejor se planta sobre ese fondo.
 *
 * Un club negro y amarillo sobre la barra grafito: si insistimos con el
 * primario, el negro hay que aclararlo tanto que termina gris y el club deja de
 * reconocerse. El amarillo ya contrasta solo. Así que primero se elige cuál de
 * los dos poner, y recién después se lo corrige si todavía no alcanza —
 * corregir es el último recurso, no el primero.
 */
function mejorSobre(primary: string, secondary: string, fondo: string): string {
  const cp = contrast(primary, fondo);
  const cs = contrast(secondary, fondo);
  if (cp >= 4.5) return primary; // el principal alcanza: manda él
  if (cs >= 4.5) return secondary; // el principal no llega y el vivo sí
  return cp >= cs ? primary : secondary; // ninguno llega: el menos malo, y se corrige
}

export function paletteOf(identity: ClubIdentity): ClubPalette {
  const { primary, secondary } = identity.colors;
  // Para los fondos grandes (fichas del plantel) manda el principal, salvo que
  // sea casi blanco: un club de camiseta blanca igual tiene que verse.
  const fuerte = luminance(primary) > 0.72 && luminance(secondary) < luminance(primary) ? secondary : primary;
  const onPanel = readableOn(mejorSobre(primary, secondary, PANEL), PANEL);
  return {
    primary,
    secondary,
    onPrimary: inkOn(primary),
    onSecondary: inkOn(secondary),
    onChrome: readableOn(mejorSobre(primary, secondary, CHROME), CHROME),
    onPanel,
    onPanelInk: inkOn(onPanel),
    portrait: fuerte,
    portraitInk: inkOn(fuerte),
    wash: shift(fuerte, luminance(fuerte) > 0.5 ? -0.12 : 0.82),
  };
}

// ---------- Validación ----------

export interface IdentityErrors {
  name?: string;
  shortName?: string;
  initials?: string;
  venueName?: string;
  colors?: string;
}

/** Normaliza lo que el manager escribió: recorta, colapsa espacios, sube las iniciales. */
export function normalizeIdentity(identity: ClubIdentity): ClubIdentity {
  const limpiar = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);
  return {
    ...identity,
    name: limpiar(identity.name, IDENTITY_LIMITS.name.max),
    shortName: limpiar(identity.shortName, IDENTITY_LIMITS.shortName.max),
    initials: limpiar(identity.initials, IDENTITY_LIMITS.initials.max).toUpperCase(),
    neighborhood: limpiar(identity.neighborhood, IDENTITY_LIMITS.neighborhood.max),
    city: limpiar(identity.city, IDENTITY_LIMITS.city.max),
    venueName: limpiar(identity.venueName, IDENTITY_LIMITS.venueName.max),
  };
}

export function validateIdentity(identity: ClubIdentity): IdentityErrors {
  const e: IdentityErrors = {};
  const n = normalizeIdentity(identity);

  if (n.name.length < IDENTITY_LIMITS.name.min) e.name = 'El club necesita un nombre (3 letras o más).';
  if (n.shortName.length < IDENTITY_LIMITS.shortName.min) e.shortName = 'Poné un nombre corto para las tablas.';
  if (!/^[A-ZÁÉÍÓÚÑ]{1,3}$/.test(n.initials)) e.initials = 'De 1 a 3 letras, sin números ni símbolos.';
  if (n.venueName.length < IDENTITY_LIMITS.venueName.min) e.venueName = 'La cancha necesita un nombre.';
  // Dos colores iguales dejan el escudo sin partición y la camiseta sin dibujo.
  if (contrast(n.colors.primary, n.colors.secondary) < 1.35)
    e.colors = 'Los dos colores son casi el mismo: el escudo y la camiseta quedan planos.';

  return e;
}

export function hasErrors(e: IdentityErrors): boolean {
  return Object.keys(e).length > 0;
}
