import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
} from '../types/board-definition';
import { getSurfaceMaterial } from './materials';
import type { GameState } from './game-state';
import { resetBall } from './game-state';

const MAX_LAUNCH_CHARGE_SECONDS = 1.4;
const MIN_LAUNCH_SPEED = 900;
const MAX_LAUNCH_SPEED = 1850;
const MIN_LAUNCH_DRIFT = -70;
const MAX_LAUNCH_DRIFT = -260;
const FLIPPER_SWING_ANGULAR_SPEED = 3.2;
const EPSILON = 0.0001;

export const stepGame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): GameState => {
  const dt = Math.min(deltaSeconds, 1 / 30);
  const launchChargeDelta = Math.max(deltaSeconds, 0);

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
          leftEngaged: input.leftPressed,
          rightEngaged: input.rightPressed,
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
        leftEngaged: input.leftPressed,
        rightEngaged: input.rightPressed,
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
      leftEngaged: input.leftPressed,
      rightEngaged: input.rightPressed,
    },
  };

  const leftJustPressed = input.leftPressed && !state.flippers.leftEngaged;
  const rightJustPressed = input.rightPressed && !state.flippers.rightEngaged;

  next.ball.linearVelocity.y += board.gravity * dt;
  next.ball.position.x += next.ball.linearVelocity.x * dt;
  next.ball.position.y += next.ball.linearVelocity.y * dt;

  resolveWallCollisions(next, board);
  resolveGuideCollisions(next, board);
  resolveBumperCollisions(next, board);
  resolveFlipperCollisions(next, board, {
    leftJustPressed,
    rightJustPressed,
  });

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

  state.ball.position.x += normalX * overlap;
  state.ball.position.y += normalY * overlap;

  if (incomingNormalSpeed < 0) {
    state.ball.linearVelocity.x -=
      (1 + guideMaterial.restitution) * incomingNormalSpeed * normalX;
    state.ball.linearVelocity.y -=
      (1 + guideMaterial.restitution) * incomingNormalSpeed * normalY;
  }
};

const resolveFlipperCollisions = (
  state: GameState,
  board: BoardDefinition,
  activation: {
    leftJustPressed: boolean;
    rightJustPressed: boolean;
  },
): void => {
  resolveFlipperCollision(
    state,
    board.flippers.left,
    state.flippers.leftEngaged,
    activation.leftJustPressed,
  );
  resolveFlipperCollision(
    state,
    board.flippers.right,
    state.flippers.rightEngaged,
    activation.rightJustPressed,
  );
};

const resolveFlipperCollision = (
  state: GameState,
  flipper: FlipperDefinition,
  engaged: boolean,
  justPressed: boolean,
): void => {
  const activeAngle = engaged ? flipper.activeAngle : flipper.restingAngle;
  const collisionAngles = justPressed
    ? [flipper.restingAngle, flipper.activeAngle]
    : [activeAngle];

  for (const angle of collisionAngles) {
    if (
      applyFlipperCollisionAtAngle(state, flipper, angle, {
        justPressed,
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
    justPressed: boolean;
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
  const flipperAngularVelocity = getFlipperAngularVelocity(flipper, motion);
  const relativeContactX = closestX - flipper.x;
  const relativeContactY = closestY - flipper.y;
  const surfaceVelocityX = -flipperAngularVelocity * relativeContactY;
  const surfaceVelocityY = flipperAngularVelocity * relativeContactX;
  const incomingNormalSpeed =
    (state.ball.linearVelocity.x - surfaceVelocityX) * normalX +
    (state.ball.linearVelocity.y - surfaceVelocityY) * normalY;

  state.ball.position.x += normalX * overlap;
  state.ball.position.y += normalY * overlap;

  if (incomingNormalSpeed < 0) {
    state.ball.linearVelocity.x -=
      (1 + flipperMaterial.restitution) * incomingNormalSpeed * normalX;
    state.ball.linearVelocity.y -=
      (1 + flipperMaterial.restitution) * incomingNormalSpeed * normalY;
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

    state.ball.position.x += nx * overlap;
    state.ball.position.y += ny * overlap;

    if (approachSpeed < 0) {
      state.ball.linearVelocity.x -=
        (1 + bumperMaterial.restitution) * approachSpeed * nx;
      state.ball.linearVelocity.y -=
        (1 + bumperMaterial.restitution) * approachSpeed * ny;
      state.score += bumper.score;
    }
  }
};

const interpolate = (start: number, end: number, ratio: number): number =>
  start + (end - start) * ratio;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getFlipperAngularVelocity = (
  flipper: FlipperDefinition,
  motion: {
    justPressed: boolean;
  },
): number => {
  if (!motion.justPressed) {
    return 0;
  }

  const sweepDirection = Math.sign(flipper.activeAngle - flipper.restingAngle) || 1;
  return FLIPPER_SWING_ANGULAR_SPEED * sweepDirection;
};
