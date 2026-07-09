import type { Point } from '../types/board-definition';

export const BOARD_GRID_SIZE = 40;

export const snapPointToGrid = (
  point: Point,
  gridSize = BOARD_GRID_SIZE,
): Point => ({
  x: snapValueToGrid(point.x, gridSize),
  y: snapValueToGrid(point.y, gridSize),
});

export const snapValueToGrid = (
  value: number,
  gridSize = BOARD_GRID_SIZE,
): number => Math.round(value / gridSize) * gridSize;
