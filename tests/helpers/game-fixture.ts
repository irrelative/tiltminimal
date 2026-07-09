import {
  createInitialGameState,
  type GameState,
} from '../../src/game/game-state';
import { stepGame } from '../../src/game/physics-engine';
import type { InputState } from '../../src/input/keyboard-input';
import type { BoardDefinition } from '../../src/types/board-definition';

export const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
  nudgeLeftPressed: false,
  nudgeRightPressed: false,
  nudgeUpPressed: false,
};

export const launchBall = (
  board: BoardDefinition,
  options: {
    chargeSeconds?: number;
    maxSteps?: number;
    stepSeconds?: number;
  } = {},
): GameState => {
  const chargeSeconds =
    options.chargeSeconds ?? board.physics.plunger.maxPullSeconds;
  const maxSteps = options.maxSteps ?? 120;
  const stepSeconds = options.stepSeconds ?? 1 / 120;
  let state = stepGame(
    createInitialGameState(board),
    board,
    { ...idleInput, launchPressed: true },
    chargeSeconds,
  );

  for (let step = 0; step < maxSteps; step += 1) {
    state = stepGame(state, board, idleInput, stepSeconds);

    if (state.status === 'playing') {
      return state;
    }
  }

  throw new Error(`Expected ${board.name} to launch.`);
};
