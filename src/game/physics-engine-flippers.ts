import {
  MIN_CRADLE_POSITION,
  MAX_CRADLE_POSITION,
  MAX_CRADLE_CAPTURE_SPEED,
} from './physics-engine-types';
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
  const caughtIndex = state.ball.liveCatchFlipper;
  if (caughtIndex !== undefined) {
    const flipper = board.flippers[caughtIndex];
    const motion = flipperFrame[caughtIndex];
    if (!flipper || !motion?.next.engaged) {
      delete state.ball.liveCatchFlipper;
    } else {
      const shifted = offsetFlipper(flipper, state.tableNudge.offset);
      const profile = sampleFlipperProfile(
        state.ball.position,
        shifted,
        motion.next.angle,
      );
      const normal = getFlipperFaceNormal(shifted, motion.next.angle);
      if (
        profile.t < MIN_CRADLE_POSITION ||
        profile.t > 0.85 ||
        profile.distance > profile.radius + state.ball.radius + 4 ||
        profile.normal.x * normal.x + profile.normal.y * normal.y <= 0 ||
        Math.hypot(state.ball.linearVelocity.x, state.ball.linearVelocity.y) >
          MAX_CRADLE_CAPTURE_SPEED
      ) {
        delete state.ball.liveCatchFlipper;
      }
    }
  }
  board.flippers.forEach((flipper, index) => {
    const motion = flipperFrame[index];

    if (!motion) {
      return;
    }

    resolveFlipperCollision(
      state,
      board,
      flipper,
      motion,
      deltaSeconds,
      solver,
      index,
    );
  });
};

const resolveFlipperCollision = (
  state: GameState,
  board: BoardDefinition,
  flipper: FlipperDefinition,
  motion: FlipperMotionFrame,
  deltaSeconds: number,
  solver: SolverPhysicsDefinition,
  index: number,
): void => {
  const shiftedFlipper = offsetFlipper(flipper, state.tableNudge.offset);
  const carryingLiveCatch = state.ball.liveCatchFlipper === index;
  const collisionAngles = carryingLiveCatch
    ? [motion.next.angle]
    : getFlipperCollisionAngles(
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
          index,
          carryingLiveCatch,
          endingStroke:
            motion.next.engaged &&
            motion.previousAngle !== shiftedFlipper.activeAngle &&
            Math.abs(motion.next.angle - shiftedFlipper.activeAngle) <= 0.08,
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
    index: number;
    carryingLiveCatch: boolean;
    endingStroke: boolean;
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

  const isTopFace =
    normal.x * fallbackNormal.x + normal.y * fallbackNormal.y > 0;

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

  // Rubber at the end stop can absorb a descending ball when the last part
  // of the upstroke meets it. Earlier stroke contacts still make full shots.
  // Use the incoming ball's motion, not flipper-relative speed: an outgoing
  // shot must not be caught merely because the bat is overtaking it.
  const liveCatch =
    motion.endingStroke &&
    Math.abs(collisionAngle - flipper.activeAngle) <= 0.08 &&
    collision.t >= 0.15 &&
    collision.t <= 0.85 &&
    (state.ball.linearVelocity.x - motion.tableVelocity.x) * fallbackNormal.x +
      (state.ball.linearVelocity.y - motion.tableVelocity.y) *
        fallbackNormal.y <
      -200;

  if (
    isTopFace &&
    motion.engaged &&
    (liveCatch ||
      motion.carryingLiveCatch ||
      (Math.abs(motion.angularVelocity) <=
        motion.passiveAngularVelocityThreshold &&
        collision.t >= MIN_CRADLE_POSITION &&
        collision.t <= MAX_CRADLE_POSITION)) &&
    Math.hypot(state.ball.linearVelocity.x, state.ball.linearVelocity.y) <=
      MAX_CRADLE_CAPTURE_SPEED
  ) {
    if (liveCatch) state.ball.liveCatchFlipper = motion.index;
    // Absorb the normal impact, but retain motion along the bat. Gravity has
    // already been integrated; use the solid-sphere rolling fraction (5/7)
    // of its tangential acceleration instead of freezing the caught ball.
    const axis = { x: Math.cos(collisionAngle), y: Math.sin(collisionAngle) };
    let rollingSpeed =
      (state.ball.linearVelocity.x - motion.tableVelocity.x) * axis.x +
      (state.ball.linearVelocity.y - motion.tableVelocity.y) * axis.y -
      (2 / 7) * board.gravity * axis.y * deltaSeconds;
    // Rubber dissipates the incoming catch; sustained gravity contacts keep
    // their tangential velocity so the ball can accelerate down the slope.
    if (incomingNormalSpeed < -40) rollingSpeed *= 0.1;
    // A bounded 2D heel pocket keeps a settled ball on the moving bat rather
    // than letting it balance on the stationary pivot cap. Release bypasses
    // this branch entirely.
    const heelPosition = Math.max(
      MIN_CRADLE_POSITION,
      (state.ball.radius + flipper.thickness / 2) / flipper.length,
    );
    const t = Math.max(heelPosition, collision.t);
    if (collision.t <= heelPosition && rollingSpeed < 0) rollingSpeed = 0;
    const radius =
      sampleFlipperProfile(
        {
          x: flipper.x + axis.x * flipper.length * t,
          y: flipper.y + axis.y * flipper.length * t,
        },
        flipper,
        collisionAngle,
      ).radius + state.ball.radius;
    state.ball.position.x =
      flipper.x + axis.x * flipper.length * t + fallbackNormal.x * radius;
    state.ball.position.y =
      flipper.y + axis.y * flipper.length * t + fallbackNormal.y * radius;
    state.ball.linearVelocity.x =
      motion.tableVelocity.x + axis.x * rollingSpeed;
    state.ball.linearVelocity.y =
      motion.tableVelocity.y + axis.y * rollingSpeed;
    state.ball.angularVelocity.x = (-axis.y * rollingSpeed) / state.ball.radius;
    state.ball.angularVelocity.y = (axis.x * rollingSpeed) / state.ball.radius;
    return true;
  }

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

  if (
    isPassiveContact &&
    incomingNormalSpeed >= 0 &&
    overlap > solver.epsilon
  ) {
    state.ball.position.x += normal.x * overlap;
    state.ball.position.y += normal.y * overlap;
    return true;
  }

  if (incomingNormalSpeed < 0 || overlap > solver.epsilon) {
    resolveBallContact(state.ball, contact, solver);
  }

  if (isPassiveContact && isTopFace && deltaSeconds > 0) {
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
