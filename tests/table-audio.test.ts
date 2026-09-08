import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../src/audio/game-audio';
import {
  getTableAudioProfile,
  harlemAudioProfile,
} from '../src/audio/table-audio-profiles';
import { TableTonePlayer } from '../src/audio/table-tone-player';
import { harlemGlobetrottersTable } from '../src/boards/tables/harlem-globetrotters';
import { classicTable } from '../src/boards/tables/classic-table';

const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
});
const mockContext = () => {
  const oscillators: ReturnType<typeof oscillator>[] = [];
  const oscillator = () => ({
    frequency: param(),
    setPeriodicWave: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  });
  const context = {
    state: 'running',
    currentTime: 0,
    destination: {},
    createGain: vi.fn(() => ({
      gain: param(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createPeriodicWave: vi.fn(),
    createOscillator: vi.fn(() => {
      const node = oscillator();
      oscillators.push(node);
      return node;
    }),
    resume: vi.fn(async () => {
      context.state = 'running';
    }),
  };
  return {
    context,
    oscillators,
    audioContext: context as unknown as AudioContext,
  };
};
afterEach(() => vi.unstubAllGlobals());

describe('table sound selection', () => {
  it('opts Harlem in while other tables keep mechanical audio', () => {
    expect(getTableAudioProfile(harlemGlobetrottersTable)).toBe(
      harlemAudioProfile,
    );
    expect(getTableAudioProfile(classicTable)).toBeNull();
  });
  it('prioritizes a saucer award over simultaneous spinner and bumper hits', () => {
    const award = {
      type: 'saucer-captured',
      index: 1,
      score: 25000,
      tick: 1,
    } as const;
    expect(
      harlemAudioProfile.cueForEvents([
        { type: 'spinner-spin', index: 0, score: 100, tick: 1 },
        { type: 'bumper-hit', index: 0, score: 100, tick: 1 },
        award,
      ]),
    ).toEqual(harlemAudioProfile.cueForEvents([award]));
  });
  it('bounds spinner bursts and does not invent scoring on launches or drains', () => {
    const burst = harlemAudioProfile.cueForEvents(
      Array.from({ length: 100 }, () => ({
        type: 'spinner-spin' as const,
        index: 0,
        score: 100,
        tick: 1,
      })),
    );
    expect(burst?.notes).toHaveLength(6);
    expect(
      harlemAudioProfile.cueForEvents([
        { type: 'ball-launched', tick: 1 },
        { type: 'ball-drained', tick: 2 },
      ]),
    ).toBeNull();
  });
});

describe('single electronic voice', () => {
  it('protects a tune from low-priority impacts and cancels scheduled notes on stop', () => {
    const { audioContext, oscillators } = mockContext();
    const player = new TableTonePlayer();
    player.play(audioContext, harlemAudioProfile.start);
    const count = oscillators.length;
    player.play(audioContext, {
      notes: [{ midi: 76, beats: 1 }],
      beatSeconds: 0.1,
      priority: 1,
    });
    expect(oscillators).toHaveLength(count);
    player.stop();
    expect(
      oscillators.every(
        (o) =>
          o.stop.mock.calls.length === 2 &&
          o.disconnect.mock.calls.length === 1,
      ),
    ).toBe(true);
  });
  it('releases completed voice nodes and allows the next scoring note', () => {
    const { audioContext, context, oscillators } = mockContext();
    const player = new TableTonePlayer();
    const cue = {
      notes: [{ midi: 76, beats: 1 }],
      beatSeconds: 0.1,
      priority: 1,
    };
    player.play(audioContext, cue);
    oscillators[0].onended!();
    expect(oscillators[0].disconnect).toHaveBeenCalledOnce();
    context.currentTime = 1;
    player.play(audioContext, cue);
    expect(oscillators).toHaveLength(2);
  });
});

describe('audio session lifecycle', () => {
  it('plays startup once after unlock, restarts on a new game, and clears it on table change', async () => {
    const { context, oscillators } = mockContext();
    context.state = 'suspended';
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          return context;
        }
      },
    );
    const audio = new GameAudio();
    audio.connect(harlemGlobetrottersTable);
    audio.playGameEvents([]);
    expect(oscillators).toHaveLength(0);
    window.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    const count = harlemAudioProfile.start.notes.length;
    expect(oscillators).toHaveLength(count);
    window.dispatchEvent(new Event('keydown'));
    audio.playGameEvents([]);
    expect(oscillators).toHaveLength(count);
    audio.startGame();
    expect(oscillators).toHaveLength(count * 2);
    audio.disconnect();
    audio.connect(classicTable);
    window.dispatchEvent(new Event('pointerdown'));
    audio.playGameEvents([
      { type: 'bumper-hit', index: 0, score: 100, tick: 1 },
    ]);
    expect(oscillators).toHaveLength(count * 2);
    audio.disconnect();
  });
  it('does not play a stale startup when resume resolves after leaving Harlem', async () => {
    const { context, oscillators } = mockContext();
    context.state = 'suspended';
    let finish!: () => void;
    context.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            context.state = 'running';
            resolve();
          };
        }),
    );
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          return context;
        }
      },
    );
    const audio = new GameAudio();
    audio.connect(harlemGlobetrottersTable);
    window.dispatchEvent(new Event('pointerdown'));
    audio.disconnect();
    finish();
    await Promise.resolve();
    expect(oscillators).toHaveLength(0);
  });
});
