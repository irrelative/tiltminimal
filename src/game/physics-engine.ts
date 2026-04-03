import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
  SolverPhysicsDefinition,
} from '../types/board-definition';
import type { ContactData } from './contact-types';
import { getFlipperFaceNormal, sampleFlipperProfile } from './flipper-geometry';
import { projectPointToGuide } from './guide-geometry';
import type {
  GameState,
} from './game-state';
import { resetBall } from './game-state';
import { getSurfaceMaterial } from './materials';
import {
  clamp,
  createStaticContact,
  getOrientedElementCollision,
  interpolate,
  offsetFlipper,
  offsetGuide,
  offsetPoint,
} from './physics-helpers';
import {
  advanceElementStates,
  advanceFlipperFrame,
  advancePlungerFrame,
  advanceTableNudgeState,
  clonePlayingGameState,
  type FlipperMotionFrame,
  type PlungerMotionFrame,
  resolveOccupiedSaucer,
} from './physics-motion';
import {
  getPlungerGuideSegments,
  getPlungerLaneCenterBounds,
} from './plunger-geometry';
import { cloneRulesState, type GameEvent } from './rules-types';
import { getContactTangent, resolveBallContact } from './spin-solver';

const MAX_SIMULATION_STEP_SECONDS = 1 / 120;
const SLINGSHOT_REARM_SECONDS = 0.14;
const MIN_SLINGSHOT_TRIGGER_SPEED = 40;

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

const stepPlayingState = (
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
    next.ball.position.x += next.ball.linearVelocity.x * stepSeconds;
    next.ball.position.y += next.ball.linearVelocity.y * stepSeconds;

    resolveWallCollisions(next, board, board.physics.solver);
    resolvePlungerGuideCollisions(next, board, board.physics.solver);
    resolveGuideCollisions(next, board, board.physics.solver);
    resolvePostCollisions(next, board, board.physics.solver);
    resolvePlungerCollision(next, board, plungerFrame, board.physics.solver);
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
  solver: SolverPhysicsDefinition,
): void => {
  const { ball } = state;
  const wallMaterial = getSurfaceMaterial(
    board.materials.walls,
    board.surfaceMaterials,
  );
  const offset = state.tableNudge.offset;
  const surfaceVelocity = state.tableNudge.velocity;
  const leftWallX = offset.x;
  const rightWallX = offset.x + board.width;
  const topWallY = offset.y;

  if (ball.position.x - ball.radius < leftWallX) {
    const overlap = leftWallX - (ball.position.x - ball.radius);
    const normal = { x: 1, y: 0 };
    const incomingNormalSpeed =
      (ball.linearVelocity.x - surfaceVelocity.x) * normal.x +
      (ball.linearVelocity.y - surfaceVelocity.y) * normal.y;

    if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
      resolveBallContact(
        ball,
        createStaticContact(
          wallMaterial,
          { x: leftWallX, y: ball.position.y },
          normal,
          overlap,
          surfaceVelocity,
        ),
        solver,
      );
    }
  }

  if (ball.position.x + ball.radius > rightWallX) {
    const overlap = ball.position.x + ball.radius - rightWallX;
    const normal = { x: -1, y: 0 };
    const incomingNormalSpeed =
      (ball.linearVelocity.x - surfaceVelocity.x) * normal.x +
      (ball.linearVelocity.y - surfaceVelocity.y) * normal.y;

    if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
      resolveBallContact(
        ball,
        createStaticContact(
          wallMaterial,
          { x: rightWallX, y: ball.position.y },
          normal,
          overlap,
          surfaceVelocity,
        ),
        solver,
      );
    }
  }

  if (ball.position.y - ball.radius < topWallY) {
    const overlap = topWallY - (ball.position.y - ball.radius);
    const normal = { x: 0, y: 1 };
    const incomingNormalSpeed =
      (ball.linearVelocity.x - surfaceVelocity.x) * normal.x +
      (ball.linearVelocity.y - surfaceVelocity.y) * normal.y;

    if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
      resolveBallContact(
        ball,
        createStaticContact(
          wallMaterial,
          { x: ball.position.x, y: topWallY },
          normal,
          overlap,
          surfaceVelocity,
        ),
        solver,
      );
    }
  }
};

const resolveGuideCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  const tableOffset = state.tableNudge.offset;

  for (const guide of board.guides) {
    resolveGuideCollision(
      state,
      board,
      offsetGuide(guide, tableOffset),
      solver,
      state.tableNudge.velocity,
    );
  }
};

const resolvePlungerGuideCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  const tableOffset = state.tableNudge.offset;

  for (const guide of getPlungerGuideSegments(board)) {
    resolveGuideCollision(
      state,
      board,
      offsetGuide(guide, tableOffset),
      solver,
      state.tableNudge.velocity,
    );
  }
};

const resolveGuideCollision = (
  state: GameState,
  board: BoardDefinition,
  guide: GuideDefinition,
  solver: SolverPhysicsDefinition,
  surfaceVelocity: ContactData['surfaceVelocity'] = { x: 0, y: 0 },
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
    (state.ball.linearVelocity.x - surfaceVelocity.x) * projection.normal.x +
    (state.ball.linearVelocity.y - surfaceVelocity.y) * projection.normal.y;
  const contact = createStaticContact(
    guideMaterial,
    projection.point,
    projection.normal,
    overlap,
    surfaceVelocity,
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
      x: board.plunger.x + state.tableNudge.offset.x,
      y: board.plunger.y + state.tableNudge.offset.y + motion.next.pullback,
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
  const surfaceVelocity = {
    x: state.tableNudge.velocity.x + motion.surfaceVelocity.x,
    y: state.tableNudge.velocity.y + motion.surfaceVelocity.y,
  };
  const incomingNormalSpeed =
    (state.ball.linearVelocity.x - surfaceVelocity.x) * collision.normal.x +
    (state.ball.linearVelocity.y - surfaceVelocity.y) * collision.normal.y;

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
      surfaceVelocity,
      material,
      surfaceEffectiveMass: board.physics.plunger.bodyMass,
    },
    solver,
  );
};

const constrainBallToLauncherLane = (
  state: GameState,
  board: BoardDefinition,
): void => {
  if (board.plunger.x <= board.width / 2) {
    return;
  }

  const bounds = getPlungerLaneCenterBounds(board, state.ball.radius);
  const minX = bounds.minX + state.tableNudge.offset.x;
  const maxX = bounds.maxX + state.tableNudge.offset.x;
  const topY = bounds.topY + state.tableNudge.offset.y;
  const bottomY = bounds.bottomY + state.tableNudge.offset.y;
  const leftCaptureMargin = state.ball.radius / 2;
  const rightCaptureMargin = Math.max(
    state.ball.radius,
    board.plunger.thickness * 2,
  );

  if (
    state.ball.position.y + state.ball.radius < topY ||
    state.ball.position.y - state.ball.radius > bottomY
  ) {
    return;
  }

  if (
    state.ball.position.x < minX - leftCaptureMargin ||
    state.ball.position.x > maxX + rightCaptureMargin
  ) {
    return;
  }

  const clampedX = clamp(state.ball.position.x, minX, maxX);

  if (clampedX === state.ball.position.x) {
    return;
  }

  state.ball.position.x = clampedX;

  if (state.ball.position.x <= minX && state.ball.linearVelocity.x < 0) {
    state.ball.linearVelocity.x = 0;
  } else if (
    state.ball.position.x >= maxX &&
    state.ball.linearVelocity.x > 0
  ) {
    state.ball.linearVelocity.x = 0;
  }
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
      offsetPoint(target, state.tableNudge.offset),
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
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) *
        collision.normal.x +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) *
        collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
          state.tableNudge.velocity,
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
      offsetPoint(target, state.tableNudge.offset),
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
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) *
        collision.normal.x +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) *
        collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
          state.tableNudge.velocity,
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
  deltaSeconds: number,
  solver: SolverPhysicsDefinition,
): void => {
  board.flippers.forEach((flipper, index) => {
    const motion = flipperFrame[index];

    if (!motion) {
      return;
    }

    resolveFlipperCollision(state, board, flipper, motion, deltaSeconds, solver);
  });
};

const resolveFlipperCollision = (
  state: GameState,
  board: BoardDefinition,
  flipper: FlipperDefinition,
  motion: FlipperMotionFrame,
  deltaSeconds: number,
  solver: SolverPhysicsDefinition,
): void => {
  const shiftedFlipper = offsetFlipper(flipper, state.tableNudge.offset);
  const collisionAngles = getFlipperCollisionAngles(
    motion,
    board.physics.flipper.collisionAngleStep,
  );

  for (const angle of collisionAngles) {
    if (
      applyFlipperCollisionAtAngle(
        state,
        board,
        shiftedFlipper,
        angle,
        deltaSeconds,
        {
          angularVelocity: motion.next.angularVelocity,
          engaged: motion.next.engaged,
          bodyMass: board.physics.flipper.bodyMass,
          restitutionScale: board.physics.flipper.restitutionScale,
          passiveAngularVelocityThreshold:
            board.physics.flipper.passiveAngularVelocityThreshold,
          passiveRestitutionScale:
            board.physics.flipper.passiveRestitutionScale,
          passiveFrictionScale: board.physics.flipper.passiveFrictionScale,
          passiveSpinDampingScale:
            board.physics.flipper.passiveSpinDampingScale,
          passiveSlopeGravityScale:
            board.physics.flipper.passiveSlopeGravityScale,
          tableVelocity: state.tableNudge.velocity,
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
  deltaSeconds: number,
  motion: {
    angularVelocity: number;
    engaged: boolean;
    bodyMass: number;
    restitutionScale: number;
    passiveAngularVelocityThreshold: number;
    passiveRestitutionScale: number;
    passiveFrictionScale: number;
    passiveSpinDampingScale: number;
    passiveSlopeGravityScale: number;
    tableVelocity: ContactData['surfaceVelocity'];
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
    (state.ball.linearVelocity.x -
      (motion.tableVelocity.x + surfaceVelocityX)) *
      normal.x +
    (state.ball.linearVelocity.y -
      (motion.tableVelocity.y + surfaceVelocityY)) *
      normal.y;
  const isPassiveContact =
    !motion.engaged &&
    Math.abs(motion.angularVelocity) <= motion.passiveAngularVelocityThreshold;
  const contact: ContactData = {
    point: contactPoint,
    normal,
    tangent: getContactTangent(normal),
    overlap,
    surfaceVelocity: {
      x: motion.tableVelocity.x + surfaceVelocityX,
      y: motion.tableVelocity.y + surfaceVelocityY,
    },
    material: flipperMaterial,
    surfaceEffectiveMass:
      contactRadiusSquared > solver.epsilon
        ? flipperMomentOfInertia / contactRadiusSquared
        : Number.POSITIVE_INFINITY,
    restitutionScale: isPassiveContact
      ? motion.passiveRestitutionScale
      : motion.restitutionScale,
    frictionScale: isPassiveContact ? motion.passiveFrictionScale : 1,
    spinDampingScale: isPassiveContact ? motion.passiveSpinDampingScale : 1,
  };

  if (isPassiveContact && incomingNormalSpeed >= 0 && overlap > solver.epsilon) {
    state.ball.position.x += normal.x * overlap;
    state.ball.position.y += normal.y * overlap;
    return true;
  }

  if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
    resolveBallContact(state.ball, contact, solver);
  }

  if (isPassiveContact && deltaSeconds > 0) {
    applyPassiveFlipperSlopeCarry(
      state,
      collisionAngle,
      board.gravity,
      motion.passiveSlopeGravityScale,
      deltaSeconds,
    );
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
    const center = offsetPoint(bumper, state.tableNudge.offset);
    const dx = state.ball.position.x - center.x;
    const dy = state.ball.position.y - center.y;
    const distance = Math.hypot(dx, dy) || solver.epsilon;
    const overlap = state.ball.radius + bumper.radius - distance;

    if (overlap <= 0) {
      continue;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const approachSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) * nx +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) * ny;
    const contact = createStaticContact(
      bumperMaterial,
      {
        x: center.x + nx * bumper.radius,
        y: center.y + ny * bumper.radius,
      },
      { x: nx, y: ny },
      overlap,
      state.tableNudge.velocity,
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

const resolveSlingshotCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.slingshots.forEach((slingshot, index) => {
    const slingshotState = state.slingshots[index];

    if (!slingshotState) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      offsetPoint(slingshot, state.tableNudge.offset),
      slingshot.width,
      slingshot.height,
      slingshot.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const material = getSurfaceMaterial(
      slingshot.material,
      board.surfaceMaterials,
    );
    const surfaceVelocity = state.tableNudge.velocity;
    const incomingNormalSpeed =
      (state.ball.linearVelocity.x - surfaceVelocity.x) * collision.normal.x +
      (state.ball.linearVelocity.y - surfaceVelocity.y) * collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
          surfaceVelocity,
        ),
        solver,
      );
    }

    if (
      slingshotState.cooldownSeconds > 0 ||
      incomingNormalSpeed >= -MIN_SLINGSHOT_TRIGGER_SPEED
    ) {
      return;
    }

    state.ball.linearVelocity.x += collision.normal.x * slingshot.strength;
    state.ball.linearVelocity.y += collision.normal.y * slingshot.strength;
    slingshotState.cooldownSeconds = SLINGSHOT_REARM_SECONDS;
    slingshotState.compression = 1;
    events.push({
      type: 'slingshot-hit',
      index,
      score: slingshot.score,
      tick: state.tick,
    });
  });
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
    const center = offsetPoint(post, state.tableNudge.offset);
    const dx = state.ball.position.x - center.x;
    const dy = state.ball.position.y - center.y;
    const distance = Math.hypot(dx, dy) || solver.epsilon;
    const overlap = state.ball.radius + post.radius - distance;

    if (overlap <= 0) {
      continue;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const approachSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) * nx +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) * ny;
    const contact = createStaticContact(
      postMaterial,
      {
        x: center.x + nx * post.radius,
        y: center.y + ny * post.radius,
      },
      { x: nx, y: ny },
      overlap,
      state.tableNudge.velocity,
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

    const center = offsetPoint(saucer, state.tableNudge.offset);
    const distance = Math.hypot(
      state.ball.position.x - center.x,
      state.ball.position.y - center.y,
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
    state.ball.position.x = center.x;
    state.ball.position.y = center.y;
    state.ball.linearVelocity.x = 0;
    state.ball.linearVelocity.y = 0;
    state.ball.angularVelocity.x = 0;
    state.ball.angularVelocity.y = 0;
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
      offsetPoint(spinner, state.tableNudge.offset),
      spinner.length,
      spinner.thickness,
      spinner.angle + spinnerState.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const crossingSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) *
        collision.normal.x +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) *
        collision.normal.y;

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

    const center = offsetPoint(rollover, state.tableNudge.offset);
    const distance = Math.hypot(
      state.ball.position.x - center.x,
      state.ball.position.y - center.y,
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

const applyPassiveFlipperSlopeCarry = (
  state: GameState,
  collisionAngle: number,
  gravity: number,
  slopeGravityScale: number,
  deltaSeconds: number,
): void => {
  const axis = {
    x: Math.cos(collisionAngle),
    y: Math.sin(collisionAngle),
  };
  const downhillProjection = axis.y;

  if (Math.abs(downhillProjection) <= 0.001) {
    return;
  }

  const carrySpeed = gravity * slopeGravityScale * downhillProjection * deltaSeconds;
  state.ball.linearVelocity.x += axis.x * carrySpeed;
  state.ball.linearVelocity.y += axis.y * carrySpeed;
};
