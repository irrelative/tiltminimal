export type RulesValue =
  | null
  | boolean
  | number
  | string
  | RulesValue[]
  | { [key: string]: RulesValue };

export type RulesScopeName = 'ball' | 'player' | 'machine';

export interface RulesModeState {
  timeRemainingMs: number;
}

export interface RulesState {
  ballsPerGame: number;
  ballsRemaining: number;
  currentBall: number;
  bonus: number;
  bonusMultiplier: number;
  ballValues: Record<string, RulesValue>;
  playerValues: Record<string, RulesValue>;
  machineValues: Record<string, RulesValue>;
  modes: Record<string, RulesModeState>;
}

interface BaseGameEvent {
  tick: number;
}

export interface BallLaunchedEvent extends BaseGameEvent {
  type: 'ball-launched';
}

export interface BallDrainedEvent extends BaseGameEvent {
  type: 'ball-drained';
}

export interface BumperHitEvent extends BaseGameEvent {
  type: 'bumper-hit';
  index: number;
  score: number;
}

export interface StandupTargetHitEvent extends BaseGameEvent {
  type: 'standup-target-hit';
  index: number;
  score: number;
}

export interface DropTargetHitEvent extends BaseGameEvent {
  type: 'drop-target-hit';
  index: number;
  score: number;
}

export interface SaucerCapturedEvent extends BaseGameEvent {
  type: 'saucer-captured';
  index: number;
  score: number;
}

export interface SpinnerSpinEvent extends BaseGameEvent {
  type: 'spinner-spin';
  index: number;
  score: number;
}

export interface RolloverHitEvent extends BaseGameEvent {
  type: 'rollover-hit';
  index: number;
  score: number;
}

export interface ModeEndedEvent extends BaseGameEvent {
  type: 'mode-ended';
  name: string;
}

export type GameEvent =
  | BallDrainedEvent
  | BallLaunchedEvent
  | BumperHitEvent
  | DropTargetHitEvent
  | ModeEndedEvent
  | RolloverHitEvent
  | SaucerCapturedEvent
  | SpinnerSpinEvent
  | StandupTargetHitEvent;

export const createInitialRulesState = (): RulesState => ({
  ballsPerGame: 3,
  ballsRemaining: 3,
  currentBall: 1,
  bonus: 0,
  bonusMultiplier: 1,
  ballValues: {},
  playerValues: {},
  machineValues: {},
  modes: {},
});

export const cloneRulesState = (state: RulesState): RulesState => ({
  ballsPerGame: state.ballsPerGame,
  ballsRemaining: state.ballsRemaining,
  currentBall: state.currentBall,
  bonus: state.bonus,
  bonusMultiplier: state.bonusMultiplier,
  ballValues: cloneRulesRecord(state.ballValues),
  playerValues: cloneRulesRecord(state.playerValues),
  machineValues: cloneRulesRecord(state.machineValues),
  modes: Object.fromEntries(
    Object.entries(state.modes).map(([name, mode]) => [
      name,
      {
        timeRemainingMs: mode.timeRemainingMs,
      },
    ]),
  ),
});

const cloneRulesRecord = (
  record: Record<string, RulesValue>,
): Record<string, RulesValue> =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, cloneRulesValue(value)]),
  );

const cloneRulesValue = (value: RulesValue): RulesValue => {
  if (Array.isArray(value)) {
    return value.map(cloneRulesValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        cloneRulesValue(entry),
      ]),
    );
  }

  return value;
};
