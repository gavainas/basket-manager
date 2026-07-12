import type { Personality, Player, Position } from '../game/types';
import type { Rng } from '../game/rng';
import { rollBackground } from './backgrounds';

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
let nameOffset = -1;

export function createRecruit(
  rng: Rng,
  opts?: { minTechnique?: number; maxTechnique?: number; season?: number }
): Player {
  recruitCounter += 1;
  const technique = Math.round(rng.range(opts?.minTechnique ?? 45, opts?.maxTechnique ?? 70));
  const personality = rng.pick(RECRUIT_PERSONALITIES);
  const position = rng.pick(POSITIONS);
  const bg = rollBackground(position, rng);
  const season = opts?.season ?? 1;
  // Recorre la lista en orden desde un punto aleatorio: sin nombres repetidos seguidos.
  if (nameOffset < 0) nameOffset = rng.int(0, RECRUIT_NAMES.length - 1);
  const name = RECRUIT_NAMES[(nameOffset + recruitCounter) % RECRUIT_NAMES.length];
  return {
    id: `n${rng.int(0, 0xffffff).toString(36)}_${recruitCounter}`,
    name,
    age: rng.int(20, 33),
    position,
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
    seasonTrainings: 0,
    techniqueGain: 0,
    leftClub: false,
    height: bg.height,
    hand: bg.hand,
    previousTeam: bg.previousTeam,
    profession: bg.profession,
    joinedSeason: season,
    matchLog: [],
    timeline: [{ season, week: 0, kind: 'llegada', text: 'Se sumó al club a mitad de camino, invitado por el grupo.' }],
  };
}
