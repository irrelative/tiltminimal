import type { Point, PlungerDefinition } from '../../types/board-definition';
import type { RolloverLayoutDefinition } from '../layout-schema';
import { arc, rail, requireClearance, type BoardAssembly } from './shared';

export interface ShooterArchOptions {
  id: string;
  center: Point;
  radius: number;
  laneWidth: number;
  launchY: number;
  guideTopY: number;
  gateAngle: number;
  lanes: {
    firstX: number;
    y: number;
    spacing: number;
    count: number;
    radius: number;
    dividerTop: number;
    dividerBottom: number;
    score: number;
  };
  plungePowers?: number[];
  ballRadius?: number;
}
export const createShooterArchAssembly = (
  o: ShooterArchOptions,
): BoardAssembly & {
  launchPosition: Point;
  plunger: Partial<PlungerDefinition>;
} => {
  const ballRadius = o.ballRadius ?? 16;
  requireClearance(o.laneWidth, ballRadius * 2 + 12, 'Shooter lane width');
  requireClearance(o.radius, o.laneWidth, 'Arch radius');
  requireClearance(o.lanes.spacing, ballRadius * 2 + 12, 'Top lane spacing');
  if (!Number.isInteger(o.lanes.count) || o.lanes.count < 1)
    throw new Error('Top arch needs at least one lane.');
  if (
    o.guideTopY < o.center.y ||
    o.launchY <= o.guideTopY ||
    o.gateAngle >= 0 ||
    o.gateAngle <= -Math.PI / 2
  )
    throw new Error(
      'Shooter extension and gate must lead upward into the arch.',
    );
  const inner = o.radius - o.laneWidth;
  const gatePoint = (radius: number) => ({
    x: o.center.x + radius * Math.cos(o.gateAngle),
    y: o.center.y + radius * Math.sin(o.gateAngle),
  });
  const launchPosition = {
    x: o.center.x + o.radius - o.laneWidth / 2,
    y: o.launchY,
  };
  const leftDivider = o.lanes.firstX - o.lanes.spacing / 2;
  const roofY =
    o.center.y - Math.sqrt(o.radius ** 2 - (leftDivider - o.center.x) ** 2);
  if (!Number.isFinite(roofY) || roofY >= o.lanes.dividerTop)
    throw new Error('Top lane entrance must fit beneath the arch.');
  const rollovers: RolloverLayoutDefinition[] = Array.from(
    { length: o.lanes.count },
    (_, index) => ({
      position: { x: o.lanes.firstX + index * o.lanes.spacing, y: o.lanes.y },
      radius: o.lanes.radius,
      score: o.lanes.score,
    }),
  );
  return {
    launchPosition,
    plunger: {
      x: launchPosition.x,
      thickness: o.laneWidth - 24,
      guideLength: o.launchY - o.guideTopY,
      returnGate: { start: gatePoint(inner), end: gatePoint(o.radius) },
    },
    rollovers,
    guides: [
      ...[o.radius, inner].map((radius) =>
        rail(
          { x: o.center.x + radius, y: o.guideTopY },
          { x: o.center.x + radius, y: o.center.y },
        ),
      ),
      arc(o.center, o.radius, Math.PI, Math.PI * 2),
      arc(o.center, inner, o.gateAngle, 0),
      rail(
        { x: leftDivider, y: roofY },
        { x: leftDivider, y: o.lanes.dividerTop },
      ),
      ...Array.from({ length: o.lanes.count + 1 }, (_, index) => {
        const x = leftDivider + index * o.lanes.spacing;
        return rail(
          { x, y: o.lanes.dividerTop },
          { x, y: o.lanes.dividerBottom },
        );
      }),
    ],
    routes: [
      {
        id: `${o.id}/plunge`,
        start: {
          type: 'plunge',
          powers: o.plungePowers ?? [0.55, 0.7, 0.85, 1],
        },
        goals: [
          { type: 'event', event: 'rollover-hit' },
          {
            type: 'region',
            min: {
              x: o.center.x - o.radius + ballRadius,
              y: o.lanes.dividerBottom + ballRadius,
            },
            max: { x: o.center.x + inner - ballRadius, y: o.launchY },
          },
        ],
        timeoutSeconds: 6,
      },
    ],
  };
};
