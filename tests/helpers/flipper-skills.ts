import type { BoardDefinition } from '../../src/types/board-definition';
import type { InputState } from '../../src/input/keyboard-input';
import {
  createInitialGameState,
  type GameState,
} from '../../src/game/game-state';
import { stepGameFrame } from '../../src/game/physics-engine';
import {
  getFlipperFaceNormal,
  getFlipperTipPosition,
  sampleFlipperProfile,
} from '../../src/game/flipper-geometry';
import { idleInput } from './game-fixture';
import { isSettledOn } from './post-pass';

export const skillStep = 1 / 120;
export type FallingSkill = 'dead-bounce' | 'live-catch' | 'drop-catch';
export interface FallingSkillSetup {
  skill: FallingSkill;
  source: number;
  speed: number;
  /** Frames from the start of the falling feed to the input change. */
  delay: number;
  impactPosition: number;
}

export const createFallingSkill = (
  board: BoardDefinition,
  setup: FallingSkillSetup,
) => {
  const f = board.flippers[setup.source];
  const angle = setup.skill === 'dead-bounce' ? f.restingAngle : f.activeAngle;
  const axis = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = getFlipperFaceNormal(f, angle);
  const center = {
    x: f.x + axis.x * f.length * setup.impactPosition,
    y: f.y + axis.y * f.length * setup.impactPosition,
  };
  const state = createInitialGameState(board);
  state.status = 'playing';
  state.launcherExited = true;
  const radius =
    sampleFlipperProfile(center, f, angle).radius + state.ball.radius;
  // Begin in free flight, 65 units above the upper face, with zero spin.
  state.ball.position = {
    x: center.x + normal.x * radius,
    y: center.y + normal.y * radius - 65,
  };
  state.ball.linearVelocity = { x: 0, y: setup.speed };
  if (setup.skill === 'drop-catch')
    state.flippers.forEach((sf, i) => {
      if (board.flippers[i].side === f.side) {
        sf.engaged = true;
        sf.angle = board.flippers[i].activeAngle;
      }
    });
  return state;
};

export const fallingSkillInput = (
  board: BoardDefinition,
  setup: FallingSkillSetup,
  frame: number,
): InputState => ({
  ...idleInput,
  [board.flippers[setup.source].side === 'left'
    ? 'leftPressed'
    : 'rightPressed']:
    setup.skill === 'live-catch'
      ? frame >= setup.delay
      : setup.skill === 'drop-catch' && frame < setup.delay,
});

export const runFallingSkill = (
  board: BoardDefinition,
  setup: FallingSkillSetup,
) => {
  let state = createFallingSkill(board, setup);
  let firstContactFrame = -1,
    firstContactSpeed = Infinity,
    minimumContactSpeed = Infinity;
  let settledFrames = 0,
    receiver = -1,
    slingFired = false,
    liveCaught = false;
  const f = board.flippers[setup.source];
  for (let frame = 0; frame < 360; frame++) {
    const result = stepGameFrame(
      state,
      board,
      fallingSkillInput(board, setup, frame),
      skillStep,
    );
    state = result.state;
    slingFired ||= result.events.some((e) => e.type === 'slingshot-hit');
    liveCaught ||= state.ball.liveCatchFlipper === setup.source;
    const p = sampleFlipperProfile(
      state.ball.position,
      f,
      state.flippers[setup.source].angle,
    );
    if (
      p.distance <= p.radius + state.ball.radius + 1 &&
      firstContactFrame < 0
    ) {
      firstContactFrame = frame;
      firstContactSpeed = Math.hypot(
        state.ball.linearVelocity.x,
        state.ball.linearVelocity.y,
      );
    }
    if (firstContactFrame >= 0 && frame - firstContactFrame < 12)
      minimumContactSpeed = Math.min(
        minimumContactSpeed,
        Math.hypot(state.ball.linearVelocity.x, state.ball.linearVelocity.y),
      );
    settledFrames = isSettledOn(state, board, setup.source)
      ? settledFrames + 1
      : 0;
    if (firstContactFrame >= 0)
      board.flippers.forEach((other, i) => {
        if (other.side !== f.side) {
          const q = sampleFlipperProfile(
            state.ball.position,
            other,
            state.flippers[i].angle,
          );
          if (q.distance <= q.radius + state.ball.radius + 1) receiver = i;
        }
      });
    if (state.status !== 'playing' || settledFrames >= 60 || receiver >= 0)
      break;
  }
  return {
    state,
    firstContactFrame,
    firstContactSpeed,
    minimumContactSpeed,
    caught: settledFrames >= 60,
    receiver,
    slingFired,
    liveCaught,
  };
};

export const runSlapSave = (
  board: BoardDefinition,
  source: number,
  nudgeFrame: number,
  flipFrame: number,
  extra = 20,
) => {
  const f = board.flippers[source];
  const tip = getFlipperTipPosition(f, f.restingAngle);
  let state: GameState = createInitialGameState(board);
  state.status = 'playing';
  state.launcherExited = true;
  state.ball.position = {
    x: tip.x + (f.side === 'left' ? extra : -extra),
    y: tip.y - 80,
  };
  state.ball.linearVelocity = { x: 0, y: 600 };
  let saved = false,
    drained = false;
  for (let frame = 0; frame < 180; frame++) {
    const result = stepGameFrame(
      state,
      board,
      {
        ...idleInput,
        [f.side === 'left' ? 'nudgeLeftPressed' : 'nudgeRightPressed']:
          frame === nudgeFrame,
        [f.side === 'left' ? 'leftPressed' : 'rightPressed']:
          frame >= flipFrame,
      },
      skillStep,
    );
    state = result.state;
    saved ||=
      state.ball.position.y < f.y - 100 && state.ball.linearVelocity.y < 0;
    drained ||= result.events.some((e) => e.type === 'ball-drained');
    if (saved || drained) break;
  }
  return { saved, drained };
};
