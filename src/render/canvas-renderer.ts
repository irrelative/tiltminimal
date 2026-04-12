import type { EditorSelection } from '../editor/editor-types';
import type { GameState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import { getBoardTheme } from './board-themes';
import {
  drawBall,
  drawBoard,
  drawDynamicBoard,
  drawStaticBoardBase,
  drawStaticBoardOverlay,
} from './canvas-renderer-board';
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
  private context: CanvasRenderingContext2D | null = null;
  private staticGameLayers:
    | {
        board: BoardDefinition;
        width: number;
        height: number;
        themeId: BoardDefinition['themeId'];
        baseCanvas: HTMLCanvasElement;
        overlayCanvas: HTMLCanvasElement;
      }
    | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  renderGame(
    board: BoardDefinition,
    state: GameState,
    input: InputState,
  ): void {
    const context = this.getContext();
    this.syncCanvasSize(board);
    context.clearRect(0, 0, board.width, board.height);
    const staticLayers = this.ensureStaticGameLayers(board);

    context.save();
    context.translate(state.tableNudge.offset.x, state.tableNudge.offset.y);
    if (staticLayers) {
      context.drawImage(staticLayers.baseCanvas, 0, 0);
      drawDynamicBoard(context, board, state);
      context.drawImage(staticLayers.overlayCanvas, 0, 0);
    } else {
      context.fillStyle = getBoardTheme(board.themeId).backgroundMid;
      context.fillRect(0, 0, board.width, board.height);
      drawBoard(context, board, state);
    }
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
    const context = this.getContext();
    this.invalidateStaticGameLayers();
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
    if (this.canvas.width !== board.width) {
      this.canvas.width = board.width;
    }

    if (this.canvas.height !== board.height) {
      this.canvas.height = board.height;
    }
  }

  private getContext(): CanvasRenderingContext2D {
    if (this.context) {
      return this.context;
    }

    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    this.context = context;
    return context;
  }

  private ensureStaticGameLayers(
    board: BoardDefinition,
  ): {
    baseCanvas: HTMLCanvasElement;
    overlayCanvas: HTMLCanvasElement;
  } | null {
    if (
      this.staticGameLayers &&
      this.staticGameLayers.board === board &&
      this.staticGameLayers.width === board.width &&
      this.staticGameLayers.height === board.height &&
      this.staticGameLayers.themeId === board.themeId
    ) {
      return this.staticGameLayers;
    }

    const baseLayer = this.createLayerCanvas(board);
    const overlayLayer = this.createLayerCanvas(board);

    if (!baseLayer || !overlayLayer) {
      this.staticGameLayers = null;
      return null;
    }

    drawStaticBoardBase(baseLayer.context, board, {
      showBumperScores: true,
    });
    drawStaticBoardOverlay(overlayLayer.context, board);

    this.staticGameLayers = {
      board,
      width: board.width,
      height: board.height,
      themeId: board.themeId,
      baseCanvas: baseLayer.canvas,
      overlayCanvas: overlayLayer.canvas,
    };

    return this.staticGameLayers;
  }

  private createLayerCanvas(
    board: BoardDefinition,
  ): {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null {
    const layerCanvas = this.canvas.ownerDocument.createElement('canvas');
    layerCanvas.width = board.width;
    layerCanvas.height = board.height;
    const layerContext = layerCanvas.getContext('2d');

    if (!layerContext) {
      return null;
    }

    return {
      canvas: layerCanvas,
      context: layerContext,
    };
  }

  private invalidateStaticGameLayers(): void {
    this.staticGameLayers = null;
  }
}
