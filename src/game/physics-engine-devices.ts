import type {
  BoardDefinition,
  SolverPhysicsDefinition,
} from '../types/board-definition';
import type { GameState } from './game-state';
import { getSurfaceMaterial } from './materials';
import { MIN_SLINGSHOT_TRIGGER_SPEED, SLINGSHOT_REARM_SECONDS } from './physics-engine-types';
import {
  createStaticContact,
  getOrientedElementCollision,
  offsetPoint,
} from './physics-helpers';
import type { GameEvent } from './rules-types';
import { resolveBallContact } from './spin-solver';

export const resolveStandupTargetCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.standupTargets.forEach((target, index) => {
    const targetState = state.standupTargets[index];

    if (!targetState) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      offsetPoint(target, state.tableNudge.offset),
      target.width,
      target.height,
      target.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const material = getSurfaceMaterial(
      target.material,
      board.surfaceMaterials,
    );
    const incomingNormalSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) *
        collision.normal.x +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) *
        collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
          state.tableNudge.velocity,
        ),
        solver,
      );
    }

    if (targetState.cooldownSeconds <= 0) {
      events.push({
        type: 'standup-target-hit',
        index,
        score: target.score,
        tick: state.tick,
      });
      targetState.cooldownSeconds = 0.12;
    }
  });
};

export const resolveDropTargetCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.dropTargets.forEach((target, index) => {
    const targetState = state.dropTargets[index];

    if (!targetState || targetState.isDown) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      offsetPoint(target, state.tableNudge.offset),
      target.width,
      target.height,
      target.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const material = getSurfaceMaterial(
      target.material,
      board.surfaceMaterials,
    );
    const incomingNormalSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) *
        collision.normal.x +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) *
        collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
          state.tableNudge.velocity,
        ),
        solver,
      );
      events.push({
        type: 'drop-target-hit',
        index,
        score: target.score,
        tick: state.tick,
      });
      targetState.isDown = true;
    }
  });
};

export const resolveSlingshotCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.slingshots.forEach((slingshot, index) => {
    const slingshotState = state.slingshots[index];

    if (!slingshotState) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      offsetPoint(slingshot, state.tableNudge.offset),
      slingshot.width,
      slingshot.height,
      slingshot.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const material = getSurfaceMaterial(
      slingshot.material,
      board.surfaceMaterials,
    );
    const surfaceVelocity = state.tableNudge.velocity;
    const incomingNormalSpeed =
      (state.ball.linearVelocity.x - surfaceVelocity.x) * collision.normal.x +
      (state.ball.linearVelocity.y - surfaceVelocity.y) * collision.normal.y;

    if (incomingNormalSpeed < 0 || collision.overlap > solver.epsilon) {
      resolveBallContact(
        state.ball,
        createStaticContact(
          material,
          collision.point,
          collision.normal,
          collision.overlap,
          surfaceVelocity,
        ),
        solver,
      );
    }

    if (
      slingshotState.cooldownSeconds > 0 ||
      incomingNormalSpeed >= -MIN_SLINGSHOT_TRIGGER_SPEED
    ) {
      return;
    }

    state.ball.linearVelocity.x += collision.normal.x * slingshot.strength;
    state.ball.linearVelocity.y += collision.normal.y * slingshot.strength;
    slingshotState.cooldownSeconds = SLINGSHOT_REARM_SECONDS;
    slingshotState.compression = 1;
    events.push({
      type: 'slingshot-hit',
      index,
      score: slingshot.score,
      tick: state.tick,
    });
  });
};

export const resolvePostCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  for (const post of board.posts) {
    const postMaterial = getSurfaceMaterial(
      post.material,
      board.surfaceMaterials,
    );
    const center = offsetPoint(post, state.tableNudge.offset);
    const dx = state.ball.position.x - center.x;
    const dy = state.ball.position.y - center.y;
    const distance = Math.hypot(dx, dy) || solver.epsilon;
    const overlap = state.ball.radius + post.radius - distance;

    if (overlap <= 0) {
      continue;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const approachSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) * nx +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) * ny;
    const contact = createStaticContact(
      postMaterial,
      {
        x: center.x + nx * post.radius,
        y: center.y + ny * post.radius,
      },
      { x: nx, y: ny },
      overlap,
      state.tableNudge.velocity,
    );

    if (approachSpeed < 0 || overlap > solver.epsilon) {
      resolveBallContact(state.ball, contact, solver);
    }
  }
};

export const resolveBumperCollisions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  for (const [index, bumper] of board.bumpers.entries()) {
    const bumperMaterial = getSurfaceMaterial(
      bumper.material,
      board.surfaceMaterials,
    );
    const center = offsetPoint(bumper, state.tableNudge.offset);
    const dx = state.ball.position.x - center.x;
    const dy = state.ball.position.y - center.y;
    const distance = Math.hypot(dx, dy) || solver.epsilon;
    const overlap = state.ball.radius + bumper.radius - distance;

    if (overlap <= 0) {
      continue;
    }

    const nx = dx / distance;
    const ny = dy / distance;
    const approachSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) * nx +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) * ny;
    const contact = createStaticContact(
      bumperMaterial,
      {
        x: center.x + nx * bumper.radius,
        y: center.y + ny * bumper.radius,
      },
      { x: nx, y: ny },
      overlap,
      state.tableNudge.velocity,
    );

    if (approachSpeed < 0 || overlap > solver.epsilon) {
      resolveBallContact(state.ball, contact, solver);
      events.push({
        type: 'bumper-hit',
        index,
        score: bumper.score,
        tick: state.tick,
      });
    }
  }
};

export const resolveSaucerCaptures = (
  state: GameState,
  board: BoardDefinition,
  events: GameEvent[],
): void => {
  board.saucers.forEach((saucer, index) => {
    const saucerState = state.saucers[index];

    if (!saucerState || saucerState.occupied) {
      return;
    }

    const center = offsetPoint(saucer, state.tableNudge.offset);
    const distance = Math.hypot(
      state.ball.position.x - center.x,
      state.ball.position.y - center.y,
    );

    if (distance > saucer.radius - state.ball.radius * 0.15) {
      return;
    }

    saucerState.occupied = true;
    saucerState.holdSecondsRemaining = saucer.holdSeconds;
    events.push({
      type: 'saucer-captured',
      index,
      score: saucer.score,
      tick: state.tick,
    });
    state.ball.position.x = center.x;
    state.ball.position.y = center.y;
    state.ball.linearVelocity.x = 0;
    state.ball.linearVelocity.y = 0;
    state.ball.angularVelocity.x = 0;
    state.ball.angularVelocity.y = 0;
  });
};

export const resolveSpinnerInteractions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
  events: GameEvent[],
): void => {
  board.spinners.forEach((spinner, index) => {
    const spinnerState = state.spinners[index];

    if (!spinnerState || spinnerState.cooldownSeconds > 0) {
      return;
    }

    const collision = getOrientedElementCollision(
      state,
      offsetPoint(spinner, state.tableNudge.offset),
      spinner.length,
      spinner.thickness,
      spinner.angle + spinnerState.angle,
      solver,
    );

    if (!collision) {
      return;
    }

    const crossingSpeed =
      (state.ball.linearVelocity.x - state.tableNudge.velocity.x) *
        collision.normal.x +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) *
        collision.normal.y;

    if (Math.abs(crossingSpeed) < 60) {
      return;
    }

    spinnerState.angularVelocity +=
      Math.sign(-crossingSpeed) * Math.min(Math.abs(crossingSpeed) / 36, 18);
    spinnerState.cooldownSeconds = 0.08;
    events.push({
      type: 'spinner-spin',
      index,
      score: spinner.score,
      tick: state.tick,
    });
  });
};

export const resolveRolloverTriggers = (
  state: GameState,
  board: BoardDefinition,
  events: GameEvent[],
): void => {
  board.rollovers.forEach((rollover, index) => {
    const rolloverState = state.rollovers[index];

    if (!rolloverState || rolloverState.lit) {
      return;
    }

    const center = offsetPoint(rollover, state.tableNudge.offset);
    const distance = Math.hypot(
      state.ball.position.x - center.x,
      state.ball.position.y - center.y,
    );

    if (distance > rollover.radius + state.ball.radius * 0.3) {
      return;
    }

    rolloverState.lit = true;
    events.push({
      type: 'rollover-hit',
      index,
      score: rollover.score,
      tick: state.tick,
    });
  });
};
