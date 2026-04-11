import { describe, expect, it } from 'vitest';

import { classicTable } from '../src/boards/tables/classic-table';
import { harlemGlobetrottersTable } from '../src/boards/tables/harlem-globetrotters';
import { EDITOR_GRID_SIZE } from '../src/editor/grid';
import type { BoardDefinition, Point } from '../src/types/board-definition';

describe('built-in board layouts', () => {
  it('snaps the classic table layout to the editor grid', () => {
    expectBoardLayoutOnGrid(classicTable);
  });

  it('snaps the Harlem Globetrotters layout to the editor grid', () => {
    expectBoardLayoutOnGrid(harlemGlobetrottersTable);
  });
});

const expectBoardLayoutOnGrid = (board: BoardDefinition): void => {
  expectPointOnGrid(board.plunger);

  board.posts.forEach(expectPointOnGrid);
  board.bumpers.forEach(expectPointOnGrid);
  board.standupTargets.forEach(expectPointOnGrid);
  board.dropTargets.forEach(expectPointOnGrid);
  board.saucers.forEach(expectPointOnGrid);
  board.spinners.forEach(expectPointOnGrid);
  board.slingshots.forEach(expectPointOnGrid);
  board.rollovers.forEach(expectPointOnGrid);
  board.flippers.forEach(expectPointOnGrid);

  board.guides.forEach((guide) => {
    if (guide.kind === 'arc') {
      expectPointOnGrid(guide.center);
      return;
    }

    expectPointOnGrid(guide.start);
    expectPointOnGrid(guide.end);
  });
};

const expectPointOnGrid = (point: Point): void => {
  expect(point.x % EDITOR_GRID_SIZE).toBe(0);
  expect(point.y % EDITOR_GRID_SIZE).toBe(0);
};
