import type { BallState } from './game-state';
import type { ContactData, ContactImpulseResult, Vector2 } from './contact-types';
import { physicsDefaults } from './physics-defaults';
import type { SolverPhysicsDefinition } from '../types/board-definition';

export const resolveBallContact = (
  ball: BallState,
  contact: ContactData,
  solver: SolverPhysicsDefinition = physicsDefaults.tuning.solver,
): ContactImpulseResult => {
  ball.position.x += contact.normal.x * contact.overlap;
  ball.position.y += contact.normal.y * contact.overlap;

  const relativeNormalSpeed = getRelativeNormalSpeed(ball, contact);
  let normalImpulse = 0;

  if (relativeNormalSpeed < 0) {
    const inverseSurfaceMass =
      contact.surfaceEffectiveMass !== undefined &&
      Number.isFinite(contact.surfaceEffectiveMass) &&
      contact.surfaceEffectiveMass > solver.epsilon
        ? 1 / contact.surfaceEffectiveMass
        : 0;
    const effectiveRestitution =
      contact.material.restitution * (contact.restitutionScale ?? 1);

    normalImpulse =
      (-(1 + effectiveRestitution) * relativeNormalSpeed) /
      (1 / ball.mass + inverseSurfaceMass);

    applyLinearImpulse(ball, contact.normal, normalImpulse);
  }

  const relativeTangentSpeed = getRelativeTangentSpeed(ball, contact);
  const tangentImpulse = getTangentImpulse(ball, contact, {
    normalImpulse,
    relativeTangentSpeed,
  }, solver);

  if (Math.abs(tangentImpulse) > solver.epsilon) {
    applyTangentImpulse(ball, contact, tangentImpulse);
  }

  if (Math.abs(ball.angularVelocity.z) > solver.epsilon) {
    const spinDampingFactor = Math.max(0, 1 - contact.material.spinDamping * 0.12);
    ball.angularVelocity.z *= spinDampingFactor;
  }

  return {
    normalImpulse,
    tangentImpulse,
    relativeNormalSpeed,
    relativeTangentSpeed,
  };
};

export const getContactTangent = (normal: Vector2): Vector2 => ({
  x: -normal.y,
  y: normal.x,
});

const getRelativeNormalSpeed = (
  ball: BallState,
  contact: ContactData,
): number => {
  const relativeLinearVelocity = {
    x: ball.linearVelocity.x - contact.surfaceVelocity.x,
    y: ball.linearVelocity.y - contact.surfaceVelocity.y,
  };

  return dot(relativeLinearVelocity, contact.normal);
};

const getRelativeTangentSpeed = (
  ball: BallState,
  contact: ContactData,
): number => {
  const relativeLinearVelocity = {
    x: ball.linearVelocity.x - contact.surfaceVelocity.x,
    y: ball.linearVelocity.y - contact.surfaceVelocity.y,
  };
  const spinSurfaceSpeed = -ball.angularVelocity.z * ball.radius;

  return dot(relativeLinearVelocity, contact.tangent) + spinSurfaceSpeed;
};

const getTangentImpulse = (
  ball: BallState,
  contact: ContactData,
  inputs: {
    normalImpulse: number;
    relativeTangentSpeed: number;
  },
  solver: SolverPhysicsDefinition,
): number => {
  if (Math.abs(inputs.relativeTangentSpeed) <= solver.epsilon) {
    return 0;
  }

  const frictionCoefficient =
    Math.abs(inputs.relativeTangentSpeed) <= solver.staticSlipThreshold
      ? contact.material.staticFriction
      : contact.material.dynamicFriction;
  const effectiveFriction = frictionCoefficient * contact.material.grip;
  const tangentialMass =
    1 / ball.mass + (ball.radius * ball.radius) / ball.momentOfInertia;
  const desiredImpulse = -inputs.relativeTangentSpeed / tangentialMass;
  const maxImpulse =
    Math.abs(inputs.normalImpulse) > solver.epsilon
      ? Math.abs(inputs.normalImpulse) * effectiveFriction
      : ball.mass * effectiveFriction * 8;

  return clamp(desiredImpulse, -maxImpulse, maxImpulse);
};

const applyLinearImpulse = (
  ball: BallState,
  direction: Vector2,
  impulseMagnitude: number,
): void => {
  ball.linearVelocity.x += (direction.x * impulseMagnitude) / ball.mass;
  ball.linearVelocity.y += (direction.y * impulseMagnitude) / ball.mass;
};

const applyTangentImpulse = (
  ball: BallState,
  contact: ContactData,
  impulseMagnitude: number,
): void => {
  applyLinearImpulse(ball, contact.tangent, impulseMagnitude);

  const torque = -ball.radius * impulseMagnitude;
  ball.angularVelocity.z += torque / ball.momentOfInertia;
}

const dot = (left: Vector2, right: Vector2): number =>
  left.x * right.x + left.y * right.y;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
