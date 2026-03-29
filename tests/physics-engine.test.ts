import { describe, expect, it, vi } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { classicTable } from '../src/boards/classic-table';
import { getFlipperBySide } from '../src/boards/table-library';
import type { InputState } from '../src/input/keyboard-input';
import {
  getFlipperFaceNormal,
  getFlipperRadiusAt,
  getFlipperTipRadius,
} from '../src/game/flipper-geometry';
import { createInitialGameState } from '../src/game/game-state';
import { getPlungerGuideSegments } from '../src/game/plunger-geometry';
import { stepGame, stepGameFrame } from '../src/game/physics-engine';
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
    expect(next.plunger.pullback).toBeGreaterThan(0);
    expect(next.ball.position.x).toBe(classicTable.launchPosition.x);
    expect(next.ball.position.y).toBe(classicTable.launchPosition.y);
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
    const shortLaunch = releaseUntilLaunched(shortCharge, classicTable);

    let longCharge = createInitialGameState(classicTable);
    longCharge = stepGame(
      longCharge,
      classicTable,
      { ...idleInput, launchPressed: true },
      1.2,
    );
    const longLaunch = releaseUntilLaunched(longCharge, classicTable);

    expect(shortLaunch.status).toBe('playing');
    expect(longLaunch.status).toBe('playing');
    expect(Math.abs(longLaunch.ball.linearVelocity.y)).toBeGreaterThan(
      Math.abs(shortLaunch.ball.linearVelocity.y),
    );
    expect(Math.abs(longLaunch.ball.linearVelocity.x)).toBeLessThan(1);
  });

  it('waits for the plunger to physically reach the ball after release', () => {
    let charged = createInitialGameState(classicTable);
    charged = stepGame(
      charged,
      classicTable,
      { ...idleInput, launchPressed: true },
      0.3,
    );

    const released = stepGame(charged, classicTable, idleInput, 1 / 60);

    expect(released.status).toBe('waiting-launch');
    expect(released.plunger.pullback).toBeLessThan(charged.plunger.pullback);
    expect(released.ball.position.y).toBe(classicTable.launchPosition.y);
    expect(released.ball.linearVelocity.y).toBe(0);
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

    const leftState = getFlipperState(next, classicTable, 'left');

    expect(leftState.engaged).toBe(true);
    expect(leftState.angle).toBeLessThan(leftFlipper.restingAngle);
    expect(leftState.angle).toBeGreaterThan(leftFlipper.activeAngle);
    expect(leftState.angularVelocity).toBeLessThan(0);

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

    expect(
      getFlipperState(fullyRaised, classicTable, 'left').angle,
    ).toBeCloseTo(leftFlipper.activeAngle, 5);
    expect(getFlipperState(settled, classicTable, 'left').angle).toBeCloseTo(
      leftFlipper.activeAngle,
      5,
    );
    expect(getFlipperState(settled, classicTable, 'left').angularVelocity).toBe(
      0,
    );
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

    expect(getFlipperState(next, classicTable, 'left').angle).toBeCloseTo(
      leftFlipper.activeAngle,
      5,
    );
    expect(
      getFlipperState(next, classicTable, 'left').angularVelocity,
    ).toBeLessThanOrEqual(0);
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

    expect(getBallSpinMagnitude(next)).toBeGreaterThan(0);
  });

  it('bounces the ball off a post without emitting scoring events', () => {
    const board = createBlankTable();
    board.posts = [
      {
        x: 240,
        y: 260,
        radius: 18,
        material: 'rubberPost',
      },
    ];

    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = 240 - state.ball.radius - 18 - 2;
    state.ball.position.y = 260;
    state.ball.linearVelocity.x = 360;
    state.ball.linearVelocity.y = 0;

    const result = stepGameFrame(state, board, idleInput, 1 / 60);

    expect(result.state.ball.linearVelocity.x).toBeLessThan(0);
    expect(result.events).toEqual([]);
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
    expect(getBallSpinMagnitude(next)).toBeGreaterThan(0);
    expect(getFlipperState(next, classicTable, 'left').angle).toBeGreaterThan(
      leftFlipper.activeAngle,
    );
    expect(getFlipperState(next, classicTable, 'left').angle).toBeLessThan(
      leftFlipper.restingAngle,
    );
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
    expect(next.ball.linearVelocity.x).toBe(0);
    expect(next.ball.linearVelocity.y).toBe(0);
    expect(next.plunger.pullback).toBe(0);
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

    const next = stepGameFrame(state, board, idleInput, 1 / 60);

    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'standup-target-hit',
          index: 0,
          score: 75,
        }),
      ]),
    );
    expect(next.state.standupTargets[0]?.cooldownSeconds).toBeGreaterThan(0);
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

    const next = stepGameFrame(state, board, idleInput, 1 / 60);

    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'drop-target-hit',
          index: 0,
          score: 100,
        }),
      ]),
    );
    expect(next.state.dropTargets[0]?.isDown).toBe(true);
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

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);

    const captured = stepGameFrame(state, board, idleInput, 1 / 60);
    const held = stepGame(captured.state, board, idleInput, 1 / 30);
    const ejected = stepGame(held, board, idleInput, 1 / 30);

    randomSpy.mockRestore();

    expect(captured.state.saucers[0]?.occupied).toBe(true);
    expect(captured.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'saucer-captured',
          index: 0,
          score: 500,
        }),
      ]),
    );
    expect(ejected.saucers[0]?.occupied).toBe(false);
    expect(ejected.ball.linearVelocity.x).toBeGreaterThan(0);
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

    const next = stepGameFrame(state, board, idleInput, 1 / 60);

    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'spinner-spin',
          index: 0,
          score: 10,
        }),
      ]),
    );
    expect(
      Math.abs(next.state.spinners[0]?.angularVelocity ?? 0),
    ).toBeGreaterThan(0);
  });

  it('lights a rollover when the ball crosses it', () => {
    const board = createBlankTable('Rollover Board');
    board.rollovers = [{ x: 450, y: 400, radius: 22, score: 25 }];
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = 450;
    state.ball.position.y = 400;

    const next = stepGameFrame(state, board, idleInput, 1 / 60);

    expect(next.state.rollovers[0]?.lit).toBe(true);
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'rollover-hit',
          index: 0,
          score: 25,
        }),
      ]),
    );
  });

  it('catches a falling ball with the launcher guide rail', () => {
    const board = createBlankTable('Launcher Guide Board');
    const [leftGuide] = getPlungerGuideSegments(board);
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position.x = leftGuide.start.x - state.ball.radius + 1;
    state.ball.position.y = board.launchPosition.y - board.plunger.guideLength / 2;
    state.ball.linearVelocity.x = 220;
    state.ball.linearVelocity.y = 40;

    const next = stepGame(state, board, idleInput, 1 / 60);

    expect(next.ball.position.x).toBeLessThanOrEqual(leftGuide.start.x);
    expect(next.ball.linearVelocity.x).toBeLessThan(220);
  });

  it('bounces off a curved guide', () => {
    const board = createBlankTable('Curved Guide Board');
    board.guides = [
      {
        kind: 'arc',
        center: { x: 450, y: 400 },
        radius: 110,
        startAngle: Math.PI,
        endAngle: Math.PI * 1.5,
        thickness: 18,
        material: 'metalGuide',
      },
    ];
    const state = createInitialGameState(board);
    state.status = 'playing';

    const curvedGuide = board.guides[0];
    if (!curvedGuide || curvedGuide.kind !== 'arc') {
      throw new Error('Expected curved guide.');
    }

    const angle = Math.PI * 1.25;
    const guideRadius = curvedGuide.radius;
    const travelRadius =
      guideRadius + state.ball.radius + curvedGuide.thickness / 2 - 1;
    state.ball.position.x = 450 + Math.cos(angle) * travelRadius;
    state.ball.position.y = 400 + Math.sin(angle) * travelRadius;
    state.ball.linearVelocity.x = 140;
    state.ball.linearVelocity.y = 140;

    const next = stepGame(state, board, idleInput, 1 / 60);

    expect(next.ball.position.x).toBeLessThan(state.ball.position.x + 4);
    expect(next.ball.position.y).toBeLessThan(state.ball.position.y + 4);
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
  const normal = getFlipperFaceNormal(flipper, angle);
  const distance = state.ball.radius + getFlipperRadiusAt(flipper, along) - 1;

  state.ball.position.x = surfaceX + normal.x * distance;
  state.ball.position.y = surfaceY + normal.y * distance;
};

const getFlipperState = (
  state: ReturnType<typeof createInitialGameState>,
  board: typeof classicTable,
  side: 'left' | 'right',
  occurrence = 0,
) => {
  const flipperIndex = board.flippers.reduce((matchIndex, flipper, index) => {
    if (matchIndex !== -1 || flipper.side !== side) {
      return matchIndex;
    }

    const sideIndex = board.flippers
      .slice(0, index + 1)
      .filter((candidate) => candidate.side === side).length;

    return sideIndex === occurrence + 1 ? index : -1;
  }, -1);

  expect(flipperIndex).toBeGreaterThanOrEqual(0);

  return state.flippers[flipperIndex]!;
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
  const distance = state.ball.radius + getFlipperTipRadius(flipper) - 1;

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

const getBallSpinMagnitude = (
  state: ReturnType<typeof createInitialGameState>,
): number => Math.hypot(state.ball.angularVelocity.x, state.ball.angularVelocity.y);

const releaseUntilLaunched = <TBoard extends typeof classicTable>(
  state: ReturnType<typeof createInitialGameState>,
  board: TBoard,
) => {
  let current = state;

  for (let step = 0; step < 45; step += 1) {
    current = stepGame(current, board, idleInput, 1 / 60);

    if (current.status === 'playing') {
      return current;
    }
  }

  throw new Error('Expected plunger launch.');
};
