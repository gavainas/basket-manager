// Tipos centrales del juego. Todo el estado es serializable a JSON (LocalStorage).

export type Position = 'Base' | 'Escolta' | 'Alero' | 'Ala-Pívot' | 'Pívot';

export type Personality =
  | 'competitivo'
  | 'social'
  | 'protagonista'
  | 'leal'
  | 'mercenario'
  | 'cumplidor'
  | 'veterano'
  | 'talentoso_informal';

export type PlayerStatus = 'disponible' | 'molesto' | 'lesionado' | 'al_borde';

export type FeeStatus = 'pagada' | 'pendiente' | 'beca_total' | 'beca_parcial';

export type ExpectedRole = 'titular' | 'rotación' | 'suplente';

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  /** Habilidad real, oculta al usuario (0-100). */
  technique: number;
  /** Valoración aproximada que ve el usuario (técnica + ruido fijo). */
  visibleRating: number;
  physical: number; // 0-100
  motivation: number; // 0-100
  commitment: number; // 0-100
  social: number; // 0-100 afinidad social
  /** Confianza, oculta (0-100). Sube con buenos partidos y minutos. */
  confidence: number;
  personality: Personality;
  description: string;
  feeStatus: FeeStatus;
  /** Semanas seguidas sin pagar (solo si feeStatus = pendiente). */
  weeksUnpaid: number;
  expectedRole: ExpectedRole;
  status: PlayerStatus;
  /** Semanas restantes de lesión. */
  injuryWeeks: number;
  /** Semanas seguidas con estado "molesto" o "al_borde". */
  weeksUpset: number;
  /** Rendimiento del último partido jugado (1-10), null si no jugó. */
  lastRating: number | null;
  /** Semanas seguidas sin ser titular. */
  weeksBenched: number;
  leftClub: boolean;
}

export interface Club {
  name: string;
  money: number;
  socialClimate: number; // ambiente social 0-100
  organization: number; // 0-100
  sportPrestige: number; // 0-100
  socialPrestige: number; // 0-100
}

export interface Rival {
  id: string;
  name: string;
  strength: number; // 0-100
}

export interface StandingRow {
  teamId: string; // 'club' para el equipo del jugador
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface QuarterScore {
  for: number;
  against: number;
}

export interface MatchResult {
  week: number;
  rivalId: string;
  rivalName: string;
  scoreFor: number;
  scoreAgainst: number;
  /** Parciales de los 4 cuartos (vacío en forfeit). */
  quarters: QuarterScore[];
  /** Jugadas destacadas del relato (vacío en forfeit). */
  highlights: string[];
  won: boolean;
  forfeit: boolean;
  mvpId: string | null;
  mvpName: string | null;
  summary: string;
  reasons: string[];
  lockerRoom: string[];
  effects: string[];
}

export interface Objective {
  id: string;
  label: string;
  target: number;
}

export type NewsTone = 'good' | 'bad' | 'neutral';

export interface NewsItem {
  week: number;
  text: string;
  tone: NewsTone;
}

export interface LedgerEntry {
  week: number;
  concept: string;
  amount: number; // positivo = ingreso, negativo = gasto
}

export interface ActiveEvent {
  defId: string;
  playerId?: string;
  playerId2?: string;
}

export type Phase = 'planning' | 'lineup' | 'matchResult' | 'seasonEnd' | 'gameOver';

export interface GameState {
  saveVersion: number;
  seed: number;
  /** Temporada en curso (1, 2, 3…). */
  seasonNumber: number;
  /** Objetivos que la comisión directiva fijó para esta temporada. */
  objectives: Objective[];
  week: number; // 1..seasonLength
  seasonLength: number;
  phase: Phase;
  club: Club;
  players: Player[];
  rivals: Rival[];
  /** rivalId que enfrenta el club cada semana (índice = semana - 1). */
  schedule: string[];
  standings: StandingRow[];
  /** Acciones elegidas esta semana (ids), máximo 2. */
  actionsChosen: string[];
  /** Acciones ya aplicadas esta semana con su resultado. */
  actionsLog: string[];
  /** Ids de acciones de único uso ya realizadas en la temporada. */
  actionsUsed: string[];
  pendingEvent: ActiveEvent | null;
  /** Texto con el desenlace del último evento resuelto (para mostrar en el modal). */
  eventOutcome: string | null;
  starters: string[]; // ids de los 5 titulares elegidos
  lastMatch: MatchResult | null;
  history: MatchResult[];
  news: NewsItem[];
  ledger: LedgerEntry[];
  memorableMoments: string[];
  /** Jugadores que abandonaron el club durante la temporada. */
  playersLeftCount: number;
  /** Semanas restantes de contrato con sponsor (0 = sin sponsor). */
  sponsorWeeks: number;
  gameOverReason: string | null;
  startingMoney: number;
}
