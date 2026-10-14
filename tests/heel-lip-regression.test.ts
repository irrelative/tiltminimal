import { expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { scenarios } from '../src/playtest/scenarios';
import { investigateScenario } from '../src/playtest/investigation';
import { idle } from '../src/playtest/simulation';
import { advanceGameFrame } from '../src/game/advance-game';
import { replayArtifact } from '../src/playtest/artifact';
import {
  isFlipperHeelGuide,
  getDistanceToFlipperSurface,
} from '../src/game/flipper-geometry';

const table = BUILT_IN_TABLES.find((t) => t.id === 'classic-table')!;
// The exact incoming recipes discovered by the headless campaign, mirrored.
it.each([0, 1])(
  'Classic lip %i releases a long-held outside-pivot feed without a nudge',
  (side) => {
    const suffix = `/lip/${side}/0/0/2.5/${side === 0 ? 2 : 3}/held`;
    const scenario = [...scenarios(table, 1979, false, 0)].find((s) =>
      s.id.endsWith(suffix),
    )!;
    expect(scenario).toBeDefined();
    expect(scenario.skip).toBeUndefined();
    const { summary, artifact } = investigateScenario(
      table,
      { ...scenario, seconds: 6 },
      'test',
    );
    expect(summary.findings.filter((f) => f.confirmed)).toEqual([]);
    let state = replayArtifact(artifact);
    const start = { ...state.ball.position };
    for (let frame = 0; frame < 120; frame++)
      state = advanceGameFrame(state, table.board, idle, 1 / 60).state;
    expect(
      Math.hypot(
        state.ball.position.x - start.x,
        state.ball.position.y - start.y,
      ),
    ).toBeGreaterThan(table.board.ball.radius * 2);
  },
);

it('the upper heel join has rubber covering its full cap through the entire flipper sweep', () => {
  for (const flipper of table.board.flippers) {
    const joins = table.board.guides.filter((g) =>
      isFlipperHeelGuide(g, flipper),
    );
    expect(joins).toHaveLength(1);
    const join = joins[0];
    if (join.kind === 'arc') throw Error('Expected straight heel join');
    const endpoint =
      Math.hypot(join.start.x - flipper.x, join.start.y - flipper.y) <
      Math.hypot(join.end.x - flipper.x, join.end.y - flipper.y)
        ? join.start
        : join.end;
    for (let fraction = 0; fraction <= 1; fraction += 0.01) {
      const angle =
        flipper.restingAngle +
        (flipper.activeAngle - flipper.restingAngle) * fraction;
      expect(
        getDistanceToFlipperSurface(endpoint, flipper, angle) +
          join.thickness / 2,
      ).toBeLessThanOrEqual(0);
    }
  }
});
