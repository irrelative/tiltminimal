import { expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import {
  tacticCases,
  runTacticCase,
  tacticFailures,
} from '../src/playtest/tactics';
import {
  parseArtifact,
  replayArtifact,
  stateHash,
} from '../src/playtest/artifact';
import { isRollingHeelTransfer } from '../src/game/flipper-feed-contact';

const classic = BUILT_IN_TABLES.find((t) => t.id === 'classic-table')!;
const recipes = tacticCases().filter((c) => c.tactic === 'inlane-feed');
it.each(recipes)(
  'Classic $id crosses its heel without an unpowered launch',
  (recipe) => {
    const result = runTacticCase(classic, recipe, 'test');
    expect(result.errors).toEqual([]);
    expect(result.metrics.feedUpwardSpeed).toBe(0);
    expect(result.metrics.feedReachedTip).toBe(true);
  },
);
it('rejects a feed that launches, misses its own bat, or reaches the receiver too early', () => {
  const recipe = recipes[0];
  const { metrics } = runTacticCase(classic, recipe, 'test');
  for (const change of [
    { feedUpwardSpeed: 465 },
    { firstContactFrame: -1 },
    { feedReachedTip: false },
    { receiverBeforeEntry: true },
  ])
    expect(tacticFailures(recipe, { ...metrics, ...change })).not.toEqual([]);
});
it.each([60, 120, 240])(
  'replays a %i Hz feed exactly using its recorded frame durations',
  (hz) => {
    const recipe = recipes.find((r) => r.hz === hz)!;
    const result = runTacticCase(classic, recipe, 'test');
    const imported = parseArtifact(JSON.stringify(result.artifact));
    expect(stateHash(replayArtifact(imported))).toBe(result.artifact.finalHash);
    expect(result.summary.seconds).toBeCloseTo(result.summary.frames / hz);
  },
);
it('only joins inward rolling approaches to a physical, covered heel wire', () => {
  const board = classic.board,
    f = board.flippers[0];
  const position = { x: f.x - 1, y: f.y - 32 },
    velocity = { x: 828, y: 396 };
  expect(isRollingHeelTransfer(board, f, position, velocity)).toBe(true);
  expect(isRollingHeelTransfer(board, f, position, { x: 0, y: 900 })).toBe(
    false,
  );
  expect(isRollingHeelTransfer(board, f, position, { x: -828, y: 396 })).toBe(
    false,
  );
  expect(isRollingHeelTransfer(board, f, position, { x: 828, y: -396 })).toBe(
    false,
  );
  expect(
    isRollingHeelTransfer(board, f, { x: f.x + 80, y: f.y }, velocity),
  ).toBe(false);
  const raised = structuredClone(board);
  raised.guides.forEach((g) => (g.plane = 'raised'));
  expect(isRollingHeelTransfer(raised, f, position, velocity)).toBe(false);
});

it.each([0, 1])(
  'Classic full inlane %i keeps a fast unpowered arrival descending',
  async (source) => {
    const { createInitialGameState } = await import('../src/game/game-state');
    const { advanceGameFrame } = await import('../src/game/advance-game');
    const { sampleFlipperProfile } =
      await import('../src/game/flipper-geometry');
    const { idle } = await import('../src/playtest/simulation');
    const board = classic.board,
      f = board.flippers[source];
    const route = board.routes!.find((r) =>
      r.id.endsWith(`/inlane-${source}`),
    )!;
    if (route.start.type !== 'feed') throw new Error('Expected feed route');
    for (const hz of [30, 60, 120, 240]) {
      let state = createInitialGameState(board),
        enteredHeel = false,
        reachedTip = false;
      state.status = 'playing';
      state.launcherExited = true;
      state.ball.position = { ...route.start.position };
      state.ball.linearVelocity = { x: 0, y: 500 };
      for (let frame = 0; frame < hz * 2; frame++) {
        state = advanceGameFrame(state, board, idle, 1 / hz).state;
        const p = sampleFlipperProfile(
          state.ball.position,
          f,
          state.flippers[source].angle,
        );
        enteredHeel ||=
          Math.abs(state.ball.position.x - f.x) < state.ball.radius * 2 &&
          Math.abs(state.ball.position.y - f.y) < state.ball.radius * 3;
        if (enteredHeel) {
          expect(state.ball.linearVelocity.y).toBeGreaterThan(-40);
          if (p.t >= 0.9) {
            reachedTip = true;
            break;
          }
        }
        if (state.status !== 'playing') break;
      }
      expect(enteredHeel, `${hz} Hz must reach its own heel approach`).toBe(
        true,
      );
      expect(reachedTip, `${hz} Hz must clear its own heel`).toBe(true);
    }
  },
);
