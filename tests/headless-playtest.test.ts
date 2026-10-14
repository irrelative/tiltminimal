import { describe, expect, it } from 'vitest';
import { createInitialGameState, cloneBallState } from '../src/game/game-state';
import { advanceGameFrame } from '../src/game/advance-game';
import { PhysicsDebug } from '../src/game/physics-debug';
import { classicTable } from '../src/boards/tables/classic-table';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { cloneBoardDefinition } from '../src/boards/board-codec';
import {
  copyState,
  parseArtifact,
  replayArtifact,
  stateHash,
} from '../src/playtest/artifact';
import { IssueDetector } from '../src/playtest/detectors';
import {
  diagnoseFinding,
  investigateScenario,
} from '../src/playtest/investigation';
import { ReplayRecorder } from '../src/playtest/recorder';
import { scenarios } from '../src/playtest/scenarios';
import { idle } from '../src/playtest/simulation';
import { createBlankTable } from './helpers/board-fixture';
import { createPostPassCradle } from './helpers/post-pass';

describe('headless investigations', () => {
  it('replays serialized variable frame timings with physics and rules unchanged', () => {
    const table = BUILT_IN_TABLES.find((t) => t.id === 'classic-table')!;
    const scenario = [...scenarios(table, 1979, false, 1)][0];
    scenario.seconds = 4;
    const run = investigateScenario(table, scenario, 'test', 1 / 60, (f) =>
      f % 2 ? 1 / 40 : 1 / 120,
    );
    const artifact = parseArtifact(JSON.stringify(run.artifact));
    expect(stateHash(replayArtifact(artifact))).toBe(artifact.finalHash);
    const repeated = investigateScenario(
      table,
      {
        ...scenario,
        controller: [...scenarios(table, 1979, false, 1)][0].controller,
      },
      'test',
      1 / 60,
      (f) => (f % 2 ? 1 / 40 : 1 / 120),
    );
    expect(repeated.artifact).toEqual(run.artifact);
    const debug = new PhysicsDebug();
    debug.enabled = true;
    expect(
      stateHash(
        replayArtifact(
          artifact,
          artifact.board,
          artifact.frameDurations.length,
          debug,
        ),
      ),
    ).toBe(artifact.finalHash);
  });
  it('does not mutate the scenario initial state', () => {
    const table = { id: 'fixture', board: createBlankTable() };
    const initialState = createInitialGameState(table.board),
      before = copyState(initialState);
    investigateScenario(
      table,
      {
        id: 'test',
        seed: 1,
        initialState,
        seconds: 2,
        controller: () => idle,
        suite: 'game',
      },
      'test',
    );
    expect(initialState).toEqual(before);
  });
  it('monitors a stuck secondary ball while another ball is captured', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    state.ball.capturedSaucer = 0;
    state.saucers[0].occupied = true;
    state.saucers[0].holdSecondsRemaining = 3;
    const second = cloneBallState(state.ball);
    second.id = 1;
    delete second.capturedSaucer;
    second.position = { x: 450, y: 700 };
    state.additionalBalls = [second];
    const detector = new IssueDetector();
    let findings = [];
    for (let frame = 0; frame < 23; frame++)
      findings = detector.observe(state, classicTable, idle, 0.1, frame);
    // The episode emits once, not every frame; use a fresh observer for collection.
    const collecting = new IssueDetector();
    const all = [];
    for (let frame = 0; frame < 23; frame++)
      all.push(...collecting.observe(state, classicTable, idle, 0.1, frame));
    expect(all.map((f) => f.ballId)).toEqual([1]);
    expect(findings.length).toBeLessThanOrEqual(1);
  });
  it('rejects nonfinite angular dynamics, not only linear speed', () => {
    const state = createInitialGameState(classicTable);
    state.ball.angularVelocity.y = NaN;
    expect(
      new IssueDetector().observe(state, classicTable, idle, 1 / 60, 0)[0],
    ).toMatchObject({ code: 'non-finite', confirmed: true });
  });
  it('does not flag waiting to launch or a valid held cradle after a release probe', () => {
    const detector = new IssueDetector();
    const waiting = createInitialGameState(classicTable);
    for (let frame = 0; frame < 30; frame++)
      expect(detector.observe(waiting, classicTable, idle, 0.1, frame)).toEqual(
        [],
      );
    const state = createPostPassCradle(classicTable, 0),
      held = { ...idle, leftPressed: true };
    const observation = new IssueDetector();
    const findings = [];
    for (let frame = 0; frame < 23; frame++)
      findings.push(
        ...observation.observe(state, classicTable, held, 0.1, frame),
      );
    expect(findings.length).toBeGreaterThan(0);
    expect(
      diagnoseFinding(
        findings[0],
        state,
        { id: 'classic-table', board: classicTable },
        held,
      ),
    ).toBeUndefined();
  });
  it('clears histories when ball IDs are reused after a drain', () => {
    const detector = new IssueDetector(),
      state = createInitialGameState(classicTable);
    state.status = 'playing';
    state.ball.position = { x: 450, y: 700 };
    for (let frame = 0; frame < 19; frame++)
      detector.observe(state, classicTable, idle, 0.1, frame);
    expect(
      detector.observe(state, classicTable, idle, 0.1, 20, [
        { type: 'ball-drained', tick: 20 },
      ]),
    ).toEqual([]);
  });
  it('separates motion and progress from local livelock', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    state.ball.linearVelocity.x = 20;
    const detector = new IssueDetector(),
      findings = [];
    for (let frame = 0; frame < 75; frame++) {
      state.ball.position = { x: 450 + Math.sin(frame) * 10, y: 700 };
      findings.push(...detector.observe(state, classicTable, idle, 0.1, frame));
    }
    expect(
      findings.some((f) => f.code === 'bounded-livelock' && !f.confirmed),
    ).toBe(true);
  });
  it('generates reproducible board-aware recipes and rejects overlapping spawns', () => {
    const table = BUILT_IN_TABLES.find((t) => t.id === 'classic-table')!;
    const cases = [...scenarios(table, 1979, false, 0)];
    expect(cases).toHaveLength(384);
    expect(cases.some((s) => s.skip)).toBe(true);
    expect(cases.some((s) => !s.skip)).toBe(true);
    expect(cases.map((s) => s.initialState)).toEqual(
      [...scenarios(table, 1979, false, 0)].map((s) => s.initialState),
    );
  });
  it('rejects malformed transition logs and oversized replays', () => {
    const table = { id: 'fixture', board: createBlankTable() };
    const a = investigateScenario(
      table,
      {
        id: 'test',
        seed: 1,
        initialState: createInitialGameState(table.board),
        seconds: 0.1,
        controller: () => idle,
        suite: 'game',
      },
      'test',
    ).artifact;
    expect(() => parseArtifact(JSON.stringify({ ...a, inputs: [] }))).toThrow();
    expect(() =>
      parseArtifact(JSON.stringify({ ...a, frameDurations: [0] })),
    ).toThrow();
    expect(() =>
      parseArtifact(
        JSON.stringify({
          ...a,
          initialState: {
            ...a.initialState,
            ball: { ...a.initialState.ball, mass: null },
          },
        }),
      ),
    ).toThrow();
  });
});

describe('game replay recorder', () => {
  it('replays actual timings, input changes and checkpoint rollover exactly', () => {
    const board = createBlankTable();
    let state = createInitialGameState(board);
    const recorder = new ReplayRecorder(board, state);
    for (let frame = 0; frame < 2500; frame++) {
      const dt = frame % 2 ? 1 / 40 : 1 / 120,
        before = state;
      const next = advanceGameFrame(state, board, idle, dt);
      state = next.state;
      recorder.record(before, state, idle, dt, next.events);
    }
    const artifact = parseArtifact(
      JSON.stringify(recorder.export('fixture', 'test')),
    );
    expect(artifact.frameDurations.reduce((a, b) => a + b, 0)).toBeLessThan(
      32.1,
    );
    expect(stateHash(replayArtifact(artifact))).toBe(artifact.finalHash);
    expect(JSON.stringify(artifact).length).toBeLessThan(1_000_000);
  });
  it('starts a fresh exact segment after a canceled plunger pull', () => {
    const board = createBlankTable();
    let state = createInitialGameState(board);
    const recorder = new ReplayRecorder(board, state);
    const before = state;
    state = advanceGameFrame(
      state,
      board,
      { ...idle, launchPressed: true },
      0.1,
    ).state;
    recorder.record(before, state, { ...idle, launchPressed: true }, 0.1, []);
    state.plunger.pullback = 0;
    recorder.reset(state, true);
    const resume = state;
    state = advanceGameFrame(state, board, idle, 1 / 60).state;
    recorder.record(resume, state, idle, 1 / 60, []);
    const a = recorder.export('fixture', 'test');
    expect(a.frameDurations).toHaveLength(1);
    expect(stateHash(replayArtifact(a))).toBe(a.finalHash);
  });
  it('preserves a suspected issue without allowing later reset to mutate it', () => {
    const board = cloneBoardDefinition(classicTable);
    board.gravity = 0;
    let state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position = { x: 450, y: 700 };
    const recorder = new ReplayRecorder(board, state);
    for (let frame = 0; frame < 300; frame++) {
      const before = state;
      const next = advanceGameFrame(state, board, idle, 1 / 60);
      state = next.state;
      recorder.record(before, state, idle, 1 / 60, next.events);
    }
    expect(recorder.hasIssue).toBe(true);
    const a = recorder.export('classic-table', 'test', true);
    recorder.reset(createInitialGameState(board), true);
    expect(recorder.export('classic-table', 'test', true)).toEqual(a);
    expect(stateHash(replayArtifact(a))).toBe(a.finalHash);
  });
});
