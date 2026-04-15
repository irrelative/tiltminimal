import type { Vector2 } from './contact-types';
import type { BallState } from './game-state';
import { physicsDefaults } from './physics-defaults';
import type { SolverPhysicsDefinition } from '../types/board-definition';

const BALL_COLLISION_RESTITUTION = 0.92;
const BALL_COLLISION_STATIC_FRICTION = 0.18;
const BALL_COLLISION_DYNAMIC_FRICTION = 0.12;
const BALL_COLLISION_POSITION_CORRECTION = 0.92;
const BALL_COLLISION_ITERATIONS = 3;

export const resolveBallBallCollisions = (
  balls: BallState[],
  solver: SolverPhysicsDefinition = physicsDefaults.tuning.solver,
  iterations = BALL_COLLISION_ITERATIONS,
): boolean => {
  let collided = false;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let leftIndex = 0; leftIndex < balls.length; leftIndex += 1) {
      const left = balls[leftIndex];

      if (!left) {
        continue;
      }

      for (
        let rightIndex = leftIndex + 1;
        rightIndex < balls.length;
        rightIndex += 1
      ) {
        const right = balls[rightIndex];

        if (!right) {
          continue;
        }

        collided =
          resolveBallPairCollision(left, right, solver) || collided;
      }
    }
  }

  return collided;
};

export const resolveBallPairCollision = (
  left: BallState,
  right: BallState,
  solver: SolverPhysicsDefinition = physicsDefaults.tuning.solver,
): boolean => {
  const delta = {
    x: right.position.x - left.position.x,
    y: right.position.y - left.position.y,
  };
  const radiusSum = left.radius + right.radius;
  const distance = Math.hypot(delta.x, delta.y);

  if (distance >= radiusSum && distance > solver.epsilon) {
    return false;
  }

  const normal =
    distance > solver.epsilon
      ? {
          x: delta.x / distance,
          y: delta.y / distance,
        }
      : getFallbackCollisionNormal(left, right, solver);
  const overlap = Math.max(0, radiusSum - distance);
  const inverseMassLeft = left.mass > solver.epsilon ? 1 / left.mass : 0;
  const inverseMassRight = right.mass > solver.epsilon ? 1 / right.mass : 0;
  const inverseMassSum = inverseMassLeft + inverseMassRight;

  if (overlap > 0 && inverseMassSum > solver.epsilon) {
    const correctionMagnitude =
      (overlap * BALL_COLLISION_POSITION_CORRECTION) / inverseMassSum;

    left.position.x -= normal.x * correctionMagnitude * inverseMassLeft;
    left.position.y -= normal.y * correctionMagnitude * inverseMassLeft;
    right.position.x += normal.x * correctionMagnitude * inverseMassRight;
    right.position.y += normal.y * correctionMagnitude * inverseMassRight;
  }

  const relativeLinearVelocity = {
    x: right.linearVelocity.x - left.linearVelocity.x,
    y: right.linearVelocity.y - left.linearVelocity.y,
  };
  const relativeNormalSpeed = dot(relativeLinearVelocity, normal);

  let normalImpulse = 0;

  if (relativeNormalSpeed < 0 && inverseMassSum > solver.epsilon) {
    normalImpulse =
      (-(1 + BALL_COLLISION_RESTITUTION) * relativeNormalSpeed) /
      inverseMassSum;

    applyLinearImpulse(left, normal, -normalImpulse);
    applyLinearImpulse(right, normal, normalImpulse);
  }

  const tangent = {
    x: -normal.y,
    y: normal.x,
  };
  const relativeTangentSpeed =
    dot(relativeLinearVelocity, tangent) +
    dot(getSpinSurfaceVelocity(right), tangent) -
    dot(getSpinSurfaceVelocity(left), tangent);
  const tangentImpulse = getTangentImpulse(
    left,
    right,
    relativeTangentSpeed,
    normalImpulse,
    solver,
  );

  if (Math.abs(tangentImpulse) > solver.epsilon) {
    applyLinearImpulse(left, tangent, -tangentImpulse);
    applyLinearImpulse(right, tangent, tangentImpulse);
    applyTangentSpinImpulse(left, tangent, -tangentImpulse);
    applyTangentSpinImpulse(right, tangent, tangentImpulse);
  }

  return overlap > 0 || normalImpulse !== 0 || tangentImpulse !== 0;
};

const getFallbackCollisionNormal = (
  left: BallState,
  right: BallState,
  solver: SolverPhysicsDefinition,
): Vector2 => {
  const relativeVelocity = {
    x: right.linearVelocity.x - left.linearVelocity.x,
    y: right.linearVelocity.y - left.linearVelocity.y,
  };
  const magnitude = Math.hypot(relativeVelocity.x, relativeVelocity.y);

  if (magnitude > solver.epsilon) {
    return {
      x: relativeVelocity.x / magnitude,
      y: relativeVelocity.y / magnitude,
    };
  }

  return { x: 1, y: 0 };
};

const getTangentImpulse = (
  left: BallState,
  right: BallState,
  relativeTangentSpeed: number,
  normalImpulse: number,
  solver: SolverPhysicsDefinition,
): number => {
  if (Math.abs(relativeTangentSpeed) <= solver.epsilon) {
    return 0;
  }

  const inverseMassLeft = left.mass > solver.epsilon ? 1 / left.mass : 0;
  const inverseMassRight = right.mass > solver.epsilon ? 1 / right.mass : 0;
  const tangentialMass =
    inverseMassLeft +
    inverseMassRight +
    (left.radius * left.radius) / left.momentOfInertia +
    (right.radius * right.radius) / right.momentOfInertia;

  if (tangentialMass <= solver.epsilon) {
    return 0;
  }

  const frictionCoefficient =
    Math.abs(relativeTangentSpeed) <= solver.staticSlipThreshold
      ? BALL_COLLISION_STATIC_FRICTION
      : BALL_COLLISION_DYNAMIC_FRICTION;
  const desiredImpulse = -relativeTangentSpeed / tangentialMass;
  const fallbackImpulse =
    Math.min(left.mass, right.mass) * frictionCoefficient * 6;
  const maxImpulse =
    Math.abs(normalImpulse) > solver.epsilon
      ? Math.abs(normalImpulse) * frictionCoefficient
      : fallbackImpulse;

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

const applyTangentSpinImpulse = (
  ball: BallState,
  tangent: Vector2,
  impulseMagnitude: number,
): void => {
  const torqueScale = (ball.radius * impulseMagnitude) / ball.momentOfInertia;
  ball.angularVelocity.x += tangent.y * torqueScale;
  ball.angularVelocity.y -= tangent.x * torqueScale;
};

const getSpinSurfaceVelocity = (ball: BallState): Vector2 => ({
  x: -ball.angularVelocity.y * ball.radius,
  y: ball.angularVelocity.x * ball.radius,
});

const dot = (left: Vector2, right: Vector2): number =>
  left.x * right.x + left.y * right.y;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
