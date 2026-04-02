// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { BUILT_IN_TABLES, createBlankTable } from '../src/boards/table-library';
import { physicsDefaults } from '../src/game/physics-defaults';
import {
  exportBoardDefinition,
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

  it('drops legacy resolved physics so current defaults apply on load', () => {
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
              physics: {
                launch: {
                  maxChargeSeconds:
                    physicsDefaults.tuning.plunger.maxPullSeconds,
                  minLaunchSpeed:
                    physicsDefaults.tuning.plunger.minReleaseSpeed,
                  maxLaunchSpeed:
                    physicsDefaults.tuning.plunger.maxReleaseSpeed,
                  minLaunchDrift: -70,
                  maxLaunchDrift: -260,
                },
                flipper: {
                  swingAngularSpeed: 15,
                  collisionAngleStep:
                    physicsDefaults.tuning.flipper.collisionAngleStep,
                },
                solver: {
                  ...physicsDefaults.tuning.solver,
                },
              },
            },
          },
        ],
      }),
    );

    const state = loadTablesState(window.localStorage);
    const legacy = state.tables.find((table) => table.id === 'legacy-table');

    expect(legacy?.board.physics.flipper.swingAngularSpeed).toBe(
      physicsDefaults.tuning.flipper.swingAngularSpeed,
    );
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

  it('stores only explicit physics overrides for new records', () => {
    const table = {
      id: 'custom-table',
      builtIn: false,
      board: createBlankTable('Custom Table'),
    };

    upsertTable(table, window.localStorage);

    const raw = window.localStorage.getItem('pball-web.tables.v2');

    expect(raw).toBeTruthy();

    const stored = JSON.parse(raw ?? '{}') as {
      tables?: Array<{ board?: { physics?: unknown } }>;
    };

    expect(stored.tables?.[0]?.board?.physics).toBeUndefined();
  });

  it('exports sparse table JSON suitable for copy and import', () => {
    const board = createBlankTable('Export Table');
    board.guides = [
      {
        kind: 'line',
        start: { x: 120, y: 220 },
        end: { x: 320, y: 220 },
        thickness: 18,
        material: 'metalGuide',
        plane: 'raised',
      },
    ];
    const exported = exportBoardDefinition(board);

    expect(exported.name).toBe('Export Table');
    expect(exported.physics).toBeUndefined();
    expect(exported.surfaceMaterials).toBeUndefined();
    expect(exported.rulesScript).toBeUndefined();
    expect(exported.flippers).toHaveLength(2);
    expect(exported.themeId).toBeUndefined();
    expect(exported.guides?.[0]).toMatchObject({ plane: 'raised' });
  });

  it('includes custom rule scripts in exported table JSON', () => {
    const board = createBlankTable('Rules Table');
    board.rulesScript =
      'return { onGameStart(ctx) { ctx.setBallsPerGame(5); } };';
    const exported = exportBoardDefinition(board);

    expect(exported.rulesScript).toContain('setBallsPerGame(5)');
  });

  it('persists custom nudge overrides through export and load', () => {
    const table = {
      id: 'nudge-table',
      builtIn: false,
      board: createBlankTable('Nudge Table'),
    };
    table.board.physics.nudge.up.displacement.y = -22;
    table.board.physics.nudge.cooldownSeconds = 0.2;

    upsertTable(table, window.localStorage);

    const raw = window.localStorage.getItem('pball-web.tables.v2');
    const stored = JSON.parse(raw ?? '{}') as {
      tables?: Array<{
        id?: string;
        board?: { physics?: { nudge?: { up?: { displacement?: { y?: number } } } } };
      }>;
    };

    expect(
      stored.tables?.find((entry) => entry.id === 'nudge-table')?.board?.physics
        ?.nudge?.up?.displacement?.y,
    ).toBe(-22);

    const state = loadTablesState(window.localStorage);

    expect(
      state.tables.find((entry) => entry.id === 'nudge-table')?.board.physics
        .nudge.up.displacement.y,
    ).toBe(-22);
  });

  it('persists non-default board themes through export and load', () => {
    const table = {
      id: 'theme-table',
      builtIn: false,
      board: {
        ...createBlankTable('Theme Table'),
        themeId: 'grayscale' as const,
      },
    };

    upsertTable(table, window.localStorage);

    const raw = window.localStorage.getItem('pball-web.tables.v2');
    const stored = JSON.parse(raw ?? '{}') as {
      tables?: Array<{ id?: string; board?: { themeId?: string } }>;
    };

    expect(
      stored.tables?.find((entry) => entry.id === 'theme-table')?.board?.themeId,
    ).toBe('grayscale');

    const state = loadTablesState(window.localStorage);

    expect(
      state.tables.find((entry) => entry.id === 'theme-table')?.board.themeId,
    ).toBe('grayscale');
  });
});
