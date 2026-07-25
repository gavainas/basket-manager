import { BALANCE } from '../game/balance';
import {
  applyLineupPreset,
  availableForMatch,
  finishLiveMatch,
  matchAbsentIds,
  playQuarter,
  startLiveMatch,
  substitute,
  suggestRotation,
  suggestStarters,
} from '../game/match';
import {
  advancePreseasonWeek,
  closePreseason,
  createPreseasonNewGame,
  openNegotiation,
  resolveNegotiation,
  startPreseason,
  startSeasonFromPreseason,
  talkToPlayer,
} from '../game/preseason';
import { resolvePreseasonEvent } from '../game/preseasonEvents';
import { planAsado } from '../game/asado';
import { Rng, randomSeed } from '../game/rng';
import { attemptAbsenceAction, type AbsenceActionId } from '../game/absences';
import { resolveExhausted } from '../game/callup';
import { appointPlayerCoach, fireCoach, hireCoach } from '../game/coach';
import { resolveIncident } from '../game/narrative';
import { registerSecondTeam } from '../game/secondTeam';
import { advanceWeek, confirmActions, createNewGame, resolveEvent } from '../game/week';
import type { AbsenceDifficulty, AttackTactic, DefenseTactic, GameState, LineupPreset } from '../game/types';

export type GameAction =
  | { type: 'NEW_GAME'; difficulty?: AbsenceDifficulty }
  | { type: 'NEW_GAME_PRESEASON'; difficulty?: AbsenceDifficulty }
  | { type: 'NEW_SEASON' }
  | { type: 'LOAD'; state: GameState }
  | { type: 'QUIT_TO_MENU' }
  | { type: 'TOGGLE_ACTION'; id: string }
  | { type: 'CONFIRM_ACTIONS' }
  | { type: 'RESOLVE_EVENT'; optionIndex: number }
  | { type: 'DISMISS_EVENT_OUTCOME' }
  | { type: 'CALLUP_ACTION'; playerId: string; actionId: AbsenceActionId }
  | { type: 'CALLUP_EXHAUSTED'; playerId: string; decision: 'descansar' | 'jugar' }
  | { type: 'REGISTER_SECOND_TEAM'; leagueId: string; playerIds: string[] }
  | { type: 'HIRE_COACH'; coachId: string }
  | { type: 'FIRE_COACH' }
  | { type: 'APPOINT_PLAYER_COACH'; playerId: string }
  | { type: 'SET_COACH_DIRECTIVE'; directive: 'ganar' | 'repartir' }
  | { type: 'PROCEED_TO_LINEUP' }
  | { type: 'TOGGLE_STARTER'; id: string }
  | { type: 'TOGGLE_ROTATION'; id: string }
  | { type: 'AUTO_LINEUP' }
  | { type: 'CLEAR_LINEUP' }
  | { type: 'START_MATCH' }
  | { type: 'SET_TACTIC'; defense?: DefenseTactic; attack?: AttackTactic }
  | { type: 'SUBSTITUTE'; outId: string; inId: string }
  | { type: 'APPLY_PRESET'; preset: LineupPreset }
  | { type: 'SET_AUTO_ROTATION'; on: boolean; directive?: 'ganar' | 'repartir' }
  | { type: 'INCIDENT_CHOICE'; index: number }
  | { type: 'PLAY_QUARTER' }
  | { type: 'FINISH_MATCH' }
  | { type: 'NEXT_WEEK' }
  | { type: 'PS_TALK'; id: string }
  | { type: 'PS_OPEN_NEGOTIATION'; id: string; isMarket: boolean }
  | { type: 'PS_NEGOTIATE'; decision: 'accept' | 'reject' | 'counter' | 'later' | 'priority' }
  | { type: 'PS_DISMISS_OUTCOME' }
  | { type: 'PS_RESOLVE_EVENT'; optionIndex: number }
  | { type: 'PS_DISMISS_EVENT_OUTCOME' }
  | { type: 'PS_ADVANCE' }
  | { type: 'PS_CLOSE' }
  | { type: 'START_SEASON' };

export function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'NEW_GAME':
      return createNewGame(randomSeed(), action.difficulty);
    case 'NEW_GAME_PRESEASON':
      return createPreseasonNewGame(randomSeed(), action.difficulty);
    case 'LOAD':
      return action.state;
    case 'QUIT_TO_MENU':
      return null;
  }

  if (!state) return state;

  switch (action.type) {
    case 'NEW_SEASON': {
      if (state.phase !== 'seasonEnd') return state;
      return startPreseason(state);
    }
    case 'PS_TALK': {
      if (state.phase !== 'preseason' || !state.preseason) return state;
      return talkToPlayer(state, action.id);
    }
    case 'PS_OPEN_NEGOTIATION': {
      if (state.phase !== 'preseason' || !state.preseason) return state;
      return openNegotiation(state, action.id, action.isMarket);
    }
    case 'PS_NEGOTIATE': {
      if (state.phase !== 'preseason' || !state.preseason) return state;
      return resolveNegotiation(state, action.decision);
    }
    case 'PS_DISMISS_OUTCOME': {
      if (!state.preseason) return state;
      return { ...state, preseason: { ...state.preseason, actionOutcome: null } };
    }
    case 'PS_RESOLVE_EVENT': {
      if (state.phase !== 'preseason' || !state.preseason?.pendingEvent) return state;
      return resolvePreseasonEvent(state, action.optionIndex);
    }
    case 'PS_DISMISS_EVENT_OUTCOME': {
      if (!state.preseason) return state;
      return { ...state, preseason: { ...state.preseason, eventOutcome: null } };
    }
    case 'PS_ADVANCE': {
      if (state.phase !== 'preseason' || !state.preseason) return state;
      if (state.preseason.pendingEvent || state.preseason.negotiation) return state;
      return advancePreseasonWeek(state);
    }
    case 'PS_CLOSE': {
      if (state.phase !== 'preseason' || !state.preseason) return state;
      if (state.preseason.pendingEvent || state.preseason.negotiation) return state;
      return closePreseason(state);
    }
    case 'START_SEASON': {
      if (state.phase !== 'preseasonEnd') return state;
      return startSeasonFromPreseason(state);
    }
    case 'TOGGLE_ACTION': {
      if (state.phase !== 'planning') return state;
      const chosen = state.actionsChosen.includes(action.id)
        ? state.actionsChosen.filter((id) => id !== action.id)
        : state.actionsChosen.length < BALANCE.actions.maxPerWeek
          ? [...state.actionsChosen, action.id]
          : state.actionsChosen;
      // Proponer el asado dispara la convocatoria: el plantel responde una sola
      // vez por semana (destildar y volver a tildar no re-sortea respuestas).
      if (action.id === 'asado' && chosen.includes('asado') && state.asadoPlan?.week !== state.week) {
        const rng = new Rng(state.seed);
        const plan = planAsado(state, rng);
        return { ...state, actionsChosen: chosen, asadoPlan: plan, seed: rng.nextSeed() };
      }
      return { ...state, actionsChosen: chosen };
    }
    case 'CONFIRM_ACTIONS':
      if (state.phase !== 'planning' || state.pendingEvent) return state;
      return confirmActions(state);
    case 'RESOLVE_EVENT':
      return resolveEvent(state, action.optionIndex);
    case 'DISMISS_EVENT_OUTCOME':
      return { ...state, eventOutcome: null, eventOutcomePeople: undefined };
    case 'CALLUP_ACTION': {
      if (state.phase !== 'callUp') return state;
      const rng = new Rng(state.seed);
      return attemptAbsenceAction({ ...state, seed: rng.nextSeed() }, action.playerId, action.actionId, rng);
    }
    case 'CALLUP_EXHAUSTED': {
      if (state.phase !== 'callUp') return state;
      const rng = new Rng(state.seed);
      return resolveExhausted(state, action.playerId, action.decision, rng);
    }
    case 'REGISTER_SECOND_TEAM': {
      if (state.phase !== 'planning') return state;
      return registerSecondTeam(state, action.leagueId, action.playerIds);
    }
    case 'HIRE_COACH': {
      if (state.phase === 'match') return state;
      return hireCoach(state, action.coachId);
    }
    case 'FIRE_COACH': {
      if (state.phase === 'match') return state;
      return fireCoach(state);
    }
    case 'APPOINT_PLAYER_COACH': {
      if (state.phase === 'match') return state;
      return appointPlayerCoach(state, action.playerId);
    }
    case 'SET_COACH_DIRECTIVE': {
      if (!state.coach) return state;
      return { ...state, coach: { ...state.coach, directive: action.directive } };
    }
    case 'PROCEED_TO_LINEUP': {
      if (state.phase !== 'callUp') return state;
      return { ...state, phase: 'lineup' };
    }
    case 'TOGGLE_STARTER': {
      if (state.phase !== 'lineup') return state;
      const player = state.players.find((p) => p.id === action.id);
      if (!player) return state;
      if (state.starters.includes(action.id)) {
        return { ...state, starters: state.starters.filter((id) => id !== action.id) };
      }
      // Los que llegan para el segundo tiempo solo pueden entrar desde el banco.
      const lateArrival = state.callUp.some((c) => c.playerId === action.id && c.lateArrival);
      if (!availableForMatch(state, player) || lateArrival || state.starters.length >= 5) return state;
      return {
        ...state,
        starters: [...state.starters, action.id],
        rotation: state.rotation.filter((id) => id !== action.id),
      };
    }
    case 'TOGGLE_ROTATION': {
      if (state.phase !== 'lineup') return state;
      const player = state.players.find((p) => p.id === action.id);
      if (!player) return state;
      if (state.rotation.includes(action.id)) {
        return { ...state, rotation: state.rotation.filter((id) => id !== action.id) };
      }
      if (
        !availableForMatch(state, player) ||
        state.starters.includes(action.id) ||
        state.rotation.length >= BALANCE.rotation.maxPlayers
      ) {
        return state;
      }
      return { ...state, rotation: [...state.rotation, action.id] };
    }
    case 'AUTO_LINEUP': {
      if (state.phase !== 'lineup') return state;
      const absent = matchAbsentIds(state);
      // Para sugerir titulares, los que llegan tarde cuentan como ausentes.
      const noStart = new Set(absent);
      for (const c of state.callUp) if (c.lateArrival) noStart.add(c.playerId);
      const starters = suggestStarters(state.players, noStart);
      return { ...state, starters, rotation: suggestRotation(state.players, starters, absent) };
    }
    case 'CLEAR_LINEUP': {
      if (state.phase !== 'lineup') return state;
      return { ...state, starters: [], rotation: [] };
    }
    case 'START_MATCH': {
      if (state.phase !== 'lineup') return state;
      const rng = new Rng(state.seed);
      return startLiveMatch({ ...state, seed: rng.nextSeed() }, rng);
    }
    case 'SET_TACTIC': {
      if (state.phase !== 'match' || !state.live || state.live.finished) return state;
      return {
        ...state,
        live: {
          ...state.live,
          defense: action.defense ?? state.live.defense,
          attack: action.attack ?? state.live.attack,
        },
      };
    }
    case 'SUBSTITUTE': {
      if (state.phase !== 'match' || !state.live || state.live.finished) return state;
      return substitute(state, action.outId, action.inId);
    }
    case 'APPLY_PRESET': {
      if (state.phase !== 'match' || !state.live || state.live.finished) return state;
      return applyLineupPreset(state, action.preset);
    }
    case 'SET_AUTO_ROTATION': {
      if (state.phase !== 'match' || !state.live || state.live.finished) return state;
      return {
        ...state,
        live: {
          ...state.live,
          autoRotation: action.on,
          directive: action.directive ?? state.live.directive ?? 'ganar',
        },
      };
    }
    case 'INCIDENT_CHOICE': {
      if (state.phase !== 'match' || !state.live?.pendingIncident) return state;
      const rng = new Rng(state.seed);
      return resolveIncident({ ...state, seed: rng.nextSeed() }, action.index, rng);
    }
    case 'PLAY_QUARTER': {
      if (state.phase !== 'match' || !state.live || state.live.finished || state.live.pendingIncident) return state;
      const rng = new Rng(state.seed);
      return playQuarter({ ...state, seed: rng.nextSeed() }, rng);
    }
    case 'FINISH_MATCH': {
      if (state.phase !== 'match' || !state.live?.finished) return state;
      const rng = new Rng(state.seed);
      return finishLiveMatch({ ...state, seed: rng.nextSeed() }, rng);
    }
    case 'NEXT_WEEK':
      if (state.phase !== 'matchResult') return state;
      return advanceWeek(state);
    default:
      return state;
  }
}
