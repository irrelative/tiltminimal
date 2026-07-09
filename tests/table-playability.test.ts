import { describe, expect, it } from 'vitest';

import { createBlankTable } from './helpers/board-fixture';
import { classicTable } from '../src/boards/tables/classic-table';
import {
  analyzePlayability,
  simulateDroppedBall,
  simulatePlunge,
} from '../src/validation/table-playability';

describe('table playability analysis', () => {
  it('reports a launcher that only moves the ball vertically', () => {
    const board = createBlankTable('No Shooter Exit');
    board.plunger.guideLength = board.launchPosition.y + board.ball.radius;
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

  it('can verify a full Classic plunge exits the shooter lane', () => {
    const result = simulatePlunge(classicTable, 1);

    expect(result.launched).toBe(true);
    expect(result.exitedShooterLane).toBe(true);
    expect(result.minX).toBeLessThan(650);
  });

  it('keeps Classic free of deep playability issues', () => {
    expect(analyzePlayability(classicTable, { mode: 'deep' })).toHaveLength(0);
  });

  it('classifies a clear dropped ball as draining', () => {
    const result = simulateDroppedBall(createBlankTable(), { x: 450, y: 760 });

    expect(result.outcome).toBe('drained');
  });

  it('reports passive trap pockets from seeded drop checks', () => {
    const board = createBlankTable('Trap Pocket');
    board.guides = [
      {
        start: { x: 330, y: 820 },
        end: { x: 330, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
      {
        start: { x: 430, y: 820 },
        end: { x: 430, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
      {
        start: { x: 330, y: 1100 },
        end: { x: 430, y: 1100 },
        thickness: 16,
        material: 'metalGuide',
      },
      {
        start: { x: 330, y: 820 },
        end: { x: 430, y: 820 },
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
