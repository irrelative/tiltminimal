import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createLowerPlayfieldAssembly,
  createShooterArchAssembly,
  composeAssemblies,
} from '../assemblies';
import { rail, arc } from '../assemblies/shared';
import type { BoardAssembly } from '../assemblies';

// Estimated from original populated playfield photos; see the reference spec.
const shooter = createShooterArchAssembly({
  id: 'harlem-shooter',
  center: { x: 478, y: 506 },
  radius: 466,
  laneWidth: 56,
  launchY: 1760,
  guideTopY: 700,
  gateAngle: -0.8,
  lanes: {
    firstX: 340,
    y: 200,
    spacing: 110,
    count: 3,
    radius: 22,
    dividerTop: 150,
    dividerBottom: 245,
    score: 300,
  },
});
// Harlem has an open top arch, not a bank of rollover lanes.
shooter.guides = shooter.guides!.slice(0, 4);
shooter.rollovers = [];
shooter.routes[0]!.start = {
  type: 'plunge',
  powers: Array.from({ length: 51 }, (_, i) => (50 + i) / 100),
};
shooter.routes[0]!.goals = [
  { type: 'region', min: { x: 60, y: 100 }, max: { x: 680, y: 420 } },
  { type: 'region', min: { x: 240, y: 250 }, max: { x: 840, y: 700 } },
];

// Lane mouths share a baseline; slings and return exits follow their flipper heels.
const lowerCenterX = 500;
const laneEntryY = 1480;
const upperLeftPivot = { x: lowerCenterX - 230, y: 1680 };
const lowerLeftPivot = { x: lowerCenterX - 130, y: 1800 };
const rightPivot = { x: lowerCenterX + 130, y: 1800 };
const rightAssemblyCenterX = rightPivot.x - 160;
const leftAssemblyCenterX = upperLeftPivot.x + 160;
const lowerOptions = {
  id: 'harlem-right-return',
  center: { x: rightAssemblyCenterX, y: rightPivot.y },
  pivotSpacing: 320,
  flipperLength: 110,
  restingAngle: 0.55,
  laneWidth: 72,
  returnRadius: 148,
  bendRise: 174,
  entryRise: rightPivot.y - laneEntryY,
  heelOffset: 32,
  slingWidth: 100,
  slingHeight: 56,
  slingAngle: 1.25,
  slingAtReturn: true,
};
const right = createLowerPlayfieldAssembly(lowerOptions);
const left = createLowerPlayfieldAssembly({
  ...lowerOptions,
  id: 'harlem-left-return',
  entryRise: upperLeftPivot.y - laneEntryY,
  restingAngle: 0.55,
  center: { x: leftAssemblyCenterX, y: upperLeftPivot.y },
});
// Use each assembly's outer half: Harlem's left and right returns are staggered.
const lower: BoardAssembly = {
  guides: [...left.guides!.slice(0, 4), ...right.guides!.slice(4)],
  posts: [...left.posts!.slice(0, 2), ...right.posts!.slice(2)],
  flippers: [
    left.flippers[0],
    right.flippers[1],
    {
      position: lowerLeftPivot,
      side: 'left',
      length: 110,
      thickness: 22,
      restingAngle: 0.55,
      activeAngle: -0.5,
      material: 'flipperRubber',
    },
  ],
  slingshots: [left.slingshots![0], right.slingshots![1]],
  routes: [...left.routes.slice(0, 2), ...right.routes.slice(2)],
};

// Passive staggered feeds may cross the playfield; the held-feed check below
// independently requires a cradle on the upper-left flipper.
lower.routes[0]!.goals = [
  { type: 'region', min: { x: 270, y: 1560 }, max: { x: 840, y: 1810 } },
];
// With the center open, an unheld right return may drain instead of bouncing
// off the lower-left flipper. Holding right must still catch every feed sample.
lower.routes[2]!.goals = [
  { type: 'region', min: { x: 430, y: 1720 }, max: { x: 700, y: 1920 } },
];
for (const [id, x, y, pivot] of [
  ['upper-left', upperLeftPivot.x + 50, upperLeftPivot.y - 50, upperLeftPivot],
  ['lower-left', lowerLeftPivot.x + 50, lowerLeftPivot.y - 60, lowerLeftPivot],
] as const)
  lower.routes.push({
    id: `harlem-${id}-feed`,
    start: {
      type: 'feed',
      position: { x, y },
      velocities: [
        { x: 0, y: 150 },
        { x: 0, y: 300 },
      ],
    },
    goals: [{ type: 'flipper', pivot }],
    cradle: { pivot },
    timeoutSeconds: 2,
  });

// Keep a ball-width corridor through the center, including the rubber tips.
for (const x of [lowerCenterX - 10, lowerCenterX, lowerCenterX + 10])
  lower.routes.push({
    id: `harlem-center-drain-${x}`,
    start: {
      type: 'feed',
      position: { x, y: 1770 },
      velocities: [
        { x: 0, y: 150 },
        { x: 0, y: 500 },
      ],
    },
    goals: [{ type: 'drain' }],
    avoidFlippers: true,
    timeoutSeconds: 3,
  });

const field: BoardAssembly = {
  guides: [
    rail({ x: 12, y: 506 }, { x: 12, y: 1980 }),
    // Stop the outer-arch ride before it becomes a straight left-outlane feed.
    rail(
      { x: 220, y: 506 - Math.sqrt(466 ** 2 - 258 ** 2) },
      { x: 270, y: 200 },
    ),
    // Inline Free Throw channel; each horizontal face blocks the next target.
    rail({ x: 684, y: 350 }, { x: 684, y: 750 }),
    rail({ x: 814, y: 280 }, { x: 814, y: 750 }),
    arc({ x: 750, y: 280 }, 64, Math.PI * 1.4, Math.PI * 2),
    // Open GLOBE basket and sloped pop-area shoulders.
    arc({ x: 450, y: 220 }, 56, Math.PI * 1.4, Math.PI * 2),
    rail({ x: 506, y: 220 }, { x: 525, y: 275 }),
    rail({ x: 200, y: 420 }, { x: 250, y: 520 }),
    rail({ x: 630, y: 420 }, { x: 590, y: 520 }),
    rail({ x: 80, y: 690 }, { x: 80, y: 1180 }),
    // Recessed right-side dunk target, open toward the center court.
    rail({ x: 795, y: 805 }, { x: 715, y: 820 }),
    rail({ x: 805, y: 935 }, { x: 715, y: 950 }),
  ],
  bumpers: [
    {
      position: { x: 270, y: 350 },
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
      position: { x: 435, y: 465 },
      radius: 44,
      score: 100,
      material: 'rubberPost',
    },
  ],
  standupTargets: [0, 1, 2, 3, 4].map((i) => ({
    position: { x: 110, y: 730 + i * 90 },
    width: 60,
    height: 16,
    angle: Math.PI / 2,
    score: 300,
    material: 'rubberPost',
  })),
  dropTargets: [0, 1, 2, 3].map((i) => ({
    position: { x: 749, y: 655 - i * 85 },
    width: 76,
    height: 16,
    angle: 0,
    score: 500,
    material: 'rubberPost',
  })),
  saucers: [
    {
      position: { x: 450, y: 220 },
      radius: 28,
      score: 5000,
      holdSeconds: 0.5,
      ejectSpeed: 680,
      ejectAngle: Math.PI * 0.8,
      material: 'metalGuide',
    },
    {
      position: { x: 750, y: 280 },
      radius: 28,
      score: 25000,
      holdSeconds: 0.5,
      ejectSpeed: 850,
      ejectAngle: Math.PI + 0.1,
      material: 'metalGuide',
    },
  ],
  spinners: [
    {
      position: { x: 165, y: 540 },
      length: 70,
      thickness: 10,
      angle: -0.4,
      score: 100,
      material: 'metalGuide',
    },
    {
      position: { x: 345, y: 635 },
      length: 76,
      thickness: 10,
      angle: 0,
      score: 100,
      material: 'metalGuide',
    },
    {
      position: { x: 525, y: 635 },
      length: 76,
      thickness: 10,
      angle: 0,
      score: 100,
      material: 'metalGuide',
    },
  ],
  rollovers: [
    { position: { x: 280, y: 830 }, radius: 18, score: 300 },
    { position: { x: 600, y: 830 }, radius: 18, score: 300 },
    { position: { x: 755, y: 1030 }, radius: 18, score: 300 },
    { position: { x: 854, y: 1510 }, radius: 18, score: 300 },
  ],
  routes: [],
};
field.standupTargets!.push({
  position: { x: 785, y: 875 },
  width: 66,
  height: 16,
  angle: Math.PI / 2,
  score: 300,
  material: 'rubberPost',
});
for (let i = 0; i < 5; i++)
  field.routes.push({
    id: `harlem-left/target-${i}`,
    start: {
      type: 'feed',
      position: { x: 154, y: 730 + i * 90 },
      velocities: [{ x: -600, y: 0 }],
    },
    goals: [
      {
        type: 'event',
        event: 'standup-target-hit',
        position: { x: 110, y: 730 + i * 90 },
      },
      { type: 'region', min: { x: 135, y: 1150 }, max: { x: 870, y: 1750 } },
    ],
    timeoutSeconds: 5,
  });
for (let i = 0; i < 4; i++)
  field.routes.push({
    id: `harlem-drop-bank/target-${i}`,
    start: {
      type: 'feed',
      position: { x: 749, y: 695 - i * 85 },
      velocities: [{ x: 0, y: -600 }],
    },
    goals: [
      {
        type: 'event',
        event: 'drop-target-hit',
        position: { x: 749, y: 655 - i * 85 },
      },
    ],
    timeoutSeconds: 2,
  });
field.routes.push({
  id: 'harlem-dunk',
  start: {
    type: 'feed',
    position: { x: 720, y: 875 },
    velocities: [{ x: 700, y: 0 }],
  },
  goals: [
    {
      type: 'event',
      event: 'standup-target-hit',
      position: { x: 785, y: 875 },
    },
    { type: 'region', min: { x: 300, y: 960 }, max: { x: 875, y: 1400 } },
  ],
  timeoutSeconds: 5,
});
for (const [i, position] of [
  { x: 165, y: 540 },
  { x: 345, y: 635 },
  { x: 525, y: 635 },
].entries())
  field.routes.push({
    id: `harlem-spinner-${i}`,
    start: {
      type: 'feed',
      position: { x: position.x, y: position.y + 85 },
      velocities: [{ x: 0, y: -1300 }],
    },
    goals: [
      { type: 'event', event: 'spinner-spin', position },
      { type: 'region', min: { x: 40, y: 100 }, max: { x: 670, y: 560 } },
    ],
    timeoutSeconds: 5,
  });
field.routes.push({
  id: 'harlem-globe-saucer',
  start: {
    type: 'feed',
    position: { x: 450, y: 295 },
    velocities: [{ x: 0, y: -900 }],
  },
  goals: [
    { type: 'event', event: 'saucer-captured', position: { x: 450, y: 220 } },
    { type: 'region', min: { x: 30, y: 310 }, max: { x: 680, y: 700 } },
  ],
  timeoutSeconds: 5,
});
field.routes.push({
  id: 'harlem-free-throw-saucer',
  start: {
    type: 'feed',
    position: { x: 750, y: 335 },
    velocities: [{ x: 0, y: -600 }],
  },
  goals: [
    { type: 'event', event: 'saucer-captured', position: { x: 750, y: 280 } },
    { type: 'region', min: { x: 350, y: 100 }, max: { x: 630, y: 340 } },
  ],
  timeoutSeconds: 5,
});

export const harlemGlobetrottersTable = compileBuiltInBoardLayout(
  {
    ...composeAssemblies(lower, shooter, field),
    name: 'Harlem Globetrotters',
    themeId: 'harlem',
    width: 1000,
    height: 2000,
    drainY: 2025,
    launchPosition: shooter.launchPosition,
    plunger: shooter.plunger,
    materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
    physics: {
      plunger: { minReleaseSpeed: 0, maxReleaseSpeed: 3400, bodyMass: 0.9 },
    },
  },
  { snapToGrid: false },
);
