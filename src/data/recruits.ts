import type { Personality, Player, Position } from '../game/types';
import type { Rng } from '../game/rng';

// Pool de nombres para reclutas y amigos invitados.
const RECRUIT_NAMES = [
  'Lucas Camejo',
  'Emi Duarte',
  '"Colo" Ferreira',
  'Andrés Bentancor',
  'Joaco Píriz',
  'Mati Olivera',
  '"Ruso" Kuzmin',
  'Fede Alonso',
  'Nico Sanguinetti',
  'Pablo Techeira',
] as const;

const POSITIONS: Position[] = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

const RECRUIT_PERSONALITIES: Personality[] = [
  'social',
  'competitivo',
  'protagonista',
  'cumplidor',
  'mercenario',
  'talentoso_informal',
];

let recruitCounter = 0;

export function createRecruit(rng: Rng, opts?: { minTechnique?: number; maxTechnique?: number }): Player {
  recruitCounter += 1;
  const technique = Math.round(rng.range(opts?.minTechnique ?? 45, opts?.maxTechnique ?? 70));
  const personality = rng.pick(RECRUIT_PERSONALITIES);
  return {
    id: `n${rng.int(0, 0xffffff).toString(36)}_${recruitCounter}`,
    name: rng.pick(RECRUIT_NAMES),
    age: rng.int(20, 33),
    position: rng.pick(POSITIONS),
    technique,
    visibleRating: Math.round(technique + rng.range(-9, 9)),
    physical: rng.int(60, 85),
    motivation: rng.int(60, 80),
    commitment: personality === 'talentoso_informal' || personality === 'mercenario' ? rng.int(35, 55) : rng.int(55, 85),
    social: rng.int(40, 85),
    confidence: rng.int(40, 60),
    personality,
    description: 'Recién llegado al club. Todavía nadie sabe bien qué esperar de él.',
    feeStatus: 'pagada',
    weeksUnpaid: 0,
    expectedRole: 'suplente',
    status: 'disponible',
    injuryWeeks: 0,
    weeksUpset: 0,
    lastRating: null,
    weeksBenched: 0,
    leftClub: false,
  };
}
