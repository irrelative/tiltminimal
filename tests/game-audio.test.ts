import { describe, expect, it } from 'vitest';

import { classicTable } from '../src/boards/tables/classic-table';
import { getFlipperBySide } from '../src/boards/table-library';
import { getFrameAudioEvents } from '../src/audio/game-audio';
import type { InputState } from '../src/input/keyboard-input';
import {
  getFlipperFaceNormal,
  getFlipperRadiusAt,
} from '../src/game/flipper-geometry';
import { createInitialGameState } from '../src/game/game-state';
import { stepGame } from '../src/game/physics-engine';
import type { FlipperDefinition } from '../src/types/board-definition';

const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
  nudgeLeftPressed: false,
  nudgeRightPressed: false,
  nudgeUpPressed: false,
};

describe('getFrameAudioEvents', () => {
  it('emits a flipper trigger when the left flipper is pressed', () => {
    const state = createInitialGameState(classicTable);

    const events = getFrameAudioEvents(
      state,
      state,
      idleInput,
      { ...idleInput, leftPressed: true },
      classicTable,
      1 / 60,
    );

    expect(events).toContainEqual({
      type: 'flipper-trigger',
      side: 'left',
      pan: -0.65,
      intensity: 0.7,
    });
  });

  it('does not retrigger the flipper sound while the button is held', () => {
    const state = createInitialGameState(classicTable);

    const events = getFrameAudioEvents(
      state,
      state,
      { ...idleInput, leftPressed: true },
      { ...idleInput, leftPressed: true },
      classicTable,
      1 / 60,
    );

    expect(events).toHaveLength(0);
  });

  it('emits a metal bounce when the ball hits a wall', () => {
    const previousState = createInitialGameState(classicTable);
    previousState.status = 'playing';
    previousState.ball.position.x = previousState.ball.radius + 1;
    previousState.ball.position.y = 500;
    previousState.ball.linearVelocity.x = -180;
    previousState.ball.linearVelocity.y = 0;

    const nextState = stepGame(previousState, classicTable, idleInput, 1 / 60);
    const events = getFrameAudioEvents(
      previousState,
      nextState,
      idleInput,
      idleInput,
      classicTable,
      1 / 60,
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'ball-bounce',
        material: 'metalGuide',
      }),
    );
  });

  it('emits a rubber bounce when the ball lands on a bumper', () => {
    const previousState = createInitialGameState(classicTable);
    previousState.status = 'playing';
    placeBallOnBumperSurface(previousState, classicTable.bumpers[0]!, {
      x: 1,
      y: 0,
    });
    previousState.ball.linearVelocity.x = -120;
    previousState.ball.linearVelocity.y = 220;

    const nextState = stepGame(previousState, classicTable, idleInput, 1 / 60);
    const events = getFrameAudioEvents(
      previousState,
      nextState,
      idleInput,
      idleInput,
      classicTable,
      1 / 60,
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'ball-bounce',
        material: 'rubberPost',
      }),
    );
  });

  it('emits a rubber bounce when a flipper knocks the ball', () => {
    const previousState = createInitialGameState(classicTable);
    previousState.status = 'playing';
    placeBallOnFlipperSurface(
      previousState,
      getFlipperBySide(classicTable, 'left'),
      0.72,
    );
    previousState.ball.linearVelocity.x = 0;
    previousState.ball.linearVelocity.y = 120;

    const nextInput = { ...idleInput, leftPressed: true };
    const nextState = stepGame(previousState, classicTable, nextInput, 1 / 60);
    const events = getFrameAudioEvents(
      previousState,
      nextState,
      idleInput,
      nextInput,
      classicTable,
      1 / 60,
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'ball-bounce',
        material: 'flipperRubber',
      }),
    );
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
