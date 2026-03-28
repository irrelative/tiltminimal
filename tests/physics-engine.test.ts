import { describe, expect, it } from 'vitest';

import { classicTable } from '../src/boards/classic-table';
import type { InputState } from '../src/input/keyboard-input';
import { createInitialGameState } from '../src/game/game-state';
import { stepGame } from '../src/game/physics-engine';
import type { FlipperDefinition } from '../src/types/board-definition';

const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
};

describe('stepGame', () => {
  it('keeps the ball locked in the launcher while space is held', () => {
    const state = createInitialGameState(classicTable);

    const next = stepGame(
      state,
      classicTable,
      { ...idleInput, launchPressed: true },
      0.5,
    );

    expect(next.status).toBe('waiting-launch');
    expect(next.launcher.chargeSeconds).toBeGreaterThan(0);
    expect(next.ball.position.x).toBe(classicTable.launchPosition.x);
    expect(next.ball.position.y).toBe(classicTable.launchPosition.y);
    expect(next.ball.position.z).toBe(classicTable.ball.radius);
    expect(next.ball.linearVelocity.x).toBe(0);
    expect(next.ball.linearVelocity.y).toBe(0);
  });

  it('launches the ball harder after a longer charge', () => {
    let shortCharge = createInitialGameState(classicTable);
    shortCharge = stepGame(
      shortCharge,
      classicTable,
      { ...idleInput, launchPressed: true },
      0.2,
    );
    const shortLaunch = stepGame(shortCharge, classicTable, idleInput, 1 / 60);

    let longCharge = createInitialGameState(classicTable);
    longCharge = stepGame(
      longCharge,
      classicTable,
      { ...idleInput, launchPressed: true },
      1.2,
    );
    const longLaunch = stepGame(longCharge, classicTable, idleInput, 1 / 60);

    expect(shortLaunch.status).toBe('playing');
    expect(longLaunch.status).toBe('playing');
    expect(Math.abs(longLaunch.ball.linearVelocity.y)).toBeGreaterThan(
      Math.abs(shortLaunch.ball.linearVelocity.y),
    );
    expect(Math.abs(longLaunch.ball.linearVelocity.x)).toBeGreaterThan(
      Math.abs(shortLaunch.ball.linearVelocity.x),
    );
  });

  it('bounces the ball off a resting flipper on contact', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    placeBallOnFlipperSurface(state, classicTable.flippers.left, 0.58);
    state.ball.linearVelocity.x = 10;
    state.ball.linearVelocity.y = 180;

    const next = stepGame(state, classicTable, idleInput, 1 / 60);

    expect(next.ball.position.y).toBeLessThan(state.ball.position.y);
    expect(next.ball.linearVelocity.y).toBeLessThan(180);
  });

  it('collides against the rounded flipper tip', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    placeBallOnFlipperTip(state, classicTable.flippers.left, { x: 0.85, y: -0.55 });
    state.ball.linearVelocity.x = -220;
    state.ball.linearVelocity.y = 160;

    const next = stepGame(state, classicTable, idleInput, 1 / 60);

    expect(next.ball.position.x).toBeGreaterThan(state.ball.position.x);
    expect(next.ball.linearVelocity.x).toBeGreaterThan(0);
    expect(next.ball.linearVelocity.y).toBeLessThan(160);
  });

  it('adds a stronger upward impulse when the left flipper flips into the ball', () => {
    const passiveState = createInitialGameState(classicTable);
    passiveState.status = 'playing';
    placeBallOnFlipperSurface(passiveState, classicTable.flippers.left, 0.72);
    passiveState.ball.linearVelocity.x = 0;
    passiveState.ball.linearVelocity.y = 120;

    const activeState = createInitialGameState(classicTable);
    activeState.status = 'playing';
    placeBallOnFlipperSurface(activeState, classicTable.flippers.left, 0.72);
    activeState.ball.linearVelocity.x = 0;
    activeState.ball.linearVelocity.y = 120;

    const passive = stepGame(passiveState, classicTable, idleInput, 1 / 60);
    const next = stepGame(
      activeState,
      classicTable,
      { ...idleInput, leftPressed: true },
      1 / 60,
    );

    expect(next.ball.linearVelocity.y).toBeLessThan(-100);
    expect(next.ball.linearVelocity.y).toBeLessThan(
      passive.ball.linearVelocity.y - 100,
    );
  });

  it('marks the ball drained after it falls below the board', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    state.ball.position.y = classicTable.drainY + state.ball.radius + 8;

    const next = stepGame(state, classicTable, idleInput, 1 / 60);

    expect(next.status).toBe('waiting-launch');
    expect(next.ball.position.x).toBe(classicTable.launchPosition.x);
    expect(next.ball.position.y).toBe(classicTable.launchPosition.y);
    expect(next.ball.position.z).toBe(classicTable.ball.radius);
    expect(next.ball.linearVelocity.x).toBe(0);
    expect(next.ball.linearVelocity.y).toBe(0);
  });
});

const placeBallOnFlipperSurface = (
  state: ReturnType<typeof createInitialGameState>,
  flipper: FlipperDefinition,
  along: number,
): void => {
  const angle = flipper.restingAngle;
  const segmentX = Math.cos(angle) * flipper.length;
  const segmentY = Math.sin(angle) * flipper.length;
  const surfaceX = flipper.x + segmentX * along;
  const surfaceY = flipper.y + segmentY * along;
  const normalX = Math.sin(angle);
  const normalY = -Math.cos(angle);
  const distance = state.ball.radius + flipper.thickness / 2 - 1;

  state.ball.position.x = surfaceX + normalX * distance;
  state.ball.position.y = surfaceY + normalY * distance;
};

const placeBallOnFlipperTip = (
  state: ReturnType<typeof createInitialGameState>,
  flipper: FlipperDefinition,
  direction: { x: number; y: number },
): void => {
  const angle = flipper.restingAngle;
  const tipX = flipper.x + Math.cos(angle) * flipper.length;
  const tipY = flipper.y + Math.sin(angle) * flipper.length;
  const magnitude = Math.hypot(direction.x, direction.y);
  const distance = state.ball.radius + flipper.thickness / 2 - 1;

  state.ball.position.x = tipX + (direction.x / magnitude) * distance;
  state.ball.position.y = tipY + (direction.y / magnitude) * distance;
};
