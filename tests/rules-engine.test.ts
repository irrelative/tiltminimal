import { describe, expect, it } from 'vitest';

import { classicTable } from '../src/boards/tables/classic-table';
import { createInitialGameState } from '../src/game/game-state';
import {
  applyRulesFrame,
  initializeRulesState,
  validateRulesScript,
} from '../src/game/rules-engine';

describe('rules engine', () => {
  it('initializes classic as a three-ball game', () => {
    const state = initializeRulesState(
      createInitialGameState(classicTable),
      classicTable,
    );

    expect(state.rules.ballsPerGame).toBe(3);
    expect(state.rules.ballsRemaining).toBe(3);
    expect(state.rules.currentBall).toBe(1);
    expect(state.rules.bonus).toBe(0);
    expect(state.rules.bonusMultiplier).toBe(1);
  });

  it('awards a lane-completion bonus and advances the bonus multiplier', () => {
    const state = initializeRulesState(
      createInitialGameState(classicTable),
      classicTable,
    );

    applyRulesFrame(
      state,
      classicTable,
      [
        { type: 'rollover-hit', index: 0, score: 25, tick: 1 },
        { type: 'rollover-hit', index: 1, score: 25, tick: 1 },
        { type: 'rollover-hit', index: 2, score: 25, tick: 1 },
      ],
      1 / 60,
    );

    expect(state.score).toBe(1075);
    expect(state.rules.bonus).toBe(750);
    expect(state.rules.bonusMultiplier).toBe(2);
  });

  it('advances through three balls and then ends the game', () => {
    const state = initializeRulesState(
      createInitialGameState(classicTable),
      classicTable,
    );

    applyRulesFrame(
      state,
      classicTable,
      [{ type: 'ball-drained', tick: 1 }],
      1 / 60,
    );

    expect(state.status).toBe('waiting-launch');
    expect(state.rules.currentBall).toBe(2);
    expect(state.rules.ballsRemaining).toBe(2);

    applyRulesFrame(
      state,
      classicTable,
      [{ type: 'ball-drained', tick: 2 }],
      1 / 60,
    );

    expect(state.status).toBe('waiting-launch');
    expect(state.rules.currentBall).toBe(3);
    expect(state.rules.ballsRemaining).toBe(1);

    applyRulesFrame(
      state,
      classicTable,
      [{ type: 'ball-drained', tick: 3 }],
      1 / 60,
    );

    expect(state.status).toBe('game-over');
    expect(state.rules.ballsRemaining).toBe(0);
  });

  it('reports compile errors for invalid rule scripts', () => {
    expect(validateRulesScript('return { onEvent() {')).toBeTruthy();
  });
});
