import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { doubleCrossedTable } from '../src/boards/tables/double-crossed';
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

    expect(warnings.some((warning) => warning.code === 'element-overlap')).toBe(
      true,
    );
    expect(
      warnings.some((warning) => warning.code === 'spinner-obstructed'),
    ).toBe(true);
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

    expect(
      warnings.some((warning) => warning.code === 'element-overlap'),
    ).toBe(false);
  });

  it('ignores intentional guide-to-guide joins in overlap warnings', () => {
    const board = createBlankTable();
    board.guides = [
      {
        start: { x: 220, y: 420 },
        end: { x: 320, y: 420 },
        thickness: 18,
        material: 'metalGuide',
      },
      {
        start: { x: 320, y: 420 },
        end: { x: 420, y: 320 },
        thickness: 18,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(warnings.some((warning) => warning.code === 'element-overlap')).toBe(
      false,
    );
  });

  it('ignores guide endpoints that intentionally terminate at a post', () => {
    const board = createBlankTable();
    board.posts = [
      {
        x: 320,
        y: 420,
        radius: 18,
        material: 'rubberPost',
      },
    ];
    board.guides = [
      {
        start: { x: 220, y: 420 },
        end: { x: 320, y: 420 },
        thickness: 16,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some(
        (warning) =>
          warning.code === 'element-overlap' &&
          warning.message.includes('Post 1') &&
          warning.message.includes('Guide 1'),
      ),
    ).toBe(false);
  });

  it('ignores rubber approach guides that intentionally meet a slingshot', () => {
    const board = createBlankTable();
    board.slingshots = [
      {
        x: 320,
        y: 1040,
        width: 120,
        height: 36,
        angle: 0.5,
        score: 10,
        strength: 500,
        material: 'rubberPost',
      },
    ];
    board.guides = [
      {
        start: { x: 240, y: 960 },
        end: { x: 280, y: 1040 },
        thickness: 18,
        material: 'rubberPost',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some(
        (warning) =>
          warning.code === 'element-overlap' &&
          warning.message.includes('Slingshot 1') &&
          warning.message.includes('Guide 1'),
      ),
    ).toBe(false);
  });

  it('ignores saucers nested inside guide pockets for overlap warnings', () => {
    const board = createBlankTable();
    board.saucers = [
      {
        x: 320,
        y: 360,
        radius: 28,
        score: 500,
        holdSeconds: 0.5,
        ejectSpeed: 900,
        ejectAngle: 0,
        material: 'metalGuide',
      },
    ];
    board.guides = [
      {
        start: { x: 292, y: 390 },
        end: { x: 360, y: 390 },
        thickness: 18,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(warnings.some((warning) => warning.code === 'element-overlap')).toBe(
      false,
    );
  });

  it('reports elements that extend outside the board bounds', () => {
    const board = createBlankTable();
    board.bumpers = [
      {
        x: 20,
        y: 60,
        radius: 30,
        score: 100,
        material: 'rubberPost',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some((warning) => warning.code === 'element-out-of-bounds'),
    ).toBe(true);
  });

  it('reports an obstructed shooter lane path', () => {
    const board = createBlankTable();
    board.guides = [
      {
        start: {
          x: board.launchPosition.x - 40,
          y: board.launchPosition.y - board.plunger.guideLength + 24,
        },
        end: {
          x: board.launchPosition.x + 40,
          y: board.launchPosition.y - board.plunger.guideLength + 24,
        },
        thickness: 18,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some((warning) => warning.code === 'launcher-blocked'),
    ).toBe(true);
  });

  it('reports geometry that intrudes into the plunger lane body', () => {
    const board = createBlankTable();
    board.posts = [
      {
        x: board.launchPosition.x,
        y: board.launchPosition.y - board.plunger.guideLength / 2,
        radius: 18,
        material: 'rubberPost',
      },
    ];

    const warnings = analyzeBoard(board);
    const overlap = warnings.find(
      (warning) => warning.code === 'element-overlap',
    );

    expect(overlap).toBeDefined();
    expect(overlap?.message).toContain('Plunger Lane');
    expect(overlap?.message).toContain('Post 1');
  });

  it('reports raised guides that intrude into the plunger lane body', () => {
    const board = createBlankTable();
    board.guides = [
      {
        start: {
          x: board.launchPosition.x + 40,
          y: board.launchPosition.y - 40,
        },
        end: {
          x: board.launchPosition.x,
          y: board.launchPosition.y - board.plunger.guideLength / 2,
        },
        thickness: 14,
        material: 'metalGuide',
        plane: 'raised',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some(
        (warning) =>
          warning.code === 'element-overlap' &&
          warning.message.includes('Plunger Lane') &&
          warning.message.includes('Guide 1'),
      ),
    ).toBe(true);
  });

  it('keeps the double crossed shooter lane clear of body overlaps', () => {
    const warnings = analyzeBoard(doubleCrossedTable);

    expect(
      warnings.some(
        (warning) =>
          warning.code === 'element-overlap' &&
          warning.message.includes('Plunger Lane'),
      ),
    ).toBe(false);
  });

  it('reports guide geometry inside a flipper keepout area', () => {
    const board = createBlankTable();
    const leftFlipper = getFlipperBySide(board, 'left');
    board.guides = [
      {
        start: { x: leftFlipper.x + 36, y: leftFlipper.y + 4 },
        end: { x: leftFlipper.x + 128, y: leftFlipper.y + 10 },
        thickness: 18,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(warnings.some((warning) => warning.code === 'flipper-keepout')).toBe(
      true,
    );
  });

  it('reports posts obstructing a spinner envelope', () => {
    const board = createBlankTable();
    board.spinners = [
      {
        x: 320,
        y: 420,
        length: 100,
        thickness: 10,
        angle: 0,
        score: 100,
        material: 'metalGuide',
      },
    ];
    board.posts = [
      {
        x: 372,
        y: 420,
        radius: 16,
        material: 'rubberPost',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some((warning) => warning.code === 'spinner-obstructed'),
    ).toBe(true);
  });

  it('reports a blocked saucer eject path', () => {
    const board = createBlankTable();
    board.saucers = [
      {
        x: 320,
        y: 360,
        radius: 28,
        score: 500,
        holdSeconds: 0.5,
        ejectSpeed: 900,
        ejectAngle: 0,
        material: 'metalGuide',
      },
    ];
    board.posts = [
      {
        x: 390,
        y: 360,
        radius: 18,
        material: 'rubberPost',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some((warning) => warning.code === 'saucer-eject-obstructed'),
    ).toBe(true);
  });

  it('reports pockets where a passive ball can settle without draining', () => {
    const board = createBlankTable();
    board.guides = [
      {
        start: { x: 220, y: 840 },
        end: { x: 220, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
      {
        start: { x: 320, y: 840 },
        end: { x: 320, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
      {
        start: { x: 220, y: 1100 },
        end: { x: 320, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some((warning) => warning.code === 'ball-trap-risk'),
    ).toBe(true);
  });

  it('does not report trap warnings on the blank starter table', () => {
    const warnings = analyzeBoard(createBlankTable());

    expect(
      warnings.some((warning) => warning.code === 'ball-trap-risk'),
    ).toBe(false);
  });

  it('ignores guide lips that only retain the saucer pocket', () => {
    const board = createBlankTable();
    board.saucers = [
      {
        x: 320,
        y: 360,
        radius: 28,
        score: 500,
        holdSeconds: 0.5,
        ejectSpeed: 900,
        ejectAngle: 0,
        material: 'metalGuide',
      },
    ];
    board.guides = [
      {
        start: { x: 318, y: 332 },
        end: { x: 318, y: 396 },
        thickness: 14,
        material: 'metalGuide',
      },
    ];

    const warnings = analyzeBoard(board);

    expect(
      warnings.some((warning) => warning.code === 'saucer-eject-obstructed'),
    ).toBe(false);
  });

  it('warns when event-producing devices are not referenced by the rules script', () => {
    const board = createBlankTable();
    board.bumpers = [
      {
        x: 260,
        y: 280,
        radius: 40,
        score: 100,
        material: 'rubberPost',
      },
    ];
    board.rulesScript = `
return {
  onGameStart() {},
  onBallStart() {},
  onEvent(event, ctx) {
    if (event.type === 'ball-drained') {
      ctx.endGame();
    }
  },
};
`;

    const warnings = analyzeBoard(board);

    expect(
      warnings.some((warning) => warning.code === 'rules-event-unhandled'),
    ).toBe(true);
  });
});
