import { describe, expect, it } from 'vitest';

import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { starlightEmTable } from '../src/boards/starlight-em-table';

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
});
