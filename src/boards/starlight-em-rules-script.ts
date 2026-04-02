export const starlightEmRulesScript = `
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
