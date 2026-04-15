import { describe, expect, it } from 'vitest';

import { createBlankTable } from '../src/boards/table-library';
import { createBallState } from '../src/game/game-state';
import {
  resolveBallBallCollisions,
  resolveBallPairCollision,
} from '../src/game/ball-ball-collision';

describe('ball-ball collision solver', () => {
  it('transfers momentum on a head-on collision between equal balls', () => {
    const board = createBlankTable('Collision Test');
    const left = createBallState(board);
    const right = createBallState(board);

    left.position = { x: 100, y: 100 };
    right.position = { x: 131, y: 100 };
    left.linearVelocity = { x: 220, y: 0 };
    right.linearVelocity = { x: -220, y: 0 };

    resolveBallPairCollision(left, right, board.physics.solver);

    expect(left.linearVelocity.x).toBeLessThan(0);
    expect(right.linearVelocity.x).toBeGreaterThan(0);
    expect(left.position.x).toBeLessThan(right.position.x);
  });

  it('separates overlapping resting balls across iterative passes', () => {
    const board = createBlankTable('Collision Test');
    const left = createBallState(board);
    const right = createBallState(board);

    left.position = { x: 100, y: 100 };
    right.position = { x: 116, y: 100 };

    resolveBallBallCollisions([left, right], board.physics.solver);

    expect(
      Math.hypot(
        right.position.x - left.position.x,
        right.position.y - left.position.y,
      ),
    ).toBeGreaterThanOrEqual(left.radius + right.radius - 0.5);
  });
});
