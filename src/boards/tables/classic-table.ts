import { absolutePoint, createPopBumperCluster } from '../layout-primitives';
import type { BoardLayoutDefinition } from '../layout-schema';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  composeAssemblies,
  createLowerPlayfieldAssembly,
  createShooterArchAssembly,
  createShotLaneAssembly,
  createTargetBankAssembly,
  createSaucerPocketAssembly,
} from '../assemblies';

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

const lower = createLowerPlayfieldAssembly({
  id: 'classic-lower',
  center: { x: 404, y: 1220 },
  pivotSpacing: 320,
  flipperLength: 136,
  laneWidth: 72,
  returnRadius: 148,
  bendRise: 174,
  entryRise: 320,
  heelOffset: 32,
  slingWidth: 144,
  slingHeight: 50,
  slingAngle: 2.05,
  slingAtReturn: true,
});
const shooter = createShooterArchAssembly({
  id: 'classic-shooter',
  center: { x: 432, y: 460 },
  radius: 420,
  laneWidth: 56,
  launchY: 1160,
  guideTopY: 640,
  gateAngle: -0.8,
  lanes: {
    firstX: 300,
    y: 200,
    spacing: 110,
    count: 3,
    radius: 22,
    dividerTop: 150,
    dividerBottom: 245,
    score: 25,
  },
});
const spinnerLane = createShotLaneAssembly({
  id: 'classic-orbit',
  outerPath: [
    { x: 12, y: 460 },
    { x: 12, y: 1380 },
  ],
  innerPath: [
    { x: 160, y: 340 },
    { x: 160, y: 540 },
    { x: 260, y: 820 },
  ],
  spinner: { position: { x: 92, y: 570 }, length: 70, angle: 0, score: 10 },
  entry: { x: 100, y: 740 },
  entryVelocities: [{ x: 0, y: -1800 }],
  exit: { type: 'region', min: { x: 12, y: 50 }, max: { x: 780, y: 300 } },
});
const targetBank = createTargetBankAssembly({
  id: 'classic-bank',
  first: { x: 245, y: 550 },
  step: { x: 40, y: 60 },
  standupCount: 3,
  endDropTarget: true,
  targetWidth: 56,
  targetHeight: 16,
  backingOffset: { x: 55, y: -25 },
  backingExtension: Math.hypot(10, 15),
  standupScore: 50,
  dropScore: 100,
  returnRegion: {
    type: 'region',
    min: { x: 12, y: 800 },
    max: { x: 780, y: 1220 },
  },
});
const saucerPocket = createSaucerPocketAssembly({
  id: 'classic-saucer',
  center: { x: 670, y: 480 },
  radius: 28,
  wallRadius: 54,
  throatLength: 70,
  mouthDepth: 140,
  mouthHalfWidth: 80,
  score: 500,
  holdSeconds: 0.5,
  ejectSpeed: 640,
  ejectAngle: Math.PI / 2 + 0.15,
  approachSpeed: 1050,
  returnRegion: {
    type: 'region',
    min: { x: 610, y: 650 },
    max: { x: 680, y: 800 },
  },
});

const classicTableLayout: BoardLayoutDefinition = {
  ...composeAssemblies(lower, shooter, spinnerLane, targetBank, saucerPocket),
  name: 'Classic Table',
  width: 900,
  height: 1400,
  rulesScript: classicRulesScript,
  drainY: 1425,
  launchPosition: shooter.launchPosition,
  plunger: shooter.plunger,
  materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
  physics: {
    plunger: { minReleaseSpeed: 0, maxReleaseSpeed: 2800, bodyMass: 0.9 },
  },
  bumpers: createPopBumperCluster({
    top: absolutePoint(420, 330),
    spacingX: 140,
    spacingY: 140,
    radius: 38,
    scores: [100, 100, 250],
    material: 'rubberPost',
  }).bumpers,
};

export const classicTable = compileBuiltInBoardLayout(classicTableLayout, {
  snapToGrid: false,
});
