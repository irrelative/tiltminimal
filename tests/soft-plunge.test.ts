import { describe, expect, it } from 'vitest';
import { justOneMoreTable } from '../src/boards/tables/just-one-more';
import { switchyardTable } from '../src/boards/tables/switchyard';
import { createInitialGameState, type GameState } from '../src/game/game-state';
import {
  initializeRulesState,
  applyRulesFrame,
} from '../src/game/rules-engine';
import { stepGameFrame } from '../src/game/physics-engine';
import { idleInput } from './helpers/game-fixture';

for (const board of [justOneMoreTable, switchyardTable]) {
  const start = () =>
    initializeRulesState(createInitialGameState(board), board);
  const plunge = (initial: GameState, hold: number) => {
    let state = initial;
    for (let frame = 0; frame < hold + 300; frame++) {
      const result = stepGameFrame(
        state,
        board,
        { ...idleInput, launchPressed: frame < hold },
        1 / 120,
      );
      state = applyRulesFrame(result.state, board, result.events, 1 / 120);
    }
    return state;
  };
  const sensor = (state: GameState, index: number) =>
    applyRulesFrame(
      state,
      board,
      [{ type: 'rollover-hit', index, score: 0, ballId: 0, tick: state.tick }],
      0,
    );
  describe(`${board.name} soft plunge`, () => {
    it.each([68, 69, 70])(
      'awards a %i-frame soft plunge once, with no repeat or replacement award',
      (hold) => {
        const state = plunge(start(), hold);
        expect(state.rules.ballValues['skill-shot']).toBe('collected');
        expect(state.score).toBeGreaterThanOrEqual(5000);
        const score = state.score;
        sensor(state, 3);
        applyRulesFrame(
          state,
          board,
          [{ type: 'ball-launched', tick: state.tick }],
          0,
        );
        sensor(state, 3);
        expect(state.score).toBe(score);
      },
    );
    it('cancels an overshoot even if it subsequently returns through the opening', () => {
      const state = plunge(start(), 71);
      expect(state.rules.ballValues['skill-shot']).toBe('missed');
      const score = state.score;
      sensor(state, 3);
      expect(state.score).toBe(score);
    });
    it('allows a weak plunge to return to the plunger and retry', () => {
      const weak = plunge(start(), 15);
      expect(weak.status).toBe('waiting-launch');
      expect(weak.launcherExited).toBe(false);
      expect(weak.rules.currentBall).toBe(1);
      expect(plunge(weak, 69).rules.ballValues['skill-shot']).toBe('collected');
    });
    it('does not award before launch and lights again on the next ball', () => {
      const state = start();
      sensor(state, 3);
      expect(state.score).toBe(0);
      applyRulesFrame(
        state,
        board,
        [{ type: 'ball-drained', tick: state.tick }],
        0,
      );
      expect(state.rules.currentBall).toBe(2);
      expect(state.rules.ballValues['skill-shot']).toBe('ready');
    });
  });
}
