# Focused Classic playtest

Run `make playtest-classic` to exercise the actual physics and Classic rules at
120 Hz. This is an offline test runner; the browser's active game is unaffected.
It writes `playtest-results/classic.md` and `playtest-results/classic.json`.
Generated recordings are ignored by Git.

## Scenarios

The timing sweep uses both flippers, two incoming speeds (150 and 300 board
units/second), and 13 delays from 0 to 300 ms in 25 ms increments. Each feed
starts 85 units above the resting flipper at 65% of its length; regression tests
check that these positions do not overlap table elements. The selected flipper
holds for 200 ms. Each run ends at its first drain or four seconds.

The timing map records the first upward crossing of y=900 and the first device
hit. A crossing can follow a secondary collision; this is not a direct-shot
accuracy measurement. Failed crossings and abrupt destination changes should
be inspected rather than automatically treated as physics defects.

The default batch runs 24 games with seeds 1979–2002, capped at 60 seconds per
game. A simple controller reacts to descending balls near the flippers, varies
hold duration, and varies launch power between 55% and 100%. It does not aim or
nudge. Classic's actual three-ball scoring and ball transitions run throughout.

## Measurements and recordings

Each run includes input transitions, its initial and final state, device hit
counts, drain times, maximum sampled speed and its frame index, and a trajectory
sampled at 10 Hz. Speed and idle checks sample each 1/120-second frame; they do
not inspect intermediate solver substeps. Drain X is the last position before
the drain frame, because the physics engine resets the ball on that frame.

The runner flags non-finite ball positions/linear velocities, balls beyond the
side/top bounds, speeds above 4000 units/second, and three seconds of continuous
speed below 5 units/second. Idle checks exclude waiting launches, saucer holds,
and contact with an engaged flipper. The speed and idle thresholds are review
heuristics, not claims about physical realism.

Non-finite dynamics and escaped bounds return a nonzero exit status. Speed and
idle findings remain in the report for review. Game timeouts are explicitly
reported; unfinished balls are excluded from completed-ball duration statistics.

## Running and replaying

```sh
make playtest-classic
make playtest-classic ARGS="--games 100 --seed 42 --seconds 120 --output playtest-results/long.json"
make playtest-classic ARGS="--replay playtest-results/classic.json --run left-300-300ms"
make playtest-classic ARGS="--replay playtest-results/classic.json --run game-1983"
```

Games accept 1–200, seconds 1–300, and seeds unsigned 32-bit integers. Replays
use the recorded board and input changes with the current engine and compare
the complete final state. They fail if the engine's behavior has changed. These
are local CLI replays; loading a recording into the browser overlay is not yet
implemented. Keep a recording before changing physics to compare behavior.

## Initial baseline

The first default run produced 52 controlled shots and 24 simulated games:

- Each side reached y=900 at 6/13 timings for the 150-unit/s feed and 9/13 for
  the 300-unit/s feed. The slower feed first succeeded at a 175 ms delay.
- 17 games finished; seven hit the 60-second cap. There were 57 drained balls,
  with a median completed-ball duration of 10.42 seconds. This is a controller
  result with censored observations, not a human survival benchmark.
- No bounds escapes or non-finite dynamics were detected. The longest
  unexplained near-rest was 0.02 seconds.
- Eleven runs exceeded the speed review threshold. The fastest were the left
  and right 300-unit/s feeds with 300 ms delays: 4143.6 units/s at frame 38
  (zero-based). Those late-flip cases are the first candidates for inspecting
  energy transfer and tuning.
- Game coverage included all three bumpers and rollover lanes, the spinner,
  saucer, drop target, both slings, and all three standup targets. The saucer
  was hit only twice; the left top lane was hit 82 times versus 15 center and
  seven right. That suggests checking shot access and launcher bias by hand,
  without assuming this untargeted controller represents a skilled player.

The highest-speed controlled shot and a high-speed full game (`game-1983`)
replayed to identical final states. The baseline preserves current tuning;
no physics constants were changed as part of this playtest implementation.

## Connected-sling regression run

After correcting the connected sling faces to kick inward and upfield, the
default 76-run report completes eight games with 16 time-limited runs and
35 drained balls. Median completed-ball duration is 11.29 seconds; longest
unexplained near-rest is 0.03 seconds. There are no non-finite states or bounds
escapes. Fourteen runs exceed the 4000-unit/s speed review threshold (maximum
4155.1); this remains a physics-tuning observation, not a clean speed-budget
result. The focused post-pass suite separately verifies passive rebounds and
stable receiving catches across neighboring timings.

## Closer-post regression run

With the 60° faces and 30-outward/80-upward lower posts, the 76-run report
completes 14 games, with 10 time-limited games and 57 drained balls. Median
completed-ball duration is 11.52 seconds; longest unexplained near-rest is
0.02 seconds. There are no bounds escapes or non-finite states. Sixteen runs
exceed the existing 4000-unit/s speed-review threshold (maximum 4330.2).
These remain recorded physics-tuning observations. Post-pass regressions now
cover four neighboring 50–75 ms releases in each direction.
