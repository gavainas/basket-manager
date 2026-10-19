// La cara de cada club del mundo, escrita a mano e indexada por NOMBRE (la
// identidad de un club viaja con el nombre, no con el slot: ver
// design/LIGAS.md). Antes la cancha se armaba con la última palabra del
// nombre ("Gimnasio de Curva", "Gimnasio de 5"), el barrio salía del hash y
// Deportivo Capurro podía jugar en Pocitos, y diez delegados se repartían
// 75 clubes. Ahora cada club tiene su cancha, vive en el barrio que dice su
// nombre y tiene un delegado que no es el de nadie más.
//
// Sesión 1 de design/MUNDO_REVISION_2026-10.md. El blurb y los rasgos de
// cada club (sesión 2) entran acá mismo, en esta misma tabla.

export interface ClubLore {
  /** El nombre de la cancha, como lo dice la gente de la liga. */
  cancha: string;
  /** El barrio donde está la cancha (coherente con el nombre del club). */
  barrio: string;
  /** Quien lleva la planilla y discute los horarios. Único en todo el mundo. */
  delegado: string;
}

export const CLUB_LORE: Record<string, ClubLore> = {
  // ---------- Liga Universitaria · Divisional A ----------
  'Náutico del Cerro': { cancha: 'Gimnasio del Náutico', barrio: 'Villa del Cerro', delegado: 'el Capitán Bentancur' },
  'Atlético Progreso': { cancha: 'Estadio cerrado Progreso', barrio: 'La Teja', delegado: 'Don Hugo Larrosa' },
  'Defensor del Prado': { cancha: 'Gimnasio Defensor', barrio: 'Prado', delegado: 'el Ingeniero Carámbula' },
  'Olimpia del Oeste': { cancha: 'Polideportivo Olimpia', barrio: 'Paso de la Arena', delegado: 'el Vasco Goyeneche' },
  'Racing de la Villa': { cancha: 'Gimnasio Racing', barrio: 'Villa Dolores', delegado: 'Quique Bergara' },
  'Sportivo Artigas': { cancha: 'Sede social Sportivo Artigas', barrio: 'Jacinto Vera', delegado: 'Doña Esther Píriz' },
  'Estrella del Sur': { cancha: 'Gimnasio de la Estrella', barrio: 'Barrio Sur', delegado: 'el Tano Mautone' },
  'Unión del Puerto': { cancha: 'Gimnasio del Puerto', barrio: 'Ciudad Vieja', delegado: 'el Gallego Da Rosa' },
  'Colón Basket': { cancha: 'Gimnasio Colón', barrio: 'Colón', delegado: 'Beto Lorenzo' },
  'Litoral del Norte': { cancha: 'Gimnasio Litoral', barrio: 'Lezica', delegado: 'el Canario Rondán' },

  // ---------- Liga Universitaria · Divisional B ----------
  'Deportivo La Curva': { cancha: 'Cancha de La Curva', barrio: 'Curva de Maroñas', delegado: 'el Ruso Nikitin' },
  'Unión Vecinal': { cancha: 'Salón de la Unión Vecinal', barrio: 'Unión', delegado: 'Doña Marta' },
  'Ferro del Norte': { cancha: 'Gimnasio Ferro', barrio: 'Peñarol', delegado: 'el Flaco Umpiérrez' },
  'Los Cardales': { cancha: 'Quincho techado de Los Cardales', barrio: 'Carrasco Norte', delegado: 'Cacho Silveira' },
  'Bohemios del Parque': { cancha: 'Gimnasio Bohemios', barrio: 'Parque Rodó', delegado: 'el Profe Núñez' },
  'Cilindro Viejo': { cancha: 'Cancha del Cilindro Viejo', barrio: 'Larrañaga', delegado: 'Beto Cardoso' },
  'La Terminal': { cancha: 'Gimnasio de la Terminal', barrio: 'Tres Cruces', delegado: 'la Colo Fernández' },
  'Halcones de la Costa': { cancha: 'Complejo Halcones', barrio: 'Punta Gorda', delegado: 'el Vasco Aguirre' },
  'Círculo Sportivo': { cancha: 'Gimnasio del Círculo', barrio: 'Pocitos', delegado: 'Tito Barrios' },

  // ---------- Liga Universitaria · Divisional C ----------
  'Rampla del Molino': { cancha: 'Gimnasio Rampla', barrio: 'Paso Molino', delegado: 'el Pelado Sosa' },
  'Atlético Reducto': { cancha: 'Cancha del Reducto', barrio: 'Reducto', delegado: 'Pocho Cuello' },
  'Deportivo Capurro': { cancha: 'Gimnasio Capurro', barrio: 'Capurro', delegado: 'el Polaco Luzardo' },
  'Belvedere Basket': { cancha: 'Plaza de deportes de Belvedere', barrio: 'Belvedere', delegado: 'Chiche Amaral' },
  'Juventud del Paso': { cancha: 'Gimnasio Juventud', barrio: 'Paso de las Duranas', delegado: 'el Nene Tejera' },
  'Nuevo París Basket': { cancha: 'Gimnasio de Nuevo París', barrio: 'Nuevo París', delegado: 'Coco Pintos' },
  'Los Yuyos del Buceo': { cancha: 'Cancha de Los Yuyos', barrio: 'Buceo', delegado: 'el Bocha Rocha' },
  'Unión Sayago': { cancha: 'Gimnasio de la Unión Sayago', barrio: 'Sayago', delegado: 'Doña Nelly Perdomo' },
  'Estrella de Piedras Blancas': { cancha: 'Gimnasio Estrella', barrio: 'Piedras Blancas', delegado: 'Toto Curbelo' },
  'Sportivo Aguada Chico': { cancha: 'Galpón de Aguada Chico', barrio: 'Aguada', delegado: 'el Chino Britos' },

  // ---------- Liga Universitaria · Divisional D ----------
  'Villa Española Basket': { cancha: 'Plaza de deportes N° 2', barrio: 'Villa Española', delegado: 'el Gordo Olivera' },
  'Atlético Manga': { cancha: 'Cancha de Manga', barrio: 'Manga', delegado: 'Tata Acosta' },
  'Los Bomberos de Colón': { cancha: 'Gimnasio del Cuartel de Colón', barrio: 'Colón', delegado: 'el Sargento Camejo' },
  'Deportivo Casavalle': { cancha: 'Polideportivo de Casavalle', barrio: 'Casavalle', delegado: 'la Tía Gladys' },
  'La Cachimba': { cancha: 'Cancha de la Cachimba', barrio: 'Cerrito de la Victoria', delegado: 'el Loco Viera' },
  'Punta de Rieles Basket': { cancha: 'Gimnasio de Punta de Rieles', barrio: 'Punta de Rieles', delegado: 'Goyo Machado' },
  'El Monarca': { cancha: 'Galpón del Monarca', barrio: 'Bella Italia', delegado: 'el Pato Lemos' },
  'Barrio Borro Basket': { cancha: 'Cancha del Borro', barrio: 'Marconi', delegado: 'Lalo Cal' },
  'Los Últimos de Filipinas': { cancha: 'Cancha del fondo', barrio: 'Santiago Vázquez', delegado: 'el Cabezón Methol' },
  'Deportivo Maroñas': { cancha: 'Gimnasio de Maroñas', barrio: 'Maroñas', delegado: 'Tincho Pereyra' },

  // ---------- Liga del Centro · Primera ----------
  'Ciudad Vieja Basket': { cancha: 'Gimnasio del Mercado', barrio: 'Ciudad Vieja', delegado: 'el Doctor Varela' },
  'Los Bancarios': { cancha: 'Gimnasio del Club Bancario', barrio: 'Centro', delegado: 'Gerardo Bentancor' },
  'Escribanía Rossi': { cancha: 'Gimnasio del Colegio', barrio: 'Cordón', delegado: 'la Escribana Rossi' },
  'Los Médicos del Clínicas': { cancha: 'Gimnasio del Hospital', barrio: 'Parque Batlle', delegado: 'el Doctor Ferreira' },
  'Estudio Contable Pereira': { cancha: 'Gimnasio de la Mutualista', barrio: 'Centro', delegado: 'el Contador Pereira' },
  'Aduana Basket': { cancha: 'Gimnasio de la Aduana', barrio: 'Aguada', delegado: 'el Turco Sapelli' },
  'Los Ingenieros': { cancha: 'Gimnasio de la Facultad', barrio: 'Parque Rodó', delegado: 'el Ingeniero Píriz' },
  'Torre Ejecutiva': { cancha: 'Polideportivo del Ministerio', barrio: 'Centro', delegado: 'Licenciada Ramos' },
  'Sindicato del Puerto': { cancha: 'Gimnasio del Sindicato', barrio: 'Ciudad Vieja', delegado: 'el Moncho Sosa' },
  'Nocturno del Centro': { cancha: 'Gimnasio del Liceo Nocturno', barrio: 'Centro', delegado: 'el Profe Machado' },

  // ---------- Liga del Centro · Segunda ----------
  'Los Taxistas': { cancha: 'Gimnasio del Gremio', barrio: 'Goes', delegado: 'el Yoni Cabrera' },
  'Farmacia Central': { cancha: 'Gimnasio del Centro de Farmacias', barrio: 'Cordón', delegado: 'la Farmacéutica Duarte' },
  'Gremio del Cordón': { cancha: 'Salón del Gremio', barrio: 'Cordón', delegado: 'el Flaco Rivero' },
  'Los Fiscales': { cancha: 'Gimnasio de la Fiscalía', barrio: 'Centro', delegado: 'Doctor Olivera' },
  'Imprenta La Nocturna': { cancha: 'Galpón de la Imprenta', barrio: 'Barrio Sur', delegado: 'Pepe Batista' },
  'Mutualista Basket': { cancha: 'Gimnasio de la Mutualista', barrio: 'Tres Cruces', delegado: 'la Enfermera Correa' },
  'Los Peritos': { cancha: 'Gimnasio del Juzgado', barrio: 'Palermo', delegado: 'el Perito Godín' },
  'Tribunales Basket': { cancha: 'Gimnasio de Tribunales', barrio: 'Centro', delegado: 'Doctora Sanguinetti' },
  'Turno Noche': { cancha: 'Gimnasio del Hospital Nocturno', barrio: 'Aguada', delegado: 'el Nocturno Bermúdez' },

  // ---------- Liga del Comercio ----------
  'Ferretería El Tornillo': { cancha: 'Cancha de atrás de la ferretería', barrio: 'La Blanqueada', delegado: 'Don Aldo' },
  'Panadería Los Hornos': { cancha: 'Cancha de la parroquia', barrio: 'Unión', delegado: 'el Panadero Suárez' },
  'Autoservice Doña Chela': { cancha: 'Plaza de deportes N° 7', barrio: 'Jacinto Vera', delegado: 'Doña Chela' },
  'Carnicería El Novillo': { cancha: 'Cancha del Novillo', barrio: 'Villa Dolores', delegado: 'el Carnicero Tabeira' },
  'Bar El Refuerzo': { cancha: 'Cancha del fondo del bar', barrio: 'Larrañaga', delegado: 'el Gringo Pastorini' },
  'Óptica Mirasol': { cancha: 'Gimnasio del liceo', barrio: 'Tres Cruces', delegado: 'la Dueña de la Óptica' },
  'Taller Don Nino': { cancha: 'Galpón del taller', barrio: 'La Blanqueada', delegado: 'Don Nino' },

  // ---------- Liga de la Plaza ----------
  'La Amistad': { cancha: 'Cancha abierta de la plaza', barrio: 'Parque Batlle', delegado: 'el Pelusa Giménez' },
  'Los Tablones': { cancha: 'Cancha de los tablones', barrio: 'Buceo', delegado: 'Checho Larrosa' },
  'Los de Siempre': { cancha: 'La plaza de la Unión', barrio: 'Unión', delegado: 'el Tola Fonseca' },
  'El Galpón': { cancha: 'El Galpón', barrio: 'La Blanqueada', delegado: 'el Petiso Álvez' },
  'Panadería La Ideal': { cancha: 'Plaza de deportes N° 5', barrio: 'Cordón', delegado: 'Doña Nilda' },
  'La Esquina del Tanque': { cancha: 'Cancha del tanque', barrio: 'Atahualpa', delegado: 'el Chueco Lamas' },
  'Barrio Norte': { cancha: 'La placita de Barrio Norte', barrio: 'Aires Puros', delegado: 'el Pity Saravia' },
  'Los Primos': { cancha: 'Cancha de la plaza de Malvín Norte', barrio: 'Malvín Norte', delegado: 'el Primo Nacho' },
  'El Túnel': { cancha: 'Cancha de abajo del puente', barrio: 'Tres Cruces', delegado: 'el Cholo Benítez' },

  // ---------- Liga Montevideo · Divisional F (segundo equipo) ----------
  'Deportivo La Comercial': { cancha: 'Gimnasio de La Comercial', barrio: 'La Comercial', delegado: 'el Gaucho Pereira' },
  'Malvín Chico': { cancha: 'Cancha de la plaza de Malvín', barrio: 'Malvín', delegado: 'Nico Fagúndez' },
  'La Teja Basket': { cancha: 'Gimnasio de La Teja', barrio: 'La Teja', delegado: 'el Pampa Sosa' },
  'La Blanqueada Basket': { cancha: 'Club de la Blanqueada', barrio: 'La Blanqueada', delegado: 'Fede Méndez' },
  'Ferro del Oeste': { cancha: 'Cancha de la estación', barrio: 'Paso de la Arena', delegado: 'el Ferroviario Cardozo' },
  'Cordón Norte': { cancha: 'Gimnasio del liceo del Cordón', barrio: 'Cordón', delegado: 'Mati Rodríguez' },
  'Brazo Oriental': { cancha: 'Plaza de deportes N° 9', barrio: 'Brazo Oriental', delegado: 'el Oriental Gómez' },

  // ---------- Liga +35 · Divisional C (segundo equipo) ----------
  'Veteranos de Malvín': { cancha: 'Gimnasio de Malvín', barrio: 'Malvín', delegado: 'el Viejo Castro' },
  'Old Boys del Prado': { cancha: 'Gimnasio del Prado', barrio: 'Prado', delegado: 'Mister Peralta' },
  'Amigos del Círculo': { cancha: 'Gimnasio del Círculo', barrio: 'Pocitos', delegado: 'Jorge Morales' },
  'Maracaná Seniors': { cancha: 'Gimnasio del estadio', barrio: 'Parque Batlle', delegado: 'el Maestro Larriera' },
  'Los Notables': { cancha: 'Quincho de Los Notables', barrio: 'Carrasco', delegado: 'el Doctor Alonso' },
  'Peñarol de la Mesa 5': { cancha: 'Cancha de atrás del bar', barrio: 'Goes', delegado: 'el de la Mesa 5' },
  'El Resto del Mundo': { cancha: 'Gimnasio de la Ciudad Vieja', barrio: 'Ciudad Vieja', delegado: 'el Ruso Blanco' },
};

export function loreOf(clubName: string): ClubLore | undefined {
  return CLUB_LORE[clubName];
}

/**
 * La cancha de un club que no está en la tabla (un nombre nuevo, o uno que
 * algún día cambie): con el nombre entero, como la del club de la Carrera.
 */
export function venueNameFor(clubName: string): string {
  return loreOf(clubName)?.cancha ?? `Cancha de ${clubName}`;
}
