import type { BoardDefinition } from '../types/board-definition';
import { createBallState, type BallState, type GameState } from './game-state';

// A physical lock removes a captured ball from simulation while a replacement
// is served. It preserves targets, bonus, the turn number, and the occupied cup.
export function lockCapturedBall(
  state: GameState,
  board: BoardDefinition,
  index: number,
): boolean {
  if (
    state.status !== 'playing' ||
    state.additionalBalls.length ||
    state.lockedBalls.length ||
    state.ball.capturedSaucer !== index ||
    !state.saucers[index]?.occupied
  )
    return false;
  state.lockedBalls.push({ ball: state.ball, saucerIndex: index });
  state.ball = createBallState(board);
  state.launcherExited = false;
  state.plunger = { pullback: 0, releaseSpeed: 0 };
  state.status = 'waiting-launch';
  return true;
}

export function releaseLockedBalls(
  state: GameState,
  board: BoardDefinition,
): number {
  if (state.status !== 'playing') return 0;
  const count = state.lockedBalls.length;
  for (const { ball, saucerIndex } of state.lockedBalls) {
    const cup = board.saucers[saucerIndex];
    delete ball.capturedSaucer;
    ball.launcherExited = true;
    const reach = cup.radius + ball.radius + 4;
    ball.position = {
      x: cup.x + state.tableNudge.offset.x + Math.cos(cup.ejectAngle) * reach,
      y: cup.y + state.tableNudge.offset.y + Math.sin(cup.ejectAngle) * reach,
    };
    ball.linearVelocity = {
      x:
        Math.cos(cup.ejectAngle) * cup.ejectSpeed + state.tableNudge.velocity.x,
      y:
        Math.sin(cup.ejectAngle) * cup.ejectSpeed + state.tableNudge.velocity.y,
    };
    state.saucers[saucerIndex] = { occupied: false, holdSecondsRemaining: 0 };
    state.additionalBalls.push(ball);
  }
  state.lockedBalls = [];
  return count;
}

// Frictionless sphere contact in the shared table plane. Captured balls are
// excluded; the occupied saucer owns them until release.
export function resolveBallPairs(balls: BallState[]): void {
  for (let i = 0; i < balls.length; i++)
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i],
        b = balls[j];
      if (a.capturedSaucer !== undefined || b.capturedSaucer !== undefined)
        continue;
      const dx = b.position.x - a.position.x,
        dy = b.position.y - a.position.y;
      const distance = Math.hypot(dx, dy),
        overlap = a.radius + b.radius - distance;
      if (overlap <= 0) continue;
      const rvx = a.linearVelocity.x - b.linearVelocity.x,
        rvy = a.linearVelocity.y - b.linearVelocity.y;
      const relativeSpeed = Math.hypot(rvx, rvy);
      const nx =
        distance > 1e-9
          ? dx / distance
          : relativeSpeed > 1e-9
            ? rvx / relativeSpeed
            : 1;
      const ny =
        distance > 1e-9
          ? dy / distance
          : relativeSpeed > 1e-9
            ? rvy / relativeSpeed
            : 0;
      const invA = 1 / a.mass,
        invB = 1 / b.mass,
        total = invA + invB;
      a.position.x -= (nx * overlap * invA) / total;
      a.position.y -= (ny * overlap * invA) / total;
      b.position.x += (nx * overlap * invB) / total;
      b.position.y += (ny * overlap * invB) / total;
      const approach =
        (b.linearVelocity.x - a.linearVelocity.x) * nx +
        (b.linearVelocity.y - a.linearVelocity.y) * ny;
      if (approach >= 0) continue;
      const impulse = (-(1 + 0.9) * approach) / total;
      a.linearVelocity.x -= impulse * nx * invA;
      a.linearVelocity.y -= impulse * ny * invA;
      b.linearVelocity.x += impulse * nx * invB;
      b.linearVelocity.y += impulse * ny * invB;
    }
}

export function positionLockedBalls(
  state: GameState,
  board: BoardDefinition,
): void {
  for (const lock of state.lockedBalls) {
    const cup = board.saucers[lock.saucerIndex];
    lock.ball.position = {
      x: cup.x + state.tableNudge.offset.x,
      y: cup.y + state.tableNudge.offset.y,
    };
  }
}
