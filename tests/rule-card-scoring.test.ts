import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { TABLE_RULE_CARDS } from '../src/boards/table-rule-cards';
import { createInitialGameState } from '../src/game/game-state';
import {
  initializeRulesState,
  applyRulesFrame,
} from '../src/game/rules-engine';

const start = (id: string) => {
  const board = BUILT_IN_TABLES.find((table) => table.id === id)!.board;
  return {
    board,
    state: initializeRulesState(createInitialGameState(board), board),
  };
};

describe('rule card scoring audit', () => {
  it.each(BUILT_IN_TABLES)(
    '$id starts with the advertised ball count',
    ({ id }) => {
      const { state } = start(id);
      expect(state.rules.ballsPerGame).toBe(TABLE_RULE_CARDS[id].balls);
      expect(state.rules.ballsRemaining).toBe(TABLE_RULE_CARDS[id].balls);
    },
  );

  it('Harlem awards the advertised saucer and target values directly', () => {
    const { board, state } = start('harlem-globetrotters');
    for (const [type, components, expected] of [
      ['saucer-captured', board.saucers, [5000, 25000]],
      ['drop-target-hit', board.dropTargets, board.dropTargets.map(() => 500)],
      [
        'standup-target-hit',
        board.standupTargets,
        board.standupTargets.map(() => 300),
      ],
    ] as const) {
      components.forEach((component, index) => {
        const before = state.score;
        applyRulesFrame(
          state,
          board,
          [{ type, index, score: component.score, tick: state.tick }],
          0,
        );
        expect(state.score - before).toBe(expected[index]);
        expect(state.rules.bonus).toBe(0);
      });
    }
  });

  it.each([
    ['classic-table', 'drop-target-hit', 1, 5, 3],
    ['double-crossed', 'rollover-hit', 4, 3, 2],
  ] as const)(
    'documents the current lower-cap behavior on %s',
    (id, type, count, initial, final) => {
      const { board, state } = start(id);
      state.rules.bonusMultiplier = initial;
      for (let index = 0; index < count; index++) {
        applyRulesFrame(
          state,
          board,
          [{ type, index, score: 0, tick: state.tick }],
          0,
        );
      }
      expect(state.rules.bonusMultiplier).toBe(final);
      expect(TABLE_RULE_CARDS[id].rules.join(' ')).toContain('reduces');
    },
  );
});
