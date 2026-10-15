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
import { identifyDebugContact } from './physics-debug';
import { isRollingHeelTransfer } from './flipper-feed-contact';

export const resolveRestingFlipperSupport = (
  state: GameState,
  board: BoardDefinition,
  flipperFrame: FlipperMotionFrame[],
  solver: SolverPhysicsDefinition,
): void => {
  const index = state.ball.restingFlipper;
  if (index === undefined) return;
  const motion = flipperFrame[index];
  const flipper = board.flippers[index];
  if (
    !flipper ||
    !motion?.next.engaged ||
    motion.next.angle !== motion.previousAngle
  )
    return;
  resolveFlipperCollision(
    state,
    board,
    flipper,
    motion,
    0,
    solver,
    index,
    true,
  );
};

export const resolveFlipperCollisions = (
  state: GameState,
  board: BoardDefinition,
  flipperFrame: FlipperMotionFrame[],
  deltaSeconds: number,
  solver: SolverPhysicsDefinition,
): void => {
  if (state.ball.restingFlipper !== undefined)
    state.ball.restingFlipper = undefined;
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
  supportOnly = false,
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
          supportOnly,
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
    supportOnly: boolean;
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
  // The buried wire endpoint and round heel form one rolling surface. Using
  // the cap's radial impact normal here creates a ghost launch at their seam.
  // Free falling impacts retain the rounded rubber normal and dead-bounce response.
  const rollingHeelTransfer =
    !motion.engaged &&
    Math.abs(motion.angularVelocity) <=
      motion.passiveAngularVelocityThreshold &&
    collision.t < 0.2 &&
    collision.normal.x * fallbackNormal.x +
      collision.normal.y * fallbackNormal.y >
      0 &&
    isRollingHeelTransfer(
      board,
      board.flippers[motion.index],
      {
        x: state.ball.position.x - state.tableNudge.offset.x,
        y: state.ball.position.y - state.tableNudge.offset.y,
      },
      {
        x: state.ball.linearVelocity.x - motion.tableVelocity.x,
        y: state.ball.linearVelocity.y - motion.tableVelocity.y,
      },
    );
  const normal = {
    ...(rollingHeelTransfer ? fallbackNormal : collision.normal),
  };

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
    state.ball.restingFlipper = motion.index;
    const axis = { x: Math.cos(collisionAngle), y: Math.sin(collisionAngle) };
    const heelDistance = Math.max(
      MIN_CRADLE_POSITION * flipper.length,
      flipper.thickness / 2 + state.ball.radius * 0.5,
    );
    const surfaceVelocity = {
      x:
        motion.tableVelocity.x +
        (liveCatch || motion.carryingLiveCatch ? 0 : surfaceVelocityX),
      y:
        motion.tableVelocity.y +
        (liveCatch || motion.carryingLiveCatch ? 0 : surfaceVelocityY),
    };
    // The 2D heel pocket is a unilateral support contact, rather than a
    // prescribed ball pose. A ball may leave either surface freely.
    const faceContact: ContactData = {
      point: contactPoint,
      normal,
      tangent: getContactTangent(normal),
      overlap: motion.supportOnly ? 0 : overlap,
      surfaceVelocity,
      material: flipperMaterial,
      restitutionScale: 0,
    };
    identifyDebugContact(faceContact, 'flipper', motion.index, 'held-face');
    resolveBallContact(state.ball, faceContact, solver);
    if (incomingNormalSpeed < -40) {
      // Impact absorption belongs to the catch, not to every resting frame.
      const tangentSpeed =
        (state.ball.linearVelocity.x - surfaceVelocity.x) * axis.x +
        (state.ball.linearVelocity.y - surfaceVelocity.y) * axis.y;
      state.ball.linearVelocity.x -= axis.x * tangentSpeed * 0.9;
      state.ball.linearVelocity.y -= axis.y * tangentSpeed * 0.9;
    }
    const heelOverlap = heelDistance - collision.t * flipper.length;
    if (heelOverlap > 0) {
      const heelPoint = {
        x:
          contactPoint.x +
          axis.x *
            (heelDistance - state.ball.radius - collision.t * flipper.length),
        y:
          contactPoint.y +
          axis.y *
            (heelDistance - state.ball.radius - collision.t * flipper.length),
      };
      const heelContact: ContactData = {
        point: heelPoint,
        normal: axis,
        tangent: getContactTangent(axis),
        // Support cancels inward velocity; it must never lift an arriving
        // ball uphill to a prescribed support boundary.
        overlap: 0,
        surfaceVelocity: {
          x:
            motion.tableVelocity.x -
            motion.angularVelocity * (heelPoint.y - flipper.y),
          y:
            motion.tableVelocity.y +
            motion.angularVelocity * (heelPoint.x - flipper.x),
        },
        material: flipperMaterial,
        restitutionScale: 0,
      };
      identifyDebugContact(
        heelContact,
        'flipper',
        motion.index,
        'heel-support',
      );
      resolveBallContact(state.ball, heelContact, solver);
    }
    return true;
  }

  if (motion.supportOnly) return false;

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
    restitutionScale: rollingHeelTransfer
      ? 0
      : isPassiveContact
        ? motion.passiveRestitutionScale
        : motion.restitutionScale,
    frictionScale: isPassiveContact ? motion.passiveFrictionScale : 1,
    spinDampingScale: isPassiveContact ? motion.passiveSpinDampingScale : 1,
  };

  identifyDebugContact(
    contact,
    'flipper',
    motion.index,
    rollingHeelTransfer ? 'feed-seam' : 'bat',
  );

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
