import type { ExpectedRole, FeeStatus, Personality, Player, Position } from '../game/types';
import type { Rng } from '../game/rng';
import { appearanceFromSeed } from '../game/appearance';
import { rollBackground } from './backgrounds';

interface PlayerSeed {
  name: string;
  age: number;
  position: Position;
  technique: number;
  physical: number;
  motivation: number;
  commitment: number;
  social: number;
  personality: Personality;
  description: string;
  feeStatus: FeeStatus;
  expectedRole: ExpectedRole;
  /** Color opcional de la ficha; lo que falte se sortea. */
  previousTeam?: string;
  profession?: string;
}

const ROSTER_SEEDS: PlayerSeed[] = [
  {
    name: '"Chino" Rodríguez',
    age: 34,
    position: 'Base',
    technique: 58,
    physical: 55,
    motivation: 75,
    commitment: 90,
    social: 85,
    personality: 'veterano',
    description: 'Fundador del equipo. Ya no corre como antes, pero ordena al grupo adentro y afuera de la cancha.',
    feeStatus: 'pagada',
    expectedRole: 'titular',
    previousTeam: 'Fundador: acá empezó todo',
  },
  {
    name: 'Facundo Silva',
    age: 22,
    position: 'Base',
    technique: 70,
    physical: 82,
    motivation: 70,
    commitment: 70,
    social: 55,
    personality: 'protagonista',
    description: 'Rápido y encarador. Quiere la pelota en las manos y se nota cuando no la tiene.',
    feeStatus: 'pagada',
    expectedRole: 'titular',
  },
  {
    name: 'Martín Techera',
    age: 27,
    position: 'Escolta',
    technique: 72,
    physical: 78,
    motivation: 80,
    commitment: 80,
    social: 60,
    personality: 'competitivo',
    description: 'Vino a ganar. Entrena aparte, mira los rivales y sufre cada derrota más que nadie.',
    feeStatus: 'pagada',
    expectedRole: 'titular',
  },
  {
    name: 'Diego Núñez',
    age: 25,
    position: 'Escolta',
    technique: 55,
    physical: 65,
    motivation: 78,
    commitment: 75,
    social: 92,
    personality: 'social',
    description: 'El que organiza los asados y arma el grupo de WhatsApp. Juega porque están sus amigos.',
    feeStatus: 'pagada',
    expectedRole: 'rotación',
  },
  {
    name: 'Nacho Pereyra',
    age: 29,
    position: 'Alero',
    technique: 63,
    physical: 72,
    motivation: 72,
    commitment: 88,
    social: 65,
    personality: 'cumplidor',
    description: 'Paga el primero, llega temprano y avisa si falta. Le molesta el desorden más que perder.',
    feeStatus: 'pagada',
    expectedRole: 'titular',
  },
  {
    name: '"Tato" Fernández',
    age: 24,
    position: 'Alero',
    technique: 79,
    physical: 75,
    motivation: 65,
    commitment: 40,
    social: 70,
    personality: 'talentoso_informal',
    description: 'El más talentoso del plantel, cuando aparece. Debe cuotas y a veces avisa una hora antes.',
    feeStatus: 'pendiente',
    expectedRole: 'titular',
  },
  {
    name: 'Bruno Acosta',
    age: 26,
    position: 'Ala-Pívot',
    technique: 60,
    physical: 74,
    motivation: 74,
    commitment: 85,
    social: 72,
    personality: 'leal',
    description: 'Está desde la primera temporada. No pide nada, banca las malas y siempre suma.',
    feeStatus: 'pagada',
    expectedRole: 'rotación',
  },
  {
    name: 'Seba Cardozo',
    age: 31,
    position: 'Ala-Pívot',
    technique: 74,
    physical: 76,
    motivation: 62,
    commitment: 55,
    social: 45,
    personality: 'mercenario',
    description: 'Jugó federado. Rinde mucho, pero deja claro que en otros clubes no le cobraban la cuota.',
    feeStatus: 'beca_parcial',
    expectedRole: 'titular',
    previousTeam: 'Liga federada regional',
  },
  {
    name: 'Gonzalo Viera',
    age: 28,
    position: 'Pívot',
    technique: 68,
    physical: 80,
    motivation: 76,
    commitment: 78,
    social: 58,
    personality: 'competitivo',
    description: 'Pelea cada rebote como una final. Se calienta cuando el equipo no toma en serio los partidos.',
    feeStatus: 'pagada',
    expectedRole: 'titular',
  },
  {
    name: '"Flaco" Morales',
    age: 35,
    position: 'Pívot',
    technique: 52,
    physical: 48,
    motivation: 70,
    commitment: 82,
    social: 80,
    personality: 'veterano',
    description: 'Diez años en el club. Su físico ya no acompaña, pero el vestuario lo escucha.',
    feeStatus: 'pagada',
    expectedRole: 'suplente',
  },
  {
    name: 'Rodri Batista',
    age: 21,
    position: 'Escolta',
    technique: 48,
    physical: 70,
    motivation: 80,
    commitment: 65,
    social: 88,
    personality: 'social',
    description: 'Entró por un amigo y se quedó por el grupo. Le da igual jugar 5 o 25 minutos.',
    feeStatus: 'pagada',
    expectedRole: 'suplente',
  },
  {
    name: 'Agustín Lemos',
    age: 23,
    position: 'Alero',
    technique: 65,
    physical: 77,
    motivation: 68,
    commitment: 68,
    social: 50,
    personality: 'protagonista',
    description: 'Se siente titular indiscutido. Cuando arranca en el banco, se le nota en la cara.',
    feeStatus: 'pagada',
    expectedRole: 'rotación',
  },
];

export function buildPlayer(seed: PlayerSeed, id: string, rng: Rng): Player {
  const bg = rollBackground(seed.position, rng);
  return {
    id,
    name: seed.name,
    age: seed.age,
    appearance: appearanceFromSeed(id, seed.age),
    position: seed.position,
    technique: seed.technique,
    visibleRating: Math.round(seed.technique + rng.range(-7, 7)),
    physical: seed.physical,
    motivation: seed.motivation,
    commitment: seed.commitment,
    social: seed.social,
    confidence: Math.round(rng.range(45, 65)),
    personality: seed.personality,
    description: seed.description,
    feeStatus: seed.feeStatus,
    weeksUnpaid: seed.feeStatus === 'pendiente' ? 1 : 0,
    expectedRole: seed.expectedRole,
    status: 'disponible',
    injuryWeeks: 0,
    weeksUpset: 0,
    lastRating: null,
    weeksBenched: 0,
    seasonTrainings: 0,
    techniqueGain: 0,
    leftClub: false,
    height: bg.height,
    hand: bg.hand,
    previousTeam: seed.previousTeam ?? bg.previousTeam,
    profession: seed.profession ?? bg.profession,
    joinedSeason: 1,
    matchLog: [],
    timeline: [{ season: 1, week: 0, kind: 'llegada', text: 'En el plantel desde el arranque del club.' }],
  };
}

export function createInitialRoster(rng: Rng): Player[] {
  return ROSTER_SEEDS.map((seed, i) => buildPlayer(seed, `p${i + 1}`, rng));
}
