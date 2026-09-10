import { PhysicsDebug, recordDebugEvents } from './physics-debug';
import type { InputSource, InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import type { CanvasRenderer } from '../render/canvas-renderer';
import type { GameAudio } from '../audio/game-audio';
import { getFrameAudioEvents } from '../audio/game-audio';
import type { GameState } from './game-state';
import { resetBall } from './game-state';
import {
  applyRulesFrame,
  initializeRulesState,
  restartCurrentBall,
} from './rules-engine';
import { getPlungerPullRatio, stepGameFrame } from './physics-engine';
import { clampFrameDeltaSeconds } from './physics-engine-types';

export class GameLoop {
  suspended = false;
  readonly debug = new PhysicsDebug();
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
    this.lastInputState = this.input.getState();
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastFrameTime = 0;
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
    this.renderer.renderGame(this.board, this.state, this.input.getState());
    this.emitStateChange();
  }

  setOnStateChange(listener: (state: GameState) => void): void {
    this.onStateChange = listener;
  }

  private readonly onFrame = (frameTime: number): void => {
    if (!this.running) {
      return;
    }

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
      this.renderer.renderGame(this.board, this.state, input, this.debug);
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
      this.state = initializeRulesState(
        resetBall(previousState, this.board),
        this.board,
      );
      previousState = this.state;
      this.audio?.startGame();
    } else {
      const frame = this.debug.capture(deltaSeconds, () => {
        const result = stepGameFrame(
          previousState,
          this.board,
          input,
          deltaSeconds,
        );
        recordDebugEvents(result.events);
        return result;
      });
      this.audio?.playGameEvents(frame.events);
      this.state = applyRulesFrame(
        frame.state,
        this.board,
        frame.events,
        deltaSeconds,
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
    this.renderer.renderGame(this.board, this.state, input, this.debug);
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
    return state.rules.ballValues['cross-phase'] === 'locked'
      ? 'Ball locked. Plunge for two-ball multiball.'
      : 'Ball locked. Plunge the replacement ball, then shoot the lit release target.';

  if (state.status === 'waiting-launch') {
    const launchPercent = Math.round(getPlungerPullRatio(state, board) * 100);

    if (input.launchPressed) {
      return `Pulling plunger: ${launchPercent}%`;
    }

    if (state.plunger.pullback > 0) {
      return 'Release Arrow Up and the plunger will strike the ball.';
    }

    return 'Hold Arrow Up or swipe down on the right side to pull back the plunger. Release to launch.';
  }

  return '';
};
