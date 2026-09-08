// Game Plan rules of play; score/replay adaptations are documented in the spec.
export const andromedaRulesScript = `
function status(ctx) {
  const prefix = ctx.getBall('multiball') ? 'MULTIBALL · 2× playfield' :
    ctx.getLockedBallCount() ? 'LOCKED · Shoot yellow target for multiball' : 'Shoot the left drop, then lock';
  ctx.setMachine('table-status', prefix + ' · Spinner ' + (ctx.getBall('spinner') || 100));
}
function score(ctx, points) { ctx.addScore(points * (ctx.getBall('multiball') ? 2 : 1)); }
function bonus(ctx, steps) { ctx.setBonus(Math.min(99000, ctx.getBonus() + steps * 1000)); }
function lanes(ctx, mask) {
  ctx.setBall('lanes', mask);
  for (let i = 0; i < 3; i++) ctx.setRolloverLit(i, Boolean(mask & (1 << i)));
}
return {
  onGameStart(ctx) { ctx.setBallsPerGame(3); ctx.setBallsRemaining(3); ctx.setCurrentBall(1); },
  onBallStart(ctx) {
    ctx.setBonus(0); ctx.setBonusMultiplier(1);
    ctx.setBall('multiball', false); ctx.setBall('spinner', 100);
    ctx.setBall('banks', 0); ctx.setBall('drops', 0); ctx.setBall('powered', false);
    ctx.setBall('upperLane', false); ctx.setBall('lowerLane', false);
    ctx.setBall('extraLit', false); ctx.setBall('specialLit', false);
    lanes(ctx, 0); status(ctx);
  },
  onEvent(event, ctx) {
    if (event.type === 'flipper-pressed' && event.side === 'right') {
      const mask = ctx.getBall('lanes') || 0;
      lanes(ctx, ((mask << 1) & 7) | (mask >> 2));
    } else if (event.type === 'multiball-ended') {
      ctx.setBall('multiball', false);
    } else if (event.type === 'saucer-captured') {
      score(ctx, 30000);
      if (!ctx.getBall('multiball')) ctx.lockBall(event.index);
    } else if (event.type === 'standup-target-hit') {
      score(ctx, 1000); ctx.setBall('powered', true);
      if (event.index === 1 && ctx.releaseLockedBalls() > 0) ctx.setBall('multiball', true);
    } else if (event.type === 'bumper-hit') {
      score(ctx, ctx.getBall('powered') ? 1000 : 100);
    } else if (event.type === 'spinner-spin') {
      score(ctx, ctx.getBall('spinner') || 100);
    } else if (event.type === 'drop-target-hit') {
      bonus(ctx, 1); score(ctx, event.index === 6 ? 5000 : 3000);
      if (event.index < 6) {
        const mask = (ctx.getBall('drops') || 0) | (1 << event.index);
        ctx.setBall('drops', mask);
        if ((mask & 7) === 7) ctx.setBall('upperLane', true);
        if ((mask & 56) === 56) ctx.setBall('lowerLane', true);
        if (mask === 63) {
          score(ctx, 50000);
          const rounds = ctx.incrementBall('banks');
          ctx.setBall('spinner', Math.min(10000, rounds * 1000));
          if (rounds === 2) ctx.setBall('extraLit', true);
          if (rounds === 3) ctx.setBall('specialLit', true);
          if (rounds >= 4) score(ctx, 100000);
          ctx.setBall('drops', 0); ctx.resetDropTargets([0,1,2,3,4,5]);
        }
      }
    } else if (event.type === 'rollover-hit') {
      if (event.index < 3) {
        score(ctx, 3000); bonus(ctx, 1);
        const mask = (ctx.getBall('lanes') || 0) | (1 << event.index);
        if (mask === 7) { ctx.increaseBonusMultiplier(1, 10); lanes(ctx, 0); }
        else lanes(ctx, mask);
      } else if (event.index === 3 || event.index === 4) {
        const key = event.index === 3 ? 'upperLane' : 'lowerLane';
        const lit = ctx.getBall(key); score(ctx, lit ? 20000 : 3000);
        bonus(ctx, lit ? 3 : 1); ctx.setBall(key, false);
      } else if (event.index === 5) {
        score(ctx, 3000);
        if (ctx.getBall('extraLit')) { ctx.setBallsRemaining(ctx.getBallsRemaining() + 1); ctx.setBall('extraLit', false); }
      } else if (event.index === 6) {
        score(ctx, ctx.getBall('specialLit') ? 100000 : 5000); ctx.setBall('specialLit', false);
      }
    } else if (event.type === 'slingshot-hit') { score(ctx, 30);
    } else if (event.type === 'ball-drained') {
      ctx.addScore(ctx.getBonus() * ctx.getBonusMultiplier());
      if (ctx.getBallsRemaining() > 1) ctx.startNextBall(); else ctx.endGame();
    }
    status(ctx);
  }
};
`;
