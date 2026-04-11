import { describe, expect, it } from 'vitest';

import { harlemGlobetrottersTable } from '../src/boards/tables/harlem-globetrotters';
import { BUILT_IN_TABLES, getFlipperBySide } from '../src/boards/table-library';
import { createInitialGameState } from '../src/game/game-state';
import { stepGame } from '../src/game/physics-engine';
import type { InputState } from '../src/input/keyboard-input';

const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
  nudgeLeftPressed: false,
  nudgeRightPressed: false,
  nudgeUpPressed: false,
};

describe('harlemGlobetrottersTable', () => {
  it('matches the original table toy count and three-flipper layout', () => {
    expect(harlemGlobetrottersTable.bumpers).toHaveLength(3);
    expect(harlemGlobetrottersTable.standupTargets).toHaveLength(6);
    expect(harlemGlobetrottersTable.dropTargets).toHaveLength(4);
    expect(harlemGlobetrottersTable.saucers).toHaveLength(2);
    expect(harlemGlobetrottersTable.spinners).toHaveLength(3);
    expect(harlemGlobetrottersTable.flippers).toHaveLength(3);
    expect(
      getFlipperBySide(harlemGlobetrottersTable, 'right', 1).length,
    ).toBeGreaterThan(0);
  });

  it('is exposed in the built-in table library', () => {
    expect(
      BUILT_IN_TABLES.some(
        (table) => table.id === 'harlem-globetrotters' && table.builtIn,
      ),
    ).toBe(true);
  });

  it('launches harder than the global default from a full plunge', () => {
    let state = createInitialGameState(harlemGlobetrottersTable);
    state = stepGame(
      state,
      harlemGlobetrottersTable,
      { ...idleInput, launchPressed: true },
      harlemGlobetrottersTable.physics.plunger.maxPullSeconds,
    );
    const launched = releaseUntilLaunched(state, harlemGlobetrottersTable);

    expect(
      harlemGlobetrottersTable.physics.plunger.maxReleaseSpeed,
    ).toBeGreaterThan(
      BUILT_IN_TABLES[0]!.board.physics.plunger.maxReleaseSpeed,
    );
    expect(launched.status).toBe('playing');
    expect(launched.ball.linearVelocity.y).toBeLessThan(0);
    expect(Math.abs(launched.ball.linearVelocity.y)).toBeGreaterThan(
      physicsFloorForLaunch(),
    );
  });
});

const physicsFloorForLaunch = (): number => 150;

const releaseUntilLaunched = (
  state: ReturnType<typeof createInitialGameState>,
  board:
    | typeof harlemGlobetrottersTable
    | (typeof BUILT_IN_TABLES)[number]['board'],
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
