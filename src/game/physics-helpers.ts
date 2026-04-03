import type { ContactData } from './contact-types';
import type { GameState } from './game-state';
import { getContactTangent } from './spin-solver';
import type {
  FlipperDefinition,
  GuideDefinition,
  SolverPhysicsDefinition,
  StandupTargetDefinition,
} from '../types/board-definition';

export const interpolate = (
  start: number,
  end: number,
  ratio: number,
): number => start + (end - start) * ratio;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const createStaticContact = (
  material: ContactData['material'],
  point: ContactData['point'],
  normal: ContactData['normal'],
  overlap: number,
  surfaceVelocity: ContactData['surfaceVelocity'] = { x: 0, y: 0 },
): ContactData => ({
  point,
  normal,
  tangent: getContactTangent(normal),
  overlap,
  surfaceVelocity,
  material,
});

export const offsetPoint = <TPoint extends { x: number; y: number }>(
  point: TPoint,
  offset: { x: number; y: number },
): TPoint => ({
  ...point,
  x: point.x + offset.x,
  y: point.y + offset.y,
});

export const offsetFlipper = (
  flipper: FlipperDefinition,
  offset: { x: number; y: number },
): FlipperDefinition => ({
  ...flipper,
  x: flipper.x + offset.x,
  y: flipper.y + offset.y,
});

export const offsetGuide = (
  guide: GuideDefinition,
  offset: { x: number; y: number },
): GuideDefinition =>
  guide.kind === 'arc'
    ? {
        ...guide,
        center: offsetPoint(guide.center, offset),
      }
    : {
        ...guide,
        start: offsetPoint(guide.start, offset),
        end: offsetPoint(guide.end, offset),
      };

export const getVectorMagnitude = (vector: { x: number; y: number }): number =>
  Math.hypot(vector.x, vector.y);

export const movePointToward = (
  current: { x: number; y: number },
  target: { x: number; y: number },
  maxDistance: number,
): { x: number; y: number } => {
  if (maxDistance <= 0) {
    return { ...current };
  }

  const deltaX = target.x - current.x;
  const deltaY = target.y - current.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance === 0 || distance <= maxDistance) {
    return { ...target };
  }

  const scale = maxDistance / distance;

  return {
    x: current.x + deltaX * scale,
    y: current.y + deltaY * scale,
  };
};

export const pointsNearlyEqual = (
  left: { x: number; y: number },
  right: { x: number; y: number },
): boolean =>
  Math.abs(left.x - right.x) <= 0.001 && Math.abs(left.y - right.y) <= 0.001;

export const getOrientedElementCollision = (
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
