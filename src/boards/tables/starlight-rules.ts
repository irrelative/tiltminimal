/** Five-ball, untimed relay-style rules. Feature lamps reset at each new ball. */
export const starlightEmRulesScript = `
const BALLS_PER_GAME = 5;
function bonus(ctx, amount) { ctx.setBonus(Math.min(20000, ctx.getBonus() + amount)); }
function resetBall(ctx) {
  ctx.setBonus(0);
  ctx.setBonusMultiplier(1);
  ['star', 'comet', 'nova'].forEach(key => ctx.setBall(key, 0));
  ['comet-lit', 'nova-lit', 'star-complete'].forEach(key => ctx.setBall(key, false));
}
return {
  onGameStart(ctx) {
    ctx.setBallsPerGame(BALLS_PER_GAME);
    ctx.setBallsRemaining(BALLS_PER_GAME);
    ctx.setCurrentBall(1);
    ctx.setPlayer('constellations', 0);
    ctx.setPlayer('extra-ball-awarded', false);
    resetBall(ctx);
  },
  onBallStart(ctx) { resetBall(ctx); },
  onEvent(event, ctx) {
    if (event.type === 'rollover-hit' && event.index < 4) {
      ctx.addScore(event.score); bonus(ctx, 250);
      const mask = Number(ctx.getBall('star') || 0) | (1 << event.index);
      ctx.setBall('star', mask);
      if (mask === 15) {
        ctx.addScore(2000); bonus(ctx, 1000);
        ctx.setBonusMultiplier(Math.min(5, ctx.getBonusMultiplier() + 1));
        ctx.setBall('star-complete', true);
        ctx.setBall('star', 0);
      }
    } else if (event.type === 'standup-target-hit') {
      ctx.addScore(event.score); bonus(ctx, 400);
      const key = event.index < 3 ? 'comet' : 'nova';
      const mask = Number(ctx.getBall(key) || 0) | (1 << (event.index % 3));
      ctx.setBall(key, mask);
      if (mask === 7) {
        ctx.addScore(3000); bonus(ctx, 1000);
        ctx.setBall(key + '-lit', true);
        ctx.setBall(key, 0);
      }
    } else if (event.type === 'spinner-spin') {
      const lit = ctx.getBall(event.index === 0 ? 'comet-lit' : 'nova-lit');
      ctx.addScore(lit ? (event.index === 0 ? 500 : 1000) : event.score);
      bonus(ctx, 50);
    } else if (event.type === 'bumper-hit') {
      ctx.addScore(ctx.getBall('star-complete') ? 1000 : event.score);
      bonus(ctx, 100);
    } else if (event.type === 'slingshot-hit') {
      ctx.addScore(event.score); bonus(ctx, 100);
    } else if (event.type === 'saucer-captured') {
      if (ctx.getBall('comet-lit') && ctx.getBall('nova-lit')) {
        const count = Number(ctx.getPlayer('constellations') || 0);
        ctx.addScore(Math.min(25000, 10000 + count * 5000));
        ctx.setPlayer('constellations', count + 1);
        bonus(ctx, 3000);
        if (ctx.getBall('star-complete') && !ctx.getPlayer('extra-ball-awarded')) {
          ctx.setBallsRemaining(ctx.getBallsRemaining() + 1);
          ctx.setPlayer('extra-ball-awarded', true);
        }
        ['comet', 'nova'].forEach(key => {
          ctx.setBall(key, 0); ctx.setBall(key + '-lit', false);
        });
      } else { ctx.addScore(event.score); bonus(ctx, 1500); }
    } else if (event.type === 'ball-drained') {
      ctx.addScore(ctx.getBonus() * ctx.getBonusMultiplier());
      if (ctx.getBallsRemaining() > 1) ctx.startNextBall();
      else ctx.endGame();
    }
  },
};
`;
