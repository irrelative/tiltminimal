import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition, Point } from '../types/board-definition';
import { resolveBallBallCollisions } from './ball-ball-collision';
import {
  createBallState,
  createInitialGameState,
  type GameState,
  type Vector2,
} from './game-state';
import { sampleFlipperProfile } from './flipper-geometry';
import { projectPointToGuide } from './guide-geometry';
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
import {
  getPlungerGuideSegments,
  getPlungerLaneBounds,
} from './plunger-geometry';
import { getOrientedElementCollision } from './physics-helpers';
import type { GameEvent } from './rules-types';

export type PhysicsSandboxSpawnMode = 'replace' | 'add';

export interface PhysicsSandboxBall {
  id: number;
  state: GameState;
}

export interface PhysicsSandboxState {
  displayState: GameState;
  balls: PhysicsSandboxBall[];
  paused: boolean;
  spawnMode: PhysicsSandboxSpawnMode;
  spawnLinearVelocity: Vector2;
  spawnAngularVelocity: Vector2;
  selectedBallId: number | null;
  statusMessage: string | null;
  nextBallId: number;
}

export interface PhysicsSandboxSpawnResult {
  state: PhysicsSandboxState;
  spawned: boolean;
}

const ZERO_VECTOR: Vector2 = {
  x: 0,
  y: 0,
};

export const createPhysicsSandboxState = (
  board: BoardDefinition,
): PhysicsSandboxState => ({
  displayState: createSandboxDisplayState(board),
  balls: [],
  paused: false,
  spawnMode: 'replace',
  spawnLinearVelocity: { ...ZERO_VECTOR },
  spawnAngularVelocity: { ...ZERO_VECTOR },
  selectedBallId: null,
  statusMessage: 'Click the playfield to spawn a ball.',
  nextBallId: 1,
});

export const setPhysicsSandboxSpawnMode = (
  state: PhysicsSandboxState,
  spawnMode: PhysicsSandboxSpawnMode,
): PhysicsSandboxState => ({
  ...state,
  spawnMode,
});

export const setPhysicsSandboxPaused = (
  state: PhysicsSandboxState,
  paused: boolean,
): PhysicsSandboxState => ({
  ...state,
  paused,
  statusMessage: paused ? 'Sandbox paused.' : 'Sandbox running.',
});

export const setPhysicsSandboxLinearVelocity = (
  state: PhysicsSandboxState,
  axis: keyof Vector2,
  value: number,
): PhysicsSandboxState => ({
  ...state,
  spawnLinearVelocity: {
    ...state.spawnLinearVelocity,
    [axis]: value,
  },
});

export const setPhysicsSandboxAngularVelocity = (
  state: PhysicsSandboxState,
  axis: keyof Vector2,
  value: number,
): PhysicsSandboxState => ({
  ...state,
  spawnAngularVelocity: {
    ...state.spawnAngularVelocity,
    [axis]: value,
  },
});

export const clearPhysicsSandboxBalls = (
  state: PhysicsSandboxState,
): PhysicsSandboxState => ({
  ...state,
  balls: [],
  selectedBallId: null,
  statusMessage: 'Cleared all sandbox balls.',
});

export const resetPhysicsSandboxState = (
  board: BoardDefinition,
): PhysicsSandboxState => ({
  ...createPhysicsSandboxState(board),
  statusMessage: 'Sandbox reset.',
});

export const getSelectedPhysicsSandboxBall = (
  state: PhysicsSandboxState,
): PhysicsSandboxBall | null => {
  if (state.selectedBallId === null) {
    return state.balls.length > 0 ? state.balls[state.balls.length - 1] : null;
  }

  return state.balls.find((ball) => ball.id === state.selectedBallId) ?? null;
};

export const spawnPhysicsSandboxBall = (
  state: PhysicsSandboxState,
  board: BoardDefinition,
  point: Point,
): PhysicsSandboxSpawnResult => {
  const blockedReason = getPhysicsSandboxSpawnBlockedReason(
    board,
    point,
    state.displayState,
  );

  if (blockedReason) {
    return {
      spawned: false,
      state: {
        ...state,
        statusMessage: blockedReason,
      },
    };
  }

  if (
    state.balls.some(
      (ball) =>
        Math.hypot(
          point.x - ball.state.ball.position.x,
          point.y - ball.state.ball.position.y,
        ) <= board.ball.radius + ball.state.ball.radius,
    )
  ) {
    return {
      spawned: false,
      state: {
        ...state,
        statusMessage: 'Spawn blocked: point overlaps an active ball.',
      },
    };
  }

  const nextBall: PhysicsSandboxBall = {
    id: state.nextBallId,
    state: createPhysicsSandboxBallGameState(
      board,
      state.displayState,
      point,
      state.spawnLinearVelocity,
      state.spawnAngularVelocity,
    ),
  };
  const balls =
    state.spawnMode === 'replace' ? [nextBall] : [...state.balls, nextBall];

  return {
    spawned: true,
    state: {
      ...state,
      balls,
      selectedBallId: nextBall.id,
      nextBallId: state.nextBallId + 1,
      statusMessage: `Spawned ball at ${Math.round(point.x)}, ${Math.round(point.y)}.`,
    },
  };
};

export const stepPhysicsSandbox = (
  state: PhysicsSandboxState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PhysicsSandboxState => {
  if (state.paused) {
    return state;
  }

  const stepDisplay = stepSandboxDisplayState(
    state.displayState,
    board,
    input,
    deltaSeconds,
  );
  let displayState = stepDisplay.state;
  const balls: PhysicsSandboxBall[] = [];

  for (const ball of state.balls) {
    const seededState = seedSandboxBallState(ball.state, displayState, board);
    const steppedBall = stepSandboxBallState(
      seededState,
      board,
      input,
      deltaSeconds,
    );

    if (steppedBall.drained) {
      continue;
    }

    balls.push({
      id: ball.id,
      state: steppedBall.state,
    });
    displayState = copySandboxDynamics(displayState, steppedBall.state, board);
  }

  resolveBallBallCollisions(
    balls
      .filter((ball) => isBallFreeForBallCollision(ball.state))
      .map((ball) => ball.state.ball),
    board.physics.solver,
  );

  const selectedBallId =
    state.selectedBallId !== null &&
    balls.some((ball) => ball.id === state.selectedBallId)
      ? state.selectedBallId
      : balls.length > 0
        ? balls[balls.length - 1]?.id ?? null
        : null;

  return {
    ...state,
    displayState,
    balls,
    selectedBallId,
  };
};

export const getPhysicsSandboxSpawnBlockedReason = (
  board: BoardDefinition,
  point: Point,
  displayState = createSandboxDisplayState(board),
): string | null => {
  const ball = createBallState(board);
  ball.position = { ...point };
  const collisionState = {
    ...displayState,
    ball,
  };

  if (
    point.x < ball.radius ||
    point.x > board.width - ball.radius ||
    point.y < ball.radius ||
    point.y > board.height - ball.radius
  ) {
    return 'Spawn blocked: point lies outside the table bounds.';
  }

  const plungerLane = getPlungerLaneBounds(board);

  if (
    point.x >= plungerLane.minX - ball.radius &&
    point.x <= plungerLane.maxX + ball.radius &&
    point.y >= plungerLane.topY - ball.radius &&
    point.y <= plungerLane.bottomY + ball.radius
  ) {
    return 'Spawn blocked: point lies inside the plunger lane.';
  }

  if (
    board.saucers.some(
      (saucer) =>
        Math.hypot(point.x - saucer.x, point.y - saucer.y) <=
        saucer.radius + ball.radius,
    )
  ) {
    return 'Spawn blocked: point lies inside a saucer pocket.';
  }

  if (
    board.guides.some(
      (guide) =>
        projectPointToGuide(point, guide).distance <=
        guide.thickness / 2 + ball.radius,
    )
  ) {
    return 'Spawn blocked: point overlaps a guide.';
  }

  if (
    getPlungerGuideSegments(board).some(
      (guide) =>
        projectPointToGuide(point, guide).distance <=
        guide.thickness / 2 + ball.radius,
    )
  ) {
    return 'Spawn blocked: point overlaps the plunger guide.';
  }

  if (
    board.posts.some(
      (post) =>
        Math.hypot(point.x - post.x, point.y - post.y) <= post.radius + ball.radius,
    )
  ) {
    return 'Spawn blocked: point overlaps a post.';
  }

  if (
    board.bumpers.some(
      (bumper) =>
        Math.hypot(point.x - bumper.x, point.y - bumper.y) <=
        bumper.radius + ball.radius,
    )
  ) {
    return 'Spawn blocked: point overlaps a bumper.';
  }

  if (
    board.standupTargets.some((target) =>
      Boolean(
        getOrientedElementCollision(
          collisionState,
          target,
          target.height,
          target.width,
          target.angle,
          board.physics.solver,
        ),
      ),
    )
  ) {
    return 'Spawn blocked: point overlaps a standup target.';
  }

  if (
    board.dropTargets.some((target) =>
      Boolean(
        getOrientedElementCollision(
          collisionState,
          target,
          target.height,
          target.width,
          target.angle,
          board.physics.solver,
        ),
      ),
    )
  ) {
    return 'Spawn blocked: point overlaps a drop target.';
  }

  if (
    board.spinners.some((spinner) =>
      Boolean(
        getOrientedElementCollision(
          collisionState,
          spinner,
          spinner.length,
          spinner.thickness,
          spinner.angle,
          board.physics.solver,
        ),
      ),
    )
  ) {
    return 'Spawn blocked: point overlaps a spinner.';
  }

  if (
    board.slingshots.some((slingshot) =>
      Boolean(
        getOrientedElementCollision(
          collisionState,
          slingshot,
          slingshot.width,
          slingshot.height,
          slingshot.angle,
          board.physics.solver,
        ),
      ),
    )
  ) {
    return 'Spawn blocked: point overlaps a slingshot.';
  }

  for (const [index, flipper] of board.flippers.entries()) {
    const flipperState = displayState.flippers[index];

    if (!flipperState) {
      continue;
    }

    const collision = sampleFlipperProfile(point, flipper, flipperState.angle);

    if (collision.distance <= collision.radius + ball.radius) {
      return 'Spawn blocked: point overlaps a flipper.';
    }
  }

  return null;
};

const createSandboxDisplayState = (board: BoardDefinition): GameState => ({
  ...createInitialGameState(board),
  status: 'playing',
});

const createPhysicsSandboxBallGameState = (
  board: BoardDefinition,
  displayState: GameState,
  point: Point,
  linearVelocity: Vector2,
  angularVelocity: Vector2,
): GameState => {
  const state = copySandboxDynamics(
    createSandboxDisplayState(board),
    displayState,
    board,
  );

  return {
    ...state,
    status: 'playing',
    ball: {
      ...state.ball,
      position: { ...point },
      linearVelocity: { ...linearVelocity },
      angularVelocity: { ...angularVelocity },
      angularPosition: { ...ZERO_VECTOR },
    },
  };
};

const seedSandboxBallState = (
  ballState: GameState,
  displayState: GameState,
  board: BoardDefinition,
): GameState => {
  const seeded = copySandboxDynamics(ballState, displayState, board);

  return {
    ...seeded,
    status: 'playing',
    ball: {
      ...ballState.ball,
      position: { ...ballState.ball.position },
      linearVelocity: { ...ballState.ball.linearVelocity },
      angularVelocity: { ...ballState.ball.angularVelocity },
      angularPosition: { ...ballState.ball.angularPosition },
    },
  };
};

const copySandboxDynamics = (
  target: GameState,
  source: GameState,
  board: BoardDefinition,
): GameState => ({
  ...target,
  tick: source.tick,
  status: 'playing',
  plunger: {
    ...source.plunger,
  },
  tableNudge: {
    ...source.tableNudge,
    offset: { ...source.tableNudge.offset },
    velocity: { ...source.tableNudge.velocity },
  },
  flippers: board.flippers.map((_, index) => ({
    ...source.flippers[index],
  })),
  standupTargets: board.standupTargets.map((_, index) => ({
    ...source.standupTargets[index],
  })),
  dropTargets: board.dropTargets.map((_, index) => ({
    ...source.dropTargets[index],
  })),
  saucers: board.saucers.map((_, index) => ({
    ...source.saucers[index],
  })),
  spinners: board.spinners.map((_, index) => ({
    ...source.spinners[index],
  })),
  slingshots: board.slingshots.map((_, index) => ({
    ...source.slingshots[index],
  })),
  rollovers: board.rollovers.map((_, index) => ({
    ...source.rollovers[index],
  })),
});

const stepSandboxDisplayState = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PhysicsStepResult => {
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
  }

  next.ball.position = { ...board.launchPosition };
  next.ball.linearVelocity = { ...ZERO_VECTOR };
  next.ball.angularVelocity = { ...ZERO_VECTOR };
  next.ball.angularPosition = { ...ZERO_VECTOR };

  return {
    state: next,
    events: [],
  };
};

const stepSandboxBallState = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): {
  state: GameState;
  drained: boolean;
} => {
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
    next.ball.position.x += next.ball.linearVelocity.x * stepSeconds;
    next.ball.position.y += next.ball.linearVelocity.y * stepSeconds;

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

    if (
      next.ball.position.y - next.ball.radius >
      board.drainY + next.tableNudge.offset.y
    ) {
      return {
        state: next,
        drained: true,
      };
    }
  }

  return {
    state: next,
    drained: false,
  };
};

const isBallFreeForBallCollision = (state: GameState): boolean =>
  !state.saucers.some((saucer) => saucer.occupied);
