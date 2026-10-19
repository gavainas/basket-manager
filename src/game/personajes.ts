// Los personajes del club que no juegan: el del almacén, la tesorera, el
// canchero y los tres de la comisión. Hasta acá aparecían en los eventos sin
// nombre ("el tesorero te mira fijo"), y un personaje sin nombre no vuelve:
// cada vez es otro. Con nombre, el del almacén que te frena en la esquina es
// el mismo que te muestra tu nota pegada al lado de la caja tres fechas después.
//
// Son los mismos en los dos modos: el club de siempre y el de la Carrera
// tienen un barrio, y el barrio tiene esta gente. Sesión 4 de
// design/MUNDO_REVISION_2026-10.md.

export const PERSONAJES = {
  /** El del almacén de la esquina: diario doblado bajo el brazo y memoria larga. */
  almacenero: 'Raúl',
  almaceneroLargo: 'Raúl, el del almacén',
  /** La tesorera: cuaderno abierto, cuentas en birome, no le gusta fiar. */
  tesorera: 'Mabel',
  tesoreraLarga: 'Mabel, la tesorera',
  /** El canchero del gimnasio: las llaves, las luces y la última palabra sobre el piso. */
  canchero: 'Don Walter',
  cancheroLargo: 'Don Walter, el canchero',
  /** Los tres de la comisión: ponen la cara en el barrio y preguntan. */
  comision: ['Nelson', 'la Beba', 'el Escribano'] as const,
  comisionLarga: 'Nelson, la Beba y el Escribano',
} as const;
