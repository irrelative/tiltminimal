import type { BoardDefinition } from '../types/board-definition';
import { defaultRulesScript } from './rules-defaults';
import type { GameState } from './game-state';
import { resetBall } from './game-state';
import {
  createInitialRulesState,
  type GameEvent,
  type RulesScopeName,
  type RulesState,
  type RulesValue,
} from './rules-types';

interface RulesModule {
  onGameStart?: (ctx: RulesContext) => void;
  onBallStart?: (ctx: RulesContext) => void;
  onEvent?: (event: GameEvent, ctx: RulesContext) => void;
  onTick?: (deltaMs: number, ctx: RulesContext) => void;
}

interface CompiledRulesModule {
  module: RulesModule;
  error: string | null;
}

interface RulesContext {
  addScore(points: number): void;
  addBonus(points: number): void;
  getBonus(): number;
  setBonus(points: number): void;
  getBonusMultiplier(): number;
  setBonusMultiplier(value: number): void;
  increaseBonusMultiplier(delta: number, max?: number): void;
  getScore(): number;
  getBallsRemaining(): number;
  setBallsRemaining(value: number): void;
  setBallsPerGame(value: number): void;
  getCurrentBall(): number;
  setCurrentBall(value: number): void;
  startNextBall(): void;
  endGame(): void;
  startMode(name: string, durationMs: number): void;
  stopMode(name: string): void;
  isModeActive(name: string): boolean;
  getModeTimeRemaining(name: string): number;
  getBall(key: string): RulesValue | undefined;
  setBall(key: string, value: RulesValue): void;
  incrementBall(key: string, amount?: number): number;
  getPlayer(key: string): RulesValue | undefined;
  setPlayer(key: string, value: RulesValue): void;
  incrementPlayer(key: string, amount?: number): number;
  getMachine(key: string): RulesValue | undefined;
  setMachine(key: string, value: RulesValue): void;
  incrementMachine(key: string, amount?: number): number;
}

const compiledRulesCache = new Map<string, CompiledRulesModule>();

export const initializeRulesState = (
  state: GameState,
  board: BoardDefinition,
): GameState => {
  const next: GameState = {
    ...state,
    score: 0,
    tick: 0,
    status: 'waiting-launch',
    rules: createInitialRulesState(),
  };
  const compiled = getCompiledRulesModule(board.rulesScript);
  const context = createRulesContext(next, board, compiled.module);

  compiled.module.onGameStart?.(context);
  compiled.module.onBallStart?.(context);

  return next;
};

export const applyRulesFrame = (
  state: GameState,
  board: BoardDefinition,
  events: GameEvent[],
  deltaSeconds: number,
): GameState => {
  const compiled = getCompiledRulesModule(board.rulesScript);
  const context = createRulesContext(state, board, compiled.module);
  const timerEvents = advanceModeTimers(state.rules, state.tick, deltaSeconds);

  compiled.module.onTick?.(deltaSeconds * 1000, context);

  for (const event of timerEvents) {
    compiled.module.onEvent?.(event, context);
  }

  for (const event of events) {
    compiled.module.onEvent?.(event, context);
  }

  return state;
};

export const validateRulesScript = (source: string): string | null =>
  getCompiledRulesModule(source).error;

const getCompiledRulesModule = (source: string): CompiledRulesModule => {
  const cacheKey = source.trim() || defaultRulesScript;
  const cached = compiledRulesCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const compiled = compileRulesModule(source);
  compiledRulesCache.set(cacheKey, compiled);

  return compiled;
};

const compileRulesModule = (source: string): CompiledRulesModule => {
  const script = source.trim() ? source : defaultRulesScript;

  try {
    const result = new Function(script)() as unknown;

    if (!result || typeof result !== 'object') {
      throw new Error('Rules script must return an object.');
    }

    return {
      module: result as RulesModule,
      error: null,
    };
  } catch (error) {
    if (script === defaultRulesScript) {
      throw error;
    }

    return {
      module: compileRulesModule(defaultRulesScript).module,
      error: error instanceof Error ? error.message : 'Invalid rules script.',
    };
  }
};

const advanceModeTimers = (
  rules: RulesState,
  tick: number,
  deltaSeconds: number,
): GameEvent[] => {
  const elapsedMs = Math.max(0, deltaSeconds * 1000);
  const events: GameEvent[] = [];

  if (elapsedMs <= 0) {
    return events;
  }

  for (const [name, mode] of Object.entries(rules.modes)) {
    mode.timeRemainingMs = Math.max(0, mode.timeRemainingMs - elapsedMs);

    if (mode.timeRemainingMs === 0) {
      delete rules.modes[name];
      events.push({
        type: 'mode-ended',
        name,
        tick,
      });
    }
  }

  return events;
};

const createRulesContext = (
  state: GameState,
  board: BoardDefinition,
  module: RulesModule,
): RulesContext => ({
  addScore(points) {
    state.score += normalizeWholeNumber(points);
  },
  addBonus(points) {
    state.rules.bonus += normalizeWholeNumber(points);
  },
  getBonus() {
    return state.rules.bonus;
  },
  setBonus(points) {
    state.rules.bonus = Math.max(0, normalizeWholeNumber(points));
  },
  getBonusMultiplier() {
    return state.rules.bonusMultiplier;
  },
  setBonusMultiplier(value) {
    state.rules.bonusMultiplier = Math.max(1, normalizeWholeNumber(value));
  },
  increaseBonusMultiplier(delta, max) {
    const nextValue = state.rules.bonusMultiplier + normalizeWholeNumber(delta);
    state.rules.bonusMultiplier =
      typeof max === 'number'
        ? Math.min(
            Math.max(1, nextValue),
            Math.max(1, normalizeWholeNumber(max)),
          )
        : Math.max(1, nextValue);
  },
  getScore() {
    return state.score;
  },
  getBallsRemaining() {
    return state.rules.ballsRemaining;
  },
  setBallsRemaining(value) {
    state.rules.ballsRemaining = Math.max(0, normalizeWholeNumber(value));
  },
  setBallsPerGame(value) {
    state.rules.ballsPerGame = Math.max(1, normalizeWholeNumber(value));
    state.rules.ballsRemaining = Math.min(
      state.rules.ballsRemaining,
      state.rules.ballsPerGame,
    );
    state.rules.currentBall = Math.min(
      state.rules.currentBall,
      state.rules.ballsPerGame,
    );
  },
  getCurrentBall() {
    return state.rules.currentBall;
  },
  setCurrentBall(value) {
    state.rules.currentBall = clampBallNumber(
      normalizeWholeNumber(value),
      state.rules.ballsPerGame,
    );
  },
  startNextBall() {
    const nextBall = Math.min(
      state.rules.currentBall + 1,
      state.rules.ballsPerGame,
    );
    const nextRemaining = Math.max(0, state.rules.ballsRemaining - 1);
    const resetState = resetBall(state, board);

    state.ball = resetState.ball;
    state.status = 'waiting-launch';
    state.plunger = resetState.plunger;
    state.flippers = resetState.flippers;
    state.standupTargets = resetState.standupTargets;
    state.dropTargets = resetState.dropTargets;
    state.saucers = resetState.saucers;
    state.spinners = resetState.spinners;
    state.rollovers = resetState.rollovers;
    state.rules.ballValues = {};
    state.rules.ballsRemaining = nextRemaining;
    state.rules.currentBall = clampBallNumber(
      nextBall,
      state.rules.ballsPerGame,
    );
    module.onBallStart?.(createRulesContext(state, board, module));
  },
  endGame() {
    state.status = 'game-over';
    state.rules.ballsRemaining = 0;
    state.plunger.pullback = 0;
    state.plunger.releaseSpeed = 0;
    state.ball.linearVelocity.x = 0;
    state.ball.linearVelocity.y = 0;
    state.ball.angularVelocity.x = 0;
    state.ball.angularVelocity.y = 0;
  },
  startMode(name, durationMs) {
    if (durationMs <= 0) {
      delete state.rules.modes[name];
      return;
    }

    state.rules.modes[name] = {
      timeRemainingMs: durationMs,
    };
  },
  stopMode(name) {
    delete state.rules.modes[name];
  },
  isModeActive(name) {
    return Boolean(state.rules.modes[name]);
  },
  getModeTimeRemaining(name) {
    return state.rules.modes[name]?.timeRemainingMs ?? 0;
  },
  getBall(key) {
    return getScopeValue(state.rules, 'ball', key);
  },
  setBall(key, value) {
    setScopeValue(state.rules, 'ball', key, value);
  },
  incrementBall(key, amount = 1) {
    return incrementScopeValue(state.rules, 'ball', key, amount);
  },
  getPlayer(key) {
    return getScopeValue(state.rules, 'player', key);
  },
  setPlayer(key, value) {
    setScopeValue(state.rules, 'player', key, value);
  },
  incrementPlayer(key, amount = 1) {
    return incrementScopeValue(state.rules, 'player', key, amount);
  },
  getMachine(key) {
    return getScopeValue(state.rules, 'machine', key);
  },
  setMachine(key, value) {
    setScopeValue(state.rules, 'machine', key, value);
  },
  incrementMachine(key, amount = 1) {
    return incrementScopeValue(state.rules, 'machine', key, amount);
  },
});

const getScopeValue = (
  rules: RulesState,
  scope: RulesScopeName,
  key: string,
): RulesValue | undefined => getScopeRecord(rules, scope)[key];

const setScopeValue = (
  rules: RulesState,
  scope: RulesScopeName,
  key: string,
  value: RulesValue,
): void => {
  getScopeRecord(rules, scope)[key] = value;
};

const incrementScopeValue = (
  rules: RulesState,
  scope: RulesScopeName,
  key: string,
  amount: number,
): number => {
  const record = getScopeRecord(rules, scope);
  const current = record[key];
  const nextValue =
    (typeof current === 'number' ? current : 0) + normalizeWholeNumber(amount);

  record[key] = nextValue;

  return nextValue;
};

const getScopeRecord = (
  rules: RulesState,
  scope: RulesScopeName,
): Record<string, RulesValue> => {
  switch (scope) {
    case 'ball':
      return rules.ballValues;
    case 'player':
      return rules.playerValues;
    case 'machine':
      return rules.machineValues;
  }
};

const normalizeWholeNumber = (value: number): number =>
  Number.isFinite(value) ? Math.round(value) : 0;

const clampBallNumber = (value: number, ballsPerGame: number): number =>
  Math.max(1, Math.min(Math.max(1, ballsPerGame), value));
