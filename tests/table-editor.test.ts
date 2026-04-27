import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import {
  getLauncherMinX,
  getPlungerGuideSegments,
} from '../src/game/plunger-geometry';
import {
  getGuideHandles,
  getOrientedRotateHandle,
  hitTestGuideHandle,
  hitTestOrientedRotateHandle,
  hitTestSelection,
  addLowerPlayfield,
  moveSelection,
  moveGuideHandle,
  rotateSelection,
  updateSelectedNumericField,
} from '../src/editor/table-editor';

describe('hitTestSelection', () => {
  it('adds a composed lower playfield package', () => {
    const board = createBlankTable();
    board.flippers = [];

    const result = addLowerPlayfield(board, { x: 450, y: 1220 });

    expect(result.selection).toEqual({ kind: 'slingshot', index: 0 });
    expect(result.board.guides).toHaveLength(4);
    expect(result.board.posts).toHaveLength(0);
    expect(result.board.slingshots).toHaveLength(2);
    expect(result.board.flippers).toHaveLength(2);
    expect(result.board.flippers[0]).toMatchObject({
      side: 'left',
      x: 270,
      y: 1220,
    });
    expect(result.board.flippers[1]).toMatchObject({
      side: 'right',
      x: 630,
      y: 1220,
    });
    expect(result.board.slingshots[0]).toMatchObject({ x: 291, y: 1116 });
    expect(result.board.slingshots[1]).toMatchObject({ x: 609, y: 1116 });
  });

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

  it('selects a curved guide when clicking near its arc', () => {
    const board = createBlankTable();
    board.guides = [
      {
        kind: 'arc',
        center: { x: 260, y: 280 },
        radius: 90,
        startAngle: Math.PI,
        endAngle: Math.PI * 1.5,
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const selection = hitTestSelection(board, { x: 194, y: 214 });

    expect(selection).toEqual({ kind: 'guide', index: 0 });
  });

  it('selects a standup target when clicking near it', () => {
    const board = createBlankTable();
    board.standupTargets = [
      {
        x: 220,
        y: 260,
        width: 60,
        height: 16,
        angle: 0,
        score: 50,
        material: 'rubberPost',
      },
    ];

    const selection = hitTestSelection(board, { x: 220, y: 266 });

    expect(selection).toEqual({ kind: 'standup-target', index: 0 });
  });

  it('selects a slingshot when clicking near its face', () => {
    const board = createBlankTable();
    board.slingshots = [
      {
        x: 240,
        y: 300,
        width: 120,
        height: 24,
        angle: 0.4,
        score: 10,
        strength: 560,
        material: 'rubberPost',
      },
    ];

    const selection = hitTestSelection(board, { x: 256, y: 304 });

    expect(selection).toEqual({ kind: 'slingshot', index: 0 });
  });

  it('selects a saucer when clicking inside its radius', () => {
    const board = createBlankTable();
    board.saucers = [
      {
        x: 260,
        y: 320,
        radius: 28,
        score: 500,
        holdSeconds: 0.4,
        ejectSpeed: 900,
        ejectAngle: -Math.PI / 2,
        material: 'metalGuide',
      },
    ];

    const selection = hitTestSelection(board, { x: 268, y: 324 });

    expect(selection).toEqual({ kind: 'saucer', index: 0 });
  });

  it('selects a post when clicking inside its radius', () => {
    const board = createBlankTable();
    board.posts = [
      {
        x: 260,
        y: 320,
        radius: 18,
        material: 'rubberPost',
      },
    ];

    const selection = hitTestSelection(board, { x: 266, y: 324 });

    expect(selection).toEqual({ kind: 'post', index: 0 });
  });

  it('selects the launcher when clicking on the shooter body', () => {
    const board = createBlankTable();

    const selection = hitTestSelection(board, {
      x: board.plunger.x,
      y: board.plunger.y,
    });

    expect(selection).toEqual({ kind: 'launch-position' });
  });

  it('selects the launcher when clicking on the shooter guide', () => {
    const board = createBlankTable();
    const [leftGuide] = getPlungerGuideSegments(board);

    const selection = hitTestSelection(board, {
      x: leftGuide.start.x,
      y: (leftGuide.start.y + leftGuide.end.y) / 2,
    });

    expect(selection).toEqual({ kind: 'launch-position' });
  });

  it('allows a bumper to move flush to the canvas edge', () => {
    const board = createBlankTable();
    board.bumpers = [
      {
        x: 220,
        y: 260,
        radius: 44,
        score: 100,
        material: 'rubberPost',
      },
    ];

    const next = moveSelection(board, { kind: 'bumper', index: 0 }, { x: 0, y: 0 });

    expect(next.bumpers[0]?.x).toBe(44);
    expect(next.bumpers[0]?.y).toBe(44);
  });

  it('moves and updates a post like other circular elements', () => {
    const board = createBlankTable();
    board.posts = [
      {
        x: 220,
        y: 260,
        radius: 18,
        material: 'rubberPost',
      },
    ];

    const moved = moveSelection(board, { kind: 'post', index: 0 }, { x: 0, y: 0 });

    expect(moved.posts[0]?.x).toBe(18);
    expect(moved.posts[0]?.y).toBe(18);

    const updated = updateSelectedNumericField(
      moved,
      { kind: 'post', index: 0 },
      'radius',
      24,
    );

    expect(updated.posts[0]?.radius).toBe(24);
  });

  it('moves and updates a slingshot like other oriented elements', () => {
    const board = createBlankTable();
    board.slingshots = [
      {
        x: 240,
        y: 300,
        width: 120,
        height: 24,
        angle: 0.4,
        score: 10,
        strength: 560,
        material: 'rubberPost',
      },
    ];

    const moved = moveSelection(board, { kind: 'slingshot', index: 0 }, { x: 0, y: 0 });

    expect(moved.slingshots[0]?.x).toBeGreaterThan(0);
    expect(moved.slingshots[0]?.y).toBeGreaterThan(0);

    const updated = updateSelectedNumericField(
      moved,
      { kind: 'slingshot', index: 0 },
      'strength',
      640,
    );

    expect(updated.slingshots[0]?.strength).toBe(640);
  });

  it('finds start, end, and rotate handles for a selected guide', () => {
    const guide = {
      kind: 'line' as const,
      start: { x: 120, y: 220 },
      end: { x: 320, y: 220 },
      thickness: 20,
      material: 'metalGuide' as const,
    };
    const handles = getGuideHandles(guide);

    expect(handles).not.toBeNull();
    if (!handles) {
      throw new Error('Expected line guide handles.');
    }

    expect(hitTestGuideHandle(handles.start, guide)).toBe('start');
    expect(hitTestGuideHandle(handles.end, guide)).toBe('end');
    expect(hitTestGuideHandle(handles.rotate, guide)).toBe('rotate');
  });

  it('finds curved guide start, end, and radius handles', () => {
    const guide = {
      kind: 'arc' as const,
      center: { x: 260, y: 280 },
      radius: 90,
      startAngle: Math.PI,
      endAngle: Math.PI * 1.5,
      thickness: 20,
      material: 'metalGuide' as const,
    };
    const handles = getGuideHandles(guide);

    expect(handles).not.toBeNull();
    if (!handles) {
      throw new Error('Expected curved guide handles.');
    }

    expect(hitTestGuideHandle(handles.start, guide)).toBe('arc-start');
    expect(hitTestGuideHandle(handles.end, guide)).toBe('arc-end');
    expect(hitTestGuideHandle(handles.rotate, guide)).toBe('arc-radius');
  });

  it('moves an individual guide endpoint when dragging a handle', () => {
    const board = createBlankTable();
    board.guides = [
      {
        kind: 'line',
        start: { x: 120, y: 220 },
        end: { x: 320, y: 220 },
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const next = moveGuideHandle(
      board,
      { kind: 'guide', index: 0 },
      'start',
      { x: 140, y: 260 },
    );

    const guide = next.guides[0];

    expect(guide).toBeDefined();
    expect(guide?.kind).toBe('line');
    if (!guide || guide.kind === 'arc') {
      throw new Error('Expected line guide.');
    }

    expect(guide.start).toEqual({ x: 140, y: 260 });
    expect(guide.end).toEqual({ x: 320, y: 220 });
  });

  it('allows a guide endpoint to reach the canvas edge', () => {
    const board = createBlankTable();
    board.guides = [
      {
        kind: 'line',
        start: { x: 120, y: 220 },
        end: { x: 320, y: 220 },
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const next = moveGuideHandle(
      board,
      { kind: 'guide', index: 0 },
      'start',
      { x: 0, y: 0 },
    );

    const guide = next.guides[0];

    expect(guide).toBeDefined();
    expect(guide?.kind).toBe('line');
    if (!guide || guide.kind === 'arc') {
      throw new Error('Expected line guide.');
    }

    expect(guide.start).toEqual({ x: 10, y: 10 });
  });

  it('rotates a guide around its midpoint when dragging the rotate handle', () => {
    const board = createBlankTable();
    board.guides = [
      {
        kind: 'line',
        start: { x: 120, y: 220 },
        end: { x: 320, y: 220 },
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const next = moveGuideHandle(
      board,
      { kind: 'guide', index: 0 },
      'rotate',
      { x: 220, y: 320 },
    );
    const guide = next.guides[0];

    expect(guide).toBeDefined();
    expect(guide?.kind).toBe('line');
    if (!guide || guide.kind === 'arc') {
      throw new Error('Expected line guide.');
    }

    expect(guide.start.x).toBeCloseTo(220, 5);
    expect(guide.end.x).toBeCloseTo(220, 5);
    expect(guide.start.y).toBeCloseTo(120, 5);
    expect(guide.end.y).toBeCloseTo(320, 5);
  });

  it('moves a curved guide start handle by updating start angle', () => {
    const board = createBlankTable();
    board.guides = [
      {
        kind: 'arc',
        center: { x: 260, y: 280 },
        radius: 90,
        startAngle: Math.PI,
        endAngle: Math.PI * 1.5,
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const next = moveGuideHandle(
      board,
      { kind: 'guide', index: 0 },
      'arc-start',
      { x: 260, y: 190 },
    );
    const guide = next.guides[0];

    expect(guide).toBeDefined();
    expect(guide?.kind).toBe('arc');
    if (!guide || guide.kind !== 'arc') {
      throw new Error('Expected arc guide.');
    }

    expect(guide.startAngle).toBeCloseTo(Math.PI * 1.5, 5);
  });

  it('moves a curved guide radius handle by updating radius', () => {
    const board = createBlankTable();
    board.guides = [
      {
        kind: 'arc',
        center: { x: 260, y: 280 },
        radius: 90,
        startAngle: Math.PI,
        endAngle: Math.PI * 1.5,
        thickness: 20,
        material: 'metalGuide',
      },
    ];

    const next = moveGuideHandle(
      board,
      { kind: 'guide', index: 0 },
      'arc-radius',
      { x: 260, y: 140 },
    );
    const guide = next.guides[0];

    expect(guide).toBeDefined();
    expect(guide?.kind).toBe('arc');
    if (!guide || guide.kind !== 'arc') {
      throw new Error('Expected arc guide.');
    }

    expect(guide.radius).toBeCloseTo(140, 5);
  });

  it('finds a rotate handle for a standup target', () => {
    const target = {
      x: 220,
      y: 260,
      width: 60,
      height: 16,
      angle: 0,
      score: 50,
      material: 'rubberPost' as const,
    };
    const handle = getOrientedRotateHandle(
      target,
      target.height,
      target.angle,
    );

    expect(
      hitTestOrientedRotateHandle(
        handle,
        target,
        target.height,
        target.angle,
      ),
    ).toBe(true);
  });

  it('rotates a standup target with the rotate handle drag', () => {
    const board = createBlankTable();
    board.standupTargets = [
      {
        x: 220,
        y: 260,
        width: 60,
        height: 16,
        angle: 0,
        score: 50,
        material: 'rubberPost',
      },
    ];

    const next = rotateSelection(
      board,
      { kind: 'standup-target', index: 0 },
      { x: 260, y: 260 },
    );

    expect(next.standupTargets[0]?.angle).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('rotates a spinner with the rotate handle drag', () => {
    const board = createBlankTable();
    board.spinners = [
      {
        x: 320,
        y: 280,
        length: 90,
        thickness: 10,
        angle: 0,
        score: 10,
        material: 'metalGuide',
      },
    ];

    const next = rotateSelection(
      board,
      { kind: 'spinner', index: 0 },
      { x: 320, y: 340 },
    );

    expect(next.spinners[0]?.angle).toBeCloseTo(0, 5);
  });

  it('rotates a drop target with the rotate handle drag', () => {
    const board = createBlankTable();
    board.dropTargets = [
      {
        x: 280,
        y: 320,
        width: 54,
        height: 16,
        angle: 0,
        score: 100,
        material: 'rubberPost',
      },
    ];

    const next = rotateSelection(
      board,
      { kind: 'drop-target', index: 0 },
      { x: 280, y: 260 },
    );

    expect(next.dropTargets[0]?.angle).toBeCloseTo(-Math.PI, 5);
  });

  it('rotates a slingshot with the rotate handle drag', () => {
    const board = createBlankTable();
    board.slingshots = [
      {
        x: 320,
        y: 340,
        width: 120,
        height: 24,
        angle: 0.4,
        score: 10,
        strength: 560,
        material: 'rubberPost',
      },
    ];

    const next = rotateSelection(
      board,
      { kind: 'slingshot', index: 0 },
      { x: 320, y: 280 },
    );

    expect(next.slingshots[0]?.angle).toBeCloseTo(-Math.PI, 5);
  });

  it('moves the launcher and keeps the plunger aligned', () => {
    const board = createBlankTable();
    const startPlunger = { x: board.plunger.x, y: board.plunger.y };
    const startLaunch = { ...board.launchPosition };

    const next = moveSelection(board, { kind: 'launch-position' }, {
      x: 720,
      y: 1120,
    });

    expect(next.launchPosition.x).toBe(720);
    expect(next.launchPosition.y).toBe(1120);
    expect(next.plunger.y - startPlunger.y).toBe(
      next.launchPosition.y - startLaunch.y,
    );
    expect(next.launchPosition.x - startLaunch.x).toBe(
      next.plunger.x - startPlunger.x,
    );
    expect(next.launchPosition.y - startLaunch.y).toBe(
      next.plunger.y - startPlunger.y,
    );
  });

  it('updates launcher numeric fields while keeping the plunger aligned', () => {
    const board = createBlankTable();
    const startLaunch = { ...board.launchPosition };
    const startPlungerX = board.plunger.x;

    const next = updateSelectedNumericField(
      board,
      { kind: 'launch-position' },
      'x',
      700,
    );

    expect(next.launchPosition.x).toBe(700);
    expect(next.launchPosition.x - startLaunch.x).toBe(700 - startLaunch.x);
    expect(next.plunger.x - startPlungerX).toBe(700 - startLaunch.x);
  });

  it('keeps the launcher on the right half of the board', () => {
    const board = createBlankTable();

    const next = moveSelection(board, { kind: 'launch-position' }, { x: 100, y: 900 });

    expect(next.launchPosition.x).toBe(getLauncherMinX(board));
  });
});
