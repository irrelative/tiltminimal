import type {
  BumperLayoutDefinition,
  FlipperLayoutDefinition,
  GuideLayoutDefinition,
  LayoutPoint,
  PostLayoutDefinition,
  RolloverLayoutDefinition,
  SlingshotLayoutDefinition,
  StandupTargetLayoutDefinition,
} from './layout-schema';
import type {
  FlipperSide,
  GuidePlane,
  PlungerDefinition,
  SurfaceMaterialName,
} from '../types/board-definition';

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

export interface ShooterLaneRightLayout {
  launchPosition: LayoutPoint;
  plunger: Partial<PlungerDefinition>;
  guides: GuideLayoutDefinition[];
}

export const createShooterLaneRight = (options: {
  boardWidth: number;
  launchX: number;
  launchY: number;
  guideLength: number;
  feedTopY: number;
  innerMergeX?: number;
  innerMergeY?: number;
  outerExitX?: number;
  outerBendX?: number;
  outerBendY?: number;
  wallThickness?: number;
  material?: SurfaceMaterialName;
  plunger?: Partial<Omit<PlungerDefinition, 'x' | 'y'>>;
}): ShooterLaneRightLayout => {
  const plungerThickness = options.plunger?.thickness ?? 24;
  const laneHalfWidth = plungerThickness / 2 + 12;
  const guideTopY = options.launchY - options.guideLength;
  const material = options.material ?? options.plunger?.material ?? 'metalGuide';
  const wallThickness = options.wallThickness ?? 14;
  const innerX = options.launchX - laneHalfWidth;
  const outerX = options.launchX + laneHalfWidth;
  const innerMergeY = options.innerMergeY ?? options.feedTopY + 92;
  const innerMergeX = options.innerMergeX ?? options.launchX - 72;
  const outerExitX = options.outerExitX ?? options.boardWidth - 132;
  const outerBendX = options.outerBendX ?? outerX + 18;
  const outerBendY = options.outerBendY ?? guideTopY - 120;

  return {
    launchPosition: absolutePoint(options.launchX, options.launchY),
    plunger: {
      x: options.launchX,
      guideLength: options.guideLength,
      ...options.plunger,
    },
    guides: [
      {
        start: absolutePoint(innerX, guideTopY),
        end: absolutePoint(innerMergeX, innerMergeY),
        thickness: wallThickness,
        material,
      },
      {
        start: absolutePoint(outerX, guideTopY),
        end: absolutePoint(outerBendX, outerBendY),
        thickness: wallThickness,
        material,
      },
      {
        start: absolutePoint(outerBendX, outerBendY),
        end: absolutePoint(outerExitX, options.feedTopY),
        thickness: wallThickness,
        material,
      },
    ],
  };
};

export interface TopArchLanesLayout {
  rollovers: RolloverLayoutDefinition[];
  guides: GuideLayoutDefinition[];
}

export const createTopArchLanes = (options: {
  center: LayoutPoint;
  laneCount: number;
  spacingX: number;
  radius: number;
  score: number;
  roofOffsetY?: number;
  separatorBottomOffsetY?: number;
  shoulderStartOffsetY?: number;
  sideEntryInset?: number;
  roofInset?: number;
  material?: SurfaceMaterialName;
  guideThickness?: number;
}): TopArchLanesLayout => {
  const laneOffsets = Array.from(
    { length: options.laneCount },
    (_, index) => (index - (options.laneCount - 1) / 2) * options.spacingX,
  );
  const material = options.material ?? 'metalGuide';
  const guideThickness = options.guideThickness ?? 14;
  const roofOffsetY = options.roofOffsetY ?? -Math.max(54, options.radius * 2.5);
  const separatorBottomOffsetY =
    options.separatorBottomOffsetY ?? Math.max(28, options.radius * 1.15);
  const shoulderStartOffsetY =
    options.shoulderStartOffsetY ?? Math.max(72, options.radius * 3.1);
  const sideEntryInset = options.sideEntryInset ?? options.spacingX * 0.85;
  const roofInset = options.roofInset ?? options.spacingX * 0.5;
  const leftmostOffset = laneOffsets[0] ?? 0;
  const rightmostOffset = laneOffsets[laneOffsets.length - 1] ?? 0;

  const rollovers = laneOffsets.map((offsetX) => ({
    position: offsetLayoutPoint(options.center, offsetX, 0),
    radius: options.radius,
    score: options.score,
  }));

  const guides: GuideLayoutDefinition[] = [
    {
      start: offsetLayoutPoint(
        options.center,
        leftmostOffset - sideEntryInset,
        shoulderStartOffsetY,
      ),
      end: offsetLayoutPoint(options.center, leftmostOffset - roofInset, roofOffsetY),
      thickness: guideThickness,
      material,
    },
    {
      start: offsetLayoutPoint(options.center, leftmostOffset - roofInset, roofOffsetY),
      end: offsetLayoutPoint(options.center, 0, roofOffsetY),
      thickness: guideThickness,
      material,
    },
    {
      start: offsetLayoutPoint(options.center, 0, roofOffsetY),
      end: offsetLayoutPoint(options.center, rightmostOffset + roofInset, roofOffsetY),
      thickness: guideThickness,
      material,
    },
    {
      start: offsetLayoutPoint(
        options.center,
        rightmostOffset + roofInset,
        roofOffsetY,
      ),
      end: offsetLayoutPoint(
        options.center,
        rightmostOffset + sideEntryInset,
        shoulderStartOffsetY,
      ),
      thickness: guideThickness,
      material,
    },
  ];

  for (let index = 0; index < laneOffsets.length - 1; index += 1) {
    const left = laneOffsets[index];
    const right = laneOffsets[index + 1];

    if (left === undefined || right === undefined) {
      continue;
    }

    guides.push({
      start: offsetLayoutPoint(options.center, (left + right) / 2, roofOffsetY + 8),
      end: offsetLayoutPoint(
        options.center,
        (left + right) / 2,
        separatorBottomOffsetY,
      ),
      thickness: guideThickness,
      material,
    });
  }

  return {
    rollovers,
    guides,
  };
};

export interface InlaneOutlanePairLayout {
  guides: GuideLayoutDefinition[];
  posts: PostLayoutDefinition[];
}

export const createInlaneOutlanePair = (options: {
  side: FlipperSide;
  flipperPivot: LayoutPoint;
  outerGuideStartOffset: { x: number; y: number };
  outerGuideEndOffset: { x: number; y: number };
  innerGuideStartOffset: { x: number; y: number };
  innerGuideEndOffset: { x: number; y: number };
  slingGuideStartOffset?: { x: number; y: number };
  slingGuideEndOffset?: { x: number; y: number };
  entryPostOffsets?: Array<{
    x: number;
    y: number;
    radius: number;
    material?: SurfaceMaterialName;
  }>;
  outerPlane?: GuidePlane;
  innerPlane?: GuidePlane;
  outerMaterial?: SurfaceMaterialName;
  innerMaterial?: SurfaceMaterialName;
  slingMaterial?: SurfaceMaterialName;
  outerThickness?: number;
  innerThickness?: number;
  slingThickness?: number;
}): InlaneOutlanePairLayout => ({
  guides: [
    {
      start: offsetLayoutPoint(
        options.flipperPivot,
        options.outerGuideStartOffset.x,
        options.outerGuideStartOffset.y,
      ),
      end: offsetLayoutPoint(
        options.flipperPivot,
        options.outerGuideEndOffset.x,
        options.outerGuideEndOffset.y,
      ),
      thickness: options.outerThickness ?? 14,
      material: options.outerMaterial ?? 'metalGuide',
      plane: options.outerPlane ?? 'raised',
    },
    {
      start: offsetLayoutPoint(
        options.flipperPivot,
        options.innerGuideStartOffset.x,
        options.innerGuideStartOffset.y,
      ),
      end: offsetLayoutPoint(
        options.flipperPivot,
        options.innerGuideEndOffset.x,
        options.innerGuideEndOffset.y,
      ),
      thickness: options.innerThickness ?? 18,
      material: options.innerMaterial ?? 'metalGuide',
      plane: options.innerPlane ?? 'raised',
    },
    ...(options.slingGuideStartOffset && options.slingGuideEndOffset
      ? [
          {
            start: offsetLayoutPoint(
              options.flipperPivot,
              options.slingGuideStartOffset.x,
              options.slingGuideStartOffset.y,
            ),
            end: offsetLayoutPoint(
              options.flipperPivot,
              options.slingGuideEndOffset.x,
              options.slingGuideEndOffset.y,
            ),
            thickness: options.slingThickness ?? 20,
            material: options.slingMaterial ?? 'rubberPost',
            plane: 'playfield' as const,
          },
        ]
      : []),
  ],
  posts: (options.entryPostOffsets ?? []).map((post) => ({
    position: offsetLayoutPoint(options.flipperPivot, post.x, post.y),
    radius: post.radius,
    material: post.material ?? 'metalGuide',
  })),
});

export interface SlingshotPairLayout {
  slingshots: SlingshotLayoutDefinition[];
}

export const createSlingshotPair = (options: {
  leftCenter: LayoutPoint;
  rightCenter: LayoutPoint;
  width: number;
  height: number;
  leftAngle: number;
  rightAngle: number;
  score: number;
  strength: number;
  material?: SurfaceMaterialName;
}): SlingshotPairLayout => ({
  slingshots: [
    {
      position: options.leftCenter,
      width: options.width,
      height: options.height,
      angle: options.leftAngle,
      score: options.score,
      strength: options.strength,
      material: options.material ?? 'rubberPost',
    },
    {
      position: options.rightCenter,
      width: options.width,
      height: options.height,
      angle: options.rightAngle,
      score: options.score,
      strength: options.strength,
      material: options.material ?? 'rubberPost',
    },
  ],
});

export interface SlingshotTriangleGuidesLayout {
  guides: GuideLayoutDefinition[];
}

export const createSlingshotTriangleGuides = (options: {
  leftCenter: LayoutPoint;
  rightCenter: LayoutPoint;
  width: number;
  leftAngle: number;
  rightAngle: number;
  apexDistance: number;
  apexShift?: number;
  endpointInset?: number;
  thickness?: number;
  material?: SurfaceMaterialName;
}): SlingshotTriangleGuidesLayout => ({
  guides: [
    ...createSlingshotTriangleGuidesForSide(
      options.leftCenter,
      options.width,
      options.leftAngle,
      options.apexDistance,
      options.apexShift ?? 0,
      options.endpointInset ?? 0,
      options.thickness ?? 14,
      options.material ?? 'metalGuide',
    ),
    ...createSlingshotTriangleGuidesForSide(
      options.rightCenter,
      options.width,
      options.rightAngle,
      options.apexDistance,
      options.apexShift ?? 0,
      options.endpointInset ?? 0,
      options.thickness ?? 14,
      options.material ?? 'metalGuide',
    ),
  ],
});

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

const createSlingshotTriangleGuidesForSide = (
  center: LayoutPoint,
  width: number,
  angle: number,
  apexDistance: number,
  apexShift: number,
  endpointInset: number,
  thickness: number,
  material: SurfaceMaterialName,
): GuideLayoutDefinition[] => {
  const halfWidth = Math.max(12, width / 2 - endpointInset);
  const tangent = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
  const firstNormal = {
    x: -Math.sin(angle),
    y: Math.cos(angle),
  };
  const secondNormal = {
    x: Math.sin(angle),
    y: -Math.cos(angle),
  };
  const upperNormal = firstNormal.y <= secondNormal.y ? firstNormal : secondNormal;
  const start = offsetLayoutPoint(
    center,
    -tangent.x * halfWidth,
    -tangent.y * halfWidth,
  );
  const end = offsetLayoutPoint(
    center,
    tangent.x * halfWidth,
    tangent.y * halfWidth,
  );
  const apex = offsetLayoutPoint(
    center,
    upperNormal.x * apexDistance + tangent.x * apexShift,
    upperNormal.y * apexDistance + tangent.y * apexShift,
  );

  return [
    {
      start,
      end: apex,
      thickness,
      material,
      plane: 'playfield',
    },
    {
      start: apex,
      end,
      thickness,
      material,
      plane: 'playfield',
    },
  ];
};

const normalizeOffset = (
  offset: { x?: number; y?: number } | undefined,
): { x: number; y: number } | undefined =>
  offset ? { x: offset.x ?? 0, y: offset.y ?? 0 } : undefined;
