import { describe, expect, it } from 'vitest';

import { compileBoardLayout } from '../src/boards/layout-compiler';
import {
  absolutePoint,
  anchorPoint,
  createFlipperPair,
  createPopTriangle,
  createShooterLaneRight,
  createTopArchLanes,
} from '../src/boards/layout-primitives';
import type { BoardLayoutDefinition } from '../src/boards/layout-schema';

describe('compileBoardLayout', () => {
  it('resolves template and custom anchors into board coordinates', () => {
    const layout: BoardLayoutDefinition = {
      name: 'Anchor Test',
      template: 'solid-state-two-flipper',
      width: 900,
      height: 1400,
      drainY: 1425,
      launchPosition: anchorPoint('shooter-lane-center'),
      materials: {
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      },
      anchors: [
        {
          id: 'mid-bank',
          point: anchorPoint('playfield-center', { x: 0, y: -120 }),
        },
      ],
      standupTargets: [
        {
          position: anchorPoint('mid-bank', { x: -80, y: 0 }),
          width: 56,
          height: 16,
          angle: 0,
          score: 50,
          material: 'rubberPost',
        },
      ],
      flippers: createFlipperPair({
        leftX: 270,
        rightX: 630,
        y: 1220,
        length: 150,
        thickness: 20,
        restingAngleOffset: 0.28,
        activeAngleOffset: -0.42,
      }),
    };

    const result = compileBoardLayout(layout, { snapToGrid: false });

    expect(result.context.anchors['playfield-center']).toEqual({ x: 450, y: 700 });
    expect(result.context.anchors['mid-bank']).toEqual({ x: 450, y: 580 });
    expect(result.board.launchPosition.x).toBeCloseTo(770, 5);
    expect(result.board.standupTargets[0]).toMatchObject({
      x: 370,
      y: 580,
    });
  });

  it('expands layout primitives into concrete board features', () => {
    const layout: BoardLayoutDefinition = {
      name: 'Primitive Test',
      width: 900,
      height: 1400,
      drainY: 1425,
      launchPosition: absolutePoint(770, 1180),
      materials: {
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      },
      bumpers: createPopTriangle({
        top: absolutePoint(450, 260),
        spacingX: 180,
        spacingY: 140,
        radius: 40,
        scores: [100, 150, 200],
      }),
      flippers: createFlipperPair({
        leftX: 270,
        rightX: 630,
        y: 1220,
        length: 150,
        thickness: 20,
        restingAngleOffset: 0.28,
        activeAngleOffset: -0.42,
      }),
    };

    const result = compileBoardLayout(layout, { snapToGrid: false });

    expect(result.board.bumpers).toHaveLength(3);
    expect(result.board.bumpers.map((bumper) => bumper.score)).toEqual([
      100, 150, 200,
    ]);
    expect(result.board.bumpers[1]).toMatchObject({ x: 360, y: 400 });
    expect(result.board.bumpers[2]).toMatchObject({ x: 540, y: 400 });
    expect(result.board.flippers).toHaveLength(2);
  });

  it('expands shooter-lane and top-arch primitives into board geometry', () => {
    const shooterLane = createShooterLaneRight({
      boardWidth: 900,
      launchX: 770,
      launchY: 1180,
      guideLength: 620,
      feedTopY: 262,
    });
    const topArch = createTopArchLanes({
      center: absolutePoint(450, 176),
      laneCount: 4,
      spacingX: 150,
      radius: 22,
      score: 500,
    });
    const layout: BoardLayoutDefinition = {
      name: 'Lane Primitive Test',
      width: 900,
      height: 1400,
      drainY: 1425,
      launchPosition: shooterLane.launchPosition,
      plunger: shooterLane.plunger,
      materials: {
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      },
      rollovers: topArch.rollovers,
      guides: [...topArch.guides, ...shooterLane.guides],
      flippers: createFlipperPair({
        leftX: 270,
        rightX: 630,
        y: 1220,
        length: 150,
        thickness: 20,
        restingAngleOffset: 0.28,
        activeAngleOffset: -0.42,
      }),
    };

    const result = compileBoardLayout(layout, { snapToGrid: false });

    expect(result.board.rollovers).toHaveLength(4);
    expect(result.board.guides.length).toBeGreaterThanOrEqual(7);
    expect(result.board.plunger.guideLength).toBe(620);
    expect(result.board.launchPosition).toEqual({ x: 770, y: 1180 });
  });
});
