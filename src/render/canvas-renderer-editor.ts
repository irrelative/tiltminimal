import type { EditorSelection } from '../editor/editor-types';
import { EDITOR_GRID_SIZE } from '../editor/grid';
import {
  getGuideHandles,
  getOrientedRotateHandle,
} from '../editor/table-editor';
import { isArcGuide } from '../game/guide-geometry';
import { getPlungerGuideSegments } from '../game/plunger-geometry';
import type {
  BoardDefinition,
  BumperDefinition,
  FlipperDefinition,
  GuideDefinition,
  PostDefinition,
} from '../types/board-definition';
import { getBoardTheme } from './board-themes';
import {
  drawGuidePath,
  EDITOR_INK,
  traceFlipperPath,
  UI_FONT_FAMILY,
} from './canvas-renderer-shared';

export interface EditorRenderOptions {
  showGrid?: boolean;
  snapToGrid?: boolean;
}

export const drawLaunchPosition = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  selection: EditorSelection,
): void => {
  const theme = getBoardTheme(board.themeId);
  context.save();
  context.strokeStyle =
    selection.kind === 'launch-position'
      ? theme.launchMarkerStrokeActive
      : theme.launchMarkerStroke;
  context.fillStyle = theme.launchMarkerFill;
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
};

export const drawEditorSelection = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  selection: EditorSelection,
): void => {
  if (selection.kind === 'bumper' && selection.index !== undefined) {
    const bumper = board.bumpers[selection.index];

    if (bumper) {
      drawBumperSelection(context, bumper);
    }
  }

  if (selection.kind === 'post' && selection.index !== undefined) {
    const post = board.posts[selection.index];

    if (post) {
      drawPostSelection(context, post);
    }
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    const guide = board.guides[selection.index];

    if (guide) {
      drawGuideSelection(context, guide);
    }
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    const flipper = board.flippers[selection.index];

    if (flipper) {
      drawFlipperSelection(context, flipper);
    }
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    const target = board.standupTargets[selection.index];

    if (target) {
      drawOrientedSelection(
        context,
        target,
        target.width,
        target.height,
        target.angle,
      );
    }
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    const target = board.dropTargets[selection.index];

    if (target) {
      drawOrientedSelection(
        context,
        target,
        target.width,
        target.height,
        target.angle,
      );
    }
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    const saucer = board.saucers[selection.index];

    if (saucer) {
      drawCircularSelection(context, saucer, saucer.radius);
    }
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    const spinner = board.spinners[selection.index];

    if (spinner) {
      drawOrientedSelection(
        context,
        spinner,
        spinner.length,
        spinner.thickness,
        spinner.angle,
      );
    }
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    const slingshot = board.slingshots[selection.index];

    if (slingshot) {
      drawOrientedSelection(
        context,
        slingshot,
        slingshot.width,
        slingshot.height,
        slingshot.angle,
      );
    }
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    const rollover = board.rollovers[selection.index];

    if (rollover) {
      drawCircularSelection(context, rollover, rollover.radius);
    }
  }

  if (selection.kind === 'launch-position') {
    drawOrientedSelection(
      context,
      board.plunger,
      board.plunger.length,
      board.plunger.thickness,
      Math.PI / 2,
    );
    for (const guide of getPlungerGuideSegments(board)) {
      drawLineSelection(context, guide.start, guide.end, guide.thickness);
    }
  }
};

export const drawDraft = (
  context: CanvasRenderingContext2D,
  draftPosition: { x: number; y: number } | null,
): void => {
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
};

export const drawEditorGrid = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
): void => {
  context.save();

  for (let x = 0; x <= board.width; x += EDITOR_GRID_SIZE) {
    const isMajor = x % (EDITOR_GRID_SIZE * 5) === 0;
    context.strokeStyle = isMajor
      ? 'rgba(34, 48, 74, 0.22)'
      : 'rgba(34, 48, 74, 0.1)';
    context.lineWidth = isMajor ? 1.4 : 1;
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, board.height);
    context.stroke();
  }

  for (let y = 0; y <= board.height; y += EDITOR_GRID_SIZE) {
    const isMajor = y % (EDITOR_GRID_SIZE * 5) === 0;
    context.strokeStyle = isMajor
      ? 'rgba(34, 48, 74, 0.22)'
      : 'rgba(34, 48, 74, 0.1)';
    context.lineWidth = isMajor ? 1.4 : 1;
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(board.width, y + 0.5);
    context.stroke();
  }

  context.restore();
};

export const drawEditorHud = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  options: EditorRenderOptions,
): void => {
  const theme = getBoardTheme(board.themeId);
  context.fillStyle = theme.hudText;
  context.font = `600 28px ${UI_FONT_FAMILY}`;
  context.fillText(`${board.name} Editor`, 48, 64);
  context.font = `400 18px ${UI_FONT_FAMILY}`;
  context.fillStyle = theme.hudMuted;
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
  if (options.showGrid) {
    context.fillText(
      `Grid ${EDITOR_GRID_SIZE}px · Snap ${options.snapToGrid ? 'On' : 'Off'}`,
      48,
      148,
    );
  }
};

const drawBumperSelection = (
  context: CanvasRenderingContext2D,
  bumper: BumperDefinition,
): void => {
  context.save();
  context.strokeStyle = '#ffd166';
  context.lineWidth = 4;
  context.setLineDash([10, 6]);
  context.beginPath();
  context.arc(bumper.x, bumper.y, bumper.radius + 10, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

const drawPostSelection = (
  context: CanvasRenderingContext2D,
  post: PostDefinition,
): void => {
  context.save();
  context.strokeStyle = '#ffd166';
  context.lineWidth = 4;
  context.setLineDash([10, 6]);
  context.beginPath();
  context.arc(post.x, post.y, post.radius + 10, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

const drawGuideSelection = (
  context: CanvasRenderingContext2D,
  guide: GuideDefinition,
): void => {
  if (isArcGuide(guide)) {
    const handles = getGuideHandles(guide);

    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = guide.thickness + 10;
    context.globalAlpha = 0.45;
    drawGuidePath(context, guide);
    context.stroke();
    context.globalAlpha = 1;
    context.setLineDash([10, 6]);
    context.lineWidth = 4;
    drawGuidePath(context, guide);
    context.stroke();
    if (handles) {
      context.setLineDash([]);
      drawEditorHandle(context, handles.start, '#ffd166');
      drawEditorHandle(context, handles.end, '#ffd166');
      drawEditorHandle(context, handles.rotate, '#70d1f4');
    }
    context.restore();
    return;
  }

  const handles = getGuideHandles(guide);
  if (!handles) {
    return;
  }
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

  drawEditorHandle(context, handles.start, '#ffd166');
  drawEditorHandle(context, handles.end, '#ffd166');
  drawEditorHandle(context, handles.rotate, '#70d1f4');
  context.restore();
};

const drawLineSelection = (
  context: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  thickness: number,
): void => {
  context.save();
  context.strokeStyle = '#ffd166';
  context.lineWidth = thickness + 10;
  context.lineCap = 'round';
  context.globalAlpha = 0.45;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.globalAlpha = 1;
  context.setLineDash([10, 6]);
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.restore();
};

const drawFlipperSelection = (
  context: CanvasRenderingContext2D,
  flipper: FlipperDefinition,
): void => {
  context.save();
  context.translate(flipper.x, flipper.y);
  context.rotate(flipper.restingAngle);
  context.strokeStyle = '#ffd166';
  context.lineWidth = 4;
  context.setLineDash([10, 6]);
  traceFlipperPath(context, flipper);
  context.stroke();
  context.restore();
};

const drawCircularSelection = (
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
): void => {
  context.save();
  context.strokeStyle = '#ffd166';
  context.lineWidth = 4;
  context.setLineDash([10, 6]);
  context.beginPath();
  context.arc(center.x, center.y, radius + 10, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

const drawOrientedSelection = (
  context: CanvasRenderingContext2D,
  element: { x: number; y: number },
  width: number,
  height: number,
  angle: number,
): void => {
  const handle = getOrientedRotateHandle(element, height, angle);

  context.save();
  context.translate(element.x, element.y);
  context.rotate(angle);
  context.strokeStyle = '#ffd166';
  context.lineWidth = 4;
  context.setLineDash([10, 6]);
  context.strokeRect(
    -width / 2 - 8,
    -height / 2 - 8,
    width + 16,
    height + 16,
  );
  context.restore();

  context.save();
  context.strokeStyle = '#ffd166';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(element.x, element.y);
  context.lineTo(handle.x, handle.y);
  context.stroke();
  drawEditorHandle(context, handle, '#70d1f4');
  context.restore();
};

const drawEditorHandle = (
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
  color: string,
): void => {
  context.fillStyle = color;
  context.strokeStyle = EDITOR_INK;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(point.x, point.y, 8, 0, Math.PI * 2);
  context.fill();
  context.stroke();
};
