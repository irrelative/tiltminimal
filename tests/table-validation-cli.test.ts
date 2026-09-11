import { describe, expect, it } from 'vitest';

import {
  formatValidateTableUsage,
  parseValidateTableCliArgs,
  resolveBuiltInTablesForValidation,
  shouldFailValidation,
  validateTableRecord,
} from '../src/cli/table-validation';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { createBlankTable } from './helpers/board-fixture';
import type { BuiltInTable } from '../src/boards/table-library';

describe('table validation cli parsing', () => {
  it('parses explicit table ids and fail-on-warnings', () => {
    expect(
      parseValidateTableCliArgs(['classic-table', '--fail-on-warnings']),
    ).toEqual({
      help: false,
      all: false,
      failOnWarnings: true,
      playabilityMode: 'normal',
      tableIds: ['classic-table'],
      error: null,
    });
  });

  it('parses deep playability mode', () => {
    expect(
      parseValidateTableCliArgs(['classic-table', '--deep-playability']),
    ).toMatchObject({
      error: null,
      playabilityMode: 'deep',
      tableIds: ['classic-table'],
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
    const record: BuiltInTable = {
      id: 'invalid-test',
      board: invalidBoard,
    };

    const report = validateTableRecord(record);

    expect(report.layoutErrors).toBeGreaterThan(0);
    expect(shouldFailValidation([report], { failOnWarnings: false })).toBe(
      true,
    );
    expect(shouldFailValidation([report], { failOnWarnings: true })).toBe(true);
  });

  // Give each table its own budget as the built-in library grows.
  it.each(BUILT_IN_TABLES)(
    '$id stays free of validation errors',
    (table) => {
      const report = validateTableRecord(table);
      expect(shouldFailValidation([report], { failOnWarnings: false })).toBe(
        false,
      );
      expect(report.layoutErrors).toBe(0);
      expect(report.playabilityErrors).toBe(0);
    },
    15000,
  );
});
