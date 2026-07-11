import { BALANCE } from '../game/balance';
import { simulateMatch, isSelectable } from '../game/match';
import { Rng, randomSeed } from '../game/rng';
import { advanceWeek, confirmActions, createNewGame, resolveEvent } from '../game/week';
import type { GameState } from '../game/types';

export type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'LOAD'; state: GameState }
  | { type: 'QUIT_TO_MENU' }
  | { type: 'TOGGLE_ACTION'; id: string }
  | { type: 'CONFIRM_ACTIONS' }
  | { type: 'RESOLVE_EVENT'; optionIndex: number }
  | { type: 'DISMISS_EVENT_OUTCOME' }
  | { type: 'TOGGLE_STARTER'; id: string }
  | { type: 'PLAY_MATCH' }
  | { type: 'NEXT_WEEK' };

export function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'NEW_GAME':
      return createNewGame(randomSeed());
    case 'LOAD':
      return action.state;
    case 'QUIT_TO_MENU':
      return null;
  }

  if (!state) return state;

  switch (action.type) {
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
      return { ...state, starters: [...state.starters, action.id] };
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
