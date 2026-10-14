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
} from './physics-helpers';
import type { PlungerMotionFrame } from './physics-motion';
import {
  getPlungerGuideSegments,
  getPlungerReturnGate,
  getPlungerLaneCenterBounds,
} from './plunger-geometry';
import { getContactTangent, resolveBallContact } from './spin-solver';
import { identifyDebugContact } from './physics-debug';

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
  for (let index = 0; index < board.guides.length; index++) {
    const guide = board.guides[index];
    if ((guide.plane ?? 'playfield') === 'raised') {
      continue;
    }

    resolveGuideCollision(
      state,
      board,
      guide,
      solver,
      state.tableNudge.velocity,
      index,
    );
  }
};

export const resolvePlungerGuideCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  if (state.launcherExited && !board.plunger.returnGate) {
    return;
  }

  const guides = getPlungerGuideSegments(board);
  const gate = getPlungerReturnGate(board);
  if (gate && state.launcherExited) {
    const dx = gate.end.x - gate.start.x;
    const dy = gate.end.y - gate.start.y;
    const exitX = dy,
      exitY = -dx;
    const offset = state.tableNudge.offset;
    const onPlayfieldSide =
      (state.ball.position.x - gate.start.x - offset.x) * exitX +
        (state.ball.position.y - gate.start.y - offset.y) * exitY >=
      0;
    const movingIntoShooter =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) * exitX +
        (state.ball.linearVelocity.y - state.tableNudge.velocity.y) * exitY <
      0;
    // A spring gate blocks return traffic, but opens for an outgoing plunge
    // even after this ball has already visited the playfield.
    if (onPlayfieldSide && movingIntoShooter) {
      resolveGuideCollision(
        state,
        board,
        gate,
        solver,
        state.tableNudge.velocity,
      );
    }
  }

  for (const guide of guides) {
    resolveGuideCollision(
      state,
      board,
      guide,
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
  index?: number,
): void => {
  const offset = state.tableNudge.offset;
  const x = state.ball.position.x - offset.x;
  const y = state.ball.position.y - offset.y;
  const reach = state.ball.radius + guide.thickness / 2;
  // Conservative bounds: a full circle contains every partial arc. Read the
  // definition directly so editor changes never leave a stale geometry cache.
  const minX =
    guide.kind === 'arc'
      ? guide.center.x - guide.radius
      : Math.min(guide.start.x, guide.end.x);
  const maxX =
    guide.kind === 'arc'
      ? guide.center.x + guide.radius
      : Math.max(guide.start.x, guide.end.x);
  const minY =
    guide.kind === 'arc'
      ? guide.center.y - guide.radius
      : Math.min(guide.start.y, guide.end.y);
  const maxY =
    guide.kind === 'arc'
      ? guide.center.y + guide.radius
      : Math.max(guide.start.y, guide.end.y);
  if (
    x < minX - reach ||
    x > maxX + reach ||
    y < minY - reach ||
    y > maxY + reach
  )
    return;
  const projection = projectPointToGuide({ x, y }, guide);
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
    { x: projection.point.x + offset.x, y: projection.point.y + offset.y },
    projection.normal,
    overlap,
    surfaceVelocity,
  );
  identifyDebugContact(
    contact,
    index === undefined ? 'plunger-guide' : 'guide',
    index,
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
  if (state.launcherExited || board.plunger.x <= board.width / 2) {
    return;
  }

  const bounds = getPlungerLaneCenterBounds(board, state.ball.radius);
  const minX = bounds.minX + state.tableNudge.offset.x;
  const maxX = bounds.maxX + state.tableNudge.offset.x;
  const topY = bounds.topY + state.tableNudge.offset.y;
  const bottomY = bounds.bottomY + state.tableNudge.offset.y;
  const leftCaptureMargin =
    state.plunger.pullback > 0 || state.plunger.releaseSpeed > 0
      ? Math.max(state.ball.radius, board.plunger.thickness * 2)
      : state.ball.radius / 2;
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
  } else if (state.ball.position.x >= maxX && state.ball.linearVelocity.x > 0) {
    state.ball.linearVelocity.x = 0;
  }
};
