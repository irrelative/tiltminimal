import type {
  BoardDefinition,
  FlipperDefinition,
  Point,
} from '../types/board-definition';
import { isFlipperHeelGuide } from './flipper-geometry';
import { projectPointToGuide } from './guide-geometry';

/** Recognize an inward rolling approach across a covered rail/heel seam. */
export const isRollingHeelTransfer = (
  board: BoardDefinition,
  flipper: FlipperDefinition,
  position: Point,
  velocity: Point,
): boolean => {
  if (velocity.y < 0) return false;
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed === 0) return false;
  return board.guides.some((guide) => {
    if (
      (guide.plane ?? 'playfield') !== 'playfield' ||
      !isFlipperHeelGuide(guide, flipper) ||
      guide.kind === 'arc'
    )
      return false;
    const projection = projectPointToGuide(position, guide);
    // Include the small penetration/correction tolerance at the rubber seam.
    if (projection.distance > board.ball.radius + guide.thickness / 2 + 4)
      return false;
    let dx = guide.end.x - guide.start.x;
    let dy = guide.end.y - guide.start.y;
    if ((flipper.side === 'left' ? dx : -dx) < 0) {
      dx = -dx;
      dy = -dy;
    }
    // Vertical falling impacts and balls returning from the tip remain impacts.
    return (
      (velocity.x * dx + velocity.y * dy) / (speed * Math.hypot(dx, dy)) > 0.85
    );
  });
};
