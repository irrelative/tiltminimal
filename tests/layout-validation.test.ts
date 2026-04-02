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

  it('reports an error when custom guides block the shooter lane path', () => {
    const board = createBlankTable('Blocked Launcher');
    board.guides = [
      {
        start: { x: board.launchPosition.x - 40, y: 500 },
        end: { x: board.launchPosition.x + 40, y: 500 },
        thickness: 14,
        material: 'metalGuide',
      },
    ];

    const diagnostics = validateCompiledBoardLayout(board);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'launcher-blocked',
        }),
      ]),
    );
  });

  it('reports an error when a top rollover has no open approach lane', () => {
    const board = createBlankTable('Sealed Top Lane');
    board.rollovers = [{ x: 450, y: 160, radius: 22, score: 500 }];
    board.guides = [
      {
        start: { x: 360, y: 230 },
        end: { x: 540, y: 230 },
        thickness: 18,
        material: 'metalGuide',
      },
    ];

    const diagnostics = validateCompiledBoardLayout(board);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'rollover-unreachable',
        }),
      ]),
    );
  });

  it('reports an error when a playfield guide intrudes into a flipper keepout zone', () => {
    const board = createBlankTable('Flipper Keepout');
    board.guides = [
      {
        kind: 'line',
        start: { x: 215, y: 1088 },
        end: { x: 360, y: 1148 },
        thickness: 20,
        material: 'metalGuide',
        plane: 'playfield',
      },
    ];

    const diagnostics = validateCompiledBoardLayout(board);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'flipper-keepout',
        }),
      ]),
    );
  });

  it('allows raised guides to pass above the flipper keepout zone', () => {
    const board = createBlankTable('Raised Return Rail');
    board.guides = [
      {
        kind: 'line',
        start: { x: 215, y: 1088 },
        end: { x: 360, y: 1148 },
        thickness: 20,
        material: 'metalGuide',
        plane: 'raised',
      },
    ];

    const diagnostics = validateCompiledBoardLayout(board);

    expect(
      diagnostics.some((diagnostic) => diagnostic.code === 'flipper-keepout'),
    ).toBe(false);
  });
});
