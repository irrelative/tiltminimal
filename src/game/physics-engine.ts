import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
} from '../types/board-definition';
import { getContactTangent, resolveBallContact } from './spin-solver';
import type { ContactData } from './contact-types';
import { getSurfaceMaterial } from './materials';
import type { FlipperState, GameState } from './game-state';
import { resetBall } from './game-state';

const MAX_LAUNCH_CHARGE_SECONDS = 1.4;
const MIN_LAUNCH_SPEED = 900;
const MAX_LAUNCH_SPEED = 1850;
const MIN_LAUNCH_DRIFT = -70;
const MAX_LAUNCH_DRIFT = -260;
const FLIPPER_SWING_ANGULAR_SPEED = 3.2;
const FLIPPER_COLLISION_ANGLE_STEP = 0.08;
const EPSILON = 0.0001;

export const stepGame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): GameState => {
  const dt = Math.min(deltaSeconds, 1 / 30);
  const launchChargeDelta = Math.max(deltaSeconds, 0);
  const flipperFrame = {
    left: advanceFlipper(
      board.flippers.left,
      state.flippers.left,
      input.leftPressed,
      dt,
    ),
    right: advanceFlipper(
      board.flippers.right,
      state.flippers.right,
      input.rightPressed,
      dt,
    ),
  };

  if (state.status === 'waiting-launch') {
    const chargeSeconds = input.launchPressed
      ? Math.min(
          state.launcher.chargeSeconds + launchChargeDelta,
          MAX_LAUNCH_CHARGE_SECONDS,
        )
      : state.launcher.chargeSeconds;

    if (!input.launchPressed && state.launcher.chargeSeconds > 0) {
      const chargeRatio = chargeSeconds / MAX_LAUNCH_CHARGE_SECONDS;

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
            x: interpolate(MIN_LAUNCH_DRIFT, MAX_LAUNCH_DRIFT, chargeRatio),
            y: -interpolate(MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED, chargeRatio),
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
  resolveGuideCollisions(next, board);
  resolveBumperCollisions(next, board);
  resolveFlipperCollisions(next, board, flipperFrame);

  if (next.ball.position.y - next.ball.radius > board.drainY) {
    return resetBall(next, board);
  }

  return next;
};

export const getLaunchChargeRatio = (state: GameState): number =>
  Math.min(state.launcher.chargeSeconds / MAX_LAUNCH_CHARGE_SECONDS, 1);

const resolveWallCollisions = (
  state: GameState,
  board: BoardDefinition,
): void => {
  const { ball } = state;
  const wallMaterial = getSurfaceMaterial(board.materials.walls);

  if (ball.position.x - ball.radius < 0) {
    ball.position.x = ball.radius;
    ball.linearVelocity.x = Math.abs(ball.linearVelocity.x) * wallMaterial.restitution;
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
): void => {
  for (const guide of board.guides) {
    resolveGuideCollision(state, guide);
  }
};

const resolveGuideCollision = (
  state: GameState,
  guide: GuideDefinition,
): void => {
  const guideMaterial = getSurfaceMaterial(guide.material);
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
  const distance = Math.hypot(offsetX, offsetY) || EPSILON;
  const overlap = state.ball.radius + guide.thickness / 2 - distance;

  if (overlap <= 0) {
    return;
  }

  const fallbackNormalX = -segmentY / (Math.hypot(segmentX, segmentY) || 1);
  const fallbackNormalY = segmentX / (Math.hypot(segmentX, segmentY) || 1);
  const normalX =
    Math.abs(offsetX) > EPSILON || Math.abs(offsetY) > EPSILON
      ? offsetX / distance
      : fallbackNormalX;
  const normalY =
    Math.abs(offsetX) > EPSILON || Math.abs(offsetY) > EPSILON
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

  if (incomingNormalSpeed < 0 || overlap > EPSILON) {
    resolveBallContact(state.ball, contact);
  }
};

const resolveFlipperCollisions = (
  state: GameState,
  board: BoardDefinition,
  flipperFrame: {
    left: FlipperMotionFrame;
    right: FlipperMotionFrame;
  },
): void => {
  resolveFlipperCollision(
    state,
    board.flippers.left,
    flipperFrame.left,
  );
  resolveFlipperCollision(
    state,
    board.flippers.right,
    flipperFrame.right,
  );
};

const resolveFlipperCollision = (
  state: GameState,
  flipper: FlipperDefinition,
  motion: FlipperMotionFrame,
): void => {
  const collisionAngles = getFlipperCollisionAngles(motion);

  for (const angle of collisionAngles) {
    if (
      applyFlipperCollisionAtAngle(state, flipper, angle, {
        angularVelocity: motion.next.angularVelocity,
      })
    ) {
      return;
    }
  }
};

const applyFlipperCollisionAtAngle = (
  state: GameState,
  flipper: FlipperDefinition,
  collisionAngle: number,
  motion: {
    angularVelocity: number;
  },
): boolean => {
  const angle = collisionAngle;
  const flipperMaterial = getSurfaceMaterial(flipper.material);
  const segmentX = Math.cos(angle) * flipper.length;
  const segmentY = Math.sin(angle) * flipper.length;
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
  const distance = Math.hypot(offsetX, offsetY) || EPSILON;
  const collisionRadius = state.ball.radius + flipper.thickness / 2;
  const overlap = collisionRadius - distance;

  if (overlap <= 0) {
    return false;
  }

  const fallbackNormalX = Math.sin(angle);
  const fallbackNormalY = -Math.cos(angle);
  const normalX = Math.abs(offsetX) > EPSILON || Math.abs(offsetY) > EPSILON
    ? offsetX / distance
    : fallbackNormalX;
  const normalY = Math.abs(offsetX) > EPSILON || Math.abs(offsetY) > EPSILON
    ? offsetY / distance
    : fallbackNormalY;
  const flipperAngularVelocity = motion.angularVelocity;
  const relativeContactX = closestX - flipper.x;
  const relativeContactY = closestY - flipper.y;
  const surfaceVelocityX = -flipperAngularVelocity * relativeContactY;
  const surfaceVelocityY = flipperAngularVelocity * relativeContactX;
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

  if (incomingNormalSpeed < 0 || overlap > EPSILON) {
    resolveBallContact(state.ball, contact);
  }

  return true;
};

const resolveBumperCollisions = (
  state: GameState,
  board: BoardDefinition,
): void => {
  for (const bumper of board.bumpers) {
    const bumperMaterial = getSurfaceMaterial(bumper.material);
    const dx = state.ball.position.x - bumper.x;
    const dy = state.ball.position.y - bumper.y;
    const distance = Math.hypot(dx, dy) || 0.0001;
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

    if (approachSpeed < 0 || overlap > EPSILON) {
      resolveBallContact(state.ball, contact);
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
): FlipperMotionFrame => {
  const targetAngle = engaged ? flipper.activeAngle : flipper.restingAngle;
  const maxStep = FLIPPER_SWING_ANGULAR_SPEED * deltaSeconds;
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

const getFlipperCollisionAngles = (motion: FlipperMotionFrame): number[] => {
  const delta = motion.next.angle - motion.previousAngle;
  const samples = Math.max(
    1,
    Math.ceil(Math.abs(delta) / FLIPPER_COLLISION_ANGLE_STEP),
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
