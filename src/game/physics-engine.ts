import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
  SolverPhysicsDefinition,
  StandupTargetDefinition,
} from '../types/board-definition';
import type { ContactData } from './contact-types';
import { getFlipperFaceNormal, sampleFlipperProfile } from './flipper-geometry';
import { projectPointToGuide } from './guide-geometry';
import type {
  DropTargetState,
  FlipperState,
  GameState,
  PlungerState,
  RolloverState,
  SaucerState,
  SpinnerState,
  StandupTargetState,
} from './game-state';
import { resetBall } from './game-state';
import { getSurfaceMaterial } from './materials';
import { getPlungerGuideSegments } from './plunger-geometry';
import { cloneRulesState, type GameEvent } from './rules-types';
import { getContactTangent, resolveBallContact } from './spin-solver';

const MAX_SIMULATION_STEP_SECONDS = 1 / 120;
const SAUCER_EJECT_ANGLE_JITTER = 0.12;

export const stepGame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): GameState => stepGameFrame(state, board, input, deltaSeconds).state;

export interface PhysicsStepResult {
  state: GameState;
  events: GameEvent[];
}

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

const stepWaitingLaunchState = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PhysicsStepResult => {
  const plungerFrame = advancePlungerFrame(state, board, input, deltaSeconds);
  const flipperFrame = advanceFlipperFrame(state, board, input, deltaSeconds);
  const events: GameEvent[] = [];
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
        z: state.ball.radius,
      },
      linearVelocity: {
        x: 0,
        y: 0,
        z: 0,
      },
      angularVelocity: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
    plunger: plungerFrame.next,
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
    next.ball.position.z = state.ball.radius;
    next.ball.linearVelocity.x = 0;
    next.ball.linearVelocity.y = 0;
    next.ball.linearVelocity.z = 0;
    next.ball.angularVelocity.x = 0;
    next.ball.angularVelocity.y = 0;
    next.ball.angularVelocity.z = 0;
  }

  return { state: next, events };
};

const stepPlayingState = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PhysicsStepResult => {
  const events: GameEvent[] = [];
  const next: GameState = {
    ...state,
    tick: state.tick + 1,
    ball: {
      ...state.ball,
      position: {
        ...state.ball.position,
      },
      linearVelocity: {
        ...state.ball.linearVelocity,
      },
      angularVelocity: {
        ...state.ball.angularVelocity,
      },
    },
    plunger: clonePlungerState(state.plunger),
    flippers: board.flippers.map((flipper, index) =>
      cloneFlipperState(getFlipperState(state, flipper, index)),
    ),
    standupTargets: state.standupTargets.map(cloneStandupTargetState),
    dropTargets: state.dropTargets.map(cloneDropTargetState),
    saucers: state.saucers.map(cloneSaucerState),
    spinners: state.spinners.map(cloneSpinnerState),
    rollovers: state.rollovers.map(cloneRolloverState),
    rules: cloneRulesState(state.rules),
  };
  const stepCount = Math.max(
    1,
    Math.ceil(deltaSeconds / MAX_SIMULATION_STEP_SECONDS),
  );
  const stepSeconds = stepCount > 0 ? deltaSeconds / stepCount : 0;

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
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

    resolveWallCollisions(next, board);
    resolvePlungerGuideCollisions(next, board, board.physics.solver);
    resolveGuideCollisions(next, board, board.physics.solver);
    resolvePostCollisions(next, board, board.physics.solver);
    resolvePlungerCollision(next, board, plungerFrame, board.physics.solver);
    resolveStandupTargetCollisions(next, board, board.physics.solver, events);
    resolveDropTargetCollisions(next, board, board.physics.solver, events);
    resolveBumperCollisions(next, board, board.physics.solver, events);
    resolveFlipperCollisions(next, board, flipperFrame, board.physics.solver);
    resolveSaucerCaptures(next, board, events);
    resolveSpinnerInteractions(next, board, board.physics.solver, events);
    resolveRolloverTriggers(next, board, events);

    if (next.ball.position.y - next.ball.radius > board.drainY) {
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

export const getLaunchChargeRatio = (
  state: GameState,
  board: BoardDefinition,
): number => getPlungerPullRatio(state, board);

export const getPlungerPullRatio = (
  state: GameState,
  board: BoardDefinition,
): number =>
  board.plunger.travel > 0
    ? clamp(state.plunger.pullback / board.plunger.travel, 0, 1)
    : 0;

const resolveWallCollisions = (
  state: GameState,
  board: BoardDefinition,
): void => {
  const { ball } = state;
  const wallMaterial = getSurfaceMaterial(
    board.materials.walls,
    board.surfaceMaterials,
  );

  if (ball.position.x - ball.radius < 0) {
    ball.position.x = ball.radius;
    ball.linearVelocity.x =
      Math.abs(ball.linearVelocity.x) * wallMaterial.restitution;
  }

  if (ball.position.x + ball.radius > board.width) {
    ball.position.x = board.width - ball.radius;
    ball.linearVelocity.x =
      -Math.abs(ball.linearVelocity.x) * wallMaterial.restitution;
  }

  if (ball.position.y - ball.radius < 0) {
    ball.position.y = ball.radius;
    ball.linearVelocity.y =
      Math.abs(ball.linearVelocity.y) * wallMaterial.restitution;
  }
};

const resolveGuideCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  for (const guide of board.guides) {
    resolveGuideCollision(state, board, guide, solver);
  }
};

const resolvePlungerGuideCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  for (const guide of getPlungerGuideSegments(board)) {
    resolveGuideCollision(state, board, guide, solver);
  }
};

const resolveGuideCollision = (
  state: GameState,
  board: BoardDefinition,
  guide: GuideDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  const projection = projectPointToGuide(state.ball.position, guide);
  const overlap = state.ball.radius + guide.thickness / 2 - projection.distance;

  if (overlap <= 0) {
    return;
  }

  const guideMaterial = getSurfaceMaterial(
    guide.material,
    board.surfaceMaterials,
  );
  const incomingNormalSpeed =
    state.ball.linearVelocity.x * projection.normal.x +
    state.ball.linearVelocity.y * projection.normal.y;
  const contact = createStaticContact(
    guideMaterial,
    projection.point,
    projection.normal,
    overlap,
  );

  if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
    resolveBallContact(state.ball, contact, solver);
  }
};

const resolvePlungerCollision = (
  state: GameState,
  board: BoardDefinition,
  motion: PlungerMotionFrame,
  solver: SolverPhysicsDefinition,
): void => {
  const collision = getOrientedElementCollision(
    state,
    {
      x: board.plunger.x,
      y: board.plunger.y + motion.next.pullback,
    },
    board.plunger.length,
    board.plunger.thickness,
    Math.PI / 2,
    solver,
  );

  if (!collision) {
    return;
  }

  const material = getSurfaceMaterial(
    board.plunger.material,
    board.surfaceMaterials,
  );
  const incomingNormalSpeed =
    (state.ball.linearVelocity.x - motion.surfaceVelocity.x) *
      collision.normal.x +
    (state.ball.linearVelocity.y - motion.surfaceVelocity.y) *
      collision.normal.y;

  if (incomingNormalSpeed >= 0 && collision.overlap <= solver.epsilon) {
    return;
  }

  resolveBallContact(
    state.ball,
    {
      point: collision.point,
      normal: collision.normal,
      tangent: getContactTangent(collision.normal),
      overlap: collision.overlap,
      surfaceVelocity: motion.surfaceVelocity,
      material,
      surfaceEffectiveMass: board.physics.plunger.bodyMass,
    },
    solver,
  );
};

const resolveStandupTargetCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.standupTargets.forEach((target, index) => {
    const targetState = state.standupTargets[index];

    if (!targetState) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      target,
      target.width,
      target.height,
      target.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const material = getSurfaceMaterial(
      target.material,
      board.surfaceMaterials,
    );
    const incomingNormalSpeed =
      state.ball.linearVelocity.x * collision.normal.x +
      state.ball.linearVelocity.y * collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
        ),
        solver,
      );
    }

    if (targetState.cooldownSeconds <= 0) {
      events.push({
        type: 'standup-target-hit',
        index,
        score: target.score,
        tick: state.tick,
      });
      targetState.cooldownSeconds = 0.12;
    }
  });
};

const resolveDropTargetCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.dropTargets.forEach((target, index) => {
    const targetState = state.dropTargets[index];

    if (!targetState || targetState.isDown) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      target,
      target.width,
      target.height,
      target.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const material = getSurfaceMaterial(
      target.material,
      board.surfaceMaterials,
    );
    const incomingNormalSpeed =
      state.ball.linearVelocity.x * collision.normal.x +
      state.ball.linearVelocity.y * collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
        ),
        solver,
      );
      events.push({
        type: 'drop-target-hit',
        index,
        score: target.score,
        tick: state.tick,
      });
      targetState.isDown = true;
    }
  });
};

const resolveFlipperCollisions = (
  state: GameState,
  board: BoardDefinition,
  flipperFrame: FlipperMotionFrame[],
  solver: SolverPhysicsDefinition,
): void => {
  board.flippers.forEach((flipper, index) => {
    const motion = flipperFrame[index];

    if (!motion) {
      return;
    }

    resolveFlipperCollision(state, board, flipper, motion, solver);
  });
};

const resolveFlipperCollision = (
  state: GameState,
  board: BoardDefinition,
  flipper: FlipperDefinition,
  motion: FlipperMotionFrame,
  solver: SolverPhysicsDefinition,
): void => {
  const collisionAngles = getFlipperCollisionAngles(
    motion,
    board.physics.flipper.collisionAngleStep,
  );

  for (const angle of collisionAngles) {
    if (
      applyFlipperCollisionAtAngle(
        state,
        board,
        flipper,
        angle,
        {
          angularVelocity: motion.next.angularVelocity,
          bodyMass: board.physics.flipper.bodyMass,
          restitutionScale: board.physics.flipper.restitutionScale,
        },
        solver,
      )
    ) {
      return;
    }
  }
};

const applyFlipperCollisionAtAngle = (
  state: GameState,
  board: BoardDefinition,
  flipper: FlipperDefinition,
  collisionAngle: number,
  motion: {
    angularVelocity: number;
    bodyMass: number;
    restitutionScale: number;
  },
  solver: SolverPhysicsDefinition,
): boolean => {
  const flipperMaterial = getSurfaceMaterial(
    flipper.material,
    board.surfaceMaterials,
  );
  const collision = sampleFlipperProfile(
    state.ball.position,
    flipper,
    collisionAngle,
  );
  const overlap = state.ball.radius + collision.radius - collision.distance;

  if (overlap <= 0) {
    return false;
  }

  const fallbackNormal = getFlipperFaceNormal(flipper, collisionAngle);
  const normal = { ...collision.normal };

  if (normal.x * fallbackNormal.x + normal.y * fallbackNormal.y < 0) {
    normal.x *= -1;
    normal.y *= -1;
  }

  const contactPoint = {
    x: collision.center.x + normal.x * collision.radius,
    y: collision.center.y + normal.y * collision.radius,
  };
  const relativeContactX = contactPoint.x - flipper.x;
  const relativeContactY = contactPoint.y - flipper.y;
  const contactRadiusSquared =
    relativeContactX * relativeContactX + relativeContactY * relativeContactY;
  const flipperMomentOfInertia =
    (motion.bodyMass * flipper.length * flipper.length) / 3;
  const surfaceVelocityX = -motion.angularVelocity * relativeContactY;
  const surfaceVelocityY = motion.angularVelocity * relativeContactX;
  const incomingNormalSpeed =
    (state.ball.linearVelocity.x - surfaceVelocityX) * normal.x +
    (state.ball.linearVelocity.y - surfaceVelocityY) * normal.y;
  const contact: ContactData = {
    point: contactPoint,
    normal,
    tangent: getContactTangent(normal),
    overlap,
    surfaceVelocity: {
      x: surfaceVelocityX,
      y: surfaceVelocityY,
    },
    material: flipperMaterial,
    surfaceEffectiveMass:
      contactRadiusSquared > solver.epsilon
        ? flipperMomentOfInertia / contactRadiusSquared
        : Number.POSITIVE_INFINITY,
    restitutionScale: motion.restitutionScale,
  };

  if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
    resolveBallContact(state.ball, contact, solver);
  }

  return true;
};

const resolveBumperCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  for (const [index, bumper] of board.bumpers.entries()) {
    const bumperMaterial = getSurfaceMaterial(
      bumper.material,
      board.surfaceMaterials,
    );
    const dx = state.ball.position.x - bumper.x;
    const dy = state.ball.position.y - bumper.y;
    const distance = Math.hypot(dx, dy) || solver.epsilon;
    const overlap = state.ball.radius + bumper.radius - distance;

    if (overlap <= 0) {
      continue;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const approachSpeed =
      state.ball.linearVelocity.x * nx + state.ball.linearVelocity.y * ny;
    const contact = createStaticContact(
      bumperMaterial,
      {
        x: bumper.x + nx * bumper.radius,
        y: bumper.y + ny * bumper.radius,
      },
      { x: nx, y: ny },
      overlap,
    );

    if (approachSpeed < 0 || overlap > solver.epsilon) {
      resolveBallContact(state.ball, contact, solver);
      events.push({
        type: 'bumper-hit',
        index,
        score: bumper.score,
        tick: state.tick,
      });
    }
  }
};

const resolvePostCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  for (const post of board.posts) {
    const postMaterial = getSurfaceMaterial(
      post.material,
      board.surfaceMaterials,
    );
    const dx = state.ball.position.x - post.x;
    const dy = state.ball.position.y - post.y;
    const distance = Math.hypot(dx, dy) || solver.epsilon;
    const overlap = state.ball.radius + post.radius - distance;

    if (overlap <= 0) {
      continue;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const approachSpeed =
      state.ball.linearVelocity.x * nx + state.ball.linearVelocity.y * ny;
    const contact = createStaticContact(
      postMaterial,
      {
        x: post.x + nx * post.radius,
        y: post.y + ny * post.radius,
      },
      { x: nx, y: ny },
      overlap,
    );

    if (approachSpeed < 0 || overlap > solver.epsilon) {
      resolveBallContact(state.ball, contact, solver);
    }
  }
};

const resolveSaucerCaptures = (
  state: GameState,
  board: BoardDefinition,
  events: GameEvent[],
): void => {
  board.saucers.forEach((saucer, index) => {
    const saucerState = state.saucers[index];

    if (!saucerState || saucerState.occupied) {
      return;
    }

    const distance = Math.hypot(
      state.ball.position.x - saucer.x,
      state.ball.position.y - saucer.y,
    );

    if (distance > saucer.radius - state.ball.radius * 0.15) {
      return;
    }

    saucerState.occupied = true;
    saucerState.holdSecondsRemaining = saucer.holdSeconds;
    events.push({
      type: 'saucer-captured',
      index,
      score: saucer.score,
      tick: state.tick,
    });
    state.ball.position.x = saucer.x;
    state.ball.position.y = saucer.y;
    state.ball.linearVelocity.x = 0;
    state.ball.linearVelocity.y = 0;
    state.ball.angularVelocity.x = 0;
    state.ball.angularVelocity.y = 0;
    state.ball.angularVelocity.z = 0;
  });
};

const resolveSpinnerInteractions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.spinners.forEach((spinner, index) => {
    const spinnerState = state.spinners[index];

    if (!spinnerState || spinnerState.cooldownSeconds > 0) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      spinner,
      spinner.length,
      spinner.thickness,
      spinner.angle + spinnerState.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const crossingSpeed =
      state.ball.linearVelocity.x * collision.normal.x +
      state.ball.linearVelocity.y * collision.normal.y;

    if (Math.abs(crossingSpeed) < 60) {
      return;
    }

    spinnerState.angularVelocity +=
      Math.sign(-crossingSpeed) * Math.min(Math.abs(crossingSpeed) / 36, 18);
    spinnerState.cooldownSeconds = 0.08;
    events.push({
      type: 'spinner-spin',
      index,
      score: spinner.score,
      tick: state.tick,
    });
  });
};

const resolveRolloverTriggers = (
  state: GameState,
  board: BoardDefinition,
  events: GameEvent[],
): void => {
  board.rollovers.forEach((rollover, index) => {
    const rolloverState = state.rollovers[index];

    if (!rolloverState || rolloverState.lit) {
      return;
    }

    const distance = Math.hypot(
      state.ball.position.x - rollover.x,
      state.ball.position.y - rollover.y,
    );

    if (distance > rollover.radius + state.ball.radius * 0.3) {
      return;
    }

    rolloverState.lit = true;
    events.push({
      type: 'rollover-hit',
      index,
      score: rollover.score,
      tick: state.tick,
    });
  });
};

const interpolate = (start: number, end: number, ratio: number): number =>
  start + (end - start) * ratio;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const advancePlungerFrame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PlungerMotionFrame => {
  const current = state.plunger;
  const pullRatio = getPlungerPullRatio(state, board);
  const pullSpeed =
    board.physics.plunger.maxPullSeconds > 0
      ? board.plunger.travel / board.physics.plunger.maxPullSeconds
      : board.plunger.travel;
  const armedReleaseSpeed = interpolate(
    board.physics.plunger.minReleaseSpeed,
    board.physics.plunger.maxReleaseSpeed,
    pullRatio,
  );
  const releaseSpeed =
    input.launchPressed || current.pullback <= 0
      ? armedReleaseSpeed
      : current.releaseSpeed || armedReleaseSpeed;
  const nextPullback = input.launchPressed
    ? moveToward(
        current.pullback,
        board.plunger.travel,
        pullSpeed * deltaSeconds,
      )
    : moveToward(current.pullback, 0, releaseSpeed * deltaSeconds);
  const nextPullRatio =
    board.plunger.travel > 0
      ? clamp(nextPullback / board.plunger.travel, 0, 1)
      : 0;

  return {
    previousPullback: current.pullback,
    next: {
      pullback: nextPullback,
      releaseSpeed: input.launchPressed
        ? interpolate(
            board.physics.plunger.minReleaseSpeed,
            board.physics.plunger.maxReleaseSpeed,
            nextPullRatio,
          )
        : nextPullback > 0
          ? releaseSpeed
          : 0,
    },
    surfaceVelocity:
      deltaSeconds > 0
        ? {
            x: 0,
            y: (nextPullback - current.pullback) / deltaSeconds,
          }
        : { x: 0, y: 0 },
  };
};

const advanceFlipper = (
  flipper: FlipperDefinition,
  current: FlipperState,
  engaged: boolean,
  deltaSeconds: number,
  swingAngularSpeed: number,
): FlipperMotionFrame => {
  const targetAngle = engaged ? flipper.activeAngle : flipper.restingAngle;
  const maxStep = swingAngularSpeed * deltaSeconds;
  const angle = moveToward(current.angle, targetAngle, maxStep);
  const angularVelocity =
    deltaSeconds > 0 ? (angle - current.angle) / deltaSeconds : 0;

  return {
    previousAngle: current.angle,
    next: {
      engaged,
      angle,
      angularVelocity,
    },
  };
};

const moveToward = (
  current: number,
  target: number,
  maxStep: number,
): number => {
  if (maxStep <= 0) {
    return current;
  }

  const delta = target - current;

  if (Math.abs(delta) <= maxStep) {
    return target;
  }

  return current + Math.sign(delta) * maxStep;
};

const getFlipperCollisionAngles = (
  motion: FlipperMotionFrame,
  collisionAngleStep: number,
): number[] => {
  const delta = motion.next.angle - motion.previousAngle;
  const samples = Math.max(1, Math.ceil(Math.abs(delta) / collisionAngleStep));
  const angles: number[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples;
    angles.push(interpolate(motion.previousAngle, motion.next.angle, ratio));
  }

  return angles;
};

interface FlipperMotionFrame {
  previousAngle: number;
  next: FlipperState;
}

interface PlungerMotionFrame {
  previousPullback: number;
  next: PlungerState;
  surfaceVelocity: ContactData['surfaceVelocity'];
}

const advanceFlipperFrame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): FlipperMotionFrame[] =>
  board.flippers.map((flipper, index) =>
    advanceFlipper(
      flipper,
      getFlipperState(state, flipper, index),
      flipper.side === 'left' ? input.leftPressed : input.rightPressed,
      deltaSeconds,
      board.physics.flipper.swingAngularSpeed,
    ),
  );

const getFlipperState = (
  state: GameState,
  flipper: FlipperDefinition,
  index: number,
): FlipperState => state.flippers[index] ?? createRestingFlipperState(flipper);

const createRestingFlipperState = (
  flipper: FlipperDefinition,
): FlipperState => ({
  engaged: false,
  angle: flipper.restingAngle,
  angularVelocity: 0,
});

const cloneFlipperState = (state: FlipperState): FlipperState => ({
  engaged: state.engaged,
  angle: state.angle,
  angularVelocity: state.angularVelocity,
});

const clonePlungerState = (state: PlungerState): PlungerState => ({
  ...state,
});

const advanceElementStates = (
  state: GameState,
  board: BoardDefinition,
  deltaSeconds: number,
): void => {
  state.standupTargets.forEach((targetState) => {
    targetState.cooldownSeconds = Math.max(
      0,
      targetState.cooldownSeconds - deltaSeconds,
    );
  });

  state.spinners.forEach((spinnerState, index) => {
    spinnerState.cooldownSeconds = Math.max(
      0,
      spinnerState.cooldownSeconds - deltaSeconds,
    );
    spinnerState.angle += spinnerState.angularVelocity * deltaSeconds;
    spinnerState.angularVelocity *= Math.max(0, 1 - deltaSeconds * 7);

    if (Math.abs(spinnerState.angle) > Math.PI * 2) {
      spinnerState.angle %= Math.PI * 2;
    }

    if (Math.abs(spinnerState.angularVelocity) < 0.01) {
      spinnerState.angularVelocity = 0;
    }

    if (!board.spinners[index]) {
      spinnerState.angle = 0;
      spinnerState.angularVelocity = 0;
      spinnerState.cooldownSeconds = 0;
    }
  });
};

const resolveOccupiedSaucer = (
  state: GameState,
  board: BoardDefinition,
  deltaSeconds: number,
): boolean => {
  const occupiedIndex = state.saucers.findIndex((saucer) => saucer.occupied);

  if (occupiedIndex === -1) {
    return false;
  }

  const saucer = board.saucers[occupiedIndex];
  const saucerState = state.saucers[occupiedIndex];

  if (!saucer || !saucerState) {
    return false;
  }

  saucerState.holdSecondsRemaining = Math.max(
    0,
    saucerState.holdSecondsRemaining - deltaSeconds,
  );
  state.ball.position.x = saucer.x;
  state.ball.position.y = saucer.y;
  state.ball.linearVelocity.x = 0;
  state.ball.linearVelocity.y = 0;
  state.ball.angularVelocity.x = 0;
  state.ball.angularVelocity.y = 0;
  state.ball.angularVelocity.z = 0;

  if (saucerState.holdSecondsRemaining === 0) {
    saucerState.occupied = false;
    const ejectAngle =
      saucer.ejectAngle + (Math.random() * 2 - 1) * SAUCER_EJECT_ANGLE_JITTER;
    state.ball.position.x =
      saucer.x + Math.cos(ejectAngle) * (saucer.radius + state.ball.radius + 4);
    state.ball.position.y =
      saucer.y + Math.sin(ejectAngle) * (saucer.radius + state.ball.radius + 4);
    state.ball.linearVelocity.x = Math.cos(ejectAngle) * saucer.ejectSpeed;
    state.ball.linearVelocity.y = Math.sin(ejectAngle) * saucer.ejectSpeed;
  }

  return true;
};

const createStaticContact = (
  material: ReturnType<typeof getSurfaceMaterial>,
  point: ContactData['point'],
  normal: ContactData['normal'],
  overlap: number,
): ContactData => ({
  point,
  normal,
  tangent: getContactTangent(normal),
  overlap,
  surfaceVelocity: {
    x: 0,
    y: 0,
  },
  material,
});

const getOrientedElementCollision = (
  state: GameState,
  element: Pick<StandupTargetDefinition, 'x' | 'y'>,
  length: number,
  thickness: number,
  angle: number,
  solver: SolverPhysicsDefinition,
): {
  point: ContactData['point'];
  normal: ContactData['normal'];
  overlap: number;
} | null => {
  const endpoints = getSegmentEndpoints(element, angle, length);

  return getSegmentCollision(
    state,
    endpoints.start,
    endpoints.end,
    thickness,
    solver,
  );
};

const getSegmentCollision = (
  state: GameState,
  start: ContactData['point'],
  end: ContactData['point'],
  thickness: number,
  solver: SolverPhysicsDefinition,
): {
  point: ContactData['point'];
  normal: ContactData['normal'];
  overlap: number;
} | null => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared <= solver.epsilon) {
    return null;
  }

  const dx = state.ball.position.x - start.x;
  const dy = state.ball.position.y - start.y;
  const projection = clamp(
    (dx * segmentX + dy * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;
  const offsetX = state.ball.position.x - closestX;
  const offsetY = state.ball.position.y - closestY;
  const distance = Math.hypot(offsetX, offsetY) || solver.epsilon;
  const overlap = state.ball.radius + thickness / 2 - distance;

  if (overlap <= 0) {
    return null;
  }

  const segmentLength = Math.sqrt(segmentLengthSquared);
  const fallbackNormal = {
    x: -segmentY / segmentLength,
    y: segmentX / segmentLength,
  };
  const normal =
    Math.abs(offsetX) > solver.epsilon || Math.abs(offsetY) > solver.epsilon
      ? {
          x: offsetX / distance,
          y: offsetY / distance,
        }
      : fallbackNormal;

  return {
    point: { x: closestX, y: closestY },
    normal,
    overlap,
  };
};

const getSegmentEndpoints = (
  element: Pick<StandupTargetDefinition, 'x' | 'y'>,
  angle: number,
  length: number,
): {
  start: ContactData['point'];
  end: ContactData['point'];
} => {
  const halfLength = length / 2;
  const dx = Math.cos(angle) * halfLength;
  const dy = Math.sin(angle) * halfLength;

  return {
    start: {
      x: element.x - dx,
      y: element.y - dy,
    },
    end: {
      x: element.x + dx,
      y: element.y + dy,
    },
  };
};

const cloneStandupTargetState = (
  state: StandupTargetState,
): StandupTargetState => ({
  ...state,
});

const cloneDropTargetState = (state: DropTargetState): DropTargetState => ({
  ...state,
});

const cloneSaucerState = (state: SaucerState): SaucerState => ({
  ...state,
});

const cloneSpinnerState = (state: SpinnerState): SpinnerState => ({
  ...state,
});

const cloneRolloverState = (state: RolloverState): RolloverState => ({
  ...state,
});
