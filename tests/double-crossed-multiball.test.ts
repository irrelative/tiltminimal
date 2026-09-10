import { createPostPassCradle } from './helpers/post-pass';
import { describe, expect, it } from 'vitest';
import { doubleCrossedTable as board } from '../src/boards/tables/double-crossed';
import { createInitialGameState, type GameState } from '../src/game/game-state';
import {
  initializeRulesState,
  applyRulesFrame,
  restartCurrentBall,
} from '../src/game/rules-engine';
import { stepGameFrame } from '../src/game/physics-engine';
import { idleInput } from './helpers/game-fixture';
const dt = 1 / 120;
const start = () => initializeRulesState(createInitialGameState(board), board);
const event = (
  s: GameState,
  type: 'standup-target-hit' | 'spinner-spin' | 'saucer-captured',
  index = 0,
) => applyRulesFrame(s, board, [{ type, index, score: 100, tick: s.tick }], 0);
const qualify = (s: GameState, order = [0, 1, 2, 3]) => {
  order.forEach((i) => event(s, 'standup-target-hit', i));
  return s;
};
const frame = (s: GameState, launchPressed = false) => {
  const r = stepGameFrame(s, board, { ...idleInput, launchPressed }, dt);
  return applyRulesFrame(r.state, board, r.events, dt);
};
const capture = (s: GameState) => {
  s.status = 'playing';
  s.launcherExited = true;
  s.ball.position = { x: board.saucers[0].x, y: board.saucers[0].y + 130 };
  s.ball.linearVelocity = { x: 0, y: -1050 };
  for (
    let i = 0;
    i < 240 && !s.lockedBalls.length && s.ball.capturedSaucer === undefined;
    i++
  )
    s = frame(s);
  return s;
};
const launch = (s: GameState, charge = 120) => {
  for (let i = 0; i < charge; i++) s = frame(s, true);
  for (let i = 0; i < 120 && s.status === 'waiting-launch'; i++) s = frame(s);
  return s;
};
const multiball = () => launch(capture(qualify(start())));

describe('Double Crossed physical Cross Lock', () => {
  it.each([
    [0, 1, 2, 3],
    [2, 3, 0, 1],
  ])(
    'qualifies both banks in order %j without accepting repeated switches',
    (...order) => {
      const s = start();
      for (let i = 0; i < 4; i++) event(s, 'standup-target-hit', 0);
      expect(s.rules.ballValues['cross-left']).toBe(false);
      qualify(s, order);
      expect(s.rules.ballValues['cross-left']).toBe(true);
      expect(s.rules.ballValues['cross-right']).toBe(true);
    },
  );
  it.each([0, 1])(
    'reaches the lock from flipper %i with ordinary release/flip inputs',
    (source) => {
      for (const delay of [92, 93]) {
        let s = createPostPassCradle(board, source);
        // Preserve the physical cradle while initializing only the rule state.
        s.rules = start().rules;
        qualify(s);
        let otherScoring = false;
        for (let i = 0; i < 360 && !s.lockedBalls.length; i++) {
          const r = stepGameFrame(
            s,
            board,
            {
              ...idleInput,
              [source === 0 ? 'leftPressed' : 'rightPressed']: i >= delay,
            },
            dt,
          );
          otherScoring ||= r.events.some((e) =>
            [
              'bumper-hit',
              'slingshot-hit',
              'standup-target-hit',
              'drop-target-hit',
            ].includes(e.type),
          );
          s = applyRulesFrame(r.state, board, r.events, dt);
          if (s.status !== 'playing' && !s.lockedBalls.length) break;
        }
        expect(s.lockedBalls).toHaveLength(1);
        expect(otherScoring).toBe(false);
      }
    },
  );
  it('ejects an unlit saucer and preserves qualification when a fabricated lock attempt fails', () => {
    let s = capture(start());
    expect(s.lockedBalls).toHaveLength(0);
    expect(s.ball.capturedSaucer).toBe(0);
    for (let i = 0; i < 120; i++) s = frame(s);
    expect(s.ball.capturedSaucer).toBeUndefined();
    const q = qualify(start());
    event(q, 'saucer-captured');
    expect(q.rules.ballValues['cross-phase']).toBe('qualify');
    expect(q.rules.ballValues['cross-left']).toBe(true);
  });
  it.each([12, 120])(
    'locks a real ball and releases exactly once with a %i-frame plunge',
    (charge) => {
      let s = qualify(start());
      const bonus = s.rules.bonus,
        score = s.score;
      s = capture(s);
      expect(s.lockedBalls).toHaveLength(1);
      expect(s.saucers[0].occupied).toBe(true);
      expect(s.status).toBe('waiting-launch');
      expect(s.score - score).toBe(5000);
      expect(s.rules.bonus).toBe(bonus);
      s = launch(s, charge);
      expect(s.lockedBalls).toHaveLength(0);
      expect(s.additionalBalls).toHaveLength(1);
      expect(s.rules.ballValues['cross-phase']).toBe('multiball');
      expect(s.rules.currentBall).toBe(1);
      expect(s.rules.ballsRemaining).toBe(3);
      applyRulesFrame(s, board, [{ type: 'ball-launched', tick: s.tick }], 0);
      expect(s.additionalBalls).toHaveLength(1);
    },
  );
  it('requires both spinners for each capped jackpot and never relocks during multiball', () => {
    const s = multiball();
    for (const award of [10000, 15000, 20000, 20000]) {
      for (let i = 0; i < 10; i++) event(s, 'spinner-spin', 0);
      expect(s.rules.ballValues['cross-spinners']).toBe(1);
      const before = s.score;
      event(s, 'saucer-captured');
      expect(s.score - before).toBe(1000);
      event(s, 'spinner-spin', 1);
      const lit = s.score;
      event(s, 'saucer-captured');
      expect(s.score - lit).toBe(award);
      expect(s.rules.ballValues['cross-spinners']).toBe(0);
      expect(s.lockedBalls).toHaveLength(0);
    }
    qualify(s);
    expect(s.rules.ballValues['cross-left']).toBe(false);
  });
  it('continues the same ball after one loss, clears qualification, and collects bonus only on final drain', () => {
    let s = multiball();
    qualify(s);
    const score = s.score,
      bonus = s.rules.bonus;
    s.additionalBalls[0].position = { x: 450, y: board.drainY + 100 };
    s = frame(s);
    expect(s.additionalBalls).toHaveLength(0);
    expect(s.rules.currentBall).toBe(1);
    expect(s.score).toBe(score);
    expect(s.rules.bonus).toBe(bonus);
    expect(s.rules.ballValues['cross-phase']).toBe('qualify');
    expect(s.rules.ballValues['cross-left']).toBe(false);
    s.ball.position = { x: 450, y: board.drainY + 100 };
    s.launcherExited = true;
    s.ball.launcherExited = true;
    s = frame(s);
    expect(s.rules.currentBall).toBe(2);
    expect(s.score - score).toBe(bonus * s.rules.bonusMultiplier);
  });
  it('handles simultaneous drains on the last ball once', () => {
    let s = multiball();
    s.rules.currentBall = 3;
    s.rules.ballsRemaining = 1;
    const bonus = s.rules.bonus,
      score = s.score;
    for (const b of [s.ball, ...s.additionalBalls]) {
      b.position = { x: 450, y: board.drainY + 100 };
      b.launcherExited = true;
    }
    s.launcherExited = true;
    s = frame(s);
    expect(s.status).toBe('game-over');
    expect(s.score - score).toBe(bonus);
    expect(s.lockedBalls).toHaveLength(0);
  });
  it('clears stored balls and mode when resetting locked or live multiball', () => {
    for (const s of [capture(qualify(start())), multiball()]) {
      const reset = restartCurrentBall(s, board);
      expect(reset.lockedBalls).toHaveLength(0);
      expect(reset.additionalBalls).toHaveLength(0);
      expect(reset.rules.ballValues['cross-phase']).toBe('qualify');
      expect(reset.rules.ballValues['cross-left']).toBe(false);
    }
  });
  it('does not freeze the second ball when a weak replacement plunge returns to the shooter', () => {
    let s = multiball();
    s.ball.position = { ...board.launchPosition };
    s.ball.linearVelocity = { x: 0, y: 0 };
    s.ball.launcherExited = false;
    s.launcherExited = false;
    s.additionalBalls[0].position = { x: 450, y: 900 };
    s.additionalBalls[0].linearVelocity = { x: 80, y: 100 };
    s = frame(s);
    expect(s.status).toBe('playing');
    expect(s.additionalBalls).toHaveLength(1);
  });
});
