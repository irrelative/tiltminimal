import { getArcGuideSweep, isArcGuide } from '../game/guide-geometry';
import {
  getLauncherMaxX,
  getLauncherMinX,
} from '../game/plunger-geometry';
import type {
  BoardDefinition,
  GuideDefinition,
  Point,
  PostDefinition,
} from '../types/board-definition';
import type { EditorSelection } from './editor-types';

export const SELECTION_PADDING = 14;
export const GUIDE_HANDLE_RADIUS = 16;
export const GUIDE_ROTATE_HANDLE_OFFSET = 42;
export const ORIENTED_ROTATE_HANDLE_OFFSET = 38;

export const clampPoint = (
  board: BoardDefinition,
  point: Point,
  padding: number,
  verticalPadding = padding,
): Point => ({
  x: clamp(point.x, padding, board.width - padding),
  y: clamp(point.y, verticalPadding, board.height - verticalPadding),
});

export const clampLauncherPosition = (
  board: BoardDefinition,
  point: Point,
): Point => ({
  x: clamp(point.x, getLauncherMinX(board), getLauncherMaxX(board)),
  y: clamp(point.y, board.ball.radius, board.height - board.ball.radius),
});

export const getOrientedSelectionPadding = (
  width: number,
  height: number,
): number => Math.hypot(width / 2, height / 2);

export const getFlipperSelectionPadding = (
  length: number,
  thickness: number,
): number => length + thickness / 2;

export const distanceToOrientedSegment = (
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

export const getSelectedOrientedElement = (
  selection: EditorSelection,
  board: BoardDefinition,
):
  | { x: number; y: number; length: number; thickness: number; angle: number }
  | null => {
  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    const target = board.standupTargets[selection.index];

    return target
      ? {
          x: target.x,
          y: target.y,
          length: target.width,
          thickness: target.height,
          angle: target.angle,
        }
      : null;
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    const target = board.dropTargets[selection.index];

    return target
      ? {
          x: target.x,
          y: target.y,
          length: target.width,
          thickness: target.height,
          angle: target.angle,
        }
      : null;
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    const spinner = board.spinners[selection.index];

    return spinner
      ? {
          x: spinner.x,
          y: spinner.y,
          length: spinner.length,
          thickness: spinner.thickness,
          angle: spinner.angle,
        }
      : null;
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    const slingshot = board.slingshots[selection.index];

    return slingshot
      ? {
          x: slingshot.x,
          y: slingshot.y,
          length: slingshot.width,
          thickness: slingshot.height,
          angle: slingshot.angle,
        }
      : null;
  }

  return null;
};

export const getOrientedAngleFromHandlePoint = (
  point: Point,
  selection: EditorSelection,
  board: BoardDefinition,
): number | null => {
  const element = getSelectedOrientedElement(selection, board);

  if (!element) {
    return null;
  }

  const dx = point.x - element.x;
  const dy = point.y - element.y;

  if (Math.hypot(dx, dy) < 0.001) {
    return null;
  }

  return Math.atan2(dy, dx) - Math.PI / 2;
};

export const getGuideLength = (guide: GuideDefinition): number =>
  isArcGuide(guide)
    ? guide.radius * getArcGuideSweep(guide)
    : Math.hypot(guide.end.x - guide.start.x, guide.end.y - guide.start.y);

export const getPostSelectionPadding = (post: PostDefinition): number =>
  post.radius;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
