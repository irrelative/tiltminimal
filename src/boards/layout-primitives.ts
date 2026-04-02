import type {
  BumperLayoutDefinition,
  FlipperLayoutDefinition,
  LayoutPoint,
  RolloverLayoutDefinition,
  StandupTargetLayoutDefinition,
} from './layout-schema';
import type { FlipperSide, SurfaceMaterialName } from '../types/board-definition';

export const absolutePoint = (x: number, y: number): LayoutPoint => ({ x, y });

export const percentPoint = (
  x: number,
  y: number,
  offset?: { x?: number; y?: number },
): LayoutPoint => ({
  kind: 'percent',
  x,
  y,
  offset: normalizeOffset(offset),
});

export const anchorPoint = (
  anchor: string,
  offset?: { x?: number; y?: number },
): LayoutPoint => ({
  kind: 'anchor',
  anchor,
  offset: normalizeOffset(offset),
});

export const offsetLayoutPoint = (
  point: LayoutPoint,
  dx: number,
  dy: number,
): LayoutPoint => {
  const nextOffset = {
    x: ('offset' in point ? point.offset?.x ?? 0 : 0) + dx,
    y: ('offset' in point ? point.offset?.y ?? 0 : 0) + dy,
  };

  if ('anchor' in point && point.kind === 'anchor') {
    return {
      kind: 'anchor',
      anchor: point.anchor,
      offset: nextOffset,
    };
  }

  if ('kind' in point && point.kind === 'percent') {
    return {
      kind: 'percent',
      x: point.x,
      y: point.y,
      offset: nextOffset,
    };
  }

  return {
    x: point.x + dx,
    y: point.y + dy,
  };
};

export const createPopTriangle = (options: {
  top: LayoutPoint;
  spacingX: number;
  spacingY: number;
  radius: number;
  scores?: [number, number, number];
  material?: SurfaceMaterialName;
}): BumperLayoutDefinition[] => {
  const [topScore, leftScore, rightScore] = options.scores ?? [100, 100, 100];
  const material = options.material ?? 'rubberPost';

  return [
    {
      position: options.top,
      radius: options.radius,
      score: topScore,
      material,
    },
    {
      position: offsetLayoutPoint(
        options.top,
        -options.spacingX / 2,
        options.spacingY,
      ),
      radius: options.radius,
      score: leftScore,
      material,
    },
    {
      position: offsetLayoutPoint(
        options.top,
        options.spacingX / 2,
        options.spacingY,
      ),
      radius: options.radius,
      score: rightScore,
      material,
    },
  ];
};

export const createFlipperPair = (options: {
  y: number;
  leftX: number;
  rightX: number;
  length: number;
  thickness: number;
  restingAngleOffset: number;
  activeAngleOffset: number;
  material?: SurfaceMaterialName;
}): FlipperLayoutDefinition[] => [
  createFlipperLayout('left', options.leftX, options.y, options),
  createFlipperLayout('right', options.rightX, options.y, options),
];

export const createMirroredRollovers = (options: {
  center: LayoutPoint;
  offsetsX: number[];
  radius: number;
  score: number;
}): RolloverLayoutDefinition[] =>
  options.offsetsX.map((offsetX) => ({
    position: offsetLayoutPoint(options.center, offsetX, 0),
    radius: options.radius,
    score: options.score,
  }));

export const createMirroredStandupTargets = (options: {
  center: LayoutPoint;
  offsetX: number;
  yOffset?: number;
  width: number;
  height: number;
  angleOffset: number;
  score: number;
  material?: SurfaceMaterialName;
}): StandupTargetLayoutDefinition[] => {
  const material = options.material ?? 'rubberPost';
  const yOffset = options.yOffset ?? 0;

  return [
    {
      position: offsetLayoutPoint(options.center, -options.offsetX, yOffset),
      width: options.width,
      height: options.height,
      angle: -options.angleOffset,
      score: options.score,
      material,
    },
    {
      position: offsetLayoutPoint(options.center, options.offsetX, yOffset),
      width: options.width,
      height: options.height,
      angle: Math.PI + options.angleOffset,
      score: options.score,
      material,
    },
  ];
};

const createFlipperLayout = (
  side: FlipperSide,
  x: number,
  y: number,
  options: {
    length: number;
    thickness: number;
    restingAngleOffset: number;
    activeAngleOffset: number;
    material?: SurfaceMaterialName;
  },
): FlipperLayoutDefinition => ({
  side,
  position: absolutePoint(x, y),
  length: options.length,
  thickness: options.thickness,
  restingAngle:
    side === 'left'
      ? options.restingAngleOffset
      : Math.PI - options.restingAngleOffset,
  activeAngle:
    side === 'left'
      ? options.activeAngleOffset
      : Math.PI - options.activeAngleOffset,
  material: options.material ?? 'flipperRubber',
});

const normalizeOffset = (
  offset: { x?: number; y?: number } | undefined,
): { x: number; y: number } | undefined =>
  offset ? { x: offset.x ?? 0, y: offset.y ?? 0 } : undefined;
