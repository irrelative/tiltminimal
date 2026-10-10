import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createFoundation,
  createBank,
  createPocket,
  composeAssemblies,
} from './table-foundation';
import {
  createLowerPlayfieldAssembly,
  createShotLaneAssembly,
} from '../assemblies';
import { arc, rail, type BoardAssembly } from '../assemblies/shared';
import { alienStarRulesScript } from './alien-star-rules';

const { lower, shooter, ...foundation } = createFoundation(
  'alien-star',
  4,
  1600,
);
// The bonus lane supplies the inner shooter transition; retaining both arcs
// leaves a ball-sized wedge between their collision surfaces.
shooter.guides!.splice(3, 1);
Object.assign(
  lower,
  createLowerPlayfieldAssembly({
    id: 'alien-star-lower',
    center: { x: 450, y: 1420 },
    pivotSpacing: 334,
    flipperLength: 136,
    laneWidth: 72,
    returnRadius: 148,
    bendRise: 177,
    entryRise: 340,
    heelOffset: 32,
    slingWidth: 144,
    slingHeight: 50,
    slingAngle: Math.PI / 3,
    lowerPostOffset: { x: 30, y: 80 },
    slingAtReturn: true,
    restingAngle: 0.28,
  }),
);
const spinner = createShotLaneAssembly({
  id: 'alien-star-spinner',
  outerPath: [
    { x: 12, y: 506 },
    { x: 12, y: 1580 },
  ],
  innerPath: [
    { x: 260, y: 310 },
    { x: 260, y: 500 },
    { x: 260, y: 620 },
  ],
  spinner: { position: { x: 136, y: 420 }, length: 90, angle: 0, score: 1000 },
  entry: { x: 136, y: 550 },
  entryVelocities: [{ x: 0, y: -1900 }],
  exit: { type: 'region', min: { x: 20, y: 80 }, max: { x: 850, y: 300 } },
});
const bank = createBank(
  'alien-star-alien',
  { x: 745, y: 660 },
  { x: 0, y: 76 },
  5,
  false,
  3000,
);
const advance: BoardAssembly = {
  standupTargets: [
    {
      position: { x: 650, y: 378 },
      width: 32,
      height: 16,
      angle: Math.PI / 2,
      score: 3000,
      material: 'rubberPost',
    },
  ],
  guides: [
    rail({ x: 620, y: 350 }, { x: 620, y: 406 }),
    ...[72, 128].flatMap((radius) => [
      rail({ x: 670, y: 486 - radius }, { x: 760, y: 500 - radius }),
      arc({ x: 760, y: 500 }, radius, -Math.PI / 2, 0),
      rail(
        { x: 760 + radius, y: 500 },
        { x: 760 + radius, y: radius === 128 ? 506 : 680 },
      ),
    ]),
  ],
  routes: [
    {
      id: 'alien-star-bonus-shot',
      start: {
        type: 'feed',
        position: { x: 860, y: 720 },
        velocities: [1700, 1900].map((y) => ({ x: 0, y: -y })),
      },
      goals: [
        {
          type: 'event',
          event: 'standup-target-hit',
          position: { x: 650, y: 378 },
        },
        { type: 'region', min: { x: 280, y: 600 }, max: { x: 870, y: 1100 } },
      ],
      timeoutSeconds: 8,
    },
  ],
};
const parts = composeAssemblies(
  lower,
  shooter,
  spinner,
  bank,
  advance,
  createPocket('alien-star-lock', { x: 140, y: 760 }, 10000),
);
parts.bumpers = [
  { x: 450, y: 400 },
  { x: 350, y: 550 },
  { x: 560, y: 550 },
].map((position) => ({
  position,
  radius: 48,
  score: 500,
  material: 'rubberPost',
}));
parts.rollovers!.push(
  ...[
    ...lower.routes.filter((r) => r.id.includes('/inlane-')),
    ...lower.routes.filter((r) => r.id.includes('/outlane-')),
  ].map((r) => ({
    position: r.start.type === 'feed' ? r.start.position : { x: 0, y: 0 },
    radius: 22,
    score: 1000,
  })),
);
for (const x of [440, 450, 460])
  parts.routes!.push({
    id: `alien-star-center-drain-${x}`,
    start: {
      type: 'feed',
      position: { x, y: 1460 },
      velocities: [300, 650].map((y) => ({ x: 0, y })),
    },
    goals: [{ type: 'drain' }],
    avoidFlippers: true,
    timeoutSeconds: 3,
  });
export const alienStarTable = compileBuiltInBoardLayout(
  {
    ...foundation,
    ...parts,
    name: 'Alien Star',
    themeId: 'alien-star',
    rulesScript: alienStarRulesScript,
  },
  { snapToGrid: false },
);
alienStarTable.spinners[0].impulseGain = 0.16;
alienStarTable.spinners[0].damping = 1.4;
alienStarTable.spinners[0].maxAngularSpeed = 180;
