import { absolutePoint, createPopBumperCluster } from '../layout-primitives';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createFoundation,
  createOrbit,
  createBank,
  composeAssemblies,
} from './table-foundation';

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

const { lower, shooter, ...foundation } = createFoundation(
  'doubleCrossedTable',
  4,
);
const leftBank = createBank(
  'cross-left',
  { x: 240, y: 620 },
  { x: 40, y: 80 },
  2,
  true,
  100,
);
const rightBank = createBank(
  'cross-right',
  { x: 660, y: 620 },
  { x: -40, y: 80 },
  2,
  true,
  100,
);
const parts = composeAssemblies(
  lower,
  shooter,
  createOrbit('cross-left-orbit'),
  createOrbit('cross-right-orbit', true),
  leftBank,
  rightBank,
);
parts.posts!.push({
  position: { x: 450, y: 1000 },
  radius: 18,
  material: 'rubberPost',
});
export const doubleCrossedTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...parts,
    name: 'Double Crossed',
    themeId: 'midnight',
    rulesScript: doubleCrossedRulesScript,
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
