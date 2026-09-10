import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { stepGameFrame } from '../src/game/physics-engine';
import { getPhysicsSandboxSpawnBlockedReason } from '../src/game/physics-sandbox';
import {
  createFallingSkill,
  runFallingSkill,
  runSlapSave,
  skillStep,
} from './helpers/flipper-skills';
import { idleInput } from './helpers/game-fixture';
import { createPostPassCradle, isSettledOn } from './helpers/post-pass';

describe('advanced flipper skills on complete built-in tables', () => {
  for (const { id, board } of BUILT_IN_TABLES) {
    for (const [source, flipper] of board.flippers.entries()) {
      it(`${id} flipper ${source + 1} shoots from a cradle with timing-dependent aim`, () => {
        const timings =
          id === 'andromeda' && source === 0
            ? [33, 34]
            : id === 'harlem-globetrotters' && source === 2
              ? [25, 26]
              : [18, 21];
        const crossings: number[] = [];
        for (const delay of timings) {
          let state = createPostPassCradle(board, source);
          expect(isSettledOn(state, board, source)).toBe(true);
          let slingFired = false;
          for (let frame = 0; frame < 180; frame++) {
            const result = stepGameFrame(
              state,
              board,
              {
                ...idleInput,
                [flipper.side === 'left' ? 'leftPressed' : 'rightPressed']:
                  frame >= delay,
              },
              skillStep,
            );
            state = result.state;
            slingFired ||= result.events.some(
              (e) => e.type === 'slingshot-hit',
            );
            if (
              state.ball.position.y < flipper.y - 220 &&
              state.ball.linearVelocity.y < 0
            ) {
              crossings.push(state.ball.position.x);
              break;
            }
            if (state.status !== 'playing') break;
          }
          expect(slingFired).toBe(false);
        }
        expect(crossings).toHaveLength(2);
        expect(Math.abs(crossings[0] - crossings[1])).toBeGreaterThan(2);
      });

      it(`${id} flipper ${source + 1} dead-bounces varied feeds to an opposite flipper without input`, () => {
        for (const speed of [400, 600]) {
          const setup = {
            skill: 'dead-bounce' as const,
            source,
            speed,
            delay: 0,
            impactPosition: 0.4,
          };
          const start = createFallingSkill(board, setup);
          expect(
            getPhysicsSandboxSpawnBlockedReason(
              board,
              start.ball.position,
              start,
            ),
          ).toBeNull();
          const result = runFallingSkill(board, setup);
          expect(result.firstContactFrame).toBeGreaterThan(0);
          expect(result.receiver).toBeGreaterThanOrEqual(0);
          expect(board.flippers[result.receiver].side).not.toBe(flipper.side);
          expect(result.slingFired).toBe(false);
          expect(result.state.flippers.every((f) => !f.engaged)).toBe(true);
        }
      });

      it(`${id} flipper ${source + 1} live-catches at the end of a timed upstroke and releases cleanly`, () => {
        // Harlem's larger stroke needs one more frame to reach the end stop.
        const delay = id === 'harlem-globetrotters' ? 7 : 8;
        for (const speed of [575, 600, 625]) {
          const setup = {
            skill: 'live-catch' as const,
            source,
            speed,
            delay,
            impactPosition: 0.65,
          };
          const start = createFallingSkill(board, setup);
          expect(
            getPhysicsSandboxSpawnBlockedReason(
              board,
              start.ball.position,
              start,
            ),
          ).toBeNull();
          const good = runFallingSkill(board, setup);
          expect(good.liveCaught).toBe(true);
          expect(good.firstContactSpeed).toBeLessThan(100);
          expect(good.caught).toBe(true);
          expect(good.slingFired).toBe(false);
          const early = runFallingSkill(board, { ...setup, delay: 0 });
          const late = runFallingSkill(board, { ...setup, delay: 13 });
          expect(early.liveCaught).toBe(false);
          expect(early.firstContactSpeed).toBeGreaterThan(
            good.firstContactSpeed * 3,
          );
          expect(late.firstContactSpeed).toBeGreaterThan(500);
          expect(late.firstContactSpeed).toBeGreaterThan(
            good.firstContactSpeed * 3,
          );
          let released = stepGameFrame(
            good.state,
            board,
            idleInput,
            skillStep,
          ).state;
          expect(released.ball.liveCatchFlipper).toBeUndefined();
          for (let n = 0; n < 120; n++)
            released = stepGameFrame(
              released,
              board,
              idleInput,
              skillStep,
            ).state;
          expect(isSettledOn(released, board, source)).toBe(false);
          expect(
            Math.hypot(
              released.ball.position.x - good.state.ball.position.x,
              released.ball.position.y - good.state.ball.position.y,
            ),
          ).toBeGreaterThan(board.ball.radius);
        }
      });

      it(`${id} flipper ${source + 1} softens a drop catch while the bat retreats`, () => {
        for (const speed of [575, 600, 625]) {
          const setup = {
            skill: 'drop-catch' as const,
            source,
            speed,
            delay: 10,
            impactPosition: 0.2,
          };
          const start = createFallingSkill(board, setup);
          expect(
            getPhysicsSandboxSpawnBlockedReason(
              board,
              start.ball.position,
              start,
            ),
          ).toBeNull();
          const good = runFallingSkill(board, setup);
          const early = runFallingSkill(board, { ...setup, delay: 0 });
          expect(good.firstContactFrame).toBeGreaterThanOrEqual(setup.delay);
          expect(good.firstContactFrame).toBeLessThanOrEqual(setup.delay + 3);
          expect(good.firstContactSpeed).toBeLessThan(400);
          expect(good.minimumContactSpeed).toBeLessThan(300);
          expect(good.firstContactSpeed).toBeLessThan(
            early.firstContactSpeed * 0.55,
          );
          expect(good.liveCaught).toBe(false);
        }
      });
    }

    it(`${id} permits a timed slap save near the lower flipper tip`, () => {
      const source = id === 'harlem-globetrotters' ? 2 : 0;
      const flipFrame = id === 'harlem-globetrotters' ? 10 : 12;
      expect(runSlapSave(board, source, -1, 999)).toEqual({
        saved: false,
        drained: true,
      });
      expect(runSlapSave(board, source, -1, flipFrame)).toEqual({
        saved: false,
        drained: true,
      });
      expect(runSlapSave(board, source, 6, flipFrame)).toEqual({
        saved: true,
        drained: false,
      });
    });
  }
});
