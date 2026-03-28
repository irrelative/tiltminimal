import type { InputState } from '../input/keyboard-input';
import type {
  BoardDefinition,
  FlipperDefinition,
} from '../types/board-definition';
import { getSurfaceMaterial } from '../game/materials';
import type { GameState } from '../game/game-state';
import { getStatusLabel } from '../game/game-loop';
import { getLaunchChargeRatio } from '../game/physics-engine';

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
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly board: BoardDefinition,
  ) {
    this.canvas.width = board.width;
    this.canvas.height = board.height;
  }

  render(state: GameState, input: InputState): void {
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    context.clearRect(0, 0, this.board.width, this.board.height);

    this.drawBackground(context);
    this.drawBounds(context);
    this.drawGuides(context);
    this.drawBumpers(context);
    this.drawFlipper(
      context,
      this.board.flippers.left,
      state.flippers.leftEngaged,
      FLIPPER_COLOR,
    );
    this.drawFlipper(
      context,
      this.board.flippers.right,
      state.flippers.rightEngaged,
      FLIPPER_COLOR,
    );
    this.drawBall(context, state);
    this.drawHud(context, state, input);
  }

  private drawBackground(context: CanvasRenderingContext2D): void {
    const gradient = context.createLinearGradient(0, 0, 0, this.board.height);
    gradient.addColorStop(0, PALETTE.backgroundYellow);
    gradient.addColorStop(0.38, PALETTE.insetYellow);
    gradient.addColorStop(1, '#f7bd17');

    context.fillStyle = gradient;
    context.fillRect(0, 0, this.board.width, this.board.height);

    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    context.beginPath();
    context.arc(180, 220, 180, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = 'rgba(112, 209, 244, 0.24)';
    context.beginPath();
    context.arc(720, 1180, 260, 0, Math.PI * 2);
    context.fill();
  }

  private drawBounds(context: CanvasRenderingContext2D): void {
    context.strokeStyle = PALETTE.outlineBlue;
    context.lineWidth = 12;
    context.strokeRect(24, 24, this.board.width - 48, this.board.height - 48);

    context.strokeStyle = 'rgba(47, 109, 178, 0.35)';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(this.board.width / 2, 24);
    context.lineTo(this.board.width / 2, this.board.height - 180);
    context.stroke();
  }

  private drawGuides(context: CanvasRenderingContext2D): void {
    for (const guide of this.board.guides) {
      const material = getSurfaceMaterial(guide.material);

      context.strokeStyle =
        material.name === 'rubberPost' ? PALETTE.orange : PALETTE.skyBlue;
      context.lineWidth = guide.thickness;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(guide.start.x, guide.start.y);
      context.lineTo(guide.end.x, guide.end.y);
      context.stroke();

      context.strokeStyle =
        material.name === 'rubberPost' ? 'rgba(233, 79, 55, 0.85)' : PALETTE.outlineBlue;
      context.lineWidth = Math.max(guide.thickness - 8, 4);
      context.beginPath();
      context.moveTo(guide.start.x, guide.start.y);
      context.lineTo(guide.end.x, guide.end.y);
      context.stroke();
    }
  }

  private drawBumpers(context: CanvasRenderingContext2D): void {
    const bumperColors = [PALETTE.pink, PALETTE.green, PALETTE.skyBlue];

    this.board.bumpers.forEach((bumper, index) => {
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

      context.fillStyle = PALETTE.ink;
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius * 0.18, 0, Math.PI * 2);
      context.fill();
    });
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
    state: GameState,
    input: InputState,
  ): void {
    context.fillStyle = PALETTE.ink;
    context.font = '600 28px Georgia, serif';
    context.fillText(this.board.name, 48, 64);
    context.fillText(`Score ${state.score}`, 48, 104);

    if (state.status === 'waiting-launch') {
      this.drawLaunchMeter(context, state);
    }

    context.font = '400 20px Georgia, serif';
    context.fillStyle = 'rgba(34, 48, 74, 0.85)';
    context.fillText(getStatusLabel(state, input), 48, this.board.height - 44);
  }

  private drawLaunchMeter(
    context: CanvasRenderingContext2D,
    state: GameState,
  ): void {
    const ratio = getLaunchChargeRatio(state);
    const meterWidth = 200;
    const meterHeight = 14;
    const x = this.board.width - meterWidth - 48;
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
}
