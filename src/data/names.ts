// Pools de nombres para la generación procedural de jugadores del mundo.

export const FIRST_NAMES = [
  'Nicolás', 'Pablo', 'Martín', 'Juan', 'Diego', 'Federico', 'Andrés', 'Santiago',
  'Gonzalo', 'Matías', 'Sebastián', 'Rodrigo', 'Agustín', 'Facundo', 'Bruno', 'Lucas',
  'Emiliano', 'Joaquín', 'Ignacio', 'Franco', 'Maxi', 'Leandro', 'Damián', 'Marcelo',
  'Gastón', 'Hernán', 'Ramiro', 'Alejo', 'Tomás', 'Felipe', 'Julián', 'Mauricio',
  'Cristian', 'Álvaro', 'Fernando', 'Gabriel', 'Adrián', 'Esteban', 'Iván', 'Óscar',
  'Waldemar', 'Néstor', 'Richard', 'Washington', 'Edinson',
] as const;

export const LAST_NAMES = [
  'Fernández', 'Silva', 'Gómez', 'Torres', 'López', 'Ramos', 'Pérez', 'Rodríguez',
  'Martínez', 'García', 'Sosa', 'Cabrera', 'Núñez', 'Acosta', 'Viera', 'Morales',
  'Batista', 'Techera', 'Pereyra', 'Cardozo', 'Lemos', 'Olivera', 'Duarte', 'Ferreira',
  'Bentancor', 'Píriz', 'Alonso', 'Sanguinetti', 'Camejo', 'Machado', 'Correa', 'Godín',
  'Suárez', 'Varela', 'Castro', 'Méndez', 'Britos', 'Larrosa', 'Umpiérrez', 'Da Silva',
  'Curbelo', 'Perdomo', 'Bermúdez', 'Aguirre', 'Barrios',
] as const;

/** Ciudades del interior con su distancia aproximada a la capital (km). */
export const INTERIOR_CITIES: { city: string; km: number }[] = [
  { city: 'Paysandú', km: 380 },
  { city: 'Maldonado', km: 130 },
  { city: 'Salto', km: 500 },
  { city: 'Colonia', km: 180 },
  { city: 'Florida', km: 100 },
  { city: 'San José', km: 95 },
  { city: 'Minas', km: 120 },
  { city: 'Durazno', km: 180 },
];

/**
 * Barrios de Montevideo. Los clubes del mundo tienen el suyo escrito a mano
 * (src/data/clubLore.ts); esta lista es para el club de la Carrera y para
 * cualquier nombre que no esté en la tabla.
 */
export const NEIGHBORHOODS = [
  'Parque Batlle', 'La Blanqueada', 'Pocitos', 'Villa del Cerro', 'Sayago', 'Malvín',
  'La Teja', 'Buceo', 'Cordón', 'Capurro', 'Colón', 'Unión',
  'Aguada', 'Reducto', 'Belvedere', 'Paso Molino', 'Prado', 'Nuevo París',
  'Piedras Blancas', 'Villa Española', 'Maroñas', 'Ciudad Vieja', 'Centro', 'Palermo',
  'Barrio Sur', 'Tres Cruces', 'La Comercial', 'Brazo Oriental', 'Jacinto Vera', 'Goes',
  'Carrasco', 'Punta Carretas', 'Punta Gorda', 'Cerrito de la Victoria', 'Bella Vista', 'Atahualpa',
  'Villa Dolores', 'Larrañaga', 'Paso de la Arena', 'Malvín Norte', 'Las Acacias', 'Parque Rodó',
] as const;

/**
 * Delegados de reserva: los 88 clubes del mundo tienen el suyo, único, en
 * src/data/clubLore.ts. Estos son para un club que no esté en esa tabla.
 */
export const DELEGATE_NAMES = [
  'el Gallego Olascoaga', 'Doña Irma', 'el Flaco Mederos', 'Cacho Villalba', 'el Profe Antúnez',
  'Beto Silvera', 'la Colo Rivas', 'el Vasco Echeverría', 'Tito Arriola', 'el Pelado Montes',
  'Don Raúl Bentos', 'la Gringa Hoffmann', 'el Turco Nazar', 'Pocho Ledesma', 'el Tano Spinelli',
  'Doña Lita', 'el Canario Pedrozo', 'Quique Zabala', 'el Polaco Nowak', 'Coco Ibarra',
] as const;
