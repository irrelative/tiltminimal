import type { BuiltInTable } from '../boards/table-library';
import type { InputState } from '../input/keyboard-input';
import type { GameState } from '../game/game-state';
import { createInitialGameState } from '../game/game-state';
import { advanceGameFrame } from '../game/advance-game';
import { initializeRulesState } from '../game/rules-engine';
import { PhysicsDebug } from '../game/physics-debug';
import {
  isFlipperHeelGuide,
  sampleFlipperProfile,
} from '../game/flipper-geometry';
import { getPhysicsSandboxSpawnBlockedReason } from '../game/physics-sandbox';
import { createFallingSkill } from './falling-tactics';
import { createPostPassCradle, isSettledOn } from './flipper-tactics';
import {
  copyState,
  inputKey,
  stateHash,
  type PlaytestArtifact,
} from './artifact';
import { idle } from './simulation';
import type { RunSummary } from './investigation';

export type Tactic =
  | 'inlane-feed'
  | 'dead-bounce'
  | 'hold-catch'
  | 'live-catch'
  | 'drop-catch'
  | 'post-pass'
  | 'shatz'
  | 'bump-pass';
export interface TacticCase {
  id: string;
  tactic: Tactic;
  source: number;
  speed: number;
  delay: number;
  hz?: number;
  pressFrames?: number;
  initialPosition?: number;
  control?: 'early' | 'late' | 'none';
}
export interface TacticMetrics {
  firstContactFrame: number;
  firstContactSpeed: number;
  minimumContactSpeed: number;
  receiverContact: boolean;
  receiverBeforeEntry: boolean;
  caught: boolean;
  liveCaught: boolean;
  postContact: boolean;
  poweredSourceContact: boolean;
  inlaneUp: boolean;
  inlaneDown: boolean;
  upperContactBeforeEntry: boolean;
  releaseDistance: number;
  drained: boolean;
  feedReachedTip: boolean;
  feedUpwardSpeed: number;
}
export const tacticCases = (): TacticCase[] =>
  [0, 1].flatMap((source) => {
    const cases: Omit<TacticCase, 'id'>[] = [];
    for (const speed of [500, 1000, 1500])
      for (const hz of [60, 120, 240])
        cases.push({ tactic: 'inlane-feed', source, speed, delay: 0, hz });
    for (const speed of [400, 600])
      cases.push({ tactic: 'dead-bounce', source, speed, delay: 0 });
    for (const speed of [575, 600, 625]) {
      cases.push({ tactic: 'hold-catch', source, speed, delay: 0 });
      for (const control of [undefined, 'early', 'late'] as const)
        cases.push({
          tactic: 'live-catch',
          source,
          speed,
          delay: control === 'early' ? 0 : control === 'late' ? 13 : 8,
          control,
        });
      for (const control of [undefined, 'early'] as const)
        cases.push({
          tactic: 'drop-catch',
          source,
          speed,
          delay: control ? 0 : 10,
          control,
        });
    }
    for (const delay of [12, 13, 0, 20])
      cases.push({
        tactic: 'post-pass',
        source,
        speed: 0,
        delay,
        control: delay === 0 ? 'early' : delay === 20 ? 'late' : undefined,
      });
    for (const delay of [27, 29])
      cases.push({ tactic: 'bump-pass', source, speed: 0, delay });
    cases.push({
      tactic: 'bump-pass',
      source,
      speed: 0,
      delay: -1,
      control: 'none',
    });
    for (const delay of [46, 47])
      cases.push({
        tactic: 'shatz',
        source,
        speed: 0,
        delay,
        pressFrames: 2,
        initialPosition: 0.3,
      });
    cases.push({
      tactic: 'shatz',
      source,
      speed: 0,
      delay: 1200,
      control: 'none',
      initialPosition: 0.3,
    });
    return cases.map((c) => ({
      ...c,
      id: `tactics-lab/tactics/${source}/${c.tactic}/${c.speed}/${c.delay}${c.hz ? `/${c.hz}hz` : ''}`,
    }));
  });

export const tacticInitialState = (
  table: BuiltInTable,
  recipe: TacticCase,
): GameState => {
  const { board } = table;
  const transfer = ['post-pass', 'shatz', 'bump-pass'].includes(recipe.tactic);
  const state =
    recipe.tactic === 'inlane-feed'
      ? createInitialGameState(board)
      : transfer
        ? createPostPassCradle(
            board,
            recipe.source,
            recipe.initialPosition ?? 0.3,
          )
        : createFallingSkill(board, {
            source: recipe.source,
            speed: recipe.speed,
            delay: recipe.delay,
            skill:
              recipe.tactic === 'drop-catch'
                ? 'drop-catch'
                : recipe.tactic === 'dead-bounce'
                  ? 'dead-bounce'
                  : 'live-catch',
            impactPosition:
              recipe.tactic === 'drop-catch'
                ? 0.22
                : recipe.tactic === 'live-catch'
                  ? 0.65
                  : 0.4,
          });
  if (recipe.tactic === 'inlane-feed') {
    const flipper = board.flippers[recipe.source];
    const guide = board.guides.find((g) => isFlipperHeelGuide(g, flipper));
    if (!guide || guide.kind === 'arc') throw new Error('Missing heel seam');
    const start =
      Math.abs(guide.start.x - flipper.x) > Math.abs(guide.end.x - flipper.x)
        ? guide.start
        : guide.end;
    const end = start === guide.start ? guide.end : guide.start;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const direction = {
      x: (end.x - start.x) / length,
      y: (end.y - start.y) / length,
    };
    const inward = flipper.side === 'left' ? 1 : -1;
    const normal = { x: inward * direction.y, y: -inward * direction.x };
    const reach = state.ball.radius + guide.thickness / 2 + 0.5;
    state.ball.position = {
      x: start.x + normal.x * reach,
      y: start.y + normal.y * reach,
    };
    state.ball.linearVelocity = {
      x: direction.x * recipe.speed,
      y: direction.y * recipe.speed,
    };
  }
  if (recipe.tactic === 'hold-catch')
    state.flippers.forEach((f, i) => {
      if (board.flippers[i].side === board.flippers[recipe.source].side) {
        f.angle = board.flippers[i].activeAngle;
        f.engaged = true;
      }
    });
  const initialized = initializeRulesState(state, board);
  initialized.status = 'playing';
  initialized.launcherExited = initialized.ball.launcherExited = true;
  return initialized;
};
export const tacticInput = (
  recipe: TacticCase,
  frame: number,
  sourceSide: string,
): InputState => {
  const key = sourceSide === 'left' ? 'leftPressed' : 'rightPressed';
  if (['post-pass', 'shatz', 'bump-pass'].includes(recipe.tactic))
    return {
      ...idle,
      leftPressed: true,
      rightPressed: true,
      [key]:
        recipe.tactic === 'bump-pass'
          ? false
          : frame >= recipe.delay &&
            frame < recipe.delay + (recipe.pressFrames ?? 1200),
      nudgeUpPressed: recipe.tactic === 'bump-pass' && frame === recipe.delay,
    };
  return {
    ...idle,
    [key]:
      recipe.tactic === 'hold-catch' ||
      (recipe.tactic === 'live-catch'
        ? frame >= recipe.delay
        : recipe.tactic === 'drop-catch' && frame < recipe.delay),
  };
};
export const tacticFailures = (
  recipe: TacticCase,
  m: TacticMetrics,
): string[] => {
  const failures: string[] = [];
  const require = (condition: boolean, reason: string) => {
    if (!condition) failures.push(reason);
  };
  require(m.firstContactFrame >= 0, 'source flipper was never contacted');
  if (recipe.tactic === 'inlane-feed') {
    require(m.feedReachedTip, 'feed must touch its own flipper and reach its tip before the receiver');
    require(m.feedUpwardSpeed <
      40, 'heel seam must not launch an unpowered feed upward');
    require(!m.receiverBeforeEntry, 'feed must reach its own tip before the opposite flipper');
  }
  if (recipe.tactic === 'dead-bounce')
    require(m.receiverContact &&
      !m.postContact, 'unassisted dead bounce must reach the opposite flipper without a post');
  if (
    recipe.tactic === 'hold-catch' ||
    (recipe.tactic === 'live-catch' && !recipe.control)
  ) {
    require(m.caught, 'catch must remain supported for 0.5 seconds');
    require(m.releaseDistance > 16, 'caught ball must release without a nudge');
  }
  if (recipe.tactic === 'live-catch') {
    if (!recipe.control)
      require(m.liveCaught &&
        m.firstContactSpeed <
          100, 'timed upstroke must absorb impact below 100 units/s');
    else
      require(m.firstContactSpeed > (recipe.control === 'late' ? 500 : 100) &&
        !m.liveCaught, 'timing control must miss the live-catch absorption');
  }
  if (recipe.tactic === 'drop-catch') {
    if (!recipe.control) {
      require(m.firstContactFrame >= recipe.delay &&
        m.firstContactFrame <=
          recipe.delay + 3, 'contact must coincide with retreat');
      require(m.firstContactSpeed < 400 &&
        m.minimumContactSpeed < 300 &&
        !m.liveCaught, 'retreating bat must soften impact without a live catch');
    } else
      require(m.firstContactSpeed >=
        400, 'early release must retain a fast impact');
  }
  if (recipe.tactic === 'shatz' && !recipe.control)
    require(!m.receiverBeforeEntry, 'Shatz must enter the opposite inlane before touching the receiver flipper');
  if (['post-pass', 'bump-pass', 'shatz'].includes(recipe.tactic)) {
    const success =
      m.caught &&
      (recipe.tactic === 'post-pass' ? m.postContact : !m.postContact) &&
      (recipe.tactic !== 'shatz' ||
        (m.inlaneUp &&
          m.inlaneDown &&
          !m.upperContactBeforeEntry &&
          !m.receiverBeforeEntry &&
          (!!recipe.control || m.poweredSourceContact)));
    require(recipe.control ? !success : success, recipe.control
      ? 'timing control unexpectedly made the transfer'
      : 'transfer must reach and hold the receiver via the required path');
    if (!recipe.control)
      require(m.releaseDistance > 16, 'receiver catch must release');
  }
  return failures;
};
export const runTacticCase = (
  table: BuiltInTable,
  recipe: TacticCase,
  revision: string,
) => {
  const board = table.board,
    source = board.flippers[recipe.source],
    receiver = 1 - recipe.source;
  let state = tacticInitialState(table, recipe),
    key = '',
    settled = 0,
    releaseFrame = -1;
  let releasePosition = { x: 0, y: 0 };
  const initialState = copyState(state),
    debug = new PhysicsDebug();
  debug.enabled = true;
  const artifact: PlaytestArtifact = {
    kind: 'headless-playtest',
    version: 1,
    id: recipe.id,
    tableId: table.id,
    revision,
    seed: 0,
    board,
    initialState,
    inputs: [],
    frameDurations: [],
    findings: [],
    finalHash: '',
  };
  const m: TacticMetrics = {
    firstContactFrame: -1,
    firstContactSpeed: -1,
    minimumContactSpeed: -1,
    receiverContact: false,
    receiverBeforeEntry: false,
    caught: false,
    liveCaught: false,
    postContact: false,
    poweredSourceContact: false,
    inlaneUp: false,
    inlaneDown: false,
    upperContactBeforeEntry: false,
    releaseDistance: 0,
    drained: false,
    feedReachedTip: false,
    feedUpwardSpeed: 0,
  };
  const errors: string[] = [];
  const spawn = getPhysicsSandboxSpawnBlockedReason(
    board,
    state.ball.position,
    state,
  );
  if (['post-pass', 'shatz', 'bump-pass'].includes(recipe.tactic)) {
    if (!isSettledOn(state, board, recipe.source))
      errors.push('source must start from a physically settled cradle');
  } else if (spawn) errors.push(`invalid initial state: ${spawn}`);
  const target = ['post-pass', 'shatz', 'bump-pass'].includes(recipe.tactic)
    ? receiver
    : recipe.source;
  let maxSpeed = 0;
  for (let frame = 0; frame < 1200 && !errors.length; frame++) {
    const input =
      releaseFrame >= 0 ? { ...idle } : tacticInput(recipe, frame, source.side);
    const nextKey = inputKey(input);
    if (nextKey !== key) {
      artifact.inputs.push({ frame, input });
      key = nextKey;
    }
    const dt = 1 / (recipe.hz ?? 120);
    artifact.frameDurations.push(dt);
    const previousY = state.ball.position.y;
    debug.contacts = [];
    const result = debug.capture(dt, () =>
      advanceGameFrame(state, board, input, dt),
    );
    state = result.state;
    const speed = Math.hypot(
      state.ball.linearVelocity.x,
      state.ball.linearVelocity.y,
    );
    maxSpeed = Math.max(speed, maxSpeed);
    if (
      !Number.isFinite(speed + state.ball.position.x + state.ball.position.y)
    ) {
      errors.push('non-finite physics state');
      break;
    }
    if (result.events.some((e) => 'score' in e))
      errors.push('unexpected scoring assistance');
    m.drained ||= result.events.some((e) => e.type === 'ball-drained');
    if (releaseFrame >= 0) {
      if (m.drained || frame - releaseFrame >= 120) {
        m.releaseDistance = m.drained
          ? state.ball.radius * 2
          : Math.hypot(
              state.ball.position.x - releasePosition.x,
              state.ball.position.y - releasePosition.y,
            );
        break;
      }
      continue;
    }
    const profile = sampleFlipperProfile(
      state.ball.position,
      source,
      state.flippers[recipe.source].angle,
    );
    if (
      m.firstContactFrame < 0 &&
      profile.distance <= profile.radius + state.ball.radius + 1 &&
      (recipe.tactic !== 'inlane-feed' ||
        (profile.t < 0.2 && profile.normal.y < 0))
    ) {
      m.firstContactFrame = frame;
      m.firstContactSpeed = speed;
      m.minimumContactSpeed = speed;
    }
    if (recipe.tactic === 'inlane-feed' && m.firstContactFrame >= 0) {
      m.feedUpwardSpeed = Math.max(
        m.feedUpwardSpeed,
        -state.ball.linearVelocity.y,
      );
      if (profile.t >= 0.9) {
        m.feedReachedTip = true;
        break;
      }
    }
    if (m.firstContactFrame >= 0 && frame - m.firstContactFrame < 12)
      m.minimumContactSpeed = Math.min(speed, m.minimumContactSpeed);
    const other = sampleFlipperProfile(
      state.ball.position,
      board.flippers[receiver],
      state.flippers[receiver].angle,
    );
    m.receiverContact ||=
      (recipe.tactic === 'inlane-feed' || m.firstContactFrame >= 0) &&
      other.distance <= other.radius + state.ball.radius + 1;
    if (!m.inlaneUp) m.receiverBeforeEntry ||= m.receiverContact;
    m.poweredSourceContact ||= debug.contacts.some(
      (c) =>
        c.collider?.kind === 'flipper' &&
        c.collider.index === recipe.source &&
        (c.impulse?.normalImpulse ?? 0) > 0 &&
        input[source.side === 'left' ? 'leftPressed' : 'rightPressed'] &&
        Math.abs(state.flippers[recipe.source].angularVelocity) > 0,
    );
    m.liveCaught ||= state.ball.liveCatchFlipper === recipe.source;
    m.postContact ||= debug.contacts.some(
      (c) =>
        c.collider?.kind === 'post' &&
        (c.collider.index ?? -1) >= board.posts.length - 2 &&
        (c.impulse?.normalImpulse ?? 0) > 0,
    );
    if (!m.inlaneUp)
      m.upperContactBeforeEntry ||= debug.contacts.some(
        (c) => c.point.y < 460 && (c.impulse?.normalImpulse ?? 0) > 0,
      );
    const outward = board.flippers[receiver].side === 'right' ? 1 : -1,
      offset = outward * (state.ball.position.x - board.flippers[receiver].x);
    // A short Shatz lob crosses the curved inlane above the heel and below
    // its post, then returns through that same ball-clear corridor.
    const crossingY = board.flippers[receiver].y - 60;
    const lowerPost = board.posts[board.posts.length - 2 + receiver];
    const inner =
      30 +
      Math.sqrt(
        (lowerPost.radius + state.ball.radius) ** 2 -
          (crossingY - lowerPost.y) ** 2,
      );
    const dy = crossingY - (board.flippers[receiver].y - 177);
    const outer = 32 + Math.sqrt((148 - state.ball.radius - 6) ** 2 - dy ** 2);
    const inside = offset >= inner && offset <= outer;
    if (inside && previousY >= crossingY && state.ball.position.y < crossingY)
      m.inlaneUp = true;
    if (
      m.inlaneUp &&
      inside &&
      previousY < crossingY &&
      state.ball.position.y >= crossingY
    )
      m.inlaneDown = true;
    settled = isSettledOn(state, board, target) ? settled + 1 : 0;
    if (settled >= 60 && !m.caught) {
      m.caught = true;
      releaseFrame = frame;
      releasePosition = { ...state.ball.position };
    }
    if (releaseFrame >= 0 && frame - releaseFrame >= 120) {
      m.releaseDistance = Math.hypot(
        state.ball.position.x - releasePosition.x,
        state.ball.position.y - releasePosition.y,
      );
      break;
    }
    if (m.drained) break;
    if (recipe.tactic === 'dead-bounce' && m.receiverContact) break;
    if (
      recipe.tactic === 'drop-catch' &&
      m.firstContactFrame >= 0 &&
      frame - m.firstContactFrame >= 12
    )
      break;
    if (
      recipe.tactic === 'live-catch' &&
      recipe.control &&
      m.firstContactFrame >= 0 &&
      frame - m.firstContactFrame >= 12
    )
      break;
  }
  errors.push(...tacticFailures(recipe, m));
  if (!artifact.inputs.length)
    artifact.inputs.push({ frame: 0, input: { ...idle } });
  if (errors.length)
    artifact.findings.push({
      code: 'tactic-failed',
      frame: Math.max(0, artifact.frameDurations.length - 1),
      seconds: artifact.frameDurations.length / (recipe.hz ?? 120),
      ballId: state.ball.id ?? 0,
      point: { ...state.ball.position },
      flipper: recipe.source,
      confirmed: true,
      recovery: errors,
    });
  artifact.tactic = {
    name: recipe.tactic,
    source: recipe.source,
    control: recipe.control,
    passed: errors.length === 0,
    errors,
    metrics: { ...m },
  };
  artifact.finalHash = stateHash(state);
  const summary: RunSummary = {
    id: recipe.id,
    suite: 'tactics',
    frames: artifact.frameDurations.length,
    seconds: artifact.frameDurations.length / (recipe.hz ?? 120),
    outcome: errors.length ? 'issue' : 'passed',
    maxSpeed,
    hits: [],
    findings: artifact.findings,
  };
  return { recipe, metrics: m, errors, summary, artifact };
};
