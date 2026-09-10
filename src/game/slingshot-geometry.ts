import type {
  BoardDefinition,
  Point,
  SlingshotDefinition,
} from '../types/board-definition';
export const getSlingshotAngle = (
  board: BoardDefinition,
  slingshot: BoardDefinition['slingshots'][number],
): number => {
  if (slingshot.backOutline) return slingshot.angle;
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

export const getSlingshotRubberRadius = (sling: SlingshotDefinition): number =>
  Math.max(8, sling.height * 0.28);

export const getSlingshotVertices = (
  width: number,
  depth: number,
  backOutline?: Point[],
): Point[] => [
  { x: -width / 2, y: 0 },
  { x: width / 2, y: 0 },
  ...(backOutline ?? [
    { x: width * 0.34, y: depth * 0.58 },
    { x: 0, y: depth },
    { x: -width * 0.34, y: depth * 0.58 },
  ]),
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
  const vertices = getSlingshotVertices(
    sling.width,
    sling.height,
    sling.backOutline,
  );
  let inside = false,
    distance = Infinity,
    edge = 0,
    closest = { x: 0, y: 0 },
    outward = { x: 0, y: 0 };
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length],
      x = b.x - a.x,
      y = b.y - a.y;
    // Connected return outlines can have an inward corner at the upper post.
    // Ray crossing handles that boundary without assuming a convex wedge.
    if (a.y > p.y !== b.y > p.y && p.x < a.x + ((p.y - a.y) * x) / y)
      inside = !inside;
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
  let rubberRadius = sling.backOutline ? 0 : getSlingshotRubberRadius(sling);
  let overlap = inside
    ? radius + rubberRadius + distance
    : radius + rubberRadius - distance;
  let n =
    inside || distance < 1e-9
      ? outward
      : { x: (p.x - closest.x) / distance, y: (p.y - closest.y) / distance };
  if (sling.backOutline) {
    // Union the solid infill with one rounded rubber face. Choose one contact
    // so the face and its endpoint post cannot apply two impulses.
    for (const rubberEdge of [0, ...(sling.rubberEdges ?? [])]) {
      const start = vertices[rubberEdge],
        end = vertices[(rubberEdge + 1) % vertices.length];
      const vx = end.x - start.x,
        vy = end.y - start.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - start.x) * vx + (p.y - start.y) * vy) / (vx * vx + vy * vy),
        ),
      );
      const rubberPoint = { x: start.x + t * vx, y: start.y + t * vy };
      const rubberDistance = Math.hypot(
        p.x - rubberPoint.x,
        p.y - rubberPoint.y,
      );
      const rubberOverlap =
        radius + getSlingshotRubberRadius(sling) - rubberDistance;
      if (rubberOverlap > overlap) {
        closest = rubberPoint;
        rubberRadius = getSlingshotRubberRadius(sling);
        overlap = rubberOverlap;
        n =
          rubberDistance > 1e-9
            ? {
                x: (p.x - rubberPoint.x) / rubberDistance,
                y: (p.y - rubberPoint.y) / rubberDistance,
              }
            : { x: vy / Math.hypot(vx, vy), y: -vx / Math.hypot(vx, vy) };
        edge = rubberEdge;
      }
    }
  }
  if (overlap <= 0) return null;
  return {
    point: {
      x:
        sling.x +
        (closest.x + n.x * rubberRadius) * cos -
        (closest.y + n.y * rubberRadius) * sin,
      y:
        sling.y +
        (closest.x + n.x * rubberRadius) * sin +
        (closest.y + n.y * rubberRadius) * cos,
    },
    normal: { x: n.x * cos - n.y * sin, y: n.x * sin + n.y * cos },
    overlap,
    activeFace:
      edge === 0 &&
      Math.abs(closest.x) < sling.width / 2 - rubberRadius &&
      n.y < -0.99,
  };
};
