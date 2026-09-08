import { classicTable } from '../boards/tables/classic-table';
import { createInitialGameState } from '../game/game-state';
import { initializeRulesState } from '../game/rules-engine';
import {
  idle,
  simulate,
  STEP_SECONDS,
  type Controller,
  type PlaytestRun,
} from './simulation';

export const createSeededRandom = (seed: number): (() => number) => {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
};
export const createClassicController = (seed: number): Controller => {
  const random = createSeededRandom(seed);
  let launchFrames = 0,
    launchTarget = 0,
    leftUntil = 0,
    rightUntil = 0,
    leftReady = 0,
    rightReady = 0;
  return (state, frame) => {
    if (state.status === 'waiting-launch') {
      if (!launchTarget)
        launchTarget = Math.round(
          ((0.55 + random() * 0.45) *
            classicTable.physics.plunger.maxPullSeconds) /
            STEP_SECONDS,
        );
      return { ...idle, launchPressed: launchFrames++ < launchTarget };
    }
    launchFrames = 0;
    launchTarget = 0;
    const ball = state.ball;
    if (ball.linearVelocity.y > 0) {
      for (const f of classicTable.flippers) {
        const near =
          Math.abs(ball.position.x - f.x) < f.length + 30 &&
          ball.position.y > f.y - 100 &&
          ball.position.y < f.y + 25;
        if (!near) continue;
        if (f.side === 'left' && frame >= leftReady) {
          leftUntil = frame + Math.round(10 + random() * 14);
          leftReady = leftUntil + 12;
        }
        if (f.side === 'right' && frame >= rightReady) {
          rightUntil = frame + Math.round(10 + random() * 14);
          rightReady = rightUntil + 12;
        }
      }
    }
    return {
      ...idle,
      leftPressed: frame < leftUntil,
      rightPressed: frame < rightUntil,
    };
  };
};
export const runClassicPlaytest = (
  games = 24,
  seed = 1979,
  gameSeconds = 60,
) => {
  const runs: PlaytestRun[] = [];
  for (const side of ['left', 'right'] as const) {
    const flipper = classicTable.flippers.find((f) => f.side === side)!;
    for (const incomingSpeed of [150, 300])
      for (let delay = 0; delay <= 36; delay += 3) {
        const initial = initializeRulesState(
          createInitialGameState(classicTable),
          classicTable,
        );
        initial.status = 'playing';
        initial.launcherExited = true;
        initial.ball.position = {
          x: flipper.x + Math.cos(flipper.restingAngle) * flipper.length * 0.65,
          y:
            flipper.y +
            Math.sin(flipper.restingAngle) * flipper.length * 0.65 -
            85,
        };
        initial.ball.linearVelocity = { x: 0, y: incomingSpeed };
        runs.push(
          simulate(
            classicTable,
            initial,
            `${side}-${incomingSpeed}-${(delay * 1000) / 120}ms`,
            (_, frame) => ({
              ...idle,
              leftPressed:
                side === 'left' && frame >= delay && frame < delay + 24,
              rightPressed:
                side === 'right' && frame >= delay && frame < delay + 24,
            }),
            4,
            true,
          ),
        );
      }
  }
  for (let game = 0; game < games; game++)
    runs.push(
      simulate(
        classicTable,
        initializeRulesState(
          createInitialGameState(classicTable),
          classicTable,
        ),
        `game-${seed + game}`,
        createClassicController(seed + game),
        gameSeconds,
        false,
      ),
    );
  return {
    version: 1,
    stepSeconds: STEP_SECONDS,
    seed,
    games,
    gameSeconds,
    board: classicTable,
    runs,
  };
};
export type ClassicReport = ReturnType<typeof runClassicPlaytest>;
export const formatClassicReport = (report: ClassicReport): string => {
  const shots = report.runs.filter((r) => !r.id.startsWith('game-')),
    games = report.runs.filter((r) => r.id.startsWith('game-'));
  const durations = games
    .flatMap((r) => r.drains.map((d) => d.ballSeconds))
    .sort((a, b) => a - b);
  const hits: Record<string, number> = {};
  games.forEach((r) =>
    Object.entries(r.hits).forEach(([key, count]) => {
      hits[key] = (hits[key] ?? 0) + count;
    }),
  );
  const flags = report.runs.flatMap((r) => r.flags.map((f) => `${r.id}: ${f}`));
  return (
    [
      '# Classic focused playtest',
      `Seed ${report.seed}; fixed 120 Hz; ${shots.length} controlled shots; ${games.length} games capped at ${report.gameSeconds} seconds each.`,
      '## Simulated games',
      `Completed: ${games.filter((r) => r.outcome === 'game-over').length}. Time-limited: ${games.filter((r) => r.outcome === 'timeout').length}. Drained balls: ${durations.length}.`,
      `Median completed-ball duration: ${durations.length ? durations[Math.floor(durations.length / 2)].toFixed(2) : 'n/a'} s. Ongoing balls are excluded, so this is not an unbiased survival estimate.`,
      `Maximum speed: ${Math.max(0, ...report.runs.map((r) => r.maxSpeed)).toFixed(1)} u/s. Longest unexplained near-rest: ${Math.max(0, ...report.runs.map((r) => r.longestIdleSeconds)).toFixed(2)} s.`,
      '## Diagnostic flags',
      flags.length
        ? flags.map((f) => `- ${f}`).join('\n')
        : 'No bounds escapes, non-finite dynamics, speeds above 4000 u/s, or unexplained near-rest lasting 3 seconds detected.',
      '## Timing map',
      'Ball starts 85 units above the resting flipper at 65% of its length. Flip delays advance by 25 ms; each hold lasts 200 ms. Upfield X is the first upward crossing of y=900 during the 4-second run, potentially after a secondary bounce. A missing crossing is not automatically a failure.',
      [
        '| Shot (side / incoming speed / delay) | Upfield X | First device | Outcome |',
        '| --- | ---: | --- | --- |',
        ...shots.map(
          (r) =>
            `| ${r.id} | ${r.firstUpfieldX?.toFixed(1) ?? '—'} | ${r.firstHit ?? '—'} | ${r.outcome} |`,
        ),
      ].join('\n'),
      '## Game device coverage',
      ...Object.entries(hits)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => `- ${key}: ${count}`),
      '## Limits and reproduction',
      'The controller reacts to descending balls near each flipper and varies hold duration and launch power using a seeded generator. It does not aim, learn, or nudge. Counts describe this controller and these feeds, not human skill, fairness, or fun. Timeouts and sharp timing-map changes are review candidates, not proof of a bug.',
      'The JSON companion saves the board, initial states, every input transition, final states, last pre-drain positions, and trajectories sampled at 10 Hz. Replay with `make playtest-classic ARGS="--replay playtest-results/classic.json --run <id>"`. Replays use the current engine and compare the complete final state with the recorded state.',
    ].join('\n\n') + '\n'
  );
};
