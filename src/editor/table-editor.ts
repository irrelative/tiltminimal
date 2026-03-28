import {
  createDefaultCurvedGuide,
  createDefaultGuide,
  createDefaultDropTarget,
  createDefaultFlipper,
  createDefaultRollover,
  createDefaultSaucer,
  createDefaultSpinner,
  createDefaultStandupTarget,
} from '../boards/table-library';
import { getDistanceToFlipperSurface } from '../game/flipper-geometry';
import {
  getArcGuideMidAngle,
  getArcGuidePoint,
  getArcGuideSweep,
  getGuideDistance,
  isArcGuide,
  normalizeWrappedAngle,
} from '../game/guide-geometry';
import type {
  BoardDefinition,
  FlipperSide,
  GuideDefinition,
  Point,
} from '../types/board-definition';
import type { EditorSelection } from './editor-types';

const SELECTION_PADDING = 14;
const GUIDE_HANDLE_RADIUS = 16;
const GUIDE_ROTATE_HANDLE_OFFSET = 42;

export const hitTestSelection = (
  board: BoardDefinition,
  point: Point,
): EditorSelection => {
  const launchDistance = Math.hypot(
    point.x - board.launchPosition.x,
    point.y - board.launchPosition.y,
  );

  if (launchDistance <= 28) {
    return { kind: 'launch-position' };
  }

  for (let index = board.saucers.length - 1; index >= 0; index -= 1) {
    const saucer = board.saucers[index];

    if (
      saucer &&
      Math.hypot(point.x - saucer.x, point.y - saucer.y) <=
        saucer.radius + SELECTION_PADDING
    ) {
      return { kind: 'saucer', index };
    }
  }

  for (let index = board.rollovers.length - 1; index >= 0; index -= 1) {
    const rollover = board.rollovers[index];

    if (
      rollover &&
      Math.hypot(point.x - rollover.x, point.y - rollover.y) <=
        rollover.radius + SELECTION_PADDING
    ) {
      return { kind: 'rollover', index };
    }
  }

  for (let index = board.guides.length - 1; index >= 0; index -= 1) {
    const guide = board.guides[index];

    if (!guide) {
      continue;
    }

    if (
      getGuideDistance(point, guide) <=
      guide.thickness / 2 + SELECTION_PADDING
    ) {
      return { kind: 'guide', index };
    }
  }

  for (let index = board.bumpers.length - 1; index >= 0; index -= 1) {
    const bumper = board.bumpers[index];

    if (!bumper) {
      continue;
    }

    if (
      Math.hypot(point.x - bumper.x, point.y - bumper.y) <=
      bumper.radius + SELECTION_PADDING
    ) {
      return { kind: 'bumper', index };
    }
  }

  for (let index = board.standupTargets.length - 1; index >= 0; index -= 1) {
    const target = board.standupTargets[index];

    if (!target) {
      continue;
    }

    if (
      distanceToOrientedSegment(point, target, target.width, target.angle) <=
      target.height / 2 + SELECTION_PADDING
    ) {
      return { kind: 'standup-target', index };
    }
  }

  for (let index = board.dropTargets.length - 1; index >= 0; index -= 1) {
    const target = board.dropTargets[index];

    if (!target) {
      continue;
    }

    if (
      distanceToOrientedSegment(point, target, target.width, target.angle) <=
      target.height / 2 + SELECTION_PADDING
    ) {
      return { kind: 'drop-target', index };
    }
  }

  for (let index = board.spinners.length - 1; index >= 0; index -= 1) {
    const spinner = board.spinners[index];

    if (!spinner) {
      continue;
    }

    if (
      distanceToOrientedSegment(point, spinner, spinner.length, spinner.angle) <=
      spinner.thickness / 2 + SELECTION_PADDING
    ) {
      return { kind: 'spinner', index };
    }
  }

  for (let index = board.flippers.length - 1; index >= 0; index -= 1) {
    const flipper = board.flippers[index];

    if (!flipper) {
      continue;
    }

    if (getDistanceToFlipperSurface(point, flipper) <= SELECTION_PADDING) {
      return { kind: 'flipper', index };
    }
  }

  return { kind: 'none' };
};

export const addBumper = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextBumper = {
    x: point.x,
    y: point.y,
    radius: 44,
    score: 100,
    material: 'rubberPost' as const,
  };
  const nextBoard = {
    ...board,
    bumpers: [...board.bumpers, nextBumper],
  };

  return {
    board: nextBoard,
    selection: { kind: 'bumper', index: nextBoard.bumpers.length - 1 },
  };
};

export const addGuide = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextGuide = createDefaultGuide(point.x, point.y);
  const nextBoard = {
    ...board,
    guides: [...board.guides, nextGuide],
  };

  return {
    board: nextBoard,
    selection: { kind: 'guide', index: nextBoard.guides.length - 1 },
  };
};

export const addCurvedGuide = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextGuide = createDefaultCurvedGuide(point.x, point.y);
  const nextBoard = {
    ...board,
    guides: [...board.guides, nextGuide],
  };

  return {
    board: nextBoard,
    selection: { kind: 'guide', index: nextBoard.guides.length - 1 },
  };
};

export const addStandupTarget = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextTarget = createDefaultStandupTarget(point.x, point.y);
  const nextBoard = {
    ...board,
    standupTargets: [...board.standupTargets, nextTarget],
  };

  return {
    board: nextBoard,
    selection: {
      kind: 'standup-target',
      index: nextBoard.standupTargets.length - 1,
    },
  };
};

export const addDropTarget = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextTarget = createDefaultDropTarget(point.x, point.y);
  const nextBoard = {
    ...board,
    dropTargets: [...board.dropTargets, nextTarget],
  };

  return {
    board: nextBoard,
    selection: {
      kind: 'drop-target',
      index: nextBoard.dropTargets.length - 1,
    },
  };
};

export const addSaucer = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextSaucer = createDefaultSaucer(point.x, point.y);
  const nextBoard = {
    ...board,
    saucers: [...board.saucers, nextSaucer],
  };

  return {
    board: nextBoard,
    selection: { kind: 'saucer', index: nextBoard.saucers.length - 1 },
  };
};

export const addSpinner = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextSpinner = createDefaultSpinner(point.x, point.y);
  const nextBoard = {
    ...board,
    spinners: [...board.spinners, nextSpinner],
  };

  return {
    board: nextBoard,
    selection: { kind: 'spinner', index: nextBoard.spinners.length - 1 },
  };
};

export const addRollover = (
  board: BoardDefinition,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextRollover = createDefaultRollover(point.x, point.y);
  const nextBoard = {
    ...board,
    rollovers: [...board.rollovers, nextRollover],
  };

  return {
    board: nextBoard,
    selection: { kind: 'rollover', index: nextBoard.rollovers.length - 1 },
  };
};

export const addFlipper = (
  board: BoardDefinition,
  side: FlipperSide,
  point: Point,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  const nextFlipper = createDefaultFlipper(side, point.x, point.y);
  const nextBoard = {
    ...board,
    flippers: [...board.flippers, nextFlipper],
  };

  return {
    board: nextBoard,
    selection: { kind: 'flipper', index: nextBoard.flippers.length - 1 },
  };
};

export const moveSelection = (
  board: BoardDefinition,
  selection: EditorSelection,
  point: Point,
): BoardDefinition => {
  if (selection.kind === 'launch-position') {
    return {
      ...board,
      launchPosition: clampPoint(board, point, 30),
    };
  }

  if (selection.kind === 'bumper' && selection.index !== undefined) {
    return {
      ...board,
      bumpers: board.bumpers.map((bumper, index) =>
        index === selection.index
          ? { ...bumper, ...clampPoint(board, point, bumper.radius + 24) }
          : bumper,
      ),
    };
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    return {
      ...board,
      standupTargets: board.standupTargets.map((target, index) =>
        index === selection.index
          ? { ...target, ...clampPoint(board, point, target.width / 2 + 24) }
          : target,
      ),
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    return {
      ...board,
      dropTargets: board.dropTargets.map((target, index) =>
        index === selection.index
          ? { ...target, ...clampPoint(board, point, target.width / 2 + 24) }
          : target,
      ),
    };
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    return {
      ...board,
      saucers: board.saucers.map((saucer, index) =>
        index === selection.index
          ? { ...saucer, ...clampPoint(board, point, saucer.radius + 24) }
          : saucer,
      ),
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    return {
      ...board,
      spinners: board.spinners.map((spinner, index) =>
        index === selection.index
          ? { ...spinner, ...clampPoint(board, point, spinner.length / 2 + 24) }
          : spinner,
      ),
    };
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    return {
      ...board,
      rollovers: board.rollovers.map((rollover, index) =>
        index === selection.index
          ? { ...rollover, ...clampPoint(board, point, rollover.radius + 24) }
          : rollover,
      ),
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    const guide = board.guides[selection.index];

    if (!guide) {
      return board;
    }

    if (isArcGuide(guide)) {
      return {
        ...board,
        guides: board.guides.map((candidate, index) =>
          index === selection.index
            ? {
                ...candidate,
                center: clampPoint(
                  board,
                  point,
                  guide.radius + guide.thickness / 2 + 24,
                ),
              }
            : candidate,
        ),
      };
    }

    const deltaX = point.x - guide.start.x;
    const deltaY = point.y - guide.start.y;
    const clampedStart = clampPoint(board, point, guide.thickness / 2 + 24);
    const clampedEnd = clampPoint(
      board,
      { x: guide.end.x + deltaX, y: guide.end.y + deltaY },
      guide.thickness / 2 + 24,
    );

    return {
      ...board,
      guides: board.guides.map((candidate, index) =>
        index === selection.index
          ? {
              ...candidate,
              start: clampedStart,
              end: clampedEnd,
            }
          : candidate,
      ),
    };
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    const flipper = board.flippers[selection.index];

    if (!flipper) {
      return board;
    }

    return {
      ...board,
      flippers: board.flippers.map((candidate, index) =>
        index === selection.index
          ? {
              ...candidate,
              ...clampPoint(board, point, candidate.length + 40),
            }
          : candidate,
      ),
    };
  }

  return board;
};

export const deleteSelection = (
  board: BoardDefinition,
  selection: EditorSelection,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  if (selection.kind === 'bumper' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        bumpers: board.bumpers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        standupTargets: board.standupTargets.filter(
          (_, index) => index !== selection.index,
        ),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        dropTargets: board.dropTargets.filter(
          (_, index) => index !== selection.index,
        ),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        saucers: board.saucers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        spinners: board.spinners.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        rollovers: board.rollovers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        guides: board.guides.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        flippers: board.flippers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  return {
    board,
    selection,
  };
};

export const updateSelectedNumericField = (
  board: BoardDefinition,
  selection: EditorSelection,
  field: string,
  value: number,
): BoardDefinition => {
  if (
    selection.kind === 'launch-position' &&
    (field === 'x' || field === 'y')
  ) {
    return {
      ...board,
      launchPosition: {
        ...board.launchPosition,
        [field]: clamp(
          value,
          30,
          field === 'x' ? board.width - 30 : board.height - 30,
        ),
      },
    };
  }

  if (selection.kind === 'bumper' && selection.index !== undefined) {
    return {
      ...board,
      bumpers: board.bumpers.map((bumper, index) =>
        index === selection.index
          ? {
              ...bumper,
              [field]: value,
            }
          : bumper,
      ),
    };
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    return {
      ...board,
      standupTargets: board.standupTargets.map((target, index) =>
        index === selection.index ? { ...target, [field]: value } : target,
      ),
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    return {
      ...board,
      dropTargets: board.dropTargets.map((target, index) =>
        index === selection.index ? { ...target, [field]: value } : target,
      ),
    };
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    return {
      ...board,
      saucers: board.saucers.map((saucer, index) =>
        index === selection.index ? { ...saucer, [field]: value } : saucer,
      ),
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    return {
      ...board,
      spinners: board.spinners.map((spinner, index) =>
        index === selection.index ? { ...spinner, [field]: value } : spinner,
      ),
    };
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    return {
      ...board,
      rollovers: board.rollovers.map((rollover, index) =>
        index === selection.index ? { ...rollover, [field]: value } : rollover,
      ),
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    return {
      ...board,
      guides: board.guides.map((guide, index) =>
        index === selection.index
          ? isArcGuide(guide)
            ? {
                ...guide,
                ...(field === 'centerX'
                  ? { center: { ...guide.center, x: value } }
                  : field === 'centerY'
                    ? { center: { ...guide.center, y: value } }
                    : { [field]: value }),
              }
            : {
                ...guide,
                ...(field === 'startX'
                  ? { start: { ...guide.start, x: value } }
                  : field === 'startY'
                    ? { start: { ...guide.start, y: value } }
                    : field === 'endX'
                      ? { end: { ...guide.end, x: value } }
                      : field === 'endY'
                        ? { end: { ...guide.end, y: value } }
                        : { [field]: value }),
              }
          : guide,
      ),
    };
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    return {
      ...board,
      flippers: board.flippers.map((flipper, index) =>
        index === selection.index
          ? {
              ...flipper,
              [field]: value,
            }
          : flipper,
      ),
    };
  }

  return board;
};

export const hitTestGuideHandle = (
  point: Point,
  guide: GuideDefinition,
): 'start' | 'end' | 'rotate' | 'arc-start' | 'arc-end' | 'arc-radius' | null => {
  if (isArcGuide(guide)) {
    const handles = getGuideHandles(guide);

    if (!handles) {
      return null;
    }

    if (
      Math.hypot(point.x - handles.start.x, point.y - handles.start.y) <=
      GUIDE_HANDLE_RADIUS
    ) {
      return 'arc-start';
    }

    if (
      Math.hypot(point.x - handles.end.x, point.y - handles.end.y) <=
      GUIDE_HANDLE_RADIUS
    ) {
      return 'arc-end';
    }

    if (
      Math.hypot(point.x - handles.rotate.x, point.y - handles.rotate.y) <=
      GUIDE_HANDLE_RADIUS
    ) {
      return 'arc-radius';
    }

    return null;
  }

  const handles = getGuideHandles(guide);

  if (!handles) {
    return null;
  }

  if (
    Math.hypot(point.x - handles.start.x, point.y - handles.start.y) <=
    GUIDE_HANDLE_RADIUS
  ) {
    return 'start';
  }

  if (
    Math.hypot(point.x - handles.end.x, point.y - handles.end.y) <=
    GUIDE_HANDLE_RADIUS
  ) {
    return 'end';
  }

  if (
    Math.hypot(point.x - handles.rotate.x, point.y - handles.rotate.y) <=
    GUIDE_HANDLE_RADIUS
  ) {
    return 'rotate';
  }

  return null;
};

export const moveGuideHandle = (
  board: BoardDefinition,
  selection: EditorSelection,
  handle: 'start' | 'end' | 'rotate' | 'arc-start' | 'arc-end' | 'arc-radius',
  point: Point,
): BoardDefinition => {
  if (selection.kind !== 'guide' || selection.index === undefined) {
    return board;
  }

  const guide = board.guides[selection.index];

  if (!guide) {
    return board;
  }

  if (isArcGuide(guide)) {
    if (handle === 'arc-radius') {
      const nextRadius = clamp(
        Math.hypot(point.x - guide.center.x, point.y - guide.center.y),
        guide.thickness / 2 + 12,
        Math.max(board.width, board.height),
      );

      return {
        ...board,
        guides: board.guides.map((candidate, index) =>
          index === selection.index
            ? {
                ...candidate,
                radius: nextRadius,
              }
            : candidate,
        ),
      };
    }

    if (handle === 'arc-start' || handle === 'arc-end') {
      const nextAngle = normalizeWrappedAngle(
        Math.atan2(point.y - guide.center.y, point.x - guide.center.x),
      );

      return {
        ...board,
        guides: board.guides.map((candidate, index) =>
          index === selection.index
            ? {
                ...candidate,
                ...(handle === 'arc-start'
                  ? { startAngle: nextAngle }
                  : { endAngle: nextAngle }),
              }
            : candidate,
        ),
      };
    }

    return board;
  }

  if (handle === 'start' || handle === 'end') {
    const nextPoint = clampPoint(board, point, guide.thickness / 2 + 24);

    return {
      ...board,
      guides: board.guides.map((candidate, index) =>
        index === selection.index
          ? {
              ...candidate,
              ...(handle === 'start'
                ? { start: nextPoint }
                : { end: nextPoint }),
            }
          : candidate,
      ),
    };
  }

  const midpoint = {
    x: (guide.start.x + guide.end.x) / 2,
    y: (guide.start.y + guide.end.y) / 2,
  };
  const dx = point.x - midpoint.x;
  const dy = point.y - midpoint.y;
  const magnitude = Math.hypot(dx, dy);

  if (magnitude < 0.001) {
    return board;
  }

  const halfLength = getGuideLength(guide) / 2;
  const direction = {
    x: dx / magnitude,
    y: dy / magnitude,
  };
  const nextStart = clampPoint(
    board,
    {
      x: midpoint.x - direction.x * halfLength,
      y: midpoint.y - direction.y * halfLength,
    },
    guide.thickness / 2 + 24,
  );
  const nextEnd = clampPoint(
    board,
    {
      x: midpoint.x + direction.x * halfLength,
      y: midpoint.y + direction.y * halfLength,
    },
    guide.thickness / 2 + 24,
  );

  return {
    ...board,
    guides: board.guides.map((candidate, index) =>
      index === selection.index
        ? {
            ...candidate,
            start: nextStart,
            end: nextEnd,
          }
        : candidate,
    ),
  };
};

export const getGuideHandles = (
  guide: GuideDefinition,
): {
  start: Point;
  end: Point;
  rotate: Point;
} | null => {
  if (isArcGuide(guide)) {
    return {
      start: getArcGuidePoint(guide, guide.startAngle),
      end: getArcGuidePoint(guide, guide.endAngle),
      rotate: getArcGuidePoint(guide, getArcGuideMidAngle(guide)),
    };
  }

  const midpoint = {
    x: (guide.start.x + guide.end.x) / 2,
    y: (guide.start.y + guide.end.y) / 2,
  };
  const length = getGuideLength(guide);
  const normal =
    length > 0
      ? {
          x: -(guide.end.y - guide.start.y) / length,
          y: (guide.end.x - guide.start.x) / length,
        }
      : { x: 0, y: -1 };
  const offset = Math.max(GUIDE_ROTATE_HANDLE_OFFSET, guide.thickness + 18);

  return {
    start: { ...guide.start },
    end: { ...guide.end },
    rotate: {
      x: midpoint.x + normal.x * offset,
      y: midpoint.y + normal.y * offset,
    },
  };
};

const clampPoint = (
  board: BoardDefinition,
  point: Point,
  padding: number,
): Point => ({
  x: clamp(point.x, padding, board.width - padding),
  y: clamp(point.y, padding, board.height - padding),
});

const distanceToOrientedSegment = (
  point: Point,
  element: Point,
  length: number,
  angle: number,
): number => {
  const halfLength = length / 2;
  const dx = Math.cos(angle) * halfLength;
  const dy = Math.sin(angle) * halfLength;
  const start = {
    x: element.x - dx,
    y: element.y - dy,
  };
  const end = {
    x: element.x + dx,
    y: element.y + dy,
  };
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection = clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;

  return Math.hypot(point.x - closestX, point.y - closestY);
};

const getGuideLength = (guide: GuideDefinition): number =>
  isArcGuide(guide)
    ? guide.radius * getArcGuideSweep(guide)
    : Math.hypot(guide.end.x - guide.start.x, guide.end.y - guide.start.y);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
