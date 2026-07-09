import { describe, expect, it } from 'vitest';

import { harlemGlobetrottersTable } from '../src/boards/tables/harlem-globetrotters';
import { BUILT_IN_TABLES, getFlipperBySide } from '../src/boards/table-library';
import { physicsDefaults } from '../src/game/physics-defaults';
import { launchBall } from './helpers/game-fixture';

describe('harlemGlobetrottersTable', () => {
  it('matches the original table toy count and three-flipper layout', () => {
    expect(harlemGlobetrottersTable.bumpers).toHaveLength(3);
    expect(harlemGlobetrottersTable.standupTargets).toHaveLength(6);
    expect(harlemGlobetrottersTable.dropTargets).toHaveLength(4);
    expect(harlemGlobetrottersTable.saucers).toHaveLength(2);
    expect(harlemGlobetrottersTable.spinners).toHaveLength(3);
    expect(harlemGlobetrottersTable.flippers).toHaveLength(3);
    expect(
      getFlipperBySide(harlemGlobetrottersTable, 'right', 1).length,
    ).toBeGreaterThan(0);
  });

  it('is exposed in the built-in table library', () => {
    expect(
      BUILT_IN_TABLES.some((table) => table.id === 'harlem-globetrotters'),
    ).toBe(true);
  });

  it('launches harder than the global default from a full plunge', () => {
    const launched = launchBall(harlemGlobetrottersTable, {
      maxSteps: 45,
      stepSeconds: 1 / 60,
    });

    expect(
      harlemGlobetrottersTable.physics.plunger.maxReleaseSpeed,
    ).toBeGreaterThan(physicsDefaults.tuning.plunger.maxReleaseSpeed);
    expect(launched.status).toBe('playing');
    expect(launched.ball.linearVelocity.y).toBeLessThan(0);
    expect(Math.abs(launched.ball.linearVelocity.y)).toBeGreaterThan(
      physicsFloorForLaunch(),
    );
  });
});

const physicsFloorForLaunch = (): number => 150;
