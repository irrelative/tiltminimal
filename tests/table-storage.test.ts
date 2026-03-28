// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { BUILT_IN_TABLES, createBlankTable } from '../src/boards/table-library';
import {
  loadTablesState,
  resetBuiltInTable,
  upsertTable,
} from '../src/editor/table-storage';

describe('table storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads the built-in tables when storage is empty', () => {
    const state = loadTablesState(window.localStorage);

    expect(state.tables).toHaveLength(BUILT_IN_TABLES.length);
    expect(state.activeTableId).toBe(BUILT_IN_TABLES[0]?.id);
  });

  it('persists edits to a built-in table by id', () => {
    const table = BUILT_IN_TABLES[0];

    if (!table) {
      throw new Error('Missing built-in table.');
    }

    upsertTable(
      {
        ...table,
        board: {
          ...table.board,
          name: 'Arcade Nights',
        },
      },
      window.localStorage,
    );

    const state = loadTablesState(window.localStorage);

    expect(
      state.tables.find((entry) => entry.id === table.id)?.board.name,
    ).toBe('Arcade Nights');
  });

  it('normalizes legacy flipper objects when loading stored tables', () => {
    window.localStorage.setItem(
      'pball-web.tables.v1',
      JSON.stringify({
        activeTableId: 'legacy-table',
        tables: [
          {
            id: 'legacy-table',
            builtIn: false,
            board: {
              ...createBlankTable('Legacy Table'),
              flippers: {
                left: {
                  x: 280,
                  y: 1200,
                  length: 150,
                  thickness: 20,
                  restingAngle: 0.28,
                  activeAngle: -0.42,
                  material: 'flipperRubber',
                },
                right: {
                  x: 620,
                  y: 1200,
                  length: 150,
                  thickness: 20,
                  restingAngle: Math.PI - 0.28,
                  activeAngle: Math.PI + 0.42,
                  material: 'flipperRubber',
                },
              },
            },
          },
        ],
      }),
    );

    const state = loadTablesState(window.localStorage);
    const legacy = state.tables.find((table) => table.id === 'legacy-table');

    expect(legacy?.board.flippers).toHaveLength(2);
    expect(legacy?.board.flippers[0]?.side).toBe('left');
    expect(legacy?.board.flippers[1]?.side).toBe('right');
  });

  it('restores the built-in table after reset', () => {
    const table = BUILT_IN_TABLES[0];

    if (!table) {
      throw new Error('Missing built-in table.');
    }

    upsertTable(
      {
        ...table,
        board: {
          ...table.board,
          name: 'Edited Built-in',
        },
      },
      window.localStorage,
    );

    resetBuiltInTable(table.id, window.localStorage);

    const state = loadTablesState(window.localStorage);

    expect(
      state.tables.find((entry) => entry.id === table.id)?.board.name,
    ).toBe(table.board.name);
  });
});
