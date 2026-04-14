import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import {
  createPhysicsSandboxState,
  setPhysicsSandboxAngularVelocity,
  setPhysicsSandboxLinearVelocity,
  setPhysicsSandboxSpawnMode,
  spawnPhysicsSandboxBall,
  stepPhysicsSandbox,
} from '../src/game/physics-sandbox';
import type { InputState } from '../src/input/keyboard-input';

const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
  nudgeLeftPressed: false,
  nudgeRightPressed: false,
  nudgeUpPressed: false,
};

describe('physics sandbox', () => {
  it('spawns a valid ball with the configured linear and angular velocity', () => {
    const board = createBlankTable('Sandbox');
    let state = createPhysicsSandboxState(board);

    state = setPhysicsSandboxLinearVelocity(state, 'x', 140);
    state = setPhysicsSandboxLinearVelocity(state, 'y', -320);
    state = setPhysicsSandboxAngularVelocity(state, 'x', 1.5);
    state = setPhysicsSandboxAngularVelocity(state, 'y', -0.75);

    const result = spawnPhysicsSandboxBall(state, board, {
      x: 120,
      y: 120,
    });

    expect(result.spawned).toBe(true);
    expect(result.state.balls).toHaveLength(1);
    expect(result.state.balls[0]?.state.ball.linearVelocity).toEqual({
      x: 140,
      y: -320,
    });
    expect(result.state.balls[0]?.state.ball.angularVelocity).toEqual({
      x: 1.5,
      y: -0.75,
    });
  });

  it('replace mode removes existing balls before spawning', () => {
    const board = createBlankTable('Sandbox');
    let state = createPhysicsSandboxState(board);

    state = setPhysicsSandboxSpawnMode(state, 'add');
    state = spawnPhysicsSandboxBall(state, board, { x: 120, y: 120 }).state;
    state = spawnPhysicsSandboxBall(state, board, { x: 220, y: 120 }).state;
    state = setPhysicsSandboxSpawnMode(state, 'replace');

    const result = spawnPhysicsSandboxBall(state, board, {
      x: 320,
      y: 120,
    });

    expect(result.spawned).toBe(true);
    expect(result.state.balls).toHaveLength(1);
    expect(result.state.balls[0]?.state.ball.position).toEqual({
      x: 320,
      y: 120,
    });
  });

  it('add mode preserves existing balls and appends another', () => {
    const board = createBlankTable('Sandbox');
    let state = createPhysicsSandboxState(board);

    state = setPhysicsSandboxSpawnMode(state, 'add');
    state = spawnPhysicsSandboxBall(state, board, { x: 120, y: 120 }).state;

    const result = spawnPhysicsSandboxBall(state, board, {
      x: 220,
      y: 120,
    });

    expect(result.spawned).toBe(true);
    expect(result.state.balls).toHaveLength(2);
    expect(result.state.balls[0]?.state.ball.position).toEqual({
      x: 120,
      y: 120,
    });
    expect(result.state.balls[1]?.state.ball.position).toEqual({
      x: 220,
      y: 120,
    });
  });

  it('rejects blocked spawn clicks', () => {
    const board = createBlankTable('Sandbox');
    const state = createPhysicsSandboxState(board);
    const result = spawnPhysicsSandboxBall(state, board, board.launchPosition);

    expect(result.spawned).toBe(false);
    expect(result.state.balls).toHaveLength(0);
    expect(result.state.statusMessage).toContain('Spawn blocked');
  });

  it('removes drained balls without resetting the sandbox', () => {
    const board = createBlankTable('Sandbox');
    let state = createPhysicsSandboxState(board);

    state = setPhysicsSandboxLinearVelocity(state, 'y', 1400);
    state = spawnPhysicsSandboxBall(state, board, {
      x: 120,
      y: board.height - 20,
    }).state;

    state = stepPhysicsSandbox(state, board, idleInput, 0.3);

    expect(state.balls).toHaveLength(0);
    expect(state.displayState.status).toBe('playing');
    expect(state.selectedBallId).toBeNull();
  });

  it('keeps flippers interactive for sandbox balls', () => {
    const board = createBlankTable('Sandbox');
    let state = createPhysicsSandboxState(board);

    state = spawnPhysicsSandboxBall(state, board, {
      x: 360,
      y: 1210,
    }).state;

    for (let index = 0; index < 18; index += 1) {
      state = stepPhysicsSandbox(
        state,
        board,
        {
          ...idleInput,
          leftPressed: true,
        },
        1 / 60,
      );
    }

    expect(state.displayState.flippers[0]?.angle).toBeLessThan(
      board.flippers[0]?.restingAngle ?? 0,
    );
    expect(
      Math.hypot(
        state.balls[0]?.state.ball.linearVelocity.x ?? 0,
        state.balls[0]?.state.ball.linearVelocity.y ?? 0,
      ),
    ).toBeGreaterThan(0);
  });

  it('keeps nudges interactive for sandbox balls', () => {
    const board = createBlankTable('Sandbox');
    let state = createPhysicsSandboxState(board);

    state = spawnPhysicsSandboxBall(state, board, {
      x: board.ball.radius + 2,
      y: 420,
    }).state;

    state = stepPhysicsSandbox(
      state,
      board,
      {
        ...idleInput,
        nudgeLeftPressed: true,
      },
      1 / 60,
    );

    expect(state.displayState.tableNudge.offset.x).toBeGreaterThan(0);
    expect(state.balls[0]?.state.ball.linearVelocity.x ?? 0).toBeGreaterThan(0);
  });
});
