import { BALANCE } from '../game/balance';
import { appearanceFromSeed } from '../game/appearance';
import { genAvailability } from '../game/world';
import type {
  DemandType,
  ExpectedRole,
  FeeAttitude,
  FeeStatus,
  KnowledgeLevel,
  MarketPlayer,
  Personality,
  Player,
  Position,
} from '../game/types';
import type { Rng } from '../game/rng';
import { rollBackground } from './backgrounds';

interface MarketSeed {
  name: string;
  age: number;
  height: number;
  position: Position;
  previousTeam: string;
  technique: number;
  physical: number;
  commitment: number;
  social: number;
  personality: Personality;
  sportRep: number;
  socialRep: number;
  signingCost: number;
  feeAttitude: FeeAttitude;
  demand: DemandType | null;
  knowledge: KnowledgeLevel;
  source: string;
}

/**
 * Pool de jugadores fichables. Cada pretemporada se sortea un subconjunto,
 * así el mercado cambia de temporada a temporada.
 */
const MARKET_SEEDS: MarketSeed[] = [
  // ---------- Bases ----------
  {
    name: 'Ramiro Sosa', age: 27, height: 178, position: 'Base', previousTeam: 'Unión Vecinal',
    technique: 68, physical: 74, commitment: 72, social: 60, personality: 'competitivo',
    sportRep: 62, socialRep: 60, signingCost: 60, feeAttitude: 'completa', demand: 'competitivo',
    knowledge: 'muy_conocido', source: 'Jugó varias veces contra tu club: lo sufriste de cerca.',
  },
  {
    name: '"Pela" Domínguez', age: 31, height: 175, position: 'Base', previousTeam: 'La Terminal',
    technique: 63, physical: 60, commitment: 80, social: 82, personality: 'veterano',
    sportRep: 55, socialRep: 78, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'conocido', source: 'Jugó en esta liga la temporada pasada.',
  },
  {
    name: 'Iván Correa', age: 22, height: 180, position: 'Base', previousTeam: 'Liga del Oeste',
    technique: 58, physical: 78, commitment: 65, social: 55, personality: 'protagonista',
    sportRep: 40, socialRep: 50, signingCost: 25, feeAttitude: 'completa', demand: 'minutos',
    knowledge: 'referencias', source: 'Un conocido del club dice que rinde, pero nadie lo vio de cerca.',
  },
  {
    name: 'Beto Cáceres', age: 35, height: 176, position: 'Base', previousTeam: 'Cilindro Viejo',
    technique: 60, physical: 45, commitment: 85, social: 88, personality: 'veterano',
    sportRep: 58, socialRep: 85, signingCost: 0, feeAttitude: 'completa', demand: 'sin_entrenar',
    knowledge: 'muy_conocido', source: 'Un clásico de la liga: hace diez años que lo ves jugar.',
  },
  {
    name: 'Tomi Aguirre', age: 20, height: 182, position: 'Base', previousTeam: 'Juveniles de Ferro del Norte',
    technique: 47, physical: 82, commitment: 78, social: 65, personality: 'cumplidor',
    sportRep: 25, socialRep: 55, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'poco_conocido', source: 'Apenas un par de datos sueltos: dicen que corre toda la cancha.',
  },
  {
    name: 'Walter Giménez', age: 29, height: 179, position: 'Base', previousTeam: 'Círculo Sportivo',
    technique: 74, physical: 70, commitment: 55, social: 45, personality: 'mercenario',
    sportRep: 75, socialRep: 40, signingCost: 110, feeAttitude: 'beca', demand: 'fichaje_pagado',
    knowledge: 'conocido', source: 'Fue figura del subcampeón: todos saben quién es.',
  },
  // ---------- Escoltas ----------
  {
    name: 'Nico Ferrari', age: 25, height: 186, position: 'Escolta', previousTeam: 'Bohemios del Parque',
    technique: 70, physical: 76, commitment: 68, social: 58, personality: 'competitivo',
    sportRep: 64, socialRep: 55, signingCost: 70, feeAttitude: 'completa', demand: 'titularidad',
    knowledge: 'muy_conocido', source: 'Te clavó 24 puntos el año pasado: lo conocés de memoria.',
  },
  {
    name: '"Zurdo" Peralta', age: 28, height: 184, position: 'Escolta', previousTeam: 'Los Cardales',
    technique: 65, physical: 72, commitment: 60, social: 70, personality: 'social',
    sportRep: 52, socialRep: 68, signingCost: 30, feeAttitude: 'parcial', demand: 'ambiente',
    knowledge: 'conocido', source: 'Compartió equipo con tu capitán en Los Cardales.',
  },
  {
    name: 'Facu Ledesma', age: 23, height: 188, position: 'Escolta', previousTeam: 'Liga de Empleados',
    technique: 72, physical: 80, commitment: 45, social: 50, personality: 'talentoso_informal',
    sportRep: 45, socialRep: 35, signingCost: 40, feeAttitude: 'parcial', demand: 'sin_entrenar',
    knowledge: 'referencias', source: 'Lo viste una vez en un amistoso: la rompió, pero llegó tarde.',
  },
  {
    name: 'Gastón Vila', age: 26, height: 185, position: 'Escolta', previousTeam: 'Club de su barrio',
    technique: 54, physical: 68, commitment: 82, social: 75, personality: 'cumplidor',
    sportRep: 30, socialRep: 65, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'referencias', source: 'Te lo recomendó el capitán: "es un soldado, no te va a fallar".',
  },
  {
    name: 'Emanuel Ruiz', age: 24, height: 187, position: 'Escolta', previousTeam: 'Se mudó de otra ciudad',
    technique: 66, physical: 74, commitment: 70, social: 60, personality: 'competitivo',
    sportRep: 20, socialRep: 45, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'desconocido', source: 'No tenés referencias confiables: recién llegado a la zona.',
  },
  {
    name: '"Chueco" Barrios', age: 33, height: 183, position: 'Escolta', previousTeam: 'Halcones de la Costa',
    technique: 61, physical: 55, commitment: 75, social: 80, personality: 'veterano',
    sportRep: 60, socialRep: 75, signingCost: 0, feeAttitude: 'completa', demand: 'amigo',
    knowledge: 'muy_conocido', source: 'Ídolo de la liga en su momento; siempre cruza saludos con tu banco.',
  },
  {
    name: 'Kevin Paiva', age: 21, height: 190, position: 'Escolta', previousTeam: 'Sin club',
    technique: 42, physical: 85, commitment: 60, social: 62, personality: 'social',
    sportRep: 15, socialRep: 50, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'poco_conocido', source: 'Dicen que salta como pocos, pero nunca jugó en serio.',
  },
  // ---------- Aleros ----------
  {
    name: 'Marcos Brítez', age: 27, height: 192, position: 'Alero', previousTeam: 'Círculo Sportivo',
    technique: 76, physical: 78, commitment: 58, social: 48, personality: 'protagonista',
    sportRep: 78, socialRep: 45, signingCost: 130, feeAttitude: 'beca', demand: 'titularidad',
    knowledge: 'muy_conocido', source: 'El mejor alero que enfrentaste en años: goleador del campeón.',
  },
  {
    name: 'Santi Olmos', age: 24, height: 190, position: 'Alero', previousTeam: 'Deportivo La Curva',
    technique: 62, physical: 75, commitment: 74, social: 68, personality: 'competitivo',
    sportRep: 48, socialRep: 62, signingCost: 35, feeAttitude: 'completa', demand: null,
    knowledge: 'conocido', source: 'Jugó en esta liga la temporada pasada.',
  },
  {
    name: '"Mono" Quiroga', age: 30, height: 193, position: 'Alero', previousTeam: 'Liga del Sur',
    technique: 69, physical: 66, commitment: 50, social: 55, personality: 'mercenario',
    sportRep: 55, socialRep: 42, signingCost: 80, feeAttitude: 'beca', demand: 'beca',
    knowledge: 'referencias', source: 'Llega con fama de resolver partidos… y de discutir con los DT.',
  },
  {
    name: 'Julián Paz', age: 22, height: 189, position: 'Alero', previousTeam: 'Universitario',
    technique: 56, physical: 80, commitment: 76, social: 72, personality: 'social',
    sportRep: 28, socialRep: 60, signingCost: 0, feeAttitude: 'completa', demand: 'ambiente',
    knowledge: 'referencias', source: 'Amigo de un amigo: "buen pibe, mete garra", te dijeron.',
  },
  {
    name: 'Óscar Toledo', age: 34, height: 191, position: 'Alero', previousTeam: 'Ferro del Norte',
    technique: 64, physical: 52, commitment: 80, social: 66, personality: 'veterano',
    sportRep: 57, socialRep: 70, signingCost: 0, feeAttitude: 'completa', demand: 'minutos',
    knowledge: 'muy_conocido', source: 'Años marcándote la cancha: sabés exactamente lo que da.',
  },
  {
    name: 'Adrián Coria', age: 25, height: 194, position: 'Alero', previousTeam: 'Trabaja de noche',
    technique: 59, physical: 70, commitment: 40, social: 52, personality: 'talentoso_informal',
    sportRep: 32, socialRep: 38, signingCost: 0, feeAttitude: 'parcial', demand: 'sin_entrenar',
    knowledge: 'poco_conocido', source: 'Cuentan que tiene muñeca, pero falta más de lo que va.',
  },
  {
    name: 'Leo Benítez', age: 26, height: 188, position: 'Alero', previousTeam: 'Se mudó de otra provincia',
    technique: 71, physical: 77, commitment: 66, social: 58, personality: 'competitivo',
    sportRep: 18, socialRep: 40, signingCost: 20, feeAttitude: 'completa', demand: null,
    knowledge: 'desconocido', source: 'No tenés referencias confiables: nadie de la liga lo vio jugar.',
  },
  // ---------- Ala-Pívots ----------
  {
    name: 'Hernán Godoy', age: 28, height: 196, position: 'Ala-Pívot', previousTeam: 'Los Cardales',
    technique: 67, physical: 76, commitment: 70, social: 62, personality: 'competitivo',
    sportRep: 58, socialRep: 58, signingCost: 55, feeAttitude: 'completa', demand: 'competitivo',
    knowledge: 'conocido', source: 'Jugó en esta liga la temporada pasada.',
  },
  {
    name: '"Tanque" Medina', age: 32, height: 198, position: 'Ala-Pívot', previousTeam: 'Cilindro Viejo',
    technique: 63, physical: 60, commitment: 78, social: 74, personality: 'leal',
    sportRep: 54, socialRep: 72, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'muy_conocido', source: 'Compartió equipo con el Chino Rodríguez hace unos años.',
  },
  {
    name: 'Diego Farías', age: 23, height: 195, position: 'Ala-Pívot', previousTeam: 'Juveniles del Círculo',
    technique: 52, physical: 82, commitment: 72, social: 60, personality: 'cumplidor',
    sportRep: 26, socialRep: 52, signingCost: 15, feeAttitude: 'completa', demand: null,
    knowledge: 'poco_conocido', source: 'Dicen que tiene físico de federado, pero le falta oficio.',
  },
  {
    name: 'Rolando Núñez', age: 29, height: 197, position: 'Ala-Pívot', previousTeam: 'Liga del Oeste',
    technique: 73, physical: 72, commitment: 52, social: 44, personality: 'mercenario',
    sportRep: 66, socialRep: 38, signingCost: 120, feeAttitude: 'parcial', demand: 'fichaje_pagado',
    knowledge: 'referencias', source: 'Fama de dominar la pintura… y de irse donde paguen mejor.',
  },
  {
    name: 'Pablo Ortega', age: 26, height: 193, position: 'Ala-Pívot', previousTeam: 'Club de su barrio',
    technique: 57, physical: 71, commitment: 80, social: 78, personality: 'social',
    sportRep: 30, socialRep: 66, signingCost: 0, feeAttitude: 'completa', demand: 'amigo',
    knowledge: 'referencias', source: 'Organiza los picados del barrio: buena gente, nivel a confirmar.',
  },
  {
    name: 'Matías Vera', age: 24, height: 196, position: 'Ala-Pívot', previousTeam: 'Volvió de estudiar afuera',
    technique: 64, physical: 75, commitment: 68, social: 56, personality: 'competitivo',
    sportRep: 22, socialRep: 48, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'desconocido', source: 'No tenés referencias confiables: estuvo años fuera de la ciudad.',
  },
  // ---------- Pívots ----------
  {
    name: 'Ariel Montes', age: 30, height: 200, position: 'Pívot', previousTeam: 'Halcones de la Costa',
    technique: 71, physical: 68, commitment: 62, social: 52, personality: 'protagonista',
    sportRep: 68, socialRep: 50, signingCost: 90, feeAttitude: 'parcial', demand: 'titularidad',
    knowledge: 'muy_conocido', source: 'El pívot que te dominó el rebote en los dos últimos cruces.',
  },
  {
    name: '"Gigante" Ferreyra', age: 27, height: 203, position: 'Pívot', previousTeam: 'La Terminal',
    technique: 60, physical: 74, commitment: 66, social: 64, personality: 'social',
    sportRep: 50, socialRep: 62, signingCost: 45, feeAttitude: 'completa', demand: 'beca_parcial',
    knowledge: 'conocido', source: 'Jugó en esta liga la temporada pasada.',
  },
  {
    name: 'Cristian Ayala', age: 21, height: 199, position: 'Pívot', previousTeam: 'Juveniles de Bohemios',
    technique: 45, physical: 84, commitment: 74, social: 58, personality: 'cumplidor',
    sportRep: 20, socialRep: 50, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'poco_conocido', source: 'Un pibe enorme que casi no jugó: proyecto puro.',
  },
  {
    name: 'Rubén Ábalos', age: 36, height: 201, position: 'Pívot', previousTeam: 'Retirado hace un año',
    technique: 62, physical: 40, commitment: 84, social: 86, personality: 'veterano',
    sportRep: 63, socialRep: 82, signingCost: 0, feeAttitude: 'completa', demand: 'sin_entrenar',
    knowledge: 'muy_conocido', source: 'Leyenda de la liga: todos saben lo que fue y lo que ya no es.',
  },
  {
    name: 'Jonás Silvera', age: 25, height: 202, position: 'Pívot', previousTeam: 'Liga del Norte',
    technique: 68, physical: 79, commitment: 58, social: 46, personality: 'mercenario',
    sportRep: 44, socialRep: 36, signingCost: 100, feeAttitude: 'beca', demand: 'beca',
    knowledge: 'referencias', source: 'Números impresionantes en otra liga… que nadie puede confirmar.',
  },
  {
    name: 'Damián Roldán', age: 28, height: 198, position: 'Pívot', previousTeam: 'Sin club este año',
    technique: 55, physical: 65, commitment: 70, social: 68, personality: 'leal',
    sportRep: 35, socialRep: 58, signingCost: 0, feeAttitude: 'completa', demand: null,
    knowledge: 'referencias', source: 'Quedó libre por trabajo, no por rendimiento, te aseguran.',
  },
];

/** Amplitud del ruido en las estimaciones según el nivel de conocimiento. */
const KNOWLEDGE_NOISE: Record<KnowledgeLevel, number> = {
  muy_conocido: 3,
  conocido: 6,
  referencias: 11,
  poco_conocido: 16,
  desconocido: 22,
};

function flexibilityFor(personality: Personality, rng: Rng): number {
  const base: Record<Personality, number> = {
    mercenario: 0.15,
    protagonista: 0.25,
    talentoso_informal: 0.3,
    competitivo: 0.4,
    veterano: 0.5,
    cumplidor: 0.5,
    social: 0.55,
    leal: 0.6,
  };
  return Math.max(0.1, Math.min(0.75, base[personality] + rng.range(-0.08, 0.08)));
}

/** Sortea el mercado de una pretemporada a partir del pool. */
export function buildMarket(rng: Rng): MarketPlayer[] {
  const chosen = rng.shuffle([...MARKET_SEEDS]).slice(0, BALANCE.preseason.marketSize);
  return chosen.map((seed, i) => {
    const noise = KNOWLEDGE_NOISE[seed.knowledge];
    return {
      id: `mk${i + 1}`,
      name: seed.name,
      age: seed.age,
      height: seed.height,
      position: seed.position,
      previousTeam: seed.previousTeam,
      technique: seed.technique,
      physical: seed.physical,
      commitment: seed.commitment,
      social: seed.social,
      personality: seed.personality,
      sportRep: seed.sportRep,
      socialRep: seed.socialRep,
      signingCost: seed.signingCost,
      feeAttitude: seed.feeAttitude,
      demand: seed.demand,
      flexibility: flexibilityFor(seed.personality, rng),
      knowledge: seed.knowledge,
      knowledgeSource: seed.source,
      availability: seed.sportRep >= 60 ? 'escuchando_ofertas' : 'libre',
      // La agenda real: se revela al contactarlo (o si es muy conocido).
      agenda: genAvailability(
        seed.commitment,
        Math.max(30, Math.min(95, seed.commitment + rng.int(-15, 15))),
        rng
      ),
      status: 'disponible' as const,
      estTechnique: Math.round(Math.max(20, Math.min(95, seed.technique + rng.range(-noise, noise)))),
      estPhysical: Math.round(Math.max(20, Math.min(95, seed.physical + rng.range(-noise, noise)))),
      contacted: false,
    };
  });
}

/** Convierte un fichable en jugador del plantel con las condiciones pactadas. */
export function marketToPlayer(
  mp: MarketPlayer,
  feeStatus: FeeStatus,
  expectedRole: ExpectedRole,
  season: number,
  rng: Rng
): Player {
  const bg = rollBackground(mp.position, rng);
  return {
    id: `sg_${mp.id}_${mp.name.length}`,
    name: mp.name,
    age: mp.age,
    // La misma cara que se vio en el mercado. La seed incluye el nombre porque
    // los ids de mercado (mk1, mk2…) se repiten entre temporadas y partidas.
    appearance: appearanceFromSeed(`${mp.id}:${mp.name}`, mp.age),
    agenda: mp.agenda,
    position: mp.position,
    technique: mp.technique,
    // Lo que creés que vale: tu estimación. La verdad se ve en la cancha.
    visibleRating: mp.estTechnique,
    physical: mp.physical,
    motivation: 70,
    commitment: mp.commitment,
    social: mp.social,
    confidence: 55,
    personality: mp.personality,
    description: `Llegó de ${mp.previousTeam}. ${mp.knowledgeSource}`,
    feeStatus,
    weeksUnpaid: 0,
    expectedRole,
    status: 'disponible',
    injuryWeeks: 0,
    weeksUpset: 0,
    lastRating: null,
    weeksBenched: 0,
    seasonTrainings: 0,
    techniqueGain: 0,
    leftClub: false,
    height: mp.height,
    hand: bg.hand,
    previousTeam: mp.previousTeam,
    profession: bg.profession,
    joinedSeason: season,
    matchLog: [],
    timeline: [
      { season, week: 0, kind: 'llegada', text: `Fichó para el club llegando de ${mp.previousTeam}.` },
    ],
  };
}
