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
  bendRise?: number;
  heelOffset: number;
  /** Legacy midpoint placement; omit for a connected return-mounted sling. */
  slingOffset?: Point;
  /** Mount the lower rubber post at the inner return exit (default without slingOffset). */
  slingAtReturn?: boolean;
  /** Extend the inner return to this outward/upward offset from its pivot. */
  lowerPostOffset?: Point;
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
  const slingAtReturn = o.slingAtReturn ?? !o.slingOffset;
  if (!slingAtReturn && !o.slingOffset)
    throw new Error('Legacy sling placement requires slingOffset.');
  requireClearance(o.laneWidth, ballRadius * 2 + 24, 'Inlane width');
  requireClearance(o.returnRadius, o.laneWidth, 'Return radius');
  // Leave room above the heel for the ball to meet the held flipper's top face.
  const bendRise = o.bendRise ?? o.returnRadius + 26;
  requireClearance(o.entryRise, bendRise, 'Lane entry rise');
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
      y: pivot.y - bendRise,
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
          sign < 0 ? Math.PI / 2 + (radius === radii[1] ? 0.15 : 0.005) : 0,
          sign < 0
            ? Math.PI
            : Math.PI / 2 - (radius === radii[1] ? 0.15 : 0.005),
        ),
      );
      part.posts!.push({
        position: { x, y: mouthY },
        radius: 12,
        material: 'rubberPost',
      });
      if (radius === radii[0]) {
        // Continue the return into the fixed heel. An exposed arc endpoint
        // leaves a ball-sized valley against the heel that traps slow feeds.
        part.guides!.push(
          rail(
            {
              x: center.x + sign * radius * Math.sin(0.005),
              y: center.y + radius * Math.cos(0.005),
            },
            pivot,
            4,
          ),
        );
      }
      if (radius === radii[1] && o.lowerPostOffset) {
        part.guides!.push(
          rail(
            {
              x: center.x + sign * radius * Math.sin(0.15),
              y: center.y + radius * Math.cos(0.15),
            },
            {
              x: pivot.x + sign * o.lowerPostOffset.x,
              y: pivot.y - o.lowerPostOffset.y,
            },
          ),
        );
      }
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
      cradle: { pivot },
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
  const lowerPostX =
    o.lowerPostOffset?.x ??
    o.heelOffset + (o.returnRadius - o.laneWidth) * Math.sin(0.15);
  const lowerPostY =
    o.lowerPostOffset?.y ??
    bendRise - (o.returnRadius - o.laneWidth) * Math.cos(0.15);
  const slingX = slingAtReturn
    ? o.pivotSpacing / 2 +
      lowerPostX +
      (Math.cos(o.slingAngle) * o.slingWidth) / 2
    : o.slingOffset!.x;
  const slingY = slingAtReturn
    ? lowerPostY + (Math.sin(o.slingAngle) * o.slingWidth) / 2
    : o.slingOffset!.y;
  const slingshots = createSlingshotPair({
    leftCenter: {
      x: o.center.x - slingX,
      y: o.center.y - slingY,
    },
    rightCenter: {
      x: o.center.x + slingX,
      y: o.center.y - slingY,
    },
    width: o.slingWidth,
    height: o.slingHeight,
    leftAngle: o.slingAngle,
    rightAngle: (slingAtReturn ? 2 : 1) * Math.PI - o.slingAngle,
    score: 10,
    strength: o.slingStrength ?? 560,
  }).slingshots;
  if (slingAtReturn) {
    slingshots.forEach((sling, index) => {
      const sign = index === 0 ? -1 : 1;
      const pivotX = o.center.x + (sign * o.pivotSpacing) / 2;
      const center = {
        x: pivotX + sign * o.heelOffset,
        y: o.center.y - bendRise,
      };
      const radius = o.returnRadius - o.laneWidth;
      const start = index === 0 ? Math.PI / 2 + 0.15 : 0;
      const end = index === 0 ? Math.PI : Math.PI / 2 - 0.15;
      const curve = Array.from({ length: 17 }, (_, i) => {
        const angle = start + ((end - start) * i) / 16;
        return {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        };
      });
      const mouth = {
        x: center.x + sign * radius,
        y: o.center.y - o.entryRise,
      };
      // Follow the inner return boundary, filling the otherwise trapping pocket
      // behind the active rubber. The return rail remains the inlane wall.
      const back =
        index === 0
          ? [...(o.lowerPostOffset ? curve : curve.slice(1)), mouth]
          : [mouth, ...(o.lowerPostOffset ? curve : curve.slice(0, -1))];
      const position = sling.position as Point;
      const cos = Math.cos(sling.angle),
        sin = Math.sin(sling.angle);
      sling.rubberEdges = [index === 0 ? back.length + 1 : 1];
      sling.backOutline = back.map((p) => ({
        x: (p.x - position.x) * cos + (p.y - position.y) * sin,
        y: -(p.x - position.x) * sin + (p.y - position.y) * cos,
      }));
    });
  }
  return { ...part, flippers, slingshots };
};
