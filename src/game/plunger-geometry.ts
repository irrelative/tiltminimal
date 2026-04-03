import type {
  BoardDefinition,
  LineGuideDefinition,
  PlungerDefinition,
  Point,
} from '../types/board-definition';
import { getGuideDistance } from './guide-geometry';

const PLUNGER_GUIDE_CLEARANCE = 12;

export const getPlungerGuideThickness = (
  plunger: PlungerDefinition,
): number => Math.max(8, Math.round(plunger.thickness * 0.35));

export const getPlungerLaneHalfWidth = (
  plunger: PlungerDefinition,
): number => plunger.thickness / 2 + PLUNGER_GUIDE_CLEARANCE;

export const getPlungerGuideTopY = (board: BoardDefinition): number =>
  board.launchPosition.y - board.plunger.guideLength;

export const getPlungerGuideBottomY = (board: BoardDefinition): number =>
  board.plunger.y +
  board.plunger.travel +
  board.plunger.length / 2 +
  board.plunger.thickness / 2;

export const getPlungerGuideSegments = (
  board: BoardDefinition,
): [LineGuideDefinition, LineGuideDefinition] => {
  const halfWidth = getPlungerLaneHalfWidth(board.plunger);
  const thickness = getPlungerGuideThickness(board.plunger);
  const topY = getPlungerGuideTopY(board);
  const bottomY = getPlungerGuideBottomY(board);

  return [
    {
      kind: 'line',
      start: { x: board.plunger.x - halfWidth, y: topY },
      end: { x: board.plunger.x - halfWidth, y: bottomY },
      thickness,
      material: board.plunger.material,
    },
    {
      kind: 'line',
      start: { x: board.plunger.x + halfWidth, y: topY },
      end: { x: board.plunger.x + halfWidth, y: bottomY },
      thickness,
      material: board.plunger.material,
    },
  ];
};

export const getPlungerLaneBounds = (
  board: BoardDefinition,
): {
  minX: number;
  maxX: number;
  topY: number;
  bottomY: number;
} => {
  const halfWidth = getPlungerLaneHalfWidth(board.plunger);
  const guideHalfThickness = getPlungerGuideThickness(board.plunger) / 2;

  return {
    minX: board.plunger.x - halfWidth + guideHalfThickness,
    maxX: board.plunger.x + halfWidth - guideHalfThickness,
    topY: getPlungerGuideTopY(board),
    bottomY: getPlungerGuideBottomY(board),
  };
};

export const getPlungerLaneCenterBounds = (
  board: BoardDefinition,
  ballRadius: number,
): {
  minX: number;
  maxX: number;
  topY: number;
  bottomY: number;
} => {
  const bounds = getPlungerLaneBounds(board);

  return {
    minX: bounds.minX + ballRadius,
    maxX: bounds.maxX - ballRadius,
    topY: bounds.topY,
    bottomY: bounds.bottomY,
  };
};

export const getLauncherGuideDistance = (
  board: BoardDefinition,
  point: Point,
): number =>
  Math.min(
    ...getPlungerGuideSegments(board).map((guide) => getGuideDistance(point, guide)),
  );

export const getLauncherMinX = (board: BoardDefinition): number => {
  const halfWidth = getPlungerLaneHalfWidth(board.plunger);
  const guideHalfThickness = getPlungerGuideThickness(board.plunger) / 2;

  return board.width / 2 + halfWidth + guideHalfThickness;
};

export const getLauncherMaxX = (board: BoardDefinition): number => {
  const halfWidth = getPlungerLaneHalfWidth(board.plunger);
  const guideHalfThickness = getPlungerGuideThickness(board.plunger) / 2;

  return board.width - halfWidth - guideHalfThickness;
};
