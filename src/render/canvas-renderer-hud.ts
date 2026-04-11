import { getStatusLabel } from '../game/game-loop';
import type { GameState } from '../game/game-state';
import { getPlungerPullRatio } from '../game/physics-engine';
import type { InputState } from '../input/keyboard-input';
import type { BoardDefinition } from '../types/board-definition';
import { getBoardTheme } from './board-themes';
import { UI_FONT_FAMILY } from './canvas-renderer-shared';

export const drawHud = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state: GameState,
  input: InputState,
): void => {
  const theme = getBoardTheme(board.themeId);
  context.fillStyle = theme.hudText;
  context.font = `600 28px ${UI_FONT_FAMILY}`;
  context.fillText(board.name, 48, 64);
  context.fillText(`Score ${state.score}`, 48, 104);

  if (state.status === 'waiting-launch') {
    drawLaunchMeter(context, board, state);
  }

  context.font = `400 20px ${UI_FONT_FAMILY}`;
  context.fillStyle = theme.hudMuted;
  context.fillText(
    getStatusLabel(state, input, board),
    48,
    board.height - 44,
  );
};

const drawLaunchMeter = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);
  const ratio = getPlungerPullRatio(state, board);
  const meterWidth = 200;
  const meterHeight = 14;
  const x = board.width - meterWidth - 48;
  const y = 54;

  context.fillStyle = theme.launchMeterTrack;
  context.fillRect(x, y, meterWidth, meterHeight);

  context.fillStyle = theme.launchMeterFill;
  context.fillRect(x, y, meterWidth * ratio, meterHeight);

  context.strokeStyle = theme.launchMeterStroke;
  context.lineWidth = 2;
  context.strokeRect(x, y, meterWidth, meterHeight);

  context.font = `400 16px ${UI_FONT_FAMILY}`;
  context.fillStyle = theme.hudText;
  context.fillText('Plunger', x, y - 10);
};
