import { describe, expect, it } from 'vitest';

import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import { classicTable } from '../src/boards/tables/classic-table';
import { analyzeBoard } from '../src/validation/table-analysis';
import { getPlungerLaneHalfWidth } from '../src/game/plunger-geometry';
import { stepGame, stepGameFrame } from '../src/game/physics-engine';
import { createInitialGameState } from '../src/game/game-state';
import { getDistanceToFlipperSurface } from '../src/game/flipper-geometry';
import { idleInput, launchBall } from './helpers/game-fixture';

describe('classicTable', () => {
  it('exposes a valid board definition', () => {
    expect(classicTable.width).toBeGreaterThan(0);
    expect(classicTable.height).toBeGreaterThan(0);
    expect(classicTable.ball.radius).toBeGreaterThan(0);
    expect(classicTable.ball.mass).toBeGreaterThan(0);
    expect(classicTable.plunger.length).toBeGreaterThan(0);
    expect(classicTable.plunger.travel).toBeGreaterThan(0);
    expect(classicTable.plunger.guideLength).toBeGreaterThan(0);
    expect(classicTable.materials.playfield).toBe('playfieldWood');
    expect(classicTable.rulesScript).toContain('BALLS_PER_GAME');
    expect(classicTable.bumpers).toHaveLength(3);
    expect(classicTable.standupTargets).toHaveLength(3);
    expect(classicTable.dropTargets).toHaveLength(1);
    expect(classicTable.saucers).toHaveLength(1);
    expect(classicTable.spinners).toHaveLength(1);
    expect(classicTable.slingshots).toHaveLength(2);
    expect(classicTable.rollovers).toHaveLength(3);
    expect(classicTable.posts).toHaveLength(4);
    expect(classicTable.guides.length).toBeGreaterThanOrEqual(17);
    expect(classicTable.bumpers[0]?.material).toBe('rubberPost');
    expect(classicTable.flippers).toHaveLength(2);
    expect(classicTable.flippers[0]?.length).toBeGreaterThan(0);
    expect(classicTable.flippers[0]?.material).toBe('flipperRubber');
    expect(classicTable.flippers[1]?.side).toBe('right');
  });

  it('passes canonical layout validation checks', () => {
    const diagnostics = validateCompiledBoardLayout(classicTable);
    const errorCodes = diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => diagnostic.code);

    expect(errorCodes).not.toContain('launcher-blocked');
    expect(errorCodes).not.toContain('rollover-unreachable');
    expect(errorCodes).not.toContain('flipper-keepout');
    expect(errorCodes).not.toContain('spinner-obstructed');
  });

  it('clears the geometry analysis checks', () => {
    expect(analyzeBoard(classicTable)).toHaveLength(0);
  });

  it('can full-plunge the ball out of the shooter lane into the playfield', () => {
    let launched = launchBall(classicTable);
    let minX = launched.ball.position.x;
    let minY = launched.ball.position.y;

    for (let step = 0; step < 120; step += 1) {
      launched = stepGame(launched, classicTable, idleInput, 1 / 60);
      minX = Math.min(minX, launched.ball.position.x);
      minY = Math.min(minY, launched.ball.position.y);
    }

    const shooterLaneExitX =
      classicTable.plunger.x - getPlungerLaneHalfWidth(classicTable.plunger);

    expect(minY).toBeLessThan(280);
    expect(minX).toBeLessThan(shooterLaneExitX - classicTable.ball.radius * 2);
  });

  it('keeps every lower return rail solid', () => {
    expect(classicTable.guides.every((guide) => guide.plane !== 'raised')).toBe(
      true,
    );
  });
});

const seedBall = (x: number, y: number, vx = 0, vy = 0) => {
  const state = createInitialGameState(classicTable);
  state.status = 'playing';
  state.launcherExited = true;
  state.ball.position = { x, y };
  state.ball.linearVelocity = { x: vx, y: vy };
  return state;
};

describe('classic ball routes', () => {
  it.each([
    { shot: 'standup-target-hit', offset: 130, vx: 0, vy: 200, delay: 0 },
    { shot: 'drop-target-hit', offset: 90, vx: 0, vy: 200, delay: 40 },
    { shot: 'saucer-captured', offset: 120, vx: 100, vy: 100, delay: 26 },
  ])(
    'can aim a flipper shot directly at $shot',
    ({ shot, offset, vx, vy, delay }) => {
      let state = seedBall(classicTable.flippers[0].x + offset, 1160, vx, vy);
      let firstEvent: string | undefined;
      for (let frame = 0; frame < 240; frame += 1) {
        const result = stepGameFrame(
          state,
          classicTable,
          {
            ...idleInput,
            leftPressed: frame >= delay && frame < delay + 25,
          },
          1 / 120,
        );
        state = result.state;
        firstEvent = result.events[0]?.type;
        if (firstEvent) break;
      }
      expect(firstEvent).toBe(shot);
    },
  );

  it('carries an upward spinner shot into the upper playfield', () => {
    let state = seedBall(100, 740, 0, -1800);
    let spun = false;
    let reachedTop = false;
    for (let frame = 0; frame < 360; frame += 1) {
      const result = stepGameFrame(state, classicTable, idleInput, 1 / 120);
      state = result.state;
      spun ||= result.events.some((event) => event.type === 'spinner-spin');
      reachedTop ||= spun && state.ball.position.y < 300;
      if (reachedTop || state.status !== 'playing') break;
    }
    expect(spun).toBe(true);
    expect(reachedTop).toBe(true);
  });

  it.each([0.1, 0.35, 0.55, 0.8, 1])(
    'feeds a top rollover from a %s plunge',
    (power) => {
      let state = launchBall(classicTable, {
        chargeSeconds: classicTable.physics.plunger.maxPullSeconds * power,
      });
      let hitLane = false;
      for (let frame = 0; frame < 480; frame += 1) {
        const result = stepGameFrame(state, classicTable, idleInput, 1 / 120);
        state = result.state;
        hitLane ||= result.events.some(
          (event) => event.type === 'rollover-hit',
        );
        if (hitLane || state.status !== 'playing') break;
      }
      expect(hitLane).toBe(true);
      expect(state.launcherExited).toBe(true);
    },
  );

  it.each([0, 1])(
    'feeds inlane %s onto its own flipper at varied entry speeds',
    (side) => {
      for (const vx of [-40, 0, 40])
        for (const vy of [0, 250, 500]) {
          let state = seedBall(side === 0 ? 120 : 688, 930, vx, vy);
          let touched = false;
          for (let frame = 0; frame < 480; frame += 1) {
            state = stepGame(state, classicTable, idleInput, 1 / 120);
            const distance = getDistanceToFlipperSurface(
              state.ball.position,
              classicTable.flippers[side],
              state.flippers[side].angle,
            );
            touched ||= distance <= classicTable.ball.radius + 0.1;
            if (touched || state.status !== 'playing') break;
          }
          expect(touched, `side ${side}, velocity ${vx}, ${vy}`).toBe(true);
        }
    },
  );

  it.each([52, 756])('drains outlane %s without crossing a flipper', (x) => {
    let state = seedBall(x, 930, 0, 200);
    for (let frame = 0; frame < 480; frame += 1) {
      state = stepGame(state, classicTable, idleInput, 1 / 120);
      if (state.status !== 'playing') break;
      for (const flipper of classicTable.flippers) {
        expect(
          getDistanceToFlipperSurface(state.ball.position, flipper),
        ).toBeGreaterThan(classicTable.ball.radius);
      }
    }
    expect(state.status).toBe('waiting-launch');
  });

  it.each([-40, 0, 40])(
    'captures and ejects the saucer approach with lateral speed %s',
    (vx) => {
      let state = seedBall(670, 610, vx, -1050);
      let captured = false;
      let returned = false;
      for (let frame = 0; frame < 360; frame += 1) {
        const result = stepGameFrame(state, classicTable, idleInput, 1 / 120);
        state = result.state;
        captured ||= result.events.some(
          (event) => event.type === 'saucer-captured',
        );
        returned ||=
          captured && !state.saucers[0].occupied && state.ball.position.y > 650;
        if (returned) break;
      }
      expect(captured).toBe(true);
      expect(returned).toBe(true);
      expect(state.ball.position.x).toBeGreaterThan(610);
      expect(state.ball.position.x).toBeLessThan(680);
    },
  );
});
