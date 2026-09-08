import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createFoundation,
  composeAssemblies,
  createPocket,
} from './table-foundation';
import { createTargetBankAssembly } from '../assemblies';
import { arc, rail, type BoardAssembly } from '../assemblies/shared';
import { andromedaRulesScript } from './andromeda-rules';

// Relative arrangement estimated from Game Plan's flyer and playfield photos.
const foundation = createFoundation('andromeda', 3, 1800);
const { lower, shooter } = foundation;
lower.flippers.forEach((flipper) => {
  flipper.length = 120;
});
// The original has no conventional left inlane/outlane pair. Its cabinet
// curves directly toward the left heel below the fourth power bumper.
lower.guides = lower.guides!.slice(4);
lower.posts = lower.posts!.slice(2);
lower.slingshots = lower.slingshots!.slice(1);
lower.routes = lower.routes.slice(2);
// With no left return lane to rebound from, an unheld right feed crosses the
// lower court. Its raised-flipper catch/release remains required for all speeds.
lower.routes[0].goals = [
  { type: 'region', min: { x: 270, y: 1560 }, max: { x: 840, y: 1730 } },
];
const leftPivot = { x: 290, y: 1620 };
const field: BoardAssembly = {
  guides: [
    rail({ x: 12, y: 506 }, { x: 12, y: 1340 }),
    arc({ x: 258, y: 1340 }, 246, Math.PI / 2 + 0.005, Math.PI),
    rail({ x: 780, y: 890 }, { x: 780, y: 1210 }),
  ],
  bumpers: [
    {
      position: { x: 370, y: 350 },
      radius: 44,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: { x: 600, y: 350 },
      radius: 44,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: { x: 490, y: 480 },
      radius: 44,
      score: 100,
      material: 'rubberPost',
    },
    {
      position: { x: 170, y: 1320 },
      radius: 44,
      score: 100,
      material: 'rubberPost',
    },
  ],
  slingshots: [
    {
      position: { x: 145, y: 1150 },
      width: 120,
      height: 44,
      angle: 0.5,
      score: 30,
      strength: 560,
      material: 'rubberPost',
    },
  ],
  spinners: [
    {
      position: { x: 245, y: 610 },
      length: 70,
      thickness: 10,
      angle: 0,
      score: 100,
      material: 'metalGuide',
    },
  ],
  standupTargets: [
    {
      position: { x: 245, y: 710 },
      width: 56,
      height: 16,
      angle: 0.5,
      score: 1000,
      material: 'rubberPost',
    },
    {
      position: { x: 460, y: 1020 },
      width: 56,
      height: 16,
      angle: 0.18,
      score: 1000,
      material: 'rubberPost',
    },
    {
      position: { x: 700, y: 1080 },
      width: 56,
      height: 16,
      angle: -0.5,
      score: 1000,
      material: 'rubberPost',
    },
  ],
  rollovers: [
    { position: { x: 832, y: 960 }, radius: 22, score: 3000 },
    { position: { x: 832, y: 1150 }, radius: 22, score: 3000 },
    { position: { x: 770, y: 1350 }, radius: 20, score: 3000 },
    { position: { x: 850, y: 1350 }, radius: 18, score: 5000 },
  ],
  routes: [
    {
      id: 'andromeda-left-feed',
      start: {
        type: 'feed',
        position: { x: 340, y: 1550 },
        velocities: [-40, 0, 40].flatMap((x) =>
          [0, 250, 500].map((y) => ({ x, y })),
        ),
      },
      goals: [{ type: 'flipper', pivot: leftPivot }],
      cradle: { pivot: leftPivot },
      timeoutSeconds: 4,
    },
    {
      id: 'andromeda-spinner',
      start: {
        type: 'feed',
        position: { x: 245, y: 690 },
        velocities: [{ x: 0, y: -1100 }],
      },
      goals: [
        { type: 'event', event: 'spinner-spin', position: { x: 245, y: 610 } },
        { type: 'region', min: { x: 180, y: 200 }, max: { x: 680, y: 550 } },
      ],
      timeoutSeconds: 4,
    },
  ],
};
for (const x of [430, 450, 470])
  field.routes.push({
    id: `andromeda-center-drain-${x}`,
    start: {
      type: 'feed',
      position: { x, y: 1660 },
      velocities: [
        { x: 0, y: 150 },
        { x: 0, y: 500 },
      ],
    },
    goals: [{ type: 'drain' }],
    avoidFlippers: true,
    timeoutSeconds: 3,
  });
const bank = (id: string, x: number, y: number) =>
  createTargetBankAssembly({
    id,
    first: { x, y },
    step: { x: 70, y: 40 },
    standupCount: 0,
    dropCount: 3,
    targetWidth: 56,
    targetHeight: 16,
    backingOffset: { x: 20, y: -45 },
    backingExtension: 18,
    standupScore: 1000,
    dropScore: 3000,
    returnRegion: {
      type: 'region',
      min: { x: 150, y: y + 140 },
      max: { x: 865, y: 1610 },
    },
  });
const leftBank = bank('andromeda-left-bank', 250, 840);
const rightBank = bank('andromeda-right-bank', 570, 680);
const lock = createPocket('andromeda-lock', { x: 110, y: 330 }, 30000);
lock.guides = [
  arc({ x: 110, y: 330 }, 54, Math.PI, Math.PI * 2),
  rail({ x: 56, y: 330 }, { x: 56, y: 550 }),
  rail({ x: 164, y: 330 }, { x: 164, y: 550 }),
];
// Seventh drop guards the lock, separate from the two three-target banks.
lock.dropTargets = [
  {
    position: { x: 110, y: 500 },
    width: 78,
    height: 16,
    angle: 0,
    score: 5000,
    material: 'rubberPost',
  },
];
// The guarded lock has a two-shot acceptance test in andromeda.test.ts.
lock.routes = [];

export const andromedaTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...composeAssemblies(lower, shooter, field, leftBank, rightBank, lock),
    name: 'Andromeda',
    themeId: 'andromeda',
    rulesScript: andromedaRulesScript,
  },
  { snapToGrid: false },
);
