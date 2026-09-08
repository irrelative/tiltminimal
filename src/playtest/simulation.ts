import type { BoardDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import { stepGameFrame } from '../game/physics-engine';
import { applyRulesFrame } from '../game/rules-engine';
import { getDistanceToFlipperSurface } from '../game/flipper-geometry';

export const STEP_SECONDS = 1 / 120;
export const idle: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
  nudgeLeftPressed: false,
  nudgeRightPressed: false,
  nudgeUpPressed: false,
};
export interface InputChange {
  frame: number;
  input: InputState;
}
export interface PlaytestRun {
  id: string;
  initialState: GameState;
  inputs: InputChange[];
  frames: number;
  finalState: GameState;
  outcome: 'drained' | 'game-over' | 'timeout' | 'non-finite';
  maxSpeed: number;
  maxSpeedFrame: number;
  longestIdleSeconds: number;
  firstUpfieldX: number | null;
  firstHit: string | null;
  hits: Record<string, number>;
  drains: { seconds: number; x: number; ballSeconds: number }[];
  trajectory: { seconds: number; x: number; y: number }[];
  flags: string[];
}
export type Controller = (state: GameState, frame: number) => InputState;
export const simulate = (
  board: BoardDefinition,
  initialState: GameState,
  id: string,
  controller: Controller,
  seconds: number,
  stopOnDrain: boolean,
): PlaytestRun => {
  let state = initialState,
    previousInput = '',
    idleFrames = 0,
    ballStart = 0;
  const result: PlaytestRun = {
    id,
    initialState,
    inputs: [],
    frames: 0,
    finalState: state,
    outcome: 'timeout',
    maxSpeed: 0,
    maxSpeedFrame: 0,
    longestIdleSeconds: 0,
    firstUpfieldX: null,
    firstHit: null,
    hits: {},
    drains: [],
    trajectory: [],
    flags: [],
  };
  for (let frame = 0; frame < Math.round(seconds / STEP_SECONDS); frame++) {
    const input = { ...controller(state, frame) },
      serialized = JSON.stringify(input);
    if (serialized !== previousInput) {
      result.inputs.push({ frame, input });
      previousInput = serialized;
    }
    const before = state;
    const stepped = stepGameFrame(state, board, input, STEP_SECONDS);
    const physics = stepped.state;
    const speed = Math.hypot(
      physics.ball.linearVelocity.x,
      physics.ball.linearVelocity.y,
    );
    if (
      !Number.isFinite(
        speed + physics.ball.position.x + physics.ball.position.y,
      )
    ) {
      result.outcome = 'non-finite';
      result.flags.push('Non-finite ball dynamics');
      result.frames = frame + 1;
      state = physics;
      break;
    }
    if (speed > result.maxSpeed) {
      result.maxSpeed = speed;
      result.maxSpeedFrame = frame;
    }
    if (
      before.ball.position.y > 900 &&
      physics.ball.position.y <= 900 &&
      result.firstUpfieldX === null
    ) {
      const t =
        (before.ball.position.y - 900) /
        (before.ball.position.y - physics.ball.position.y);
      result.firstUpfieldX =
        before.ball.position.x +
        t * (physics.ball.position.x - before.ball.position.x);
    }
    for (const event of stepped.events) {
      if ('index' in event) {
        const key = `${event.type} #${event.index + 1}`;
        result.hits[key] = (result.hits[key] ?? 0) + 1;
        result.firstHit ??= key;
      }
      if (event.type === 'ball-launched') ballStart = frame * STEP_SECONDS;
      if (event.type === 'ball-drained')
        result.drains.push({
          seconds: (frame + 1) * STEP_SECONDS,
          x: before.ball.position.x,
          ballSeconds: (frame + 1) * STEP_SECONDS - ballStart,
        });
    }
    const legitimateRest =
      physics.saucers.some((s) => s.occupied) ||
      board.flippers.some(
        (f, i) =>
          physics.flippers[i].engaged &&
          getDistanceToFlipperSurface(
            physics.ball.position,
            f,
            physics.flippers[i].angle,
          ) <=
            physics.ball.radius + 2,
      );
    idleFrames =
      physics.status === 'playing' && speed < 5 && !legitimateRest
        ? idleFrames + 1
        : 0;
    result.longestIdleSeconds = Math.max(
      result.longestIdleSeconds,
      idleFrames * STEP_SECONDS,
    );
    if (
      physics.status === 'playing' &&
      (physics.ball.position.x < -physics.ball.radius - 5 ||
        physics.ball.position.x > board.width + physics.ball.radius + 5 ||
        physics.ball.position.y < -physics.ball.radius - 5)
    ) {
      if (!result.flags.includes('Ball escaped table bounds'))
        result.flags.push('Ball escaped table bounds');
    }
    state = applyRulesFrame(physics, board, stepped.events, STEP_SECONDS);
    result.frames = frame + 1;
    if (frame % 12 === 0)
      result.trajectory.push({
        seconds: (frame + 1) * STEP_SECONDS,
        x: physics.ball.position.x,
        y: physics.ball.position.y,
      });
    if (stopOnDrain && result.drains.length) {
      result.outcome = 'drained';
      break;
    }
    if (state.status === 'game-over') {
      result.outcome = 'game-over';
      break;
    }
  }
  result.finalState = state;
  if (result.maxSpeed > 4000)
    result.flags.push('Speed exceeded 4000 board units/s');
  if (result.longestIdleSeconds >= 3)
    result.flags.push('Unexplained near-rest lasted at least 3 seconds');
  return result;
};

export const replay = (board: BoardDefinition, run: PlaytestRun): GameState => {
  let state = run.initialState,
    input = idle,
    index = 0;
  for (let frame = 0; frame < run.frames; frame++) {
    if (run.inputs[index]?.frame === frame) input = run.inputs[index++].input;
    const next = stepGameFrame(state, board, input, STEP_SECONDS);
    state = applyRulesFrame(next.state, board, next.events, STEP_SECONDS);
  }
  return state;
};
