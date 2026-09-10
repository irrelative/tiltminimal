import {
  createInitialGameState,
  type GameState,
} from '../../src/game/game-state';
import { stepGameFrame } from '../../src/game/physics-engine';
import {
  getFlipperFaceNormal,
  sampleFlipperProfile,
} from '../../src/game/flipper-geometry';
import {
  getSlingshotAngle,
  getSlingshotRubberRadius,
} from '../../src/game/slingshot-geometry';
import type { BoardDefinition } from '../../src/types/board-definition';
import { idleInput } from './game-fixture';

const dt = 1 / 120;
const bothHeld = { ...idleInput, leftPressed: true, rightPressed: true };

export const isSettledOn = (
  state: GameState,
  board: BoardDefinition,
  index: number,
): boolean => {
  const flipper = board.flippers[index];
  const profile = sampleFlipperProfile(
    state.ball.position,
    flipper,
    state.flippers[index].angle,
  );
  const normal = getFlipperFaceNormal(flipper, state.flippers[index].angle);
  return (
    state.status === 'playing' &&
    profile.t >= 0.08 &&
    profile.t <= 0.58 &&
    profile.distance <= profile.radius + state.ball.radius + 0.1 &&
    profile.normal.x * normal.x + profile.normal.y * normal.y > 0.9 &&
    Math.hypot(state.ball.linearVelocity.x, state.ball.linearVelocity.y) < 5
  );
};

export const createPostPassCradle = (
  board: BoardDefinition,
  source: number,
): GameState => {
  let state = createInitialGameState(board);
  state.status = 'playing';
  state.launcherExited = true;
  state.flippers.forEach((f, i) => {
    f.angle = board.flippers[i].activeAngle;
    f.engaged = true;
  });
  const flipper = board.flippers[source],
    angle = flipper.activeAngle;
  const normal = getFlipperFaceNormal(flipper, angle);
  const center = {
    x: flipper.x + Math.cos(angle) * flipper.length * 0.3,
    y: flipper.y + Math.sin(angle) * flipper.length * 0.3,
  };
  const radius =
    sampleFlipperProfile(center, flipper, angle).radius +
    state.ball.radius -
    0.01;
  state.ball.position = {
    x: center.x + normal.x * radius,
    y: center.y + normal.y * radius,
  };
  // Let the shared solver roll and settle the ball; do not teleport into a pass.
  for (let frame = 0; frame < 240; frame++)
    state = stepGameFrame(state, board, bothHeld, dt).state;
  return state;
};

export const simulatePostPass = (
  board: BoardDefinition,
  cradle: GameState,
  source: number,
  receiver: number,
  slingIndex: number,
  releaseFrames: number,
) => {
  let state = structuredClone(cradle);
  const sling = board.slingshots[slingIndex];
  const angle = getSlingshotAngle(board, sling);
  const lowerSign = Math.sin(angle) > 0 ? 1 : -1;
  const post = {
    x: sling.x + (lowerSign * Math.cos(angle) * sling.width) / 2,
    y: sling.y + (lowerSign * Math.sin(angle) * sling.width) / 2,
  };
  let postContact = false,
    slingFired = false,
    settledFrames = 0;
  for (let frame = 0; frame < 480; frame++) {
    const result = stepGameFrame(
      state,
      board,
      {
        ...bothHeld,
        [board.flippers[source].side === 'left'
          ? 'leftPressed'
          : 'rightPressed']: frame >= releaseFrames,
      },
      dt,
    );
    state = result.state;
    postContact ||=
      Math.hypot(
        state.ball.position.x - post.x,
        state.ball.position.y - post.y,
      ) <
      state.ball.radius + getSlingshotRubberRadius(sling) + 0.5;
    slingFired ||= result.events.some(
      (event) => event.type === 'slingshot-hit',
    );
    settledFrames = isSettledOn(state, board, receiver) ? settledFrames + 1 : 0;
    if (settledFrames >= 60 || state.status !== 'playing') break;
  }
  return { postContact, slingFired, caught: settledFrames >= 60 };
};
