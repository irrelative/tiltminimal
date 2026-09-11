/** A small collecting loop: play both spinners, repair four targets, collect a pin. */
export const justOneMoreRulesScript = `
function reset(ctx) {
  ctx.setBall('phase', 'qualify');
  ctx.setBall('play', 0); ctx.setBall('fix', 0); ctx.setBall('jackpots', 0);
}
return {
  onGameStart(ctx) { ctx.setBallsPerGame(3); ctx.setBallsRemaining(3); ctx.setCurrentBall(1); },
  onBallStart(ctx) { reset(ctx); ctx.setBonus(0); ctx.setBonusMultiplier(1); },
  onEvent(event, ctx) {
    // Orbit sensors support physical route validation; only spinners qualify PLAY.
    if (event.type === 'rollover-hit') return;
    if (event.type === 'spinner-spin') {
      ctx.addScore(100);
      const key = ctx.getBall('phase') === 'multiball' ? 'jackpots' : 'play';
      ctx.setBall(key, Number(ctx.getBall(key) || 0) | (1 << event.index));
    } else if (event.type === 'standup-target-hit') {
      ctx.addScore(500);
      if (ctx.getBall('phase') === 'qualify') {
        const before = Number(ctx.getBall('fix') || 0), after = before | (1 << event.index);
        ctx.setBall('fix', after);
        if (before !== 15 && after === 15) ctx.addScore(2000);
      }
    } else if (event.type === 'saucer-captured') {
      if (ctx.getBall('phase') === 'multiball') {
        if (ctx.getBall('jackpots') === 3) { ctx.addScore(10000); ctx.setBall('jackpots', 0); }
        else ctx.addScore(1000);
      } else {
        ctx.addScore(1000);
        if (ctx.getBall('phase') === 'qualify' && ctx.getBall('play') === 3 && ctx.getBall('fix') === 15 && ctx.lockBall(event.index)) {
          ctx.addScore(4000); ctx.setBall('phase', 'locked');
        }
      }
    } else if (event.type === 'ball-launched' && ctx.getBall('phase') === 'locked') {
      if (ctx.releaseLockedBalls() === 1) { ctx.setBall('phase', 'multiball'); ctx.setBall('jackpots', 0); }
    } else if (event.type === 'slingshot-hit') {
      ctx.addScore(event.score);
    } else if (event.type === 'multiball-ended') {
      reset(ctx);
    } else if (event.type === 'ball-drained') {
      reset(ctx);
      if (ctx.getBallsRemaining() > 1) ctx.startNextBall(); else ctx.endGame();
    }
  },
};
`;
