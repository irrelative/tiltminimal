import { describe, expect, it } from 'vitest';
import { switchyardTable as board } from '../src/boards/tables/switchyard';
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
const orbit = (s: GameState, side = 0, id = 0) =>
  [side, 1, 2 - side].forEach((i) => hit(s, 'rollover-hit', i, id));
const banks = (s: GameState) =>
  [0, 1, 2, 3].forEach((i) => hit(s, 'standup-target-hit', i));
const qualify = (s: GameState) => {
  orbit(s);
  orbit(s, 2);
  banks(s);
  hit(s, 'saucer-captured');
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
describe('Switchyard network rules', () => {
  it('requires a full ordered orbit by the same ball, not spinner rattles or mixed balls', () => {
    const s = start();
    for (let i = 0; i < 10; i++) hit(s, 'spinner-spin');
    hit(s, 'rollover-hit', 0, 1);
    hit(s, 'rollover-hit', 1, 2);
    hit(s, 'rollover-hit', 2, 1);
    expect(s.rules.ballValues.network).toBe(0);
    orbit(s, 0, 3);
    expect(s.rules.ballValues.network).toBe(1);
    orbit(s, 2, 4);
    expect(s.rules.ballValues.network).toBe(9);
  });
  it('expires an incomplete orbit and clears captured-ball tracking', () => {
    const s = start();
    hit(s, 'rollover-hit', 0);
    applyRulesFrame(s, board, [], 5.1);
    hit(s, 'rollover-hit', 1);
    hit(s, 'rollover-hit', 2);
    expect(s.rules.ballValues.network).toBe(0);
    hit(s, 'rollover-hit', 0);
    hit(s, 'saucer-captured');
    hit(s, 'rollover-hit', 1);
    hit(s, 'rollover-hit', 2);
    expect(s.rules.ballValues.network).toBe(16);
  });
  it('needs both distinct switches per bank and a subsequent Dispatch shot to lock', () => {
    const s = start();
    for (let i = 0; i < 6; i++) hit(s, 'standup-target-hit', 0);
    expect(s.rules.ballValues.network).toBe(0);
    qualify(s);
    expect(s.rules.ballValues.network).toBe(31);
    expect(s.rules.ballValues.phase).toBe('qualify');
    expect(s.lockedBalls).toHaveLength(0);
  });
  it('awards timed different-shot combos, freezes at zero delta, and clears on Dispatch', () => {
    const s = start();
    orbit(s);
    applyRulesFrame(s, board, [], 0);
    expect(s.rules.modes.combo.timeRemainingMs).toBe(4000);
    let before = s.score;
    orbit(s);
    expect(s.score - before).toBe(2000);
    before = s.score;
    orbit(s, 2);
    expect(s.score - before).toBe(4000);
    applyRulesFrame(s, board, [], 4.01);
    before = s.score;
    orbit(s);
    expect(s.score - before).toBe(2000);
    hit(s, 'saucer-captured');
    expect(s.rules.modes.combo).toBeUndefined();
  });
  it('physically locks, serves and releases two distinct balls on the same turn', () => {
    let s = capture(qualify(start()));
    expect(s.lockedBalls).toHaveLength(1);
    expect(s.status).toBe('waiting-launch');
    const bonus = s.rules.bonus;
    const id = s.lockedBalls[0].ball.id;
    expect(s.ball.id).not.toBe(id);
    s = launch(s);
    expect(s.additionalBalls).toHaveLength(1);
    expect(s.additionalBalls[0].id).toBe(id);
    expect(s.rules.ballValues.phase).toBe('multiball');
    expect(s.rules.currentBall).toBe(1);
    expect(s.rules.bonus).toBe(bonus);
  });
  it('collects four distinct jackpots, pays Super, and relights without relocking', () => {
    const s = launch(capture(qualify(start())));
    const before = s.score;
    orbit(s);
    expect(s.score - before).toBe(12000);
    const repeat = s.score;
    orbit(s);
    expect(s.score - repeat).toBe(2000);
    orbit(s, 2);
    hit(s, 'standup-target-hit', 0);
    hit(s, 'standup-target-hit', 2);
    expect(s.rules.ballValues.jackpots).toBe(15);
    const superScore = s.score;
    hit(s, 'saucer-captured');
    expect(s.score - superScore).toBe(50000);
    expect(s.rules.ballValues.jackpots).toBe(0);
    expect(s.lockedBalls).toHaveLength(0);
  });
  it('ends multiball on one drain, preserves the turn, then pays bounded bonus on final drain', () => {
    let s = launch(capture(qualify(start())));
    s.additionalBalls[0].position.y = board.drainY + 100;
    let r = stepGameFrame(s, board, idleInput, 1 / 120);
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    expect(s.rules.ballValues.phase).toBe('qualify');
    expect(s.rules.ballValues.network).toBe(0);
    expect(s.rules.currentBall).toBe(1);
    for (let i = 0; i < 60; i++) hit(s, 'saucer-captured');
    expect(s.rules.bonus).toBe(20000);
    const before = s.score;
    s.ball.position.y = board.drainY + 100;
    r = stepGameFrame(s, board, idleInput, 1 / 120);
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    expect(s.score - before).toBe(20000);
    expect(s.rules.currentBall).toBe(2);
    expect(s.rules.bonus).toBe(0);
  });
  it('handles simultaneous drains once and reset/game-over cleanly', () => {
    let s = launch(capture(qualify(start())));
    const before = s.score,
      bonus = s.rules.bonus;
    [s.ball, ...s.additionalBalls].forEach(
      (ball) => (ball.position.y = board.drainY + 100),
    );
    const r = stepGameFrame(s, board, idleInput, 1 / 120);
    s = applyRulesFrame(r.state, board, r.events, 1 / 120);
    expect(s.score - before).toBe(bonus);
    expect(s.rules.currentBall).toBe(2);
    s = restartCurrentBall(capture(qualify(start())), board);
    expect(s.lockedBalls).toHaveLength(0);
    expect(s.rules.ballValues.network).toBe(0);
    for (let i = 0; i < 3; i++)
      applyRulesFrame(s, board, [{ type: 'ball-drained', tick: s.tick }], 0);
    expect(s.status).toBe('game-over');
  });
});
