import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from './game-state';
import { resetBall } from './game-state';
import {
  constrainBallToLauncherLane,
  resolveGuideCollisions,
  resolvePlungerCollision,
  resolvePlungerGuideCollisions,
  resolveWallCollisions,
} from './physics-engine-boundaries';
import {
  resolveBumperCollisions,
  resolveDropTargetCollisions,
  resolvePostCollisions,
  resolveRolloverTriggers,
  resolveSaucerCaptures,
  resolveSlingshotCollisions,
  resolveSpinnerInteractions,
  resolveStandupTargetCollisions,
} from './physics-engine-devices';
import { resolveFlipperCollisions } from './physics-engine-flippers';
import {
  MAX_SIMULATION_STEP_SECONDS,
  type PhysicsStepResult,
} from './physics-engine-types';
import {
  advanceElementStates,
  advanceFlipperFrame,
  advancePlungerFrame,
  advanceTableNudgeState,
  clonePlayingGameState,
  resolveOccupiedSaucer,
} from './physics-motion';
import { cloneRulesState, type GameEvent } from './rules-types';

export const stepWaitingLaunchState = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PhysicsStepResult => {
  const plungerFrame = advancePlungerFrame(state, board, input, deltaSeconds);
  const flipperFrame = advanceFlipperFrame(state, board, input, deltaSeconds);
  const events: GameEvent[] = [];
  const tableNudge = advanceTableNudgeState(
    state.tableNudge,
    board,
    input,
    deltaSeconds,
  );
  const next: GameState = {
    ...state,
    tick: state.tick + 1,
    status: 'waiting-launch',
    ball: {
      ...state.ball,
      position: {
        ...state.ball.position,
        x: board.launchPosition.x,
        y: board.launchPosition.y,
      },
      linearVelocity: {
        x: 0,
        y: 0,
      },
      angularVelocity: {
        x: 0,
        y: 0,
      },
      angularPosition: {
        x: 0,
        y: 0,
      },
    },
    plunger: plungerFrame.next,
    tableNudge,
    flippers: flipperFrame.map((motion) => motion.next),
    rules: cloneRulesState(state.rules),
  };

  if (plungerFrame.surfaceVelocity.y >= 0) {
    return { state: next, events };
  }

  resolvePlungerCollision(next, board, plungerFrame, board.physics.solver);

  if (
    next.ball.linearVelocity.y < -24 ||
    next.ball.position.y < board.launchPosition.y - 2
  ) {
    next.status = 'playing';
    events.push({
      type: 'ball-launched',
      tick: next.tick,
    });
  } else {
    next.ball.position.x = board.launchPosition.x;
    next.ball.position.y = board.launchPosition.y;
    next.ball.linearVelocity.x = 0;
    next.ball.linearVelocity.y = 0;
    next.ball.angularVelocity.x = 0;
    next.ball.angularVelocity.y = 0;
  }

  return { state: next, events };
};

export const stepPlayingState = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PhysicsStepResult => {
  const events: GameEvent[] = [];
  const next = clonePlayingGameState(state, board);
  const stepCount = Math.max(
    1,
    Math.ceil(deltaSeconds / MAX_SIMULATION_STEP_SECONDS),
  );
  const stepSeconds = stepCount > 0 ? deltaSeconds / stepCount : 0;

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    next.tableNudge = advanceTableNudgeState(
      next.tableNudge,
      board,
      input,
      stepSeconds,
    );
    const plungerFrame = advancePlungerFrame(next, board, input, stepSeconds);
    const flipperFrame = advanceFlipperFrame(next, board, input, stepSeconds);

    next.plunger = plungerFrame.next;
    next.flippers = flipperFrame.map((motion) => motion.next);

    advanceElementStates(next, board, stepSeconds);

    if (resolveOccupiedSaucer(next, board, stepSeconds)) {
      continue;
    }

    next.ball.linearVelocity.y += board.gravity * stepSeconds;
    const previousBallPosition = {
      ...next.ball.position,
    };
    next.ball.position.x += next.ball.linearVelocity.x * stepSeconds;
    next.ball.position.y += next.ball.linearVelocity.y * stepSeconds;

    resolveWallCollisions(next, board, board.physics.solver);
    resolvePlungerGuideCollisions(
      next,
      board,
      board.physics.solver,
      previousBallPosition,
    );
    resolveGuideCollisions(
      next,
      board,
      board.physics.solver,
      previousBallPosition,
    );
    resolvePostCollisions(next, board, board.physics.solver);
    resolvePlungerCollision(next, board, plungerFrame, board.physics.solver);
    resolvePlungerGuideCollisions(
      next,
      board,
      board.physics.solver,
      previousBallPosition,
    );
    constrainBallToLauncherLane(next, board);
    resolveStandupTargetCollisions(next, board, board.physics.solver, events);
    resolveDropTargetCollisions(next, board, board.physics.solver, events);
    resolveSlingshotCollisions(next, board, board.physics.solver, events);
    resolveBumperCollisions(next, board, board.physics.solver, events);
    resolveFlipperCollisions(
      next,
      board,
      flipperFrame,
      stepSeconds,
      board.physics.solver,
    );
    resolveSaucerCaptures(next, board, events);
    resolveSpinnerInteractions(next, board, board.physics.solver, events);
    resolveRolloverTriggers(next, board, events);

    if (
      next.ball.position.y - next.ball.radius >
      board.drainY + next.tableNudge.offset.y
    ) {
      events.push({
        type: 'ball-drained',
        tick: next.tick,
      });

      return {
        state: resetBall(next, board),
        events,
      };
    }
  }

  return {
    state: next,
    events,
  };
};
