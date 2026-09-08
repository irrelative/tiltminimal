import { absolutePoint, createPopBumperCluster } from '../layout-primitives';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createFoundation,
  createOrbit,
  createBank,
  createPocket,
  composeAssemblies,
} from './table-foundation';

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

const { lower, shooter, ...foundation } = createFoundation(
  'mirrorMatchTable',
  3,
);
const leftBank = createBank(
  'mirror-left',
  { x: 255, y: 740 },
  { x: 30, y: 70 },
  3,
);
const rightBank = createBank(
  'mirror-right',
  { x: 645, y: 740 },
  { x: -30, y: 70 },
  3,
);
const pocket = createPocket('mirror-match', { x: 450, y: 580 }, 3000);
const parts = composeAssemblies(
  lower,
  shooter,
  createOrbit('mirror-left-orbit'),
  createOrbit('mirror-right-orbit', true),
  leftBank,
  rightBank,
  pocket,
);
export const mirrorMatchTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...parts,
    name: 'Mirror Match',
    themeId: 'mirror-match',
    rulesScript: mirrorMatchRulesScript,
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
