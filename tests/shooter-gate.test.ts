import { describe, expect, it } from 'vitest';
import { classicTable as board } from '../src/boards/tables/classic-table';
import { createInitialGameState } from '../src/game/game-state';
import { getPlungerReturnGate } from '../src/game/plunger-geometry';
import { stepGame } from '../src/game/physics-engine';
import { idleInput, launchBall } from './helpers/game-fixture';
import { cloneBoardDefinition } from '../src/boards/board-codec';

const gate = getPlungerReturnGate(board)!;
const length = Math.hypot(gate.end.x - gate.start.x, gate.end.y - gate.start.y);
const normal = {
  x: (gate.end.y - gate.start.y) / length,
  y: -(gate.end.x - gate.start.x) / length,
};
const midpoint = {
  x: (gate.start.x + gate.end.x) / 2,
  y: (gate.start.y + gate.end.y) / 2,
};
const signedDistance = (point: { x: number; y: number }) =>
  (point.x - midpoint.x) * normal.x + (point.y - midpoint.y) * normal.y;

describe('shooter return gate', () => {
  it('lets an outbound ball cross before closing behind it', () => {
    let state = createInitialGameState(board);
    state.status = 'playing';
    state.ball.position = {
      x: midpoint.x - normal.x * 65,
      y: midpoint.y - normal.y * 65,
    };
    state.ball.linearVelocity = { x: normal.x * 1500, y: normal.y * 1500 };
    for (let frame = 0; frame < 18; frame += 1)
      state = stepGame(state, board, idleInput, 1 / 120);
    expect(state.launcherExited).toBe(true);
    expect(signedDistance(state.ball.position)).toBeGreaterThan(
      board.ball.radius,
    );
  });

  it('reflects a returning live ball back into the playfield', () => {
    let state = createInitialGameState(board);
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = {
      x: midpoint.x + normal.x * 70,
      y: midpoint.y + normal.y * 70,
    };
    state.ball.linearVelocity = { x: -normal.x * 1000, y: -normal.y * 1000 };
    for (let frame = 0; frame < 12; frame += 1)
      state = stepGame(state, board, idleInput, 1 / 120);
    expect(signedDistance(state.ball.position)).toBeGreaterThan(
      board.ball.radius,
    );
    expect(
      state.ball.linearVelocity.x * normal.x +
        state.ball.linearVelocity.y * normal.y,
    ).toBeGreaterThan(0);
  });

  it('keeps the shooter side wall solid after the ball has launched', () => {
    const state = createInitialGameState(board);
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = { x: 750, y: 850 };
    state.ball.linearVelocity = { x: 6000, y: 0 };
    const next = stepGame(state, board, idleInput, 1 / 60);
    expect(next.ball.position.x).toBeLessThan(796 - board.ball.radius);
    expect(next.ball.linearVelocity.x).toBeLessThan(0);
  });

  it('allows a weak plunge to settle and be launched again', () => {
    let state = launchBall(board, {
      chargeSeconds: board.physics.plunger.maxPullSeconds * 0.01,
    });
    for (let frame = 0; frame < 480; frame += 1)
      state = stepGame(state, board, idleInput, 1 / 120);
    expect(state.launcherExited).toBe(false);
    expect(state.status).toBe('waiting-launch');
    expect(state.rules.currentBall).toBe(1);
    for (let frame = 0; frame < 168; frame += 1)
      state = stepGame(
        state,
        board,
        { ...idleInput, launchPressed: true },
        1 / 120,
      );
    for (let frame = 0; frame < 480 && !state.launcherExited; frame += 1)
      state = stepGame(state, board, idleInput, 1 / 120);
    expect(state.launcherExited).toBe(true);
  });

  it('copies gate coordinates when cloning a board', () => {
    const copy = cloneBoardDefinition(board);
    copy.plunger.returnGate!.start.x += 50;
    expect(copy.plunger.returnGate!.start.x).not.toBe(
      board.plunger.returnGate!.start.x,
    );
  });
});
