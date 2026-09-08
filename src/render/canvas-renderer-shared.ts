import { getSlingshotVertices } from '../game/slingshot-geometry';
import {
  getFlipperBaseRadius,
  getFlipperTipRadius,
} from '../game/flipper-geometry';
import { isArcGuide } from '../game/guide-geometry';
import type { GameState } from '../game/game-state';
import type {
  FlipperDefinition,
  GuideDefinition,
} from '../types/board-definition';

export const UI_FONT_FAMILY =
  "Futura, 'Avenir Next', Avenir, 'Trebuchet MS', sans-serif";

export const getRenderedFlipperAngle = (
  state: GameState,
  flipper: FlipperDefinition,
  index: number,
): number => state.flippers[index]?.angle ?? flipper.restingAngle;

export { getSlingshotAngle as getRenderedSlingshotAngle } from '../game/slingshot-geometry';

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
  context.beginPath();
  getSlingshotVertices(width, depth).forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
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
