import type {
  FlipperDefinition,
  GuideDefinition,
  Point,
} from '../types/board-definition';

const FLIPPER_TIP_WIDTH_RATIO = 0.72;

export interface FlipperProfileSample {
  center: Point;
  distance: number;
  normal: Point;
  radius: number;
  t: number;
}

export const getFlipperBaseRadius = (flipper: FlipperDefinition): number =>
  flipper.thickness / 2;

export const getFlipperTipRadius = (flipper: FlipperDefinition): number =>
  (flipper.tipThickness ?? flipper.thickness * FLIPPER_TIP_WIDTH_RATIO) / 2;

export const getFlipperRadiusAt = (
  flipper: FlipperDefinition,
  t: number,
): number =>
  interpolate(getFlipperBaseRadius(flipper), getFlipperTipRadius(flipper), t);

export const getFlipperTipPosition = (
  flipper: FlipperDefinition,
  angle: number,
): Point => ({
  x: flipper.x + Math.cos(angle) * flipper.length,
  y: flipper.y + Math.sin(angle) * flipper.length,
});

export const getFlipperFaceNormal = (
  flipper: FlipperDefinition,
  angle: number,
): Point => ({
  x: flipper.side === 'left' ? Math.sin(angle) : -Math.sin(angle),
  y: flipper.side === 'left' ? -Math.cos(angle) : Math.cos(angle),
});

export const sampleFlipperProfile = (
  point: Point,
  flipper: FlipperDefinition,
  angle: number,
): FlipperProfileSample => {
  const tip = getFlipperTipPosition(flipper, angle);
  const segmentX = tip.x - flipper.x;
  const segmentY = tip.y - flipper.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const t =
    segmentLengthSquared > 0
      ? clamp(
          ((point.x - flipper.x) * segmentX +
            (point.y - flipper.y) * segmentY) /
            segmentLengthSquared,
          0,
          1,
        )
      : 0;
  const center = {
    x: flipper.x + segmentX * t,
    y: flipper.y + segmentY * t,
  };
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);
  const normal =
    distance > 0.0001
      ? { x: dx / distance, y: dy / distance }
      : getFlipperFaceNormal(flipper, angle);

  return {
    center,
    distance,
    normal,
    radius: getFlipperRadiusAt(flipper, t),
    t,
  };
};

export const getDistanceToFlipperSurface = (
  point: Point,
  flipper: FlipperDefinition,
  angle = flipper.restingAngle,
): number => {
  const sample = sampleFlipperProfile(point, flipper, angle);

  return sample.distance - sample.radius;
};

const interpolate = (start: number, end: number, ratio: number): number =>
  start + (end - start) * ratio;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** A narrow return may join the stationary heel from outside the moving bat. */
export const isFlipperHeelGuide = (
  guide: GuideDefinition,
  flipper: FlipperDefinition,
): boolean => {
  if (guide.kind === 'arc' || guide.thickness > 4) return false;
  const outside = flipper.side === 'left' ? -1 : 1;
  const heelX = flipper.x;
  const heelY = flipper.y;
  // For any angle the nearest axis point is at most d from the pivot,
  // hence its tapered radius is at least base - taper*d/length and its
  // distance to this endpoint is at most d. Include the entire rail cap.
  // This certifies invariant rubber coverage without exempting moving faces.
  const base = getFlipperBaseRadius(flipper);
  const taper = Math.max(0, base - getFlipperTipRadius(flipper));
  const atHeel = (p: Point) => {
    const d = Math.hypot(p.x - heelX, p.y - heelY);
    return (
      d + guide.thickness / 2 <= base - (taper * d) / flipper.length + 0.01
    );
  };
  const end = atHeel(guide.start)
    ? guide.end
    : atHeel(guide.end)
      ? guide.start
      : null;
  return (
    end !== null &&
    outside * (end.x - heelX) > getFlipperBaseRadius(flipper) &&
    end.y < heelY
  );
};
