import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { classicTable } from '../src/boards/tables/classic-table';
import { cloneBoardDefinition } from '../src/boards/board-codec';
import { simulateCradleFeed } from '../src/validation/ball-routes';
import { createInitialGameState } from '../src/game/game-state';
import { stepGameFrame } from '../src/game/physics-engine';
import { sampleFlipperProfile } from '../src/game/flipper-geometry';
import { idle } from '../src/playtest/simulation';

describe('return lanes and held flippers', () => {
  for (const { id, board } of BUILT_IN_TABLES) {
    it(`${id} cradles its declared feeds on every flipper`, () => {
      const routes = board.routes!.filter((r) => r.cradle);
      expect(
        board.flippers.every((f) =>
          routes.some(
            (r) => r.cradle!.pivot.x === f.x && r.cradle!.pivot.y === f.y,
          ),
        ),
      ).toBe(true);
      for (const route of routes) {
        if (route.start.type !== 'feed') throw new Error('Expected feed');
        for (let i = 0; i < route.start.velocities.length; i++)
          expect(
            simulateCradleFeed(board, route, i),
            `${route.id} sample ${i}`,
          ).toBeNull();
      }
    });
    it(`${id} releases a caught return when the player lowers the flipper`, () => {
      for (const route of board.routes!.filter((r) => r.cradle)) {
        if (route.start.type !== 'feed') throw new Error('Expected feed');
        const index = board.flippers.findIndex(
            (f) =>
              f.x === route.cradle!.pivot.x && f.y === route.cradle!.pivot.y,
          ),
          f = board.flippers[index];
        let s = createInitialGameState(board);
        s.status = 'playing';
        s.launcherExited = true;
        s.ball.position = { ...route.start.position };
        s.ball.linearVelocity = { ...route.start.velocities[0] };
        s.flippers.forEach((sf, i) => {
          if (board.flippers[i].side === f.side) {
            sf.angle = board.flippers[i].activeAngle;
            sf.engaged = true;
          }
        });
        const held = {
          ...idle,
          leftPressed: f.side === 'left',
          rightPressed: f.side === 'right',
        };
        for (let n = 0; n < 480; n++)
          s = stepGameFrame(s, board, held, 1 / 120).state;
        const p = sampleFlipperProfile(
          s.ball.position,
          f,
          s.flippers[index].angle,
        );
        expect(p.distance).toBeLessThan(p.radius + s.ball.radius + 1);
        const caught = { ...s.ball.position };
        for (let n = 0; n < 120; n++)
          s = stepGameFrame(s, board, idle, 1 / 120).state;
        expect(
          Math.hypot(
            s.ball.position.x - caught.x,
            s.ball.position.y - caught.y,
          ),
        ).toBeGreaterThan(20);
      }
    });
  }
  it('rejects a return exit raised away from the heel', () => {
    const board = cloneBoardDefinition(classicTable),
      route = board.routes!.find((r) => r.id.endsWith('/inlane-0'))!;
    for (const guide of board.guides.slice(0, 4)) {
      if (guide.kind === 'arc') guide.center.y -= 51;
      else guide.end.y -= 51;
    }
    expect(simulateCradleFeed(board, route, 4)).not.toBeNull();
  });
});

describe('held-flipper capture limits', () => {
  it.each([900, 1600])(
    'handles an incoming speed of %s without catching fast impacts indiscriminately',
    (speed) => {
      const b = classicTable,
        f = b.flippers[0],
        angle = f.activeAngle;
      let state = createInitialGameState(b);
      state.status = 'playing';
      state.launcherExited = true;
      state.flippers[0] = { engaged: true, angle, angularVelocity: 0 };
      const radius =
        (f.thickness / 2) * (1 - 0.28 * 0.35) + state.ball.radius - 1;
      state.ball.position = {
        x: f.x + Math.cos(angle) * f.length * 0.35 + Math.sin(angle) * radius,
        y: f.y + Math.sin(angle) * f.length * 0.35 - Math.cos(angle) * radius,
      };
      state.ball.linearVelocity = { x: 0, y: speed };
      state = stepGameFrame(
        state,
        b,
        { ...idle, leftPressed: true },
        1 / 120,
      ).state;
      expect(
        Math.abs(
          state.ball.linearVelocity.x * Math.sin(angle) -
            state.ball.linearVelocity.y * Math.cos(angle),
        ) < 1,
      ).toBe(speed === 900);
      if (speed === 900) {
        const caught = { ...state.ball.position };
        for (let frame = 0; frame < 1200; frame++)
          state = stepGameFrame(
            state,
            b,
            { ...idle, leftPressed: true },
            1 / 120,
          ).state;
        expect(
          Math.hypot(
            state.ball.position.x - caught.x,
            state.ball.position.y - caught.y,
          ),
        ).toBeGreaterThan(5);
        expect(
          sampleFlipperProfile(state.ball.position, f, angle).t,
        ).toBeCloseTo((state.ball.radius + f.thickness / 2) / f.length, 2);
        expect(
          Math.hypot(state.ball.linearVelocity.x, state.ball.linearVelocity.y),
        ).toBeLessThan(1);
      }
    },
  );
});

it.each(BUILT_IN_TABLES)(
  '$id rolls a caught ball toward each heel before settling',
  ({ board }) => {
    for (const [index, f] of board.flippers.entries()) {
      const angle = f.activeAngle;
      const axis = { x: Math.cos(angle), y: Math.sin(angle) };
      const normal =
        f.side === 'left'
          ? { x: axis.y, y: -axis.x }
          : { x: -axis.y, y: axis.x };
      let state = createInitialGameState(board);
      state.status = 'playing';
      state.launcherExited = true;
      state.flippers[index] = { engaged: true, angle, angularVelocity: 0 };
      const radius =
        (f.thickness / 2) * (1 - 0.28 * 0.5) + state.ball.radius - 0.01;
      state.ball.position = {
        x: f.x + axis.x * f.length * 0.5 + normal.x * radius,
        y: f.y + axis.y * f.length * 0.5 + normal.y * radius,
      };
      const held = {
        ...idle,
        leftPressed: f.side === 'left',
        rightPressed: f.side === 'right',
      };
      for (let frame = 0; frame < 12; frame++)
        state = stepGameFrame(state, board, held, 1 / 120).state;
      const rolling = sampleFlipperProfile(state.ball.position, f, angle).t;
      expect(rolling).toBeLessThan(0.5);
      expect(rolling).toBeGreaterThan(0.3);
      expect(
        Math.hypot(state.ball.angularVelocity.x, state.ball.angularVelocity.y),
      ).toBeGreaterThan(0);
      for (let frame = 0; frame < 600; frame++)
        state = stepGameFrame(state, board, held, 1 / 120).state;
      expect(state.status).toBe('playing');
      expect(sampleFlipperProfile(state.ball.position, f, angle).t).toBeCloseTo(
        (state.ball.radius + f.thickness / 2) / f.length,
        2,
      );
      expect(
        Math.hypot(state.ball.linearVelocity.x, state.ball.linearVelocity.y),
      ).toBeLessThan(1);
    }
  },
);

it.each(BUILT_IN_TABLES)(
  '$id clears slow balls from both sides of every inlane heel without nudging',
  ({ board }) => {
    for (const route of board.routes!.filter(
      (r) => r.cradle && r.id.includes('/inlane-'),
    )) {
      const f = board.flippers.find(
        (f) => f.x === route.cradle!.pivot.x && f.y === route.cradle!.pivot.y,
      )!;
      const outward = f.side === 'left' ? -1 : 1;
      for (const offset of [12, 20, 28]) {
        for (const speed of [0, 80]) {
          let state = createInitialGameState(board);
          state.status = 'playing';
          state.launcherExited = true;
          state.ball.position = { x: f.x + outward * offset, y: f.y - 65 };
          state.ball.linearVelocity = { x: 0, y: speed };
          // Slow feeds exposed a persistent wedge that ordinary fast lane
          // entry samples missed. Require departure from the heel region.
          let escaped = false;
          for (let frame = 0; frame < 360; frame++) {
            state = stepGameFrame(state, board, idle, 1 / 120).state;
            if (
              state.status !== 'playing' ||
              state.ball.position.y > f.y + 40 ||
              -outward * (state.ball.position.x - f.x) > 80
            ) {
              escaped = true;
              break;
            }
          }
          expect(escaped, `${route.id}, offset ${offset}, speed ${speed}`).toBe(
            true,
          );
        }
      }
    }
  },
);
