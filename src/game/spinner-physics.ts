import type {
  BoardDefinition,
  SolverPhysicsDefinition,
  SpinnerDefinition,
} from '../types/board-definition';
import type { GameState } from './game-state';
import type { GameEvent } from './rules-types';
import { getOrientedElementCollision, offsetPoint } from './physics-helpers';

const TURN = Math.PI * 2;

const positive = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

const tuning = (spinner: SpinnerDefinition) => ({
  impulseGain: positive(spinner.impulseGain, 0.1),
  maxAngularSpeed: positive(spinner.maxAngularSpeed, 120),
  damping:
    spinner.damping !== undefined &&
    Number.isFinite(spinner.damping) &&
    spinner.damping >= 0
      ? spinner.damping
      : 2,
});

/** A blade turns about its fixed axle; rotation does not sweep across the table. */
export const resolveSpinnerInteractions = (
  state: GameState,
  board: BoardDefinition,
  solver: SolverPhysicsDefinition,
): void => {
  const contacts = (state.ball.spinnerContacts ??= board.spinners.map(
    () => false,
  ));
  board.spinners.forEach((spinner, index) => {
    const rotor = state.spinners[index];
    if (!rotor) return;
    const collision = getOrientedElementCollision(
      state,
      offsetPoint(spinner, state.tableNudge.offset),
      spinner.length,
      spinner.thickness,
      spinner.angle,
      solver,
    );
    const wasTouching = contacts[index];
    contacts[index] = collision !== null;
    if (!collision || wasTouching) return;
    const speed =
      -(state.ball.linearVelocity.x - state.tableNudge.velocity.x) *
        Math.sin(spinner.angle) +
      (state.ball.linearVelocity.y - state.tableNudge.velocity.y) *
        Math.cos(spinner.angle);
    if (Math.abs(speed) < 60) return;
    const physics = tuning(spinner);
    const limit = physics.maxAngularSpeed;
    rotor.angularVelocity = Math.max(
      -limit,
      Math.min(limit, rotor.angularVelocity + speed * physics.impulseGain),
    );
    rotor.drivingBallId = state.ball.id;
  });
};

/** Exact drag integration keeps turn counts independent of frame/substep size. */
export const advanceSpinners = (
  state: GameState,
  board: BoardDefinition,
  deltaSeconds: number,
  events: GameEvent[],
): void => {
  state.spinners.forEach((rotor, index) => {
    const spinner = board.spinners[index];
    if (!spinner || deltaSeconds <= 0) return;
    const damping = tuning(spinner).damping;
    const decay = Math.exp(-damping * deltaSeconds);
    const travel =
      damping > 0
        ? (rotor.angularVelocity * -Math.expm1(-damping * deltaSeconds)) /
          damping
        : rotor.angularVelocity * deltaSeconds;
    rotor.angle = (rotor.angle + travel) % TURN;
    rotor.rotationProgress += travel;
    rotor.angularVelocity *= decay;
    while (Math.abs(rotor.rotationProgress) >= TURN) {
      rotor.rotationProgress -= Math.sign(rotor.rotationProgress) * TURN;
      events.push({
        type: 'spinner-spin',
        index,
        score: spinner.score,
        tick: state.tick,
        ballId: rotor.drivingBallId,
      });
    }
    if (Math.abs(rotor.angularVelocity) < 0.01) rotor.angularVelocity = 0;
  });
};
