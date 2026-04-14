import type { InputSource } from '../input/keyboard-input';
import type { CanvasRenderer } from '../render/canvas-renderer';
import type { BoardDefinition, Point } from '../types/board-definition';
import {
  clearPhysicsSandboxBalls,
  createPhysicsSandboxState,
  getSelectedPhysicsSandboxBall,
  resetPhysicsSandboxState,
  setPhysicsSandboxAngularVelocity,
  setPhysicsSandboxLinearVelocity,
  setPhysicsSandboxPaused,
  setPhysicsSandboxSpawnMode,
  spawnPhysicsSandboxBall,
  stepPhysicsSandbox,
  type PhysicsSandboxSpawnMode,
  type PhysicsSandboxState,
} from './physics-sandbox';

export class PhysicsSandboxLoop {
  private animationFrameId = 0;
  private lastFrameTime = 0;
  private running = false;
  private onStateChange?: (state: PhysicsSandboxState) => void;

  constructor(
    private state: PhysicsSandboxState,
    private readonly board: BoardDefinition,
    private readonly input: InputSource,
    private readonly renderer: CanvasRenderer,
  ) {}

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastFrameTime = 0;
    this.input.connect();
    this.render();
    this.emitStateChange();
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

  setOnStateChange(listener: (state: PhysicsSandboxState) => void): void {
    this.onStateChange = listener;
  }

  getState(): PhysicsSandboxState {
    return this.state;
  }

  togglePaused(): void {
    this.state = setPhysicsSandboxPaused(this.state, !this.state.paused);
    this.render();
    this.emitStateChange();
  }

  clearBalls(): void {
    this.state = clearPhysicsSandboxBalls(this.state);
    this.render();
    this.emitStateChange();
  }

  reset(): void {
    this.state = resetPhysicsSandboxState(this.board);
    this.render();
    this.emitStateChange();
  }

  setSpawnMode(mode: PhysicsSandboxSpawnMode): void {
    this.state = setPhysicsSandboxSpawnMode(this.state, mode);
    this.emitStateChange();
  }

  setLinearVelocity(axis: 'x' | 'y', value: number): void {
    this.state = setPhysicsSandboxLinearVelocity(this.state, axis, value);
    this.emitStateChange();
  }

  setAngularVelocity(axis: 'x' | 'y', value: number): void {
    this.state = setPhysicsSandboxAngularVelocity(this.state, axis, value);
    this.emitStateChange();
  }

  spawnBall(point: Point): boolean {
    const result = spawnPhysicsSandboxBall(this.state, this.board, point);
    this.state = result.state;
    this.render();
    this.emitStateChange();
    return result.spawned;
  }

  getCurrentTableOffset(): Point {
    return { ...this.state.displayState.tableNudge.offset };
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
    this.state = stepPhysicsSandbox(
      this.state,
      this.board,
      this.input.getState(),
      deltaSeconds,
    );
    this.render();
    this.emitStateChange();
    this.animationFrameId = window.requestAnimationFrame(this.onFrame);
  };

  private render(): void {
    this.renderer.renderPhysicsSandbox(
      this.board,
      this.state.displayState,
      this.state.balls.map((ball) => ball.state.ball),
    );
  }

  private emitStateChange(): void {
    this.onStateChange?.(this.state);
  }
}

export const createPhysicsSandboxLoop = (
  board: BoardDefinition,
  input: InputSource,
  renderer: CanvasRenderer,
): PhysicsSandboxLoop =>
  new PhysicsSandboxLoop(
    createPhysicsSandboxState(board),
    board,
    input,
    renderer,
  );

export const getPhysicsSandboxDebugBall = (
  state: PhysicsSandboxState,
) => getSelectedPhysicsSandboxBall(state);
