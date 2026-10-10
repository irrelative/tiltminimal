import { afterEach, expect, it, vi } from 'vitest';
import { initializeRulesState } from '../src/game/rules-engine';
import { GameLoop } from '../src/game/game-loop';
import { createInitialGameState, type GameState } from '../src/game/game-state';
import { justOneMoreTable as board } from '../src/boards/tables/just-one-more';
import type { CanvasRenderer } from '../src/render/canvas-renderer';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { idleInput } from './helpers/game-fixture';

afterEach(() => vi.unstubAllGlobals());
const fixture = (activeBoard = board) => {
  let frame!: FrameRequestCallback;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  let input = { ...idleInput };
  const source = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getState: () => input,
    reset: vi.fn(() => {
      input = { ...idleInput };
    }),
  };
  const loop = new GameLoop(
    createInitialGameState(activeBoard),
    activeBoard,
    source,
    {
      renderGame: vi.fn(),
    } as unknown as CanvasRenderer,
  );
  let current!: GameState;
  loop.setOnStateChange((state) => {
    current = state;
  });
  loop.start();
  return {
    loop,
    source,
    frame: (time: number) => frame(time),
    state: () => current,
    hold: () => {
      input.launchPressed = true;
    },
  };
};

it('freezes gameplay, cancels a partial plunge, and resumes without launching or catching up', () => {
  const f = fixture();
  f.hold();
  f.frame(100);
  expect(f.state().plunger.pullback).toBeGreaterThan(0);
  const tick = f.state().tick;
  const position = { ...f.state().ball.position };
  f.loop.suspended = true;
  f.frame(10100);
  expect(f.state().tick).toBe(tick);
  expect(f.state().ball.position).toEqual(position);
  expect(f.state().plunger.pullback).toBe(0);
  f.hold(); // Controls pressed while paused are discarded on resume.
  f.loop.suspended = false;
  f.frame(10116);
  expect(f.state().status).toBe('waiting-launch');
  expect(f.state().plunger.pullback).toBe(0);
  expect(f.source.reset).toHaveBeenCalledTimes(2);
  f.loop.stop();
});

it('preserves live ball motion, score, and rules while paused', () => {
  const f = fixture();
  f.state().status = 'playing';
  f.state().launcherExited = true;
  f.state().ball.position = { x: 450, y: 500 };
  f.state().ball.linearVelocity = { x: 80, y: 200 };
  f.state().score = 789;
  f.state().rules.bonus = 42;
  f.state().spinners[0].angularVelocity = 90;
  f.frame(100);
  const before = structuredClone(f.state());
  f.loop.suspended = true;
  f.frame(116);
  f.frame(10116);
  expect(f.state()).toEqual(before);
  f.loop.suspended = false;
  f.frame(10132);
  expect(f.state().tick).toBeGreaterThan(before.tick);
  expect(f.state().ball.position).not.toEqual(before.ball.position);
  f.loop.stop();
});

it.each(BUILT_IN_TABLES)(
  'replays $id into a fresh game immediately, ignoring mid-game replay',
  (table) => {
    const f = fixture(table.board);
    f.loop.restartGame();
    expect(f.source.reset).not.toHaveBeenCalled();
    f.state().status = 'game-over';
    f.state().score = 9000;
    f.state().rules.currentBall = 3;
    f.state().tick = 200;
    f.hold();
    f.loop.restartGame();
    expect(f.state()).toEqual(
      initializeRulesState(createInitialGameState(table.board), table.board),
    );
    expect(f.source.reset).toHaveBeenCalledOnce();
    f.frame(100);
    expect(f.state().status).toBe('waiting-launch');
    expect(f.state().plunger.pullback).toBe(0);
    f.loop.stop();
  },
);
