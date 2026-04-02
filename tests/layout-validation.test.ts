import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { validateCompiledBoardLayout } from '../src/boards/layout-validation';

describe('validateCompiledBoardLayout', () => {
  it('reports errors when the launcher is placed on the wrong side', () => {
    const board = createBlankTable('Validation Test');
    board.plunger.x = 320;

    const diagnostics = validateCompiledBoardLayout(board);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'launcher-side',
        }),
      ]),
    );
  });

  it('warns when major playfield features overlap', () => {
    const board = createBlankTable('Overlap Test');
    board.bumpers = [
      {
        x: 300,
        y: 300,
        radius: 50,
        score: 100,
        material: 'rubberPost',
      },
      {
        x: 340,
        y: 300,
        radius: 50,
        score: 100,
        material: 'rubberPost',
      },
    ];

    const diagnostics = validateCompiledBoardLayout(board);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'feature-overlap',
        }),
      ]),
    );
  });
});
