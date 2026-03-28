import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  BumperDefinition,
  FlipperDefinition,
} from '../types/board-definition';
import type { GameState } from '../game/game-state';
import { getStatusLabel } from '../game/game-loop';
import { getLaunchChargeRatio } from '../game/physics-engine';
import type { EditorSelection } from '../editor/editor-types';

const FLIPPER_COLOR = '#ff9f1c';

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

    this.drawBoard(context, board, state);
    this.drawBall(context, state);
    this.drawHud(context, board, state, input);
  }

  renderEditor(
    board: BoardDefinition,
    selection: EditorSelection,
    draftPosition: { x: number; y: number } | null,
  ): void {
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    this.syncCanvasSize(board);
    context.clearRect(0, 0, board.width, board.height);

    this.drawBoard(context, board);
    this.drawLaunchPosition(context, board, selection);
    this.drawEditorSelection(context, board, selection);
    this.drawDraft(context, draftPosition);
    this.drawEditorHud(context, board);
  }

  private syncCanvasSize(board: BoardDefinition): void {
    this.canvas.width = board.width;
    this.canvas.height = board.height;
  }

  private drawBoard(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    this.drawBackground(context, board);
    this.drawBounds(context, board);
    this.drawBumpers(context, board, state);

    for (const flipper of board.flippers) {
      const engaged = state
        ? flipper.side === 'left'
          ? state.flippers.leftEngaged
          : state.flippers.rightEngaged
        : false;

      this.drawFlipper(context, flipper, engaged, FLIPPER_COLOR);
    }
  }

  private drawBackground(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    const gradient = context.createLinearGradient(0, 0, 0, board.height);
    gradient.addColorStop(0, '#0c1f33');
    gradient.addColorStop(0.5, '#102f4c');
    gradient.addColorStop(1, '#09141f');

    context.fillStyle = gradient;
    context.fillRect(0, 0, board.width, board.height);
  }

  private drawBounds(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    context.strokeStyle = '#8ecae6';
    context.lineWidth = 8;
    context.strokeRect(24, 24, board.width - 48, board.height - 48);

    context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(board.width / 2, 24);
    context.lineTo(board.width / 2, board.height - 180);
    context.stroke();
  }

  private drawBumpers(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    for (const bumper of board.bumpers) {
      context.fillStyle = '#7bdff2';
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#0b1320';
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius * 0.45, 0, Math.PI * 2);
      context.fill();

      if (state) {
        context.font = '600 20px Georgia, serif';
        context.textAlign = 'center';
        context.fillStyle = 'rgba(241, 250, 238, 0.9)';
        context.fillText(String(bumper.score), bumper.x, bumper.y + 8);
      }
    }

    context.textAlign = 'start';
  }

  private drawFlipper(
    context: CanvasRenderingContext2D,
    flipper: FlipperDefinition,
    engaged: boolean,
    color: string,
  ): void {
    const radius = flipper.thickness / 2;

    context.save();
    context.translate(flipper.x, flipper.y);
    context.rotate(engaged ? flipper.activeAngle : flipper.restingAngle);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, -radius);
    context.lineTo(flipper.length - radius, -radius);
    context.arc(flipper.length - radius, 0, radius, -Math.PI / 2, Math.PI / 2);
    context.lineTo(0, radius);
    context.arc(0, 0, radius, Math.PI / 2, -Math.PI / 2);
    context.closePath();
    context.fill();
    context.restore();
  }

  private drawBall(context: CanvasRenderingContext2D, state: GameState): void {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(
      state.ball.position.x,
      state.ball.position.y,
      state.ball.radius,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  private drawHud(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state: GameState,
    input: InputState,
  ): void {
    context.fillStyle = '#f1faee';
    context.font = '600 28px Georgia, serif';
    context.fillText(board.name, 48, 64);
    context.fillText(`Score ${state.score}`, 48, 104);

    if (state.status === 'waiting-launch') {
      this.drawLaunchMeter(context, board, state);
    }

    context.font = '400 20px Georgia, serif';
    context.fillStyle = 'rgba(241, 250, 238, 0.85)';
    context.fillText(getStatusLabel(state, input), 48, board.height - 44);
  }

  private drawLaunchMeter(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state: GameState,
  ): void {
    const ratio = getLaunchChargeRatio(state);
    const meterWidth = 200;
    const meterHeight = 14;
    const x = board.width - meterWidth - 48;
    const y = 54;

    context.fillStyle = 'rgba(255, 255, 255, 0.12)';
    context.fillRect(x, y, meterWidth, meterHeight);

    context.fillStyle = '#ffd166';
    context.fillRect(x, y, meterWidth * ratio, meterHeight);

    context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    context.lineWidth = 2;
    context.strokeRect(x, y, meterWidth, meterHeight);

    context.font = '400 16px Georgia, serif';
    context.fillStyle = 'rgba(241, 250, 238, 0.85)';
    context.fillText('Launch', x, y - 10);
  }

  private drawLaunchPosition(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    selection: EditorSelection,
  ): void {
    context.save();
    context.strokeStyle =
      selection.kind === 'launch-position'
        ? '#ffd166'
        : 'rgba(241, 250, 238, 0.7)';
    context.fillStyle = 'rgba(255, 209, 102, 0.18)';
    context.lineWidth = selection.kind === 'launch-position' ? 4 : 2;
    context.beginPath();
    context.arc(
      board.launchPosition.x,
      board.launchPosition.y,
      26,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(board.launchPosition.x - 14, board.launchPosition.y);
    context.lineTo(board.launchPosition.x + 14, board.launchPosition.y);
    context.moveTo(board.launchPosition.x, board.launchPosition.y - 14);
    context.lineTo(board.launchPosition.x, board.launchPosition.y + 14);
    context.stroke();
    context.restore();
  }

  private drawEditorSelection(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    selection: EditorSelection,
  ): void {
    if (selection.kind === 'bumper' && selection.index !== undefined) {
      const bumper = board.bumpers[selection.index];

      if (bumper) {
        this.drawBumperSelection(context, bumper);
      }
    }

    if (selection.kind === 'flipper' && selection.index !== undefined) {
      const flipper = board.flippers[selection.index];

      if (flipper) {
        this.drawFlipperSelection(context, flipper);
      }
    }
  }

  private drawBumperSelection(
    context: CanvasRenderingContext2D,
    bumper: BumperDefinition,
  ): void {
    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.setLineDash([10, 6]);
    context.beginPath();
    context.arc(bumper.x, bumper.y, bumper.radius + 10, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  private drawFlipperSelection(
    context: CanvasRenderingContext2D,
    flipper: FlipperDefinition,
  ): void {
    const angle = flipper.restingAngle;
    const tipX = flipper.x + Math.cos(angle) * flipper.length;
    const tipY = flipper.y + Math.sin(angle) * flipper.length;

    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.setLineDash([10, 6]);
    context.beginPath();
    context.moveTo(flipper.x, flipper.y);
    context.lineTo(tipX, tipY);
    context.stroke();
    context.beginPath();
    context.arc(flipper.x, flipper.y, flipper.thickness, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  private drawDraft(
    context: CanvasRenderingContext2D,
    draftPosition: { x: number; y: number } | null,
  ): void {
    if (!draftPosition) {
      return;
    }

    context.save();
    context.strokeStyle = 'rgba(255, 209, 102, 0.85)';
    context.lineWidth = 2;
    context.setLineDash([6, 6]);
    context.beginPath();
    context.arc(draftPosition.x, draftPosition.y, 40, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  private drawEditorHud(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    context.fillStyle = 'rgba(241, 250, 238, 0.92)';
    context.font = '600 28px Georgia, serif';
    context.fillText(`${board.name} Editor`, 48, 64);
    context.font = '400 18px Georgia, serif';
    context.fillStyle = 'rgba(241, 250, 238, 0.82)';
    context.fillText(
      'Drag elements to reposition. Delete removes the selection.',
      48,
      96,
    );
    context.fillText(
      'Play Test runs the current saved layout through the same physics loop.',
      48,
      122,
    );
  }
}
