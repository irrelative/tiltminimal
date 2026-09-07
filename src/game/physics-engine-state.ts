import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from './game-state';
import { resetBall } from './game-state';
import { getSurfaceMaterial } from './materials';
import {
  getPlungerLaneBounds,
  hasPassedPlungerReturnGate,
} from './plunger-geometry';
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
  getBallStepSeconds,
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
    launcherExited: false,
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
  let remainingSeconds = deltaSeconds;
  do {
    const stepSeconds = getBallStepSeconds(
      next.ball,
      board.gravity,
      remainingSeconds,
    );
    remainingSeconds -= stepSeconds;
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
    applyPlayfieldRollingResistance(next, board, stepSeconds);
    next.ball.position.x += next.ball.linearVelocity.x * stepSeconds;
    next.ball.position.y += next.ball.linearVelocity.y * stepSeconds;

    if (hasExitedShooterLane(next, board)) {
      next.launcherExited = true;
    }

    resolveWallCollisions(next, board, board.physics.solver);
    resolvePlungerGuideCollisions(next, board, board.physics.solver);
    resolveGuideCollisions(next, board, board.physics.solver);
    resolvePostCollisions(next, board, board.physics.solver);
    resolvePlungerCollision(next, board, plungerFrame, board.physics.solver);
    resolvePlungerGuideCollisions(next, board, board.physics.solver);
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

    // A weak plunge that never crossed the gate is still the same ball.
    // Re-seat it for the next pull instead of leaving it in live-play state.
    if (
      board.plunger.returnGate &&
      !next.launcherExited &&
      !input.launchPressed &&
      next.plunger.pullback === 0 &&
      Math.abs(
        next.ball.position.x -
          board.launchPosition.x -
          next.tableNudge.offset.x,
      ) <= next.ball.radius &&
      Math.abs(
        next.ball.position.y -
          board.launchPosition.y -
          next.tableNudge.offset.y,
      ) <=
        next.ball.radius * 2 &&
      Math.hypot(next.ball.linearVelocity.x, next.ball.linearVelocity.y) < 40
    ) {
      next.status = 'waiting-launch';
      next.ball.position = { ...board.launchPosition };
      next.ball.linearVelocity = { x: 0, y: 0 };
      next.ball.angularVelocity = { x: 0, y: 0 };
    }

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
  } while (remainingSeconds > 1e-9);

  return {
    state: next,
    events,
  };
};

const hasExitedShooterLane = (
  state: GameState,
  board: BoardDefinition,
): boolean => {
  if (board.plunger.returnGate) {
    return hasPassedPlungerReturnGate(board, {
      x: state.ball.position.x - state.tableNudge.offset.x,
      y: state.ball.position.y - state.tableNudge.offset.y,
    });
  }
  const guideTopY = board.launchPosition.y - board.plunger.guideLength;
  const lane = getPlungerLaneBounds(board);

  return (
    state.ball.position.y + state.ball.radius < guideTopY ||
    state.ball.position.x < lane.minX - state.ball.radius * 2 ||
    state.ball.position.x > lane.maxX + state.ball.radius * 2
  );
};

export const applyPlayfieldRollingResistance = (
  state: GameState,
  board: BoardDefinition,
  deltaSeconds: number,
): void => {
  const material = getSurfaceMaterial(
    board.materials.playfield,
    board.surfaceMaterials,
  );
  const speed = Math.hypot(
    state.ball.linearVelocity.x,
    state.ball.linearVelocity.y,
  );

  if (speed > 0) {
    const deceleration = board.gravity * material.rollingResistance;
    const nextSpeed = Math.max(0, speed - deceleration * deltaSeconds);
    const scale = nextSpeed / speed;

    state.ball.linearVelocity.x *= scale;
    state.ball.linearVelocity.y *= scale;
  }

  const spinDamping = Math.max(
    0,
    1 - material.rollingResistance * 2 * deltaSeconds,
  );

  state.ball.angularVelocity.x *= spinDamping;
  state.ball.angularVelocity.y *= spinDamping;
};
