import type {
  BoardDefinition,
  Point,
  SlingshotDefinition,
} from '../types/board-definition';
export const getSlingshotAngle = (
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

export const getSlingshotVertices = (width: number, depth: number): Point[] => [
  { x: -width / 2, y: 0 },
  { x: width / 2, y: 0 },
  { x: width * 0.34, y: depth * 0.58 },
  { x: 0, y: depth },
  { x: -width * 0.34, y: depth * 0.58 },
];

export const getSlingshotCollision = (
  point: Point,
  radius: number,
  board: BoardDefinition,
  sling: SlingshotDefinition,
) => {
  const angle = getSlingshotAngle(board, sling),
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  const dx = point.x - sling.x,
    dy = point.y - sling.y;
  const p = { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
  const vertices = getSlingshotVertices(sling.width, sling.height);
  let inside = true,
    distance = Infinity,
    edge = 0,
    closest = { x: 0, y: 0 },
    outward = { x: 0, y: 0 };
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length],
      x = b.x - a.x,
      y = b.y - a.y;
    if (x * (p.y - a.y) - y * (p.x - a.x) < 0) inside = false;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * x + (p.y - a.y) * y) / (x * x + y * y)),
    );
    const q = { x: a.x + x * t, y: a.y + y * t },
      d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < distance) {
      distance = d;
      closest = q;
      edge = i;
      outward = { x: y / Math.hypot(x, y), y: -x / Math.hypot(x, y) };
    }
  }
  if (!inside && distance >= radius) return null;
  const n =
    inside || distance < 1e-9
      ? outward
      : { x: (p.x - closest.x) / distance, y: (p.y - closest.y) / distance };
  return {
    point: {
      x: sling.x + closest.x * cos - closest.y * sin,
      y: sling.y + closest.x * sin + closest.y * cos,
    },
    normal: { x: n.x * cos - n.y * sin, y: n.x * sin + n.y * cos },
    overlap: inside ? radius + distance : radius - distance,
    activeFace: edge === 0 && n.y < -0.5,
  };
};
