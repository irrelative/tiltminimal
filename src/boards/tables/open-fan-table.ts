import { createSaucerPocketAssembly } from '../assemblies';
import { arc, rail } from '../assemblies/shared';
import { compileBuiltInBoardLayout } from '../layout-compiler';
import {
  createFoundation,
  createBank,
  composeAssemblies,
} from './table-foundation';
import type { BoardThemeId } from '../../types/board-definition';

// Shared, route-validated flat fan layout. Each caller supplies its own rules and art.
export function createOpenFanTable(
  id: string,
  name: string,
  themeId: BoardThemeId,
  rulesScript: string,
) {
  const { lower, shooter, ...foundation } = createFoundation(id, 1);
  // The launcher joins an uninterrupted upper orbit. Remove the lane-stop and
  // dividers, retaining the cabinet arch, tangent walls and shooter gate.
  shooter.guides = shooter.guides!.slice(0, 4);
  shooter.rollovers = [];
  shooter.routes[0].goals = [
    { type: 'region', min: { x: 20, y: 260 }, max: { x: 200, y: 700 } },
    { type: 'region', min: { x: 200, y: 720 }, max: { x: 710, y: 1130 } },
  ];
  const dispatch = createSaucerPocketAssembly({
    id: `${id}-saucer`,
    center: { x: 480, y: 380 },
    radius: 28,
    wallRadius: 48,
    throatLength: 35,
    mouthDepth: 100,
    mouthHalfWidth: 60,
    score: 2000,
    holdSeconds: 0.5,
    ejectSpeed: 640,
    ejectAngle: 1.75,
    approachSpeed: 1050,
    returnRegion: {
      type: 'region',
      min: { x: 380, y: 510 },
      max: { x: 500, y: 660 },
    },
  });
  const parts = composeAssemblies(
    lower,
    shooter,
    createBank(`${id}-left-bank`, { x: 270, y: 550 }, { x: 40, y: 60 }, 2),
    createBank(`${id}-right-bank`, { x: 640, y: 550 }, { x: -40, y: 60 }, 2),
    dispatch,
  );
  parts.guides!.push(
    // End the inner arch before the gate: the 57-unit opening lets a slow
    // returning ball roll off the gate into the orbit instead of wedging
    // against a continuous inner rail. The one-way gate still closes the lane.
    arc({ x: 478, y: 506 }, 410, Math.PI, Math.PI * 2 - 0.94),
    rail({ x: 12, y: 506 }, { x: 12, y: 1380 }),
    rail({ x: 12, y: 670 }, { x: 120, y: 800 }),
    rail({ x: 888, y: 670 }, { x: 780, y: 800 }),
    rail({ x: 68, y: 506 }, { x: 100, y: 650 }),
    arc({ x: 450, y: 506 }, 260, Math.PI, Math.PI * 2),
    rail({ x: 190, y: 506 }, { x: 190, y: 600 }),
    rail({ x: 190, y: 600 }, { x: 280, y: 740 }),
    rail({ x: 710, y: 506 }, { x: 710, y: 600 }),
    rail({ x: 710, y: 600 }, { x: 620, y: 740 }),
  );
  parts.spinners = [145, 755].map((x) => ({
    position: { x, y: 690 },
    length: 60,
    angle: 0,
    thickness: 10,
    material: 'metalGuide',
    score: 100,
  }));
  // Non-solid switches identify complete travel, independently for each ball.
  parts.rollovers = [
    { position: { x: 140, y: 550 }, radius: 35, score: 0 },
    { position: { x: 450, y: 170 }, radius: 60, score: 0, approachAngle: 0 },
    { position: { x: 800, y: 550 }, radius: 65, score: 0 },
    // Skill exit below the gate, then an overshoot switch across the arch.
    { position: { x: 738, y: 225 }, radius: 18, score: 0 },
    { position: { x: 677, y: 116 }, radius: 18, score: 0, approachAngle: 0.47 },
  ];
  for (const [side, x] of [145, 824].entries()) {
    const order = side === 0 ? [0, 1, 2] : [2, 1, 0];
    parts.routes!.push({
      id: `${id}-orbit-${side}`,
      start: {
        type: 'feed',
        position: { x, y: 740 },
        velocities: [2000, 2200, 2400].map((y) => ({ x: 0, y: -y })),
      },
      goals: [
        ...order.map((index) => ({
          type: 'event' as const,
          event: 'rollover-hit' as const,
          position: parts.rollovers![index].position as {
            x: number;
            y: number;
          },
        })),
        { type: 'region', min: { x: 180, y: 800 }, max: { x: 720, y: 1130 } },
      ],
      timeoutSeconds: 6,
    });
  }
  for (const x of [445, 450, 455])
    parts.routes!.push({
      id: `${id}-center-drain-${x}`,
      start: {
        type: 'feed',
        position: { x, y: 1270 },
        velocities: [300, 650].map((y) => ({ x: 0, y })),
      },
      goals: [{ type: 'drain' }],
      avoidFlippers: true,
      timeoutSeconds: 3,
    });
  return compileBuiltInBoardLayout(
    {
      ...foundation,
      ...parts,
      name,
      themeId,
      rulesScript,
    },
    { snapToGrid: false },
  );
}
