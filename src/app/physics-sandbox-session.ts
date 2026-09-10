import type { BuiltInTable } from '../boards/table-library';
import { cloneBoardDefinition } from '../boards/board-codec';
import { PlayInput } from '../input/keyboard-input';
import type { CanvasRenderer } from '../render/canvas-renderer';
import {
  createPhysicsSandboxLoop,
  getPhysicsSandboxDebugBall,
} from '../game/physics-sandbox-loop';

interface StartPhysicsSandboxSessionOptions {
  activeTable: BuiltInTable;
  canvas: HTMLCanvasElement;
  renderer: CanvasRenderer;
  modeTitle: HTMLElement;
  statusMessage: HTMLElement;
  pauseButton: HTMLButtonElement;
  debugStatus: HTMLElement;
  debugPosition: HTMLElement;
  debugVelocity: HTMLElement;
  debugSpin: HTMLElement;
}

export const startPhysicsSandboxSession = ({
  activeTable,
  canvas,
  renderer,
  modeTitle,
  statusMessage,
  pauseButton,
  debugStatus,
  debugPosition,
  debugVelocity,
  debugSpin,
}: StartPhysicsSandboxSessionOptions) => {
  const board = cloneBoardDefinition(activeTable.board);
  const input = new PlayInput(canvas);
  const loop = createPhysicsSandboxLoop(board, input, renderer);

  modeTitle.textContent = `${board.name} Physics Sandbox`;
  loop.setOnStateChange((state) => {
    const selected = getPhysicsSandboxDebugBall(state);

    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
    statusMessage.textContent =
      state.statusMessage ?? 'Click the playfield to spawn.';
    debugStatus.textContent = `${state.balls.length} active ball${state.balls.length === 1 ? '' : 's'}`;

    if (!selected) {
      debugPosition.textContent = '—';
      debugVelocity.textContent = '—';
      debugSpin.textContent = '—';
      return;
    }

    debugPosition.textContent = formatVector2(
      selected.state.ball.position.x,
      selected.state.ball.position.y,
    );
    debugVelocity.textContent = formatVector2(
      selected.state.ball.linearVelocity.x,
      selected.state.ball.linearVelocity.y,
    );
    debugSpin.textContent = formatVector2(
      selected.state.ball.angularVelocity.x,
      selected.state.ball.angularVelocity.y,
    );
  });
  loop.start();

  return {
    board,
    input,
    loop,
  };
};

const formatVector2 = (x: number, y: number): string =>
  `${Math.round(x)}, ${Math.round(y)}`;
