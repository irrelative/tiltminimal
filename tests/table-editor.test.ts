import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { hitTestSelection } from '../src/editor/table-editor';

describe('hitTestSelection', () => {
  it('selects a guide when clicking near its segment', () => {
    const board = createBlankTable();
    board.guides = [
      {
        start: { x: 120, y: 220 },
        end: { x: 320, y: 260 },
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const selection = hitTestSelection(board, { x: 220, y: 248 });

    expect(selection).toEqual({ kind: 'guide', index: 0 });
  });

  it('does not select a guide when clicking outside its hit area', () => {
    const board = createBlankTable();
    board.guides = [
      {
        start: { x: 120, y: 220 },
        end: { x: 320, y: 260 },
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const selection = hitTestSelection(board, { x: 220, y: 320 });

    expect(selection.kind).toBe('none');
  });
});
