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
  /** Entrenamientos a los que asistió esta temporada. */
  seasonTrainings: number;
  /** Técnica ganada esta temporada entrenando (impulsa el progreso visible). */
  techniqueGain: number;
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

/** Resumen de una temporada ya jugada (para el palmarés del club). */
export interface PastSeason {
  season: number;
  record: string;
  position: number;
  outcome: string;
  money: number;
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

export type Phase = 'preseason' | 'preseasonEnd' | 'planning' | 'lineup' | 'matchResult' | 'seasonEnd' | 'gameOver';

// ---------- Pretemporada y fichajes ----------

/** Situación de cada jugador del plantel anterior al arrancar la pretemporada. */
export type ContinuityStatus =
  | 'confirmado'
  | 'dudando'
  | 'no_respondio'
  | 'quiere_irse'
  | 'retirado'
  | 'pide_condicion';

/** Qué tan bien conoce el usuario a un jugador fichable. */
export type KnowledgeLevel = 'muy_conocido' | 'conocido' | 'referencias' | 'poco_conocido' | 'desconocido';

/** Condiciones que puede pedir un jugador para venir o quedarse. */
export type DemandType =
  | 'fichaje_pagado' // que el club pague su pase
  | 'beca' // no pagar cuota
  | 'beca_parcial' // cuota reducida
  | 'titularidad'
  | 'minutos' // lugar asegurado en la rotación
  | 'amigo' // que también venga un amigo
  | 'competitivo' // quiere un equipo que pelee arriba
  | 'ambiente' // le importa el clima social
  | 'sin_entrenar'; // no piensa entrenar regularmente

export type FeeAttitude = 'completa' | 'parcial' | 'beca';

export interface MarketPlayer {
  id: string;
  name: string;
  age: number;
  height: number; // cm
  position: Position;
  previousTeam: string;
  /** Atributos reales, ocultos al usuario. */
  technique: number;
  physical: number;
  commitment: number;
  social: number;
  personality: Personality;
  sportRep: number; // reputación deportiva 0-100
  socialRep: number; // reputación social 0-100
  signingCost: number; // lo que cuesta traerlo (pase/gestión)
  feeAttitude: FeeAttitude; // qué cuota está dispuesto a pagar
  demand: DemandType | null;
  /** Flexibilidad oculta (0-1) para negociar su exigencia. */
  flexibility: number;
  knowledge: KnowledgeLevel;
  knowledgeSource: string; // por qué lo conocés (o no)
  availability: 'libre' | 'escuchando_ofertas';
  status: 'disponible' | 'fichado' | 'rechazo' | 'perdido';
  /** Estimaciones que ve el usuario (ruido según conocimiento). */
  estTechnique: number;
  estPhysical: number;
  /** Ya lo contactaste: su exigencia y su cuota son conocidas. */
  contacted: boolean;
}

/** Condición aceptada que queda registrada como promesa del club. */
export interface ClubPromise {
  playerId: string;
  playerName: string;
  type: DemandType;
  label: string;
  season: number;
}

export interface PreseasonSummaryData {
  rosterNames: string[];
  lostNames: string[];
  signedNames: string[];
  emergencyNames: string[];
  moneySpent: number;
  projectedWeeklyFees: number;
  projectedWeeklyCosts: number;
  scholarships: number;
  promises: string[];
  strengths: string[];
  risks: string[];
  consequences: string[];
}

export interface PreseasonEventState {
  defId: string;
  targetIds: string[];
}

export interface PreseasonState {
  week: number; // 1..totalWeeks
  totalWeeks: number;
  gestionesLeft: number;
  /** Situación de cada jugador del plantel anterior (por id). */
  continuity: Record<string, ContinuityStatus>;
  /** Condición que pide cada jugador del plantel con 'pide_condicion'. */
  playerDemands: Record<string, DemandType>;
  market: MarketPlayer[];
  /** Negociación abierta en el modal (id de jugador o de fichable). */
  negotiation: { targetId: string; isMarket: boolean } | null;
  /** Ya usaste tu contraoferta con este id. */
  counterUsed: Record<string, boolean>;
  /** Desenlace de la última gestión, para mostrar en el modal. */
  actionOutcome: string | null;
  pendingEvent: PreseasonEventState | null;
  eventOutcome: string | null;
  /** Registro de todo lo que pasó en la pretemporada. */
  log: string[];
  moneySpent: number;
  summary: PreseasonSummaryData | null;
}

export interface GameState {
  saveVersion: number;
  seed: number;
  /** Temporada en curso (1, 2, 3…). */
  seasonNumber: number;
  /** Objetivos que la comisión directiva fijó para esta temporada. */
  objectives: Objective[];
  /** Temporadas anteriores del club (carrera). */
  pastSeasons: PastSeason[];
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
  /** Ids de los jugadores de rotación (entran desde el banco, máx. 5). */
  rotation: string[];
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
  /** Promesas hechas a jugadores (condiciones aceptadas). */
  promises: ClubPromise[];
  /** Estado de la pretemporada (null durante la temporada regular). */
  preseason: PreseasonState | null;
}
