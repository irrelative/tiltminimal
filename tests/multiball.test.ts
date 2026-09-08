import { describe, expect, it } from 'vitest';
import { classicTable } from '../src/boards/tables/classic-table';
import {
  createInitialGameState,
  createBallState,
  cloneBallState,
} from '../src/game/game-state';
import { stepGameFrame } from '../src/game/physics-engine';
import {
  applyRulesFrame,
  initializeRulesState,
} from '../src/game/rules-engine';
import {
  lockCapturedBall,
  releaseLockedBalls,
  resolveBallPairs,
} from '../src/game/multiball';
import { idle } from '../src/playtest/simulation';

const board = {
  ...classicTable,
  gravity: 0,
  guides: [],
  posts: [],
  bumpers: [],
  standupTargets: [],
  dropTargets: [],
  spinners: [],
  slingshots: [],
  rollovers: [],
  flippers: [],
  saucers: [],
};
function pair() {
  const state = initializeRulesState(createInitialGameState(board), board);
  state.status = 'playing';
  state.launcherExited = true;
  state.ball.position = { x: 400, y: 800 };
  state.additionalBalls = [createBallState(board)];
  state.additionalBalls[0].position = { x: 500, y: 800 };
  state.additionalBalls[0].launcherExited = true;
  return state;
}

describe('shared multiball lifecycle', () => {
  it('removes one drained ball without resetting switches or advancing the turn', () => {
    const state = pair();
    state.ball.position.y = board.drainY + 50;
    const frame = stepGameFrame(state, board, idle, 1 / 120);
    const next = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
    expect(next.status).toBe('playing');
    expect(next.ball.position.x).toBe(500);
    expect(next.additionalBalls).toHaveLength(0);
    expect(next.rules.currentBall).toBe(1);
    expect(frame.events.map((e) => e.type)).toEqual(['multiball-ended']);
    expect(state.additionalBalls).toHaveLength(1);
  });
  it('advances exactly once when both balls drain together', () => {
    const state = pair();
    state.ball.position.y = state.additionalBalls[0].position.y =
      board.drainY + 50;
    const frame = stepGameFrame(state, board, idle, 1 / 120);
    expect(frame.events.filter((e) => e.type === 'ball-drained')).toHaveLength(
      1,
    );
    const next = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
    expect(next.rules.currentBall).toBe(2);
    expect(next.rules.ballsRemaining).toBe(2);
    expect(next.additionalBalls).toHaveLength(0);
    expect(next.status).toBe('waiting-launch');
  });
  it('advances shared flippers and device timers once regardless of ball count', () => {
    const single = createInitialGameState(classicTable);
    single.status = 'playing';
    single.launcherExited = true;
    single.ball.position = { x: 400, y: 800 };
    single.standupTargets[0].cooldownSeconds = 1;
    const multi = {
      ...single,
      additionalBalls: [createBallState(classicTable)],
    };
    multi.additionalBalls[0].position = { x: 500, y: 800 };
    const input = { ...idle, leftPressed: true };
    const a = stepGameFrame(single, classicTable, input, 1 / 120).state;
    const b = stepGameFrame(multi, classicTable, input, 1 / 120).state;
    expect(b.flippers).toEqual(a.flippers);
    expect(b.standupTargets[0].cooldownSeconds).toBeCloseTo(
      a.standupTargets[0].cooldownSeconds,
      10,
    );
  });
  it('keeps rollover entry latches independent for two balls', () => {
    const b = {
      ...board,
      rollovers: [{ ...classicTable.rollovers[0], x: 400, y: 800 }],
    };
    let state = createInitialGameState(b);
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = { x: 400, y: 800 };
    state.additionalBalls = [createBallState(b)];
    state.additionalBalls[0].position = { x: 600, y: 800 };
    let hits = 0;
    for (let f = 0; f < 30; f++) {
      const frame = stepGameFrame(state, b, idle, 1 / 120);
      state = frame.state;
      hits += frame.events.filter((e) => e.type === 'rollover-hit').length;
    }
    expect(hits).toBe(1);
  });
  it('preserves a dropped target and bonus after the secondary ball drains', () => {
    let state = createInitialGameState(classicTable);
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = { x: 400, y: 800 };
    state.dropTargets[0].isDown = true;
    state.rules.bonus = 5000;
    state.additionalBalls = [createBallState(classicTable)];
    state.additionalBalls[0].position.y = classicTable.drainY + 50;
    const frame = stepGameFrame(state, classicTable, idle, 1 / 120);
    state = applyRulesFrame(frame.state, classicTable, frame.events, 1 / 120);
    expect(state.dropTargets[0].isDown).toBe(true);
    expect(state.rules.bonus).toBe(5000);
    expect(state.status).toBe('playing');
  });
  it('owns saucer captures per ball rather than capturing every live ball', () => {
    const b = {
      ...board,
      saucers: [{ ...classicTable.saucers[0], x: 400, y: 800, holdSeconds: 1 }],
    };
    const state = createInitialGameState(b);
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = { x: 400, y: 800 };
    state.additionalBalls = [createBallState(b)];
    state.additionalBalls[0].position = { x: 600, y: 800 };
    state.additionalBalls[0].linearVelocity = { x: 0, y: 100 };
    let next = stepGameFrame(state, b, idle, 1 / 120).state;
    next = stepGameFrame(next, b, idle, 1 / 120).state;
    expect(next.ball.capturedSaucer).toBe(0);
    expect(next.additionalBalls[0].capturedSaucer).toBeUndefined();
    expect(next.additionalBalls[0].position.y).toBeGreaterThan(801);
    expect(next.saucers[0].holdSecondsRemaining).toBeCloseTo(1 - 1 / 120, 5);
  });
  it('holds a locked ball, serves a replacement, and releases without resetting the turn', () => {
    const b = {
      ...board,
      saucers: [{ ...classicTable.saucers[0], x: 400, y: 700 }],
    };
    let state = createInitialGameState(b);
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = { x: 400, y: 700 };
    state = stepGameFrame(state, b, idle, 1 / 120).state;
    state.rules.bonus = 7000;
    expect(lockCapturedBall(state, b, 0)).toBe(true);
    expect(state.status).toBe('waiting-launch');
    const before = cloneBallState(state.lockedBalls[0].ball);
    for (let n = 0; n < 120; n++)
      state = stepGameFrame(state, b, idle, 1 / 60).state;
    expect(state.lockedBalls[0].ball).toEqual(before);
    expect(state.saucers[0].occupied).toBe(true);
    expect(state.rules.bonus).toBe(7000);
    expect(state.rules.currentBall).toBe(1);
    expect(releaseLockedBalls(state, b)).toBe(0);
    state.status = 'playing';
    state.launcherExited = true;
    expect(releaseLockedBalls(state, b)).toBe(1);
    expect(releaseLockedBalls(state, b)).toBe(0);
    expect(state.additionalBalls).toHaveLength(1);
    expect(state.saucers[0].occupied).toBe(false);
    expect(state.additionalBalls[0].linearVelocity.y).toBeGreaterThan(0);
  });
  it('exchanges momentum without adding energy when two balls collide', () => {
    const a = createBallState(board),
      b = createBallState(board);
    a.position = { x: 400, y: 800 };
    b.position = { x: 430, y: 800 };
    a.linearVelocity = { x: 300, y: 0 };
    b.linearVelocity = { x: -300, y: 0 };
    resolveBallPairs([a, b]);
    expect(a.linearVelocity.x).toBeLessThan(0);
    expect(b.linearVelocity.x).toBeGreaterThan(0);
    expect(a.linearVelocity.x + b.linearVelocity.x).toBeCloseTo(0);
    expect(a.linearVelocity.x ** 2 + b.linearVelocity.x ** 2).toBeLessThan(
      180000,
    );
    expect(b.position.x - a.position.x).toBeCloseTo(a.radius + b.radius);
  });
});
