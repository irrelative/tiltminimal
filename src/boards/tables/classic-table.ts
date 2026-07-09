import {
  absolutePoint,
  anchorPoint,
  createMirroredTargetBank,
  createPopBumperCluster,
  createShooterLaneRight,
  createStandardLowerPlayfieldPair,
  createTopArchLanes,
} from '../layout-primitives';
import type {
  BoardLayoutDefinition,
  GuideLayoutDefinition,
} from '../layout-schema';
import { compileBuiltInBoardLayout } from '../layout-compiler';

const classicRulesScript = `
const BALLS_PER_GAME = 3;
const TOP_LANES = ['top-left-lane', 'top-center-lane', 'top-right-lane'];

function resetTopLanes(ctx) {
  TOP_LANES.forEach((lane) => ctx.setMachine(lane, false));
}

function areTopLanesComplete(ctx) {
  return TOP_LANES.every((lane) => ctx.getMachine(lane) === true);
}

return {
  onGameStart(ctx) {
    ctx.setBallsPerGame(BALLS_PER_GAME);
    ctx.setBallsRemaining(BALLS_PER_GAME);
    ctx.setCurrentBall(1);
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetTopLanes(ctx);
  },

  onBallStart(ctx) {
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetTopLanes(ctx);
  },

  onEvent(event, ctx) {
    if (event.type === 'bumper-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(100);
      return;
    }

    if (event.type === 'standup-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(500);
      return;
    }

    if (event.type === 'drop-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(1000);
      ctx.increaseBonusMultiplier(1, 3);
      return;
    }

    if (event.type === 'saucer-captured') {
      ctx.addScore(event.score);
      ctx.addBonus(1500);
      return;
    }

    if (event.type === 'spinner-spin') {
      ctx.addScore(event.score);
      ctx.addBonus(25);
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

      if (areTopLanesComplete(ctx)) {
        ctx.addScore(1000);
        ctx.increaseBonusMultiplier(1, 5);
        resetTopLanes(ctx);
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

const classicLowerPlayfield = createStandardLowerPlayfieldPair({
  leftFlipperPivot: absolutePoint(270, 1220),
  rightFlipperPivot: absolutePoint(630, 1220),
  slingshots: {
    angle: 0.5,
    score: 10,
    strength: 560,
  },
  flippers: {
    leftX: 270,
    rightX: 630,
    y: 1220,
    length: 150,
    thickness: 20,
    restingAngleOffset: 0.28,
    activeAngleOffset: -0.42,
    material: 'flipperRubber',
  },
});

const classicShooterLane = createShooterLaneRight({
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

const classicTopArch = createTopArchLanes({
  center: anchorPoint('top-arch-center'),
  laneCount: 3,
  spacingX: 150,
  radius: 24,
  score: 25,
  roofOffsetY: -58,
  separatorBottomOffsetY: 28,
  shoulderStartOffsetY: 86,
  sideEntryInset: 112,
  roofInset: 66,
});

const classicPopCluster = createPopBumperCluster({
  top: anchorPoint('pop-cluster-top'),
  spacingX: 240,
  spacingY: 180,
  radius: 44,
  scores: [100, 100, 250],
  material: 'rubberPost',
});

const classicStandupBank = createMirroredTargetBank({
  kind: 'standup',
  center: anchorPoint('target-bank-center'),
  targetsPerBank: 3,
  sideOffsetX: 220,
  spacingY: 80,
  width: 60,
  height: 16,
  angleOffset: 0.2,
  score: 50,
  material: 'rubberPost',
});

const classicShooterExitGuides: GuideLayoutDefinition[] = [
  {
    start: absolutePoint(820, 438),
    end: absolutePoint(704, 246),
    thickness: 14,
    material: 'metalGuide',
  },
];

const classicTableLayout: BoardLayoutDefinition = {
  name: 'Classic Table',
  template: 'solid-state-two-flipper',
  width: 900,
  height: 1400,
  rulesScript: classicRulesScript,
  drainY: 1425,
  launchPosition: classicShooterLane.launchPosition,
  plunger: classicShooterLane.plunger,
  materials: {
    playfield: 'playfieldWood',
    walls: 'metalGuide',
  },
  physics: {
    plunger: {
      minReleaseSpeed: 5200,
      maxReleaseSpeed: 6000,
      bodyMass: 0.9,
    },
  },
  posts: [...classicLowerPlayfield.posts, ...classicPopCluster.posts],
  bumpers: classicPopCluster.bumpers,
  standupTargets: classicStandupBank.standupTargets,
  dropTargets: [
    {
      position: absolutePoint(450, 470),
      width: 54,
      height: 16,
      angle: -Math.PI / 2,
      score: 100,
      material: 'rubberPost',
    },
  ],
  saucers: [
    {
      position: absolutePoint(610, 270),
      radius: 30,
      score: 500,
      holdSeconds: 0.5,
      ejectSpeed: 980,
      ejectAngle: Math.PI * 0.45,
      material: 'metalGuide',
    },
  ],
  spinners: [
    {
      position: absolutePoint(520, 800),
      length: 96,
      thickness: 10,
      angle: 0,
      score: 10,
      material: 'metalGuide',
    },
  ],
  slingshots: classicLowerPlayfield.slingshots,
  rollovers: classicTopArch.rollovers,
  guides: [
    ...classicLowerPlayfield.guides,
    ...classicPopCluster.guides,
    ...classicTopArch.guides,
    ...classicShooterExitGuides,
    ...classicShooterLane.guides,
  ],
  flippers: classicLowerPlayfield.flippers,
};

export const classicTable = compileBuiltInBoardLayout(classicTableLayout);
