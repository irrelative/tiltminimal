import { createHash } from 'node:crypto';
import { justOneMoreTable } from '../src/boards/tables/just-one-more';
import { describe, expect, it } from 'vitest';
import { switchyardTable } from '../src/boards/tables/switchyard';
import { createPostPassCradle } from './helpers/post-pass';
import { idleInput } from './helpers/game-fixture';
import { stepGameFrame } from '../src/game/physics-engine';
import {
  getFlipperTipPosition,
  getFlipperTipRadius,
} from '../src/game/flipper-geometry';
import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import { cloneBoardDefinition } from '../src/boards/board-codec';
import {
  createInitialGameState,
  createBallState,
} from '../src/game/game-state';

describe.each([switchyardTable, justOneMoreTable])(
  '$name open shot geometry',
  (board) => {
    it('keeps scoring obstacles above the open lower middle and a ball-sized center drain', () => {
      expect(board.bumpers).toHaveLength(0);
      expect(board.dropTargets).toHaveLength(board === switchyardTable ? 3 : 0);
      expect(board.flippers).toHaveLength(2);
      expect(
        [
          ...board.standupTargets,
          ...board.dropTargets,
          ...board.saucers,
          ...board.spinners,
        ].every((element) => element.y < 760),
      ).toBe(true);
      expect(
        board.posts.every(
          (post) =>
            post.x < 240 || post.x > 660 || post.y > 1080 || post.y < 760,
        ),
      ).toBe(true);
      expect(board.guides.every((guide) => guide.plane !== 'raised')).toBe(
        true,
      );
      const [left, right] = board.flippers;
      const clearance =
        getFlipperTipPosition(right, right.restingAngle).x -
        getFlipperTipRadius(right) -
        getFlipperTipPosition(left, left.restingAngle).x -
        getFlipperTipRadius(left);
      expect(clearance).toBeGreaterThan(board.ball.radius * 2 + 10);
    });

    const shotCases: readonly (readonly [number, string, readonly number[]])[] =
      board === switchyardTable
        ? ([
            [0, 'drop-target-hit:2', [128, 129]],
            [0, 'drop-target-hit:1', [130, 131]],
            [1, 'drop-target-hit:0', [104, 105]],
            [0, 'standup-target-hit:0', [192, 193]],
            [0, 'standup-target-hit:1', [196, 197]],
            [0, 'saucer-captured:0', [189, 190]],
            [1, 'saucer-captured:0', [195, 196]],
            [1, 'orbit:0', [217, 218]],
            [0, 'orbit:5', [214, 218]],
          ] as const)
        : ([
            [0, 'standup-target-hit:1', [129, 130]],
            [1, 'standup-target-hit:0', [172, 173]],
            [0, 'standup-target-hit:3', [121, 122]],
            [1, 'standup-target-hit:2', [155, 156]],
            [0, 'saucer-captured:0', [192, 193]],
            [1, 'saucer-captured:0', [183, 184]],
            [0, 'orbit:2', [217, 218]],
            [1, 'orbit:0', [217, 218]],
          ] as const);
    it.each(shotCases)(
      'flipper %s reaches %s from the tested release timings',
      (source, expected, delays) => {
        const cradle = createPostPassCradle(board, source);
        for (const delay of delays) {
          let s = structuredClone(cradle),
            outcome = '',
            entry = -1,
            top = false;
          for (
            let frame = 0;
            frame < 1400 && !outcome && s.status === 'playing';
            frame++
          ) {
            const r = stepGameFrame(
              s,
              board,
              {
                ...idleInput,
                [source === 0 ? 'leftPressed' : 'rightPressed']: frame >= delay,
              },
              1 / 240,
            );
            s = r.state;
            for (const event of r.events) {
              if (
                event.type === 'standup-target-hit' ||
                event.type === 'drop-target-hit' ||
                event.type === 'saucer-captured'
              ) {
                outcome = event.type + ':' + event.index;
                break;
              }
              if (event.type === 'rollover-hit' && board === switchyardTable) {
                if (
                  top &&
                  event.index === (entry === 0 ? 2 : entry === 5 ? 7 : 5)
                )
                  outcome = 'orbit:' + (entry === 7 ? 5 : entry);
                else if (
                  event.index === 0 ||
                  event.index === 5 ||
                  event.index === 7
                ) {
                  entry = event.index;
                  top = false;
                } else if (entry >= 0 && event.index === (entry === 0 ? 1 : 6))
                  top = true;
              } else if (event.type === 'rollover-hit') {
                if (event.index === 1) top = entry >= 0;
                else if (entry >= 0 && top && entry !== event.index) {
                  outcome = 'orbit:' + entry;
                  break;
                } else {
                  entry = event.index;
                  top = false;
                }
              }
            }
          }
          expect(outcome, `release at ${delay}/240 s`).toBe(expected);
        }
      },
    );

    it('validates a sideways orbit switch using its authored approach, including blocking rails', () => {
      const b = cloneBoardDefinition(board);
      expect(
        validateCompiledBoardLayout(b).filter(
          (d) => d.code === 'rollover-unreachable',
        ),
      ).toEqual([]);
      b.rollovers[1].approachAngle = undefined;
      expect(
        validateCompiledBoardLayout(b).some(
          (d) => d.code === 'rollover-unreachable',
        ),
      ).toBe(true);
      b.rollovers[1].approachAngle = 0;
      b.guides.push({
        start: { x: 350, y: 40 },
        end: { x: 350, y: 300 },
        thickness: 12,
        material: 'metalGuide',
      });
      expect(
        validateCompiledBoardLayout(b).some(
          (d) => d.code === 'rollover-unreachable',
        ),
      ).toBe(true);
    });

    it('tags real switches with their physical ball and preserves identity after primary drain', () => {
      let s = createInitialGameState(board);
      s.status = 'playing';
      s.launcherExited = true;
      s.ball.id = 7;
      s.ball.position = { x: board.rollovers[0].x, y: board.rollovers[0].y };
      const second = createBallState(board);
      second.id = 8;
      second.launcherExited = true;
      second.position = { x: board.rollovers[2].x, y: board.rollovers[2].y };
      s.additionalBalls = [second];
      let r = stepGameFrame(s, board, idleInput, 1 / 120);
      expect(r.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'rollover-hit',
            index: 0,
            ballId: 7,
          }),
          expect.objectContaining({
            type: 'rollover-hit',
            index: 2,
            ballId: 8,
          }),
        ]),
      );
      s = r.state;
      s.ball.position.y = board.drainY + 100;
      r = stepGameFrame(s, board, idleInput, 1 / 120);
      expect(r.state.ball.id).toBe(8);
      expect(r.state.additionalBalls).toHaveLength(0);
    });
  },
);

it('preserves the entire Just One More definition while giving Switchyard distinct shots', () => {
  expect(
    createHash('sha256').update(JSON.stringify(justOneMoreTable)).digest('hex'),
  ).toBe('4fd44a55bf54ea0a65e5add5819188c26cd7252a347cf6228dd69c0400d497ae');
  expect(switchyardTable.spinners).toHaveLength(1);
  expect(switchyardTable.standupTargets).toHaveLength(2);
  expect(switchyardTable.dropTargets).toHaveLength(3);
  expect(switchyardTable.saucers[0].x).toBeLessThan(450);
  expect(switchyardTable.flippers).toEqual(justOneMoreTable.flippers);
  expect(switchyardTable.slingshots).toEqual(justOneMoreTable.slingshots);
});
