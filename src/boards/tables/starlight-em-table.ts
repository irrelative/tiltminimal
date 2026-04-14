import {
  absolutePoint,
  anchorPoint,
  createFlipperPair,
  createInlaneOutlanePair,
  createShooterLaneRight,
  createSlingshotPair,
  createTopArchLanes,
  offsetLayoutPoint,
} from '../layout-primitives';
import type { BoardLayoutDefinition } from '../layout-schema';
import { compileBuiltInBoardLayout } from '../layout-compiler';

const starlightEmRulesScript = `
const BALLS_PER_GAME = 5;
const TOP_LANES = ['lane-a', 'lane-b', 'lane-c', 'lane-d'];
const LEFT_BANK = ['left-bank-1', 'left-bank-2', 'left-bank-3'];
const RIGHT_BANK = ['right-bank-1', 'right-bank-2', 'right-bank-3'];

function resetFlags(ctx, names) {
  names.forEach((name) => ctx.setMachine(name, false));
}

function isComplete(ctx, names) {
  return names.every((name) => ctx.getMachine(name) === true);
}

function awardBankIfComplete(ctx, names) {
  if (!isComplete(ctx, names)) {
    return false;
  }

  ctx.addScore(3000);
  ctx.addBonus(1000);
  ctx.increaseBonusMultiplier(1, 3);
  resetFlags(ctx, names);
  return true;
}

return {
  onGameStart(ctx) {
    ctx.setBallsPerGame(BALLS_PER_GAME);
    ctx.setBallsRemaining(BALLS_PER_GAME);
    ctx.setCurrentBall(1);
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetFlags(ctx, TOP_LANES);
    resetFlags(ctx, LEFT_BANK);
    resetFlags(ctx, RIGHT_BANK);
  },

  onBallStart(ctx) {
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetFlags(ctx, TOP_LANES);
    resetFlags(ctx, LEFT_BANK);
    resetFlags(ctx, RIGHT_BANK);
  },

  onEvent(event, ctx) {
    if (event.type === 'bumper-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(100);
      return;
    }

    if (event.type === 'spinner-spin') {
      ctx.addScore(event.score);
      ctx.addBonus(50);
      return;
    }

    if (event.type === 'slingshot-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(100);
      return;
    }

    if (event.type === 'saucer-captured') {
      ctx.addScore(event.score);
      ctx.addBonus(1500);
      ctx.increaseBonusMultiplier(1, 3);
      return;
    }

    if (event.type === 'rollover-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(250);

      const lane = TOP_LANES[event.index] ?? 'lane-' + String(event.index);
      ctx.setMachine(lane, true);

      if (isComplete(ctx, TOP_LANES)) {
        ctx.addScore(2000);
        ctx.increaseBonusMultiplier(1, 3);
        resetFlags(ctx, TOP_LANES);
      }

      return;
    }

    if (event.type === 'standup-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(400);

      const bank =
        event.index <= 2
          ? LEFT_BANK[event.index]
          : RIGHT_BANK[event.index - 3];

      if (bank) {
        ctx.setMachine(bank, true);
      }

      if (awardBankIfComplete(ctx, LEFT_BANK)) {
        return;
      }

      awardBankIfComplete(ctx, RIGHT_BANK);
      return;
    }

    if (event.type === 'ball-drained') {
      const bonusAward = ctx.getBonus() * ctx.getBonusMultiplier();

      if (bonusAward > 0) {
        ctx.addScore(bonusAward);
      }

      if (ctx.getBallsRemaining() > 1) {
        ctx.startNextBall();
      } else {
        ctx.endGame();
      }
    }
  },
};
`;

const starlightShooterLane = createShooterLaneRight({
  boardWidth: 900,
  launchX: 760,
  launchY: 1180,
  guideLength: 620,
  feedTopY: 280,
  innerMergeX: 692,
  innerMergeY: 332,
  outerExitX: 800,
  outerBendX: 808,
  outerBendY: 396,
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
  outerGuideStartOffset: { x: -196, y: -320 },
  outerGuideBreakOffset: { x: -166, y: -188 },
  outerGuideEndOffset: { x: -122, y: 44 },
  innerGuideStartOffset: { x: -110, y: -300 },
  innerGuideBreakOffset: { x: -86, y: -202 },
  innerGuideEndOffset: { x: -82, y: 40 },
  slingGuideStartOffset: { x: -56, y: -210 },
  slingGuideEndOffset: { x: -26, y: -158 },
  outerMouthThickness: 12,
  outerReturnThickness: 14,
  innerMouthThickness: 12,
  innerReturnThickness: 16,
  entryPostOffsets: [
    { x: -134, y: -320, radius: 16, material: 'metalGuide' },
    { x: -96, y: -214, radius: 18, material: 'rubberPost' },
  ],
});

const starlightRightLowerLanes = createInlaneOutlanePair({
  side: 'right',
  flipperPivot: anchorPoint('right-flipper-pivot'),
  outerGuideStartOffset: { x: 90, y: -320 },
  outerGuideBreakOffset: { x: 100, y: -188 },
  outerGuideEndOffset: { x: 96, y: 42 },
  innerGuideStartOffset: { x: 24, y: -300 },
  innerGuideBreakOffset: { x: 42, y: -202 },
  innerGuideEndOffset: { x: 62, y: 40 },
  slingGuideStartOffset: { x: 56, y: -210 },
  slingGuideEndOffset: { x: 26, y: -158 },
  outerMouthThickness: 12,
  outerReturnThickness: 14,
  innerMouthThickness: 12,
  innerReturnThickness: 16,
  entryPostOffsets: [
    { x: 66, y: -320, radius: 16, material: 'metalGuide' },
    { x: 34, y: -214, radius: 18, material: 'rubberPost' },
  ],
});

const starlightSlingshots = createSlingshotPair({
  leftCenter: offsetLayoutPoint(anchorPoint('left-flipper-pivot'), 18, -138),
  rightCenter: offsetLayoutPoint(anchorPoint('right-flipper-pivot'), -18, -138),
  width: 124,
  height: 38,
  leftAngle: 0.5,
  rightAngle: Math.PI - 0.5,
  score: 10,
  strength: 560,
});

const starlightEmLayout: BoardLayoutDefinition = {
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
    { position: absolutePoint(450, 1100), radius: 18, material: 'rubberPost' },
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
      ejectAngle: Math.PI * 0.7,
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
  slingshots: starlightSlingshots.slingshots,
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
      start: absolutePoint(304, 666),
      end: absolutePoint(370, 666),
      thickness: 12,
      material: 'metalGuide',
    },
    {
      start: absolutePoint(530, 666),
      end: absolutePoint(596, 666),
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

export const starlightEmTable = compileBuiltInBoardLayout(starlightEmLayout);
