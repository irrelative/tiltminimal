import type { BoardDefinition } from '../types/board-definition';
import {
  cloneRulesState,
  createInitialRulesState,
  type RulesState,
} from './rules-types';

export interface Vector2 {
  x: number;
  y: number;
}

export interface BallState {
  position: Vector2;
  linearVelocity: Vector2;
  angularVelocity: Vector2;
  radius: number;
  mass: number;
  momentOfInertia: number;
}

export interface FlipperState {
  engaged: boolean;
  angle: number;
  angularVelocity: number;
}

export interface PlungerState {
  pullback: number;
  releaseSpeed: number;
}

export interface StandupTargetState {
  cooldownSeconds: number;
}

export interface DropTargetState {
  isDown: boolean;
}

export interface SaucerState {
  occupied: boolean;
  holdSecondsRemaining: number;
}

export interface SpinnerState {
  angle: number;
  angularVelocity: number;
  cooldownSeconds: number;
}

export interface RolloverState {
  lit: boolean;
}

export interface GameState {
  ball: BallState;
  score: number;
  tick: number;
  status: 'waiting-launch' | 'playing' | 'game-over';
  plunger: PlungerState;
  flippers: FlipperState[];
  standupTargets: StandupTargetState[];
  dropTargets: DropTargetState[];
  saucers: SaucerState[];
  spinners: SpinnerState[];
  rollovers: RolloverState[];
  rules: RulesState;
}

export const createInitialGameState = (board: BoardDefinition): GameState => ({
  ball: createBallState(board),
  score: 0,
  tick: 0,
  status: 'waiting-launch',
  plunger: createPlungerState(),
  flippers: board.flippers.map(createFlipperState),
  standupTargets: board.standupTargets.map(createStandupTargetState),
  dropTargets: board.dropTargets.map(createDropTargetState),
  saucers: board.saucers.map(createSaucerState),
  spinners: board.spinners.map(createSpinnerState),
  rollovers: board.rollovers.map(createRolloverState),
  rules: createInitialRulesState(),
});

export const resetBall = (
  state: GameState,
  board: BoardDefinition,
): GameState => ({
  ...state,
  ball: createBallState(board),
  status: 'waiting-launch',
  plunger: createPlungerState(),
  flippers: board.flippers.map(createFlipperState),
  standupTargets: board.standupTargets.map(createStandupTargetState),
  dropTargets: board.dropTargets.map(createDropTargetState),
  saucers: board.saucers.map(createSaucerState),
  spinners: board.spinners.map(createSpinnerState),
  rollovers: board.rollovers.map(createRolloverState),
  rules: cloneRulesState(state.rules),
});

export const createBallState = (board: BoardDefinition): BallState => {
  const radius = board.ball.radius;
  const mass = board.ball.mass;

  return {
    position: {
      x: board.launchPosition.x,
      y: board.launchPosition.y,
    },
    linearVelocity: {
      x: 0,
      y: 0,
    },
    angularVelocity: {
      x: 0,
      y: 0,
    },
    radius,
    mass,
    momentOfInertia: getSolidSphereMomentOfInertia(mass, radius),
  };
};

export const getSolidSphereMomentOfInertia = (
  mass: number,
  radius: number,
): number => (2 / 5) * mass * radius * radius;

const createFlipperState = (
  flipper: BoardDefinition['flippers'][number],
): FlipperState => ({
  engaged: false,
  angle: flipper.restingAngle,
  angularVelocity: 0,
});

const createPlungerState = (): PlungerState => ({
  pullback: 0,
  releaseSpeed: 0,
});

const createStandupTargetState = (): StandupTargetState => ({
  cooldownSeconds: 0,
});

const createDropTargetState = (): DropTargetState => ({
  isDown: false,
});

const createSaucerState = (): SaucerState => ({
  occupied: false,
  holdSecondsRemaining: 0,
});

const createSpinnerState = (
  spinner: BoardDefinition['spinners'][number],
): SpinnerState => ({
  angle: spinner.angle,
  angularVelocity: 0,
  cooldownSeconds: 0,
});

const createRolloverState = (): RolloverState => ({
  lit: false,
});
