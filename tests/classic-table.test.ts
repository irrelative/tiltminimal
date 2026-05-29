import { describe, expect, it } from 'vitest';

import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import { classicTable } from '../src/boards/tables/classic-table';
import { analyzeBoard } from '../src/editor/table-analysis';
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

describe('classicTable', () => {
  it('exposes a valid board definition', () => {
    expect(classicTable.width).toBeGreaterThan(0);
    expect(classicTable.height).toBeGreaterThan(0);
    expect(classicTable.ball.radius).toBeGreaterThan(0);
    expect(classicTable.ball.mass).toBeGreaterThan(0);
    expect(classicTable.plunger.length).toBeGreaterThan(0);
    expect(classicTable.plunger.travel).toBeGreaterThan(0);
    expect(classicTable.plunger.guideLength).toBeGreaterThan(0);
    expect(classicTable.materials.playfield).toBe('playfieldWood');
    expect(classicTable.rulesScript).toContain('BALLS_PER_GAME');
    expect(classicTable.bumpers).toHaveLength(3);
    expect(classicTable.standupTargets).toHaveLength(2);
    expect(classicTable.dropTargets).toHaveLength(1);
    expect(classicTable.saucers).toHaveLength(1);
    expect(classicTable.spinners).toHaveLength(1);
    expect(classicTable.slingshots).toHaveLength(2);
    expect(classicTable.rollovers).toHaveLength(3);
    expect(classicTable.posts).toHaveLength(6);
    expect(classicTable.guides.length).toBeGreaterThanOrEqual(17);
    expect(classicTable.bumpers[0]?.material).toBe('rubberPost');
    expect(classicTable.flippers).toHaveLength(2);
    expect(classicTable.flippers[0]?.length).toBeGreaterThan(0);
    expect(classicTable.flippers[0]?.material).toBe('flipperRubber');
    expect(classicTable.flippers[1]?.side).toBe('right');
  });

  it('passes canonical layout validation checks', () => {
    const diagnostics = validateCompiledBoardLayout(classicTable);
    const errorCodes = diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => diagnostic.code);

    expect(errorCodes).not.toContain('launcher-blocked');
    expect(errorCodes).not.toContain('rollover-unreachable');
    expect(errorCodes).not.toContain('flipper-keepout');
    expect(errorCodes).not.toContain('spinner-obstructed');
  });

  it('clears the editor-side geometry analysis checks', () => {
    expect(analyzeBoard(classicTable)).toHaveLength(0);
  });

  it('can full-plunge the ball into the upper playfield', () => {
    let state = createInitialGameState(classicTable);
    state = stepGame(
      state,
      classicTable,
      { ...idleInput, launchPressed: true },
      1.2,
    );

    let launched = releaseUntilLaunched(state);
    let minY = launched.ball.position.y;

    for (let step = 0; step < 120; step += 1) {
      launched = stepGame(launched, classicTable, idleInput, 1 / 60);
      minY = Math.min(minY, launched.ball.position.y);
    }

    expect(minY).toBeLessThan(280);
  });

  it('uses raised lower return guides instead of playfield-level flipper blockers', () => {
    const raisedGuides = classicTable.guides.filter(
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
    current = stepGame(current, classicTable, idleInput, 1 / 120);

    if (current.status === 'playing') {
      return current;
    }
  }

  throw new Error('Expected Classic Table to launch within 1 second.');
};
