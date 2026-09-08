import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../src/game/game-state';
import { initializeRulesState } from '../src/game/rules-engine';
import { createBlankTable } from './helpers/board-fixture';
import {
  createClassicController,
  runClassicPlaytest,
  formatClassicReport,
} from '../src/playtest/classic-playtest';
import { idle, replay, simulate } from '../src/playtest/simulation';
import { classicTable } from '../src/boards/tables/classic-table';
import { getPhysicsSandboxSpawnBlockedReason } from '../src/game/physics-sandbox';

describe('focused Classic playtest', () => {
  it('replays serialized inputs with the actual rules and physics', () => {
    const initial = initializeRulesState(
      createInitialGameState(classicTable),
      classicTable,
    );
    const first = simulate(
      classicTable,
      initial,
      'seeded',
      createClassicController(1979),
      12,
      false,
    );
    const repeated = simulate(
      classicTable,
      initial,
      'seeded',
      createClassicController(1979),
      12,
      false,
    );
    expect(first).toEqual(repeated);
    expect(first.inputs.length).toBeGreaterThan(2);
    const serialized = JSON.parse(JSON.stringify(first));
    expect(replay(classicTable, serialized)).toEqual(first.finalState);
    expect(first.initialState).toEqual(initial);
  });
  it('detects unexplained stationary balls', () => {
    const board = createBlankTable();
    board.gravity = 0;
    const initial = createInitialGameState(board);
    initial.status = 'playing';
    initial.launcherExited = true;
    initial.ball.position = { x: 400, y: 700 };
    const run = simulate(board, initial, 'stuck', () => idle, 3.1, true);
    expect(run.flags).toContain(
      'Unexplained near-rest lasted at least 3 seconds',
    );
    expect(run.outcome).toBe('timeout');
  });
  it('records a pre-drain location rather than the reset launch position', () => {
    const board = createBlankTable(),
      initial = createInitialGameState(board);
    initial.status = 'playing';
    initial.launcherExited = true;
    initial.ball.position = {
      x: 400,
      y: board.height + initial.ball.radius - 1,
    };
    initial.ball.linearVelocity = { x: 0, y: 200 };
    const run = simulate(board, initial, 'drain', () => idle, 1, true);
    expect(run.outcome).toBe('drained');
    expect(run.drains[0].x).toBe(400);
    expect(replay(board, JSON.parse(JSON.stringify(run)))).toEqual(
      run.finalState,
    );
  });
  it('sweeps both flippers with clear feeds and produces a usable timing table', () => {
    const report = runClassicPlaytest(1, 1979, 1);
    expect(report.runs).toHaveLength(53);
    for (const shot of report.runs.slice(0, 52))
      expect(
        getPhysicsSandboxSpawnBlockedReason(
          classicTable,
          shot.initialState.ball.position,
          shot.initialState,
        ),
      ).toBeNull();
    expect(report.runs.some((r) => r.firstUpfieldX !== null)).toBe(true);
    expect(formatClassicReport(report)).toContain('| Outcome |\n| ---');
  });
});
