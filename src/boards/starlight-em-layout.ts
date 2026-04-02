import { starlightEmRulesScript } from './starlight-em-rules-script';
import {
  absolutePoint,
  anchorPoint,
  createFlipperPair,
  createInlaneOutlanePair,
  createShooterLaneRight,
  createTopArchLanes,
  offsetLayoutPoint,
} from './layout-primitives';
import type { BoardLayoutDefinition } from './layout-schema';

const starlightShooterLane = createShooterLaneRight({
  boardWidth: 900,
  launchX: 760,
  launchY: 1180,
  guideLength: 620,
  feedTopY: 280,
  innerMergeX: 680,
  innerMergeY: 360,
  outerExitX: 800,
  outerBendX: 800,
  outerBendY: 440,
});

const starlightTopArch = createTopArchLanes({
  center: absolutePoint(450, 176),
  laneCount: 4,
  spacingX: 150,
  radius: 22,
  score: 500,
  roofOffsetY: -58,
  separatorBottomOffsetY: 24,
  shoulderStartOffsetY: 86,
  sideEntryInset: 112,
  roofInset: 66,
});

const starlightLeftLowerLanes = createInlaneOutlanePair({
  side: 'left',
  flipperPivot: anchorPoint('left-flipper-pivot'),
  outerGuideStartOffset: { x: -176, y: -38 },
  outerGuideEndOffset: { x: -120, y: -322 },
  innerGuideStartOffset: { x: -56, y: -216 },
  innerGuideEndOffset: { x: -84, y: 48 },
  slingGuideStartOffset: { x: -50, y: -132 },
  slingGuideEndOffset: { x: 94, y: -72 },
  entryPostOffsets: [
    { x: -72, y: -200, radius: 18, material: 'rubberPost' },
    { x: -114, y: -312, radius: 16, material: 'metalGuide' },
  ],
});

const starlightRightLowerLanes = createInlaneOutlanePair({
  side: 'right',
  flipperPivot: anchorPoint('right-flipper-pivot'),
  outerGuideStartOffset: { x: 216, y: -38 },
  outerGuideEndOffset: { x: 182, y: -322 },
  innerGuideStartOffset: { x: 56, y: -216 },
  innerGuideEndOffset: { x: 84, y: 48 },
  slingGuideStartOffset: { x: 50, y: -132 },
  slingGuideEndOffset: { x: -94, y: -72 },
  entryPostOffsets: [
    { x: 72, y: -200, radius: 18, material: 'rubberPost' },
    { x: 54, y: -312, radius: 16, material: 'metalGuide' },
  ],
});

export const starlightEmLayout: BoardLayoutDefinition = {
  name: 'Starlight EM',
  themeId: 'sunburst',
  template: 'solid-state-two-flipper',
  width: 900,
  height: 1400,
  rulesScript: starlightEmRulesScript,
  drainY: 1425,
  launchPosition: starlightShooterLane.launchPosition,
  plunger: starlightShooterLane.plunger,
  materials: {
    playfield: 'playfieldWood',
    walls: 'metalGuide',
  },
  physics: {
    plunger: {
      minReleaseSpeed: 1600,
      maxReleaseSpeed: 4200,
      bodyMass: 0.9,
    },
  },
  anchors: [
    { id: 'pop-top', point: absolutePoint(450, 260) },
    { id: 'left-bank-center', point: absolutePoint(180, 760) },
    { id: 'right-bank-center', point: absolutePoint(660, 760) },
    { id: 'center-spinner', point: absolutePoint(450, 620) },
    { id: 'saucer-pocket', point: absolutePoint(690, 360) },
  ],
  posts: [
    { position: absolutePoint(450, 1140), radius: 18, material: 'rubberPost' },
    ...starlightLeftLowerLanes.posts,
    ...starlightRightLowerLanes.posts,
  ],
  bumpers: [
    {
      position: anchorPoint('pop-top'),
      radius: 42,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: offsetLayoutPoint(anchorPoint('pop-top'), -110, 150),
      radius: 42,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: offsetLayoutPoint(anchorPoint('pop-top'), 110, 150),
      radius: 42,
      score: 100,
      material: 'rubberPost',
    },
  ],
  standupTargets: [
    {
      position: offsetLayoutPoint(anchorPoint('left-bank-center'), -28, -92),
      width: 60,
      height: 18,
      angle: Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
    {
      position: offsetLayoutPoint(anchorPoint('left-bank-center'), -12, 0),
      width: 60,
      height: 18,
      angle: Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
    {
      position: offsetLayoutPoint(anchorPoint('left-bank-center'), 4, 92),
      width: 60,
      height: 18,
      angle: Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
    {
      position: offsetLayoutPoint(anchorPoint('right-bank-center'), 28, -92),
      width: 60,
      height: 18,
      angle: -Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
    {
      position: offsetLayoutPoint(anchorPoint('right-bank-center'), 12, 0),
      width: 60,
      height: 18,
      angle: -Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
    {
      position: offsetLayoutPoint(anchorPoint('right-bank-center'), -4, 92),
      width: 60,
      height: 18,
      angle: -Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
  ],
  saucers: [
    {
      position: anchorPoint('saucer-pocket'),
      radius: 30,
      score: 3000,
      holdSeconds: 0.55,
      ejectSpeed: 920,
      ejectAngle: Math.PI * 0.82,
      material: 'metalGuide',
    },
  ],
  spinners: [
    {
      position: absolutePoint(194, 540),
      length: 92,
      thickness: 10,
      angle: -0.58,
      score: 100,
      material: 'metalGuide',
    },
    {
      position: anchorPoint('center-spinner'),
      length: 110,
      thickness: 10,
      angle: 0,
      score: 100,
      material: 'metalGuide',
    },
  ],
  rollovers: starlightTopArch.rollovers,
  guides: [
    ...starlightLeftLowerLanes.guides,
    ...starlightRightLowerLanes.guides,
    {
      start: absolutePoint(132, 872),
      end: absolutePoint(116, 644),
      thickness: 14,
      material: 'metalGuide',
    },
    {
      start: absolutePoint(116, 644),
      end: absolutePoint(96, 620),
      thickness: 14,
      material: 'metalGuide',
    },
    {
      start: absolutePoint(96, 620),
      end: absolutePoint(202, 224),
      thickness: 14,
      material: 'metalGuide',
    },
    {
      start: absolutePoint(116, 644),
      end: absolutePoint(114, 262),
      thickness: 14,
      material: 'metalGuide',
    },
    {
      start: absolutePoint(315, 658),
      end: absolutePoint(366, 658),
      thickness: 12,
      material: 'metalGuide',
    },
    {
      start: absolutePoint(534, 658),
      end: absolutePoint(585, 658),
      thickness: 12,
      material: 'metalGuide',
    },
    ...starlightTopArch.guides,
    ...starlightShooterLane.guides,
  ],
  flippers: createFlipperPair({
    leftX: 270,
    rightX: 630,
    y: 1220,
    length: 150,
    thickness: 20,
    restingAngleOffset: 0.28,
    activeAngleOffset: -0.42,
    material: 'flipperRubber',
  }),
};
