import {
  MIN_CRADLE_POSITION,
  MAX_CRADLE_POSITION,
} from '../game/physics-engine-types';
import type { BoardDefinition, Point } from '../types/board-definition';
import type { BallRouteDefinition, RouteGoal } from '../types/ball-route';
import type { GameEvent } from '../game/rules-types';
import { createInitialGameState, type GameState } from '../game/game-state';
import { stepGameFrame } from '../game/physics-engine';
import {
  getDistanceToFlipperSurface,
  sampleFlipperProfile,
  getFlipperFaceNormal,
} from '../game/flipper-geometry';
import type { InputState } from '../input/keyboard-input';

const idle: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
  nudgeLeftPressed: false,
  nudgeRightPressed: false,
  nudgeUpPressed: false,
};
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 0.01;
const touchesFlipper = (
  state: GameState,
  board: BoardDefinition,
  pivot?: Point,
) =>
  board.flippers.some(
    (flipper, index) =>
      (!pivot || near(flipper, pivot)) &&
      getDistanceToFlipperSurface(
        state.ball.position,
        flipper,
        state.flippers[index].angle,
      ) <=
        state.ball.radius + 0.1,
  );

const reachedGoal = (
  goal: RouteGoal,
  state: GameState,
  events: GameEvent[],
  board: BoardDefinition,
): boolean => {
  switch (goal.type) {
    case 'drain':
      return events.some((event) => event.type === 'ball-drained');
    case 'flipper':
      return touchesFlipper(state, board, goal.pivot);
    case 'region':
      return (
        state.status === 'playing' &&
        !state.saucers.some((cup) => cup.occupied) &&
        state.ball.position.x >= goal.min.x &&
        state.ball.position.x <= goal.max.x &&
        state.ball.position.y >= goal.min.y &&
        state.ball.position.y <= goal.max.y
      );
    case 'event':
      return events.some((event) => {
        if (event.type !== goal.event || !('index' in event)) return false;
        if (!goal.position) return true;
        const features = {
          'bumper-hit': board.bumpers,
          'rollover-hit': board.rollovers,
          'spinner-spin': board.spinners,
          'saucer-captured': board.saucers,
          'standup-target-hit': board.standupTargets,
          'drop-target-hit': board.dropTargets,
        };
        const feature = features[goal.event][event.index];
        return Boolean(feature && near(feature, goal.position));
      });
  }
};

export interface BallRouteIssue {
  severity: 'error';
  code: 'route-failed';
  message: string;
}
export const validateBallRoutes = (board: BoardDefinition): BallRouteIssue[] =>
  (board.routes ?? []).flatMap((route) => {
    const count =
      route.start.type === 'plunge'
        ? route.start.powers.length
        : route.start.velocities.length;
    if (
      !count ||
      !route.goals.length ||
      !Number.isFinite(route.timeoutSeconds) ||
      route.timeoutSeconds <= 0 ||
      route.timeoutSeconds > 15
    ) {
      return [
        {
          severity: 'error',
          code: 'route-failed',
          message: `${route.id}: route needs samples, goals, and a duration in (0, 15] seconds.`,
        },
      ];
    }
    return Array.from({ length: count }, (_, index) => {
      const failure =
        simulateRoute(board, route, index) ??
        (route.cradle ? simulateCradleFeed(board, route, index) : null);
      return failure
        ? {
            severity: 'error' as const,
            code: 'route-failed' as const,
            message: `${route.id} sample ${index + 1}: ${failure}`,
          }
        : null;
    }).filter((issue): issue is BallRouteIssue => issue !== null);
  });

const simulateRoute = (
  board: BoardDefinition,
  route: BallRouteDefinition,
  sample: number,
): string | null => {
  let state = createInitialGameState(board);
  if (route.start.type === 'plunge') {
    const power = route.start.powers[sample];
    if (!Number.isFinite(power) || power <= 0 || power > 1)
      return 'plunge power must be in (0, 1].';
    state = stepGameFrame(
      state,
      board,
      { ...idle, launchPressed: true },
      board.physics.plunger.maxPullSeconds * power,
    ).state;
  } else {
    state.status = 'playing';
    state.launcherExited = true;
    state.ball.position = { ...route.start.position };
    state.ball.linearVelocity = { ...route.start.velocities[sample] };
  }
  let goalIndex = 0;
  const frames = Math.ceil(route.timeoutSeconds * 120);
  for (let frame = 0; frame < frames; frame += 1) {
    const result = stepGameFrame(state, board, idle, 1 / 120);
    state = result.state;
    if (route.avoidFlippers && touchesFlipper(state, board))
      return 'crossed a flipper on a drain route.';
    const availableEvents = [...result.events];
    while (
      goalIndex < route.goals.length &&
      reachedGoal(route.goals[goalIndex], state, availableEvents, board)
    ) {
      const goal = route.goals[goalIndex];
      if (goal.type === 'event' || goal.type === 'drain') {
        const match = availableEvents.findIndex((event) =>
          reachedGoal(goal, state, [event], board),
        );
        availableEvents.splice(match, 1);
      }
      goalIndex += 1;
    }
    if (goalIndex === route.goals.length) return null;
    if (result.events.some((event) => event.type === 'ball-drained'))
      return `drained before goal ${goalIndex + 1} (${route.goals[goalIndex].type}).`;
  }
  return `did not reach goal ${goalIndex + 1} (${route.goals[goalIndex].type}) within ${route.timeoutSeconds}s.`;
};

// Keep feed/catch validation separate from passive shot routing: touching a
// flipper once does not establish that its return lane supports a cradle.
export const simulateCradleFeed = (
  board: BoardDefinition,
  route: BallRouteDefinition,
  sample: number,
): string | null => {
  if (!route.cradle || route.start.type !== 'feed')
    return 'cradle requires a feed start';
  const index = board.flippers.findIndex((f) => near(f, route.cradle!.pivot));
  const flipper = board.flippers[index];
  if (!flipper) return 'cradle destination flipper is missing';
  let state = createInitialGameState(board);
  state.status = 'playing';
  state.launcherExited = true;
  state.ball.position = { ...route.start.position };
  state.ball.linearVelocity = { ...route.start.velocities[sample] };
  state.flippers.forEach((f, i) => {
    if (board.flippers[i].side === flipper.side) {
      f.angle = board.flippers[i].activeAngle;
      f.engaged = true;
    }
  });
  const input = {
    ...idle,
    leftPressed: flipper.side === 'left',
    rightPressed: flipper.side === 'right',
  };
  let settledFrames = 0;
  for (let frame = 0; frame < Math.ceil(route.timeoutSeconds * 120); frame++) {
    state = stepGameFrame(state, board, input, 1 / 120).state;
    if (state.status !== 'playing')
      return 'inlane drained before settling in cradle';
    const profile = sampleFlipperProfile(
      state.ball.position,
      flipper,
      state.flippers[index].angle,
    );
    const normal = getFlipperFaceNormal(flipper, state.flippers[index].angle);
    const caught =
      profile.t >= MIN_CRADLE_POSITION &&
      profile.t <= MAX_CRADLE_POSITION &&
      profile.distance <= profile.radius + state.ball.radius + 1 &&
      profile.normal.x * normal.x + profile.normal.y * normal.y > 0 &&
      Math.hypot(state.ball.linearVelocity.x, state.ball.linearVelocity.y) < 5;
    settledFrames = caught ? settledFrames + 1 : 0;
    if (settledFrames >= 60) {
      const caught = { ...state.ball.position };
      for (let releaseFrame = 0; releaseFrame < 120; releaseFrame++) {
        state = stepGameFrame(state, board, idle, 1 / 120).state;
        if (
          Math.hypot(
            state.ball.position.x - caught.x,
            state.ball.position.y - caught.y,
          ) > state.ball.radius
        )
          return null;
      }
      return 'caught feed stays wedged after lowering the flipper';
    }
  }
  return 'feed did not settle on the held flipper for 0.5 seconds';
};
