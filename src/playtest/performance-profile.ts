import { scenarios } from './scenarios';
import { ReplayRecorder } from './recorder';
import { advanceGameFrame } from '../game/advance-game';
import { BUILT_IN_TABLES } from '../boards/table-library';
import { cloneBallState, createInitialGameState } from '../game/game-state';
import { stepGameFrame } from '../game/physics-engine';
import { idle } from './simulation';
import {
  getFlipperFaceNormal,
  getFlipperRadiusAt,
} from '../game/flipper-geometry';

/** Fixed inputs avoid measuring a different trajectory after an optimization. */
export const performanceWorkloads = BUILT_IN_TABLES.map(({ id, board }) => ({
  id,
  board,
  input: idle,
  states: Array.from({ length: 48 }, (_, i) => {
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.launcherExited = state.ball.launcherExited = true;
    state.ball.position = {
      x: board.width * (0.1 + (i % 8) * 0.11),
      y: board.height * (0.12 + Math.floor(i / 8) * 0.14),
    };
    state.ball.linearVelocity = { x: i % 2 ? 500 : -500, y: -900 };
    if (i % 3 === 0) {
      const ball = cloneBallState(state.ball);
      ball.position.x += 35;
      state.additionalBalls.push(ball);
    }
    return state;
  }),
}));

/** Contact-heavy fixed states include rolling faces and overlapping heel supports. */
export const heldFlipperPerformanceWorkloads = BUILT_IN_TABLES.map(
  ({ id, board }) => ({
    id,
    board,
    input: { ...idle, leftPressed: true, rightPressed: true },
    states: board.flippers.flatMap((flipper) => {
      const states = [0.12, 0.25, 0.5].map((t) => {
        const state = createInitialGameState(board);
        state.status = 'playing';
        state.launcherExited = true;
        state.flippers = board.flippers.map((f) => ({
          engaged: true,
          angle: f.activeAngle,
          angularVelocity: 0,
        }));
        const normal = getFlipperFaceNormal(flipper, flipper.activeAngle);
        const radius = getFlipperRadiusAt(flipper, t) + state.ball.radius - 0.1;
        state.ball.position = {
          x:
            flipper.x +
            Math.cos(flipper.activeAngle) * flipper.length * t +
            normal.x * radius,
          y:
            flipper.y +
            Math.sin(flipper.activeAngle) * flipper.length * t +
            normal.y * radius,
        };
        return state;
      });
      let settled = states[2];
      for (let frame = 0; frame < 240; frame++) {
        settled = stepGameFrame(
          settled,
          board,
          { ...idle, leftPressed: true, rightPressed: true },
          1 / 120,
        ).state;
      }
      return [...states, settled];
    }),
  }),
);

export const profilePhysics = (
  rounds = 40,
  workloads = performanceWorkloads,
) => {
  const results = [];
  let checksum = 0;
  for (const { id, board, states, input } of workloads) {
    const run = () => {
      const started = performance.now();
      for (let round = 0; round < rounds; round++) {
        for (const state of states) {
          const frame = stepGameFrame(state, board, input, 1 / 60);
          checksum += frame.state.ball.position.x + frame.events.length;
        }
      }
      return (performance.now() - started) / (rounds * states.length);
    };
    run(); // Warm the JIT and lazy caches before collecting seven batches.
    const samples = Array.from({ length: 7 }, run).sort((a, b) => a - b);
    results.push({ table: id, medianMs: samples[3], minMs: samples[0] });
  }
  return { results, checksum };
};

/** Paired deterministic 60-second games measure the always-on recorder separately. */
export const profileRecording = (rounds = 5) => {
  const samples: { plain: number; recorded: number; bytes: number }[] = [];
  for (let round = -1; round < rounds; round++) {
    let plain = 0,
      recorded = 0,
      bytes = 0;
    for (const table of BUILT_IN_TABLES) {
      for (const recording of round % 2 ? [true, false] : [false, true]) {
        const scenario = scenarios(table, 1979, false, 1).next().value!;
        let state = scenario.initialState;
        const recorder = new ReplayRecorder(table.board, state);
        const started = performance.now();
        for (let frame = 0; frame < 3600; frame++) {
          const input = scenario.controller(state, frame);
          const next = advanceGameFrame(state, table.board, input, 1 / 60);
          if (recording)
            recorder.record(state, next.state, input, 1 / 60, next.events);
          state = next.state;
        }
        const elapsed = performance.now() - started;
        if (recording) {
          recorded += elapsed;
          bytes = Math.max(
            bytes,
            JSON.stringify(recorder.export(table.id, 'profile')).length,
          );
        } else plain += elapsed;
      }
    }
    if (round >= 0) samples.push({ plain, recorded, bytes });
  }
  const median = (values: number[]) =>
    values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const frames = BUILT_IN_TABLES.length * 3600;
  const plain = median(samples.map((s) => s.plain)) / frames;
  const recorded = median(samples.map((s) => s.recorded)) / frames;
  return {
    rounds,
    framesPerRound: frames,
    plainMsPerFrame: plain,
    recordedMsPerFrame: recorded,
    overheadMsPerFrame: recorded - plain,
    maxExportBytes: Math.max(...samples.map((s) => s.bytes)),
  };
};
