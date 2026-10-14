import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { compileBoardLayout } from '../src/boards/layout-compiler';
import { createFlipperPair } from '../src/boards/layout-primitives';
import { cloneBoardDefinition } from '../src/boards/board-codec';
import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import {
  getFlipperBaseRadius,
  getFlipperTipRadius,
  getFlipperRadiusAt,
  getFlipperTipPosition,
  isFlipperHeelGuide,
} from '../src/game/flipper-geometry';
import { traceFlipperPath } from '../src/render/canvas-renderer-shared';
import { createBlankTable } from './helpers/board-fixture';

const authored = () =>
  compileBoardLayout(
    {
      name: 'Authored flipper tips',
      width: 900,
      height: 1400,
      drainY: 1425,
      launchPosition: { x: 770, y: 1180 },
      materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
      flippers: createFlipperPair({
        leftX: 270,
        rightX: 630,
        y: 1220,
        length: 136,
        thickness: 32,
        tipThickness: 18,
        restingAngleOffset: (Math.PI * 24) / 180,
        activeAngleOffset: -0.5,
      }),
    },
    { snapToGrid: false },
  );

describe('independent flipper proportions', () => {
  it('preserves authored tip width through compilation and isolated cloning', () => {
    const { board, diagnostics } = authored();
    expect(diagnostics).toEqual([]);
    expect(board.flippers.map((f) => f.tipThickness)).toEqual([18, 18]);
    const copy = cloneBoardDefinition(board);
    copy.flippers[0].tipThickness = 16;
    expect(board.flippers[0].tipThickness).toBe(18);
    expect(copy.flippers[1].tipThickness).toBe(18);
  });
  it('uses the same independently authored outline for drawing and collision', () => {
    const f = authored().board.flippers[0];
    expect(getFlipperBaseRadius(f)).toBe(16);
    expect(getFlipperTipRadius(f)).toBe(9);
    expect(getFlipperRadiusAt(f, 0.5)).toBe(12.5);
    const arcs: number[][] = [];
    const context = {
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      arc(...args: number[]) {
        arcs.push(args);
      },
    } as unknown as CanvasRenderingContext2D;
    traceFlipperPath(context, f);
    expect(arcs.map((a) => a.slice(0, 3))).toEqual([
      [136, 0, 9],
      [0, 0, 16],
    ]);
  });
  it('retains the legacy taper when an imported definition omits tip width', () => {
    const f = createBlankTable().flippers[0];
    expect(f.tipThickness).toBeUndefined();
    expect(getFlipperTipRadius(f)).toBeCloseTo((f.thickness * 0.72) / 2);
  });
  it.each([0, -1, 33, Infinity, NaN])('rejects invalid tip width %s', (tip) => {
    const b = authored().board;
    b.flippers[0].tipThickness = tip;
    expect(
      validateCompiledBoardLayout(b).some(
        (d) => d.code === 'invalid-flipper-tip',
      ),
    ).toBe(true);
  });
  it('recognizes a fixed heel join while rejecting a rail ending on the moving bat', () => {
    const f = authored().board.flippers[0];
    const rail = {
      start: { x: f.x - 60, y: f.y - 40 },
      end: { x: f.x + 2, y: f.y - 5 },
      thickness: 4,
      material: 'metalGuide' as const,
    };
    expect(isFlipperHeelGuide(rail, f)).toBe(true);
    expect(
      isFlipperHeelGuide({ ...rail, end: { x: f.x + 14, y: f.y - 5 } }, f),
    ).toBe(false);
    expect(
      isFlipperHeelGuide({ ...rail, end: { x: f.x + 60, y: f.y - 5 } }, f),
    ).toBe(false);
  });
  it.each(BUILT_IN_TABLES)(
    '$id keeps fuller heels, narrow tips and a drain margin',
    ({ board }) => {
      expect(
        board.flippers.every(
          (f) =>
            f.thickness >= 28 &&
            f.tipThickness !== undefined &&
            f.tipThickness < f.thickness,
        ),
      ).toBe(true);
      const left = board.flippers.filter((f) => f.side === 'left').at(-1)!;
      const right = board.flippers.find((f) => f.side === 'right')!;
      const gap =
        getFlipperTipPosition(right, right.restingAngle).x -
        getFlipperTipRadius(right) -
        getFlipperTipPosition(left, left.restingAngle).x -
        getFlipperTipRadius(left);
      expect(gap).toBeGreaterThan(board.ball.radius * 2 + 20);
      expect(
        board.routes!.filter(
          (r) => r.avoidFlippers && r.id.includes('center-drain'),
        ),
      ).toHaveLength(3);
    },
  );
});
