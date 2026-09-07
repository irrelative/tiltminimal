import type { Point } from '../../types/board-definition';
import type { RouteGoal } from '../../types/ball-route';
import {
  arc,
  polyline,
  rail,
  requireClearance,
  type BoardAssembly,
} from './shared';

export interface ShotLaneOptions {
  id: string;
  outerPath: Point[];
  innerPath: Point[];
  spinner: { position: Point; length: number; angle: number; score: number };
  entry: Point;
  entryVelocities: Point[];
  exit: Extract<RouteGoal, { type: 'region' }>;
}
export const createShotLaneAssembly = (o: ShotLaneOptions): BoardAssembly => {
  if (o.outerPath.length < 2 || o.innerPath.length < 2)
    throw new Error('A shot lane needs two continuous wall paths.');
  if (!o.entryVelocities.length)
    throw new Error('A shot lane needs an approach velocity.');
  return {
    guides: [...polyline(o.outerPath), ...polyline(o.innerPath)],
    spinners: [{ ...o.spinner, thickness: 10, material: 'metalGuide' }],
    routes: [
      {
        id: `${o.id}/continuation`,
        start: {
          type: 'feed',
          position: o.entry,
          velocities: o.entryVelocities,
        },
        goals: [
          {
            type: 'event',
            event: 'spinner-spin',
            position: o.spinner.position,
          },
          o.exit,
        ],
        timeoutSeconds: 5,
      },
    ],
  };
};

export interface TargetBankOptions {
  id: string;
  first: Point;
  step: Point;
  standupCount: number;
  endDropTarget?: boolean;
  targetWidth: number;
  targetHeight: number;
  backingOffset: Point;
  backingExtension: number;
  standupScore: number;
  dropScore?: number;
  returnRegion: Extract<RouteGoal, { type: 'region' }>;
  ballRadius?: number;
}
export const createTargetBankAssembly = (
  o: TargetBankOptions,
): BoardAssembly => {
  if (!Number.isInteger(o.standupCount) || o.standupCount < 1)
    throw new Error('A target bank needs at least one standup.');
  const spacing = Math.hypot(o.step.x, o.step.y);
  requireClearance(spacing, o.targetWidth, 'Target spacing');
  const normalOffset =
    ((-o.step.y * o.backingOffset.x + o.step.x * o.backingOffset.y) / spacing) *
    (o.step.x < 0 ? -1 : 1);
  if (normalOffset >= -(o.targetHeight / 2 + 6))
    throw new Error('Target backing must sit behind the scoring faces.');
  const count = o.standupCount + Number(Boolean(o.endDropTarget));
  const angle = Math.atan2(o.step.y, o.step.x);
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  // Orient the accessible face toward the lower playfield.
  if (normal.y < 0) {
    normal.x *= -1;
    normal.y *= -1;
  }
  const position = (index: number) => ({
    x: o.first.x + o.step.x * index,
    y: o.first.y + o.step.y * index,
  });
  const target = (index: number, score: number) => ({
    position: position(index),
    width: o.targetWidth,
    height: o.targetHeight,
    angle,
    score,
    material: 'rubberPost' as const,
  });
  const last = position(count - 1);
  const extension = {
    x: (o.step.x / spacing) * o.backingExtension,
    y: (o.step.y / spacing) * o.backingExtension,
  };
  return {
    standupTargets: Array.from({ length: o.standupCount }, (_, index) =>
      target(index, o.standupScore),
    ),
    dropTargets: o.endDropTarget
      ? [target(count - 1, o.dropScore ?? o.standupScore)]
      : [],
    guides: [
      rail(
        {
          x: o.first.x + o.backingOffset.x - extension.x,
          y: o.first.y + o.backingOffset.y - extension.y,
        },
        {
          x: last.x + o.backingOffset.x + extension.x,
          y: last.y + o.backingOffset.y + extension.y,
        },
      ),
    ],
    routes: Array.from({ length: count }, (_, index) => {
      const center = position(index);
      const distance = o.targetHeight / 2 + (o.ballRadius ?? 16) + 18;
      return {
        id: `${o.id}/target-${index}`,
        start: {
          type: 'feed' as const,
          position: {
            x: center.x + normal.x * distance,
            y: center.y + normal.y * distance,
          },
          velocities: [500, 800].map((speed) => ({
            x: -normal.x * speed,
            y: -normal.y * speed,
          })),
        },
        goals: [
          {
            type: 'event' as const,
            event:
              index < o.standupCount
                ? ('standup-target-hit' as const)
                : ('drop-target-hit' as const),
            position: center,
          },
          o.returnRegion,
        ],
        timeoutSeconds: 5,
      };
    }),
  };
};

export interface SaucerPocketOptions {
  id: string;
  center: Point;
  radius: number;
  wallRadius: number;
  throatLength: number;
  mouthDepth: number;
  mouthHalfWidth: number;
  score: number;
  holdSeconds: number;
  ejectSpeed: number;
  ejectAngle: number;
  approachSpeed: number;
  returnRegion: Extract<RouteGoal, { type: 'region' }>;
  ballRadius?: number;
}
export const createSaucerPocketAssembly = (
  o: SaucerPocketOptions,
): BoardAssembly => {
  requireClearance(o.wallRadius, o.radius + 6, 'Saucer pocket radius');
  requireClearance(
    o.mouthHalfWidth * 2,
    (o.ballRadius ?? 16) * 2 + 12,
    'Saucer mouth width',
  );
  requireClearance(o.mouthDepth, o.throatLength, 'Saucer mouth depth');
  if (Math.sin(o.ejectAngle) <= 0)
    throw new Error('Saucer eject must point through the lower mouth.');
  return {
    saucers: [
      {
        position: o.center,
        radius: o.radius,
        score: o.score,
        holdSeconds: o.holdSeconds,
        ejectSpeed: o.ejectSpeed,
        ejectAngle: o.ejectAngle,
        material: 'metalGuide',
      },
    ],
    guides: [
      arc(o.center, o.wallRadius, Math.PI, Math.PI * 2),
      ...[-1, 1].flatMap((sign) =>
        polyline([
          { x: o.center.x + sign * o.wallRadius, y: o.center.y },
          {
            x: o.center.x + sign * o.wallRadius,
            y: o.center.y + o.throatLength,
          },
          {
            x: o.center.x + sign * o.mouthHalfWidth,
            y: o.center.y + o.mouthDepth,
          },
        ]),
      ),
    ],
    routes: [
      {
        id: `${o.id}/capture-return`,
        start: {
          type: 'feed',
          position: { x: o.center.x, y: o.center.y + o.mouthDepth - 10 },
          velocities: [-40, 0, 40].map((x) => ({ x, y: -o.approachSpeed })),
        },
        goals: [
          { type: 'event', event: 'saucer-captured', position: o.center },
          o.returnRegion,
        ],
        timeoutSeconds: 5,
      },
    ],
  };
};
