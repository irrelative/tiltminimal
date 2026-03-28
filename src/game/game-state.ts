import type { BoardDefinition } from '../types/board-definition';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BallState {
  position: Vector3;
  linearVelocity: Vector3;
  angularVelocity: Vector3;
  radius: number;
  mass: number;
  momentOfInertia: number;
}

export interface GameState {
  ball: BallState;
  score: number;
  tick: number;
  status: 'waiting-launch' | 'playing';
  launcher: {
    chargeSeconds: number;
  };
  flippers: {
    leftEngaged: boolean;
    rightEngaged: boolean;
  };
}

export const createInitialGameState = (board: BoardDefinition): GameState => ({
  ball: createBallState(board),
  score: 0,
  tick: 0,
  status: 'waiting-launch',
  launcher: {
    chargeSeconds: 0,
  },
  flippers: {
    leftEngaged: false,
    rightEngaged: false,
  },
});

export const resetBall = (
  state: GameState,
  board: BoardDefinition,
): GameState => ({
  ...state,
  ball: createBallState(board),
  status: 'waiting-launch',
  launcher: {
    chargeSeconds: 0,
  },
  flippers: {
    leftEngaged: false,
    rightEngaged: false,
  },
});

export const createBallState = (board: BoardDefinition): BallState => {
  const radius = board.ball.radius;
  const mass = board.ball.mass;

  return {
    position: {
      x: board.launchPosition.x,
      y: board.launchPosition.y,
      z: radius,
    },
    linearVelocity: {
      x: 0,
      y: 0,
      z: 0,
    },
    angularVelocity: {
      x: 0,
      y: 0,
      z: 0,
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
