import { describe, expect, it } from 'vitest';

import {
  EDITOR_GRID_SIZE,
  snapPointToGrid,
  snapValueToGrid,
} from '../src/editor/grid';

describe('editor grid', () => {
  it('snaps points to the nearest grid intersection', () => {
    expect(snapPointToGrid({ x: 58, y: 101 })).toEqual({ x: 40, y: 120 });
    expect(snapPointToGrid({ x: 79, y: 139 })).toEqual({ x: 80, y: 120 });
  });

  it('exports the default grid size for the editor overlay', () => {
    expect(EDITOR_GRID_SIZE).toBe(40);
    expect(snapValueToGrid(119)).toBe(120);
  });
});
