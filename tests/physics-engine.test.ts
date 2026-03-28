import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { classicTable } from '../src/boards/classic-table';
import { getFlipperBySide } from '../src/boards/table-library';
import type { InputState } from '../src/input/keyboard-input';
import { createInitialGameState } from '../src/game/game-state';
import { stepGame } from '../src/game/physics-engine';
import type { FlipperDefinition } from '../src/types/board-definition';

const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
};
const leftFlipper = getFlipperBySide(classicTable, 'left');
const rightFlipper = getFlipperBySide(classicTable, 'right');

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
    placeBallOnFlipperSurface(state, leftFlipper, 0.58);
    state.ball.linearVelocity.x = 10;
    state.ball.linearVelocity.y = 180;

    const next = stepGame(state, classicTable, idleInput, 1 / 60);

    expect(next.ball.position.y).toBeLessThan(state.ball.position.y);
    expect(next.ball.linearVelocity.y).toBeLessThan(180);
  });

  it('animates the left flipper through intermediate angles before reaching full extension', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';

    const next = stepGame(
      state,
      classicTable,
      { ...idleInput, leftPressed: true },
      1 / 60,
    );

    expect(next.flippers.left.engaged).toBe(true);
    expect(next.flippers.left.angle).toBeLessThan(leftFlipper.restingAngle);
    expect(next.flippers.left.angle).toBeGreaterThan(leftFlipper.activeAngle);
    expect(next.flippers.left.angularVelocity).toBeLessThan(0);

    const fullyRaised = stepGame(
      next,
      classicTable,
      { ...idleInput, leftPressed: true },
      1 / 60,
    );
    const settled = stepGame(
      fullyRaised,
      classicTable,
      { ...idleInput, leftPressed: true },
      1 / 60,
    );

    expect(fullyRaised.flippers.left.angle).toBeCloseTo(
      leftFlipper.activeAngle,
      5,
    );
    expect(settled.flippers.left.angle).toBeCloseTo(leftFlipper.activeAngle, 5);
    expect(settled.flippers.left.angularVelocity).toBe(0);
  });

  it('keeps flipper animation at real-time speed on long frames', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';

    const next = stepGame(
      state,
      classicTable,
      { ...idleInput, leftPressed: true },
      1 / 15,
    );

    expect(next.flippers.left.angle).toBeCloseTo(leftFlipper.activeAngle, 5);
    expect(next.flippers.left.angularVelocity).toBeLessThanOrEqual(0);
  });

  it('collides against the rounded flipper tip', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    placeBallOnFlipperTip(state, leftFlipper, {
      x: 0.85,
      y: -0.55,
    });
    state.ball.linearVelocity.x = -220;
    state.ball.linearVelocity.y = 160;

    const next = stepGame(state, classicTable, idleInput, 1 / 60);

    expect(next.ball.position.x).toBeGreaterThan(state.ball.position.x);
    expect(next.ball.linearVelocity.x).toBeGreaterThan(-220);
    expect(next.ball.linearVelocity.y).toBeLessThan(160);
  });

  it('transfers tangential slip into spin on bumper contact', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    placeBallOnBumperSurface(state, classicTable.bumpers[0]!, { x: 1, y: 0 });
    state.ball.linearVelocity.x = -120;
    state.ball.linearVelocity.y = 220;

    const next = stepGame(state, classicTable, idleInput, 1 / 60);

    expect(Math.abs(next.ball.angularVelocity.z)).toBeGreaterThan(0);
  });

  it('adds a stronger upward impulse when the left flipper flips into the ball', () => {
    const passiveState = createInitialGameState(classicTable);
    passiveState.status = 'playing';
    placeBallOnFlipperSurface(passiveState, leftFlipper, 0.72);
    passiveState.ball.linearVelocity.x = 0;
    passiveState.ball.linearVelocity.y = 120;

    const activeState = createInitialGameState(classicTable);
    activeState.status = 'playing';
    placeBallOnFlipperSurface(activeState, leftFlipper, 0.72);
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
    expect(Math.abs(next.ball.angularVelocity.z)).toBeGreaterThan(0);
    expect(next.flippers.left.angle).toBeGreaterThan(leftFlipper.activeAngle);
    expect(next.flippers.left.angle).toBeLessThan(leftFlipper.restingAngle);
  });

  it('prevents a fast ball from tunneling through the left flipper', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    placeBallOnFlipperSurface(state, leftFlipper, 0.68);
    state.ball.position.y -= 18;
    state.ball.linearVelocity.x = 0;
    state.ball.linearVelocity.y = 1400;

    const next = stepGame(
      state,
      classicTable,
      { ...idleInput, leftPressed: true },
      1 / 60,
    );

    expect(next.ball.position.y).toBeLessThan(state.ball.position.y + 20);
    expect(next.ball.linearVelocity.y).toBeLessThan(1400);
  });

  it('prevents a fast ball from tunneling through the right flipper', () => {
    const state = createInitialGameState(classicTable);
    state.status = 'playing';
    placeBallOnFlipperSurface(state, rightFlipper, 0.68);
    state.ball.position.y -= 18;
    state.ball.linearVelocity.x = 0;
    state.ball.linearVelocity.y = 1400;

    const next = stepGame(
      state,
      classicTable,
      { ...idleInput, rightPressed: true },
      1 / 60,
    );

    expect(next.ball.position.y).toBeLessThan(state.ball.position.y + 20);
    expect(next.ball.linearVelocity.y).toBeLessThan(1400);
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

  it('scores when the ball hits a standup target', () => {
    const board = createBlankTable('Standup Board');
    board.standupTargets = [
      {
        x: 450,
        y: 400,
        width: 60,
        height: 16,
        angle: 0,
        score: 75,
        material: 'rubberPost',
      },
    ];
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = 450;
    state.ball.position.y = 390;
    state.ball.linearVelocity.y = 180;

    const next = stepGame(state, board, idleInput, 1 / 60);

    expect(next.score).toBe(75);
    expect(next.standupTargets[0]?.cooldownSeconds).toBeGreaterThan(0);
  });

  it('drops a drop target after a hit', () => {
    const board = createBlankTable('Drop Board');
    board.dropTargets = [
      {
        x: 450,
        y: 400,
        width: 54,
        height: 16,
        angle: 0,
        score: 100,
        material: 'rubberPost',
      },
    ];
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = 450;
    state.ball.position.y = 390;
    state.ball.linearVelocity.y = 180;

    const next = stepGame(state, board, idleInput, 1 / 60);

    expect(next.score).toBe(100);
    expect(next.dropTargets[0]?.isDown).toBe(true);
  });

  it('captures and ejects the ball from a saucer', () => {
    const board = createBlankTable('Saucer Board');
    board.saucers = [
      {
        x: 450,
        y: 400,
        radius: 30,
        score: 500,
        holdSeconds: 0.05,
        ejectSpeed: 900,
        ejectAngle: -Math.PI / 2,
        material: 'metalGuide',
      },
    ];
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = 450;
    state.ball.position.y = 400;

    const captured = stepGame(state, board, idleInput, 1 / 60);
    const held = stepGame(captured, board, idleInput, 1 / 30);
    const ejected = stepGame(held, board, idleInput, 1 / 30);

    expect(captured.saucers[0]?.occupied).toBe(true);
    expect(captured.score).toBe(500);
    expect(ejected.saucers[0]?.occupied).toBe(false);
    expect(ejected.ball.linearVelocity.y).toBeLessThan(0);
  });

  it('spins and scores when the ball crosses a spinner', () => {
    const board = createBlankTable('Spinner Board');
    board.spinners = [
      {
        x: 450,
        y: 400,
        length: 100,
        thickness: 10,
        angle: 0,
        score: 10,
        material: 'metalGuide',
      },
    ];
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = 450;
    state.ball.position.y = 392;
    state.ball.linearVelocity.y = 220;

    const next = stepGame(state, board, idleInput, 1 / 60);

    expect(next.score).toBe(10);
    expect(Math.abs(next.spinners[0]?.angularVelocity ?? 0)).toBeGreaterThan(0);
  });

  it('lights a rollover when the ball crosses it', () => {
    const board = createBlankTable('Rollover Board');
    board.rollovers = [{ x: 450, y: 400, radius: 22, score: 25 }];
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = 450;
    state.ball.position.y = 400;

    const next = stepGame(state, board, idleInput, 1 / 60);

    expect(next.rollovers[0]?.lit).toBe(true);
    expect(next.score).toBe(25);
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
  const normalX =
    flipper.side === 'left' ? Math.sin(angle) : -Math.sin(angle);
  const normalY =
    flipper.side === 'left' ? -Math.cos(angle) : Math.cos(angle);
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

const placeBallOnBumperSurface = (
  state: ReturnType<typeof createInitialGameState>,
  bumper: (typeof classicTable.bumpers)[number],
  normal: { x: number; y: number },
): void => {
  const magnitude = Math.hypot(normal.x, normal.y);
  const distance = state.ball.radius + bumper.radius - 1;

  state.ball.position.x = bumper.x + (normal.x / magnitude) * distance;
  state.ball.position.y = bumper.y + (normal.y / magnitude) * distance;
};
