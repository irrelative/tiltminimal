import { createDefaultFlipper } from '../boards/table-library';
import type {
  BoardDefinition,
  FlipperSide,
  GuideDefinition,
  Point,
} from '../types/board-definition';
import type { EditorSelection } from './editor-types';

const SELECTION_PADDING = 14;

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

  for (let index = board.guides.length - 1; index >= 0; index -= 1) {
    const guide = board.guides[index];

    if (!guide) {
      continue;
    }

    if (distanceToGuide(point, guide) <= guide.thickness / 2 + SELECTION_PADDING) {
      return { kind: 'guide', index };
    }
  }

  for (let index = board.bumpers.length - 1; index >= 0; index -= 1) {
    const bumper = board.bumpers[index];

    if (!bumper) {
      continue;
    }

    const distance = Math.hypot(point.x - bumper.x, point.y - bumper.y);

    if (distance <= bumper.radius + SELECTION_PADDING) {
      return { kind: 'bumper', index };
    }
  }

  for (let index = board.flippers.length - 1; index >= 0; index -= 1) {
    const flipper = board.flippers[index];

    if (!flipper) {
      continue;
    }

    if (
      distanceToFlipper(point, flipper) <=
      flipper.thickness / 2 + SELECTION_PADDING
    ) {
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

  if (selection.kind === 'guide' && selection.index !== undefined) {
    const guide = board.guides[selection.index];

    if (!guide) {
      return board;
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
        flippers: board.flippers.filter(
          (_, index) => index !== selection.index,
        ),
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

  if (selection.kind === 'guide' && selection.index !== undefined) {
    return {
      ...board,
      guides: board.guides.map((guide, index) =>
        index === selection.index
          ? {
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

const clampPoint = (
  board: BoardDefinition,
  point: Point,
  padding: number,
): Point => ({
  x: clamp(point.x, padding, board.width - padding),
  y: clamp(point.y, padding, board.height - padding),
});

const distanceToFlipper = (
  point: Point,
  flipper: BoardDefinition['flippers'][number],
): number => {
  const angle = flipper.restingAngle;
  const tipX = flipper.x + Math.cos(angle) * flipper.length;
  const tipY = flipper.y + Math.sin(angle) * flipper.length;
  const segmentLengthSquared =
    (tipX - flipper.x) * (tipX - flipper.x) +
    (tipY - flipper.y) * (tipY - flipper.y);
  const projection = clamp(
    ((point.x - flipper.x) * (tipX - flipper.x) +
      (point.y - flipper.y) * (tipY - flipper.y)) /
      segmentLengthSquared,
    0,
    1,
  );
  const closestX = flipper.x + (tipX - flipper.x) * projection;
  const closestY = flipper.y + (tipY - flipper.y) * projection;

  return Math.hypot(point.x - closestX, point.y - closestY);
};

const distanceToGuide = (point: Point, guide: GuideDefinition): number => {
  const segmentX = guide.end.x - guide.start.x;
  const segmentY = guide.end.y - guide.start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - guide.start.x, point.y - guide.start.y);
  }

  const projection = clamp(
    ((point.x - guide.start.x) * segmentX + (point.y - guide.start.y) * segmentY) /
      segmentLengthSquared,
    0,
    1,
  );
  const closestX = guide.start.x + segmentX * projection;
  const closestY = guide.start.y + segmentY * projection;

  return Math.hypot(point.x - closestX, point.y - closestY);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
