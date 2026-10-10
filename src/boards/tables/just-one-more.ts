import { createOpenFanTable } from './open-fan-table';
import { justOneMoreRulesScript } from './just-one-more-rules';

export const justOneMoreTable = createOpenFanTable(
  'just-one-more',
  'Just One More',
  'just-one-more',
  justOneMoreRulesScript,
);

// Freer bearings make ARCADE / ROAD TRIP rewarding to shoot hard.
justOneMoreTable.spinners.forEach((spinner) => {
  spinner.impulseGain = 0.16;
  spinner.damping = 1.4;
  spinner.maxAngularSpeed = 180;
});
