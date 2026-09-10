import { describe, expect, it } from 'vitest';
import { classicTable as board } from '../src/boards/tables/classic-table';
import { cloneBallState } from '../src/game/game-state';
import { stepGameFrame } from '../src/game/physics-engine';
import { runFallingSkill, skillStep } from './helpers/flipper-skills';
import { idleInput } from './helpers/game-fixture';

const caught = () =>
  runFallingSkill(board, {
    skill: 'live-catch',
    source: 0,
    speed: 600,
    delay: 8,
    impactPosition: 0.65,
  }).state;
const held = { ...idleInput, leftPressed: true };

describe('live-catch contact continuity', () => {
  it('belongs to one ball and survives a state clone in multiball', () => {
    const state = caught();
    expect(state.ball.liveCatchFlipper).toBe(0);
    const other = cloneBallState(state.ball);
    delete other.liveCatchFlipper;
    other.position = { x: 450, y: 700 };
    other.linearVelocity = { x: 0, y: 600 };
    state.additionalBalls = [other];
    const next = stepGameFrame(state, board, held, skillStep).state;
    expect(next.ball.liveCatchFlipper).toBe(0);
    expect(next.additionalBalls).toHaveLength(1);
    expect(next.additionalBalls[0].liveCatchFlipper).toBeUndefined();
    expect(state.additionalBalls[0].position).toEqual({ x: 450, y: 700 });
  });

  it.each(['separated', 'underside', 'fast', 'released'] as const)(
    'clears the catch when the ball is %s',
    (condition) => {
      const state = caught();
      if (condition === 'separated') state.ball.position = { x: 450, y: 700 };
      if (condition === 'underside') state.ball.position = { x: 285, y: 1260 };
      if (condition === 'fast') state.ball.linearVelocity = { x: 1600, y: 0 };
      const next = stepGameFrame(
        state,
        board,
        condition === 'released' ? idleInput : held,
        skillStep,
      ).state;
      expect(next.ball.liveCatchFlipper).toBeUndefined();
    },
  );

  it('does not turn a very fast incoming ball into a timed catch', () => {
    for (const delay of [1, 2, 3, 4, 5]) {
      const result = runFallingSkill(board, {
        skill: 'live-catch',
        source: 0,
        speed: 1600,
        delay,
        impactPosition: 0.65,
      });
      expect(result.firstContactSpeed).toBeGreaterThan(100);
    }
  });
});
