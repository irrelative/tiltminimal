import { createOpenFanTable } from './open-fan-table';
import { switchyardRulesScript } from './switchyard-rules';

export const switchyardTable = createOpenFanTable(
  'switchyard',
  'Switchyard',
  'switchyard',
  switchyardRulesScript,
);
