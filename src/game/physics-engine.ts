import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from './game-state';
import { cloneRulesState } from './rules-types';
import { stepPlayingState, stepWaitingLaunchState } from './physics-engine-state';
import type { PhysicsStepResult } from './physics-engine-types';

export const stepGame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): GameState => stepGameFrame(state, board, input, deltaSeconds).state;

export const stepGameFrame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PhysicsStepResult => {
  const dt = Math.min(deltaSeconds, 1 / 30);

  if (state.status === 'game-over') {
    return {
      state: {
        ...state,
        rules: cloneRulesState(state.rules),
      },
      events: [],
    };
  }

  if (state.status === 'waiting-launch') {
    return stepWaitingLaunchState(
      state,
      board,
      input,
      Math.max(deltaSeconds, 0),
    );
  }

  return stepPlayingState(state, board, input, Math.max(dt, 0));
};

export const getLaunchChargeRatio = (
  state: GameState,
  board: BoardDefinition,
): number => getPlungerPullRatio(state, board);

export const getPlungerPullRatio = (
  state: GameState,
  board: BoardDefinition,
): number =>
  board.plunger.travel > 0
    ? Math.min(Math.max(state.plunger.pullback / board.plunger.travel, 0), 1)
    : 0;
