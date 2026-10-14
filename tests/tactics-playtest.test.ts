import { expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import {
  tacticCases,
  runTacticCase,
  tacticFailures,
} from '../src/playtest/tactics';
import {
  parseArtifact,
  replayArtifact,
  stateHash,
} from '../src/playtest/artifact';

const table = BUILT_IN_TABLES.find((t) => t.id === 'tactics-lab')!;
it('provides a practice table without scoring mechanisms or powered slings', () => {
  for (const key of [
    'bumpers',
    'standupTargets',
    'dropTargets',
    'spinners',
    'saucers',
    'rollovers',
    'slingshots',
  ] as const)
    expect(table.board[key]).toEqual([]);
  expect(table.board.flippers).toHaveLength(2);
  expect(table.board.posts.length).toBeGreaterThanOrEqual(2);
});
it.each(tacticCases().filter((c) => c.tactic !== 'shatz' || c.control))(
  '$id satisfies the observable tactic contract',
  (recipe) => {
    const result = runTacticCase(table, recipe, 'test');
    expect(result.errors).toEqual([]);
    expect(result.summary.outcome).toBe('passed');
  },
);
it('replays a serialized tactic exactly, including its catch and release', () => {
  const recipe = tacticCases().find(
    (c) => c.tactic === 'post-pass' && !c.control,
  )!;
  const result = runTacticCase(table, recipe, 'test');
  const imported = parseArtifact(JSON.stringify(result.artifact));
  expect(stateHash(replayArtifact(imported))).toBe(result.artifact.finalHash);
  expect(runTacticCase(table, recipe, 'test').artifact).toEqual(
    result.artifact,
  );
});
it('rejects a catch that never settles or never releases', () => {
  const recipe = tacticCases().find((c) => c.tactic === 'hold-catch')!;
  const { metrics } = runTacticCase(table, recipe, 'test');
  expect(tacticFailures(recipe, { ...metrics, caught: false })).not.toEqual([]);
  expect(
    tacticFailures(recipe, { ...metrics, releaseDistance: 0 }),
  ).not.toEqual([]);
});
it('rejects a direct transfer presented as a post pass or Shatz', () => {
  const post = tacticCases().find(
    (c) => c.tactic === 'post-pass' && !c.control,
  )!;
  const { metrics } = runTacticCase(table, post, 'test');
  expect(tacticFailures(post, { ...metrics, postContact: false })).not.toEqual(
    [],
  );
  const shatz = tacticCases().find((c) => c.tactic === 'shatz' && !c.control)!;
  expect(
    tacticFailures(shatz, {
      ...metrics,
      postContact: false,
      inlaneUp: false,
      inlaneDown: false,
    }),
  ).not.toEqual([]);
  expect(
    tacticFailures(shatz, {
      ...metrics,
      postContact: false,
      inlaneUp: true,
      inlaneDown: true,
      upperContactBeforeEntry: true,
    }),
  ).not.toEqual([]);
});
it('reports a real dead-bounce failure if the receiver is moved out of reach', () => {
  const modified = structuredClone(table);
  modified.board.flippers[1].x += 250;
  const recipe = tacticCases().find((c) => c.tactic === 'dead-bounce')!;
  const result = runTacticCase(modified, recipe, 'test');
  expect(result.errors).not.toEqual([]);
  expect(result.artifact.findings[0].code).toBe('tactic-failed');
});

// Keep the physical expectation explicit. These samples currently bounce off
// the receiver before entering its inlane; the CLI reports them as failures.
// An unexpected pass forces removal of this known-failure annotation.
it.fails.each(tacticCases().filter((c) => c.tactic === 'shatz' && !c.control))(
  '$id enters the inlane directly before receiving-flipper contact',
  (recipe) => {
    expect(runTacticCase(table, recipe, 'test').errors).toEqual([]);
  },
);

it('detects the receiving-flipper rebound in the current Shatz sample', () => {
  const recipe = tacticCases().find((c) => c.tactic === 'shatz' && !c.control)!;
  const result = runTacticCase(table, recipe, 'test');
  expect(result.metrics.receiverBeforeEntry).toBe(true);
  expect(result.errors).toContain(
    'Shatz must enter the opposite inlane before touching the receiver flipper',
  );
});
