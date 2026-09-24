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

/** "Silva", "Silva y Pereyra", "Silva, Fernández y Viera". */
export function listaY(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
