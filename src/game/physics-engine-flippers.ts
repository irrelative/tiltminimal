import type {
  BoardDefinition,
  FlipperDefinition,
  SolverPhysicsDefinition,
} from '../types/board-definition';
import type { ContactData } from './contact-types';
import { getFlipperFaceNormal, sampleFlipperProfile } from './flipper-geometry';
import type { GameState } from './game-state';
import { getSurfaceMaterial } from './materials';
import { interpolate, offsetFlipper } from './physics-helpers';
import type { FlipperMotionFrame } from './physics-motion';
import { getContactTangent, resolveBallContact } from './spin-solver';

export const resolveFlipperCollisions = (
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

  const carrySpeed =
    gravity * slopeGravityScale * downhillProjection * deltaSeconds;
  state.ball.linearVelocity.x += axis.x * carrySpeed;
  state.ball.linearVelocity.y += axis.y * carrySpeed;
};
