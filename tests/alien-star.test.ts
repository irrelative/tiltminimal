import { isSettledOn } from './helpers/post-pass';
import { describe, expect, it } from 'vitest';
import { alienStarTable as board } from '../src/boards/tables/alien-star';
import { createInitialGameState, type GameState } from '../src/game/game-state';
import {
  applyRulesFrame,
  initializeRulesState,
} from '../src/game/rules-engine';
import { stepGameFrame } from '../src/game/physics-engine';
import {
  getFlipperTipPosition,
  getFlipperTipRadius,
} from '../src/game/flipper-geometry';
import { idleInput } from './helpers/game-fixture';
const start = () => initializeRulesState(createInitialGameState(board), board);
const hit = (
  s: GameState,
  type: 'standup-target-hit' | 'spinner-spin' | 'rollover-hit' | 'bumper-hit',
  index = 0,
) =>
  applyRulesFrame(
    s,
    board,
    [{ type, index, score: 0, tick: s.tick, ballId: s.ball.id }],
    0,
  );
const event = (
  s: GameState,
  type: 'ball-drained' | 'ball-launched' | 'multiball-ended',
) => applyRulesFrame(s, board, [{ type, tick: s.tick }], 0);
const qualify = (s: GameState) => {
  for (let i = 0; i < 5; i++) hit(s, 'standup-target-hit', i);
  return s;
};

describe('Alien Star reference recreation', () => {
  it('preserves the mechanism counts and an unobstructed ball-sized drain', () => {
    expect(board.flippers).toHaveLength(2);
    expect(board.bumpers).toHaveLength(3);
    expect(board.spinners).toHaveLength(1);
    expect(board.saucers).toHaveLength(1);
    expect(board.standupTargets).toHaveLength(6);
    expect(board.dropTargets).toHaveLength(0);
    const [l, r] = board.flippers;
    const gap =
      getFlipperTipPosition(r, r.restingAngle).x -
      getFlipperTipRadius(r) -
      getFlipperTipPosition(l, l.restingAngle).x -
      getFlipperTipRadius(l);
    expect(gap).toBeGreaterThan(board.ball.radius * 2 + 20);
    expect(
      board.routes!.filter(
        (r) => r.avoidFlippers && r.id.includes('center-drain'),
      ),
    ).toHaveLength(3);
  });
  it('keeps the spinner inboard of the lock with an open right-flipper route', () => {
    expect(board.spinners[0].x).toBeGreaterThan(
      board.saucers[0].x + board.ball.radius * 2,
    );
    expect(
      board.routes!.some((r) => r.id === 'alien-star-right-flipper-spinner'),
    ).toBe(true);
  });
  it('shoots the spinner directly with the right flipper', () => {
    let s = createInitialGameState(board);
    s.status = 'playing';
    s.launcherExited = true;
    s.ball.position = { x: 490, y: 1360 };
    s.ball.linearVelocity = { x: 0, y: 800 };
    let touched = false,
      spun = false;
    for (let n = 0; n < 120 && !spun; n++) {
      const r = stepGameFrame(
        s,
        board,
        { ...idleInput, rightPressed: n >= 10 },
        1 / 120,
      );
      s = r.state;
      expect(
        r.events.some((e) =>
          [
            'bumper-hit',
            'slingshot-hit',
            'standup-target-hit',
            'saucer-captured',
            'ball-drained',
          ].includes(e.type),
        ),
      ).toBe(false);
      if (s.ball.position.y < 1300 && !touched) {
        // The old inner-rail endpoint reverses this flight. A rebound into
        // the spinner does not satisfy the direct shot regression.
        expect(s.ball.linearVelocity.x).toBeLessThan(0);
        expect(s.ball.linearVelocity.y).toBeLessThan(0);
      }
      touched ||= s.ball.spinnerContacts?.[0] ?? false;
      spun = r.events.some((e) => e.type === 'spinner-spin' && e.index === 0);
    }
    expect(touched).toBe(true);
    expect(spun).toBe(true);
  });
  it.each([0.35, 0.45, 0.6])(
    'accepts a diagonal shot from the right flipper area over %ss',
    (flightTime) => {
      let s = createInitialGameState(board);
      s.status = 'playing';
      s.launcherExited = true;
      s.ball.position = { x: 490, y: 1320 };
      s.ball.linearVelocity = {
        x: (board.saucers[0].x - s.ball.position.x) / flightTime,
        y:
          (board.saucers[0].y -
            s.ball.position.y -
            0.5 * board.gravity * flightTime ** 2) /
          flightTime,
      };
      let captured = false;
      for (let n = 0; n < 240 && !captured; n++) {
        const r = stepGameFrame(s, board, idleInput, 1 / 120);
        s = r.state;
        captured = r.events.some((e) => e.type === 'saucer-captured');
      }
      expect(captured).toBe(true);
    },
  );
  it.each([0, 400])(
    'can save an upper-left feed beside the lock at speed %s',
    (speed) => {
      let s = createInitialGameState(board);
      s.status = 'playing';
      s.launcherExited = true;
      s.ball.position = { x: 45, y: 620 };
      s.ball.linearVelocity = { x: 0, y: speed };
      s.flippers[0].angle = board.flippers[0].activeAngle;
      s.flippers[0].engaged = true;
      let settled = 0;
      for (let n = 0; n < 720 && settled < 60; n++) {
        s = stepGameFrame(
          s,
          board,
          { ...idleInput, leftPressed: true },
          1 / 120,
        ).state;
        settled = isSettledOn(s, board, 0) ? settled + 1 : 0;
        if (s.status !== 'playing') break;
      }
      expect(settled).toBe(60);
      const before = { ...s.ball.position };
      for (let n = 0; n < 120; n++)
        s = stepGameFrame(s, board, idleInput, 1 / 120).state;
      expect(
        Math.hypot(s.ball.position.x - before.x, s.ball.position.y - before.y),
      ).toBeGreaterThan(board.ball.radius);
    },
  );
  it('scores fresh ALIEN letters differently from repeats and preserves qualification', () => {
    const s = start();
    hit(s, 'standup-target-hit');
    hit(s, 'standup-target-hit');
    expect(s.score).toBe(4000);
    expect(s.rules.bonus).toBe(2000);
    event(s, 'ball-drained');
    expect(s.rules.playerValues.alien).toBe(1);
    for (let i = 1; i < 5; i++) hit(s, 'standup-target-hit', i);
    expect(s.rules.playerValues['lock-lit']).toBe(true);
    expect(s.rules.ballValues.awards).toBe(1);
    event(s, 'ball-drained');
    expect(s.rules.playerValues['lock-lit']).toBe(true);
    expect(s.rules.ballValues.awards).toBe(0);
  });
  it('times the right-inlane spinner award and cycles the multiplier outside multiball', () => {
    const s = start();
    hit(s, 'spinner-spin');
    expect(s.score).toBe(1000);
    expect(s.rules.playerValues.selector).toBe(1);
    hit(s, 'rollover-hit', 5);
    const before = s.score;
    hit(s, 'spinner-spin');
    expect(s.score - before).toBe(10000);
    expect(s.rules.playerValues.selector).toBe(2);
    applyRulesFrame(s, board, [], 5);
    const expired = s.score;
    hit(s, 'spinner-spin');
    expect(s.score - expired).toBe(1000);
  });
  it('locks physically at 5X and releases two balls without consuming a turn', () => {
    let s = qualify(start());
    hit(s, 'spinner-spin');
    hit(s, 'spinner-spin');
    s.status = 'playing';
    s.launcherExited = true;
    const cup = board.saucers[0];
    const direction = {
      x: Math.cos(cup.ejectAngle),
      y: Math.sin(cup.ejectAngle),
    };
    s.ball.position = {
      x: cup.x + direction.x * 140,
      y: cup.y + direction.y * 140,
    };
    s.ball.linearVelocity = { x: -direction.x * 1050, y: -direction.y * 1050 };
    for (let n = 0; n < 240 && !s.lockedBalls.length; n++) {
      const r = stepGameFrame(s, board, idleInput, 1 / 120);
      s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    }
    expect(s.lockedBalls).toHaveLength(1);
    expect(s.rules.ballValues['locked-x']).toBe(5);
    expect(s.status).toBe('waiting-launch');
    for (let n = 0; n < 240 && !s.additionalBalls.length; n++) {
      const r = stepGameFrame(
        s,
        board,
        { ...idleInput, launchPressed: n < 120 },
        1 / 120,
      );
      s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    }
    expect(s.additionalBalls).toHaveLength(1);
    expect(s.rules.currentBall).toBe(1);
    expect(s.rules.ballsRemaining).toBe(3);
    hit(s, 'rollover-hit', 5);
    const before = s.score;
    hit(s, 'spinner-spin');
    expect(s.score - before).toBe(50000);
    expect(s.rules.playerValues.selector).toBe(2);
    const bonus = s.rules.bonus;
    event(s, 'multiball-ended');
    expect(s.rules.bonus).toBe(bonus);
    expect(s.rules.ballValues['playfield-x']).toBe(1);
  });
  it('requires an already-lit STAR letter and rotates awards on pop hits', () => {
    const s = qualify(start());
    hit(s, 'rollover-hit', 0);
    expect(s.rules.bonus).toBe(7000);
    expect(s.rules.ballValues.awards).toBe(1);
    hit(s, 'bumper-hit');
    expect(s.rules.ballValues.awards).toBe(2);
    hit(s, 'rollover-hit', 1);
    expect(s.rules.bonusMultiplier).toBe(1);
    hit(s, 'rollover-hit', 1);
    expect(s.rules.bonusMultiplier).toBe(2);
    expect(s.rules.ballValues.awards).toBe(0);
  });
  it('advances bonus X only during the left-inlane opportunity and caps both values', () => {
    const s = start();
    hit(s, 'standup-target-hit', 5);
    expect(s.rules.bonusMultiplier).toBe(1);
    for (let n = 0; n < 7; n++) {
      hit(s, 'rollover-hit', 4);
      hit(s, 'standup-target-hit', 5);
    }
    expect(s.rules.bonusMultiplier).toBe(5);
    expect(s.rules.modes['advance-bonus']).toBeUndefined();
    hit(s, 'rollover-hit', 4);
    applyRulesFrame(s, board, [], 5);
    hit(s, 'standup-target-hit', 5);
    expect(s.rules.bonusMultiplier).toBe(5);
    for (let n = 0; n < 40; n++) hit(s, 'rollover-hit', 4);
    expect(s.rules.bonus).toBe(29000);
  });
  it('collects multiplied bonus and Hold Bonus preserves its level across a drain', () => {
    const s = qualify(start());
    s.rules.ballValues.star = 5;
    s.rules.ballValues.awards = 5;
    s.rules.bonusMultiplier = 3;
    hit(s, 'rollover-hit', 2);
    expect(s.rules.ballValues['hold-bonus']).toBe(true);
    const before = s.score;
    hit(s, 'rollover-hit', 0);
    expect(s.score - before).toBe(1000 + 8000 * 3);
    expect(s.rules.bonus).toBe(8000);
    event(s, 'ball-drained');
    expect(s.rules.bonus).toBe(8000);
    expect(s.rules.bonusMultiplier).toBe(1);
    expect(s.rules.ballValues['hold-bonus']).toBeUndefined();
  });
  it('awards one extra ball per turn and converts a qualified Special to points once', () => {
    const s = qualify(start());
    for (let i = 0; i < 4; i++) hit(s, 'rollover-hit', i);
    expect(s.rules.ballValues.special).toBe(true);
    const before = s.score;
    hit(s, 'rollover-hit', 6);
    hit(s, 'rollover-hit', 7);
    expect(s.score - before).toBe(52000);
    s.rules.ballValues.awards = 8;
    hit(s, 'rollover-hit', 3);
    expect(s.rules.ballsRemaining).toBe(4);
    s.rules.ballValues.awards = 8;
    hit(s, 'rollover-hit', 3);
    expect(s.rules.ballsRemaining).toBe(4);
    const fresh = initializeRulesState(s, board);
    expect(fresh.score).toBe(0);
    expect(fresh.rules.playerValues['lock-lit']).toBe(false);
    expect(fresh.rules.ballsRemaining).toBe(3);
  });
});
