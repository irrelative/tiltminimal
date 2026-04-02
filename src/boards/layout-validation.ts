import { getDistanceToFlipperSurface } from '../game/flipper-geometry';
import {
  getArcGuidePoint,
  getArcGuideSweep,
  isArcGuide,
} from '../game/guide-geometry';
import { getGuideDistance } from '../game/guide-geometry';
import {
  getPlungerGuideTopY,
  getPlungerLaneHalfWidth,
} from '../game/plunger-geometry';
import type { BoardDefinition, Point } from '../types/board-definition';

export interface LayoutDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export const validateCompiledBoardLayout = (
  board: BoardDefinition,
): LayoutDiagnostic[] => {
  const diagnostics: LayoutDiagnostic[] = [];

  if (!isPointInsideBoard(board.launchPosition.x, board.launchPosition.y, board)) {
    diagnostics.push({
      severity: 'error',
      code: 'launch-out-of-bounds',
      message: 'Launch position must stay within the board bounds.',
    });
  }

  if (board.plunger.x < board.width / 2) {
    diagnostics.push({
      severity: 'error',
      code: 'launcher-side',
      message: 'The launcher must stay on the right half of the table.',
    });
  }

  board.flippers.forEach((flipper, index) => {
    if (!isPointInsideBoard(flipper.x, flipper.y, board)) {
      diagnostics.push({
        severity: 'error',
        code: 'flipper-out-of-bounds',
        message: `Flipper ${index + 1} pivot must stay within the board bounds.`,
      });
    }

    if (flipper.y >= board.drainY - 40) {
      diagnostics.push({
        severity: 'warning',
        code: 'flipper-near-drain',
        message: `Flipper ${index + 1} is very close to the drain.`,
      });
    }
  });

  const circularFeatures = [
    ...board.bumpers.map((bumper, index) => ({
      x: bumper.x,
      y: bumper.y,
      radius: bumper.radius,
      label: `bumper ${index + 1}`,
    })),
    ...board.posts.map((post, index) => ({
      x: post.x,
      y: post.y,
      radius: post.radius,
      label: `post ${index + 1}`,
    })),
    ...board.saucers.map((saucer, index) => ({
      x: saucer.x,
      y: saucer.y,
      radius: saucer.radius,
      label: `saucer ${index + 1}`,
    })),
    ...board.rollovers.map((rollover, index) => ({
      x: rollover.x,
      y: rollover.y,
      radius: rollover.radius,
      label: `rollover ${index + 1}`,
    })),
    ...board.standupTargets.map((target, index) => ({
      x: target.x,
      y: target.y,
      radius: Math.hypot(target.width / 2, target.height / 2),
      label: `standup target ${index + 1}`,
    })),
    ...board.dropTargets.map((target, index) => ({
      x: target.x,
      y: target.y,
      radius: Math.hypot(target.width / 2, target.height / 2),
      label: `drop target ${index + 1}`,
    })),
    ...board.spinners.map((spinner, index) => ({
      x: spinner.x,
      y: spinner.y,
      radius: Math.hypot(spinner.length / 2, spinner.thickness / 2),
      label: `spinner ${index + 1}`,
    })),
  ];

  for (let leftIndex = 0; leftIndex < circularFeatures.length; leftIndex += 1) {
    const left = circularFeatures[leftIndex];

    if (!left) {
      continue;
    }

    if (!isCircleInsideBoard(left.x, left.y, left.radius, board)) {
      diagnostics.push({
        severity: 'warning',
        code: 'feature-near-edge',
        message: `${left.label} extends beyond the board bounds.`,
      });
    }

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < circularFeatures.length;
      rightIndex += 1
    ) {
      const right = circularFeatures[rightIndex];

      if (!right) {
        continue;
      }

      const distance = Math.hypot(left.x - right.x, left.y - right.y);

      if (distance < left.radius + right.radius) {
        diagnostics.push({
          severity: 'warning',
          code: 'feature-overlap',
          message: `${left.label} overlaps ${right.label}.`,
        });
      }
    }
  }

  validateLaunchCorridor(board, diagnostics);
  validateTopRolloverReachability(board, diagnostics);
  validateFlipperKeepouts(board, diagnostics);

  return diagnostics;
};

const isPointInsideBoard = (
  x: number,
  y: number,
  board: Pick<BoardDefinition, 'width' | 'height'>,
): boolean => x >= 0 && x <= board.width && y >= 0 && y <= board.height;

const isCircleInsideBoard = (
  x: number,
  y: number,
  radius: number,
  board: Pick<BoardDefinition, 'width' | 'height'>,
): boolean =>
  x - radius >= 0 &&
  x + radius <= board.width &&
  y - radius >= 0 &&
  y + radius <= board.height;

const validateLaunchCorridor = (
  board: BoardDefinition,
  diagnostics: LayoutDiagnostic[],
): void => {
  const guideTopY = getPlungerGuideTopY(board);
  const upperReachY = Math.max(24, guideTopY - 180);
  const centerlinePath = [
    {
      x: board.launchPosition.x,
      y: guideTopY - 2,
    },
    {
      x: board.launchPosition.x,
      y: upperReachY,
    },
  ] as const;

  if (pathBlockedByGuide(board, centerlinePath[0], centerlinePath[1], 10)) {
    diagnostics.push({
      severity: 'error',
      code: 'launcher-blocked',
      message: 'The shooter lane launch path is blocked by guide geometry.',
    });
  }

  const laneHalfWidth = getPlungerLaneHalfWidth(board.plunger);
  const innerGuideX = board.plunger.x - laneHalfWidth;
  const outerGuideX = board.plunger.x + laneHalfWidth;

  if (board.launchPosition.x <= innerGuideX || board.launchPosition.x >= outerGuideX) {
    diagnostics.push({
      severity: 'error',
      code: 'launcher-misaligned',
      message: 'The launch position must stay centered inside the shooter lane.',
    });
  }
};

const validateTopRolloverReachability = (
  board: BoardDefinition,
  diagnostics: LayoutDiagnostic[],
): void => {
  board.rollovers.forEach((rollover, index) => {
    if (rollover.y > board.height * 0.3) {
      return;
    }

    const entryY = Math.min(board.height * 0.42, rollover.y + 160);
    const entryOffsets = [
      -rollover.radius * 2,
      -rollover.radius,
      0,
      rollover.radius,
      rollover.radius * 2,
    ];
    const reachable = entryOffsets.some((offsetX) =>
      !pathBlockedByGuide(
        board,
        { x: rollover.x + offsetX, y: entryY },
        { x: rollover.x, y: rollover.y },
        8,
      ),
    );

    if (!reachable) {
      diagnostics.push({
        severity: 'error',
        code: 'rollover-unreachable',
        message: `Top rollover ${index + 1} does not have an open approach lane.`,
      });
    }
  });
};

const pathBlockedByGuide = (
  board: BoardDefinition,
  start: Point,
  end: Point,
  extraClearance: number,
): boolean => {
  const sampleCount = 24;

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
    const blockingGuide = board.guides.some(
      (guide) =>
        getGuideDistance(point, guide) <
        guide.thickness / 2 + extraClearance,
    );

    if (blockingGuide) {
      return true;
    }
  }

  return false;
};

const validateFlipperKeepouts = (
  board: BoardDefinition,
  diagnostics: LayoutDiagnostic[],
): void => {
  board.flippers.forEach((flipper, flipperIndex) => {
    for (const [guideIndex, guide] of board.guides.entries()) {
      if ((guide.plane ?? 'playfield') === 'raised') {
        continue;
      }

      if (guide.material === 'rubberPost') {
        continue;
      }

      const threshold = guide.thickness / 2 + 18;
      const penetratesKeepout = sampleGuidePoints(guide, 14).some((point) =>
        getMinFlipperSweepDistance(point, flipper) < threshold,
      );

      if (!penetratesKeepout) {
        continue;
      }

      diagnostics.push({
        severity: 'error',
        code: 'flipper-keepout',
        message: `Guide ${guideIndex + 1} intrudes into flipper ${flipperIndex + 1}'s swing and feed area.`,
      });
    }
  });
};

const sampleGuidePoints = (
  guide: BoardDefinition['guides'][number],
  sampleCount: number,
): Point[] => {
  if (isArcGuide(guide)) {
    const sweep = getArcGuideSweep(guide);

    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const ratio = sampleCount > 0 ? index / sampleCount : 0;
      return getArcGuidePoint(guide, guide.startAngle + sweep * ratio);
    });
  }

  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const ratio = sampleCount > 0 ? index / sampleCount : 0;

    return {
      x: guide.start.x + (guide.end.x - guide.start.x) * ratio,
      y: guide.start.y + (guide.end.y - guide.start.y) * ratio,
    };
  });
};

const getMinFlipperSweepDistance = (
  point: Point,
  flipper: BoardDefinition['flippers'][number],
): number => {
  const sampleCount = 6;
  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= sampleCount; index += 1) {
    const ratio = index / sampleCount;
    const angle =
      flipper.restingAngle + (flipper.activeAngle - flipper.restingAngle) * ratio;
    minDistance = Math.min(
      minDistance,
      getDistanceToFlipperSurface(point, flipper, angle),
    );
  }

  return minDistance;
};
