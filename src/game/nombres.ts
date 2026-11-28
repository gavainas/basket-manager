// Cómo se nombra a la gente en corto. Antes cada pantalla y cada relato tenía
// su propia copia de "la última palabra del nombre", y a "Agustín Da Silva"
// todas lo llamaban "Silva" (sep 2026: la pizarra decía "cuando Silva
// descanse a Silva" con el DT Da Silva y nuestro base Facundo Silva).

/** Partículas que van con el apellido: "Da Silva", "De León", "Del Río". */
const PARTICULAS = new Set(['da', 'de', 'del', 'di', 'dos', 'la', 'le', 'van', 'von']);

/** Sólo el apellido, sin el apodo entre comillas: "Facundo Silva" → "Silva"; "Agustín Da Silva" → "Da Silva". */
export function apellido(nombre: string): string {
  const parts = nombre.replace(/"[^"]*"\s*/g, '').trim().split(/\s+/);
  if (parts.length >= 2 && PARTICULAS.has(parts[parts.length - 2].toLowerCase())) return parts.slice(-2).join(' ');
  return parts[parts.length - 1];
}

/** El apodo si lo tiene ('"Chino" Rodríguez' → "Chino"); si no, el apellido. Es lo que entra en una tira o una ficha chica. */
export function apodoOApellido(nombre: string): string {
  const nick = nombre.match(/"([^"]+)"/);
  if (nick) return nick[1];
  return apellido(nombre);
}

/**
 * El nombre corto de alguien del plantel (apodo o apellido), con la inicial
 * del nombre si otro del mismo plantel se llamaría igual: con dos Ramos
 * fichados, la fila de pie decía "RAMOS" dos veces (nov 2026). "J. Ramos",
 * "R. Ramos"; sin choque, "Ramos" o "Chino" como siempre.
 */
export function cortoEnPlantel(nombre: string, plantel: string[]): string {
  const corto = apodoOApellido(nombre);
  const choca = plantel.some((otro) => otro !== nombre && apodoOApellido(otro) === corto);
  if (!choca) return corto;
  // Dos "Chino": el apodo con su apellido. Dos Ramos: la inicial del nombre.
  if (/"[^"]+"/.test(nombre)) return `${corto} ${apellido(nombre)}`;
  const inicial = nombre.trim().charAt(0);
  return inicial ? `${inicial}. ${corto}` : corto;
}

/** "Silva", "Silva y Pereyra", "Silva, Fernández y Viera". */
export function listaY(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * El apellido de alguien del mundo, con la inicial del nombre sólo si otro de
 * su mismo equipo se apellida igual: "Píriz" o, si hay dos, "A. Píriz" y
 * "N. Píriz" (nov 2026). El mundo nuevo ya no repite apellidos en un plantel,
 * pero los saves de antes sí, y el que se fue del club puede caer en uno que
 * ya tenía su apellido.
 */
export function apellidoEnEquipo(
  p: { id: string; firstName: string; lastName: string },
  equipo: { id: string; lastName: string }[],
  /**
   * Apellidos del otro equipo que también se nombran en corto (los nuestros):
   * si el rival se apellida igual, lleva la inicial para que "Dos más para
   * Núñez" no se lea como nuestro Núñez.
   */
  ajenos: string[] = []
): string {
  const choca = equipo.some((q) => q.id !== p.id && q.lastName === p.lastName) || ajenos.includes(p.lastName);
  if (!choca) return p.lastName;
  const inicial = p.firstName.replace(/"/g, '').trim().charAt(0);
  return inicial ? `${inicial}. ${p.lastName}` : p.lastName;
}
