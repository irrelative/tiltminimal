import { createGameScoreRecorder } from './high-scores';
import type { BuiltInTable } from '../boards/table-library';
import { cloneBoardDefinition } from '../boards/board-codec';
import type { GameAudio } from '../audio/game-audio';
import { createInitialGameState } from '../game/game-state';
import { GameLoop } from '../game/game-loop';
import { PlayInput, type InputSource } from '../input/keyboard-input';
import type { CanvasRenderer } from '../render/canvas-renderer';

interface SyncPlayRoutePanelOptions {
  tables: BuiltInTable[];
  activeTableId: string;
  playTableSelect: HTMLSelectElement;
}

interface StartStandalonePlaySessionOptions {
  activeTable: BuiltInTable;
  canvas: HTMLCanvasElement;
  renderer: CanvasRenderer;
  gameAudio: GameAudio;
  modeTitle: HTMLElement;
  onGameOver?: (score: number) => void;
  playDebugStatus: HTMLElement;
  playDebugPosition: HTMLElement;
  playDebugVelocity: HTMLElement;
  playDebugSpin: HTMLElement;
}

export const syncPlayRoutePanel = ({
  tables,
  activeTableId,
  playTableSelect,
}: SyncPlayRoutePanelOptions): void => {
  playTableSelect.replaceChildren(
    ...tables.map((table) => {
      const option = document.createElement('option');
      option.value = table.id;
      option.selected = table.id === activeTableId;
      option.textContent = table.board.name;

      return option;
    }),
  );
};

export const startStandalonePlaySession = ({
  activeTable,
  canvas,
  renderer,
  gameAudio,
  modeTitle,
  onGameOver,
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
  const recordScore = createGameScoreRecorder((score) => onGameOver?.(score));
  loop.setOnStateChange((nextState) => {
    recordScore(nextState);
    playDebugStatus.textContent = `${nextState.status} · Ball ${nextState.rules.currentBall}/${nextState.rules.ballsPerGame} · Score ${nextState.score}${nextState.additionalBalls.length || nextState.lockedBalls.length ? ` · ${nextState.status === 'playing' ? 1 + nextState.additionalBalls.length : 0} live / ${nextState.lockedBalls.length} locked` : ''}`;
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
