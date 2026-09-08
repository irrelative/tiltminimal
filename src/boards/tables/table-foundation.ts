import {
  composeAssemblies,
  createLowerPlayfieldAssembly,
  createShooterArchAssembly,
  createShotLaneAssembly,
  createTargetBankAssembly,
  createSaucerPocketAssembly,
} from '../assemblies';
import type { Point } from '../../types/board-definition';

// Shared cabinet and ball returns; scoring arrangements remain table-specific.
export function createFoundation(id: string, laneCount: number, height = 1400) {
  const lower = createLowerPlayfieldAssembly({
    id: `${id}-lower`,
    center: { x: 450, y: height - 180 },
    pivotSpacing: 320,
    flipperLength: 136,
    laneWidth: 80,
    returnRadius: 140,
    entryRise: 320,
    bendRise: 180,
    heelOffset: 24,
    slingOffset: { x: 144, y: 230 },
    slingWidth: 144,
    slingHeight: 50,
    slingAngle: 0.65,
  });
  const shooter = createShooterArchAssembly({
    id: `${id}-shooter`,
    center: { x: 478, y: 506 },
    radius: 466,
    laneWidth: 56,
    launchY: height - 240,
    guideTopY: 700,
    gateAngle: -0.8,
    lanes: {
      firstX: laneCount === 4 ? 280 : 340,
      y: 200,
      spacing: 110,
      count: laneCount,
      radius: 22,
      dividerTop: 150,
      dividerBottom: 245,
      score: 500,
    },
  });
  return {
    lower,
    shooter,
    width: 1000,
    height,
    drainY: height + 25,
    launchPosition: shooter.launchPosition,
    plunger: shooter.plunger,
    materials: {
      playfield: 'playfieldWood' as const,
      walls: 'metalGuide' as const,
    },
    physics: {
      plunger: { minReleaseSpeed: 0, maxReleaseSpeed: 3000, bodyMass: 0.9 },
    },
  };
}

export function createOrbit(id: string, right = false, height = 1400) {
  const point = (x: number, y: number) => ({ x: right ? 900 - x : x, y });
  const orbit = createShotLaneAssembly({
    id,
    // The right orbit joins the persistent shooter wall at y=700.
    outerPath: right
      ? [point(12, 506), point(12, 700)]
      : [point(12, 506), point(12, height - 20)],
    innerPath: [point(160, 340), point(160, 600), point(160, 820)],
    spinner: { position: point(86, 550), length: 70, angle: 0, score: 100 },
    entry: point(86, 740),
    entryVelocities: [{ x: 0, y: -1900 }],
    exit: { type: 'region', min: { x: 12, y: 50 }, max: { x: 866, y: 300 } },
  });
  // The foundation already owns this tangent wall; retain one collision surface.
  if (right) orbit.guides!.shift();
  return orbit;
}

export function createBank(
  id: string,
  first: Point,
  step: Point,
  count: number,
  drop = false,
  score = 500,
) {
  return createTargetBankAssembly({
    id,
    first,
    step,
    standupCount: count,
    endDropTarget: drop,
    targetWidth: 56,
    targetHeight: 16,
    backingOffset: { x: step.x < 0 ? -55 : 55, y: -25 },
    backingExtension: 18,
    standupScore: score,
    dropScore: 500,
    returnRegion: {
      type: 'region',
      min: { x: 12, y: first.y + step.y * (count - 1) + 80 },
      max: { x: 866, y: 1400 },
    },
  });
}

export function createPocket(id: string, center: Point, score: number) {
  return createSaucerPocketAssembly({
    id,
    center,
    radius: 28,
    wallRadius: 54,
    throatLength: 70,
    mouthDepth: 140,
    mouthHalfWidth: 80,
    score,
    holdSeconds: 0.5,
    ejectSpeed: 640,
    ejectAngle: Math.PI / 2,
    approachSpeed: 1050,
    returnRegion: {
      type: 'region',
      min: { x: center.x - 60, y: center.y + 170 },
      max: { x: center.x + 60, y: center.y + 310 },
    },
  });
}
export { composeAssemblies };
