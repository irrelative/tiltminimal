import { softPlungeRules } from './soft-plunge-rules';

/** Network qualification and flat, directed orbit shots. All clocks use simulation time. */
export const switchyardRulesScript = `
${softPlungeRules}
function resetNetwork(ctx) {
  ctx.resetDropTargets([0,1,2]); ctx.setBall('network', 0); ctx.setBall('cargo', 0); ctx.setBall('signal', 0);
  ctx.setBall('phase', 'qualify'); ctx.setBall('jackpots', 0);
  ctx.setBall('orbits', {}); ctx.setBall('combo-shot', -1); ctx.stopMode('combo');
}
function bonus(ctx) { ctx.setBonus(Math.min(20000, ctx.getBonus() + 500)); }
function made(ctx, shot) {
  bonus(ctx);
  if (ctx.getBall('phase') === 'multiball') {
    const mask = Number(ctx.getBall('jackpots') || 0);
    if (!(mask & (1 << shot))) { ctx.addScore(10000); ctx.setBall('jackpots', mask | (1 << shot)); }
    return;
  }
  if (ctx.isModeActive('combo') && ctx.getBall('combo-shot') !== shot) ctx.addScore(2000);
  ctx.setBall('combo-shot', shot); ctx.startMode('combo', 4000);
  ctx.setBall('network', Number(ctx.getBall('network') || 0) | (1 << shot));
}
return {
  onGameStart(ctx) { ctx.setBallsPerGame(3); ctx.setBallsRemaining(3); ctx.setCurrentBall(1); },
  onBallStart(ctx) { ctx.setBall('skill-shot', 'ready'); resetNetwork(ctx); ctx.setBall('clock', 0); ctx.setBonus(0); ctx.setBonusMultiplier(1); },
  onTick(ms, ctx) { ctx.setBall('clock', Number(ctx.getBall('clock') || 0) + ms); },
  onEvent(event, ctx) {
    if (event.type === 'drop-target-hit' && ['ready','armed'].includes(ctx.getBall('skill-shot'))) ctx.setBall('skill-shot', 'missed');
    if (skillShot(event, ctx)) return;
    if (event.type === 'rollover-hit') {
      if (event.ballId === undefined) return;
      const tracks = ctx.getBall('orbits') || {};
      const key = String(event.ballId), now = Number(ctx.getBall('clock') || 0);
      let track = tracks[key];
      if (track && now - track.time > 5000) track = undefined;
      if (track && event.index === (track.entry === 0 ? 2 : track.entry === 5 ? 7 : 5)) {
        if (track.top) { ctx.addScore(2000); made(ctx, track.entry === 0 ? 0 : 3); }
        track = undefined;
      } else if (event.index === 0 || event.index === 5 || event.index === 7) {
        track = { entry: event.index, top: false, time: now };
      } else if (track && event.index === (track.entry === 0 ? 1 : 6)) {
        track.top = true;
      }
      if (track) tracks[key] = track; else delete tracks[key];
      ctx.setBall('orbits', tracks);
    } else if (event.type === 'standup-target-hit' || event.type === 'drop-target-hit') {
      ctx.addScore(500);
      const cargo = event.type === 'drop-target-hit';
      const key = cargo ? 'cargo' : 'signal', shot = cargo ? 1 : 2;
      const mask = Number(ctx.getBall(key) || 0) | (1 << event.index);
      ctx.setBall(key, mask);
      const complete = mask === (cargo ? 7 : 3);
      if (ctx.getBall('phase') === 'multiball') made(ctx, shot);
      else if (complete) { ctx.addScore(3000); made(ctx, shot); }
      if (complete) {
        ctx.setBall(key, 0);
        if (cargo) ctx.resetDropTargets([0,1,2]);
      }
    } else if (event.type === 'spinner-spin' || event.type === 'slingshot-hit') {
      ctx.addScore(event.score);
    } else if (event.type === 'saucer-captured') {
      ctx.stopMode('combo'); ctx.setBall('combo-shot', -1); ctx.setBall('orbits', {});
      if (ctx.getBall('phase') === 'multiball' && ctx.getBall('jackpots') === 15) {
        ctx.addScore(50000); ctx.setBall('jackpots', 0); ctx.setBall('cargo', 0); ctx.resetDropTargets([0,1,2]);
      } else {
        ctx.addScore(2000); bonus(ctx);
        if (ctx.getBall('phase') === 'qualify') {
          if (ctx.getBall('network') === 31 && ctx.lockBall(event.index)) ctx.setBall('phase', 'locked');
          else ctx.setBall('network', Number(ctx.getBall('network') || 0) | 16);
        }
      }
    } else if (event.type === 'ball-launched' && ctx.getBall('phase') === 'locked') {
      if (ctx.releaseLockedBalls() === 1) { ctx.setBall('phase', 'multiball'); ctx.setBall('jackpots', 0); ctx.setBall('cargo',0); ctx.resetDropTargets([0,1,2]); }
    } else if (event.type === 'multiball-ended') {
      resetNetwork(ctx);
    } else if (event.type === 'ball-drained') {
      ctx.stopMode('combo'); ctx.addScore(ctx.getBonus()); resetNetwork(ctx);
      if (ctx.getBallsRemaining() > 1) ctx.startNextBall(); else ctx.endGame();
    }
  },
};
`;
