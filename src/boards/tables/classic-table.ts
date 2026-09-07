import {
  absolutePoint,
  createFlipperPair,
  createPopBumperCluster,
  createSlingshotPair,
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

// These coordinates describe connected ball paths; do not snap their joints.
const rail = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): GuideLayoutDefinition => ({
  start: absolutePoint(x1, y1),
  end: absolutePoint(x2, y2),
  thickness: 12,
  material: 'metalGuide',
  plane: 'playfield',
});
const arc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): GuideLayoutDefinition => ({
  kind: 'arc',
  center: absolutePoint(x, y),
  radius,
  startAngle,
  endAngle,
  thickness: 12,
  material: 'metalGuide',
  plane: 'playfield',
});

// Inlanes bend inward above the flipper heels. Outside each divider is a
// separate outlane which continues to the drain.
const lowerGuides: GuideLayoutDefinition[] = [
  rail(12, 460, 12, 1380),
  rail(80, 900, 80, 1040),
  arc(220, 1040, 140, Math.PI / 2, Math.PI),
  rail(160, 900, 160, 1040),
  arc(220, 1040, 60, Math.PI / 2, Math.PI),
  rail(728, 900, 728, 1040),
  arc(588, 1040, 140, 0, Math.PI / 2),
  rail(648, 900, 648, 1040),
  arc(588, 1040, 60, 0, Math.PI / 2),
];

const classicTableLayout: BoardLayoutDefinition = {
  name: 'Classic Table',
  width: 900,
  height: 1400,
  rulesScript: classicRulesScript,
  drainY: 1425,
  launchPosition: absolutePoint(824, 1160),
  plunger: {
    x: 824,
    thickness: 32,
    guideLength: 520,
    returnGate: {
      start: { x: 432 + 364 * Math.cos(-0.8), y: 460 + 364 * Math.sin(-0.8) },
      end: { x: 432 + 420 * Math.cos(-0.8), y: 460 + 420 * Math.sin(-0.8) },
    },
  },
  materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
  physics: {
    plunger: { minReleaseSpeed: 5200, maxReleaseSpeed: 6000, bodyMass: 0.9 },
  },
  posts: [80, 160, 648, 728].map((x) => ({
    position: absolutePoint(x, 900),
    radius: 12,
    material: 'rubberPost',
  })),
  bumpers: createPopBumperCluster({
    top: absolutePoint(420, 330),
    spacingX: 140,
    spacingY: 140,
    radius: 38,
    scores: [100, 100, 250],
    material: 'rubberPost',
  }).bumpers,
  standupTargets: [0, 1, 2].map((index) => ({
    position: absolutePoint(245 + index * 40, 550 + index * 60),
    width: 56,
    height: 16,
    angle: Math.atan2(60, 40),
    score: 50,
    material: 'rubberPost',
  })),
  dropTargets: [
    {
      position: absolutePoint(365, 730),
      width: 56,
      height: 16,
      angle: Math.atan2(60, 40),
      score: 100,
      material: 'rubberPost',
    },
  ],
  saucers: [
    {
      position: absolutePoint(670, 480),
      radius: 28,
      score: 500,
      holdSeconds: 0.5,
      ejectSpeed: 640,
      ejectAngle: Math.PI / 2 + 0.15,
      material: 'metalGuide',
    },
  ],
  spinners: [
    {
      position: absolutePoint(92, 570),
      length: 70,
      thickness: 10,
      angle: 0,
      score: 10,
      material: 'metalGuide',
    },
  ],
  slingshots: createSlingshotPair({
    leftCenter: absolutePoint(260, 1030),
    rightCenter: absolutePoint(548, 1030),
    width: 144,
    height: 50,
    leftAngle: 0.65,
    rightAngle: Math.PI - 0.65,
    score: 10,
    strength: 560,
  }).slingshots,
  rollovers: [300, 410, 520].map((x) => ({
    position: absolutePoint(x, 200),
    radius: 22,
    score: 25,
  })),
  guides: [
    ...lowerGuides,
    // Persistent shooter extension and a tangent outer arch above the lanes.
    rail(852, 640, 852, 460),
    rail(796, 640, 796, 460),
    arc(432, 460, 420, Math.PI, Math.PI * 2),
    arc(432, 460, 364, -0.8, 0),
    // Open lane entrances: no roof across the rollover mouths.
    rail(245, 90, 245, 150),
    ...[245, 355, 465, 575].map((x) => rail(x, 150, x, 245)),
    // Left spinner orbit. The outside edge joins the top arch.
    rail(160, 340, 160, 540),
    rail(160, 540, 260, 820),
    // Target-bank backing, parallel to its four broad scoring faces.
    rail(290, 510, 430, 720),
    // Saucer pocket, with a flared approach and an open kickout path.
    arc(670, 480, 54, Math.PI, Math.PI * 2),
    rail(616, 480, 616, 550),
    rail(616, 550, 590, 620),
    rail(724, 480, 724, 550),
    rail(724, 550, 750, 620),
  ],
  flippers: createFlipperPair({
    leftX: 244,
    rightX: 564,
    y: 1220,
    length: 136,
    thickness: 22,
    restingAngleOffset: 0.28,
    activeAngleOffset: -0.5,
    material: 'flipperRubber',
  }),
};

export const classicTable = compileBuiltInBoardLayout(classicTableLayout, {
  snapToGrid: false,
});
