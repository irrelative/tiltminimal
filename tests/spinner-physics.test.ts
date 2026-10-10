import { expect, it } from 'vitest';
import {
  advanceSpinners,
  resolveSpinnerInteractions,
} from '../src/game/spinner-physics';
import { createInitialGameState, cloneBallState } from '../src/game/game-state';
import { createBlankTable } from './helpers/board-fixture';
import { justOneMoreTable } from '../src/boards/tables/just-one-more';
import { switchyardTable } from '../src/boards/tables/switchyard';
import { cloneBoardDefinition } from '../src/boards/board-codec';
import {
  initializeRulesState,
  applyRulesFrame,
} from '../src/game/rules-engine';
import { stepGameFrame } from '../src/game/physics-engine';
import type { GameEvent } from '../src/game/rules-types';
import {
  createPhysicsSandboxState,
  spawnPhysicsSandboxBall,
  setPhysicsSandboxSpawnMode,
  stepPhysicsSandbox,
} from '../src/game/physics-sandbox';
import { idleInput } from './helpers/game-fixture';

const fixture = (speed = 900) => {
  const board = createBlankTable('Spinner');
  board.gravity = 0;
  board.spinners = [
    {
      x: 450,
      y: 400,
      length: 100,
      thickness: 10,
      angle: 0,
      score: 100,
      material: 'metalGuide',
    },
  ];
  const state = createInitialGameState(board);
  state.status = 'playing';
  state.ball.position = { x: 450, y: 392 };
  state.ball.linearVelocity = { x: 0, y: speed };
  return { board, state };
};

it('adds momentum once per ball passage, irrespective of rotor phase or elapsed cooldown', () => {
  const { board, state } = fixture();
  resolveSpinnerInteractions(state, board, board.physics.solver);
  expect(state.spinners[0].angularVelocity).toBe(90);
  state.spinners[0].angle = Math.PI / 2;
  for (let i = 0; i < 100; i++)
    resolveSpinnerInteractions(state, board, board.physics.solver);
  expect(state.spinners[0].angularVelocity).toBe(90);
  state.ball.position.y = 350;
  resolveSpinnerInteractions(state, board, board.physics.solver);
  state.ball.position.y = 392;
  resolveSpinnerInteractions(state, board, board.physics.solver);
  expect(state.spinners[0].angularVelocity).toBe(120); // Total speed is bounded.
});

it('allows simultaneous balls to drive a spinner independently and clones their contacts', () => {
  const { board, state } = fixture(300);
  resolveSpinnerInteractions(state, board, board.physics.solver);
  const first = state.ball;
  const cloned = cloneBallState(first);
  cloned.spinnerContacts![0] = false;
  expect(first.spinnerContacts![0]).toBe(true);
  state.ball = createInitialGameState(board).ball;
  state.ball.id = 2;
  state.ball.position = { x: 450, y: 392 };
  state.ball.linearVelocity = { x: 0, y: 300 };
  resolveSpinnerInteractions(state, board, board.physics.solver);
  expect(state.spinners[0].angularVelocity).toBe(60);
  expect(state.spinners[0].drivingBallId).toBe(2);
});

it('ignores slow contact and tangential grazes, and permits reverse-direction spins', () => {
  const { board, state } = fixture(40);
  resolveSpinnerInteractions(state, board, board.physics.solver);
  expect(state.spinners[0].angularVelocity).toBe(0);
  state.ball.spinnerContacts = [];
  state.ball.linearVelocity = { x: 1000, y: 0 };
  resolveSpinnerInteractions(state, board, board.physics.solver);
  expect(state.spinners[0].angularVelocity).toBe(0);
  state.ball.spinnerContacts = [];
  state.ball.linearVelocity = { x: 0, y: -900 };
  resolveSpinnerInteractions(state, board, board.physics.solver);
  const events: GameEvent[] = [];
  advanceSpinners(state, board, 1, events);
  expect(events.filter((e) => e.type === 'spinner-spin')).toHaveLength(6);
  expect(state.spinners[0].angle).toBeLessThan(0);
});

const coast = (speed: number, frameSeconds: number) => {
  const { board, state } = fixture(speed);
  resolveSpinnerInteractions(state, board, board.physics.solver);
  const events: GameEvent[] = [];
  for (let i = 0; i < Math.round(4 / frameSeconds); i++)
    advanceSpinners(state, board, frameSeconds, events);
  return { state, events };
};

it('makes harder shots score more turns, with scoring continuing after the ball leaves', () => {
  expect(coast(300, 1 / 120).events).toHaveLength(2);
  const hard = coast(900, 1 / 120);
  expect(hard.events).toHaveLength(7);
  expect(
    hard.events.every((e) => e.type === 'spinner-spin' && e.score === 100),
  ).toBe(true);
  expect(hard.state.spinners[0].angularVelocity).toBeGreaterThan(0);
});

it('preserves turn counts and rotation across different frame sizes', () => {
  const reference = coast(900, 1 / 120);
  for (const dt of [1 / 30, 1 / 60, 1 / 240]) {
    const result = coast(900, dt);
    expect(result.events).toHaveLength(reference.events.length);
    expect(result.state.spinners[0].angularVelocity).toBeCloseTo(
      reference.state.spinners[0].angularVelocity,
      10,
    );
    expect(result.state.spinners[0].rotationProgress).toBeCloseTo(
      reference.state.spinners[0].rotationProgress,
      10,
    );
  }
});

it('requires a complete signed revolution, rather than scoring partial reverse oscillations', () => {
  const { board, state } = fixture();
  board.spinners[0].damping = 0;
  const rotor = state.spinners[0];
  const events: GameEvent[] = [];
  for (let i = 0; i < 10; i++) {
    rotor.angularVelocity = 4;
    advanceSpinners(state, board, 1, events);
    rotor.angularVelocity = -4;
    advanceSpinners(state, board, 1, events);
  }
  expect(events).toHaveLength(0);
  rotor.angularVelocity = Math.PI * 6;
  advanceSpinners(state, board, 1, events);
  expect(events).toHaveLength(3);
});

it('gives Just One More freer bearings without changing Switchyard tuning or distinct-spinner qualification', () => {
  expect(justOneMoreTable.spinners[0].damping).toBe(1.4);
  expect(switchyardTable.spinners[0].damping).toBeUndefined();
  const board = cloneBoardDefinition(justOneMoreTable);
  board.gravity = 0;
  let state = initializeRulesState(createInitialGameState(board), board);
  state.status = 'playing';
  state.launcherExited = true;
  const spinner = board.spinners[0];
  state.ball.position = { x: spinner.x, y: spinner.y - 8 };
  state.ball.linearVelocity = { x: 0, y: -900 };
  resolveSpinnerInteractions(state, board, board.physics.solver);
  state.ball.position = { x: 450, y: 1000 };
  state.ball.linearVelocity = { x: 0, y: 0 };
  let pulses = 0;
  for (let i = 0; i < 480; i++) {
    const frame = stepGameFrame(state, board, idleInput, 1 / 120);
    pulses += frame.events.filter((e) => e.type === 'spinner-spin').length;
    state = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
  }
  expect(pulses).toBe(16);
  expect(state.score).toBe(pulses * 100);
  expect(state.rules.playerValues.play).toBe(1);
  expect(state.rules.ballValues.play).toBe(1);
});

it('advances a sandbox rotor once per frame regardless of the number of injected balls', () => {
  const { board } = fixture();
  const outcomes = [0, 1, 2].map((count) => {
    let sandbox = setPhysicsSandboxSpawnMode(
      createPhysicsSandboxState(board),
      'add',
    );
    for (let i = 0; i < count; i++)
      sandbox = spawnPhysicsSandboxBall(sandbox, board, {
        x: 650 + i * 100,
        y: 800,
      }).state;
    sandbox.displayState.spinners[0].angularVelocity = 90;
    sandbox = stepPhysicsSandbox(sandbox, board, idleInput, 1 / 30);
    return sandbox.displayState.spinners[0];
  });
  expect(outcomes[1]).toEqual(outcomes[0]);
  expect(outcomes[2]).toEqual(outcomes[0]);
});
