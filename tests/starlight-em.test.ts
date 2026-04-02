import { describe, expect, it } from 'vitest';

import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import { starlightEmTable } from '../src/boards/starlight-em-table';
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

describe('starlightEmTable', () => {
  it('exposes a valid EM-style built-in table', () => {
    expect(starlightEmTable.name).toBe('Starlight EM');
    expect(starlightEmTable.themeId).toBe('sunburst');
    expect(starlightEmTable.rulesScript).toContain('BALLS_PER_GAME = 5');
    expect(starlightEmTable.bumpers).toHaveLength(3);
    expect(starlightEmTable.spinners).toHaveLength(2);
    expect(starlightEmTable.saucers).toHaveLength(1);
    expect(starlightEmTable.standupTargets).toHaveLength(6);
    expect(starlightEmTable.rollovers).toHaveLength(4);
    expect(starlightEmTable.dropTargets).toHaveLength(0);
    expect(starlightEmTable.flippers).toHaveLength(2);
  });

  it('is exposed in the built-in table library', () => {
    expect(
      BUILT_IN_TABLES.some(
        (table) => table.id === 'starlight-em' && table.builtIn,
      ),
    ).toBe(true);
  });

  it('passes playability validation for the launcher and top arch', () => {
    const diagnostics = validateCompiledBoardLayout(starlightEmTable);
    const errorCodes = diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => diagnostic.code);

    expect(errorCodes).not.toContain('launcher-blocked');
    expect(errorCodes).not.toContain('rollover-unreachable');
    expect(errorCodes).not.toContain('flipper-keepout');
  });

  it('can full-plunge the ball into the upper playfield', () => {
    let state = createInitialGameState(starlightEmTable);
    state = stepGame(
      state,
      starlightEmTable,
      { ...idleInput, launchPressed: true },
      1.2,
    );

    let launched = releaseUntilLaunched(state);
    const initialLaunch = {
      velocity: { ...launched.ball.linearVelocity },
      position: { ...launched.ball.position },
    };
    let minY = launched.ball.position.y;

    for (let step = 0; step < 120; step += 1) {
      launched = stepGame(launched, starlightEmTable, idleInput, 1 / 60);
      minY = Math.min(minY, launched.ball.position.y);
    }

    expect(initialLaunch.velocity.y).toBeLessThan(-1600);
    expect(minY).toBeLessThan(280);
  });

  it('uses raised lower return guides instead of playfield-level flipper blockers', () => {
    const raisedGuides = starlightEmTable.guides.filter(
      (guide) => guide.plane === 'raised',
    );

    expect(raisedGuides.length).toBeGreaterThanOrEqual(4);
  });
});

const releaseUntilLaunched = (
  state: ReturnType<typeof createInitialGameState>,
): ReturnType<typeof createInitialGameState> => {
  let current = state;

  for (let index = 0; index < 120; index += 1) {
    current = stepGame(current, starlightEmTable, idleInput, 1 / 120);

    if (current.status === 'playing') {
      return current;
    }
  }

  throw new Error('Expected Starlight EM to launch within 1 second.');
};
