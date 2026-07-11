import { BALANCE } from '../game/balance';
import { simulateMatch, isSelectable } from '../game/match';
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
import { Rng, randomSeed } from '../game/rng';
import { advanceWeek, confirmActions, createNewGame, resolveEvent } from '../game/week';
import type { GameState } from '../game/types';

export type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'NEW_GAME_PRESEASON' }
  | { type: 'NEW_SEASON' }
  | { type: 'LOAD'; state: GameState }
  | { type: 'QUIT_TO_MENU' }
  | { type: 'TOGGLE_ACTION'; id: string }
  | { type: 'CONFIRM_ACTIONS' }
  | { type: 'RESOLVE_EVENT'; optionIndex: number }
  | { type: 'DISMISS_EVENT_OUTCOME' }
  | { type: 'TOGGLE_STARTER'; id: string }
  | { type: 'TOGGLE_ROTATION'; id: string }
  | { type: 'PLAY_MATCH' }
  | { type: 'NEXT_WEEK' }
  | { type: 'PS_TALK'; id: string }
  | { type: 'PS_OPEN_NEGOTIATION'; id: string; isMarket: boolean }
  | { type: 'PS_NEGOTIATE'; decision: 'accept' | 'reject' | 'counter' | 'later' }
  | { type: 'PS_DISMISS_OUTCOME' }
  | { type: 'PS_RESOLVE_EVENT'; optionIndex: number }
  | { type: 'PS_DISMISS_EVENT_OUTCOME' }
  | { type: 'PS_ADVANCE' }
  | { type: 'PS_CLOSE' }
  | { type: 'START_SEASON' };

export function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'NEW_GAME':
      return createNewGame(randomSeed());
    case 'NEW_GAME_PRESEASON':
      return createPreseasonNewGame(randomSeed());
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
      return { ...state, actionsChosen: chosen };
    }
    case 'CONFIRM_ACTIONS':
      if (state.phase !== 'planning' || state.pendingEvent) return state;
      return confirmActions(state);
    case 'RESOLVE_EVENT':
      return resolveEvent(state, action.optionIndex);
    case 'DISMISS_EVENT_OUTCOME':
      return { ...state, eventOutcome: null };
    case 'TOGGLE_STARTER': {
      if (state.phase !== 'lineup') return state;
      const player = state.players.find((p) => p.id === action.id);
      if (!player) return state;
      if (state.starters.includes(action.id)) {
        return { ...state, starters: state.starters.filter((id) => id !== action.id) };
      }
      if (!isSelectable(player) || state.starters.length >= 5) return state;
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
        !isSelectable(player) ||
        state.starters.includes(action.id) ||
        state.rotation.length >= BALANCE.rotation.maxPlayers
      ) {
        return state;
      }
      return { ...state, rotation: [...state.rotation, action.id] };
    }
    case 'PLAY_MATCH': {
      if (state.phase !== 'lineup') return state;
      const rng = new Rng(state.seed);
      const next = simulateMatch({ ...state, seed: rng.nextSeed() }, rng);
      return next;
    }
    case 'NEXT_WEEK':
      if (state.phase !== 'matchResult') return state;
      return advanceWeek(state);
    default:
      return state;
  }
}
