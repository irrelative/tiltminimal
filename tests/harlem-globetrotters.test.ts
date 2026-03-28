import { describe, expect, it } from 'vitest';

import { harlemGlobetrottersTable } from '../src/boards/harlem-globetrotters';
import { BUILT_IN_TABLES, getFlipperBySide } from '../src/boards/table-library';
import { createInitialGameState } from '../src/game/game-state';
import { stepGame } from '../src/game/physics-engine';
import { physicsDefaults } from '../src/game/physics-defaults';
import type { InputState } from '../src/input/keyboard-input';

const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
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
      harlemGlobetrottersTable.physics.launch.maxChargeSeconds,
    );

    const launched = stepGame(state, harlemGlobetrottersTable, idleInput, 1 / 60);

    expect(Math.abs(launched.ball.linearVelocity.y)).toBe(
      harlemGlobetrottersTable.physics.launch.maxLaunchSpeed,
    );
    expect(
      Math.abs(launched.ball.linearVelocity.y),
    ).toBeGreaterThan(physicsDefaults.tuning.launch.maxLaunchSpeed);
  });
});
