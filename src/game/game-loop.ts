import { FramePerformance } from './frame-performance';
import { PhysicsDebug, recordDebugEvents } from './physics-debug';
import type { InputSource, InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import type { CanvasRenderer } from '../render/canvas-renderer';
import type { GameAudio } from '../audio/game-audio';
import { getFrameAudioEvents } from '../audio/game-audio';
import type { GameState } from './game-state';
import { createInitialGameState } from './game-state';
import { initializeRulesState, restartCurrentBall } from './rules-engine';
import { getPlungerPullRatio } from './physics-engine';
import { advanceGameFrame } from './advance-game';
import { ReplayRecorder } from '../playtest/recorder';
import { clampFrameDeltaSeconds } from './physics-engine-types';

export class GameLoop {
  private isSuspended = false;

  get suspended(): boolean {
    return this.isSuspended;
  }

  set suspended(value: boolean) {
    if (value === this.isSuspended) return;
    this.isSuspended = value;
    this.input.reset?.();
    this.lastInputState = this.input.getState();
    // A paused pull must not launch when the player releases their controls.
    if (value && this.state.status === 'waiting-launch') {
      this.state.plunger = { pullback: 0, releaseSpeed: 0 };
    }
    this.recorder?.reset(this.state, true);
  }
  readonly debug = new PhysicsDebug();
  readonly performance = new FramePerformance();
  readonly recorder: ReplayRecorder;
  private animationFrameId = 0;
  private lastFrameTime = 0;
  private running = false;
  private onStateChange?: (state: GameState) => void;
  private lastInputState: InputState;

  constructor(
    private state: GameState,
    private readonly board: BoardDefinition,
    private readonly input: InputSource,
    private readonly renderer: CanvasRenderer,
    private readonly audio?: GameAudio,
  ) {
    this.state = initializeRulesState(this.state, this.board);
    this.recorder = new ReplayRecorder(this.board, this.state);
    this.lastInputState = this.input.getState();
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastFrameTime = 0;
    this.performance.reset();
    this.lastInputState = this.input.getState();
    this.input.connect();
    this.audio?.connect(this.board);
    this.renderer.renderGame(this.board, this.state, this.input.getState());
    this.emitStateChange();
    this.animationFrameId = window.requestAnimationFrame(this.onFrame);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrameId);
    this.input.disconnect();
    this.audio?.disconnect();
    this.running = false;
  }

  resetBall(): void {
    this.debug.clear();
    this.state = restartCurrentBall(this.state, this.board);
    this.recorder.reset(this.state, true);
    this.renderer.renderGame(this.board, this.state, this.input.getState());
    this.emitStateChange();
  }

  restartGame(): void {
    if (this.state.status !== 'game-over') return;
    this.input.reset?.();
    this.lastInputState = this.input.getState();
    this.beginNewGame();
    this.renderer.renderGame(this.board, this.state, this.lastInputState);
    this.emitStateChange();
  }

  private beginNewGame(): void {
    this.debug.clear();
    this.state = initializeRulesState(
      createInitialGameState(this.board),
      this.board,
    );
    this.recorder.reset(this.state);
    this.audio?.startGame();
  }

  setOnStateChange(listener: (state: GameState) => void): void {
    this.onStateChange = listener;
  }

  private readonly onFrame = (frameTime: number): void => {
    if (!this.running) {
      return;
    }

    this.performance.begin(frameTime, document.hidden);
    const deltaSeconds = this.suspended
      ? 0
      : this.debug.delta(
          clampFrameDeltaSeconds(
            this.lastFrameTime === 0
              ? 1 / 60
              : (frameTime - this.lastFrameTime) / 1000,
          ),
        );
    this.lastFrameTime = frameTime;
    const input = this.input.getState();
    if (deltaSeconds === 0) {
      this.performance.rendering();
      this.renderer.renderGame(this.board, this.state, input, this.debug);
      this.performance.end();
      this.emitStateChange();
      this.animationFrameId = window.requestAnimationFrame(this.onFrame);
      return;
    }
    let previousState = this.state;

    if (
      previousState.status === 'game-over' &&
      input.launchPressed &&
      !this.lastInputState.launchPressed
    ) {
      this.beginNewGame();
      previousState = this.state;
    } else {
      const frame = this.debug.capture(deltaSeconds, () => {
        const result = advanceGameFrame(
          previousState,
          this.board,
          input,
          deltaSeconds,
        );
        recordDebugEvents(result.events);
        return result;
      });
      this.audio?.playGameEvents(frame.events);
      this.state = frame.state;
      this.recorder.record(
        previousState,
        this.state,
        input,
        deltaSeconds,
        frame.events,
      );
    }

    this.audio?.playEvents(
      getFrameAudioEvents(
        previousState,
        this.state,
        this.lastInputState,
        input,
        this.board,
        deltaSeconds,
      ),
    );
    this.lastInputState = input;
    this.performance.rendering();
    this.renderer.renderGame(this.board, this.state, input, this.debug);
    this.performance.end();
    this.emitStateChange();
    this.animationFrameId = window.requestAnimationFrame(this.onFrame);
  };

  private emitStateChange(): void {
    this.onStateChange?.(this.state);
  }
}

export const getStatusLabel = (
  state: GameState,
  input: InputState,
  board: BoardDefinition,
): string => {
  if (state.status === 'game-over') {
    return 'Game over.';
  }

  if (state.additionalBalls.length)
    return `${1 + state.additionalBalls.length}-ball multiball — keep both balls in play.`;
  if (state.lockedBalls.length && state.status === 'waiting-launch')
    return state.rules.ballValues['cross-phase'] === 'locked' ||
      state.rules.ballValues.phase === 'locked'
      ? 'Ball locked. Plunge for two-ball multiball.'
      : 'Ball locked. Plunge the replacement ball, then shoot the lit release target.';

  if (state.status === 'waiting-launch') {
    const launchPercent = Math.round(getPlungerPullRatio(state, board) * 100);

    if (input.launchPressed) {
      return `Pulling plunger: ${launchPercent}%`;
    }

    if (state.plunger.pullback > 0) {
      return 'Release the plunger to launch.';
    }

    return '';
  }

  return '';
};
