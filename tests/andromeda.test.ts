import { describe, expect, it } from 'vitest';
import { andromedaTable as board } from '../src/boards/tables/andromeda';
import { createInitialGameState } from '../src/game/game-state';
import {
  initializeRulesState,
  applyRulesFrame,
  restartCurrentBall,
} from '../src/game/rules-engine';
import { stepGameFrame } from '../src/game/physics-engine';
import { idle } from '../src/playtest/simulation';
import type { GameEvent } from '../src/game/rules-types';

const start = () => initializeRulesState(createInitialGameState(board), board);
describe('Andromeda', () => {
  it('preserves the distinctive device count and open left lower field', () => {
    expect(board.flippers).toHaveLength(2);
    expect(board.bumpers).toHaveLength(4);
    expect(board.dropTargets).toHaveLength(7);
    expect(board.spinners).toHaveLength(1);
    expect(board.saucers).toHaveLength(1);
    expect(board.bumpers[3].y).toBeGreaterThan(1200);
    expect(board.routes!.some((r) => r.id.includes('outlane-0'))).toBe(false);
    expect(
      board.routes!.some((r) => r.id === 'andromeda-left-feed' && r.cradle),
    ).toBe(true);
  });
  it('requires a guard shot, locks on the next shot, and starts real two-ball play at the yellow target', () => {
    let state = start();
    for (let shot = 0; shot < 2; shot++) {
      state.status = 'playing';
      state.launcherExited = true;
      state.ball.position = { x: 110, y: 590 };
      state.ball.linearVelocity = { x: 0, y: -1100 };
      for (let f = 0; f < 240; f++) {
        const frame = stepGameFrame(state, board, idle, 1 / 120);
        state = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
        if (
          (shot === 0 && state.dropTargets[6].isDown) ||
          state.lockedBalls.length
        )
          break;
      }
      expect(state.dropTargets[6].isDown).toBe(true);
      expect(state.lockedBalls.length).toBe(shot);
    }
    expect(state.status).toBe('waiting-launch');
    expect(state.rules.currentBall).toBe(1);
    // A player-controlled shot from below the yellow standup releases the lock.
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = { x: 460, y: 1100 };
    state.ball.linearVelocity = { x: 0, y: -800 };
    for (let f = 0; f < 120 && !state.additionalBalls.length; f++) {
      const frame = stepGameFrame(state, board, idle, 1 / 120);
      state = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
    }
    expect(state.lockedBalls).toHaveLength(0);
    expect(state.additionalBalls).toHaveLength(1);
    expect(state.rules.ballValues.multiball).toBe(true);
    const score = state.score;
    state = applyRulesFrame(
      state,
      board,
      [{ type: 'bumper-hit', index: 0, score: 100, tick: state.tick }],
      0,
    );
    expect(state.score - score).toBe(2000);
    state.additionalBalls[0].position.y = board.drainY + 100;
    const frame = stepGameFrame(state, board, idle, 1 / 120);
    state = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
    expect(state.rules.ballValues.multiball).toBe(false);
    expect(state.rules.currentBall).toBe(1);
  });
  it('resets completed drop banks, advances spinner value, and lights the extra-ball lane', () => {
    let state = start();
    for (let round = 0; round < 2; round++) {
      const events: GameEvent[] = Array.from({ length: 6 }, (_, index) => ({
        type: 'drop-target-hit',
        index,
        score: 3000,
        tick: 1,
      }));
      state.dropTargets.slice(0, 6).forEach((t) => (t.isDown = true));
      state = applyRulesFrame(state, board, events, 0);
      expect(state.dropTargets.slice(0, 6).every((t) => !t.isDown)).toBe(true);
    }
    expect(state.rules.ballValues.spinner).toBe(2000);
    expect(state.rules.ballValues.extraLit).toBe(true);
    state = applyRulesFrame(
      state,
      board,
      [{ type: 'rollover-hit', index: 5, score: 3000, tick: 1 }],
      0,
    );
    expect(state.rules.ballsRemaining).toBe(4);
    expect(state.rules.ballValues.extraLit).toBe(false);
  });
  it('clears multiball rules when manually restarting the current ball', () => {
    const state = start();
    state.score = 12345;
    state.rules.currentBall = 2;
    state.rules.ballValues.multiball = true;
    state.rules.bonus = 9000;
    const next = restartCurrentBall(state, board);
    expect(next.rules.ballValues.multiball).toBe(false);
    expect(next.score).toBe(12345);
    expect(next.rules.currentBall).toBe(2);
    expect(next.rules.bonus).toBe(0);
    expect(next.lockedBalls).toHaveLength(0);
  });
  it('shifts top-lane lights once per right press and awards the multiplier', () => {
    let state = applyRulesFrame(
      start(),
      board,
      [{ type: 'rollover-hit', index: 0, score: 3000, tick: 1 }],
      0,
    );
    const press = { ...idle, rightPressed: true };
    let frame = stepGameFrame(state, board, press, 1 / 120);
    state = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
    expect(state.rules.ballValues.lanes).toBe(2);
    frame = stepGameFrame(state, board, press, 1 / 120);
    state = applyRulesFrame(frame.state, board, frame.events, 1 / 120);
    expect(state.rules.ballValues.lanes).toBe(2);
    state = applyRulesFrame(
      state,
      board,
      [0, 2].map((index) => ({
        type: 'rollover-hit',
        index,
        score: 3000,
        tick: 2,
      })),
      0,
    );
    expect(state.rules.bonusMultiplier).toBe(2);
    expect(state.rules.ballValues.lanes).toBe(0);
    expect(state.rollovers.slice(0, 3).every((r) => !r.lit)).toBe(true);
  });
});
