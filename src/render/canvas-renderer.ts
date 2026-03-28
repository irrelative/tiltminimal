import type { EditorSelection } from '../editor/editor-types';
import { getGuideHandles } from '../editor/table-editor';
import { getSurfaceMaterial } from '../game/materials';
import type { GameState } from '../game/game-state';
import { getStatusLabel } from '../game/game-loop';
import { getLaunchChargeRatio } from '../game/physics-engine';
import type {
  BoardDefinition,
  BumperDefinition,
  FlipperDefinition,
  GuideDefinition,
} from '../types/board-definition';
import type { InputState } from '../input/keyboard-input';

const PALETTE = {
  backgroundYellow: '#fed41d',
  insetYellow: '#ffd94d',
  skyBlue: '#70d1f4',
  outlineBlue: '#2f6db2',
  pink: '#f26ca7',
  orange: '#f89c2a',
  red: '#e94f37',
  green: '#8dc63f',
  cream: '#fff7d6',
  ink: '#22304a',
};

const FLIPPER_COLOR = PALETTE.red;

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
    this.drawGuides(context, board);
    this.drawBumpers(context, board, state);

    for (const flipper of board.flippers) {
      this.drawFlipper(
        context,
        flipper,
        state ? getRenderedFlipperAngle(state, flipper) : flipper.restingAngle,
        FLIPPER_COLOR,
      );
    }
  }

  private drawBackground(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    const gradient = context.createLinearGradient(0, 0, 0, board.height);
    gradient.addColorStop(0, PALETTE.backgroundYellow);
    gradient.addColorStop(0.38, PALETTE.insetYellow);
    gradient.addColorStop(1, '#f7bd17');

    context.fillStyle = gradient;
    context.fillRect(0, 0, board.width, board.height);

    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    context.beginPath();
    context.arc(180, 220, 180, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = 'rgba(112, 209, 244, 0.24)';
    context.beginPath();
    context.arc(720, 1180, 260, 0, Math.PI * 2);
    context.fill();
  }

  private drawBounds(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    context.strokeStyle = PALETTE.outlineBlue;
    context.lineWidth = 12;
    context.strokeRect(24, 24, board.width - 48, board.height - 48);

    context.strokeStyle = 'rgba(47, 109, 178, 0.35)';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(board.width / 2, 24);
    context.lineTo(board.width / 2, board.height - 180);
    context.stroke();
  }

  private drawGuides(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    for (const guide of board.guides) {
      const material = getSurfaceMaterial(guide.material, board.surfaceMaterials);

      context.strokeStyle =
        material.name === 'rubberPost' ? PALETTE.orange : PALETTE.skyBlue;
      context.lineWidth = guide.thickness;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(guide.start.x, guide.start.y);
      context.lineTo(guide.end.x, guide.end.y);
      context.stroke();

      context.strokeStyle =
        material.name === 'rubberPost'
          ? 'rgba(233, 79, 55, 0.85)'
          : PALETTE.outlineBlue;
      context.lineWidth = Math.max(guide.thickness - 8, 4);
      context.beginPath();
      context.moveTo(guide.start.x, guide.start.y);
      context.lineTo(guide.end.x, guide.end.y);
      context.stroke();
    }
  }

  private drawBumpers(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    const bumperColors = [PALETTE.pink, PALETTE.green, PALETTE.skyBlue];

    board.bumpers.forEach((bumper, index) => {
      context.fillStyle = bumperColors[index % bumperColors.length] ?? PALETTE.pink;
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      context.fill();

      context.lineWidth = 8;
      context.strokeStyle = PALETTE.cream;
      context.stroke();

      context.fillStyle = PALETTE.cream;
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius * 0.45, 0, Math.PI * 2);
      context.fill();

      if (state) {
        context.font = '600 20px Georgia, serif';
        context.textAlign = 'center';
        context.fillStyle = 'rgba(34, 48, 74, 0.9)';
        context.fillText(String(bumper.score), bumper.x, bumper.y + 8);
      } else {
        context.fillStyle = PALETTE.ink;
        context.beginPath();
        context.arc(bumper.x, bumper.y, bumper.radius * 0.18, 0, Math.PI * 2);
        context.fill();
      }
    });

    context.textAlign = 'start';
  }

  private drawFlipper(
    context: CanvasRenderingContext2D,
    flipper: FlipperDefinition,
    angle: number,
    color: string,
  ): void {
    const radius = flipper.thickness / 2;

    context.save();
    context.translate(flipper.x, flipper.y);
    context.rotate(angle);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, -radius);
    context.lineTo(flipper.length - radius, -radius);
    context.arc(flipper.length - radius, 0, radius, -Math.PI / 2, Math.PI / 2);
    context.lineTo(0, radius);
    context.arc(0, 0, radius, Math.PI / 2, -Math.PI / 2);
    context.closePath();
    context.fill();

    context.strokeStyle = PALETTE.cream;
    context.lineWidth = 4;
    context.stroke();

    context.fillStyle = PALETTE.cream;
    context.beginPath();
    context.arc(radius * 0.6, 0, radius * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private drawBall(context: CanvasRenderingContext2D, state: GameState): void {
    context.fillStyle = '#fffdf7';
    context.beginPath();
    context.arc(
      state.ball.position.x,
      state.ball.position.y,
      state.ball.radius,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.strokeStyle = 'rgba(34, 48, 74, 0.25)';
    context.lineWidth = 2;
    context.stroke();
  }

  private drawHud(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state: GameState,
    input: InputState,
  ): void {
    context.fillStyle = PALETTE.ink;
    context.font = '600 28px Georgia, serif';
    context.fillText(board.name, 48, 64);
    context.fillText(`Score ${state.score}`, 48, 104);

    if (state.status === 'waiting-launch') {
      this.drawLaunchMeter(context, board, state);
    }

    context.font = '400 20px Georgia, serif';
    context.fillStyle = 'rgba(34, 48, 74, 0.85)';
    context.fillText(getStatusLabel(state, input, board), 48, board.height - 44);
  }

  private drawLaunchMeter(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state: GameState,
  ): void {
    const ratio = getLaunchChargeRatio(state, board);
    const meterWidth = 200;
    const meterHeight = 14;
    const x = board.width - meterWidth - 48;
    const y = 54;

    context.fillStyle = 'rgba(34, 48, 74, 0.18)';
    context.fillRect(x, y, meterWidth, meterHeight);

    context.fillStyle = PALETTE.red;
    context.fillRect(x, y, meterWidth * ratio, meterHeight);

    context.strokeStyle = PALETTE.outlineBlue;
    context.lineWidth = 2;
    context.strokeRect(x, y, meterWidth, meterHeight);

    context.font = '400 16px Georgia, serif';
    context.fillStyle = PALETTE.ink;
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

    if (selection.kind === 'guide' && selection.index !== undefined) {
      const guide = board.guides[selection.index];

      if (guide) {
        this.drawGuideSelection(context, guide);
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

  private drawGuideSelection(
    context: CanvasRenderingContext2D,
    guide: GuideDefinition,
  ): void {
    const handles = getGuideHandles(guide);
    const midpoint = {
      x: (guide.start.x + guide.end.x) / 2,
      y: (guide.start.y + guide.end.y) / 2,
    };

    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = guide.thickness + 10;
    context.lineCap = 'round';
    context.globalAlpha = 0.45;
    context.beginPath();
    context.moveTo(guide.start.x, guide.start.y);
    context.lineTo(guide.end.x, guide.end.y);
    context.stroke();

    context.globalAlpha = 1;
    context.setLineDash([10, 6]);
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(guide.start.x, guide.start.y);
    context.lineTo(guide.end.x, guide.end.y);
    context.stroke();

    context.setLineDash([]);
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(midpoint.x, midpoint.y);
    context.lineTo(handles.rotate.x, handles.rotate.y);
    context.stroke();

    this.drawEditorHandle(context, handles.start, '#ffd166');
    this.drawEditorHandle(context, handles.end, '#ffd166');
    this.drawEditorHandle(context, handles.rotate, '#70d1f4');
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

  private drawEditorHandle(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number },
    color: string,
  ): void {
    context.fillStyle = color;
    context.strokeStyle = PALETTE.ink;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(point.x, point.y, 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
}

const getRenderedFlipperAngle = (
  state: GameState,
  flipper: FlipperDefinition,
): number =>
  flipper.side === 'left'
    ? state.flippers.left.angle
    : state.flippers.right.angle;
