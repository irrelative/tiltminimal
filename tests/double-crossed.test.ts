import { describe, expect, it } from 'vitest';

import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import { doubleCrossedTable } from '../src/boards/tables/double-crossed';
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

describe('doubleCrossedTable', () => {
  it('exposes a validated three-ball original table', () => {
    expect(doubleCrossedTable.name).toBe('Double Crossed');
    expect(doubleCrossedTable.themeId).toBe('midnight');
    expect(doubleCrossedTable.rulesScript).toContain('BALLS_PER_GAME = 3');
    expect(doubleCrossedTable.bumpers).toHaveLength(3);
    expect(doubleCrossedTable.standupTargets).toHaveLength(4);
    expect(doubleCrossedTable.dropTargets).toHaveLength(2);
    expect(doubleCrossedTable.spinners).toHaveLength(2);
    expect(doubleCrossedTable.slingshots).toHaveLength(2);
    expect(doubleCrossedTable.rollovers).toHaveLength(4);
    expect(doubleCrossedTable.flippers).toHaveLength(2);
  });

  it('is exposed in the built-in table library', () => {
    expect(
      BUILT_IN_TABLES.some(
        (table) => table.id === 'double-crossed' && table.builtIn,
      ),
    ).toBe(true);
  });

  it('passes layout validation without errors', () => {
    const errorCodes = validateCompiledBoardLayout(doubleCrossedTable)
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => diagnostic.code);

    expect(errorCodes).toEqual([]);
  });

  it('can full-plunge into the upper playfield', () => {
    let state = createInitialGameState(doubleCrossedTable);
    state = stepGame(
      state,
      doubleCrossedTable,
      { ...idleInput, launchPressed: true },
      doubleCrossedTable.physics.plunger.maxPullSeconds,
    );

    let launched = releaseUntilLaunched(state);
    let minY = launched.ball.position.y;

    for (let step = 0; step < 120; step += 1) {
      launched = stepGame(launched, doubleCrossedTable, idleInput, 1 / 60);
      minY = Math.min(minY, launched.ball.position.y);
    }

    expect(minY).toBeLessThan(320);
  });
});

const releaseUntilLaunched = (
  state: ReturnType<typeof createInitialGameState>,
): ReturnType<typeof createInitialGameState> => {
  let current = state;

  for (let step = 0; step < 60; step += 1) {
    current = stepGame(current, doubleCrossedTable, idleInput, 1 / 60);

    if (current.status === 'playing') {
      return current;
    }
  }

  throw new Error('Expected Double Crossed to launch within 1 second.');
};
