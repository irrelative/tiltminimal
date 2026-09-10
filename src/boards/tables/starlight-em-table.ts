import { starlightEmRulesScript } from './starlight-rules';
import { absolutePoint, createPopBumperCluster } from '../layout-primitives';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import { createShotLaneAssembly } from '../assemblies';
import {
  createFoundation,
  createOrbit,
  createBank,
  createPocket,
  composeAssemblies,
} from './table-foundation';

const { lower, shooter, ...foundation } = createFoundation(
  'starlightEmTable',
  4,
);
const leftBank = createBank(
  'starlight-left',
  { x: 255, y: 740 },
  { x: 30, y: 70 },
  3,
);
const rightBank = createBank(
  'starlight-right',
  { x: 645, y: 740 },
  { x: -30, y: 70 },
  3,
);
const pocket = createPocket('starlight-saucer', { x: 660, y: 370 }, 3000);
const centerLane = createShotLaneAssembly({
  id: 'starlight-center',
  outerPath: [
    { x: 380, y: 560 },
    { x: 380, y: 720 },
  ],
  innerPath: [
    { x: 520, y: 560 },
    { x: 520, y: 720 },
  ],
  spinner: { position: { x: 450, y: 650 }, length: 90, angle: 0, score: 100 },
  entry: { x: 450, y: 760 },
  entryVelocities: [{ x: 0, y: -1400 }],
  exit: { type: 'region', min: { x: 380, y: 480 }, max: { x: 520, y: 540 } },
});
const parts = composeAssemblies(
  lower,
  shooter,
  createOrbit('starlight-orbit'),
  centerLane,
  leftBank,
  rightBank,
  pocket,
);
export const starlightEmTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...parts,
    name: 'Starlight EM',
    themeId: 'starlight',
    rulesScript: starlightEmRulesScript,
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
