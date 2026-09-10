import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { classicTable } from '../src/boards/tables/classic-table';
import {
  createPostPassCradle,
  isSettledOn,
  simulatePostPass,
} from './helpers/post-pass';

describe('post passes using ordinary flipper inputs', () => {
  for (const { id, board } of BUILT_IN_TABLES) {
    const transfers =
      id === 'harlem-globetrotters'
        ? [
            { source: 0, receiver: 1, sling: 0 },
            { source: 1, receiver: 2, sling: 1 },
          ]
        : id === 'andromeda'
          ? [{ source: 1, receiver: 0, sling: 0 }]
          : [
              { source: 0, receiver: 1, sling: 0 },
              { source: 1, receiver: 0, sling: 1 },
            ];
    for (const transfer of transfers) {
      it(`${id} passes from flipper ${transfer.source + 1} to ${transfer.receiver + 1} across neighboring release timings`, () => {
        const cradle = createPostPassCradle(board, transfer.source);
        expect(isSettledOn(cradle, board, transfer.source)).toBe(true);
        const releases = ['andromeda', 'harlem-globetrotters'].includes(id)
          ? [3, 4, 5]
          : [6, 7, 8, 9];
        for (const release of releases) {
          expect(
            simulatePostPass(
              board,
              cradle,
              transfer.source,
              transfer.receiver,
              transfer.sling,
              release,
            ),
            `release after ${release} frames`,
          ).toEqual({ postContact: true, slingFired: false, caught: true });
        }
      });
    }
  }
  it.each([0, 12])(
    'does not turn a %s-frame release into an assisted pass',
    (release) => {
      const result = simulatePostPass(
        classicTable,
        createPostPassCradle(classicTable, 0),
        0,
        1,
        0,
        release,
      );
      expect(result.postContact && !result.slingFired && result.caught).toBe(
        false,
      );
    },
  );
});
