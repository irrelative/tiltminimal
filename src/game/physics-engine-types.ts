import type { GameState } from './game-state';
import type { GameEvent } from './rules-types';

export interface PhysicsStepResult {
  state: GameState;
  events: GameEvent[];
}

export const MAX_SIMULATION_STEP_SECONDS = 1 / 120;
export const SLINGSHOT_REARM_SECONDS = 0.14;
export const MIN_SLINGSHOT_TRIGGER_SPEED = 40;
