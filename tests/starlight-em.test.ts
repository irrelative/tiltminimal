import { describe, expect, it } from 'vitest';

import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import { starlightEmTable } from '../src/boards/tables/starlight-em-table';
import { analyzeBoard } from '../src/validation/table-analysis';
import { stepGame } from '../src/game/physics-engine';
import { idleInput, launchBall } from './helpers/game-fixture';

describe('starlightEmTable', () => {
  it('exposes a valid EM-style built-in table', () => {
    expect(starlightEmTable.name).toBe('Starlight EM');
    expect(starlightEmTable.themeId).toBe('sunburst');
    expect(starlightEmTable.rulesScript).toContain('BALLS_PER_GAME = 5');
    expect(starlightEmTable.bumpers).toHaveLength(3);
    expect(starlightEmTable.spinners).toHaveLength(2);
    expect(starlightEmTable.saucers).toHaveLength(1);
    expect(starlightEmTable.standupTargets).toHaveLength(6);
    expect(starlightEmTable.slingshots).toHaveLength(2);
    expect(starlightEmTable.rollovers).toHaveLength(4);
    expect(starlightEmTable.dropTargets).toHaveLength(0);
    expect(starlightEmTable.flippers).toHaveLength(2);
  });

  it('is exposed in the built-in table library', () => {
    expect(BUILT_IN_TABLES.some((table) => table.id === 'starlight-em')).toBe(
      true,
    );
  });

  it('passes playability validation for the launcher and top arch', () => {
    const diagnostics = validateCompiledBoardLayout(starlightEmTable);
    const errorCodes = diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => diagnostic.code);

    expect(errorCodes).not.toContain('launcher-blocked');
    expect(errorCodes).not.toContain('rollover-unreachable');
    expect(errorCodes).not.toContain('flipper-keepout');
    expect(errorCodes).not.toContain('spinner-obstructed');
  });

  it('can full-plunge the ball into the upper playfield', () => {
    let launched = launchBall(starlightEmTable, { chargeSeconds: 1.2 });
    const initialLaunch = {
      velocity: { ...launched.ball.linearVelocity },
      position: { ...launched.ball.position },
    };
    let minY = launched.ball.position.y;

    for (let step = 0; step < 120; step += 1) {
      launched = stepGame(launched, starlightEmTable, idleInput, 1 / 60);
      minY = Math.min(minY, launched.ball.position.y);
    }

    expect(initialLaunch.velocity.y).toBeLessThan(-1600);
    expect(minY).toBeLessThan(280);
  });

  it('uses solid curved returns with clear flipper feeds', () => {
    const raisedGuides = starlightEmTable.guides.filter(
      (guide) => guide.plane === 'raised',
    );

    expect(raisedGuides).toHaveLength(0);
  });

  it('leaves the center spinner rotation envelope clear of guides', () => {
    const centerSpinner = starlightEmTable.spinners[1];

    expect(centerSpinner).toBeDefined();
    if (!centerSpinner) {
      throw new Error('Expected Starlight center spinner.');
    }

    const nearestGuideDistance = Math.min(
      ...starlightEmTable.guides.map((guide) =>
        guide.kind === 'arc'
          ? Math.abs(
              Math.hypot(
                guide.center.x - centerSpinner.x,
                guide.center.y - centerSpinner.y,
              ) - guide.radius,
            ) -
            guide.thickness / 2
          : distanceToSegment(centerSpinner, guide.start, guide.end) -
            guide.thickness / 2,
      ),
    );

    expect(nearestGuideDistance).toBeGreaterThan(centerSpinner.length / 2);
  });

  it('clears the geometry analysis checks', () => {
    expect(analyzeBoard(starlightEmTable)).toHaveLength(0);
  });
});

const distanceToSegment = (
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  );
  const closestX = start.x + dx * projection;
  const closestY = start.y + dy * projection;

  return Math.hypot(point.x - closestX, point.y - closestY);
};
