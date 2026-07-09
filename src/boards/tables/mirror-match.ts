import {
  absolutePoint,
  anchorPoint,
  createMirroredTargetBank,
  createPopBumperCluster,
  createShooterLaneRight,
  createStandardLowerPlayfieldPair,
  createTopArchLanes,
} from '../layout-primitives';
import type { BoardLayoutDefinition } from '../layout-schema';
import { compileBuiltInBoardLayout } from '../layout-compiler';

const mirrorMatchRulesScript = `
const BALLS_PER_GAME = 3;
const TOP_LANES = ['top-0', 'top-1', 'top-2'];
const LEFT_BANK = ['left-0', 'left-1', 'left-2'];
const RIGHT_BANK = ['right-0', 'right-1', 'right-2'];

function reset(ctx, names) {
  names.forEach((name) => ctx.setMachine(name, false));
}

function complete(ctx, names) {
  return names.every((name) => ctx.getMachine(name) === true);
}

function resetBallFeatures(ctx) {
  reset(ctx, TOP_LANES);
  reset(ctx, LEFT_BANK);
  reset(ctx, RIGHT_BANK);
  ctx.setMachine('mirror-match-ready', false);
}

return {
  onGameStart(ctx) {
    ctx.setBallsPerGame(BALLS_PER_GAME);
    ctx.setBallsRemaining(BALLS_PER_GAME);
    ctx.setCurrentBall(1);
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetBallFeatures(ctx);
  },

  onBallStart(ctx) {
    ctx.setBonus(0);
    ctx.setBonusMultiplier(1);
    resetBallFeatures(ctx);
  },

  onEvent(event, ctx) {
    if (event.type === 'bumper-hit' || event.type === 'spinner-spin') {
      ctx.addScore(event.score);
      ctx.addBonus(event.type === 'bumper-hit' ? 100 : 50);
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
      ctx.setMachine(TOP_LANES[event.index] ?? 'top-' + String(event.index), true);
      if (complete(ctx, TOP_LANES)) {
        ctx.addScore(2000);
        ctx.increaseBonusMultiplier(1, 4);
        reset(ctx, TOP_LANES);
      }
      return;
    }

    if (event.type === 'standup-target-hit') {
      ctx.addScore(event.score);
      ctx.addBonus(400);
      const bank = event.index < 3 ? LEFT_BANK : RIGHT_BANK;
      const name = bank[event.index % 3];
      if (name) ctx.setMachine(name, true);

      if (complete(ctx, LEFT_BANK) && complete(ctx, RIGHT_BANK)) {
        ctx.setMachine('mirror-match-ready', true);
        ctx.addScore(3000);
      }
      return;
    }

    if (event.type === 'saucer-captured') {
      ctx.addScore(event.score);
      if (ctx.getMachine('mirror-match-ready') === true) {
        ctx.addScore(7000);
        ctx.increaseBonusMultiplier(1, 5);
        reset(ctx, LEFT_BANK);
        reset(ctx, RIGHT_BANK);
        ctx.setMachine('mirror-match-ready', false);
      } else {
        ctx.addBonus(1000);
      }
      return;
    }

    if (event.type === 'ball-drained') {
      ctx.addScore(ctx.getBonus() * ctx.getBonusMultiplier());
      if (ctx.getBallsRemaining() > 1) ctx.startNextBall();
      else ctx.endGame();
    }
  },
};
`;

const lowerPlayfield = createStandardLowerPlayfieldPair({
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

const shooterLane = createShooterLaneRight({
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

const topArch = createTopArchLanes({
  center: anchorPoint('top-arch-center'),
  laneCount: 3,
  spacingX: 150,
  radius: 22,
  score: 500,
  roofOffsetY: -58,
  separatorBottomOffsetY: 28,
  shoulderStartOffsetY: 86,
  sideEntryInset: 112,
  roofInset: 66,
});

const lowerLaneRailAccents = [
  {
    start: absolutePoint(88, 780),
    end: absolutePoint(88, 980),
    thickness: 10,
    material: 'metalGuide' as const,
    plane: 'raised' as const,
  },
  {
    start: absolutePoint(88, 780),
    end: absolutePoint(142, 734),
    thickness: 10,
    material: 'metalGuide' as const,
    plane: 'raised' as const,
  },
  {
    start: absolutePoint(852, 780),
    end: absolutePoint(852, 980),
    thickness: 10,
    material: 'metalGuide' as const,
    plane: 'raised' as const,
  },
  {
    start: absolutePoint(852, 780),
    end: absolutePoint(820, 734),
    thickness: 10,
    material: 'metalGuide' as const,
    plane: 'raised' as const,
  },
];

const popCluster = createPopBumperCluster({
  top: absolutePoint(450, 300),
  spacingX: 220,
  spacingY: 160,
  radius: 42,
  scores: [100, 100, 100],
  material: 'rubberPost',
});

const targetBanks = createMirroredTargetBank({
  kind: 'standup',
  center: absolutePoint(450, 740),
  targetsPerBank: 3,
  sideOffsetX: 220,
  spacingY: 80,
  width: 60,
  height: 16,
  angleOffset: 0.18,
  score: 500,
  material: 'rubberPost',
});

const mirrorMatchLayout: BoardLayoutDefinition = {
  name: 'Mirror Match',
  themeId: 'mirror-match',
  template: 'solid-state-two-flipper',
  width: 900,
  height: 1400,
  rulesScript: mirrorMatchRulesScript,
  drainY: 1425,
  launchPosition: shooterLane.launchPosition,
  plunger: shooterLane.plunger,
  materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
  physics: {
    plunger: { minReleaseSpeed: 5600, maxReleaseSpeed: 6800, bodyMass: 0.9 },
  },
  posts: [
    ...lowerPlayfield.posts,
    ...popCluster.posts,
    { position: absolutePoint(450, 1080), radius: 18, material: 'rubberPost' },
  ],
  bumpers: popCluster.bumpers,
  standupTargets: targetBanks.standupTargets,
  saucers: [
    {
      position: absolutePoint(450, 590),
      radius: 30,
      score: 3000,
      holdSeconds: 0.5,
      ejectSpeed: 960,
      ejectAngle: -Math.PI / 2,
      material: 'metalGuide',
    },
  ],
  spinners: [
    {
      position: absolutePoint(260, 530),
      length: 92,
      thickness: 10,
      angle: -0.58,
      score: 100,
      material: 'metalGuide',
    },
    {
      position: absolutePoint(640, 530),
      length: 92,
      thickness: 10,
      angle: Math.PI + 0.58,
      score: 100,
      material: 'metalGuide',
    },
  ],
  slingshots: lowerPlayfield.slingshots,
  rollovers: topArch.rollovers,
  guides: [
    ...lowerPlayfield.guides,
    ...popCluster.guides,
    ...lowerLaneRailAccents,
    ...topArch.guides,
    {
      start: absolutePoint(820, 438),
      end: absolutePoint(704, 246),
      thickness: 14,
      material: 'metalGuide',
    },
    ...shooterLane.guides,
  ],
  flippers: lowerPlayfield.flippers,
};

export const mirrorMatchTable = compileBuiltInBoardLayout(mirrorMatchLayout);
