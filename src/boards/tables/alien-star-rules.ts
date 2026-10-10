/** Reference rules and explicit browser adaptations: docs/alien-star-spec.md. */
export const alienStarRulesScript = `
function value(ctx, key) { return Number(ctx.getPlayer(key) || 0); }
function award(ctx, points) { ctx.addScore(points * Number(ctx.getBall('playfield-x') || 1)); }
function bonus(ctx) { ctx.setBonus(Math.min(29000, ctx.getBonus() + 1000)); }
function special(ctx) {
  if (value(ctx, 'alien-completed') && ctx.getBall('star') === 15) ctx.setBall('special', true);
}
function collectBonus(ctx) {
  ctx.addScore(ctx.getBonus() * ctx.getBonusMultiplier());
  if (!ctx.getBall('hold-bonus')) ctx.setBonus(1000);
}
return {
  onGameStart(ctx) {
    ctx.setBallsPerGame(3); ctx.setBallsRemaining(3); ctx.setCurrentBall(1);
    ctx.setPlayer('alien', 0); ctx.setPlayer('lock-lit', false);
    ctx.setPlayer('alien-completed', false); ctx.setPlayer('selector', 0);
  },
  onBallStart(ctx) {
    ctx.setBonus(Number(ctx.getPlayer('held-bonus') || 1000));
    ctx.setBonusMultiplier(1); ctx.setPlayer('held-bonus', 0);
    ctx.setBall('star', 0); ctx.setBall('awards', 0);
    ctx.setBall('playfield-x', 1); ctx.setBall('phase', 'single');
  },
  onEvent(event, ctx) {
    if (event.type === 'spinner-spin') {
      award(ctx, ctx.isModeActive('spinner-lit') ? 10000 : 1000);
      if (ctx.getBall('phase') === 'single') ctx.setPlayer('selector', (value(ctx, 'selector') + 1) % 3);
    } else if (event.type === 'standup-target-hit') {
      if (event.index === 5) {
        award(ctx, 3000);
        if (ctx.isModeActive('advance-bonus')) { ctx.increaseBonusMultiplier(1, 5); ctx.stopMode('advance-bonus'); }
      } else if (event.index < 5) {
        const before = value(ctx, 'alien'), bit = 1 << event.index;
        award(ctx, (before & bit) ? 1000 : 3000);
        if (!(before & bit)) bonus(ctx);
        const after = before | bit; ctx.setPlayer('alien', after);
        if (after === 31) {
          ctx.setPlayer('lock-lit', true); ctx.setPlayer('alien-completed', true);
          // Relight the bank for another completion and another rotating award.
          ctx.setPlayer('alien', 0);
          const awards = Number(ctx.getBall('awards') || 0);
          for (let i = 0; i < 4; i++) if (!(awards & (1 << i))) { ctx.setBall('awards', awards | (1 << i)); break; }
          special(ctx);
        }
      }
    } else if (event.type === 'bumper-hit') {
      award(ctx, 500);
      const mask = Number(ctx.getBall('awards') || 0);
      ctx.setBall('awards', ((mask << 1) | (mask >> 3)) & 15);
    } else if (event.type === 'slingshot-hit') {
      award(ctx, 10);
    } else if (event.type === 'rollover-hit') {
      if (event.index < 4) {
        award(ctx, 1000); bonus(ctx);
        const bit = 1 << event.index, star = Number(ctx.getBall('star') || 0);
        const awards = Number(ctx.getBall('awards') || 0);
        // Both inserts must already be lit on entering the lane.
        if ((star & bit) && (awards & bit)) {
          ctx.setBall('awards', awards & ~bit);
          if (event.index === 0) collectBonus(ctx);
          if (event.index === 1) ctx.increaseBonusMultiplier(1, 5);
          if (event.index === 2) ctx.setBall('hold-bonus', true);
          if (event.index === 3 && !ctx.getBall('extra-ball')) { ctx.setBall('extra-ball', true); ctx.setBallsRemaining(ctx.getBallsRemaining() + 1); }
        }
        ctx.setBall('star', star | bit); ctx.setRolloverLit(event.index, true); special(ctx);
      } else if (event.index < 6) {
        award(ctx, 1000); bonus(ctx);
        ctx.startMode(event.index === 4 ? 'advance-bonus' : 'spinner-lit', 5000);
      } else {
        award(ctx, 1000);
        if (ctx.getBall('special')) { ctx.addScore(50000); ctx.setBall('special', false); }
      }
    } else if (event.type === 'saucer-captured') {
      award(ctx, 10000);
      if (ctx.getBall('phase') === 'single' && ctx.getPlayer('lock-lit') && ctx.lockBall(event.index)) {
        ctx.setBall('phase', 'locked'); ctx.setBall('locked-x', [2, 3, 5][value(ctx, 'selector')]);
        ctx.setPlayer('lock-lit', false); ctx.setPlayer('alien', 0);
      }
    } else if (event.type === 'ball-launched' && ctx.getBall('phase') === 'locked') {
      if (ctx.releaseLockedBalls() === 1) { ctx.setBall('phase', 'multiball'); ctx.setBall('playfield-x', ctx.getBall('locked-x')); }
    } else if (event.type === 'multiball-ended') {
      ctx.setBall('phase', 'single'); ctx.setBall('playfield-x', 1);
    } else if (event.type === 'ball-drained') {
      if (ctx.getBall('hold-bonus')) ctx.setPlayer('held-bonus', ctx.getBonus());
      collectBonus(ctx);
      if (ctx.getBallsRemaining() > 1) ctx.startNextBall(); else ctx.endGame();
    }
  },
};
`;
