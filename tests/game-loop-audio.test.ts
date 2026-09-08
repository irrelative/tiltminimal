import { afterEach, expect, it, vi } from 'vitest';
import { GameLoop } from '../src/game/game-loop';
import { createInitialGameState } from '../src/game/game-state';
import { harlemGlobetrottersTable as board } from '../src/boards/tables/harlem-globetrotters';
import type { GameAudio } from '../src/audio/game-audio';
import type { CanvasRenderer } from '../src/render/canvas-renderer';
import { idleInput } from './helpers/game-fixture';

afterEach(() => vi.unstubAllGlobals());
it('forwards actual scoring events once and starts the tune only on a game restart', () => {
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
  };
  const audio = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    playEvents: vi.fn(),
    playGameEvents: vi.fn(),
    startGame: vi.fn(),
  };
  const renderer = { renderGame: vi.fn() };
  const state = createInitialGameState(board);
  state.status = 'playing';
  state.launcherExited = true;
  const bumper = board.bumpers[0];
  state.ball.position = {
    x: bumper.x + bumper.radius + state.ball.radius - 1,
    y: bumper.y,
  };
  state.ball.linearVelocity = { x: -300, y: 0 };
  const loop = new GameLoop(
    state,
    board,
    source,
    renderer as unknown as CanvasRenderer,
    audio as unknown as GameAudio,
  );
  let seed = true;
  loop.setOnStateChange((current) => {
    if (seed) {
      current.status = 'playing';
      seed = false;
    }
  });
  loop.start();
  expect(audio.connect).toHaveBeenCalledWith(board);
  frame(100);
  expect(audio.playGameEvents).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ type: 'bumper-hit', index: 0 }),
    ]),
  );
  audio.playGameEvents.mockClear();
  frame(116);
  expect(audio.playGameEvents).toHaveBeenCalledOnce();
  expect(
    audio.playGameEvents.mock.calls[0][0].filter(
      (event: { type: string }) => event.type === 'bumper-hit',
    ),
  ).toHaveLength(0);
  expect(audio.startGame).not.toHaveBeenCalled();
  loop.stop();
  expect(audio.disconnect).toHaveBeenCalledOnce();
  const over = createInitialGameState(board);
  over.status = 'game-over';
  const restart = new GameLoop(
    over,
    board,
    source,
    renderer as unknown as CanvasRenderer,
    audio as unknown as GameAudio,
  );
  let endGame = true;
  restart.setOnStateChange((current) => {
    if (endGame) {
      current.status = 'game-over';
      endGame = false;
    }
  });
  restart.start();
  input = { ...idleInput, launchPressed: true };
  frame(200);
  expect(audio.startGame).toHaveBeenCalledOnce();
  frame(216);
  expect(audio.startGame).toHaveBeenCalledOnce();
  restart.stop();
});
