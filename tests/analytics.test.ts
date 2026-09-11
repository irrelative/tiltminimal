import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  createGameAnalytics,
  rulesVersionForTable,
  createAnalyticsSender,
} from '../src/app/analytics';
import worker, { type Env, validEvent, TABLE_IDS } from '../src/server/worker';
import { BUILT_IN_TABLES } from '../src/boards/table-library';

afterEach(() => vi.unstubAllGlobals());
describe('game analytics', () => {
  it('counts first plunge once, preserves a game across balls/locks, and finishes once', () => {
    const send = vi.fn();
    let time = 0;
    const tracker = createGameAnalytics(
      'classic-table',
      send,
      () => time,
      () => 'game',
    );
    const observe = (
      status: 'waiting-launch' | 'playing' | 'game-over',
      paused = false,
    ) => {
      time += 100;
      tracker.observe({ status, score: 3000 }, paused);
    };
    observe('waiting-launch');
    expect(send).not.toHaveBeenCalled();
    observe('playing');
    observe('playing');
    observe('waiting-launch');
    observe('playing');
    observe('playing', true);
    observe('game-over');
    observe('game-over');
    expect(send.mock.calls.map(([e]) => e.type)).toEqual(['start', 'finish']);
    expect(send.mock.calls[1][0]).toMatchObject({
      gameId: 'game',
      score: 3000,
      durationMs: 300,
    });
    observe('waiting-launch');
    observe('playing');
    expect(send.mock.calls.map(([e]) => e.type)).toEqual([
      'start',
      'finish',
      'start',
    ]);
  });
  it('excludes reset and debug games but allows a later new game', () => {
    const send = vi.fn(),
      tracker = createGameAnalytics(
        'classic-table',
        send,
        () => 0,
        () => 'game',
      );
    tracker.observe({ status: 'playing', score: 0 });
    tracker.exclude();
    tracker.exclude();
    tracker.observe({ status: 'waiting-launch', score: 0 });
    tracker.observe({ status: 'playing', score: 0 });
    tracker.observe({ status: 'game-over', score: 100 });
    expect(send.mock.calls.map(([e]) => e.type)).toEqual(['start', 'exclude']);
    tracker.observe({ status: 'waiting-launch', score: 0 });
    tracker.observe({ status: 'playing', score: 0 }, false, true);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('keeps play running if the browser cannot generate an analytics ID', () => {
    const send = vi.fn();
    const tracker = createGameAnalytics(
      'classic-table',
      send,
      () => 0,
      () => {
        throw new Error('unavailable');
      },
    );
    expect(() =>
      tracker.observe({ status: 'playing', score: 0 }),
    ).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it('does not send on development hosts when disabled', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    createAnalyticsSender(false)({ type: 'view', tableId: 'gallery' });
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('analytics API', () => {
  const env = () =>
    ({
      DB: { prepare: vi.fn() },
      EVENT_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
      ADMIN_TOKEN: 'x'.repeat(40),
    }) as unknown as Env;
  it('keeps the server table allowlist complete and validates event shapes', () => {
    expect([...TABLE_IDS].sort()).toEqual(
      BUILT_IN_TABLES.map((t) => t.id).sort(),
    );
    expect(validEvent({ type: 'view', tableId: 'gallery' })).toBe(true);
    expect(validEvent({ type: 'view', tableId: 'injected' })).toBe(false);
    expect(
      validEvent({
        type: 'finish',
        tableId: 'classic-table',
        gameId: crypto.randomUUID(),
        score: -1,
        durationMs: 100,
      }),
    ).toBe(false);
    expect(
      validEvent({
        type: 'start',
        tableId: 'classic-table',
        gameId: 'bad',
        version: '2026-09-10-skill-shot',
      }),
    ).toBe(false);
  });
  it('rejects untrusted origins, oversized bodies, and malformed JSON without database writes', async () => {
    const e = env();
    const request = (body: string, origin = 'https://tiltminimal.com') =>
      new Request('https://tiltminimal.com/api/events', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body,
      });
    expect(
      (await worker.fetch(request('{}', 'https://other.example'), e)).status,
    ).toBe(403);
    expect((await worker.fetch(request('x'.repeat(2050)), e)).status).toBe(413);
    expect((await worker.fetch(request('{'), e)).status).toBe(400);
    expect((await worker.fetch(request('null'), e)).status).toBe(400);
    expect(e.DB.prepare).not.toHaveBeenCalled();
  });
  it('protects statistics and enforces the request limiter', async () => {
    const e = env();
    expect(
      (await worker.fetch(new Request('https://tiltminimal.com/api/stats'), e))
        .status,
    ).toBe(401);
    e.EVENT_LIMITER.limit = vi.fn(async () => ({ success: false }));
    expect(
      (await worker.fetch(new Request('https://tiltminimal.com/api/stats'), e))
        .status,
    ).toBe(429);
    expect(e.DB.prepare).not.toHaveBeenCalled();
  });
});

it('versions the Switchyard redesign without changing other tables', () => {
  const send = vi.fn();
  createGameAnalytics(
    'switchyard',
    send,
    () => 0,
    () => crypto.randomUUID(),
  ).observe({ status: 'playing', score: 0 });
  const event = send.mock.calls[0][0];
  expect(event.version).toBe('2026-09-11-switchyard-asymmetry');
  expect(validEvent(event)).toBe(true);
  expect(validEvent({ ...event, version: '2026-09-10-skill-shot' })).toBe(
    false,
  );
  expect(rulesVersionForTable('just-one-more')).toBe('2026-09-10-skill-shot');
});
