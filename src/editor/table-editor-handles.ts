import {
  getArcGuideMidAngle,
  getArcGuidePoint,
  isArcGuide,
  normalizeWrappedAngle,
} from '../game/guide-geometry';
import type {
  BoardDefinition,
  GuideDefinition,
  Point,
} from '../types/board-definition';
import type { EditorSelection } from './editor-types';
import {
  clamp,
  clampPoint,
  getGuideLength,
  getOrientedAngleFromHandlePoint,
  GUIDE_HANDLE_RADIUS,
  GUIDE_ROTATE_HANDLE_OFFSET,
  ORIENTED_ROTATE_HANDLE_OFFSET,
} from './table-editor-shared';

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

export const hitTestOrientedRotateHandle = (
  point: Point,
  element: Point,
  thickness: number,
  angle: number,
): boolean => {
  const handle = getOrientedRotateHandle(element, thickness, angle);

  return (
    Math.hypot(point.x - handle.x, point.y - handle.y) <= GUIDE_HANDLE_RADIUS
  );
};

export const rotateSelection = (
  board: BoardDefinition,
  selection: EditorSelection,
  point: Point,
): BoardDefinition => {
  const nextAngle = getOrientedAngleFromHandlePoint(point, selection, board);

  if (nextAngle === null) {
    return board;
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    return {
      ...board,
      standupTargets: board.standupTargets.map((target, index) =>
        index === selection.index ? { ...target, angle: nextAngle } : target,
      ),
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    return {
      ...board,
      dropTargets: board.dropTargets.map((target, index) =>
        index === selection.index ? { ...target, angle: nextAngle } : target,
      ),
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    return {
      ...board,
      spinners: board.spinners.map((spinner, index) =>
        index === selection.index ? { ...spinner, angle: nextAngle } : spinner,
      ),
    };
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    return {
      ...board,
      slingshots: board.slingshots.map((slingshot, index) =>
        index === selection.index ? { ...slingshot, angle: nextAngle } : slingshot,
      ),
    };
  }

  return board;
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
    const nextPoint = clampPoint(board, point, guide.thickness / 2);

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
    guide.thickness / 2,
  );
  const nextEnd = clampPoint(
    board,
    {
      x: midpoint.x + direction.x * halfLength,
      y: midpoint.y + direction.y * halfLength,
    },
    guide.thickness / 2,
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

export const getOrientedRotateHandle = (
  element: Point,
  thickness: number,
  angle: number,
): Point => {
  const offset = Math.max(
    ORIENTED_ROTATE_HANDLE_OFFSET,
    thickness / 2 + 22,
  );

  return {
    x: element.x - Math.sin(angle) * offset,
    y: element.y + Math.cos(angle) * offset,
  };
};
