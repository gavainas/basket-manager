// La cara de cada club del mundo, escrita a mano e indexada por NOMBRE (la
// identidad de un club viaja con el nombre, no con el slot: ver
// design/LIGAS.md). Antes la cancha se armaba con la última palabra del
// nombre ("Gimnasio de Curva", "Gimnasio de 5"), el barrio salía del hash y
// Deportivo Capurro podía jugar en Pocitos, y diez delegados se repartían
// 75 clubes. Ahora cada club tiene su cancha, vive en el barrio que dice su
// nombre, tiene un delegado que no es el de nadie más, una frase que es lo
// que se dice de él en la liga, y dos rasgos de una lista cerrada.
//
// Sesiones 1 y 2 de design/MUNDO_REVISION_2026-10.md. Los rasgos son texto
// (se ven en la ficha); que `tribuna_brava` sume localía o `siempre_seis`
// baje la convocatoria rival es la sesión que sigue, y para eso están acá
// como claves y no como frases sueltas.
//
// El registro del humor va por liga (ver la revisión): institucional en la
// Universitaria A y B, de oficina en el Centro, de barrio en el Comercio y
// en la C y la D, y el juego de palabras entra en la Plaza, la +35 y la
// Montevideo F, que es donde los equipos de amigos se ponen el nombre que
// quieren. El chiste va en el nombre, nunca en el escudo ni en los colores.

export type Rasgo =
  | 'cancha_chica'
  | 'tribuna_brava'
  | 'delegado_pesado'
  | 'siempre_seis'
  | 'agua_fria'
  | 'planilla_tarde'
  | 'cantina'
  | 'de_traje'
  | 'vestuario_compartido'
  | 'cancha_abierta'
  | 'tercer_tiempo'
  | 'aro_torcido'
  | 'llegan_tarde'
  | 'nunca_faltan'
  | 'dt_nuevo'
  | 'pibes'
  | 'historico'
  | 'piso_resbaloso'
  | 'tablero_viejo';

/** Cada rasgo con su nombre corto y lo que significa en la cancha. */
export const RASGOS: Record<Rasgo, { label: string; desc: string }> = {
  cancha_chica: { label: 'Cancha chica', desc: 'un aro está a un metro de la pared: los tiradores sufren' },
  tribuna_brava: { label: 'Tribuna brava', desc: 'van las familias y los vecinos, y se hacen sentir' },
  delegado_pesado: { label: 'Delegado pesado', desc: 'discute el horario, la planilla y hasta el color de la camiseta' },
  siempre_seis: { label: 'Siempre seis', desc: 'nunca juntan banco: con dos faltas ya están contando' },
  agua_fria: { label: 'Agua fría', desc: 'el vestuario tiene ducha, pero caliente no' },
  planilla_tarde: { label: 'Planilla tarde', desc: 'el árbitro espera diez minutos la planilla, todos los partidos' },
  cantina: { label: 'Cantina', desc: 'hay cantina con chorizos: el tercer tiempo se hace ahí' },
  de_traje: { label: 'Van de traje', desc: 'al sorteo del fixture van de saco, y en la cancha también lo parecen' },
  vestuario_compartido: { label: 'Vestuario compartido', desc: 'un solo vestuario para los dos: la charla técnica se escucha' },
  cancha_abierta: { label: 'Cancha abierta', desc: 'sin techo: con lluvia se suspende y con viento el triple es lotería' },
  tercer_tiempo: { label: 'Tercer tiempo', desc: 'ganen o pierdan, después se come un asado, y lo ponen ellos' },
  aro_torcido: { label: 'Aro torcido', desc: 'un aro está medio flojo y ellos ya saben por dónde entra' },
  llegan_tarde: { label: 'Llegan tarde', desc: 'el partido arranca con cuatro y van cayendo' },
  nunca_faltan: { label: 'Nunca faltan', desc: 'once en la planilla todos los partidos, haga lo que haga la ciudad' },
  dt_nuevo: { label: 'DT nuevo cada año', desc: 'cambian de técnico todos los veranos; el sistema, nunca' },
  pibes: { label: 'Puros pibes', desc: 'el más viejo tiene veintitrés: corren todo y no saben perder tiempo' },
  historico: { label: 'Club histórico', desc: 'con sede, vitrinas y un presidente que jugó en los setenta' },
  piso_resbaloso: { label: 'Piso resbaloso', desc: 'el parquet está encerado de más: los corredores patinan' },
  tablero_viejo: { label: 'Tablero viejo', desc: 'tableros de madera: los tiros de tabla no vuelven igual' },
};

export interface ClubLore {
  /** El nombre de la cancha, como lo dice la gente de la liga. */
  cancha: string;
  /** El barrio donde está la cancha (coherente con el nombre del club). */
  barrio: string;
  /** Quien lleva la planilla y discute los horarios. Único en todo el mundo. */
  delegado: string;
  /** Lo que se dice del club en la liga: una o dos frases. */
  blurb: string;
  /** Dos rasgos de la lista cerrada, los que se ven en la ficha. */
  rasgos: Rasgo[];
}

export const CLUB_LORE: Record<string, ClubLore> = {
  // ---------- Liga Universitaria · Divisional A ----------
  'Náutico del Cerro': {
    cancha: 'Gimnasio del Náutico', barrio: 'Villa del Cerro', delegado: 'el Capitán Bentancur',
    blurb: 'El único gimnasio de la liga con agua caliente, y lo saben. Al sorteo del fixture van de saco y corbata, con el escudo bordado.',
    rasgos: ['de_traje', 'historico'],
  },
  'Atlético Progreso': {
    cancha: 'Estadio cerrado Progreso', barrio: 'La Teja', delegado: 'Don Hugo Larrosa',
    blurb: 'Le dicen estadio a un galpón con tribuna de cemento, pero la tribuna se llena. Don Hugo lleva la planilla desde antes de que existiera la planilla.',
    rasgos: ['tribuna_brava', 'historico'],
  },
  'Defensor del Prado': {
    cancha: 'Gimnasio Defensor', barrio: 'Prado', delegado: 'el Ingeniero Carámbula',
    blurb: 'Juegan ordenados porque el Ingeniero les hace la planilla en una hoja de cálculo. Nunca pierden por más de diez: antes se defienden hasta el minuto cuarenta.',
    rasgos: ['nunca_faltan', 'piso_resbaloso'],
  },
  'Olimpia del Oeste': {
    cancha: 'Polideportivo Olimpia', barrio: 'Paso de la Arena', delegado: 'el Vasco Goyeneche',
    blurb: 'Cancha municipal grande, con cartel luminoso que marca la hora mal. Cambian de DT todos los veranos y juegan igual que el verano anterior.',
    rasgos: ['dt_nuevo', 'tribuna_brava'],
  },
  'Racing de la Villa': {
    cancha: 'Gimnasio Racing', barrio: 'Villa Dolores', delegado: 'Quique Bergara',
    blurb: 'Tiradores de los que no miran la pelota entrar. Quique discute cada fallo con el reglamento abierto en el celular.',
    rasgos: ['delegado_pesado', 'tablero_viejo'],
  },
  'Sportivo Artigas': {
    cancha: 'Sede social Sportivo Artigas', barrio: 'Jacinto Vera', delegado: 'Doña Esther Píriz',
    blurb: 'La sede tiene salón de fiestas, y a veces el partido se juega con un cumpleaños de quince del otro lado de la pared. Doña Esther cobra la entrada en una lata.',
    rasgos: ['historico', 'cantina'],
  },
  'Estrella del Sur': {
    cancha: 'Gimnasio de la Estrella', barrio: 'Barrio Sur', delegado: 'el Tano Mautone',
    blurb: 'Corren todo el partido y el vestuario se escucha desde la calle. Los jueves de febrero no juegan: en el barrio hay otra cosa.',
    rasgos: ['tribuna_brava', 'vestuario_compartido'],
  },
  'Unión del Puerto': {
    cancha: 'Gimnasio del Puerto', barrio: 'Ciudad Vieja', delegado: 'el Gallego Da Rosa',
    blurb: 'Gimnasio de techo alto entre dos depósitos; cuando entra un barco se siente la bocina. Juegan a lo grande y pierden a lo grande.',
    rasgos: ['agua_fria', 'cancha_chica'],
  },
  'Colón Basket': {
    cancha: 'Gimnasio Colón', barrio: 'Colón', delegado: 'Beto Lorenzo',
    blurb: 'El club serio de Colón, que no quiere que lo confundan con los Bomberos. Tiradores de madrugada: entrenan a las siete de la mañana.',
    rasgos: ['nunca_faltan', 'historico'],
  },
  'Litoral del Norte': {
    cancha: 'Gimnasio Litoral', barrio: 'Lezica', delegado: 'el Canario Rondán',
    blurb: 'Medio plantel viene del interior y se nota en la pintura: pívots de 1,98 que juegan al fútbol los domingos. El Canario trae chorizos de Paysandú.',
    rasgos: ['cantina', 'llegan_tarde'],
  },

  // ---------- Liga Universitaria · Divisional B ----------
  'Deportivo La Curva': {
    cancha: 'Cancha de La Curva', barrio: 'Curva de Maroñas', delegado: 'el Ruso Nikitin',
    blurb: 'La cancha es un galpón con tribuna de tablones y un aro que entra solo. Equilibrados: no hacen nada mal y nada bien.',
    rasgos: ['aro_torcido', 'tribuna_brava'],
  },
  'Unión Vecinal': {
    cancha: 'Salón de la Unión Vecinal', barrio: 'Unión', delegado: 'Doña Marta',
    blurb: 'Juegan en el salón de la comisión vecinal, con las sillas apiladas contra la pared. Doña Marta no deja empezar sin que estén las dos planillas.',
    rasgos: ['cancha_chica', 'planilla_tarde'],
  },
  'Ferro del Norte': {
    cancha: 'Gimnasio Ferro', barrio: 'Peñarol', delegado: 'el Flaco Umpiérrez',
    blurb: 'El club del barrio de los ferroviarios: un gimnasio atrás de la estación, con el tren pasando en el entretiempo. Corren como si lo fueran a perder.',
    rasgos: ['historico', 'agua_fria'],
  },
  'Los Cardales': {
    cancha: 'Quincho techado de Los Cardales', barrio: 'Carrasco Norte', delegado: 'Cacho Silveira',
    blurb: 'Juegan en el quincho de un socio, con la parrilla a cinco metros de la línea de fondo. Después del partido se come, ganen o pierdan.',
    rasgos: ['tercer_tiempo', 'cancha_abierta'],
  },
  'Bohemios del Parque': {
    cancha: 'Gimnasio Bohemios', barrio: 'Parque Rodó', delegado: 'el Profe Núñez',
    blurb: 'Club de los que juegan bien y entrenan poco. El Profe les hace la charla técnica en la vereda, con un café en la mano.',
    rasgos: ['llegan_tarde', 'tablero_viejo'],
  },
  'Cilindro Viejo': {
    cancha: 'Cancha del Cilindro Viejo', barrio: 'Larrañaga', delegado: 'Beto Cardoso',
    blurb: 'Se fundaron el año que se cayó el Cilindro, a tres cuadras, y se pusieron el nombre de luto. Internos pesados y un vestuario que huele a linimento.',
    rasgos: ['historico', 'siempre_seis'],
  },
  'La Terminal': {
    cancha: 'Gimnasio de la Terminal', barrio: 'Tres Cruces', delegado: 'la Colo Fernández',
    blurb: 'Atrás de la terminal de ómnibus: medio plantel llega en el 21 y el otro medio del interior, en el de las siete. Corren todo lo que no corren en el trabajo.',
    rasgos: ['llegan_tarde', 'nunca_faltan'],
  },
  'Halcones de la Costa': {
    cancha: 'Complejo Halcones', barrio: 'Punta Gorda', delegado: 'el Vasco Aguirre',
    blurb: 'Complejo con dos canchas, estacionamiento y un cartel con el halcón. Tiradores que practican desde la esquina hasta que el canchero apaga las luces.',
    rasgos: ['de_traje', 'piso_resbaloso'],
  },
  'Círculo Sportivo': {
    cancha: 'Gimnasio del Círculo', barrio: 'Pocitos', delegado: 'Tito Barrios',
    blurb: 'El club con más vitrinas de la B y el único que paga DT. Tito te saluda de corbata y te discute la planilla igual.',
    rasgos: ['historico', 'delegado_pesado'],
  },

  // ---------- Liga Universitaria · Divisional C ----------
  'Rampla del Molino': {
    cancha: 'Gimnasio Rampla', barrio: 'Paso Molino', delegado: 'el Pelado Sosa',
    blurb: 'Internos de Paso Molino que juegan a los codos y piden perdón después. El gimnasio tiene una sola ducha y la fila la ordena el Pelado.',
    rasgos: ['agua_fria', 'vestuario_compartido'],
  },
  'Atlético Reducto': {
    cancha: 'Cancha del Reducto', barrio: 'Reducto', delegado: 'Pocho Cuello',
    blurb: 'Un galpón con tablero de madera y un reloj de pared que atrasa. Pocho lleva la planilla a lápiz y la pasa en limpio después.',
    rasgos: ['tablero_viejo', 'planilla_tarde'],
  },
  'Deportivo Capurro': {
    cancha: 'Gimnasio Capurro', barrio: 'Capurro', delegado: 'el Polaco Luzardo',
    blurb: 'Corredores de la bajada: salen en contra antes de que la pelota pase el aro. Tienen cantina con tortas fritas los miércoles.',
    rasgos: ['cantina', 'pibes'],
  },
  'Belvedere Basket': {
    cancha: 'Plaza de deportes de Belvedere', barrio: 'Belvedere', delegado: 'Chiche Amaral',
    blurb: 'Juegan en la plaza de deportes, con tribuna de cemento y las familias con reposera. Chiche grita más que el DT.',
    rasgos: ['tribuna_brava', 'cancha_abierta'],
  },
  'Juventud del Paso': {
    cancha: 'Gimnasio Juventud', barrio: 'Paso de las Duranas', delegado: 'el Nene Tejera',
    blurb: 'Se llaman Juventud desde 1961 y el promedio de edad lo sostiene el delegado. Equilibrados y pacientes: juegan los cuarenta minutos iguales.',
    rasgos: ['historico', 'nunca_faltan'],
  },
  'Nuevo París Basket': {
    cancha: 'Gimnasio de Nuevo París', barrio: 'Nuevo París', delegado: 'Coco Pintos',
    blurb: 'Pívots grandes de barrio y un gimnasio con un aro que entra más de lo que debería. Coco pide siempre el mismo lado para el segundo tiempo.',
    rasgos: ['aro_torcido', 'siempre_seis'],
  },
  'Los Yuyos del Buceo': {
    cancha: 'Cancha de Los Yuyos', barrio: 'Buceo', delegado: 'el Bocha Rocha',
    blurb: 'La cancha estaba llena de yuyos cuando la encontraron y la limpiaron ellos. Corren todo el partido porque es abierta y en invierno hace frío.',
    rasgos: ['cancha_abierta', 'tercer_tiempo'],
  },
  'Unión Sayago': {
    cancha: 'Gimnasio de la Unión Sayago', barrio: 'Sayago', delegado: 'Doña Nelly Perdomo',
    blurb: 'Tiradores de barrio con un gimnasio chico y una tribuna de vecinos que conoce a todos por el nombre. Doña Nelly vende rifas en el entretiempo.',
    rasgos: ['cancha_chica', 'tribuna_brava'],
  },
  'Estrella de Piedras Blancas': {
    cancha: 'Gimnasio Estrella', barrio: 'Piedras Blancas', delegado: 'Toto Curbelo',
    blurb: 'El club más lejano de la liga: los rivales llegan tarde y ellos lo saben. Equilibrados, pacientes y con mate en el banco.',
    rasgos: ['llegan_tarde', 'cantina'],
  },
  'Sportivo Aguada Chico': {
    cancha: 'Galpón de Aguada Chico', barrio: 'Aguada', delegado: 'el Chino Britos',
    blurb: 'Se pusieron Chico para que nadie los confunda con el grande, y el galpón ayuda. Internos duros: el aro de la derecha está pegado a la pared.',
    rasgos: ['cancha_chica', 'agua_fria'],
  },

  // ---------- Liga Universitaria · Divisional D ----------
  'Villa Española Basket': {
    cancha: 'Plaza de deportes N° 2', barrio: 'Villa Española', delegado: 'el Gordo Olivera',
    blurb: 'El mejor de la D hace tres años, y todavía en la D. El Gordo dice que es por los árbitros; el resto de la liga dice que es por el Gordo.',
    rasgos: ['delegado_pesado', 'tribuna_brava'],
  },
  'Atlético Manga': {
    cancha: 'Cancha de Manga', barrio: 'Manga', delegado: 'Tata Acosta',
    blurb: 'Pívots de Manga que juegan al básquet como si fuera rugby. Después del partido hay asado, y si ganaron, chorizos de más.',
    rasgos: ['tercer_tiempo', 'siempre_seis'],
  },
  'Los Bomberos de Colón': {
    cancha: 'Gimnasio del Cuartel de Colón', barrio: 'Colón', delegado: 'el Sargento Camejo',
    blurb: 'Juegan en el gimnasio del cuartel y si suena la alarma se suspende. Corren como si fueran a un incendio y a veces faltan dos por una guardia.',
    rasgos: ['nunca_faltan', 'cancha_chica'],
  },
  'Deportivo Casavalle': {
    cancha: 'Polideportivo de Casavalle', barrio: 'Casavalle', delegado: 'la Tía Gladys',
    blurb: 'Tiradores jóvenes de un polideportivo nuevo, con piso que todavía brilla. La Tía Gladys les cose los números y les cobra la ficha de a dos pesos.',
    rasgos: ['pibes', 'piso_resbaloso'],
  },
  'La Cachimba': {
    cancha: 'Cancha de la Cachimba', barrio: 'Cerrito de la Victoria', delegado: 'el Loco Viera',
    blurb: 'Nadie sabe por qué se llaman así y el Loco cuenta una versión distinta cada vez. Equilibrados: pierden ajustado contra todos.',
    rasgos: ['cancha_abierta', 'aro_torcido'],
  },
  'Punta de Rieles Basket': {
    cancha: 'Gimnasio de Punta de Rieles', barrio: 'Punta de Rieles', delegado: 'Goyo Machado',
    blurb: 'Internos de barrio con un gimnasio prestado por el liceo, que lo cierra a las once en punto. Goyo discute los últimos minutos con el sereno.',
    rasgos: ['planilla_tarde', 'tablero_viejo'],
  },
  'El Monarca': {
    cancha: 'Galpón del Monarca', barrio: 'Bella Italia', delegado: 'el Pato Lemos',
    blurb: 'El nombre era de un bar que cerró y el galpón quedó. Corren mucho y marcan poco; el Pato dice que es un estilo.',
    rasgos: ['vestuario_compartido', 'llegan_tarde'],
  },
  'Barrio Borro Basket': {
    cancha: 'Cancha del Borro', barrio: 'Marconi', delegado: 'Lalo Cal',
    blurb: 'Tiradores de la cancha del Borro, con tribuna de vecinos que pasan la gorra para el ómnibus de vuelta. Lalo juega, dirige y lleva la planilla.',
    rasgos: ['tribuna_brava', 'siempre_seis'],
  },
  'Los Últimos de Filipinas': {
    cancha: 'Cancha del fondo', barrio: 'Santiago Vázquez', delegado: 'el Cabezón Methol',
    blurb: 'Once años en la D y ni una queja. Celebran el descenso que no pasó como si fuera un título, y la cancha queda donde termina el ómnibus.',
    rasgos: ['cancha_abierta', 'tercer_tiempo'],
  },
  'Deportivo Maroñas': {
    cancha: 'Gimnasio de Maroñas', barrio: 'Maroñas', delegado: 'Tincho Pereyra',
    blurb: 'Internos lentos que juegan atrás del hipódromo, con el relato de las carreras de fondo. El último de la tabla todos los años, sin drama.',
    rasgos: ['agua_fria', 'llegan_tarde'],
  },

  // ---------- Liga del Centro · Primera ----------
  'Ciudad Vieja Basket': {
    cancha: 'Gimnasio del Mercado', barrio: 'Ciudad Vieja', delegado: 'el Doctor Varela',
    blurb: 'El campeón de la nocturna, con ex federados en cada puesto y un DT que cobra. Tiradores de los que practican el tiro libre con los ojos cerrados.',
    rasgos: ['de_traje', 'nunca_faltan'],
  },
  'Los Bancarios': {
    cancha: 'Gimnasio del Club Bancario', barrio: 'Centro', delegado: 'Gerardo Bentancor',
    blurb: 'Juegan a las once de la noche porque a las seis cierran la caja. Pívots con panza y muñeca, y un gimnasio con alfombra en el pasillo.',
    rasgos: ['historico', 'de_traje'],
  },
  'Escribanía Rossi': {
    cancha: 'Gimnasio del Colegio', barrio: 'Cordón', delegado: 'la Escribana Rossi',
    blurb: 'La escribana puso el nombre, el gimnasio y la plata; los jugadores son los pasantes. Equilibrados y puntuales: llegan con la firma certificada.',
    rasgos: ['nunca_faltan', 'planilla_tarde'],
  },
  'Los Médicos del Clínicas': {
    cancha: 'Gimnasio del Hospital', barrio: 'Parque Batlle', delegado: 'el Doctor Ferreira',
    blurb: 'Corredores de guardia: a veces juegan después de treinta y seis horas despiertos y a veces por eso ganan. Si uno se lesiona, lo atienden ahí.',
    rasgos: ['llegan_tarde', 'vestuario_compartido'],
  },
  'Estudio Contable Pereira': {
    cancha: 'Gimnasio de la Mutualista', barrio: 'Centro', delegado: 'el Contador Pereira',
    blurb: 'Tiradores que llevan la estadística de cada partido en una planilla y te la mandan por mail. El Contador cobra la ficha con recibo.',
    rasgos: ['delegado_pesado', 'de_traje'],
  },
  'Aduana Basket': {
    cancha: 'Gimnasio de la Aduana', barrio: 'Aguada', delegado: 'el Turco Sapelli',
    blurb: 'Internos pesados del puerto, con un gimnasio que huele a container. Revisan la planilla rival como si fuera un contenedor sospechoso.',
    rasgos: ['delegado_pesado', 'agua_fria'],
  },
  'Los Ingenieros': {
    cancha: 'Gimnasio de la Facultad', barrio: 'Parque Rodó', delegado: 'el Ingeniero Píriz',
    blurb: 'Equilibrados por diseño: tienen un sistema para cada defensa y una hoja de cálculo para cada sistema. Pierden cuando el rival no lee la hoja.',
    rasgos: ['nunca_faltan', 'piso_resbaloso'],
  },
  'Torre Ejecutiva': {
    cancha: 'Polideportivo del Ministerio', barrio: 'Centro', delegado: 'Licenciada Ramos',
    blurb: 'Funcionarios que juegan en el polideportivo de un ministerio, con credencial para entrar. Corren hasta las diez y media; después hay que entregar la cancha.',
    rasgos: ['de_traje', 'cancha_chica'],
  },
  'Sindicato del Puerto': {
    cancha: 'Gimnasio del Sindicato', barrio: 'Ciudad Vieja', delegado: 'el Moncho Sosa',
    blurb: 'Tiradores de brazo largo y tribuna con bombo. Si hay paro, no hay partido, y el Moncho avisa con la planilla en la mano.',
    rasgos: ['tribuna_brava', 'cantina'],
  },
  'Nocturno del Centro': {
    cancha: 'Gimnasio del Liceo Nocturno', barrio: 'Centro', delegado: 'el Profe Machado',
    blurb: 'El equipo del liceo nocturno: profesores y ex alumnos que juegan cuando termina la última clase. Equilibrados, cansados y buenos.',
    rasgos: ['llegan_tarde', 'tablero_viejo'],
  },

  // ---------- Liga del Centro · Segunda ----------
  'Los Taxistas': {
    cancha: 'Gimnasio del Gremio', barrio: 'Goes', delegado: 'el Yoni Cabrera',
    blurb: 'Corredores que conocen todos los atajos de la ciudad y ninguno de la cancha. Llegan todos a la vez, en cuatro taxis, y se van discutiendo la tarifa.',
    rasgos: ['nunca_faltan', 'tercer_tiempo'],
  },
  'Farmacia Central': {
    cancha: 'Gimnasio del Centro de Farmacias', barrio: 'Cordón', delegado: 'la Farmacéutica Duarte',
    blurb: 'Tiradores de turno: juegan los que no están de guardia esa noche. Tienen el mejor botiquín de la liga y lo prestan.',
    rasgos: ['siempre_seis', 'de_traje'],
  },
  'Gremio del Cordón': {
    cancha: 'Salón del Gremio', barrio: 'Cordón', delegado: 'el Flaco Rivero',
    blurb: 'Internos duros que juegan en el salón de actos del gremio, con el escenario a un costado. Las asambleas de la liga las ganan ellos.',
    rasgos: ['cancha_chica', 'delegado_pesado'],
  },
  'Los Fiscales': {
    cancha: 'Gimnasio de la Fiscalía', barrio: 'Centro', delegado: 'Doctor Olivera',
    blurb: 'Equilibrados y litigiosos: apelan los fallos por escrito al día siguiente. El Doctor Olivera tiene el reglamento subrayado.',
    rasgos: ['delegado_pesado', 'planilla_tarde'],
  },
  'Imprenta La Nocturna': {
    cancha: 'Galpón de la Imprenta', barrio: 'Barrio Sur', delegado: 'Pepe Batista',
    blurb: 'Juegan en el galpón de la imprenta, entre rollos de papel, con olor a tinta. Tiradores con manos manchadas y un tablero que imprimieron ellos.',
    rasgos: ['tablero_viejo', 'vestuario_compartido'],
  },
  'Mutualista Basket': {
    cancha: 'Gimnasio de la Mutualista', barrio: 'Tres Cruces', delegado: 'la Enfermera Correa',
    blurb: 'Enfermeros y administrativos que juegan en el gimnasio de rehabilitación. Internos pacientes: ponen el cuerpo como quien levanta un paciente.',
    rasgos: ['agua_fria', 'nunca_faltan'],
  },
  'Los Peritos': {
    cancha: 'Gimnasio del Juzgado', barrio: 'Palermo', delegado: 'el Perito Godín',
    blurb: 'Corredores que miden todo: la distancia de la línea de tres, el tiempo del reloj, la altura del aro. Una vez pidieron que se midiera el aro y tenían razón.',
    rasgos: ['delegado_pesado', 'piso_resbaloso'],
  },
  'Tribunales Basket': {
    cancha: 'Gimnasio de Tribunales', barrio: 'Centro', delegado: 'Doctora Sanguinetti',
    blurb: 'Abogados equilibrados que juegan de traje hasta el entretiempo, se cambian y vuelven de traje. Nadie les discute un fallo: lo pierde.',
    rasgos: ['de_traje', 'historico'],
  },
  'Turno Noche': {
    cancha: 'Gimnasio del Hospital Nocturno', barrio: 'Aguada', delegado: 'el Nocturno Bermúdez',
    blurb: 'Tiradores del turno de la noche: entran a las once a la cancha y a la una al trabajo. Nunca van a jugar un partido de día en su vida.',
    rasgos: ['llegan_tarde', 'siempre_seis'],
  },

  // ---------- Liga del Comercio ----------
  'Ferretería El Tornillo': {
    cancha: 'Cancha de atrás de la ferretería', barrio: 'La Blanqueada', delegado: 'Don Aldo',
    blurb: 'Internos de la ferretería: Don Aldo, los dos hijos y los que compran fiado. Los aros los arregló él y entran los dos, pero distinto.',
    rasgos: ['aro_torcido', 'cantina'],
  },
  'Panadería Los Hornos': {
    cancha: 'Cancha de la parroquia', barrio: 'Unión', delegado: 'el Panadero Suárez',
    blurb: 'Tiradores que entran a las cuatro de la mañana a la panadería y juegan a las diez de un domingo con olor a bizcochos. Traen una bolsa para el tercer tiempo.',
    rasgos: ['tercer_tiempo', 'tablero_viejo'],
  },
  'Autoservice Doña Chela': {
    cancha: 'Plaza de deportes N° 7', barrio: 'Jacinto Vera', delegado: 'Doña Chela',
    blurb: 'Doña Chela no juega, pero elige el quinteto desde la tribuna y nadie la contradice. Equilibrados porque ella lo dice.',
    rasgos: ['tribuna_brava', 'cancha_abierta'],
  },
  'Carnicería El Novillo': {
    cancha: 'Cancha del Novillo', barrio: 'Villa Dolores', delegado: 'el Carnicero Tabeira',
    blurb: 'Internos de la carnicería, con brazos de levantar media res y un asado después del partido que es el mejor de la liga. Lo ponen ellos.',
    rasgos: ['tercer_tiempo', 'siempre_seis'],
  },
  'Bar El Refuerzo': {
    cancha: 'Cancha del fondo del bar', barrio: 'Larrañaga', delegado: 'el Gringo Pastorini',
    blurb: 'Corredores del bar: juegan en la cancha del fondo y el tercer tiempo es en la barra, con el partido de la tele de fondo. Faltan los que abrieron el sábado.',
    rasgos: ['cantina', 'llegan_tarde'],
  },
  'Óptica Mirasol': {
    cancha: 'Gimnasio del liceo', barrio: 'Tres Cruces', delegado: 'la Dueña de la Óptica',
    blurb: 'Tiradores que ven bien, dicen, y un delegado que ofrece un descuento en lentes a cada árbitro. Hasta ahora ninguno aceptó.',
    rasgos: ['de_traje', 'cancha_chica'],
  },
  'Taller Don Nino': {
    cancha: 'Galpón del taller', barrio: 'La Blanqueada', delegado: 'Don Nino',
    blurb: 'Juegan en el galpón del taller, con los autos corridos contra la pared y un aro colgado del portón. Don Nino tiene setenta y dos y entra cinco minutos.',
    rasgos: ['cancha_chica', 'vestuario_compartido'],
  },

  // ---------- Liga de la Plaza ----------
  'La Amistad': {
    cancha: 'Cancha abierta de la plaza', barrio: 'Parque Batlle', delegado: 'el Pelusa Giménez',
    blurb: 'El equipo que fundó la liga de la plaza y el único que llega siempre con once. Equilibrados de verdad: todos juegan lo mismo y nadie protesta.',
    rasgos: ['nunca_faltan', 'cancha_abierta'],
  },
  'Chucarro Bulls': {
    cancha: 'Cancha de la plaza del Cerrito', barrio: 'Cerrito de la Victoria', delegado: 'Checho Larrosa',
    blurb: 'Corren como toros y piensan como toros. Tienen una camiseta roja que compraron por internet y un pívot que no entra en ella.',
    rasgos: ['pibes', 'tribuna_brava'],
  },
  'Los de Siempre': {
    cancha: 'La plaza de la Unión', barrio: 'Unión', delegado: 'el Tola Fonseca',
    blurb: 'Juegan juntos desde el liceo y ya nadie recuerda quién invitó a quién. Internos lentos que se pasan la pelota sin mirar.',
    rasgos: ['tercer_tiempo', 'llegan_tarde'],
  },
  'El Galpón': {
    cancha: 'El Galpón', barrio: 'La Blanqueada', delegado: 'el Petiso Álvez',
    blurb: 'El galpón es de un tío del Petiso y lo prestan los sábados. Tiene techo, que en esta liga es un lujo, y un aro que entra solo.',
    rasgos: ['aro_torcido', 'cancha_chica'],
  },
  'Deben Nuggets': {
    cancha: 'Cancha de la plaza de Cordón', barrio: 'Cordón', delegado: 'Doña Nilda',
    blurb: 'Deben la ficha, deben las camisetas y deben una ronda del año pasado. Tiradores de los que piden la pelota y después piden disculpas.',
    rasgos: ['planilla_tarde', 'siempre_seis'],
  },
  'Peluquería Clippers': {
    cancha: 'Cancha del tanque', barrio: 'Atahualpa', delegado: 'el Chueco Lamas',
    blurb: 'El peluquero puso el nombre, las camisetas y el corte obligatorio. Internos prolijos: el más desprolijo tiene la raya al costado.',
    rasgos: ['de_traje', 'cancha_abierta'],
  },
  'Lakers del Parque Rodó': {
    cancha: 'Cancha de atrás del lago', barrio: 'Parque Rodó', delegado: 'el Pity Saravia',
    blurb: 'Se llaman así porque la cancha da al lago del parque, y porque uno tenía la camiseta. Corren bien y tiran mal, y la pelota termina en el agua una vez por fecha.',
    rasgos: ['cancha_abierta', 'pibes'],
  },
  'Mala Fe Mavericks': {
    cancha: 'Cancha de la plaza de Malvín Norte', barrio: 'Malvín Norte', delegado: 'el Primo Nacho',
    blurb: 'Tiradores que discuten cada falta como si fuera un juicio y cobran todas las que no son. El Primo Nacho lleva una planilla paralela.',
    rasgos: ['delegado_pesado', 'aro_torcido'],
  },
  'Mañana Confirmo': {
    cancha: 'Cancha de abajo del puente', barrio: 'Tres Cruces', delegado: 'el Cholo Benítez',
    blurb: 'Nadie confirma hasta el sábado a la una y el partido es a las cinco. Equilibrados cuando juntan cinco, que es una fecha de cada dos.',
    rasgos: ['siempre_seis', 'llegan_tarde'],
  },

  // ---------- Liga Montevideo · Divisional F (segundo equipo) ----------
  'Lobizones de Colón': {
    cancha: 'Cancha de la plaza de Colón', barrio: 'Colón', delegado: 'el Gaucho Pereira',
    blurb: 'Juegan los viernes de noche y dicen que con luna llena son otro equipo. Equilibrados de barrio, con un pívot que efectivamente parece otra cosa.',
    rasgos: ['tribuna_brava', 'tercer_tiempo'],
  },
  'Malvín Chico': {
    cancha: 'Cancha de la plaza de Malvín', barrio: 'Malvín', delegado: 'Nico Fagúndez',
    blurb: 'Tiradores de la plaza de Malvín, el equipo de los que no entraron en el grande. Juegan con bronca y con viento.',
    rasgos: ['cancha_abierta', 'pibes'],
  },
  'La Teja Basket': {
    cancha: 'Gimnasio de La Teja', barrio: 'La Teja', delegado: 'el Pampa Sosa',
    blurb: 'Corredores de La Teja con un gimnasio prestado por el club de fútbol, que les cobra en arreglos. El Pampa discute el horario con el canchero cada viernes.',
    rasgos: ['vestuario_compartido', 'tribuna_brava'],
  },
  'New York Nicos': {
    cancha: 'Club de la Blanqueada', barrio: 'La Blanqueada', delegado: 'Fede Méndez',
    blurb: 'Se llaman así porque son tres Nicolás, un Nico y un Nicky, y les pareció gracioso a las dos de la mañana. Internos jóvenes que se pasan la pelota por el nombre.',
    rasgos: ['pibes', 'planilla_tarde'],
  },
  'Toronto Raptores': {
    cancha: 'Cancha de la estación', barrio: 'Paso de la Arena', delegado: 'el Ferroviario Cardozo',
    blurb: 'Todos pibes de diecinueve que corren como dinosaurios de película. El Ferroviario es el padre de dos y el delegado de los siete.',
    rasgos: ['pibes', 'cancha_abierta'],
  },
  'Equipo Sin Nombre (Provisorio)': {
    cancha: 'Gimnasio del liceo del Cordón', barrio: 'Cordón', delegado: 'Mati Rodríguez',
    blurb: 'Se anotaron sin nombre para no pelearse y la liga puso "provisorio" hace cuatro años. Tiradores que todavía votan el nombre en el grupo.',
    rasgos: ['llegan_tarde', 'siempre_seis'],
  },
  'Brazo Oriental': {
    cancha: 'Plaza de deportes N° 9', barrio: 'Brazo Oriental', delegado: 'el Oriental Gómez',
    blurb: 'Corredores del barrio con una plaza de deportes que tiene cancha de cemento y tribuna de vecinos. El Oriental trae el mate y la planilla.',
    rasgos: ['cancha_abierta', 'nunca_faltan'],
  },

  // ---------- Liga +35 · Divisional C (segundo equipo) ----------
  'Veteranos de Malvín': {
    cancha: 'Gimnasio de Malvín', barrio: 'Malvín', delegado: 'el Viejo Castro',
    blurb: 'Internos con oficio que jugaron federado hace veinte años y todavía saben dónde pararse. Lentos para correr, rápidos para pensar.',
    rasgos: ['historico', 'tablero_viejo'],
  },
  'Fernet Bahçe': {
    cancha: 'Gimnasio del Prado', barrio: 'Prado', delegado: 'Mister Peralta',
    blurb: 'Tiradores de treinta y ocho que entran en calor con fernet y tiran mejor en el segundo tiempo. Mister Peralta dirige de saco y bufanda.',
    rasgos: ['tercer_tiempo', 'de_traje'],
  },
  'Maracaná Seniors': {
    cancha: 'Gimnasio del estadio', barrio: 'Parque Batlle', delegado: 'el Maestro Larriera',
    blurb: 'Equilibrados que se pusieron el nombre de la gesta y juegan cada partido como si fueran dos goles abajo. El Maestro habla poco y señala mucho.',
    rasgos: ['nunca_faltan', 'historico'],
  },
  'Los Meniscos': {
    cancha: 'Gimnasio del Círculo', barrio: 'Pocitos', delegado: 'Jorge Morales',
    blurb: 'Internos operados de una rodilla cada uno, que se vendan en el vestuario antes de entrar. Si ganan, es con tiros de tres; si pierden, con hielo.',
    rasgos: ['agua_fria', 'siempre_seis'],
  },
  'Ibuprofeno 600': {
    cancha: 'Quincho de Carrasco', barrio: 'Carrasco', delegado: 'el Doctor Alonso',
    blurb: 'Equilibrados de cuarenta y pico que se toman la pastilla a las siete y juegan a las ocho y media. El Doctor Alonso las receta y las reparte.',
    rasgos: ['tercer_tiempo', 'cancha_chica'],
  },
  'Peñarol de la Mesa 5': {
    cancha: 'Cancha de atrás del bar', barrio: 'Goes', delegado: 'el de la Mesa 5',
    blurb: 'Tiradores que se juntan en la mesa cinco de un bar de Goes desde 1998 y una vez decidieron anotarse. El delegado es el que paga la mesa.',
    rasgos: ['cantina', 'llegan_tarde'],
  },
  'El Resto del Mundo': {
    cancha: 'Gimnasio de la Ciudad Vieja', barrio: 'Ciudad Vieja', delegado: 'el Ruso Blanco',
    blurb: 'Corredores de más de treinta y cinco que no entraron en ningún otro equipo y se juntaron todos. Un ruso, dos canarios, un brasileño y un uruguayo que se cree inglés.',
    rasgos: ['siempre_seis', 'vestuario_compartido'],
  },
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
