import { isArcGuide } from './guide-geometry';
import type {
  GuideDefinition,
  LineGuideDefinition,
  Point,
} from '../types/board-definition';

export interface SweptGuideCollision {
  position: Point;
  point: Point;
  normal: Point;
  time: number;
}

export const getSweptGuideCollision = (
  previousPoint: Point,
  nextPoint: Point,
  guide: GuideDefinition,
  collisionRadius: number,
  epsilon: number,
): SweptGuideCollision | null => {
  if (isArcGuide(guide)) {
    return null;
  }

  return getSweptLineGuideCollision(
    previousPoint,
    nextPoint,
    guide,
    collisionRadius,
    epsilon,
  );
};

const getSweptLineGuideCollision = (
  previousPoint: Point,
  nextPoint: Point,
  guide: LineGuideDefinition,
  collisionRadius: number,
  epsilon: number,
): SweptGuideCollision | null => {
  const motion = {
    x: nextPoint.x - previousPoint.x,
    y: nextPoint.y - previousPoint.y,
  };
  const motionLengthSquared = dot(motion, motion);

  if (motionLengthSquared <= epsilon * epsilon) {
    return null;
  }

  const candidates = [
    getSweptSegmentBodyCollision(
      previousPoint,
      motion,
      guide,
      collisionRadius,
      epsilon,
    ),
    getSweptEndpointCollision(
      previousPoint,
      motion,
      guide.start,
      collisionRadius,
      epsilon,
    ),
    getSweptEndpointCollision(
      previousPoint,
      motion,
      guide.end,
      collisionRadius,
      epsilon,
    ),
  ].filter((candidate): candidate is SweptGuideCollision => candidate !== null);

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => left.time - right.time);
  return candidates[0] ?? null;
};

const getSweptSegmentBodyCollision = (
  previousPoint: Point,
  motion: Point,
  guide: LineGuideDefinition,
  collisionRadius: number,
  epsilon: number,
): SweptGuideCollision | null => {
  const segment = {
    x: guide.end.x - guide.start.x,
    y: guide.end.y - guide.start.y,
  };
  const length = Math.hypot(segment.x, segment.y);

  if (length <= epsilon) {
    return null;
  }

  const tangent = {
    x: segment.x / length,
    y: segment.y / length,
  };
  const normal = {
    x: -tangent.y,
    y: tangent.x,
  };
  const relativeStart = {
    x: previousPoint.x - guide.start.x,
    y: previousPoint.y - guide.start.y,
  };
  const signedDistance = dot(relativeStart, normal);
  const signedVelocity = dot(motion, normal);

  if (Math.abs(signedVelocity) <= epsilon) {
    return null;
  }

  const signs = [-1, 1] as const;
  let earliest: SweptGuideCollision | null = null;

  for (const sign of signs) {
    const targetDistance = collisionRadius * sign;
    const time = (targetDistance - signedDistance) / signedVelocity;

    if (time < 0 || time > 1) {
      continue;
    }

    const position = getPositionAtTime(previousPoint, motion, time);
    const longitudinal =
      (position.x - guide.start.x) * tangent.x +
      (position.y - guide.start.y) * tangent.y;

    if (longitudinal < 0 || longitudinal > length) {
      continue;
    }

    const contactPoint = {
      x: guide.start.x + tangent.x * longitudinal,
      y: guide.start.y + tangent.y * longitudinal,
    };
    const contactNormal =
      sign > 0 ? normal : { x: -normal.x, y: -normal.y };

    if (!earliest || time < earliest.time) {
      earliest = {
        position,
        point: contactPoint,
        normal: contactNormal,
        time,
      };
    }
  }

  return earliest;
};

const getSweptEndpointCollision = (
  previousPoint: Point,
  motion: Point,
  center: Point,
  collisionRadius: number,
  epsilon: number,
): SweptGuideCollision | null => {
  const relative = {
    x: previousPoint.x - center.x,
    y: previousPoint.y - center.y,
  };
  const a = dot(motion, motion);

  if (a <= epsilon * epsilon) {
    return null;
  }

  const b = 2 * dot(relative, motion);
  const c = dot(relative, relative) - collisionRadius * collisionRadius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const times = [
    (-b - sqrtDiscriminant) / (2 * a),
    (-b + sqrtDiscriminant) / (2 * a),
  ].filter((time) => time >= 0 && time <= 1);

  if (times.length === 0) {
    return null;
  }

  const time = Math.min(...times);
  const position = getPositionAtTime(previousPoint, motion, time);
  const normal = normalize(
    {
      x: position.x - center.x,
      y: position.y - center.y,
    },
    epsilon,
  );

  if (!normal) {
    return null;
  }

  return {
    position,
    point: center,
    normal,
    time,
  };
};

const getPositionAtTime = (
  previousPoint: Point,
  motion: Point,
  time: number,
): Point => ({
  x: previousPoint.x + motion.x * time,
  y: previousPoint.y + motion.y * time,
});

const normalize = (
  vector: Point,
  epsilon: number,
): Point | null => {
  const magnitude = Math.hypot(vector.x, vector.y);

  if (magnitude <= epsilon) {
    return null;
  }

  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };
};

const dot = (left: Point, right: Point): number =>
  left.x * right.x + left.y * right.y;
