import type {
  ArcGuideDefinition,
  GuideDefinition,
  LineGuideDefinition,
  Point,
} from '../types/board-definition';

export const isArcGuide = (guide: GuideDefinition): guide is ArcGuideDefinition =>
  guide.kind === 'arc';

export const normalizeGuide = (guide: GuideDefinition): GuideDefinition =>
  isArcGuide(guide)
    ? {
        kind: 'arc',
        center: { ...guide.center },
        radius: guide.radius,
        startAngle: guide.startAngle,
        endAngle: guide.endAngle,
        thickness: guide.thickness,
        material: guide.material,
      }
    : {
        kind: 'line',
        start: { ...guide.start },
        end: { ...guide.end },
        thickness: guide.thickness,
        material: guide.material,
      };

export const cloneGuide = (guide: GuideDefinition): GuideDefinition =>
  normalizeGuide(guide);

export const getGuideDistance = (point: Point, guide: GuideDefinition): number =>
  isArcGuide(guide) ? getDistanceToArcGuide(point, guide) : getDistanceToLineGuide(point, guide);

export const getArcGuidePoint = (
  guide: ArcGuideDefinition,
  angle: number,
): Point => ({
  x: guide.center.x + Math.cos(angle) * guide.radius,
  y: guide.center.y + Math.sin(angle) * guide.radius,
});

export const projectPointToGuide = (
  point: Point,
  guide: GuideDefinition,
): {
  distance: number;
  normal: Point;
  point: Point;
} => (isArcGuide(guide) ? projectPointToArcGuide(point, guide) : projectPointToLineGuide(point, guide));

const getDistanceToLineGuide = (
  point: Point,
  guide: LineGuideDefinition,
): number => {
  const segmentX = guide.end.x - guide.start.x;
  const segmentY = guide.end.y - guide.start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - guide.start.x, point.y - guide.start.y);
  }

  const projection = clamp(
    ((point.x - guide.start.x) * segmentX +
      (point.y - guide.start.y) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );
  const closestX = guide.start.x + segmentX * projection;
  const closestY = guide.start.y + segmentY * projection;

  return Math.hypot(point.x - closestX, point.y - closestY);
};

const projectPointToLineGuide = (
  point: Point,
  guide: LineGuideDefinition,
): {
  distance: number;
  normal: Point;
  point: Point;
} => {
  const segmentX = guide.end.x - guide.start.x;
  const segmentY = guide.end.y - guide.start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    const dx = point.x - guide.start.x;
    const dy = point.y - guide.start.y;
    const distance = Math.hypot(dx, dy);
    const normal =
      distance > 0.0001 ? { x: dx / distance, y: dy / distance } : { x: 0, y: -1 };

    return {
      distance,
      normal,
      point: { ...guide.start },
    };
  }

  const projection = clamp(
    ((point.x - guide.start.x) * segmentX +
      (point.y - guide.start.y) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );
  const closestPoint = {
    x: guide.start.x + segmentX * projection,
    y: guide.start.y + segmentY * projection,
  };
  const dx = point.x - closestPoint.x;
  const dy = point.y - closestPoint.y;
  const distance = Math.hypot(dx, dy);
  const normal =
    distance > 0.0001 ? { x: dx / distance, y: dy / distance } : { x: -segmentY, y: segmentX };
  const normalMagnitude = Math.hypot(normal.x, normal.y) || 1;

  return {
    distance,
    normal: {
      x: normal.x / normalMagnitude,
      y: normal.y / normalMagnitude,
    },
    point: closestPoint,
  };
};

const getDistanceToArcGuide = (
  point: Point,
  guide: ArcGuideDefinition,
): number => {
  const projection = projectPointToArcGuide(point, guide);
  return projection.distance;
};

const projectPointToArcGuide = (
  point: Point,
  guide: ArcGuideDefinition,
): {
  distance: number;
  normal: Point;
  point: Point;
} => {
  const pointAngle = Math.atan2(point.y - guide.center.y, point.x - guide.center.x);
  const nearestAngle = clampAngleToArc(pointAngle, guide);
  const closestPoint = getArcGuidePoint(guide, nearestAngle);
  const dx = point.x - closestPoint.x;
  const dy = point.y - closestPoint.y;
  const distance = Math.hypot(dx, dy);
  const normal =
    distance > 0.0001
      ? { x: dx / distance, y: dy / distance }
      : {
          x: Math.cos(nearestAngle),
          y: Math.sin(nearestAngle),
        };

  return {
    distance,
    normal,
    point: closestPoint,
  };
};

const clampAngleToArc = (
  angle: number,
  guide: ArcGuideDefinition,
): number => {
  const start = normalizeAngle(guide.startAngle);
  const sweep = getArcSweep(guide);
  const delta = normalizeAngle(angle - start);

  if (delta <= sweep) {
    return start + delta;
  }

  const end = start + sweep;
  return delta - sweep <= (Math.PI * 2 - delta) ? end : start;
};

const getArcSweep = (guide: ArcGuideDefinition): number => {
  const sweep = normalizeAngle(guide.endAngle - guide.startAngle);

  return sweep === 0 ? Math.PI * 2 : sweep;
};

const normalizeAngle = (angle: number): number => {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
