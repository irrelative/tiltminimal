import type { BoardDefinition } from '../types/board-definition';
import type { InputState } from '../input/keyboard-input';
import type { GameState } from './game-state';
import { stepGameFrame } from './physics-engine';
import { applyRulesFrame } from './rules-engine';

/** The gameplay update shared by interactive play and headless investigations. */
export const advanceGameFrame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  seconds: number,
) => {
  const result = stepGameFrame(state, board, input, seconds);
  return {
    state: applyRulesFrame(result.state, board, result.events, seconds),
    events: result.events,
  };
};
