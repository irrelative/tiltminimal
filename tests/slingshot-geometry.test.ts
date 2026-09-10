import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { classicTable } from '../src/boards/tables/classic-table';
import { cloneBoardDefinition } from '../src/boards/board-codec';
import { createInitialGameState } from '../src/game/game-state';
import {
  getSlingshotAngle,
  getSlingshotCollision,
  getSlingshotRubberRadius,
} from '../src/game/slingshot-geometry';
import { getArcGuidePoint } from '../src/game/guide-geometry';
import {
  resolvePostCollisions,
  resolveSlingshotCollisions,
} from '../src/game/physics-engine-devices';
import { analyzeBoard } from '../src/validation/table-analysis';
import type { GameEvent } from '../src/game/rules-types';
import { createBlankTable } from './helpers/board-fixture';

describe('connected sling rubber', () => {
  it.each(BUILT_IN_TABLES)(
    '$id mounts each conventional lower post at a return exit',
    ({ board }) => {
      for (const sling of board.slingshots.filter((s) => s.backOutline)) {
        const angle = getSlingshotAngle(board, sling);
        const sign = Math.sin(angle) > 0 ? 1 : -1;
        const post = {
          x: sling.x + (sign * Math.cos(angle) * sling.width) / 2,
          y: sling.y + (sign * Math.sin(angle) * sling.width) / 2,
        };
        expect(
          board.guides.some((guide) => {
            if (guide.kind !== 'arc') return false;
            return [guide.startAngle, guide.endAngle].some((a) => {
              const endpoint = getArcGuidePoint(guide, a);
              return (
                Math.hypot(endpoint.x - post.x, endpoint.y - post.y) < 0.01
              );
            });
          }),
        ).toBe(true);
      }
    },
  );

  it('rebounds off a rounded endpoint exactly like one passive rubber post', () => {
    const board = createBlankTable();
    board.flippers = [];
    const sling = {
      x: 400,
      y: 500,
      width: 144,
      height: 50,
      angle: 0,
      material: 'rubberPost' as const,
      strength: 560,
      score: 10,
      backOutline: [
        { x: 50, y: 60 },
        { x: -50, y: 60 },
      ],
    };
    board.slingshots = [sling];
    board.posts = [];
    const state = createInitialGameState(board);
    const radius = getSlingshotRubberRadius(sling);
    const distance = state.ball.radius + radius - 1;
    state.ball.position = {
      x: 472 + distance / Math.sqrt(2),
      y: 500 - distance / Math.sqrt(2),
    };
    state.ball.linearVelocity = { x: -200, y: 200 };
    const postState = structuredClone(state);
    const events: GameEvent[] = [];
    resolveSlingshotCollisions(state, board, board.physics.solver, events);
    board.posts = [{ x: 472, y: 500, radius, material: 'rubberPost' }];
    resolvePostCollisions(postState, board, board.physics.solver);
    expect(events).toEqual([]);
    expect(state.ball.position.x).toBeCloseTo(postState.ball.position.x);
    expect(state.ball.position.y).toBeCloseTo(postState.ball.position.y);
    expect(state.ball.linearVelocity.x).toBeCloseTo(
      postState.ball.linearVelocity.x,
    );
    expect(state.ball.linearVelocity.y).toBeCloseTo(
      postState.ball.linearVelocity.y,
    );
    expect(state.slingshots[0].cooldownSeconds).toBe(0);
  });

  it('blocks the filled back pocket and keeps its collision geometry independently cloned', () => {
    const board = cloneBoardDefinition(classicTable);
    const sling = board.slingshots[0],
      angle = getSlingshotAngle(board, sling);
    const point = {
      x: sling.x - Math.sin(angle) * 20,
      y: sling.y + Math.cos(angle) * 20,
    };
    expect(
      getSlingshotCollision(point, board.ball.radius, board, sling),
    ).not.toBeNull();
    sling.backOutline![0].x += 50;
    expect(sling.backOutline![0].x).not.toBe(
      classicTable.slingshots[0].backOutline![0].x,
    );
  });

  it('still reports a guide crossing the active face rather than accepting it as an attachment', () => {
    const board = cloneBoardDefinition(classicTable);
    const sling = board.slingshots[0],
      a = getSlingshotAngle(board, sling);
    const point = (offset: number) => ({
      x: sling.x - Math.sin(a) * offset,
      y: sling.y + Math.cos(a) * offset,
    });
    board.guides.push({
      start: point(-40),
      end: point(40),
      thickness: 12,
      material: 'metalGuide',
      plane: 'playfield',
    });
    expect(
      analyzeBoard(board).some(
        (w) =>
          w.code === 'element-overlap' &&
          w.elements?.some((e) => e.kind === 'slingshot'),
      ),
    ).toBe(true);
  });
});
