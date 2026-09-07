import { validateBallRoutes } from './ball-routes';
import { getDistanceToFlipperSurface } from '../game/flipper-geometry';
import { createInitialGameState, type GameState } from '../game/game-state';
import { getGuideDistance } from '../game/guide-geometry';
import { getPlungerLaneBounds } from '../game/plunger-geometry';
import { stepGame } from '../game/physics-engine';
import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition, Point } from '../types/board-definition';

export type PlayabilityIssueCode =
  | 'route-failed'
  | 'plunge-does-not-enter-play'
  | 'plunge-returns-to-shooter-lane'
  | 'passive-ball-trap'
  | 'lane-livelock-risk';

export interface PlayabilityIssue {
  severity: 'error' | 'warning';
  code: PlayabilityIssueCode;
  message: string;
  point?: Point;
}

export type PlayabilityMode = 'normal' | 'deep';

export interface PlayabilityAnalysisOptions {
  mode?: PlayabilityMode;
  plungePowers?: number[];
  dropGridSpacing?: number;
  maxDropIssues?: number;
}

export interface PlungeSimulationResult {
  power: number;
  launched: boolean;
  exitedShooterLane: boolean;
  returnedToShooterLane: boolean;
  minX: number;
  maxX: number;
  minY: number;
  finalPosition: Point;
}

export interface DroppedBallSimulationResult {
  point: Point;
  outcome: 'drained' | 'captured' | 'active' | 'trapped' | 'livelock-risk';
  finalPosition: Point;
  spanX: number;
  spanY: number;
  finalSpeed: number;
}

const idleInput: InputState = {
  leftPressed: false,
  rightPressed: false,
  launchPressed: false,
  nudgeLeftPressed: false,
  nudgeRightPressed: false,
  nudgeUpPressed: false,
};

const DEFAULT_PLUNGE_POWERS = [0.55, 0.8, 1];
const PLUNGE_SIM_SECONDS = 4;
const DROP_SIM_SECONDS = 6;
const DROP_SETTLE_SECONDS = 2.5;
const NORMAL_DROP_GRID_SPACING = 120;
const DEEP_DROP_GRID_SPACING = 60;
const TRAP_MAX_SPAN = 42;
const TRAP_MAX_SPEED = 30;
const LIVE_PLAY_EXIT_MARGIN = 32;
const CHANNEL_SPAN_X = 48;
const CHANNEL_SPAN_Y = 180;
const DROP_PERTURBATION_SPEEDS = [-120, 120, -60, 60];

export const analyzePlayability = (
  board: BoardDefinition,
  options: PlayabilityAnalysisOptions = {},
): PlayabilityIssue[] => {
  const issues: PlayabilityIssue[] = [];
  const plungePowers = options.plungePowers ?? DEFAULT_PLUNGE_POWERS;

  for (const power of plungePowers) {
    const result = simulatePlunge(board, power);

    if (!result.launched) {
      issues.push({
        severity: power >= 0.75 ? 'error' : 'warning',
        code: 'plunge-does-not-enter-play',
        message: `A ${formatPower(power)} plunge did not launch the ball into play.`,
      });
      continue;
    }

    if (!result.exitedShooterLane) {
      issues.push({
        severity: power >= 0.75 ? 'error' : 'warning',
        code: 'plunge-does-not-enter-play',
        message: `A ${formatPower(power)} plunge stayed in the shooter lane instead of entering the playfield.`,
      });
      continue;
    }

    if (result.returnedToShooterLane) {
      issues.push({
        severity: 'warning',
        code: 'plunge-returns-to-shooter-lane',
        message: `A ${formatPower(power)} plunge entered play but settled back into the shooter lane.`,
      });
    }
  }

  issues.push(...analyzeDroppedBallSeeds(board, options));
  issues.push(...validateBallRoutes(board));

  return issues;
};

export const simulatePlunge = (
  board: BoardDefinition,
  power: number,
): PlungeSimulationResult => {
  const lane = getPlungerLaneBounds(board);
  const chargeSeconds =
    board.physics.plunger.maxPullSeconds * Math.min(Math.max(power, 0), 1);
  let state = createInitialGameState(board);
  state = stepGame(
    state,
    board,
    { ...idleInput, launchPressed: true },
    chargeSeconds,
  );

  let launched = false;
  for (let step = 0; step < 120; step += 1) {
    state = stepGame(state, board, idleInput, 1 / 120);

    if (state.status === 'playing') {
      launched = true;
      break;
    }
  }

  let minX = state.ball.position.x;
  let maxX = state.ball.position.x;
  let minY = state.ball.position.y;
  let exitedShooterLane = isOutsideShooterLane(state.ball.position, board);
  let returnedToShooterLane = false;
  const totalSteps = Math.ceil(PLUNGE_SIM_SECONDS * 60);

  for (let step = 0; step < totalSteps; step += 1) {
    state = stepGame(state, board, idleInput, 1 / 60);
    minX = Math.min(minX, state.ball.position.x);
    maxX = Math.max(maxX, state.ball.position.x);
    minY = Math.min(minY, state.ball.position.y);

    if (state.status === 'waiting-launch') {
      break;
    }

    if (isOutsideShooterLane(state.ball.position, board)) {
      exitedShooterLane = true;
    }

    if (
      exitedShooterLane &&
      state.ball.position.x >= lane.minX &&
      state.ball.position.x <= lane.maxX &&
      state.ball.position.y >= lane.topY &&
      state.ball.position.y <= lane.bottomY
    ) {
      returnedToShooterLane = true;
    }
  }

  return {
    power,
    launched,
    exitedShooterLane,
    returnedToShooterLane,
    minX,
    maxX,
    minY,
    finalPosition: { ...state.ball.position },
  };
};

export const simulateDroppedBall = (
  board: BoardDefinition,
  point: Point,
  initialVelocity: Point = { x: 0, y: 0 },
): DroppedBallSimulationResult => {
  let state = createPlayingStateAtPoint(board, point, initialVelocity);
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const totalSteps = Math.ceil(DROP_SIM_SECONDS * 60);
  const settleStartStep = Math.floor(DROP_SETTLE_SECONDS * 60);

  for (let step = 0; step < totalSteps; step += 1) {
    state = stepGame(state, board, idleInput, 1 / 60);

    if (state.status === 'waiting-launch') {
      return createDropResult(point, state, 'drained', 0, 0);
    }

    if (state.saucers.some((saucer) => saucer.occupied)) {
      return createDropResult(point, state, 'captured', 0, 0);
    }

    if (step < settleStartStep) {
      continue;
    }

    minX = Math.min(minX, state.ball.position.x);
    maxX = Math.max(maxX, state.ball.position.x);
    minY = Math.min(minY, state.ball.position.y);
    maxY = Math.max(maxY, state.ball.position.y);
  }

  const spanX = Number.isFinite(minX) ? maxX - minX : 0;
  const spanY = Number.isFinite(minY) ? maxY - minY : 0;
  const finalSpeed = Math.hypot(
    state.ball.linearVelocity.x,
    state.ball.linearVelocity.y,
  );

  if (isAcceptableRestingPoint(board, state)) {
    return createDropResult(point, state, 'active', spanX, spanY);
  }

  if (spanX <= CHANNEL_SPAN_X && spanY >= CHANNEL_SPAN_Y) {
    return createDropResult(point, state, 'livelock-risk', spanX, spanY);
  }

  if (Math.max(spanX, spanY) <= TRAP_MAX_SPAN && finalSpeed <= TRAP_MAX_SPEED) {
    return createDropResult(point, state, 'trapped', spanX, spanY);
  }

  return createDropResult(point, state, 'active', spanX, spanY);
};

const analyzeDroppedBallSeeds = (
  board: BoardDefinition,
  options: PlayabilityAnalysisOptions,
): PlayabilityIssue[] => {
  const issues: PlayabilityIssue[] = [];
  const spacing =
    options.dropGridSpacing ??
    (options.mode === 'deep'
      ? DEEP_DROP_GRID_SPACING
      : NORMAL_DROP_GRID_SPACING);
  const maxIssues = options.maxDropIssues ?? (options.mode === 'deep' ? 12 : 4);

  if (maxIssues <= 0) {
    return issues;
  }

  for (const point of collectDropSeedPoints(board, spacing)) {
    if (!isPlayableDropSeed(board, point)) {
      continue;
    }

    const result = simulateDroppedBall(board, point);

    if (result.outcome !== 'trapped' && result.outcome !== 'livelock-risk') {
      continue;
    }

    const stableTrap = DROP_PERTURBATION_SPEEDS.every((velocityX) => {
      const perturbed = simulateDroppedBall(board, point, {
        x: velocityX,
        y: 0,
      });

      return (
        perturbed.outcome === 'trapped' || perturbed.outcome === 'livelock-risk'
      );
    });

    if (!stableTrap) {
      continue;
    }

    issues.push({
      severity: 'warning',
      code:
        result.outcome === 'livelock-risk'
          ? 'lane-livelock-risk'
          : 'passive-ball-trap',
      message: `A dropped ball near (${Math.round(point.x)}, ${Math.round(point.y)}) ${result.outcome === 'livelock-risk' ? 'appears to stay in a narrow lane loop' : 'appears to settle without draining'}.`,
      point,
    });

    if (issues.length >= maxIssues) {
      break;
    }
  }

  return issues;
};

const collectDropSeedPoints = (
  board: BoardDefinition,
  spacing: number,
): Point[] => {
  const points: Point[] = [];
  const minX = board.ball.radius + spacing / 2;
  const maxX = board.width - board.ball.radius - spacing / 2;
  const minY = board.ball.radius + spacing / 2;
  const maxY = Math.min(
    board.height - board.ball.radius - spacing / 2,
    board.drainY,
  );

  for (let y = minY; y <= maxY; y += spacing) {
    for (let x = minX; x <= maxX; x += spacing) {
      points.push({ x, y });
    }
  }

  return [
    ...collectFocusedLaneSeeds(board),
    ...points.sort((left, right) => right.y - left.y),
  ];
};

const collectFocusedLaneSeeds = (board: BoardDefinition): Point[] => {
  const lane = getPlungerLaneBounds(board);
  const ys = [
    lane.topY + 80,
    lane.topY + 200,
    board.height * 0.55,
    board.height * 0.68,
    board.height * 0.8,
  ];
  const xs = [
    lane.minX - 36,
    lane.minX - 80,
    lane.maxX + 36,
    board.width - board.ball.radius * 3,
  ];

  return ys.flatMap((y) => xs.map((x) => ({ x, y })));
};

const isPlayableDropSeed = (board: BoardDefinition, point: Point): boolean => {
  if (
    point.x < board.ball.radius ||
    point.x > board.width - board.ball.radius ||
    point.y < board.ball.radius ||
    point.y > board.height - board.ball.radius
  ) {
    return false;
  }

  if (
    isInsideShooterLane(point, board) ||
    isInsideShooterLaneEnvelope(point, board)
  ) {
    return false;
  }

  if (point.y < board.height * 0.08) {
    return false;
  }

  if (
    board.bumpers.some((bumper) =>
      isInsideCircle(point, bumper, bumper.radius + board.ball.radius + 8),
    ) ||
    board.posts.some((post) =>
      isInsideCircle(point, post, post.radius + board.ball.radius + 8),
    ) ||
    board.saucers.some((saucer) =>
      isInsideCircle(point, saucer, saucer.radius + board.ball.radius + 8),
    ) ||
    board.rollovers.some((rollover) =>
      isInsideCircle(point, rollover, rollover.radius + board.ball.radius + 4),
    )
  ) {
    return false;
  }

  if (
    board.standupTargets.some((target) =>
      isInsideApproximateElement(point, target, target.width, target.height),
    ) ||
    board.dropTargets.some((target) =>
      isInsideApproximateElement(point, target, target.width, target.height),
    ) ||
    board.spinners.some((spinner) =>
      isInsideApproximateElement(
        point,
        spinner,
        spinner.length,
        spinner.thickness,
      ),
    ) ||
    board.slingshots.some((slingshot) =>
      isInsideApproximateElement(
        point,
        slingshot,
        slingshot.width,
        slingshot.height,
      ),
    )
  ) {
    return false;
  }

  if (
    board.guides.some(
      (guide) =>
        getGuideDistance(point, guide) <=
        board.ball.radius + guide.thickness / 2 + 8,
    )
  ) {
    return false;
  }

  return !board.flippers.some(
    (flipper) =>
      getDistanceToFlipperSurface(point, flipper, flipper.restingAngle) <=
      board.ball.radius + 18,
  );
};

const createPlayingStateAtPoint = (
  board: BoardDefinition,
  point: Point,
  initialVelocity: Point,
): GameState => {
  const state = createInitialGameState(board);

  return {
    ...state,
    status: 'playing',
    ball: {
      ...state.ball,
      position: { ...point },
      linearVelocity: { ...initialVelocity },
      angularVelocity: { x: 0, y: 0 },
      angularPosition: { x: 0, y: 0 },
    },
  };
};

const createDropResult = (
  point: Point,
  state: GameState,
  outcome: DroppedBallSimulationResult['outcome'],
  spanX: number,
  spanY: number,
): DroppedBallSimulationResult => ({
  point,
  outcome,
  finalPosition: { ...state.ball.position },
  spanX,
  spanY,
  finalSpeed: Math.hypot(
    state.ball.linearVelocity.x,
    state.ball.linearVelocity.y,
  ),
});

const isOutsideShooterLane = (
  point: Point,
  board: BoardDefinition,
): boolean => {
  const lane = getPlungerLaneBounds(board);

  return (
    point.x < lane.minX - LIVE_PLAY_EXIT_MARGIN ||
    point.x > lane.maxX + LIVE_PLAY_EXIT_MARGIN ||
    point.y < lane.topY - board.ball.radius
  );
};

const isInsideShooterLane = (point: Point, board: BoardDefinition): boolean => {
  const lane = getPlungerLaneBounds(board);

  return (
    point.x >= lane.minX - board.ball.radius &&
    point.x <= lane.maxX + board.ball.radius &&
    point.y >= lane.topY - board.ball.radius &&
    point.y <= lane.bottomY + board.ball.radius
  );
};

const isInsideShooterLaneEnvelope = (
  point: Point,
  board: BoardDefinition,
): boolean => {
  if (board.plunger.x <= board.width / 2) {
    return false;
  }

  const lane = getPlungerLaneBounds(board);

  return (
    point.x >= lane.minX - board.ball.radius * 3 &&
    point.y >= Math.max(0, lane.topY - board.plunger.guideLength * 0.75) &&
    point.y <= lane.bottomY + board.ball.radius
  );
};

const isAcceptableRestingPoint = (
  board: BoardDefinition,
  state: GameState,
): boolean =>
  state.ball.position.y >= board.drainY - board.ball.radius * 2 ||
  board.flippers.some(
    (flipper) =>
      getDistanceToFlipperSurface(
        state.ball.position,
        flipper,
        flipper.restingAngle,
      ) <=
      board.ball.radius + 24,
  );

const isInsideCircle = (point: Point, center: Point, radius: number): boolean =>
  Math.hypot(point.x - center.x, point.y - center.y) <= radius;

const isInsideApproximateElement = (
  point: Point,
  element: Point,
  width: number,
  height: number,
): boolean =>
  Math.hypot(point.x - element.x, point.y - element.y) <=
  Math.hypot(width / 2, height / 2) + 24;

const formatPower = (power: number): string => `${Math.round(power * 100)}%`;
