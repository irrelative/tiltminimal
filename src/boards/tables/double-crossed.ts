import { createSaucerPocketAssembly } from '../assemblies';
import { doubleCrossedRulesScript } from './double-crossed-rules';
import { absolutePoint, createPopBumperCluster } from '../layout-primitives';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createFoundation,
  createOrbit,
  createBank,
  composeAssemblies,
} from './table-foundation';

const { lower, shooter, ...foundation } = createFoundation(
  'doubleCrossedTable',
  4,
);
const leftBank = createBank(
  'cross-left',
  { x: 240, y: 620 },
  { x: 40, y: 80 },
  2,
  true,
  100,
);
const rightBank = createBank(
  'cross-right',
  { x: 660, y: 620 },
  { x: -40, y: 80 },
  2,
  true,
  100,
);
const lock = createSaucerPocketAssembly({
  id: 'cross-lock',
  center: { x: 450, y: 560 },
  radius: 28,
  wallRadius: 48,
  throatLength: 35,
  mouthDepth: 100,
  mouthHalfWidth: 60,
  score: 1000,
  holdSeconds: 0.5,
  ejectSpeed: 640,
  ejectAngle: 1.4,
  approachSpeed: 1050,
  returnRegion: {
    type: 'region',
    min: { x: 410, y: 700 },
    max: { x: 520, y: 840 },
  },
});
const parts = composeAssemblies(
  lower,
  shooter,
  createOrbit('cross-left-orbit'),
  createOrbit('cross-right-orbit', true),
  leftBank,
  rightBank,
  lock,
);
parts.posts!.push({
  position: { x: 450, y: 1000 },
  radius: 18,
  material: 'rubberPost',
});
export const doubleCrossedTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...parts,
    name: 'Double Crossed',
    themeId: 'double-crossed',
    rulesScript: doubleCrossedRulesScript,
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
