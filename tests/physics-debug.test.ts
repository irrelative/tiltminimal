import { describe, expect, it, vi, afterEach } from 'vitest';
import { PhysicsDebug, recordDebugContact } from '../src/game/physics-debug';
import { GameLoop } from '../src/game/game-loop';
import { createInitialGameState } from '../src/game/game-state';
import { stepGameFrame } from '../src/game/physics-engine';
import { createBlankTable } from './helpers/board-fixture';
import { idleInput } from './helpers/game-fixture';
import type { CanvasRenderer } from '../src/render/canvas-renderer';
import { createPhysicsSandboxLoop } from '../src/game/physics-sandbox-loop';

afterEach(() => vi.restoreAllMocks());
const input = {
  getState: () => idleInput,
  connect: () => {},
  disconnect: () => {},
};
const renderer = () =>
  ({
    renderGame: vi.fn(),
    renderPhysicsSandbox: vi.fn(),
  }) as unknown as CanvasRenderer;
const raf = () => {
  let callback: FrameRequestCallback = () => {};
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    callback = cb;
    return 1;
  });
  return (time: number) => callback(time);
};

describe('physics debugging', () => {
  it('captures real solver contacts without changing the simulation', () => {
    const b = createBlankTable();
    const s = createInitialGameState(b);
    s.status = 'playing';
    s.launcherExited = true;
    s.ball.position = { x: 10, y: 400 };
    s.ball.linearVelocity = { x: -200, y: 0 };
    const debug = new PhysicsDebug();
    debug.enabled = true;
    const traced = debug.capture(1 / 120, () =>
      stepGameFrame(s, b, idleInput, 1 / 120),
    );
    expect(traced).toEqual(stepGameFrame(s, b, idleInput, 1 / 120));
    expect(debug.contacts.length).toBeGreaterThan(0);
    expect(debug.contacts[0].normal).toEqual({ x: 1, y: 0 });
    const count = debug.contacts.length;
    recordDebugContact({ ...debug.contacts[0], overlap: 1 } as never);
    expect(debug.contacts).toHaveLength(count);
    debug.capture(0.5, () => {});
    expect(debug.contacts).toHaveLength(0);
  });
  it('freezes game state, advances one fixed step, and resumes without catch-up', () => {
    const tick = raf(),
      b = createBlankTable(),
      r = renderer();
    const s = createInitialGameState(b);
    s.status = 'playing';
    s.launcherExited = true;
    s.ball.position = { x: 400, y: 500 };
    s.ball.linearVelocity = { x: 100, y: 0 };
    const loop = new GameLoop(s, b, input, r);
    loop.start();
    loop.debug.paused = true;
    tick(100);
    tick(5000);
    const frozen = vi.mocked(r.renderGame).mock.calls.slice(-1)[0]![1];
    expect(frozen.ball.position).toEqual(s.ball.position);
    loop.debug.step();
    tick(5016);
    const stepped = vi.mocked(r.renderGame).mock.calls.slice(-1)[0]![1];
    expect(stepped.ball.position.x).toBeGreaterThan(s.ball.position.x);
    expect(loop.debug.time).toBeCloseTo(1 / 120);
    tick(5032);
    expect(vi.mocked(r.renderGame).mock.calls.slice(-1)[0]![1]).toBe(stepped);
    loop.debug.paused = false;
    loop.debug.speed = 0.25;
    tick(5048);
    expect(loop.debug.time).toBeCloseTo(1 / 120 + 0.016 * 0.25);
    loop.stop();
  });
  it('steps a paused sandbox and keeps it paused afterward', () => {
    const tick = raf(),
      b = createBlankTable(),
      loop = createPhysicsSandboxLoop(b, input, renderer());
    loop.start();
    expect(loop.spawnBall({ x: 400, y: 500 })).toBe(true);
    loop.togglePaused();
    const y = loop.getState().balls[0].state.ball.position.y;
    tick(100);
    expect(loop.getState().balls[0].state.ball.position.y).toBe(y);
    loop.debug.step();
    tick(116);
    expect(loop.getState().balls[0].state.ball.position.y).toBeGreaterThan(y);
    expect(loop.getState().paused).toBe(true);
    loop.stop();
  });
});
