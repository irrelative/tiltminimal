import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from './game-state';
import { cloneRulesState } from './rules-types';
import {
  stepPlayingState,
  stepWaitingLaunchState,
} from './physics-engine-state';
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
  if (state.status === 'game-over') {
    return {
      state: {
        ...state,
        rules: cloneRulesState(state.rules),
      },
      events: [],
    };
  }

  const result =
    state.status === 'waiting-launch'
      ? stepWaitingLaunchState(state, board, input, Math.max(deltaSeconds, 0))
      : stepPlayingState(state, board, input, Math.max(deltaSeconds, 0));
  for (const side of ['left', 'right'] as const) {
    if (
      input[side === 'left' ? 'leftPressed' : 'rightPressed'] &&
      !state.flippers.some(
        (flipper, index) =>
          board.flippers[index].side === side && flipper.engaged,
      )
    )
      result.events.unshift({
        type: 'flipper-pressed',
        side,
        tick: result.state.tick,
      });
  }
  return result;
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
