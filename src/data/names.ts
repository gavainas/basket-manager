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

export const NEIGHBORHOODS = [
  'Parque Batlle', 'La Blanqueada', 'Pocitos', 'El Cerro', 'Sayago', 'Malvín',
  'La Teja', 'Buceo', 'Cordón', 'Capurro', 'Colón', 'Unión',
] as const;

export const DELEGATE_NAMES = [
  'el Ruso Techera', 'Doña Marta', 'el Flaco Umpiérrez', 'Cacho Silveira', 'el Profe Núñez',
  'Beto Cardoso', 'la Colo Fernández', 'el Vasco Aguirre', 'Tito Barrios', 'el Pelado Sosa',
] as const;
