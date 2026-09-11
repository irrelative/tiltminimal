import type { GameState } from '../game/game-state';

// Change this when scoring rules change, so unlike scores can be separated.
export const RULES_VERSION = '2026-09-10-skill-shot';
export const rulesVersionForTable = (tableId: string): string =>
  tableId === 'switchyard' ? '2026-09-11-switchyard-asymmetry' : RULES_VERSION;
const productionHosts = new Set(['tiltminimal.com', 'www.tiltminimal.com']);
export const analyticsEnabled = (): boolean =>
  productionHosts.has(window.location.hostname);

export type AnalyticsEvent =
  | { type: 'view'; tableId: string }
  | { type: 'start'; tableId: string; gameId: string; version: string }
  | {
      type: 'finish';
      tableId: string;
      gameId: string;
      score: number;
      durationMs: number;
    }
  | { type: 'exclude'; tableId: string; gameId: string };

/** Serial delivery prevents a quick finish from overtaking its start. Never blocks play. */
export function createAnalyticsSender(enabled = analyticsEnabled()) {
  let queue = Promise.resolve();
  return (event: AnalyticsEvent): void => {
    if (!enabled) return;
    queue = queue
      .then(async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event),
              keepalive: true,
              signal: AbortSignal.timeout(5000),
            });
            if (response.ok || response.status < 500) return;
          } catch {
            /* A brief retry is enough; analytics must not stall the game. */
          }
        }
      })
      .catch(() => {});
  };
}

export function createGameAnalytics(
  tableId: string,
  send: (event: AnalyticsEvent) => void = createAnalyticsSender(),
  now: () => number = () => performance.now(),
  newId: () => string = () => crypto.randomUUID(),
) {
  let gameId: string | undefined,
    invalid = false,
    finished = false;
  let lastStatus = 'waiting-launch',
    lastTime = now(),
    activeMs = 0;
  const exclude = () => {
    if (!invalid && gameId && !finished)
      send({ type: 'exclude', tableId, gameId });
    invalid = true;
  };
  return {
    exclude,
    observe(
      state: Pick<GameState, 'status' | 'score'>,
      paused = false,
      debug = false,
    ) {
      const time = now(),
        elapsed = Math.max(0, Math.min(250, time - lastTime));
      lastTime = time;
      if (lastStatus === 'game-over' && state.status !== 'game-over') {
        gameId = undefined;
        invalid = false;
        finished = false;
        activeMs = 0;
      }
      if (debug) exclude();
      if (!invalid && !gameId && state.status === 'playing') {
        try {
          gameId = newId();
        } catch {
          invalid = true;
          lastStatus = state.status;
          return;
        }
        send({
          type: 'start',
          tableId,
          gameId,
          version: rulesVersionForTable(tableId),
        });
      }
      if (gameId && !paused && lastStatus === 'playing') activeMs += elapsed;
      if (gameId && !invalid && !finished && state.status === 'game-over') {
        finished = true;
        send({
          type: 'finish',
          tableId,
          gameId,
          score: state.score,
          durationMs: Math.round(activeMs),
        });
      }
      lastStatus = state.status;
    },
  };
}
