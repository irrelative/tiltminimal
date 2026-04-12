import { describe, expect, it } from 'vitest';

import {
  formatValidateTableUsage,
  parseValidateTableCliArgs,
  resolveBuiltInTablesForValidation,
  shouldFailValidation,
  validateTableRecord,
} from '../src/cli/table-validation';
import { createBlankTable } from '../src/boards/table-library';
import type { TableRecord } from '../src/boards/table-library';

describe('table validation cli parsing', () => {
  it('parses explicit table ids and fail-on-warnings', () => {
    expect(
      parseValidateTableCliArgs(['classic-table', '--fail-on-warnings']),
    ).toEqual({
      help: false,
      all: false,
      failOnWarnings: true,
      tableIds: ['classic-table'],
      error: null,
    });
  });

  it('rejects mixing --all with explicit ids', () => {
    expect(parseValidateTableCliArgs(['--all', 'classic-table']).error).toBe(
      'Use either explicit table ids or --all, not both.',
    );
  });

  it('includes built-in ids in usage text', () => {
    const usage = formatValidateTableUsage();

    expect(usage).toContain('classic-table');
    expect(usage).toContain('double-crossed');
    expect(usage).toContain('harlem-globetrotters');
    expect(usage).toContain('starlight-em');
  });
});

describe('table validation cli resolution and reports', () => {
  it('resolves known built-in ids', () => {
    const resolved = resolveBuiltInTablesForValidation({
      all: false,
      tableIds: ['classic-table'],
    });

    expect(resolved.error).toBeNull();
    expect(resolved.tables).toHaveLength(1);
    expect(resolved.tables[0]?.id).toBe('classic-table');
  });

  it('reports unknown built-in ids', () => {
    const resolved = resolveBuiltInTablesForValidation({
      all: false,
      tableIds: ['missing-table'],
    });

    expect(resolved.error).toContain('missing-table');
  });

  it('fails validation on layout errors and optional warnings', () => {
    const invalidBoard = createBlankTable('Invalid');
    invalidBoard.plunger.x = 200;
    invalidBoard.bumpers = [
      {
        x: 20,
        y: 40,
        radius: 30,
        score: 100,
        material: 'rubberPost',
      },
    ];
    const record: TableRecord = {
      id: 'invalid-test',
      builtIn: false,
      board: invalidBoard,
    };

    const report = validateTableRecord(record);

    expect(report.layoutErrors).toBeGreaterThan(0);
    expect(shouldFailValidation([report], { failOnWarnings: false })).toBe(
      true,
    );
    expect(shouldFailValidation([report], { failOnWarnings: true })).toBe(
      true,
    );
  });
});
