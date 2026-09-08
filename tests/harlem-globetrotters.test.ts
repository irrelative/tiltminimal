import {
  getFlipperTipPosition,
  getFlipperTipRadius,
} from '../src/game/flipper-geometry';
import { validateBallRoutes } from '../src/validation/ball-routes';
import { createInitialGameState } from '../src/game/game-state';
import { stepGameFrame } from '../src/game/physics-engine';
import { idleInput } from './helpers/game-fixture';
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
      getFlipperBySide(harlemGlobetrottersTable, 'left', 1).length,
    ).toBeGreaterThan(0);
  });

  it('places the original mechanisms in their photographed arrangement', () => {
    const b = harlemGlobetrottersTable;
    const left = b.flippers
      .filter((f) => f.side === 'left')
      .sort((a, b) => a.y - b.y);
    expect(left).toHaveLength(2);
    expect(left[0].x).toBeLessThan(left[1].x);
    expect(left[0].y).toBeLessThan(left[1].y);
    expect(b.flippers.filter((f) => f.side === 'right')).toHaveLength(1);
    expect(
      b.dropTargets.every((t) => t.angle === 0 && t.x === b.dropTargets[0].x),
    ).toBe(true);
    expect(b.saucers[1].y).toBeLessThan(
      Math.min(...b.dropTargets.map((t) => t.y)),
    );
    expect(b.standupTargets.slice(0, 5).every((t) => t.x < 150)).toBe(true);
    expect(b.standupTargets[5].x).toBeGreaterThan(700);
    expect(b.spinners[1].y).toBe(b.spinners[2].y);
    expect(b.themeId).toBe('harlem');
  });

  it('leaves a ball-width center drain between the lower flipper tips', () => {
    const b = harlemGlobetrottersTable;
    const left = b.flippers
      .filter((f) => f.side === 'left')
      .sort((a, b) => b.y - a.y)[0];
    const right = b.flippers.find((f) => f.side === 'right')!;
    const leftEdge =
      getFlipperTipPosition(left, left.restingAngle).x +
      getFlipperTipRadius(left);
    const rightEdge =
      getFlipperTipPosition(right, right.restingAngle).x -
      getFlipperTipRadius(right);
    expect(rightEdge - leftEdge).toBeGreaterThan(b.ball.radius * 2 + 20);
    const routes = b.routes!.filter((r) =>
      r.id.startsWith('harlem-center-drain-'),
    );
    expect(routes).toHaveLength(3);
    expect(validateBallRoutes({ ...b, routes })).toEqual([]);
  });

  it('feeds medium-to-full plunges into live play and detects a missing arch deflector', () => {
    const b = harlemGlobetrottersTable;
    const route = b.routes!.find((r) => r.id === 'harlem-shooter/plunge')!;
    expect(route.start.type).toBe('plunge');
    if (route.start.type !== 'plunge') throw new Error('Expected plunge');
    expect(route.start.powers).toEqual(
      Array.from({ length: 51 }, (_, i) => (50 + i) / 100),
    );
    expect(validateBallRoutes({ ...b, routes: [route] })).toEqual([]);

    // The previous open arch passed the upper region but sent every launch
    // along the left wall into the outlane. Keep that failure reproducible.
    const guides = b.guides.filter(
      (g) => !(g.kind === 'line' && g.start.x === 220 && g.end.x === 270),
    );
    expect(guides).toHaveLength(b.guides.length - 1);
    const failures = validateBallRoutes({ ...b, guides, routes: [route] });
    expect(failures).toHaveLength(route.start.powers.length);
    expect(
      failures.every((f) => f.message.includes('drained before goal 2')),
    ).toBe(true);
  });

  it('requires successive shots through the inline bank before reaching its saucer', () => {
    const b = harlemGlobetrottersTable;
    let state = createInitialGameState(b);
    for (let shot = 0; shot < 5; shot++) {
      state.status = 'playing';
      state.launcherExited = true;
      state.ball.position = { x: 749, y: 720 };
      state.ball.linearVelocity = { x: 0, y: -1700 };
      const hits: number[] = [];
      let captured = false;
      for (let step = 0; step < 160; step++) {
        const frame = stepGameFrame(state, b, idleInput, 1 / 120);
        state = frame.state;
        for (const event of frame.events) {
          if (event.type === 'drop-target-hit') hits.push(event.index);
          if (event.type === 'saucer-captured' && event.index === 1)
            captured = true;
        }
        if (hits.length || captured) break;
      }
      if (shot < 4) {
        expect(hits).toEqual([shot]);
        expect(captured).toBe(false);
      } else expect(captured).toBe(true);
    }
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
