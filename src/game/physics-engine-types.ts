import type { GameState, BallState } from './game-state';
import type { GameEvent } from './rules-types';

export interface PhysicsStepResult {
  state: GameState;
  events: GameEvent[];
}

export const MAX_SIMULATION_STEP_SECONDS = 1 / 120;
export const MAX_FRAME_DELTA_SECONDS = 0.1;
export const BUMPER_KICK_SPEED = 560;
export const BUMPER_REARM_SECONDS = 0.14;
export const SLINGSHOT_REARM_SECONDS = 0.14;
export const MIN_SLINGSHOT_TRIGGER_SPEED = 40;

export const clampFrameDeltaSeconds = (deltaSeconds: number): number =>
  Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DELTA_SECONDS);

// Limit travel to one ball radius so a fast ball cannot cross a rail's
// centerline between collision samples and be resolved onto the wrong side.
export const getBallStepSeconds = (
  ball: BallState,
  gravity: number,
  remainingSeconds: number,
): number =>
  Math.min(
    remainingSeconds,
    MAX_SIMULATION_STEP_SECONDS,
    ball.radius /
      Math.max(
        1,
        Math.hypot(ball.linearVelocity.x, ball.linearVelocity.y) +
          Math.abs(gravity) * MAX_SIMULATION_STEP_SECONDS,
      ),
  );

export const MIN_CRADLE_POSITION = 0.08;
export const MAX_CRADLE_POSITION = 0.58;
export const MAX_CRADLE_CAPTURE_SPEED = 1100;
