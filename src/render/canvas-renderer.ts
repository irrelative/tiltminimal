import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition, FlipperDefinition } from '../types/board-definition';
import type { GameState } from '../game/game-state';
import { getStatusLabel } from '../game/game-loop';
import { getLaunchChargeRatio } from '../game/physics-engine';

const FLIPPER_COLOR = '#ff9f1c';

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
    gradient.addColorStop(0, '#0c1f33');
    gradient.addColorStop(0.5, '#102f4c');
    gradient.addColorStop(1, '#09141f');

    context.fillStyle = gradient;
    context.fillRect(0, 0, this.board.width, this.board.height);
  }

  private drawBounds(context: CanvasRenderingContext2D): void {
    context.strokeStyle = '#8ecae6';
    context.lineWidth = 8;
    context.strokeRect(24, 24, this.board.width - 48, this.board.height - 48);

    context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(this.board.width / 2, 24);
    context.lineTo(this.board.width / 2, this.board.height - 180);
    context.stroke();
  }

  private drawBumpers(context: CanvasRenderingContext2D): void {
    for (const bumper of this.board.bumpers) {
      context.fillStyle = '#7bdff2';
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#0b1320';
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius * 0.45, 0, Math.PI * 2);
      context.fill();
    }
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
    state: GameState,
    input: InputState,
  ): void {
    context.fillStyle = '#f1faee';
    context.font = '600 28px Georgia, serif';
    context.fillText(this.board.name, 48, 64);
    context.fillText(`Score ${state.score}`, 48, 104);

    if (state.status === 'waiting-launch') {
      this.drawLaunchMeter(context, state);
    }

    context.font = '400 20px Georgia, serif';
    context.fillStyle = 'rgba(241, 250, 238, 0.85)';
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
}
