import type { TableRecord } from '../boards/table-library';
import { cloneBoardDefinition } from '../boards/board-codec';
import type { GameAudio } from '../audio/game-audio';
import { createInitialGameState } from '../game/game-state';
import { GameLoop } from '../game/game-loop';
import { PlayInput, type InputSource } from '../input/keyboard-input';
import type { CanvasRenderer } from '../render/canvas-renderer';
import type { BoardDefinition } from '../types/board-definition';

interface SyncPlayRoutePanelOptions {
  tables: TableRecord[];
  activeTableId: string;
  playTableSelect: HTMLSelectElement;
  playTableMeta: HTMLElement;
  getFeatureCount: (board: BoardDefinition) => number;
}

interface StartStandalonePlaySessionOptions {
  activeTable: TableRecord;
  canvas: HTMLCanvasElement;
  renderer: CanvasRenderer;
  gameAudio: GameAudio;
  modeTitle: HTMLElement;
  playDebugStatus: HTMLElement;
  playDebugPosition: HTMLElement;
  playDebugVelocity: HTMLElement;
  playDebugSpin: HTMLElement;
}

export const syncPlayRoutePanel = ({
  tables,
  activeTableId,
  playTableSelect,
  playTableMeta,
  getFeatureCount,
}: SyncPlayRoutePanelOptions): void => {
  playTableSelect.replaceChildren(
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
    playTableMeta.textContent = '';
    return;
  }

  playTableMeta.textContent = `${active.builtIn ? 'Built-in table' : 'Custom or edited table'} · ${getFeatureCount(active.board)} features`;
};

export const startStandalonePlaySession = ({
  activeTable,
  canvas,
  renderer,
  gameAudio,
  modeTitle,
  playDebugStatus,
  playDebugPosition,
  playDebugVelocity,
  playDebugSpin,
}: StartStandalonePlaySessionOptions): {
  input: InputSource;
  loop: GameLoop;
} => {
  const board = cloneBoardDefinition(activeTable.board);
  const input = new PlayInput(canvas);
  const loop = new GameLoop(
    createInitialGameState(board),
    board,
    input,
    renderer,
    gameAudio,
  );

  modeTitle.textContent = board.name;
  loop.setOnStateChange((nextState) => {
    playDebugStatus.textContent = `${nextState.status} · Ball ${nextState.rules.currentBall}/${nextState.rules.ballsPerGame} · Score ${nextState.score}`;
    playDebugPosition.textContent = formatVector2(
      nextState.ball.position.x,
      nextState.ball.position.y,
    );
    playDebugVelocity.textContent = formatVector2(
      nextState.ball.linearVelocity.x,
      nextState.ball.linearVelocity.y,
    );
    playDebugSpin.textContent = formatVector2(
      nextState.ball.angularVelocity.x,
      nextState.ball.angularVelocity.y,
    );
  });
  loop.start();

  return {
    input,
    loop,
  };
};

const formatVector2 = (x: number, y: number): string =>
  `${Math.round(x)}, ${Math.round(y)}`;
