import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { analyzeBoard } from '../src/editor/table-analysis';
import { getFlipperBySide } from '../src/boards/table-library';

describe('analyzeBoard', () => {
  it('reports overlapping circular elements', () => {
    const board = createBlankTable();
    board.bumpers = [
      {
        x: 220,
        y: 300,
        radius: 40,
        score: 100,
        material: 'rubberPost',
      },
    ];
    board.posts = [
      {
        x: 245,
        y: 300,
        radius: 20,
        material: 'rubberPost',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe('element-overlap');
    expect(warnings[0]?.message).toContain('Bumper 1');
    expect(warnings[0]?.message).toContain('Post 1');
  });

  it('reports overlapping guide and spinner geometry on the playfield', () => {
    const board = createBlankTable();
    board.guides = [
      {
        start: { x: 260, y: 420 },
        end: { x: 420, y: 420 },
        thickness: 18,
        material: 'metalGuide',
      },
    ];
    board.spinners = [
      {
        x: 340,
        y: 420,
        length: 96,
        thickness: 10,
        angle: 0,
        score: 100,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('Guide 1');
    expect(warnings[0]?.message).toContain('Spinner 1');
  });

  it('ignores raised guides when checking for overlap warnings', () => {
    const board = createBlankTable();
    const leftFlipper = getFlipperBySide(board, 'left');
    board.guides = [
      {
        start: { x: leftFlipper.x - 40, y: leftFlipper.y },
        end: { x: leftFlipper.x + 120, y: leftFlipper.y },
        thickness: 18,
        material: 'metalGuide',
        plane: 'raised',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(warnings).toHaveLength(0);
  });
});
