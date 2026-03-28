import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import {
  getGuideHandles,
  hitTestGuideHandle,
  hitTestSelection,
  moveGuideHandle,
} from '../src/editor/table-editor';

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

  it('finds start, end, and rotate handles for a selected guide', () => {
    const guide = {
      start: { x: 120, y: 220 },
      end: { x: 320, y: 220 },
      thickness: 20,
      material: 'metalGuide' as const,
    };
    const handles = getGuideHandles(guide);

    expect(hitTestGuideHandle(handles.start, guide)).toBe('start');
    expect(hitTestGuideHandle(handles.end, guide)).toBe('end');
    expect(hitTestGuideHandle(handles.rotate, guide)).toBe('rotate');
  });

  it('moves an individual guide endpoint when dragging a handle', () => {
    const board = createBlankTable();
    board.guides = [
      {
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

    expect(next.guides[0]?.start).toEqual({ x: 140, y: 260 });
    expect(next.guides[0]?.end).toEqual({ x: 320, y: 220 });
  });

  it('rotates a guide around its midpoint when dragging the rotate handle', () => {
    const board = createBlankTable();
    board.guides = [
      {
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
    expect(guide?.start.x).toBeCloseTo(220, 5);
    expect(guide?.end.x).toBeCloseTo(220, 5);
    expect(guide?.start.y).toBeCloseTo(120, 5);
    expect(guide?.end.y).toBeCloseTo(320, 5);
  });
});
