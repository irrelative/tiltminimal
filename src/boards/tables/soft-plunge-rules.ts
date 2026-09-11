/** Shared script fragment; fan-layout rollovers 3 and 4 are skill/overshoot sensors. */
export const softPlungeRules = `
function skillShot(event, ctx) {
  const sensor = event.type === 'rollover-hit' && (event.index === 3 || event.index === 4);
  const phase = ctx.getBall('skill-shot');
  if (event.type === 'ball-launched' && phase === 'ready') ctx.setBall('skill-shot', 'armed');
  if (phase === 'armed' && event.type === 'rollover-hit' && event.index === 3) {
    ctx.addScore(5000); ctx.setBall('skill-shot', 'collected');
  } else if ((phase === 'ready' || phase === 'armed') && (
    event.type === 'rollover-hit' || event.type === 'spinner-spin' ||
    event.type === 'standup-target-hit' || event.type === 'saucer-captured' ||
    event.type === 'slingshot-hit' || event.type === 'ball-drained'
  )) ctx.setBall('skill-shot', 'missed');
  return sensor;
}
`;
