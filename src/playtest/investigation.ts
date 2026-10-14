import type { BuiltInTable } from '../boards/table-library';
import type { GameState } from '../game/game-state';
import type { InputState } from '../input/keyboard-input';
import { advanceGameFrame } from '../game/advance-game';
import {
  sampleFlipperProfile,
  getFlipperFaceNormal,
} from '../game/flipper-geometry';
import { activeBalls, IssueDetector } from './detectors';
import {
  copyState,
  inputKey,
  stateHash,
  type Finding,
  type PlaytestArtifact,
} from './artifact';
import { idle } from './simulation';
import type { Scenario } from './scenarios';

export const recoveryProbe = (
  initial: GameState,
  table: BuiltInTable,
  ballId: number,
  seconds: number,
  nudge?: 'left' | 'right' | 'up',
): boolean => {
  const original = activeBalls(initial).find((b, i) => (b.id ?? i) === ballId);
  if (!original) return true;
  const point = { ...original.position },
    radius = original.radius;
  let state = copyState(initial),
    clear = 0;
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) {
    const input: InputState = { ...idle };
    if (nudge && frame === 0)
      input[
        nudge === 'up'
          ? 'nudgeUpPressed'
          : nudge === 'left'
            ? 'nudgeLeftPressed'
            : 'nudgeRightPressed'
      ] = true;
    const next = advanceGameFrame(state, table.board, input, 1 / 60);
    state = next.state;
    if (
      next.events.some((e) => e.type === 'ball-drained') ||
      state.status === 'game-over'
    )
      return true;
    const ball = activeBalls(state).find((b, i) => (b.id ?? i) === ballId);
    if (!ball || ball.capturedSaucer !== undefined) return true;
    const departed =
      Math.hypot(ball.position.x - point.x, ball.position.y - point.y) >
      radius * 2;
    if (!nudge && departed) return true;
    clear = departed ? clear + 1 : 0;
    if (nudge && clear >= 30) return true;
  }
  return false;
};

export const diagnoseFinding = (
  finding: Finding,
  state: GameState,
  table: BuiltInTable,
  input: InputState,
): Finding | undefined => {
  if (finding.confirmed) return finding;
  if (finding.code === 'bounded-livelock') return finding;
  const ball = activeBalls(state).find(
    (b, i) => (b.id ?? i) === finding.ballId,
  );
  if (!ball) return undefined;
  const f =
    finding.flipper === undefined
      ? undefined
      : table.board.flippers[finding.flipper];
  const held = f && input[f.side === 'left' ? 'leftPressed' : 'rightPressed'];
  if (held) {
    const profile = sampleFlipperProfile(
      ball.position,
      f,
      state.flippers[finding.flipper!].angle,
    );
    const normal = getFlipperFaceNormal(
      f,
      state.flippers[finding.flipper!].angle,
    );
    const onFace =
      profile.t >= 0.08 &&
      profile.t <= 0.85 &&
      profile.distance <= profile.radius + ball.radius + 1 &&
      profile.normal.x * normal.x + profile.normal.y * normal.y > 0.9;
    if (onFace && recoveryProbe(state, table, finding.ballId, 1))
      return undefined;
  }
  if (recoveryProbe(state, table, finding.ballId, 2)) return undefined;
  finding = {
    ...finding,
    confirmed: true,
    code: held ? 'held-release-failure' : 'stationary-stall',
    recovery: [],
  };
  for (const nudge of ['up', 'left', 'right'] as const)
    if (recoveryProbe(state, table, finding.ballId, 2, nudge))
      finding.recovery.push(nudge);
  return finding;
};

export interface RunSummary {
  id: string;
  suite: string;
  frames: number;
  seconds: number;
  outcome: string;
  maxSpeed: number;
  hits: string[];
  findings: Finding[];
  skip?: string;
}
export const investigateScenario = (
  table: BuiltInTable,
  scenario: Scenario,
  revision: string,
  dt = 1 / 60,
  durations?: (frame: number) => number,
) => {
  let state = copyState(scenario.initialState),
    previous = '';
  const detector = new IssueDetector();
  const artifact: PlaytestArtifact = {
    kind: 'headless-playtest',
    version: 1,
    id: scenario.id,
    tableId: table.id,
    revision,
    seed: scenario.seed,
    board: table.board,
    initialState: copyState(state),
    frameDurations: [],
    inputs: [],
    findings: [],
    finalHash: '',
  };
  const summary: RunSummary = {
    id: scenario.id,
    suite: scenario.suite,
    frames: 0,
    seconds: 0,
    outcome: 'time-limit',
    maxSpeed: 0,
    hits: [],
    findings: artifact.findings,
    skip: scenario.skip,
  };
  if (scenario.skip) {
    summary.outcome = 'invalid-spawn';
    return { summary, artifact };
  }
  const hits = new Set<string>();
  let stopAfter = Infinity;
  for (let frame = 0; summary.seconds < scenario.seconds - 1e-8; frame++) {
    const stepSeconds = durations?.(frame) ?? dt;
    const input = {
      ...scenario.controller(state, Math.floor(summary.seconds * 60 + 1e-8)),
    };
    const key = inputKey(input);
    if (key !== previous) {
      artifact.inputs.push({ frame, input });
      previous = key;
    }
    artifact.frameDurations.push(stepSeconds);
    const next = advanceGameFrame(state, table.board, input, stepSeconds);
    state = next.state;
    summary.frames++;
    summary.seconds += stepSeconds;
    for (const ball of activeBalls(state))
      summary.maxSpeed = Math.max(
        summary.maxSpeed,
        Math.hypot(ball.linearVelocity.x, ball.linearVelocity.y),
      );
    for (const event of next.events)
      if ('index' in event) hits.add(`${event.type}:${event.index}`);
    for (const candidate of Number.isFinite(stopAfter)
      ? []
      : detector.observe(
          state,
          table.board,
          input,
          stepSeconds,
          frame,
          next.events,
        )) {
      const finding = diagnoseFinding(candidate, state, table, input);
      if (finding) artifact.findings.push(finding);
    }
    if (artifact.findings.some((f) => f.confirmed)) {
      summary.outcome = 'issue';
      if (!Number.isFinite(stopAfter))
        stopAfter = frame + Math.ceil(2 / dt) + 1;
      if (
        artifact.findings.some((f) => f.code === 'non-finite') ||
        frame + 1 >= stopAfter
      )
        break;
    }
    if (
      state.status === 'game-over' ||
      (scenario.suite === 'lip' &&
        next.events.some((e) => e.type === 'ball-drained'))
    ) {
      if (summary.outcome !== 'issue')
        summary.outcome =
          state.status === 'game-over' ? 'game-over' : 'drained';
      break;
    }
  }
  artifact.finalHash = stateHash(state);
  summary.hits = [...hits];
  return { summary, artifact };
};

export const findingCluster = (tableId: string, f: Finding): string =>
  `${tableId}:${f.code}:${f.flipper ?? 'field'}:${f.guide ?? 'none'}`;
