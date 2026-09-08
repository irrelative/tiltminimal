import type { Point } from './board-definition';

export type RouteEvent =
  | 'spinner-spin'
  | 'saucer-captured'
  | 'standup-target-hit'
  | 'drop-target-hit'
  | 'rollover-hit'
  | 'bumper-hit';
export type RouteGoal =
  | { type: 'event'; event: RouteEvent; position?: Point }
  | { type: 'region'; min: Point; max: Point }
  | { type: 'flipper'; pivot: Point }
  | { type: 'drain' };

// Ordered goals describe the intended behavior of a composed assembly.
export interface BallRouteDefinition {
  id: string;
  start:
    | { type: 'plunge'; powers: number[] }
    | { type: 'feed'; position: Point; velocities: Point[] };
  goals: RouteGoal[];
  // Also rerun the feed with the destination flipper held; require a stable catch.
  cradle?: { pivot: Point };
  avoidFlippers?: boolean;
  timeoutSeconds: number;
}
