import { expect, it } from 'vitest';
import { alienStarTable as board } from '../src/boards/tables/alien-star';
import { createInitialGameState } from '../src/game/game-state';
import { stepGameFrame } from '../src/game/physics-engine';
import { PhysicsDebug } from '../src/game/physics-debug';
import { getPhysicsSandboxSpawnBlockedReason } from '../src/game/physics-sandbox';
import { idle } from '../src/playtest/simulation';

// Physical falling-ball feeds that the former saucer mouth intercepted.
const feeds = [
  { x: 480, y: 1340, speed: 800, delay: 12 },
  { x: 490, y: 1360, speed: 600, delay: 14 },
  { x: 490, y: 1380, speed: 800, delay: 8 },
  { x: 500, y: 1340, speed: 800, delay: 16 },
  { x: 500, y: 1360, speed: 600, delay: 18 },
  { x: 500, y: 1360, speed: 800, delay: 14 },
  { x: 500, y: 1380, speed: 600, delay: 16 },
  { x: 500, y: 1380, speed: 800, delay: 12 },
  { x: 510, y: 1360, speed: 800, delay: 18 },
  { x: 510, y: 1380, speed: 800, delay: 16 },
];
const run = (definition: typeof board, feed: (typeof feeds)[number]) => {
  let state = createInitialGameState(definition);
  state.status = 'playing';
  state.launcherExited = state.ball.launcherExited = true;
  state.ball.position = { x: feed.x, y: feed.y };
  state.ball.linearVelocity = { x: 0, y: feed.speed };
  expect(
    getPhysicsSandboxSpawnBlockedReason(definition, state.ball.position, state),
  ).toBeNull();
  const cup = definition.saucers[0];
  const pocketGuides = new Set(
    definition.guides.flatMap((g, i) =>
      (
        g.kind === 'arc'
          ? Math.hypot(g.center.x - cup.x, g.center.y - cup.y) < 0.01
          : [g.start, g.end].every(
              (p) => Math.hypot(p.x - cup.x, p.y - cup.y) < 180,
            )
      )
        ? [i]
        : [],
    ),
  );
  expect(pocketGuides.size).toBe(5);
  const debug = new PhysicsDebug();
  debug.enabled = true;
  const obstructingGuides = new Set<number>();
  let blade = false,
    scored = false,
    sourceImpulse = false,
    otherMechanism = false;
  for (let frame = 0; frame < 240 && !scored; frame++) {
    debug.contacts = [];
    const result = debug.capture(1 / 120, () =>
      stepGameFrame(
        state,
        definition,
        { ...idle, rightPressed: frame >= feed.delay },
        1 / 120,
      ),
    );
    state = result.state;
    sourceImpulse ||= debug.contacts.some(
      (c) =>
        c.collider?.kind === 'flipper' &&
        c.collider.index === 1 &&
        (c.impulse?.normalImpulse ?? 0) > 0,
    );
    if (!blade)
      for (const c of debug.contacts)
        if (
          c.collider?.kind === 'guide' &&
          pocketGuides.has(c.collider.index ?? -1) &&
          (c.impulse?.normalImpulse ?? 0) > 1e-4
        )
          obstructingGuides.add(c.collider.index!);
    blade ||= state.ball.spinnerContacts?.[0] ?? false;
    scored ||= result.events.some(
      (e) => e.type === 'spinner-spin' && e.index === 0,
    );
    otherMechanism ||= result.events.some((e) =>
      [
        'bumper-hit',
        'slingshot-hit',
        'standup-target-hit',
        'drop-target-hit',
        'saucer-captured',
        'ball-drained',
      ].includes(e.type),
    );
    if (otherMechanism) break;
  }
  return { blade, scored, sourceImpulse, otherMechanism, obstructingGuides };
};
it.each(feeds)(
  'right-flipper feed ($x,$y), speed $speed, delay $delay clears the saucer and spins the blade',
  (feed) => {
    const result = run(board, feed);
    expect(result.sourceImpulse).toBe(true);
    expect(result.obstructingGuides.size).toBe(0);
    expect(result.otherMechanism).toBe(false);
    expect(result.blade).toBe(true);
    expect(result.scored).toBe(true);
  },
);
it('reproduces the blockage when the original long inboard saucer guide is restored', () => {
  const old = structuredClone(board);
  const cup = old.saucers[0],
    angle = -0.62;
  const point = (x: number, y: number) => ({
    x: cup.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: cup.y + x * Math.sin(angle) + y * Math.cos(angle),
  });
  const cap = point(54, 0),
    join = point(54, 20);
  const throat = old.guides.find(
    (g) =>
      g.kind !== 'arc' &&
      Math.hypot(g.start.x - cap.x, g.start.y - cap.y) < 0.01,
  )!;
  const mouth = old.guides.find(
    (g) =>
      g.kind !== 'arc' &&
      Math.hypot(g.start.x - join.x, g.start.y - join.y) < 0.01,
  )!;
  if (throat.kind === 'arc' || mouth.kind === 'arc')
    throw Error('Expected connected lock entrance');
  throat.end = point(54, 70);
  mouth.start = throat.end;
  mouth.end = point(80, 140);
  const result = run(old, feeds[1]);
  expect(result.sourceImpulse).toBe(true);
  expect(result.obstructingGuides.size).toBeGreaterThan(0);
  expect(result.blade).toBe(false);
  expect(result.scored).toBe(false);
});
