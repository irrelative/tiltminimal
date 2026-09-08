import { classicTable } from '../src/boards/tables/classic-table';
import {
  initializeRulesState,
  applyRulesFrame,
} from '../src/game/rules-engine';
import { describe, it, expect } from 'vitest';
import { createBlankTable } from './helpers/board-fixture';
import { createInitialGameState } from '../src/game/game-state';
import { stepGameFrame } from '../src/game/physics-engine';
import { idleInput } from './helpers/game-fixture';
import {
  resolveSlingshotCollisions,
  resolveRolloverTriggers,
  resolveBumperCollisions,
} from '../src/game/physics-engine-devices';
import type { GameEvent } from '../src/game/rules-types';

describe('physical contact regressions', () => {
  it.each([false, true])(
    'bounces off the underside without catching it (held=%s)',
    (held) => {
      const b = createBlankTable();
      b.gravity = 0;
      b.flippers = [
        { ...b.flippers[0], x: 200, y: 500, restingAngle: 0, activeAngle: 0 },
      ];
      let s = createInitialGameState(b);
      s.status = 'playing';
      s.launcherExited = true;
      s.ball.position = { x: 270, y: 540 };
      s.ball.linearVelocity = { x: 0, y: -200 };
      for (let i = 0; i < 40; i++)
        s = stepGameFrame(
          s,
          b,
          { ...idleInput, leftPressed: held },
          1 / 120,
        ).state;
      expect(s.ball.position.y).toBeGreaterThan(520);
      expect(s.ball.linearVelocity.y).toBeGreaterThan(0);
    },
  );
  it('uses the visible sling polygon and powers only its front edge', () => {
    const b = createBlankTable();
    b.flippers = [];
    b.slingshots = [
      {
        x: 400,
        y: 500,
        width: 144,
        height: 50,
        angle: 0,
        material: 'rubberPost',
        strength: 560,
        score: 10,
      },
    ];
    for (const [y, vy, contact, kick] of [
      [462, 200, false, false],
      [490, 200, true, true],
      [548, -200, true, false],
    ] as const) {
      const s = createInitialGameState(b);
      s.ball.position = { x: 400, y };
      s.ball.linearVelocity = { x: 0, y: vy };
      const events: GameEvent[] = [];
      resolveSlingshotCollisions(s, b, b.physics.solver, events);
      expect(s.ball.position.y !== y).toBe(contact);
      expect(events.length > 0).toBe(kick);
    }
  });
  it('kicks a ball clear of a bumper without continuous-contact score spam', () => {
    const b = createBlankTable();
    b.flippers = [];
    b.bumpers = [
      { x: 400, y: 500, radius: 40, material: 'rubberPost', score: 100 },
    ];
    const s = createInitialGameState(b);
    s.ball.position = { x: 400, y: 446 };
    s.ball.linearVelocity = { x: 0, y: 100 };
    const events: GameEvent[] = [];
    resolveBumperCollisions(s, b, b.physics.solver, events);
    expect(s.ball.linearVelocity.y).toBeLessThan(-500);
    for (let i = 0; i < 30; i++) {
      s.ball.position = { x: 400, y: 446 };
      s.ball.linearVelocity = { x: 0, y: 10 };
      resolveBumperCollisions(s, b, b.physics.solver, events);
    }
    expect(events).toHaveLength(1);
    s.ball.position = { x: 400, y: 420 };
    resolveBumperCollisions(s, b, b.physics.solver, events);
    s.bumpers[0].cooldownSeconds = 0;
    s.ball.position = { x: 400, y: 446 };
    s.ball.linearVelocity = { x: 0, y: 100 };
    resolveBumperCollisions(s, b, b.physics.solver, events);
    expect(events).toHaveLength(2);
  });
  it('rearms rollovers on exit independently of their lit state', () => {
    const b = createBlankTable();
    b.rollovers = [{ x: 400, y: 500, radius: 20, score: 300 }];
    const s = createInitialGameState(b),
      events: GameEvent[] = [];
    s.ball.position = { x: 400, y: 500 };
    resolveRolloverTriggers(s, b, events);
    resolveRolloverTriggers(s, b, events);
    expect(events).toHaveLength(1);
    s.ball.position.y = 600;
    resolveRolloverTriggers(s, b, events);
    s.ball.position.y = 500;
    resolveRolloverTriggers(s, b, events);
    expect(events).toHaveLength(2);
    expect(s.rollovers[0].lit).toBe(true);
  });
  it('allows Classic to complete its top lanes twice during one ball', () => {
    const b = classicTable;
    let s = initializeRulesState(createInitialGameState(b), b);
    for (let round = 0; round < 2; round++)
      for (const lane of b.rollovers) {
        s.ball.position = { x: 400, y: 800 };
        resolveRolloverTriggers(s, b, []);
        s.ball.position = { x: lane.x, y: lane.y };
        const events: GameEvent[] = [];
        resolveRolloverTriggers(s, b, events);
        s = applyRulesFrame(s, b, events, 1 / 120);
      }
    expect(s.rules.bonusMultiplier).toBe(3);
  });
});
