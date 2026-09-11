import { describe, expect, it } from 'vitest';
import { justOneMoreTable as board } from '../src/boards/tables/just-one-more';
import { createInitialGameState, type GameState } from '../src/game/game-state';
import {
  initializeRulesState,
  applyRulesFrame,
  restartCurrentBall,
} from '../src/game/rules-engine';
import { stepGameFrame } from '../src/game/physics-engine';
import { idleInput } from './helpers/game-fixture';
const start = () => initializeRulesState(createInitialGameState(board), board);
const hit = (
  s: GameState,
  type:
    | 'rollover-hit'
    | 'standup-target-hit'
    | 'spinner-spin'
    | 'saucer-captured',
  index = 0,
  ballId = 0,
) =>
  applyRulesFrame(
    s,
    board,
    [{ type, index, ballId, score: 100, tick: s.tick }],
    0,
  );
const qualify = (s: GameState) => {
  [0, 1].forEach((i) => hit(s, 'spinner-spin', i));
  [0, 1, 2, 3].forEach((i) => hit(s, 'standup-target-hit', i));
  return s;
};
const capture = (s: GameState) => {
  s.status = 'playing';
  s.launcherExited = true;
  s.ball.position = { x: board.saucers[0].x, y: board.saucers[0].y + 140 };
  s.ball.linearVelocity = { x: 0, y: -1050 };
  for (let f = 0; f < 240 && !s.lockedBalls.length; f++) {
    const r = stepGameFrame(s, board, idleInput, 1 / 120);
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
  }
  return s;
};
const launch = (s: GameState, frames = 120) => {
  for (let f = 0; f < frames + 120; f++) {
    const r = stepGameFrame(
      s,
      board,
      { ...idleInput, launchPressed: f < frames },
      1 / 120,
    );
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    if (s.additionalBalls.length) break;
  }
  return s;
};
describe('Just One More rules', () => {
  it('requires distinct spinners and repairs, awarding repair completion once', () => {
    const s = start();
    for (let i = 0; i < 5; i++) {
      hit(s, 'spinner-spin');
      hit(s, 'standup-target-hit');
    }
    expect(s.rules.ballValues.play).toBe(1);
    expect(s.rules.ballValues.fix).toBe(1);
    hit(s, 'saucer-captured');
    expect(s.lockedBalls).toHaveLength(0);
    expect(s.score).toBe(4000);
    [1, 2, 3].forEach((i) => hit(s, 'standup-target-hit', i));
    expect(s.score).toBe(7500);
    hit(s, 'standup-target-hit', 3);
    expect(s.score).toBe(8000);
    hit(s, 'spinner-spin', 1);
    expect(s.rules.ballValues.play).toBe(3);
    expect(s.rules.ballValues.fix).toBe(15);
  });
  it('carries partial progress and a lit collect lock across physical drains', () => {
    let s = start();
    const drain = () => {
      s.status = 'playing';
      s.launcherExited = true;
      s.ball.position.y = board.drainY + 100;
      const r = stepGameFrame(s, board, idleInput, 1 / 120);
      s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    };
    hit(s, 'spinner-spin', 0);
    hit(s, 'standup-target-hit', 0);
    drain();
    expect(s.rules.currentBall).toBe(2);
    expect(s.rules.ballValues).toMatchObject({ play: 1, fix: 1 });
    hit(s, 'spinner-spin', 1);
    [1, 2, 3].forEach((i) => hit(s, 'standup-target-hit', i));
    drain();
    expect(s.rules.currentBall).toBe(3);
    expect(s.rules.ballValues).toMatchObject({ play: 3, fix: 15 });
    const before = s.score;
    hit(s, 'standup-target-hit', 0);
    expect(s.score - before).toBe(500);
    s = capture(s);
    expect(s.lockedBalls).toHaveLength(1);
    s = initializeRulesState(s, board);
    expect(s.rules.ballValues).toMatchObject({ play: 0, fix: 0 });
  });
  it('physically locks for 5,000 and releases two balls on the same turn', () => {
    const initial = qualify(start()),
      before = initial.score;
    let s = capture(initial);
    expect(s.lockedBalls).toHaveLength(1);
    expect(s.score - before).toBe(5000);
    expect(s.rules.ballValues.phase).toBe('locked');
    s = launch(s);
    expect(s.additionalBalls).toHaveLength(1);
    expect(s.ball.id).not.toBe(s.additionalBalls[0].id);
    expect(s.rules.ballValues.phase).toBe('multiball');
    expect(s.rules.currentBall).toBe(1);
    expect(s.rules.ballsRemaining).toBe(3);
  });
  it('requires both spinners for each jackpot and never relocks in multiball', () => {
    const s = launch(capture(qualify(start())));
    hit(s, 'spinner-spin', 0);
    hit(s, 'spinner-spin', 0);
    let before = s.score;
    hit(s, 'saucer-captured');
    expect(s.score - before).toBe(1000);
    hit(s, 'spinner-spin', 1);
    before = s.score;
    hit(s, 'saucer-captured');
    expect(s.score - before).toBe(10000);
    expect(s.rules.ballValues.jackpots).toBe(0);
    expect(s.lockedBalls).toHaveLength(0);
    before = s.score;
    hit(s, 'saucer-captured');
    expect(s.score - before).toBe(1000);
  });
  it('clears progress on multiball end and advances only on final drain', () => {
    let s = launch(capture(qualify(start())));
    s.additionalBalls[0].position.y = board.drainY + 100;
    let r = stepGameFrame(s, board, idleInput, 1 / 120);
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    expect(s.rules.currentBall).toBe(1);
    expect(s.rules.ballValues).toMatchObject({
      phase: 'qualify',
      play: 0,
      fix: 0,
      jackpots: 0,
    });
    s.ball.position.y = board.drainY + 100;
    r = stepGameFrame(s, board, idleInput, 1 / 120);
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    expect(s.rules.currentBall).toBe(2);
    expect(s.rules.bonus).toBe(0);
  });
  it('handles simultaneous drains, reset and game over', () => {
    let s = launch(capture(qualify(start())));
    [s.ball, ...s.additionalBalls].forEach(
      (ball) => (ball.position.y = board.drainY + 100),
    );
    const r = stepGameFrame(s, board, idleInput, 1 / 120);
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    expect(s.rules.currentBall).toBe(2);
    s = restartCurrentBall(capture(qualify(start())), board);
    expect(s.lockedBalls).toHaveLength(0);
    expect(s.rules.ballValues.fix).toBe(15);
    for (let i = 0; i < 3; i++)
      applyRulesFrame(s, board, [{ type: 'ball-drained', tick: s.tick }], 0);
    expect(s.status).toBe('game-over');
  });
});
