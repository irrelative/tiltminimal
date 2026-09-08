import { PhysicsDebug } from './physics-debug';
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
import { clampFrameDeltaSeconds } from './physics-engine-types';

export class PhysicsSandboxLoop {
  readonly debug = new PhysicsDebug();
  private animationFrameId = 0;
  private lastFrameTime = 0;
  private running = false;
  private onStateChange?: (state: PhysicsSandboxState) => void;

  constructor(
    private state: PhysicsSandboxState,
    private readonly board: BoardDefinition,
    private readonly input: InputSource,
    private readonly renderer: CanvasRenderer,
  ) {
    this.debug.paused = state.paused;
  }

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
    this.debug.paused = !this.debug.paused;
    this.state = setPhysicsSandboxPaused(this.state, this.debug.paused);
    this.render();
    this.emitStateChange();
  }

  clearBalls(): void {
    this.state = clearPhysicsSandboxBalls(this.state);
    this.render();
    this.emitStateChange();
  }

  reset(): void {
    this.debug.clear();
    this.debug.paused = false;
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

    const deltaSeconds = this.debug.delta(
      clampFrameDeltaSeconds(
        this.lastFrameTime === 0
          ? 1 / 60
          : (frameTime - this.lastFrameTime) / 1000,
      ),
    );
    this.lastFrameTime = frameTime;
    if (deltaSeconds > 0)
      this.state = this.debug.capture(deltaSeconds, () =>
        stepPhysicsSandbox(
          { ...this.state, paused: false },
          this.board,
          this.input.getState(),
          deltaSeconds,
        ),
      );
    this.state = { ...this.state, paused: this.debug.paused };
    this.render();
    this.emitStateChange();
    this.animationFrameId = window.requestAnimationFrame(this.onFrame);
  };

  private render(): void {
    this.renderer.renderPhysicsSandbox(
      this.board,
      this.state.displayState,
      this.state.balls.map((ball) => ball.state.ball),
      this.debug,
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

export const getPhysicsSandboxDebugBall = (state: PhysicsSandboxState) =>
  getSelectedPhysicsSandboxBall(state);
