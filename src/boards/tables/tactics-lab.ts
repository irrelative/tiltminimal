import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createLowerPlayfieldAssembly,
  createShooterArchAssembly,
  composeAssemblies,
} from '../assemblies';
import { rail } from '../assemblies/shared';

const lower = createLowerPlayfieldAssembly({
  id: 'tactics-lower',
  heelJoin: 'upper',
  center: { x: 404, y: 1220 },
  pivotSpacing: 320,
  flipperLength: 136,
  laneWidth: 72,
  returnRadius: 148,
  bendRise: 177,
  entryRise: 320,
  heelOffset: 32,
  slingWidth: 144,
  slingHeight: 50,
  slingAngle: Math.PI / 3,
  lowerPostOffset: { x: 30, y: 80 },
  slingAtReturn: true,
});
// Post passes need passive rubber, but no powered scoring mechanisms.
lower.slingshots = [];
lower.posts!.push(
  ...[214, 594].map((x) => ({
    position: { x, y: 1140 },
    radius: 8,
    material: 'rubberPost' as const,
  })),
);
const shooter = createShooterArchAssembly({
  id: 'tactics-shooter',
  center: { x: 432, y: 460 },
  radius: 420,
  laneWidth: 56,
  launchY: 1160,
  guideTopY: 640,
  gateAngle: -0.8,
  lanes: {
    firstX: 300,
    y: 200,
    spacing: 110,
    count: 3,
    radius: 22,
    dividerTop: 150,
    dividerBottom: 245,
    score: 0,
  },
});
shooter.guides = [
  rail({ x: 852, y: 640 }, { x: 852, y: 200 }),
  rail({ x: 852, y: 200 }, { x: 796, y: 40 }),
  rail({ x: 796, y: 200 }, { x: 796, y: 640 }),
  rail({ x: 12, y: 40 }, { x: 796, y: 40 }),
];
shooter.plunger.returnGate = {
  start: { x: 796, y: 200 },
  end: { x: 852, y: 160 },
};
shooter.rollovers = [];
shooter.routes[0].goals = [
  { type: 'region', min: { x: 28, y: 50 }, max: { x: 770, y: 500 } },
];
export const tacticsLabTable = compileBuiltInBoardLayout({
  ...composeAssemblies(lower, shooter),
  name: 'Tactics Lab',
  width: 900,
  height: 1400,
  drainY: 1425,
  launchPosition: shooter.launchPosition,
  plunger: shooter.plunger,
  materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
  physics: {
    plunger: { minReleaseSpeed: 0, maxReleaseSpeed: 2800, bodyMass: 0.9 },
  },
  guides: [
    ...lower.guides!,
    ...shooter.guides!,
    rail({ x: 12, y: 40 }, { x: 12, y: 1380 }),
  ],
});
