import { createFlipperPair, createSlingshotPair } from '../layout-primitives';
import type { Point } from '../../types/board-definition';
import { arc, rail, requireClearance, type BoardAssembly } from './shared';

export interface LowerPlayfieldOptions {
  id: string;
  center: Point;
  pivotSpacing: number;
  flipperLength: number;
  ballRadius?: number;
  laneWidth: number;
  returnRadius: number;
  entryRise: number;
  bendRise: number;
  heelOffset: number;
  slingOffset: Point;
  slingWidth: number;
  slingHeight: number;
  slingAngle: number;
  flipperThickness?: number;
  restingAngle?: number;
  activeAngle?: number;
  slingStrength?: number;
}

export const createLowerPlayfieldAssembly = (o: LowerPlayfieldOptions) => {
  const ballRadius = o.ballRadius ?? 16;
  requireClearance(o.laneWidth, ballRadius * 2 + 24, 'Inlane width');
  requireClearance(o.returnRadius, o.laneWidth, 'Return radius');
  requireClearance(o.entryRise, o.bendRise, 'Lane entry rise');
  const flippers = createFlipperPair({
    leftX: o.center.x - o.pivotSpacing / 2,
    rightX: o.center.x + o.pivotSpacing / 2,
    y: o.center.y,
    length: o.flipperLength,
    thickness: o.flipperThickness ?? 22,
    restingAngleOffset: o.restingAngle ?? 0.28,
    activeAngleOffset: o.activeAngle ?? -0.5,
  });
  const part: BoardAssembly = { guides: [], posts: [], routes: [] };
  for (const [index, sign] of [-1, 1].entries()) {
    const pivot = {
      x: o.center.x + (sign * o.pivotSpacing) / 2,
      y: o.center.y,
    };
    const center = {
      x: pivot.x + sign * o.heelOffset,
      y: pivot.y - o.bendRise,
    };
    const mouthY = pivot.y - o.entryRise;
    const radii = [o.returnRadius, o.returnRadius - o.laneWidth];
    for (const radius of radii) {
      const x = center.x + sign * radius;
      part.guides!.push(
        rail({ x, y: mouthY }, { x, y: center.y }),
        arc(
          center,
          radius,
          sign < 0 ? Math.PI / 2 : 0,
          sign < 0 ? Math.PI : Math.PI / 2,
        ),
      );
      part.posts!.push({
        position: { x, y: mouthY },
        radius: 12,
        material: 'rubberPost',
      });
    }
    const laneX = center.x + sign * (o.returnRadius - o.laneWidth / 2);
    part.routes.push({
      id: `${o.id}/inlane-${index}`,
      start: {
        type: 'feed',
        position: { x: laneX, y: mouthY + 30 },
        velocities: [-40, 0, 40].flatMap((x) =>
          [0, 250, 500].map((y) => ({ x, y })),
        ),
      },
      goals: [{ type: 'flipper', pivot }],
      timeoutSeconds: 4,
    });
    part.routes.push({
      id: `${o.id}/outlane-${index}`,
      start: {
        type: 'feed',
        position: {
          x: center.x + sign * (o.returnRadius + ballRadius * 2),
          y: mouthY + 30,
        },
        velocities: [{ x: 0, y: 200 }],
      },
      goals: [{ type: 'drain' }],
      avoidFlippers: true,
      timeoutSeconds: 4,
    });
  }
  return {
    ...part,
    flippers,
    slingshots: createSlingshotPair({
      leftCenter: {
        x: o.center.x - o.slingOffset.x,
        y: o.center.y - o.slingOffset.y,
      },
      rightCenter: {
        x: o.center.x + o.slingOffset.x,
        y: o.center.y - o.slingOffset.y,
      },
      width: o.slingWidth,
      height: o.slingHeight,
      leftAngle: o.slingAngle,
      rightAngle: Math.PI - o.slingAngle,
      score: 10,
      strength: o.slingStrength ?? 560,
    }).slingshots,
  };
};
