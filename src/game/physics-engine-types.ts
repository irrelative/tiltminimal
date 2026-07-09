import type { GameState } from './game-state';
import type { GameEvent } from './rules-types';

export interface PhysicsStepResult {
  state: GameState;
  events: GameEvent[];
}

export const MAX_SIMULATION_STEP_SECONDS = 1 / 120;
export const MAX_FRAME_DELTA_SECONDS = 0.1;
export const SLINGSHOT_REARM_SECONDS = 0.14;
export const MIN_SLINGSHOT_TRIGGER_SPEED = 40;

export const clampFrameDeltaSeconds = (deltaSeconds: number): number =>
  Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DELTA_SECONDS);
