import { drawAndromedaInserts } from './andromeda-playfield-art';
import { drawPhysicsDebug } from './physics-debug-overlay';
import type { PhysicsDebug } from '../game/physics-debug';
import type { BallState, GameState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import { getBoardTheme } from './board-themes';
import {
  type BallAppearance,
  drawBall,
  drawBallState,
  drawBoard,
  drawDynamicBoard,
  drawStaticBoardBase,
  drawStaticBoardOverlay,
} from './canvas-renderer-board';
import { drawHud } from './canvas-renderer-hud';

export class CanvasRenderer {
  private ballAppearance: BallAppearance = {
    showSpinMarker: true,
    showBallTrail: true,
  };

  setBallAppearance(appearance: BallAppearance): void {
    this.ballAppearance = { ...appearance };
  }

  private context: CanvasRenderingContext2D | null = null;
  private lastDisplayWidth = 0;
  private lastDisplayHeight = 0;
  private staticGameLayers: {
    board: BoardDefinition;
    width: number;
    height: number;
    themeId: BoardDefinition['themeId'];
    baseCanvas: HTMLCanvasElement;
    overlayCanvas: HTMLCanvasElement;
  } | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  renderGame(
    board: BoardDefinition,
    state: GameState,
    input: InputState,
    debug?: PhysicsDebug,
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
      if (board.themeId === 'andromeda') drawAndromedaInserts(context, state);
      context.drawImage(staticLayers.overlayCanvas, 0, 0);
    } else {
      context.fillStyle = getBoardTheme(board.themeId).backgroundMid;
      context.fillRect(0, 0, board.width, board.height);
      drawBoard(context, board, state);
    }
    context.restore();
    drawBall(context, board, state, this.ballAppearance);
    state.additionalBalls.forEach((ball) =>
      drawBallState(context, board, ball, this.ballAppearance),
    );
    state.lockedBalls.forEach(({ ball }) =>
      drawBallState(context, board, ball, this.ballAppearance),
    );
    drawHud(context, board, state, input);
    drawPhysicsDebug(
      context,
      board,
      state,
      [
        state.ball,
        ...state.additionalBalls,
        ...state.lockedBalls.map((lock) => lock.ball),
      ],
      debug,
    );
  }

  renderPhysicsSandbox(
    board: BoardDefinition,
    displayState: GameState,
    balls: BallState[],
    debug?: PhysicsDebug,
  ): void {
    const context = this.getContext();
    this.syncCanvasSize(board);
    context.clearRect(0, 0, board.width, board.height);
    const staticLayers = this.ensureStaticGameLayers(board);

    context.save();
    context.translate(
      displayState.tableNudge.offset.x,
      displayState.tableNudge.offset.y,
    );
    if (staticLayers) {
      context.drawImage(staticLayers.baseCanvas, 0, 0);
      drawDynamicBoard(context, board, displayState);
      if (board.themeId === 'andromeda')
        drawAndromedaInserts(context, displayState);
      context.drawImage(staticLayers.overlayCanvas, 0, 0);
    } else {
      context.fillStyle = getBoardTheme(board.themeId).backgroundMid;
      context.fillRect(0, 0, board.width, board.height);
      drawBoard(context, board, displayState);
    }
    context.restore();

    balls.forEach((ball) => {
      drawBallState(context, board, ball, this.ballAppearance);
    });
    drawPhysicsDebug(context, board, displayState, balls, debug);
  }

  private syncCanvasSize(board: BoardDefinition): void {
    if (this.canvas.width !== board.width) {
      this.canvas.width = board.width;
    }

    if (this.canvas.height !== board.height) {
      this.canvas.height = board.height;
    }

    this.syncDisplaySize(board);
  }

  private syncDisplaySize(board: BoardDefinition): void {
    const container = this.canvas.parentElement;

    if (!container) {
      return;
    }

    const availableWidth = container.clientWidth;
    const availableHeight = container.clientHeight;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return;
    }

    const scale = Math.min(
      availableWidth / board.width,
      availableHeight / board.height,
    );
    const displayWidth = Math.max(1, Math.floor(board.width * scale));
    const displayHeight = Math.max(1, Math.floor(board.height * scale));

    if (
      displayWidth === this.lastDisplayWidth &&
      displayHeight === this.lastDisplayHeight
    ) {
      return;
    }

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.lastDisplayWidth = displayWidth;
    this.lastDisplayHeight = displayHeight;
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

  private ensureStaticGameLayers(board: BoardDefinition): {
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

  private createLayerCanvas(board: BoardDefinition): {
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
}
