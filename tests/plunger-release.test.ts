import { describe, expect, it } from 'vitest';
import { createBlankTable } from './helpers/board-fixture';
import { launchBall } from './helpers/game-fixture';

const board = createBlankTable('Plunger calibration');
describe('plunger release contact', () => {
  it.each([1 / 30, 1 / 60, 1 / 120, 1 / 240])(
    'increases launch speed monotonically at frame interval %s',
    (stepSeconds) => {
      let previousSpeed = 0;
      for (let sample = 1; sample <= 20; sample += 1) {
        const state = launchBall(board, {
          chargeSeconds: (board.physics.plunger.maxPullSeconds * sample) / 20,
          stepSeconds,
        });
        const speed = -state.ball.linearVelocity.y;
        expect(speed).toBeGreaterThan(previousSpeed);
        previousSpeed = speed;
      }
    },
  );
  it('uses the same contact speed when the spring reaches its stop between frames', () => {
    for (const power of [0.1, 0.35, 0.55, 0.8, 1]) {
      const speeds = [1 / 30, 1 / 60, 1 / 120, 1 / 240].map(
        (stepSeconds) =>
          -launchBall(board, {
            chargeSeconds: board.physics.plunger.maxPullSeconds * power,
            stepSeconds,
          }).ball.linearVelocity.y,
      );
      expect(Math.max(...speeds) - Math.min(...speeds)).toBeLessThan(0.001);
    }
  });
});
