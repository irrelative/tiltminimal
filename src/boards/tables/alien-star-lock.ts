import { createPocket } from './table-foundation';
import type { Point } from '../../types/board-definition';

/** Aim the whole connected lock assembly at the right lower flipper. */
export const createAlienStarLock = () => {
  const center = { x: 140, y: 760 };
  const rotation = -0.62;
  const cos = Math.cos(rotation),
    sin = Math.sin(rotation);
  const vector = (p: Point): Point => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  });
  const point = (p: Point): Point => {
    const v = vector({ x: p.x - center.x, y: p.y - center.y });
    return { x: center.x + v.x, y: center.y + v.y };
  };
  const pocket = createPocket('alien-star-lock', center, 10000);
  // The real lock's inboard wire is a short entrance beside the spinner
  // approach, not the shared pocket's long, flared receiving funnel. Keep
  // its arc joint and the outside wall; shorten only these connected legs.
  const rightThroat = pocket.guides![3];
  const rightMouth = pocket.guides![4];
  if (rightThroat.kind === 'arc' || rightMouth.kind === 'arc')
    throw new Error('Alien Star lock expects a straight inboard entrance.');
  const join = { x: center.x + 54, y: center.y + 20 };
  rightThroat.end = join;
  rightMouth.start = join;
  rightMouth.end = { x: center.x + 54, y: center.y + 60 };

  pocket.guides = pocket.guides!.map((g) =>
    g.kind === 'arc'
      ? {
          ...g,
          startAngle: g.startAngle + rotation,
          endAngle: g.endAngle + rotation,
        }
      : { ...g, start: point(g.start as Point), end: point(g.end as Point) },
  );
  pocket.saucers![0].ejectAngle += rotation;
  for (const route of pocket.routes) {
    if (route.start.type === 'feed') {
      route.start.position = point(route.start.position);
      route.start.velocities = route.start.velocities.map(vector);
    }
    route.goals[1] = {
      type: 'region',
      min: { x: 200, y: 900 },
      max: { x: 380, y: 1080 },
    };
  }
  return pocket;
};
