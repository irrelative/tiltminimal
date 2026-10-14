import type { BuiltInTable } from '../boards/table-library';
import { getPhysicsSandboxSpawnBlockedReason } from '../game/physics-sandbox';
import { copyState, type PlaytestArtifact } from './artifact';
import { investigateScenario } from './investigation';
import type { Scenario } from './scenarios';

/** Preserve the original recipe; bounded neighbors test whether the failure is fragile. */
export const refineArtifact = (
  table: BuiltInTable,
  artifact: PlaytestArtifact,
): void => {
  const controller = (_: unknown, frame: number) => {
    let input = artifact.inputs[0].input;
    for (const change of artifact.inputs) {
      if (change.frame > frame) break;
      input = change.input;
    }
    return input;
  };
  const seconds = Math.max(
    6,
    artifact.frameDurations.reduce((sum, dt) => sum + dt, 0),
  );
  const scenario: Scenario = {
    id: artifact.id,
    seed: artifact.seed,
    initialState: artifact.initialState,
    controller,
    seconds,
    suite: 'lip',
  };
  artifact.cadenceChecks = [30, 60, 120].map((hz) => {
    const { summary } = investigateScenario(
      table,
      scenario,
      artifact.revision,
      1 / hz,
    );
    return {
      cadence: `${hz}Hz`,
      confirmed: summary.findings.some((f) => f.confirmed),
      codes: summary.findings.map((f) => f.code),
    };
  });
  const jitter = investigateScenario(
    table,
    scenario,
    artifact.revision,
    1 / 60,
    (frame) => (frame % 2 ? 1 / 40 : 1 / 120),
  ).summary;
  artifact.cadenceChecks.push({
    cadence: 'jitter',
    confirmed: jitter.findings.some((f) => f.confirmed),
    codes: jitter.findings.map((f) => f.code),
  });
  // Only artificial feed recipes may be moved. Real-game checkpoints keep their provenance.
  if (!artifact.id.includes('/lip/')) return;
  const radius = artifact.initialState.ball.radius;
  artifact.neighbors = [];
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const initial = copyState(artifact.initialState);
    initial.ball.position.x += (dx * radius) / 4;
    initial.ball.position.y += (dy * radius) / 4;
    const valid = !getPhysicsSandboxSpawnBlockedReason(
      table.board,
      initial.ball.position,
      initial,
    );
    const confirmed =
      valid &&
      investigateScenario(
        table,
        { ...scenario, initialState: initial },
        artifact.revision,
      ).summary.findings.some((f) => f.confirmed);
    artifact.neighbors.push({
      dx: (dx * radius) / 4,
      dy: (dy * radius) / 4,
      valid,
      confirmed,
    });
  }
};
