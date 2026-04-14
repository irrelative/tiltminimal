import type { TableRecord } from '../boards/table-library';
import { cloneBoardDefinition } from '../boards/board-codec';
import { PlayInput } from '../input/keyboard-input';
import type { CanvasRenderer } from '../render/canvas-renderer';
import type { BoardDefinition } from '../types/board-definition';
import {
  createPhysicsSandboxLoop,
  getPhysicsSandboxDebugBall,
} from '../game/physics-sandbox-loop';

interface SyncPhysicsRoutePanelOptions {
  tables: TableRecord[];
  activeTableId: string;
  tableSelect: HTMLSelectElement;
  tableMeta: HTMLElement;
  getFeatureCount: (board: BoardDefinition) => number;
}

interface StartPhysicsSandboxSessionOptions {
  activeTable: TableRecord;
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

export const syncPhysicsRoutePanel = ({
  tables,
  activeTableId,
  tableSelect,
  tableMeta,
  getFeatureCount,
}: SyncPhysicsRoutePanelOptions): void => {
  tableSelect.replaceChildren(
    ...tables.map((table) => {
      const option = document.createElement('option');
      option.value = table.id;
      option.selected = table.id === activeTableId;
      option.textContent = table.builtIn
        ? `${table.board.name} (built-in)`
        : `${table.board.name} (edited)`;

      return option;
    }),
  );

  const active =
    tables.find((table) => table.id === activeTableId) ?? tables[0] ?? null;

  if (!active) {
    tableMeta.textContent = '';
    return;
  }

  tableMeta.textContent = `${active.builtIn ? 'Built-in table' : 'Custom or edited table'} · ${getFeatureCount(active.board)} features`;
};

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
    statusMessage.textContent = state.statusMessage ?? 'Click the playfield to spawn.';
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
