import { absolutePoint, createPopBumperCluster } from '../layout-primitives';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createShotLaneAssembly,
  createTargetBankAssembly,
} from '../assemblies';
import {
  createFoundation,
  createOrbit,
  createBank,
  createPocket,
  composeAssemblies,
} from './table-foundation';

const { lower, shooter, ...foundation } = createFoundation('harlem', 3, 1600);
const upperPocket = createPocket(
  'harlem-upper-saucer',
  { x: 600, y: 350 },
  5000,
);
// The upper kickout feeds the third flipper before returning to center court.
upperPocket.routes[0]!.goals.push({
  type: 'flipper',
  pivot: { x: 680, y: 600 },
});
const lowerPocket = createPocket(
  'harlem-bonus-saucer',
  { x: 680, y: 820 },
  25000,
);
const leftBank = createBank(
  'harlem-left',
  { x: 245, y: 720 },
  { x: 0, y: 75 },
  5,
  false,
  300,
);
const rightBank = createBank(
  'harlem-right',
  { x: 620, y: 1040 },
  { x: 0, y: 65 },
  1,
  false,
  300,
);
const drops = createTargetBankAssembly({
  id: 'harlem-drop-bank',
  first: { x: 300, y: 660 },
  step: { x: 65, y: 30 },
  standupCount: 0,
  dropCount: 4,
  targetWidth: 52,
  targetHeight: 16,
  backingOffset: { x: 25, y: -55 },
  backingExtension: 20,
  standupScore: 300,
  dropScore: 500,
  returnRegion: {
    type: 'region',
    min: { x: 170, y: 810 },
    max: { x: 580, y: 1400 },
  },
});
const centerLane = createShotLaneAssembly({
  id: 'harlem-center-spinner',
  outerPath: [
    { x: 380, y: 800 },
    { x: 380, y: 950 },
  ],
  innerPath: [
    { x: 520, y: 800 },
    { x: 520, y: 950 },
  ],
  spinner: { position: { x: 450, y: 880 }, length: 90, angle: 0, score: 100 },
  entry: { x: 450, y: 990 },
  entryVelocities: [{ x: 0, y: -1400 }],
  exit: { type: 'region', min: { x: 380, y: 770 }, max: { x: 520, y: 795 } },
});
const parts = composeAssemblies(
  lower,
  shooter,
  createOrbit('harlem-left-orbit', false, 1600),
  createOrbit('harlem-right-orbit', true, 1600),
  centerLane,
  leftBank,
  rightBank,
  drops,
  upperPocket,
  lowerPocket,
);
parts.flippers.push({
  position: { x: 680, y: 600 },
  side: 'right',
  length: 118,
  thickness: 22,
  restingAngle: Math.PI - 0.28,
  activeAngle: Math.PI + 0.5,
  material: 'flipperRubber',
});
parts.rollovers!.push(
  ...[330, 410, 490, 570].map((x, index) => ({
    position: { x, y: 1090 + (index === 1 || index === 2 ? 50 : 0) },
    radius: 19,
    score: 300,
  })),
);
// Three top lanes plus four court inserts retain seven rollover switches.
parts.rollovers!.forEach((lane) => {
  lane.score = 300;
});

export const harlemGlobetrottersTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...parts,
    name: 'Harlem Globetrotters',
    bumpers: createPopBumperCluster({
      top: absolutePoint(380, 330),
      spacingX: 160,
      spacingY: 140,
      radius: 38,
      scores: [100, 100, 100],
      material: 'rubberPost',
    }).bumpers,
  },
  { snapToGrid: false },
);
