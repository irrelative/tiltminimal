import { getFlipperBySide } from '../boards/table-library';
import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
  SolverPhysicsDefinition,
} from '../types/board-definition';
import type { ContactData } from './contact-types';
import type { FlipperState, GameState } from './game-state';
import { resetBall } from './game-state';
import { getSurfaceMaterial } from './materials';
import { getContactTangent, resolveBallContact } from './spin-solver';

export const stepGame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): GameState => {
  const dt = Math.min(deltaSeconds, 1 / 30);
  const flipperDeltaSeconds = Math.max(deltaSeconds, 0);
  const launchChargeDelta = Math.max(deltaSeconds, 0);
  const { flipper, launch, solver } = board.physics;
  const leftFlipper = getFlipperBySide(board, 'left');
  const rightFlipper = getFlipperBySide(board, 'right');
  const flipperFrame = {
    left: advanceFlipper(
      leftFlipper,
      state.flippers.left,
      input.leftPressed,
      flipperDeltaSeconds,
      flipper.swingAngularSpeed,
    ),
    right: advanceFlipper(
      rightFlipper,
      state.flippers.right,
      input.rightPressed,
      flipperDeltaSeconds,
      flipper.swingAngularSpeed,
    ),
  };

  if (state.status === 'waiting-launch') {
    const chargeSeconds = input.launchPressed
      ? Math.min(
          state.launcher.chargeSeconds + launchChargeDelta,
          launch.maxChargeSeconds,
        )
      : state.launcher.chargeSeconds;

    if (!input.launchPressed && state.launcher.chargeSeconds > 0) {
      const chargeRatio = chargeSeconds / launch.maxChargeSeconds;

      return {
        ...state,
        tick: state.tick + 1,
        status: 'playing',
        launcher: {
          chargeSeconds: 0,
        },
        ball: {
          ...state.ball,
          position: {
            ...state.ball.position,
            x: board.launchPosition.x,
            y: board.launchPosition.y,
            z: state.ball.radius,
          },
          linearVelocity: {
            x: interpolate(
              launch.minLaunchDrift,
              launch.maxLaunchDrift,
              chargeRatio,
            ),
            y: -interpolate(
              launch.minLaunchSpeed,
              launch.maxLaunchSpeed,
              chargeRatio,
            ),
            z: 0,
          },
          angularVelocity: {
            x: 0,
            y: 0,
            z: 0,
          },
        },
        flippers: {
          left: flipperFrame.left.next,
          right: flipperFrame.right.next,
        },
      };
    }

    return {
      ...state,
      tick: state.tick + 1,
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
      launcher: {
        chargeSeconds,
      },
      flippers: {
        left: flipperFrame.left.next,
        right: flipperFrame.right.next,
      },
    };
  }

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
    launcher: {
      chargeSeconds: 0,
    },
    flippers: {
      left: flipperFrame.left.next,
      right: flipperFrame.right.next,
    },
  };

  next.ball.linearVelocity.y += board.gravity * dt;
  next.ball.position.x += next.ball.linearVelocity.x * dt;
  next.ball.position.y += next.ball.linearVelocity.y * dt;

  resolveWallCollisions(next, board);
  resolveGuideCollisions(next, board, solver);
  resolveBumperCollisions(next, board, solver);
  resolveFlipperCollisions(next, board, flipperFrame, solver);

  if (next.ball.position.y - next.ball.radius > board.drainY) {
    return resetBall(next, board);
  }

  return next;
};

export const getLaunchChargeRatio = (
  state: GameState,
  board: BoardDefinition,
): number =>
  Math.min(
    state.launcher.chargeSeconds / board.physics.launch.maxChargeSeconds,
    1,
  );

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

const resolveGuideCollision = (
  state: GameState,
  board: BoardDefinition,
  guide: GuideDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  const guideMaterial = getSurfaceMaterial(
    guide.material,
    board.surfaceMaterials,
  );
  const segmentX = guide.end.x - guide.start.x;
  const segmentY = guide.end.y - guide.start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const dx = state.ball.position.x - guide.start.x;
  const dy = state.ball.position.y - guide.start.y;
  const projection = clamp(
    (dx * segmentX + dy * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  const closestX = guide.start.x + segmentX * projection;
  const closestY = guide.start.y + segmentY * projection;
  const offsetX = state.ball.position.x - closestX;
  const offsetY = state.ball.position.y - closestY;
  const distance = Math.hypot(offsetX, offsetY) || solver.epsilon;
  const overlap = state.ball.radius + guide.thickness / 2 - distance;

  if (overlap <= 0) {
    return;
  }

  const fallbackNormalX = -segmentY / (Math.hypot(segmentX, segmentY) || 1);
  const fallbackNormalY = segmentX / (Math.hypot(segmentX, segmentY) || 1);
  const normalX =
    Math.abs(offsetX) > solver.epsilon || Math.abs(offsetY) > solver.epsilon
      ? offsetX / distance
      : fallbackNormalX;
  const normalY =
    Math.abs(offsetX) > solver.epsilon || Math.abs(offsetY) > solver.epsilon
      ? offsetY / distance
      : fallbackNormalY;
  const incomingNormalSpeed =
    state.ball.linearVelocity.x * normalX +
    state.ball.linearVelocity.y * normalY;
  const contact = createStaticContact(
    guideMaterial,
    { x: closestX, y: closestY },
    { x: normalX, y: normalY },
    overlap,
  );

  if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
    resolveBallContact(state.ball, contact, solver);
  }
};

const resolveFlipperCollisions = (
  state: GameState,
  board: BoardDefinition,
  flipperFrame: {
    left: FlipperMotionFrame;
    right: FlipperMotionFrame;
  },
  solver: SolverPhysicsDefinition,
): void => {
  resolveFlipperCollision(
    state,
    board,
    getFlipperBySide(board, 'left'),
    flipperFrame.left,
    solver,
  );
  resolveFlipperCollision(
    state,
    board,
    getFlipperBySide(board, 'right'),
    flipperFrame.right,
    solver,
  );
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
  },
  solver: SolverPhysicsDefinition,
): boolean => {
  const flipperMaterial = getSurfaceMaterial(
    flipper.material,
    board.surfaceMaterials,
  );
  const segmentX = Math.cos(collisionAngle) * flipper.length;
  const segmentY = Math.sin(collisionAngle) * flipper.length;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const dx = state.ball.position.x - flipper.x;
  const dy = state.ball.position.y - flipper.y;
  const projection = clamp(
    (dx * segmentX + dy * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  const closestX = flipper.x + segmentX * projection;
  const closestY = flipper.y + segmentY * projection;
  const offsetX = state.ball.position.x - closestX;
  const offsetY = state.ball.position.y - closestY;
  const distance = Math.hypot(offsetX, offsetY) || solver.epsilon;
  const collisionRadius = state.ball.radius + flipper.thickness / 2;
  const overlap = collisionRadius - distance;

  if (overlap <= 0) {
    return false;
  }

  const fallbackNormalX = Math.sin(collisionAngle);
  const fallbackNormalY = -Math.cos(collisionAngle);
  const normalX =
    Math.abs(offsetX) > solver.epsilon || Math.abs(offsetY) > solver.epsilon
      ? offsetX / distance
      : fallbackNormalX;
  const normalY =
    Math.abs(offsetX) > solver.epsilon || Math.abs(offsetY) > solver.epsilon
      ? offsetY / distance
      : fallbackNormalY;
  const relativeContactX = closestX - flipper.x;
  const relativeContactY = closestY - flipper.y;
  const surfaceVelocityX = -motion.angularVelocity * relativeContactY;
  const surfaceVelocityY = motion.angularVelocity * relativeContactX;
  const incomingNormalSpeed =
    (state.ball.linearVelocity.x - surfaceVelocityX) * normalX +
    (state.ball.linearVelocity.y - surfaceVelocityY) * normalY;
  const contact: ContactData = {
    point: {
      x: closestX,
      y: closestY,
    },
    normal: {
      x: normalX,
      y: normalY,
    },
    tangent: getContactTangent({ x: normalX, y: normalY }),
    overlap,
    surfaceVelocity: {
      x: surfaceVelocityX,
      y: surfaceVelocityY,
    },
    material: flipperMaterial,
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
): void => {
  for (const bumper of board.bumpers) {
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
      state.score += bumper.score;
    }
  }
};

const interpolate = (start: number, end: number, ratio: number): number =>
  start + (end - start) * ratio;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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

const moveToward = (current: number, target: number, maxStep: number): number => {
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
  const samples = Math.max(
    1,
    Math.ceil(Math.abs(delta) / collisionAngleStep),
  );
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
