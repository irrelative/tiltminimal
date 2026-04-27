import {
  absolutePoint,
  anchorPoint,
  createLowerPlayfieldPair,
  createPopTriangle,
  createShooterLaneRight,
  createTopArchLanes,
  offsetLayoutPoint,
} from '../layout-primitives';
import type { BoardLayoutDefinition } from '../layout-schema';
import { compileBuiltInBoardLayout } from '../layout-compiler';

const doubleCrossedRulesScript = `
const BALLS_PER_GAME = 3;
const TOP_LANES = ['lane-a', 'lane-b', 'lane-c', 'lane-d'];
const LEFT_CROSS = ['left-cross-upper', 'left-cross-lower'];
const RIGHT_CROSS = ['right-cross-upper', 'right-cross-lower'];
const DROP_BANK = ['drop-left', 'drop-right'];

function resetFlags(ctx, names) {
  names.forEach((name) => ctx.setMachine(name, false));
}

function isComplete(ctx, names) {
  return names.every((name) => ctx.getMachine(name) === true);
}

function lightSpinners(ctx) {
  ctx.setMachine('spinners-lit', true);
}

function resetBallState(ctx) {
  resetFlags(ctx, TOP_LANES);
  resetFlags(ctx, LEFT_CROSS);
  resetFlags(ctx, RIGHT_CROSS);
  resetFlags(ctx, DROP_BANK);
  ctx.setMachine('spinners-lit', false);
}

return {
  onGameStart(ctx) {
    ctx.setBallsPerGame(BALLS_PER_GAME);
    ctx.setBallsRemaining(BALLS_PER_GAME);
    ctx.setCurrentBall(1);
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetBallState(ctx);
  },

  onBallStart(ctx) {
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetBallState(ctx);
  },

  onEvent(event, ctx) {
    if (event.type === 'bumper-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(100);
      return;
    }

    if (event.type === 'spinner-spin') {
      const spinnerValue =
        ctx.getMachine('spinners-lit') === true ? event.score * 2 : event.score;

      ctx.addScore(spinnerValue);
      ctx.addBonus(50);
      return;
    }

    if (event.type === 'slingshot-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(75);
      return;
    }

    if (event.type === 'rollover-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(250);

      const lane = TOP_LANES[event.index] ?? 'lane-' + String(event.index);
      ctx.setMachine(lane, true);

      if (isComplete(ctx, TOP_LANES)) {
        ctx.addScore(2000);
        ctx.addBonus(1000);
        ctx.increaseBonusMultiplier(1, 2);
        lightSpinners(ctx);
        resetFlags(ctx, TOP_LANES);
      }

      return;
    }

    if (event.type === 'standup-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(400);

      const bank = event.index <= 1 ? LEFT_CROSS : RIGHT_CROSS;
      const bankIndex = event.index <= 1 ? event.index : event.index - 2;
      const flag = bank[bankIndex];

      if (flag) {
        ctx.setMachine(flag, true);
      }

      if (isComplete(ctx, LEFT_CROSS)) {
        ctx.addScore(1500);
        ctx.addBonus(1000);
        lightSpinners(ctx);
        resetFlags(ctx, LEFT_CROSS);
      }

      if (isComplete(ctx, RIGHT_CROSS)) {
        ctx.addScore(1500);
        ctx.addBonus(1000);
        lightSpinners(ctx);
        resetFlags(ctx, RIGHT_CROSS);
      }

      return;
    }

    if (event.type === 'drop-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(750);

      const target = DROP_BANK[event.index] ?? 'drop-' + String(event.index);
      ctx.setMachine(target, true);

      if (isComplete(ctx, DROP_BANK)) {
        ctx.addScore(3000);
        ctx.addBonus(1500);
        ctx.increaseBonusMultiplier(1, 3);
        lightSpinners(ctx);
        resetFlags(ctx, DROP_BANK);
      }

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

const doubleCrossedShooterLane = createShooterLaneRight({
  boardWidth: 900,
  launchX: 760,
  launchY: 1180,
  guideLength: 640,
  feedTopY: 240,
  innerMergeX: 680,
  innerMergeY: 360,
  outerExitX: 800,
  outerBendX: 800,
  outerBendY: 440,
});

const doubleCrossedTopArch = createTopArchLanes({
  center: absolutePoint(480, 200),
  laneCount: 4,
  spacingX: 120,
  radius: 22,
  score: 500,
  roofOffsetY: -60,
  separatorBottomOffsetY: 24,
  shoulderStartOffsetY: 96,
  sideEntryInset: 120,
  roofInset: 60,
});

const doubleCrossedLowerPlayfield = createLowerPlayfieldPair({
  leftFlipperPivot: anchorPoint('left-flipper-pivot'),
  rightFlipperPivot: anchorPoint('right-flipper-pivot'),
  leftLane: {
    outerGuideStartOffset: { x: -176, y: -40 },
    outerGuideEndOffset: { x: -120, y: -320 },
    innerGuideStartOffset: { x: -56, y: -200 },
    innerGuideEndOffset: { x: -80, y: 40 },
    entryPostOffsets: [{ x: -72, y: -200, radius: 18, material: 'rubberPost' }],
  },
  rightLane: {
    outerGuideStartOffset: { x: 176, y: -40 },
    outerGuideEndOffset: { x: 160, y: -320 },
    innerGuideStartOffset: { x: 56, y: -200 },
    innerGuideEndOffset: { x: 80, y: 40 },
    entryPostOffsets: [{ x: 72, y: -200, radius: 18, material: 'rubberPost' }],
  },
  slingshots: {
    leftCenterOffset: { x: 20, y: -140 },
    rightCenterOffset: { x: -20, y: -140 },
    width: 148,
    height: 24,
    leftAngle: 0.4,
    rightAngle: Math.PI - 0.4,
    score: 10,
    strength: 540,
  },
  flippers: {
    leftX: 280,
    rightX: 640,
    y: 1240,
    length: 150,
    thickness: 20,
    restingAngleOffset: 0.28,
    activeAngleOffset: -0.42,
    material: 'flipperRubber',
  },
});

const doubleCrossedLayout: BoardLayoutDefinition = {
  name: 'Double Crossed',
  themeId: 'midnight',
  template: 'solid-state-two-flipper',
  width: 900,
  height: 1400,
  rulesScript: doubleCrossedRulesScript,
  drainY: 1425,
  launchPosition: doubleCrossedShooterLane.launchPosition,
  plunger: doubleCrossedShooterLane.plunger,
  materials: {
    playfield: 'playfieldWood',
    walls: 'metalGuide',
  },
  physics: {
    plunger: {
      minReleaseSpeed: 1600,
      maxReleaseSpeed: 4400,
      bodyMass: 0.9,
    },
  },
  anchors: [
    { id: 'left-flipper-pivot', point: absolutePoint(280, 1240) },
    { id: 'right-flipper-pivot', point: absolutePoint(640, 1240) },
    { id: 'pop-top', point: absolutePoint(480, 360) },
    { id: 'cross-center', point: absolutePoint(480, 760) },
  ],
  posts: [
    ...doubleCrossedLowerPlayfield.posts,
    {
      position: offsetLayoutPoint(anchorPoint('cross-center'), 0, 200),
      radius: 18,
      material: 'rubberPost',
    },
  ],
  bumpers: createPopTriangle({
    top: anchorPoint('pop-top'),
    spacingX: 160,
    spacingY: 120,
    radius: 44,
    scores: [100, 100, 100],
    material: 'rubberPost',
  }),
  standupTargets: [
    {
      position: absolutePoint(280, 680),
      width: 60,
      height: 16,
      angle: 0.78,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: absolutePoint(360, 800),
      width: 60,
      height: 16,
      angle: 0.78,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: absolutePoint(680, 680),
      width: 60,
      height: 16,
      angle: Math.PI - 0.78,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: absolutePoint(600, 800),
      width: 60,
      height: 16,
      angle: Math.PI - 0.78,
      score: 100,
      material: 'rubberPost',
    },
  ],
  dropTargets: [
    {
      position: absolutePoint(440, 880),
      width: 54,
      height: 16,
      angle: -Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
    {
      position: absolutePoint(520, 880),
      width: 54,
      height: 16,
      angle: -Math.PI / 2,
      score: 500,
      material: 'rubberPost',
    },
  ],
  spinners: [
    {
      position: absolutePoint(280, 560),
      length: 96,
      thickness: 10,
      angle: 0.96,
      score: 100,
      material: 'metalGuide',
    },
    {
      position: absolutePoint(640, 560),
      length: 96,
      thickness: 10,
      angle: Math.PI - 0.96,
      score: 100,
      material: 'metalGuide',
    },
  ],
  slingshots: doubleCrossedLowerPlayfield.slingshots,
  rollovers: doubleCrossedTopArch.rollovers,
  guides: [
    ...doubleCrossedShooterLane.guides,
    ...doubleCrossedTopArch.guides,
    ...doubleCrossedLowerPlayfield.guides,
  ],
  flippers: doubleCrossedLowerPlayfield.flippers,
};

export const doubleCrossedTable =
  compileBuiltInBoardLayout(doubleCrossedLayout);
