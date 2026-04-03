import type { InputState } from '../input/keyboard-input';
import type { ContactData } from './contact-types';
import type {
  DropTargetState,
  FlipperState,
  GameState,
  PlungerState,
  RolloverState,
  SaucerState,
  SlingshotState,
  SpinnerState,
  StandupTargetState,
  TableNudgeDirection,
  TableNudgeState,
} from './game-state';
import { cloneRulesState } from './rules-types';
import type {
  BoardDefinition,
  FlipperDefinition,
} from '../types/board-definition';
import {
  clamp,
  getVectorMagnitude,
  interpolate,
  movePointToward,
  offsetPoint,
  pointsNearlyEqual,
} from './physics-helpers';

const SAUCER_EJECT_ANGLE_JITTER = 0.12;
const SLINGSHOT_COMPRESSION_RECOVERY = 8;

export interface FlipperMotionFrame {
  previousAngle: number;
  next: FlipperState;
}

export interface PlungerMotionFrame {
  previousPullback: number;
  next: PlungerState;
  surfaceVelocity: ContactData['surfaceVelocity'];
}

export const clonePlayingGameState = (
  state: GameState,
  board: BoardDefinition,
): GameState => ({
  ...state,
  tick: state.tick + 1,
  ball: {
    ...state.ball,
    position: {
      ...state.ball.position,
    },
    linearVelocity: {
      ...state.ball.linearVelocity,
    },
    angularVelocity: {
      ...state.ball.angularVelocity,
    },
  },
  plunger: clonePlungerState(state.plunger),
  tableNudge: cloneTableNudgeState(state.tableNudge),
  flippers: board.flippers.map((flipper, index) =>
    cloneFlipperState(getFlipperState(state, flipper, index)),
  ),
  standupTargets: state.standupTargets.map(cloneStandupTargetState),
  dropTargets: state.dropTargets.map(cloneDropTargetState),
  saucers: state.saucers.map(cloneSaucerState),
  spinners: state.spinners.map(cloneSpinnerState),
  slingshots: state.slingshots.map(cloneSlingshotState),
  rollovers: state.rollovers.map(cloneRolloverState),
  rules: cloneRulesState(state.rules),
});

export const advancePlungerFrame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): PlungerMotionFrame => {
  const current = state.plunger;
  const pullRatio =
    board.plunger.travel > 0
      ? clamp(current.pullback / board.plunger.travel, 0, 1)
      : 0;
  const pullSpeed =
    board.physics.plunger.maxPullSeconds > 0
      ? board.plunger.travel / board.physics.plunger.maxPullSeconds
      : board.plunger.travel;
  const armedReleaseSpeed = interpolate(
    board.physics.plunger.minReleaseSpeed,
    board.physics.plunger.maxReleaseSpeed,
    pullRatio,
  );
  const releaseSpeed =
    input.launchPressed || current.pullback <= 0
      ? armedReleaseSpeed
      : current.releaseSpeed || armedReleaseSpeed;
  const nextPullback = input.launchPressed
    ? moveToward(
        current.pullback,
        board.plunger.travel,
        pullSpeed * deltaSeconds,
      )
    : moveToward(current.pullback, 0, releaseSpeed * deltaSeconds);
  const nextPullRatio =
    board.plunger.travel > 0
      ? clamp(nextPullback / board.plunger.travel, 0, 1)
      : 0;

  return {
    previousPullback: current.pullback,
    next: {
      pullback: nextPullback,
      releaseSpeed: input.launchPressed
        ? interpolate(
            board.physics.plunger.minReleaseSpeed,
            board.physics.plunger.maxReleaseSpeed,
            nextPullRatio,
          )
        : nextPullback > 0
          ? releaseSpeed
          : 0,
    },
    surfaceVelocity:
      deltaSeconds > 0
        ? {
            x: 0,
            y: (nextPullback - current.pullback) / deltaSeconds,
          }
        : { x: 0, y: 0 },
  };
};

export const advanceFlipperFrame = (
  state: GameState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): FlipperMotionFrame[] =>
  board.flippers.map((flipper, index) =>
    advanceFlipper(
      flipper,
      getFlipperState(state, flipper, index),
      flipper.side === 'left' ? input.leftPressed : input.rightPressed,
      deltaSeconds,
      board.physics.flipper.swingAngularSpeed,
    ),
  );

export const advanceElementStates = (
  state: GameState,
  board: BoardDefinition,
  deltaSeconds: number,
): void => {
  state.standupTargets.forEach((targetState) => {
    targetState.cooldownSeconds = Math.max(
      0,
      targetState.cooldownSeconds - deltaSeconds,
    );
  });

  state.spinners.forEach((spinnerState, index) => {
    spinnerState.cooldownSeconds = Math.max(
      0,
      spinnerState.cooldownSeconds - deltaSeconds,
    );
    spinnerState.angle += spinnerState.angularVelocity * deltaSeconds;
    spinnerState.angularVelocity *= Math.max(0, 1 - deltaSeconds * 7);

    if (Math.abs(spinnerState.angle) > Math.PI * 2) {
      spinnerState.angle %= Math.PI * 2;
    }

    if (Math.abs(spinnerState.angularVelocity) < 0.01) {
      spinnerState.angularVelocity = 0;
    }

    if (!board.spinners[index]) {
      spinnerState.angle = 0;
      spinnerState.angularVelocity = 0;
      spinnerState.cooldownSeconds = 0;
    }
  });

  state.slingshots.forEach((slingshotState) => {
    slingshotState.cooldownSeconds = Math.max(
      0,
      slingshotState.cooldownSeconds - deltaSeconds,
    );
    slingshotState.compression = Math.max(
      0,
      slingshotState.compression - deltaSeconds * SLINGSHOT_COMPRESSION_RECOVERY,
    );
  });
};

export const resolveOccupiedSaucer = (
  state: GameState,
  board: BoardDefinition,
  deltaSeconds: number,
): boolean => {
  const occupiedIndex = state.saucers.findIndex((saucer) => saucer.occupied);

  if (occupiedIndex === -1) {
    return false;
  }

  const saucer = board.saucers[occupiedIndex];
  const saucerState = state.saucers[occupiedIndex];

  if (!saucer || !saucerState) {
    return false;
  }

  saucerState.holdSecondsRemaining = Math.max(
    0,
    saucerState.holdSecondsRemaining - deltaSeconds,
  );
  const center = offsetPoint(saucer, state.tableNudge.offset);
  state.ball.position.x = center.x;
  state.ball.position.y = center.y;
  state.ball.linearVelocity.x = 0;
  state.ball.linearVelocity.y = 0;
  state.ball.angularVelocity.x = 0;
  state.ball.angularVelocity.y = 0;

  if (saucerState.holdSecondsRemaining === 0) {
    saucerState.occupied = false;
    const ejectAngle =
      saucer.ejectAngle + (Math.random() * 2 - 1) * SAUCER_EJECT_ANGLE_JITTER;
    state.ball.position.x =
      center.x + Math.cos(ejectAngle) * (saucer.radius + state.ball.radius + 4);
    state.ball.position.y =
      center.y + Math.sin(ejectAngle) * (saucer.radius + state.ball.radius + 4);
    state.ball.linearVelocity.x =
      state.tableNudge.velocity.x + Math.cos(ejectAngle) * saucer.ejectSpeed;
    state.ball.linearVelocity.y =
      state.tableNudge.velocity.y + Math.sin(ejectAngle) * saucer.ejectSpeed;
  }

  return true;
};

export const advanceTableNudgeState = (
  current: TableNudgeState,
  board: BoardDefinition,
  input: InputState,
  deltaSeconds: number,
): TableNudgeState => {
  const next = cloneTableNudgeState(current);
  const triggeredDirection = getTriggeredNudgeDirection(current, input);

  next.leftHeld = input.nudgeLeftPressed;
  next.rightHeld = input.nudgeRightPressed;
  next.upHeld = input.nudgeUpPressed;
  next.cooldownSeconds = Math.max(0, current.cooldownSeconds - deltaSeconds);

  if (triggeredDirection && next.cooldownSeconds === 0) {
    next.direction = triggeredDirection;
    next.phase = 'attack';
    next.phaseElapsedSeconds = 0;
    next.cooldownSeconds = board.physics.nudge.cooldownSeconds;
  }

  const previousOffset = { ...current.offset };

  if (next.direction && next.phase !== 'idle') {
    const displacement = board.physics.nudge[next.direction].displacement;

    if (next.phase === 'attack') {
      const attackSpeed =
        getVectorMagnitude(displacement) /
        Math.max(board.physics.nudge.attackSeconds, Number.EPSILON);
      next.offset = movePointToward(
        current.offset,
        displacement,
        attackSpeed * deltaSeconds,
      );
      next.phaseElapsedSeconds += deltaSeconds;

      if (pointsNearlyEqual(next.offset, displacement)) {
        next.offset = { ...displacement };
        next.phase = 'settle';
        next.phaseElapsedSeconds = 0;
      }
    } else {
      const settleSpeed =
        getVectorMagnitude(displacement) /
        Math.max(board.physics.nudge.settleSeconds, Number.EPSILON);
      next.offset = movePointToward(
        current.offset,
        { x: 0, y: 0 },
        settleSpeed * deltaSeconds,
      );
      next.phaseElapsedSeconds += deltaSeconds;

      if (pointsNearlyEqual(next.offset, { x: 0, y: 0 })) {
        next.offset = { x: 0, y: 0 };
        next.phase = 'idle';
        next.direction = null;
        next.phaseElapsedSeconds = 0;
      }
    }
  } else {
    next.offset = { x: 0, y: 0 };
    next.velocity = { x: 0, y: 0 };
    next.phase = 'idle';
    next.direction = null;
    next.phaseElapsedSeconds = 0;
  }

  next.velocity =
    deltaSeconds > 0
      ? {
          x: (next.offset.x - previousOffset.x) / deltaSeconds,
          y: (next.offset.y - previousOffset.y) / deltaSeconds,
        }
      : { x: 0, y: 0 };

  return next;
};

const advanceFlipper = (
  flipper: FlipperDefinition,
  current: FlipperState,
  engaged: boolean,
  deltaSeconds: number,
  swingAngularSpeed: number,
): FlipperMotionFrame => {
  const targetAngle = engaged ? flipper.activeAngle : flipper.restingAngle;
  const maxStep = swingAngularSpeed * deltaSeconds;
  const angle = moveToward(current.angle, targetAngle, maxStep);
  const angularVelocity =
    deltaSeconds > 0 ? (angle - current.angle) / deltaSeconds : 0;

  return {
    previousAngle: current.angle,
    next: {
      engaged,
      angle,
      angularVelocity,
    },
  };
};

const moveToward = (current: number, target: number, maxStep: number): number => {
  if (maxStep <= 0) {
    return current;
  }

  const delta = target - current;

  if (Math.abs(delta) <= maxStep) {
    return target;
  }

  return current + Math.sign(delta) * maxStep;
};

const getFlipperState = (
  state: GameState,
  flipper: FlipperDefinition,
  index: number,
): FlipperState => state.flippers[index] ?? createRestingFlipperState(flipper);

const createRestingFlipperState = (
  flipper: FlipperDefinition,
): FlipperState => ({
  engaged: false,
  angle: flipper.restingAngle,
  angularVelocity: 0,
});

const cloneFlipperState = (state: FlipperState): FlipperState => ({
  engaged: state.engaged,
  angle: state.angle,
  angularVelocity: state.angularVelocity,
});

const clonePlungerState = (state: PlungerState): PlungerState => ({
  ...state,
});

const cloneTableNudgeState = (state: TableNudgeState): TableNudgeState => ({
  offset: { ...state.offset },
  velocity: { ...state.velocity },
  phase: state.phase,
  direction: state.direction,
  phaseElapsedSeconds: state.phaseElapsedSeconds,
  cooldownSeconds: state.cooldownSeconds,
  leftHeld: state.leftHeld,
  rightHeld: state.rightHeld,
  upHeld: state.upHeld,
});

const cloneStandupTargetState = (
  state: StandupTargetState,
): StandupTargetState => ({
  ...state,
});

const cloneDropTargetState = (state: DropTargetState): DropTargetState => ({
  ...state,
});

const cloneSaucerState = (state: SaucerState): SaucerState => ({
  ...state,
});

const cloneSpinnerState = (state: SpinnerState): SpinnerState => ({
  ...state,
});

const cloneSlingshotState = (state: SlingshotState): SlingshotState => ({
  ...state,
});

const cloneRolloverState = (state: RolloverState): RolloverState => ({
  ...state,
});

const getTriggeredNudgeDirection = (
  state: TableNudgeState,
  input: InputState,
): TableNudgeDirection | null => {
  if (input.nudgeLeftPressed && !state.leftHeld) {
    return 'left';
  }

  if (input.nudgeRightPressed && !state.rightHeld) {
    return 'right';
  }

  if (input.nudgeUpPressed && !state.upHeld) {
    return 'up';
  }

  return null;
};
