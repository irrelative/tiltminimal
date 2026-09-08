import { absolutePoint, createPopBumperCluster } from '../layout-primitives';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import { createShotLaneAssembly } from '../assemblies';
import {
  createFoundation,
  createOrbit,
  createBank,
  createPocket,
  composeAssemblies,
} from './table-foundation';

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

const { lower, shooter, ...foundation } = createFoundation(
  'starlightEmTable',
  4,
);
const leftBank = createBank(
  'starlight-left',
  { x: 255, y: 740 },
  { x: 30, y: 70 },
  3,
);
const rightBank = createBank(
  'starlight-right',
  { x: 645, y: 740 },
  { x: -30, y: 70 },
  3,
);
const pocket = createPocket('starlight-saucer', { x: 660, y: 370 }, 3000);
const centerLane = createShotLaneAssembly({
  id: 'starlight-center',
  outerPath: [
    { x: 380, y: 560 },
    { x: 380, y: 720 },
  ],
  innerPath: [
    { x: 520, y: 560 },
    { x: 520, y: 720 },
  ],
  spinner: { position: { x: 450, y: 650 }, length: 90, angle: 0, score: 100 },
  entry: { x: 450, y: 760 },
  entryVelocities: [{ x: 0, y: -1400 }],
  exit: { type: 'region', min: { x: 380, y: 480 }, max: { x: 520, y: 540 } },
});
const parts = composeAssemblies(
  lower,
  shooter,
  createOrbit('starlight-orbit'),
  centerLane,
  leftBank,
  rightBank,
  pocket,
);
export const starlightEmTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...parts,
    name: 'Starlight EM',
    themeId: 'sunburst',
    rulesScript: starlightEmRulesScript,
    bumpers: createPopBumperCluster({
      top: absolutePoint(450, 320),
      spacingX: 180,
      spacingY: 140,
      radius: 38,
      scores: [100, 100, 100],
      material: 'rubberPost',
    }).bumpers,
  },
  { snapToGrid: false },
);
