import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { classicTable } from '../src/boards/tables/classic-table';
import {
  analyzePlayability,
  simulateDroppedBall,
  simulatePlunge,
} from '../src/editor/table-playability';

describe('table playability analysis', () => {
  it('reports a launcher that only moves the ball vertically', () => {
    const board = createBlankTable('No Shooter Exit');
    const issues = analyzePlayability(board, {
      plungePowers: [1],
      maxDropIssues: 0,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'plunge-does-not-enter-play',
      }),
    );
  });

  it('can verify a strong Classic plunge exits the shooter lane', () => {
    const result = simulatePlunge(classicTable, 0.85);

    expect(result.launched).toBe(true);
    expect(result.exitedShooterLane).toBe(true);
    expect(result.minX).toBeLessThan(650);
  });

  it('classifies a clear dropped ball as draining', () => {
    const result = simulateDroppedBall(createBlankTable(), { x: 450, y: 760 });

    expect(result.outcome).toBe('drained');
  });

  it('reports passive trap pockets from seeded drop checks', () => {
    const board = createBlankTable('Trap Pocket');
    board.guides = [
      {
        start: { x: 220, y: 840 },
        end: { x: 220, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
      {
        start: { x: 320, y: 840 },
        end: { x: 320, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
      {
        start: { x: 220, y: 1100 },
        end: { x: 320, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
    ];

    const issues = analyzePlayability(board, {
      plungePowers: [],
      dropGridSpacing: 80,
      maxDropIssues: 4,
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'passive-ball-trap',
      }),
    );
  });
});
