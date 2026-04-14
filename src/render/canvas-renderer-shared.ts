import {
  getFlipperBaseRadius,
  getFlipperTipRadius,
} from '../game/flipper-geometry';
import { isArcGuide } from '../game/guide-geometry';
import type { GameState } from '../game/game-state';
import type { BoardDefinition, FlipperDefinition, GuideDefinition } from '../types/board-definition';

export const EDITOR_INK = '#22304a';
export const UI_FONT_FAMILY =
  "Futura, 'Avenir Next', Avenir, 'Trebuchet MS', sans-serif";

export const getRenderedFlipperAngle = (
  state: GameState,
  flipper: FlipperDefinition,
  index: number,
): number => state.flippers[index]?.angle ?? flipper.restingAngle;

export const getRenderedSlingshotAngle = (
  board: BoardDefinition,
  slingshot: BoardDefinition['slingshots'][number],
): number => {
  const targetTip = getNearestFlipperTip(board, slingshot);
  const currentTipDirection = {
    x: -Math.sin(slingshot.angle),
    y: Math.cos(slingshot.angle),
  };
  const desiredDirection = {
    x: targetTip.x - slingshot.x,
    y: targetTip.y - slingshot.y,
  };

  if (
    currentTipDirection.x * desiredDirection.x +
      currentTipDirection.y * desiredDirection.y <
    0
  ) {
    return slingshot.angle + Math.PI;
  }

  return slingshot.angle;
};

export const traceFlipperPath = (
  context: CanvasRenderingContext2D,
  flipper: FlipperDefinition,
): void => {
  const baseRadius = getFlipperBaseRadius(flipper);
  const tipRadius = getFlipperTipRadius(flipper);

  context.beginPath();
  context.moveTo(0, -baseRadius);
  context.lineTo(flipper.length, -tipRadius);
  context.arc(flipper.length, 0, tipRadius, -Math.PI / 2, Math.PI / 2);
  context.lineTo(0, baseRadius);
  context.arc(0, 0, baseRadius, Math.PI / 2, -Math.PI / 2);
  context.closePath();
};

export const traceSlingshotPath = (
  context: CanvasRenderingContext2D,
  width: number,
  depth: number,
): void => {
  const halfWidth = width / 2;
  const shoulderInset = width * 0.16;
  const shoulderDepth = depth * 0.58;

  context.beginPath();
  context.moveTo(-halfWidth, 0);
  context.lineTo(halfWidth, 0);
  context.lineTo(halfWidth - shoulderInset, shoulderDepth);
  context.lineTo(0, depth);
  context.lineTo(-halfWidth + shoulderInset, shoulderDepth);
  context.closePath();
};

export const traceArcGuide = (
  context: CanvasRenderingContext2D,
  guide: Extract<GuideDefinition, { kind: 'arc' }>,
): void => {
  const start = guide.startAngle;
  let end = guide.endAngle;

  while (end <= start) {
    end += Math.PI * 2;
  }

  context.beginPath();
  context.arc(guide.center.x, guide.center.y, guide.radius, start, end);
};

export const drawOrientedPlate = (
  context: CanvasRenderingContext2D,
  element: { x: number; y: number },
  width: number,
  height: number,
  angle: number,
  fill: string,
  stroke: string,
): void => {
  context.save();
  context.translate(element.x, element.y);
  context.rotate(angle);
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(-width / 2, -height / 2, width, height, height / 2);
  context.fill();
  context.stroke();
  context.restore();
};

const getNearestFlipperTip = (
  board: BoardDefinition,
  point: { x: number; y: number },
): { x: number; y: number } => {
  let nearestTip = {
    x: board.flippers[0]?.x ?? point.x,
    y: board.flippers[0]?.y ?? point.y,
  };
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const flipper of board.flippers) {
    const tip = {
      x: flipper.x + Math.cos(flipper.restingAngle) * flipper.length,
      y: flipper.y + Math.sin(flipper.restingAngle) * flipper.length,
    };
    const distance = Math.hypot(point.x - tip.x, point.y - tip.y);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestTip = tip;
    }
  }

  return nearestTip;
};

export const drawGuidePath = (
  context: CanvasRenderingContext2D,
  guide: GuideDefinition,
): void => {
  if (isArcGuide(guide)) {
    traceArcGuide(context, guide);
    return;
  }

  context.beginPath();
  context.moveTo(guide.start.x, guide.start.y);
  context.lineTo(guide.end.x, guide.end.y);
};
