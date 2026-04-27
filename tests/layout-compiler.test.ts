import { describe, expect, it } from 'vitest';

import { compileBoardLayout } from '../src/boards/layout-compiler';
import {
  absolutePoint,
  anchorPoint,
  createFlipperPair,
  createInlaneOutlanePair,
  createLowerPlayfieldPair,
  createStandardLowerPlayfieldPair,
  mergeLayoutFragments,
  createPopTriangle,
  createShooterLaneRight,
  createSlingshotPair,
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

    expect(result.context.anchors['playfield-center']).toEqual({
      x: 450,
      y: 700,
    });
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

  it('expands lower-lane primitives with raised return guides', () => {
    const lowerLanes = createInlaneOutlanePair({
      side: 'left',
      flipperPivot: absolutePoint(270, 1220),
      outerGuideStartOffset: { x: -176, y: -38 },
      outerGuideBreakOffset: { x: -154, y: -156 },
      outerGuideEndOffset: { x: -120, y: -322 },
      innerGuideStartOffset: { x: -56, y: -216 },
      innerGuideBreakOffset: { x: -72, y: -116 },
      innerGuideEndOffset: { x: -84, y: 48 },
      slingGuideStartOffset: { x: -64, y: -132 },
      slingGuideEndOffset: { x: 4, y: -54 },
      entryPostOffsets: [
        { x: -72, y: -200, radius: 18, material: 'rubberPost' },
      ],
    });
    const slingshots = createSlingshotPair({
      leftCenter: absolutePoint(292, 1120),
      rightCenter: absolutePoint(608, 1120),
      width: 148,
      height: 24,
      leftAngle: 0.4,
      rightAngle: Math.PI - 0.4,
      score: 10,
      strength: 560,
    });
    const layout: BoardLayoutDefinition = {
      name: 'Lower Lanes Primitive Test',
      width: 900,
      height: 1400,
      drainY: 1425,
      launchPosition: absolutePoint(770, 1180),
      materials: {
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      },
      posts: lowerLanes.posts,
      guides: lowerLanes.guides,
      slingshots: slingshots.slingshots,
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

    expect(result.board.guides).toHaveLength(5);
    expect(result.board.guides[0]?.plane).toBe('playfield');
    expect(result.board.guides[1]?.plane).toBe('raised');
    expect(result.board.guides[2]?.plane).toBe('playfield');
    expect(result.board.guides[3]?.plane).toBe('raised');
    expect(result.board.guides[4]?.plane).toBe('playfield');
    expect(result.board.posts).toHaveLength(1);
    expect(result.board.slingshots).toHaveLength(2);
  });

  it('composes lower-playfield fragments with lanes, slingshots, and flippers', () => {
    const lowerPlayfield = createLowerPlayfieldPair({
      leftFlipperPivot: absolutePoint(270, 1220),
      rightFlipperPivot: absolutePoint(630, 1220),
      leftLane: {
        outerGuideStartOffset: { x: -176, y: -38 },
        outerGuideBreakOffset: { x: -154, y: -156 },
        outerGuideEndOffset: { x: -120, y: -322 },
        innerGuideStartOffset: { x: -56, y: -216 },
        innerGuideBreakOffset: { x: -72, y: -116 },
        innerGuideEndOffset: { x: -84, y: 48 },
        entryPostOffsets: [
          { x: -72, y: -200, radius: 18, material: 'rubberPost' },
        ],
      },
      rightLane: {
        outerGuideStartOffset: { x: 176, y: -38 },
        outerGuideBreakOffset: { x: 154, y: -156 },
        outerGuideEndOffset: { x: 120, y: -322 },
        innerGuideStartOffset: { x: 56, y: -216 },
        innerGuideBreakOffset: { x: 72, y: -116 },
        innerGuideEndOffset: { x: 84, y: 48 },
        entryPostOffsets: [
          { x: 72, y: -200, radius: 18, material: 'rubberPost' },
        ],
      },
      slingshots: {
        leftCenterOffset: { x: 22, y: -100 },
        rightCenterOffset: { x: -22, y: -100 },
        width: 148,
        height: 24,
        leftAngle: 0.4,
        rightAngle: Math.PI - 0.4,
        score: 10,
        strength: 560,
      },
      flippers: {
        leftX: 270,
        rightX: 630,
        y: 1220,
        length: 150,
        thickness: 20,
        restingAngleOffset: 0.28,
        activeAngleOffset: -0.42,
      },
    });
    const fragment = mergeLayoutFragments(lowerPlayfield, {
      posts: [
        {
          position: absolutePoint(450, 1100),
          radius: 18,
          material: 'rubberPost',
        },
      ],
    });
    const layout: BoardLayoutDefinition = {
      name: 'Lower Playfield Fragment Test',
      width: 900,
      height: 1400,
      drainY: 1425,
      launchPosition: absolutePoint(770, 1180),
      materials: {
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      },
      posts: fragment.posts,
      guides: fragment.guides,
      slingshots: fragment.slingshots,
      flippers: fragment.flippers ?? [],
    };

    const result = compileBoardLayout(layout, { snapToGrid: false });

    expect(result.board.guides).toHaveLength(8);
    expect(result.board.posts).toHaveLength(3);
    expect(result.board.slingshots).toHaveLength(2);
    expect(result.board.flippers).toHaveLength(2);
    expect(result.board.slingshots[0]).toMatchObject({ x: 292, y: 1120 });
    expect(result.board.slingshots[1]).toMatchObject({ x: 608, y: 1120 });
  });

  it('builds the standard lower playfield with inlanes, outlanes, slingshots, and flippers', () => {
    const lowerPlayfield = createStandardLowerPlayfieldPair({
      leftFlipperPivot: absolutePoint(270, 1220),
      rightFlipperPivot: absolutePoint(630, 1220),
      flippers: {
        leftX: 270,
        rightX: 630,
        y: 1220,
        length: 150,
        thickness: 20,
        restingAngleOffset: 0.28,
        activeAngleOffset: -0.42,
      },
    });
    const layout: BoardLayoutDefinition = {
      name: 'Standard Lower Playfield Test',
      width: 900,
      height: 1400,
      drainY: 1425,
      launchPosition: absolutePoint(770, 1180),
      materials: {
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      },
      posts: lowerPlayfield.posts,
      guides: lowerPlayfield.guides,
      slingshots: lowerPlayfield.slingshots,
      flippers: lowerPlayfield.flippers,
    };

    const result = compileBoardLayout(layout, { snapToGrid: false });

    expect(result.board.guides).toHaveLength(10);
    expect(result.board.posts).toHaveLength(6);
    expect(result.board.slingshots).toHaveLength(2);
    expect(result.board.flippers).toHaveLength(2);
    expect(result.board.guides.slice(0, 4).map((guide) => guide.plane)).toEqual(
      ['playfield', 'raised', 'playfield', 'raised'],
    );
    expect(result.board.guides.slice(5, 9).map((guide) => guide.plane)).toEqual(
      ['playfield', 'raised', 'playfield', 'raised'],
    );
    expect(result.board.guides[4]?.material).toBe('rubberPost');
    expect(result.board.guides[9]?.material).toBe('rubberPost');
    expect(result.board.slingshots[0]).toMatchObject({
      x: 288,
      y: 1082,
      angle: 0.5,
    });
    expect(result.board.slingshots[1]).toMatchObject({
      x: 612,
      y: 1082,
      angle: Math.PI - 0.5,
    });
  });
});
