import type { InputState, KeyboardInput } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import type { CanvasRenderer } from '../render/canvas-renderer';
import type { GameState } from './game-state';
import { getLaunchChargeRatio, stepGame } from './physics-engine';

export class GameLoop {
  private animationFrameId = 0;
  private lastFrameTime = 0;
  private running = false;

  constructor(
    private state: GameState,
    private readonly board: BoardDefinition,
    private readonly input: KeyboardInput,
    private readonly renderer: CanvasRenderer,
  ) {}

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastFrameTime = 0;
    this.input.connect();
    this.renderer.renderGame(this.board, this.state, this.input.getState());
    this.animationFrameId = window.requestAnimationFrame(this.onFrame);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    window.cancelAnimationFrame(this.animationFrameId);
    this.input.disconnect();
    this.running = false;
  }

  private readonly onFrame = (frameTime: number): void => {
    if (!this.running) {
      return;
    }

    const deltaSeconds =
      this.lastFrameTime === 0
        ? 1 / 60
        : (frameTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = frameTime;

    this.state = stepGame(
      this.state,
      this.board,
      this.input.getState(),
      deltaSeconds,
    );
    this.renderer.renderGame(this.board, this.state, this.input.getState());
    this.animationFrameId = window.requestAnimationFrame(this.onFrame);
  };
}

export const getStatusLabel = (state: GameState, input: InputState): string => {
  if (state.status === 'waiting-launch') {
    const launchPercent = Math.round(getLaunchChargeRatio(state) * 100);

    if (input.launchPressed) {
      return `Charging launcher: ${launchPercent}%`;
    }

    return 'Hold Space to charge the launcher. Release to fire the ball.';
  }

  return 'Z / Left Arrow and / / Right Arrow flip. Space charges the launcher.';
};
