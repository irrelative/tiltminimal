import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { createInitialGameState } from '../src/game/game-state';
import { resolveGuideCollisions } from '../src/game/physics-engine-boundaries';
import { projectPointToGuide } from '../src/game/guide-geometry';
import { createStaticContact, offsetGuide } from '../src/game/physics-helpers';
import { getSurfaceMaterial } from '../src/game/materials';
import { resolveBallContact } from '../src/game/spin-solver';

describe('guide broad phase', () => {
  for (const { id, board } of BUILT_IN_TABLES) {
    it(`preserves exact guide contacts on ${id}, including nudged boundaries`, () => {
      const points = board.guides.flatMap((guide) => {
        if (guide.kind === 'arc') {
          return Array.from({ length: 24 }, (_, i) => ({
            x: guide.center.x + Math.cos((i * Math.PI) / 12) * guide.radius,
            y: guide.center.y + Math.sin((i * Math.PI) / 12) * guide.radius,
          }));
        }
        return [
          guide.start,
          guide.end,
          {
            x: (guide.start.x + guide.end.x) / 2,
            y: (guide.start.y + guide.end.y) / 2,
          },
        ];
      });
      for (const point of points) {
        for (const displacement of [0, 8, -8, 25]) {
          const actual = createInitialGameState(board);
          actual.tableNudge.offset = { x: 3.25, y: -2.75 };
          actual.tableNudge.velocity = { x: -15, y: 12 };
          actual.ball.position = {
            x: point.x + 3.25 + displacement,
            y: point.y - 2.75,
          };
          actual.ball.linearVelocity = { x: -200, y: 300 };
          const expected = structuredClone(actual);
          for (const definition of board.guides) {
            if (definition.plane === 'raised') continue;
            const guide = offsetGuide(definition, expected.tableNudge.offset);
            const projection = projectPointToGuide(
              expected.ball.position,
              guide,
            );
            const overlap =
              expected.ball.radius + guide.thickness / 2 - projection.distance;
            if (overlap <= 0) continue;
            const velocity = expected.tableNudge.velocity;
            const incoming =
              (expected.ball.linearVelocity.x - velocity.x) *
                projection.normal.x +
              (expected.ball.linearVelocity.y - velocity.y) *
                projection.normal.y;
            if (incoming < 0 || overlap > board.physics.solver.epsilon) {
              resolveBallContact(
                expected.ball,
                createStaticContact(
                  getSurfaceMaterial(guide.material, board.surfaceMaterials),
                  projection.point,
                  projection.normal,
                  overlap,
                  velocity,
                ),
                board.physics.solver,
              );
            }
          }
          resolveGuideCollisions(actual, board, board.physics.solver);
          for (const field of [
            'position',
            'linearVelocity',
            'angularVelocity',
          ] as const) {
            expect(actual.ball[field].x).toBeCloseTo(expected.ball[field].x, 7);
            expect(actual.ball[field].y).toBeCloseTo(expected.ball[field].y, 7);
          }
        }
      }
    });
  }
});
