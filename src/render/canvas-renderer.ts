import type { EditorSelection } from '../editor/editor-types';
import type { GameState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import { getBoardTheme } from './board-themes';
import { drawBall, drawBoard } from './canvas-renderer-board';
import {
  drawDraft,
  drawEditorGrid,
  drawEditorHud,
  drawEditorSelection,
  drawLaunchPosition,
  type EditorRenderOptions,
} from './canvas-renderer-editor';
import { drawHud } from './canvas-renderer-hud';

export class CanvasRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  renderGame(
    board: BoardDefinition,
    state: GameState,
    input: InputState,
  ): void {
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    this.syncCanvasSize(board);
    context.clearRect(0, 0, board.width, board.height);
    context.fillStyle = getBoardTheme(board.themeId).backgroundMid;
    context.fillRect(0, 0, board.width, board.height);

    context.save();
    context.translate(state.tableNudge.offset.x, state.tableNudge.offset.y);
    drawBoard(context, board, state);
    context.restore();
    drawBall(context, board, state);
    drawHud(context, board, state, input);
  }

  renderEditor(
    board: BoardDefinition,
    selection: EditorSelection,
    draftPosition: { x: number; y: number } | null,
    options: EditorRenderOptions = {},
  ): void {
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    this.syncCanvasSize(board);
    context.clearRect(0, 0, board.width, board.height);

    drawBoard(context, board);
    if (options.showGrid) {
      drawEditorGrid(context, board);
    }
    drawLaunchPosition(context, board, selection);
    drawEditorSelection(context, board, selection);
    drawDraft(context, draftPosition);
    drawEditorHud(context, board, options);
  }

  private syncCanvasSize(board: BoardDefinition): void {
    this.canvas.width = board.width;
    this.canvas.height = board.height;
  }
}
