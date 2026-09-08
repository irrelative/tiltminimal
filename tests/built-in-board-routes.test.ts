import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { analyzePlayability } from '../src/validation/table-playability';
import { analyzeBoard } from '../src/validation/table-analysis';

describe('built-in board routes', () => {
  for (const { id, board } of BUILT_IN_TABLES) {
    it(`${id} has working launches, scoring routes and ball returns`, () => {
      expect(board.plunger.returnGate).toBeDefined();
      expect(board.routes?.length).toBeGreaterThan(5);
      expect(board.guides.filter((guide) => guide.plane === 'raised')).toEqual(
        [],
      );
      expect(analyzeBoard(board)).toEqual([]);
      expect(analyzePlayability(board, { mode: 'deep' })).toEqual([]);
    }, 15000);
  }
});
