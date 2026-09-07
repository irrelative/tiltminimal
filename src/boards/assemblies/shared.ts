import type {
  BoardLayoutFragment,
  GuideLayoutDefinition,
  FlipperLayoutDefinition,
} from '../layout-schema';
import type { Point } from '../../types/board-definition';
import type { BallRouteDefinition } from '../../types/ball-route';

export interface BoardAssembly extends BoardLayoutFragment {
  routes: BallRouteDefinition[];
}
export const rail = (
  start: Point,
  end: Point,
  thickness = 12,
): GuideLayoutDefinition => ({
  start,
  end,
  thickness,
  material: 'metalGuide',
  plane: 'playfield',
});
export const arc = (
  center: Point,
  radius: number,
  startAngle: number,
  endAngle: number,
  thickness = 12,
): GuideLayoutDefinition => ({
  kind: 'arc',
  center,
  radius,
  startAngle,
  endAngle,
  thickness,
  material: 'metalGuide',
  plane: 'playfield',
});
export const polyline = (
  points: Point[],
  thickness = 12,
): GuideLayoutDefinition[] =>
  points.slice(1).map((point, index) => rail(points[index], point, thickness));

export const requireClearance = (
  width: number,
  minimum: number,
  label: string,
): void => {
  if (!Number.isFinite(width) || width <= minimum)
    throw new Error(`${label} must exceed ${minimum} board units.`);
};

export const composeAssemblies = (
  ...assemblies: BoardAssembly[]
): BoardAssembly & { flippers: FlipperLayoutDefinition[] } => {
  const ids = assemblies.flatMap((part) =>
    part.routes.map((route) => route.id),
  );
  if (new Set(ids).size !== ids.length)
    throw new Error('Assembly route ids must be unique.');
  return {
    guides: assemblies.flatMap((part) => part.guides ?? []),
    posts: assemblies.flatMap((part) => part.posts ?? []),
    bumpers: assemblies.flatMap((part) => part.bumpers ?? []),
    standupTargets: assemblies.flatMap((part) => part.standupTargets ?? []),
    dropTargets: assemblies.flatMap((part) => part.dropTargets ?? []),
    spinners: assemblies.flatMap((part) => part.spinners ?? []),
    saucers: assemblies.flatMap((part) => part.saucers ?? []),
    slingshots: assemblies.flatMap((part) => part.slingshots ?? []),
    rollovers: assemblies.flatMap((part) => part.rollovers ?? []),
    flippers: assemblies.flatMap((part) => part.flippers ?? []),
    routes: assemblies.flatMap((part) => part.routes),
  };
};
