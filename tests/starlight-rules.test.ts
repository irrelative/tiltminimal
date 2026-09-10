import { describe, expect, it } from 'vitest';
import { starlightEmTable as board } from '../src/boards/tables/starlight-em-table';
import { createInitialGameState, type GameState } from '../src/game/game-state';
import {
  initializeRulesState,
  applyRulesFrame,
} from '../src/game/rules-engine';
import type { GameEvent } from '../src/game/rules-types';
const start = () => initializeRulesState(createInitialGameState(board), board);
const hit = (
  s: GameState,
  type:
    | 'standup-target-hit'
    | 'rollover-hit'
    | 'spinner-spin'
    | 'saucer-captured'
    | 'bumper-hit',
  index = 0,
  score = 100,
) => applyRulesFrame(s, board, [{ type, index, score, tick: s.tick }], 0);
const banks = (s: GameState) => {
  for (let i = 0; i < 6; i++) hit(s, 'standup-target-hit', i);
};
const star = (s: GameState) => {
  for (let i = 0; i < 4; i++) hit(s, 'rollover-hit', i);
};
const drain = (s: GameState) =>
  applyRulesFrame(
    s,
    board,
    [{ type: 'ball-drained', tick: s.tick } satisfies GameEvent],
    0,
  );

describe('Starlight constellation rules', () => {
  it('requires distinct bank switches and lights each spinner independently', () => {
    const s = start();
    for (let i = 0; i < 4; i++) hit(s, 'standup-target-hit', 0);
    expect(s.rules.ballValues['comet-lit']).toBe(false);
    hit(s, 'standup-target-hit', 1);
    hit(s, 'standup-target-hit', 2);
    const before = s.score;
    hit(s, 'spinner-spin', 0);
    hit(s, 'spinner-spin', 1);
    expect(s.score - before).toBe(600);
    expect(s.rules.ballValues['nova-lit']).toBe(false);
    for (let i = 3; i < 6; i++) hit(s, 'standup-target-hit', i);
    const lit = s.score;
    hit(s, 'spinner-spin', 1);
    expect(s.score - lit).toBe(1000);
  });
  it('collects the rising observatory award only with both banks lit and caps it', () => {
    const s = start();
    hit(s, 'saucer-captured', 0, 3000);
    expect(s.score).toBe(3000);
    for (const award of [10000, 15000, 20000, 25000, 25000]) {
      banks(s);
      const before = s.score;
      hit(s, 'saucer-captured');
      expect(s.score - before).toBe(award);
      expect(s.rules.ballValues['comet-lit']).toBe(false);
      expect(s.rules.ballValues['nova-lit']).toBe(false);
      expect(s.rules.ballValues.comet).toBe(0);
      expect(s.rules.ballValues.nova).toBe(0);
    }
    expect(s.rules.ballsRemaining).toBe(5);
  });
  it('requires all four STAR lanes, powers pops, and caps bonus and multiplier', () => {
    const s = start();
    for (let i = 0; i < 4; i++) hit(s, 'rollover-hit', 0);
    expect(s.rules.bonusMultiplier).toBe(1);
    star(s);
    const before = s.score;
    hit(s, 'bumper-hit');
    expect(s.score - before).toBe(1000);
    expect(s.rules.ballValues.star).toBe(0);
    for (let i = 0; i < 30; i++) star(s);
    expect(s.rules.bonus).toBe(20000);
    expect(s.rules.bonusMultiplier).toBe(5);
    const score = s.score;
    drain(s);
    expect(s.score - score).toBe(100000);
  });
  it('awards one extra ball only when STAR and both banks are ready', () => {
    const s = start();
    banks(s);
    hit(s, 'saucer-captured');
    expect(s.rules.ballsRemaining).toBe(5);
    star(s);
    banks(s);
    hit(s, 'saucer-captured');
    expect(s.rules.ballsRemaining).toBe(6);
    expect(s.rules.currentBall).toBe(1);
    banks(s);
    hit(s, 'saucer-captured');
    expect(s.rules.ballsRemaining).toBe(6);
    drain(s);
    expect(s.rules.currentBall).toBe(2);
    expect(s.rules.ballsRemaining).toBe(5);
    expect(s.rules.ballValues['star-complete']).toBe(false);
    expect(s.rules.bonus).toBe(0);
    expect(s.rules.bonusMultiplier).toBe(1);
    expect(s.rules.playerValues.constellations).toBe(3);
    star(s);
    banks(s);
    hit(s, 'saucer-captured');
    expect(s.rules.ballsRemaining).toBe(5);
    expect(start().rules.playerValues.constellations).toBe(0);
    expect(start().rules.playerValues['extra-ball-awarded']).toBe(false);
  });
  it('ends a five-ball game without an extra ball', () => {
    const s = start();
    for (let i = 0; i < 5; i++) drain(s);
    expect(s.status).toBe('game-over');
  });
});
