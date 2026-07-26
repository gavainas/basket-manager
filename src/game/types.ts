// Tipos centrales del juego. Todo el estado es serializable a JSON (LocalStorage).

import type { Appearance } from './appearance';

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

/** Dificultad de faltas: cuánto te complica la vida el plantel (se elige al crear la partida). */
export type AbsenceDifficulty = 'facil' | 'medio' | 'dificil';

export type Hand = 'derecha' | 'zurda';

/** Tipo de hito en una historia personal (reutilizable para club/temporadas). */
export type TimelineKind =
  | 'llegada'
  | 'partido'
  | 'lesion'
  | 'ausencia'
  | 'animo'
  | 'social'
  | 'hito'
  | 'salida';

/** Un momento en la historia de un jugador (o del club). */
export interface TimelineEvent {
  season: number;
  /** Semana de la temporada (0 = pretemporada). */
  week: number;
  kind: TimelineKind;
  text: string;
}

/** Línea de un partido jugado: alimenta estadísticas y tendencias. */
export interface PlayerMatchEntry {
  season: number;
  week: number;
  rivalName: string;
  minutes: number;
  rating: number;
  mvp: boolean;
  won: boolean;
  points: number;
  rebounds: number;
  assists: number;
}

/** Renglón de la planilla de un partido. */
export interface BoxScoreLine {
  playerId: string;
  name: string;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  rating: number;
  mvp: boolean;
  /** Frase que explica la nota. */
  comment?: string;
}

// ---------- Estado emocional postpartido ----------

export type PlayerEmotion =
  | 'euforico'
  | 'orgulloso'
  | 'contento'
  | 'conforme'
  | 'indiferente'
  | 'frustrado'
  | 'molesto_minutos'
  | 'decepcionado';

export interface PlayerMood {
  playerId: string;
  name: string;
  emotion: PlayerEmotion;
  label: string;
  text: string;
}

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
  /** Retrato (design/AVATAR_SYSTEM.md). Si falta, se deriva del id del jugador. */
  appearance?: Appearance;
  /** Agenda personal: hoy solo la traen los fichados del mercado; pesa en la convocatoria. */
  agenda?: AvailabilityProfile;
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
  /** Faltas técnicas acumuladas en la temporada (a la 3ª, una fecha de suspensión). */
  seasonTechs?: number;
  /** La promesa que le rompiste: el rencor persiste hasta compensarlo (o un año). */
  grudge?: { season: number; type: string; label: string } | null;
  /** Registro semanal para promesas de titularidad/rotación: solo fechas en las que estuvo disponible. */
  promiseLog?: { season: number; week: number; started: boolean; inSquad: boolean }[];
  /** Semanas restantes de suspensión por acumulación de técnicas. */
  suspendedWeeks?: number;
  /** Técnica ganada esta temporada entrenando (impulsa el progreso visible). */
  techniqueGain: number;
  leftClub: boolean;
  // --- Ficha personal ---
  height: number; // cm
  hand: Hand;
  previousTeam: string;
  profession: string;
  /** Temporada en la que llegó al club. */
  joinedSeason: number;
  /** Partidos jugados con el club (para estadísticas y tendencias). */
  matchLog: PlayerMatchEntry[];
  /** Historia personal en el club. */
  timeline: TimelineEvent[];
}

export interface Club {
  name: string;
  money: number;
  socialClimate: number; // ambiente social 0-100
  organization: number; // 0-100
  sportPrestige: number; // 0-100
  socialPrestige: number; // 0-100
}

/** Estilo de juego del rival: define contra qué tácticas sufre o castiga. */
export type RivalStyle = 'tiradores' | 'internos' | 'corredores' | 'equilibrado';

export interface Rival {
  id: string;
  name: string;
  strength: number; // 0-100
  style: RivalStyle;
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

// ---------- Convocatoria y partido en vivo ----------

export type CallUpStatus = 'confirmado' | 'ausente' | 'lesionado';

/** Respuesta de un jugador a la convocatoria del partido de la semana. */
export interface CallUpEntry {
  playerId: string;
  playerName: string;
  status: CallUpStatus;
  /** Excusa o parte médico (null si confirmó sin drama). */
  note: string | null;
  /** Motivo estructurado de la ausencia (habilita acciones del manager). */
  reasonId?: string;
  /** Ya intentaste algo con esta ausencia (un intento por semana). */
  resolved?: boolean;
  /** Desenlace del intento, para mostrar. */
  resolution?: string;
  /** Llega para el segundo tiempo: disponible solo desde el banco. */
  lateArrival?: boolean;
  /** Confirmó pero está fundido: el manager decide si lo cuida o lo juega. */
  exhausted?: boolean;
  /** Decidiste jugarlo fundido: rinde menos y el físico puede decir basta. */
  playingExhausted?: boolean;
}

export type DefenseTactic = 'hombre' | 'zona' | 'presion';
export type AttackTactic = 'estrella' | 'equipo' | 'correr';

/** Resumen del quinteto al momento de arrancar el partido. */
export interface TeamEval {
  strength: number;
  baseSkill: number;
  physicalAvg: number;
  motivationAvg: number;
  missingPositions: number;
  chemistry01: number;
  starterMinutes: number;
  rotationCount: number;
}

export interface LiveQuarter {
  for: number;
  against: number;
  defense: DefenseTactic;
  attack: AttackTactic;
  /** Mini relato de lo que pasó en el cuarto. */
  notes: string[];
  /** true si es el suplementario. */
  overtime?: boolean;
}

/** Estado del partido en curso (fase 'match'). */
export interface LiveMatchState {
  rivalId: string;
  rivalName: string;
  quarters: LiveQuarter[];
  finished: boolean;
  /** Tácticas elegidas para el próximo cuarto. */
  defense: DefenseTactic;
  attack: AttackTactic;
  /** Todos los citados al partido (titulares + banco). */
  squad: string[];
  /** Los 5 que están en cancha ahora mismo. */
  onCourt: string[];
  /** Piernas de cada citado (0-100): en cancha se gastan, en el banco se recuperan. */
  playerFresh: Record<string, number>;
  /** Minutos jugados por cada citado. */
  minutes: Record<string, number>;
  /** Planilla en vivo: puntos, rebotes y asistencias por citado. */
  stats: Record<string, { pts: number; reb: number; ast: number }>;
  /** Cambios hechos en el descanso, para el relato del próximo cuarto. */
  pendingSubNotes: string[];
  rivalFreshness: number;
  /** Mejor jugador en cancha: el destinatario del ataque 'estrella'. */
  starId: string;
  starName: string;
  /** Rendimiento del día por jugador (se sortea al arrancar). */
  perfs: Record<string, number>;
  hombreQuarters: number;
  estrellaQuarters: number;
  /** El árbitro del partido (nombre y estilo): condiciona las incidencias. */
  refName?: string;
  refStyle?: 'estricto' | 'permisivo' | 'casero' | 'protagonista';
  /** Suerte acumulada, para explicar el resultado. */
  luckTotal: number;
  /** El rival metió una presión especial en el último cuarto. */
  rivalPush: boolean;
  /** Convocatoria rival del día: quiénes vinieron y cuánto pesa (opcional por compatibilidad). */
  rivalSquad?: { presentCount: number; mod: number; notes: string[] };
  /** Tensión con los jueces (0-5): percepción del equipo, afecta concentración. */
  refTension?: number;
  /** El próximo cuarto sale con bronca canalizada (+intensidad). */
  rageBoost?: boolean;
  /** Incidencia arbitral esperando una decisión del manager. */
  pendingIncident?: PendingRefIncident | null;
  /** Piloto automático de cambios entre cuartos. */
  autoRotation?: boolean;
  /** Directiva del piloto: ganar como sea o que todos sumen minutos. */
  directive?: 'ganar' | 'repartir';
  /** Lesionados durante el partido (para el informe y las noticias). */
  injuries?: { playerId: string; name: string; weeks: number }[];
  eval: TeamEval;
}

/** Quintetos predefinidos, estilo unidades de NBA. */
export type LineupPreset = 'titulares' | 'segunda' | 'frescos' | 'cerradores';

// ---------- Cuerpo técnico ----------

export type CoachType = 'pago' | 'honorario' | 'jugador';
export type CoachProfile = 'proyecto' | 'profe' | 'quemado';

export interface Coach {
  id: string;
  name: string;
  type: CoachType;
  profile: CoachProfile;
  /** Lectura del juego (0-100): calidad de sus decisiones en el partido. */
  tactics: number;
  /** Manejo de grupo (0-100): cómo llega al vestuario. */
  people: number;
  weeklyWage: number;
  /** Si es jugador-DT, el jugador del plantel que dirige. */
  playerId?: string;
  /** Directiva que le diste para los partidos. */
  directive: 'ganar' | 'repartir';
  /** Riesgo semanal de que se lo lleve un club profesional. */
  poachRisk?: number;
}

/** Incidencia arbitral con decisión pendiente (serializable). */
export interface PendingRefIncident {
  kind: 'falta_dudosa' | 'tecnica' | 'criterio' | 'buen_arbitraje';
  playerId?: string;
  playerName?: string;
  text: string;
  options: { label: string; hint: string }[];
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
  /** Planilla del partido, ordenada por puntos (vacía en forfeit). */
  box: BoxScoreLine[];
  /** Cómo quedó cada uno del plantel al terminar (vacío en forfeit). */
  moods?: PlayerMood[];
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

/** Evento encadenado: una decisión de hoy lo agenda para dispararse semanas
 *  después con los mismos protagonistas. Se descarta si cambia la temporada
 *  o si el protagonista dejó el club. */
export interface ScheduledEvent {
  defId: string;
  season: number;
  week: number;
  playerId?: string;
  playerId2?: string;
}

export type Phase =
  | 'preseason'
  | 'preseasonEnd'
  | 'planning'
  | 'callUp'
  | 'lineup'
  | 'match'
  | 'matchResult'
  | 'seasonEnd'
  | 'gameOver';

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
  /** Agenda personal (días bloqueados, horarios, interior). Se conoce al contactarlo. */
  agenda?: AvailabilityProfile;
  status: 'disponible' | 'fichado' | 'rechazo' | 'perdido';
  /** Estimaciones que ve el usuario (ruido según conocimiento). */
  estTechnique: number;
  estPhysical: number;
  /** Ya lo contactaste: su exigencia y su cuota son conocidas. */
  contacted: boolean;
}

/** Reacción diferida de un evento: se comunica y aplica semanas después. */
export interface DelayedNote {
  season: number;
  week: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  playerId?: string;
  /** Ajustes chicos al aplicarse (solo si el jugador sigue en el club). */
  motivation?: number;
  climate?: number;
}

/**
 * Amigo invitado a probarse: entrena una semana con el equipo y recién después
 * decidís si lo sumás. Vive fuera de `players` hasta que lo aceptás.
 */
export interface TrialCandidate {
  /** El jugador ya generado, todavía fuera del plantel. */
  player: Player;
  inviterId: string;
  inviterName: string;
  /** Semana en que se sumó a entrenar. */
  arrivedWeek: number;
  /** Cómo rindió en la práctica (1-10); null hasta que entrena esa semana. */
  practiceRating: number | null;
  /** Frase de cómo se lo vio en la práctica (vacía hasta que entrena). */
  practiceNote: string;
}

/** Condición aceptada que queda registrada como promesa del club. */
export interface ClubPromise {
  playerId: string;
  playerName: string;
  type: DemandType;
  label: string;
  season: number;
  /** Ya se rompió y el jugador reaccionó (no se vuelve a evaluar). */
  broken?: boolean;
  /** Ya te encaró una vez por esta promesa (la charla previa a la ruptura). */
  warned?: boolean;
}

/** Una entrada de las listas de fin de pretemporada: id para abrir la ficha + texto a mostrar. */
export interface PreseasonSummaryEntry {
  id: string;
  label: string;
}

export interface PreseasonSummaryData {
  roster: PreseasonSummaryEntry[];
  lost: PreseasonSummaryEntry[];
  signed: PreseasonSummaryEntry[];
  emergency: PreseasonSummaryEntry[];
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
  /** Ya le pediste prioridad de agenda a este fichable. */
  priorityUsed?: Record<string, boolean>;
  /** Desenlace de la última gestión, para mostrar en el modal. */
  actionOutcome: string | null;
  pendingEvent: PreseasonEventState | null;
  eventOutcome: string | null;
  /** Registro de todo lo que pasó en la pretemporada. */
  log: string[];
  moneySpent: number;
  summary: PreseasonSummaryData | null;
}

// ---------- Mundo: ligas, clubes, equipos y jugadores rivales ----------
// Capa nueva y modular: el juego clásico sigue usando rivals/schedule/standings,
// y el mundo los espeja con entidades completas (compatibilidad vía legacyRivalId).

export type WeekDay = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo';

export interface League {
  id: string;
  name: string;
  kind: 'universitaria' | 'libre' | 'veteranos';
  minAge?: number;
  divisionCount: number;
  rules: string[];
}

export interface Division {
  id: string;
  leagueId: string;
  name: string;
  level: number;
  gameDay: WeekDay;
  gameTimes: string[];
  altDays: WeekDay[];
}

export interface SeasonInfo {
  id: string;
  number: number;
  year: number;
  /** ISO de la fecha del partido de la semana 1. */
  startDate: string;
}

export interface WorldClub {
  id: string;
  name: string;
  /** Colores de la camiseta: [principal, vivo/secundario]. */
  colors: [string, string];
  crest: string;
  /** Año de fundación (para la chapa institucional). */
  founded: number;
  /** Prestigio del club rival; el del usuario vive en GameState.club. */
  sportPrestige: number;
  socialPrestige: number;
  isUser?: boolean;
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  category: 'mayores' | '+35' | 'social';
  status: 'activo' | 'inactivo';
  venueId: string;
  delegate: string;
  /** DT del equipo (para rivales es color; el del usuario vive en GameState.coach). */
  coachName?: string;
  coachType?: CoachType;
  /** Id del rival del sistema clásico al que mapea (compatibilidad). */
  legacyRivalId?: string;
}

export interface Venue {
  id: string;
  name: string;
  neighborhood: string;
}

export interface CompetitionEntry {
  teamId: string;
  leagueId: string;
  divisionId: string;
  seasonId: string;
  status: 'activa' | 'baja';
  fee: number;
  registeredWeek: number;
}

/** Inscripción de un jugador: máx. una activa por playerId + leagueId + seasonId. */
export interface PlayerRegistration {
  id: string;
  playerId: string;
  teamId: string;
  leagueId: string;
  seasonId: string;
  status: 'activa' | 'baja';
  registeredWeek: number;
  endWeek?: number;
}

export interface AvailabilityProfile {
  /** Probabilidad base de estar para un partido cualquiera (0-1). */
  baseChance: number;
  blockedDays: WeekDay[];
  /** Solo puede en estos horarios (vacío = cualquiera). */
  onlyTimes: string[];
  lateChance: number;
  residence: string;
  /** Km a la capital; > 50 se considera del interior. */
  distanceKm: number;
  notes: string[];
}

/** Jugador del mundo (rivales): persona independiente de sus equipos. */
export interface WorldPlayer {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  secondaryPositions: Position[];
  /** Nivel estimado desde afuera (0-100). */
  level: number;
  personality: Personality;
  commitment: number;
  reliability: number;
  prestige: number;
  availability: AvailabilityProfile;
  injuryWeeks: number;
}

export type FixtureStatus = 'programado' | 'jugado' | 'reprogramado' | 'suspendido';

export interface WorldFixture {
  id: string;
  seasonId: string;
  leagueId: string;
  divisionId: string;
  week: number;
  date: string; // ISO
  time: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  status: FixtureStatus;
  scoreHome?: number;
  scoreAway?: number;
  isUserMatch: boolean;
  /** Etiqueta especial ('Semifinal · Copa de Oro'); vacío en fase regular. */
  label?: string;
}

// ---------- Playoffs: Copa de Oro y Copa de Plata ----------

export type CupTier = 'oro' | 'plata';
export type PlayoffRound = 'semifinal' | 'final';

/** Un cruce de playoffs. Los equipos usan ids clásicos ('club' o rivalId). */
export interface PlayoffTie {
  id: string;
  cup: CupTier;
  round: PlayoffRound;
  week: number;
  homeId: string;
  awayId: string;
  scoreHome?: number;
  scoreAway?: number;
  winnerId?: string;
  isUserMatch: boolean;
}

export interface PlayoffsState {
  /** El usuario clasificó a alguna copa. */
  qualified: boolean;
  userCup: CupTier | null;
  ties: PlayoffTie[];
  champions: { oro?: string; plata?: string };
}

export interface WorldState {
  season: SeasonInfo;
  leagues: League[];
  divisions: Division[];
  venues: Venue[];
  clubs: WorldClub[];
  teams: Team[];
  /** Solo rivales: los jugadores del usuario viven en GameState.players. */
  players: WorldPlayer[];
  registrations: PlayerRegistration[];
  entries: CompetitionEntry[];
  fixtures: WorldFixture[];
}

// ---------- Expansión del club: segundo equipo en otra liga (etapa 6) ----------

/** Renglón de la tabla del torneo del segundo equipo (incluye al club). */
export interface SecondTeamRow {
  teamId: string;
  /** Para abrir la ficha del club rival (ClubLink); el del usuario navega a plantilla. */
  clubId: string;
  name: string;
  /** Fuerza del rival (la del club se recalcula con el plantel inscripto). */
  strength: number;
  wins: number;
  losses: number;
}

/** Segundo equipo del club inscripto en otra liga. Vive una temporada. */
export interface SecondTeamState {
  leagueId: string;
  divisionId: string;
  teamId: string;
  name: string;
  /** Jugadores del plantel con ficha en este equipo (comparten semana a semana). */
  playerIds: string[];
  /** Tabla del torneo; el fixture es una rueda todos contra todos. */
  table: SecondTeamRow[];
  /** Fechas ya jugadas del torneo. */
  round: number;
  lastResult: string | null;
  finished: boolean;
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
  /** Ids de los implicados en ese desenlace: sus caras acompañan la reacción. */
  eventOutcomePeople?: string[];
  /** Reacciones diferidas pendientes (se aplican al avanzar la semana). */
  delayed?: DelayedNote[];
  /** Eventos encadenados pendientes: consecuencias interactivas de decisiones previas. */
  scheduledEvents?: ScheduledEvent[];
  /** Últimos eventos semanales sorteados: alimenta el cooldown anti-repetición. */
  eventLog?: { id: string; season: number; week: number }[];
  starters: string[]; // ids de los 5 titulares elegidos
  /** Ids de los jugadores de rotación (entran desde el banco, máx. 5). */
  rotation: string[];
  /** Confirmación de asistencia al partido de la semana (se sortea tras las decisiones). */
  callUp: CallUpEntry[];
  /** Partido en curso; null fuera de la fase 'match'. */
  live: LiveMatchState | null;
  lastMatch: MatchResult | null;
  history: MatchResult[];
  news: NewsItem[];
  ledger: LedgerEntry[];
  memorableMoments: string[];
  /** Historia del club: fundación, temporadas, hazañas, fichajes y salidas. */
  clubTimeline: TimelineEvent[];
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
  /** El mundo: ligas, equipos, jugadores rivales, inscripciones y fixture. */
  world: WorldState;
  /** Playoffs de la divisional (Copa de Oro / Copa de Plata); null en fase regular. */
  playoffs: PlayoffsState | null;
  /** El DT del equipo principal (null = dirigís vos). */
  coach: Coach | null;
  /** Candidatos a DT disponibles esta temporada. */
  coachMarket: Coach[];
  /** Amigo a prueba: entrena una semana antes de que decidas sumarlo (null si no hay). */
  trialCandidate: TrialCandidate | null;
  /** Divisional donde compite el club (id de world Divisions). Cambia con ascensos/descensos. */
  divisionId: string;
  /** Los 10 equipos de la divisional que el usuario NO juega (persisten los ascensos/descensos). */
  otherDivisionTeams: Rival[];
  /** Segundo equipo del club en otra liga (etapa 6); opcional para no migrar saves. */
  secondTeam?: SecondTeamState | null;
  /** Dificultad de faltas y lesiones (elegida al crear la partida; saves viejos = medio). */
  absenceDifficulty?: AbsenceDifficulty;
  /** Convocatoria al asado de esta semana (respuestas del plantel); opcional para no migrar saves. */
  asadoPlan?: AsadoPlan | null;
  /** Cómo salió el asado de esta semana (para el informe y el partido). */
  lastAsado?: AsadoReport | null;
  /** Asados de la temporada: semana, asistencia y quiénes fueron (alimenta objetivos y memoria). */
  asadoHistory?: AsadoRecord[];
  /** Ajustes vivos de afinidad entre pares (clave: ids ordenados "a|b"). Persiste entre temporadas. */
  affinityBonus?: Record<string, number>;
  /** La espina clavada: el rival que nos eliminó o nos ganó la final. Persiste hasta la revancha. */
  nemesis?: { rivalId: string; reason: string } | null;
}

// ---------- Asado con convocatoria ----------

export type AsadoAnswer = 'va' | 'duda' | 'no_va';

export interface AsadoRsvp {
  playerId: string;
  answer: AsadoAnswer;
  /** Por qué no viene (solo para no_va): laburo, familia, bronca… */
  reason?: string;
}

export interface AsadoPlan {
  /** Semana para la que vale la convocatoria (si cambia la semana, se descarta). */
  week: number;
  rsvps: AsadoRsvp[];
}

export type AsadoTier = 'fieston' | 'bueno' | 'flojo' | 'papelon';

export interface AsadoReport {
  week: number;
  season: number;
  /** Ids de los que estuvieron en la mesa. */
  attended: string[];
  /** Los que faltaron, con su motivo (incluye a los que confirmaron y se cayeron). */
  missed: { playerId: string; reason: string }[];
  /** Asistencia sobre el plantel activo (0-1). */
  ratio: number;
  tier: AsadoTier;
  rained: boolean;
  /** Frases de color: sociedades nuevas, anécdotas, caras largas. */
  highlights: string[];
}

export interface AsadoRecord {
  week: number;
  ratio: number;
  /** true si fue más de la mitad del plantel: cuenta para la comisión. */
  good: boolean;
  attended: string[];
}
