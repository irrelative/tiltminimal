import { getFlipperBySide } from '../boards/table-library';
import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperDefinition,
  GuideDefinition,
  SolverPhysicsDefinition,
  StandupTargetDefinition,
} from '../types/board-definition';
import type { ContactData } from './contact-types';
import type {
  DropTargetState,
  FlipperState,
  GameState,
  RolloverState,
  SaucerState,
  SpinnerState,
  StandupTargetState,
} from './game-state';
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
    standupTargets: state.standupTargets.map(cloneStandupTargetState),
    dropTargets: state.dropTargets.map(cloneDropTargetState),
    saucers: state.saucers.map(cloneSaucerState),
    spinners: state.spinners.map(cloneSpinnerState),
    rollovers: state.rollovers.map(cloneRolloverState),
  };

  advanceElementStates(next, board, dt);

  if (resolveOccupiedSaucer(next, board, dt)) {
    return next;
  }

  next.ball.linearVelocity.y += board.gravity * dt;
  next.ball.position.x += next.ball.linearVelocity.x * dt;
  next.ball.position.y += next.ball.linearVelocity.y * dt;

  resolveWallCollisions(next, board);
  resolveGuideCollisions(next, board, solver);
  resolveStandupTargetCollisions(next, board, solver);
  resolveDropTargetCollisions(next, board, solver);
  resolveBumperCollisions(next, board, solver);
  resolveFlipperCollisions(next, board, flipperFrame, solver);
  resolveSaucerCaptures(next, board);
  resolveSpinnerInteractions(next, board, solver);
  resolveRolloverTriggers(next, board);

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
  const collision = getSegmentCollision(
    state,
    guide.start,
    guide.end,
    guide.thickness,
    solver,
  );

  if (!collision) {
    return;
  }

  const guideMaterial = getSurfaceMaterial(
    guide.material,
    board.surfaceMaterials,
  );
  const incomingNormalSpeed =
    state.ball.linearVelocity.x * collision.normal.x +
    state.ball.linearVelocity.y * collision.normal.y;
  const contact = createStaticContact(
    guideMaterial,
    collision.point,
    collision.normal,
    collision.overlap,
  );

  if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
    resolveBallContact(state.ball, contact, solver);
  }
};

const resolveStandupTargetCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
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

    const material = getSurfaceMaterial(target.material, board.surfaceMaterials);
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
      state.score += target.score;
      targetState.cooldownSeconds = 0.12;
    }
  });
};

const resolveDropTargetCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
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

    const material = getSurfaceMaterial(target.material, board.surfaceMaterials);
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
      state.score += target.score;
      targetState.isDown = true;
    }
  });
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
  const endpoints = {
    start: {
      x: flipper.x,
      y: flipper.y,
    },
    end: {
      x: flipper.x + Math.cos(collisionAngle) * flipper.length,
      y: flipper.y + Math.sin(collisionAngle) * flipper.length,
    },
  };
  const collision = getSegmentCollision(
    state,
    endpoints.start,
    endpoints.end,
    flipper.thickness,
    solver,
  );

  if (!collision) {
    return false;
  }

  const fallbackNormal = {
    x: Math.sin(collisionAngle),
    y: -Math.cos(collisionAngle),
  };

  if (
    collision.normal.x * fallbackNormal.x +
      collision.normal.y * fallbackNormal.y <
    0
  ) {
    collision.normal.x *= -1;
    collision.normal.y *= -1;
  }

  const relativeContactX = collision.point.x - flipper.x;
  const relativeContactY = collision.point.y - flipper.y;
  const contactRadiusSquared =
    relativeContactX * relativeContactX + relativeContactY * relativeContactY;
  const flipperMomentOfInertia =
    (motion.bodyMass * flipper.length * flipper.length) / 3;
  const surfaceVelocityX = -motion.angularVelocity * relativeContactY;
  const surfaceVelocityY = motion.angularVelocity * relativeContactX;
  const incomingNormalSpeed =
    (state.ball.linearVelocity.x - surfaceVelocityX) * collision.normal.x +
    (state.ball.linearVelocity.y - surfaceVelocityY) * collision.normal.y;
  const contact: ContactData = {
    point: collision.point,
    normal: collision.normal,
    tangent: getContactTangent(collision.normal),
    overlap: collision.overlap,
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

  if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
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

const resolveSaucerCaptures = (
  state: GameState,
  board: BoardDefinition,
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
    state.score += saucer.score;
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
    state.score += spinner.score;
  });
};

const resolveRolloverTriggers = (
  state: GameState,
  board: BoardDefinition,
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
    state.score += rollover.score;
  });
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
    state.ball.position.x =
      saucer.x + Math.cos(saucer.ejectAngle) * (saucer.radius + state.ball.radius + 4);
    state.ball.position.y =
      saucer.y + Math.sin(saucer.ejectAngle) * (saucer.radius + state.ball.radius + 4);
    state.ball.linearVelocity.x = Math.cos(saucer.ejectAngle) * saucer.ejectSpeed;
    state.ball.linearVelocity.y = Math.sin(saucer.ejectAngle) * saucer.ejectSpeed;
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

const cloneDropTargetState = (
  state: DropTargetState,
): DropTargetState => ({
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
