import type {
  BoardDefinition,
  GuideDefinition,
  SolverPhysicsDefinition,
} from '../types/board-definition';
import type { ContactData } from './contact-types';
import type { GameState } from './game-state';
import { projectPointToGuide } from './guide-geometry';
import { getSurfaceMaterial } from './materials';
import {
  clamp,
  createStaticContact,
  getOrientedElementCollision,
  offsetGuide,
} from './physics-helpers';
import type { PlungerMotionFrame } from './physics-motion';
import {
  getPlungerGuideSegments,
  getPlungerLaneCenterBounds,
} from './plunger-geometry';
import { getContactTangent, resolveBallContact } from './spin-solver';

export const resolveWallCollisions = (
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

export const resolveGuideCollisions = (
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

export const resolvePlungerGuideCollisions = (
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

export const resolvePlungerCollision = (
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

export const constrainBallToLauncherLane = (
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
