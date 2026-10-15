# Headless investigation and replay

The browser game and investigation runner use `advanceGameFrame`: the same
physics update followed by the same rule update. Headless simulation advances
explicit frame durations without animation frames, rendering, or wall-clock
waiting. It tests behavior, not visual quality or human difficulty.

## Commands and coverage

`make playtest` runs eight seeded 60-second games per built-in table and a
192-case matrix per flipper around the inlane/heel lip. Games use a deterministic
reactive controller, variable launch strength, and short flipper presses. They
never nudge automatically. Lip cases vary lateral offset, feed height, incoming
velocity, and rest/held/release/raise controls. Seeds overlapping static or
flipper geometry are reported as invalid, not treated as passing tests.

```sh
make playtest
make playtest ARGS='--table classic-table --suite lip --output /tmp/lip-review'
make playtest ARGS='--preset deep --seed 1980'
make playtest ARGS='--replay playtest-results/investigation/cases/000-classic-table.json'
make playtest ARGS='--replay /tmp/lip-review/cases/000-classic-table.json --current-table'
```

The deep preset runs 64 games per table and four seeded jitter bands of the lip
matrix. `--games`, `--suite game|lip|both`, `--max-artifacts`, and `--output`
control cost and storage. Reports include all case summaries, skips, time-limit
outcomes, gameplay event coverage, unvisited components, and clustered findings.
Coverage indicates opportunities for more tests; it does not prove a shot
reachable. The campaign is bounded by scenario counts and simulated time.
Interrupted campaigns do not produce a complete report.

Exit status is 0 for no confirmed failures, 1 for confirmed failures (or warnings
with `--strict`), and 2 for invalid arguments/imports or same-revision replay
hash divergence. `make` presents nonzero command status as its own error.
Generated results are ignored by git. There is no network upload.

## Detection and recovery

Each ball is monitored independently, including multiball. Waiting shooter balls
and occupied saucers with active capture timers are exempt. Drain/turn boundaries
clear history. Non-finite state and escaped bounds are failures. Position and
speed histories sample at 10 Hz: two seconds of near-stationary movement produces
a candidate, and six seconds of bounded motion without gameplay progress
produces a warning. Holding a flipper alone does not exempt a stationary ball.

Candidates are tested in cloned states. A supported held cradle must release
under gravity when controls are released. Other stationary candidates receive
two seconds of idle simulation. A continuing trap is confirmed; independent
single up/left/right nudge probes record which recover it. Recovery probes never
alter the main trace. Confirmed cases retain two seconds of subsequent motion.

One representative per cluster (up to the artifact limit) receives detailed
contact replay, eight local position neighbors when applicable, and reruns at
30/60/120 Hz and alternating 8.33/25 ms cadence. Neighbor overlap rejection is
reported. Cadence sensitivity is diagnostic, not a reason to discard the original
failure. Thresholds are conservative heuristics, not exhaustive proofs.

## Artifact and visual review

Version 1 artifacts contain the initial runtime state, complete board snapshot,
source fingerprint and git revision, seed/case identity, exact outer frame
durations, control transitions, findings, and final state hash. Replay defaults
to the recorded board with the current engine; `--current-table` explicitly tests
new layout data. Same-revision hashes must match. Across revisions hashes are
informational because physics or rules may intentionally change.

Open `/benchmarks/playtest-review.html` from `make dev` or the production build.
Load local JSON cases, select a finding, scrub, step frames, or play at 0.25/1/4x.
The viewer shows the table, a close-up, recent trajectory, ball speed graph, and
contact identities/normals/overlap/impulses. It checkpoints states for responsive
seeking and can compare recorded versus current table geometry. If the engine
produces invalid coordinates, review stops at the last valid frame. Imports are
limited to 20 MB, 20,000 frames and 300 simulated seconds and validate required
numeric and structural fields. They are data, not executable scripts.

## Recording a human game

Settings contains **Export recent play** and **Export suspected issue**. The
always-on recorder keeps approximately 30–32 seconds of frame durations, input
changes, and two-second state checkpoints. A suspected issue freezes the recent
window plus two seconds afterward. Candidates exported from human play remain
candidates until headless recovery probes establish the outcome.

Pausing, resetting a ball, and suspending the game end the current segment so a
canceled plunger pull cannot become an unrecorded launch during replay. These
boundaries preserve the latest suspected issue; starting a new game clears it.
Exports are local JSON downloads. Detailed contacts are generated on demand,
not retained every frame during normal play. `make profile-performance` reports
paired seeded games with and without recording, milliseconds per frame and the
largest recent-window export, alongside the existing physics workloads.

## Initial investigation

The first campaign reproduced both Classic heel traps and equivalent cases on
other tables. Incoming held feeds settled just outside the pivot; releasing the
flipper failed to free them, while a directional nudge did. It also found three
Alien Star full-game stationary cases away from the lower heel. These are
separate findings. Keep the harness change independent of subsequent physics or
layout repairs so saved cases establish before/after evidence.

Initial smoke profile on this workstation: 3,328 cases and 9,464 simulated
seconds in 15.54 seconds (609× real time). Five warmed paired all-table game
batches measured 0.01400 ms/frame without recording and 0.01523 ms/frame with
recording, a 0.00123 ms/frame overhead. The largest recent-window JSON export
was 74,250 bytes. These are local timings, not performance guarantees.

The first repair is scoped to Classic's explicit upper heel approach. The smoke
campaign drops from 116 failures/15 clusters to 99/13, with no Classic failures.
Remaining table-specific heel traps and Alien Star field stalls remain in the
report; passing the older route validator does not override these findings.

## Tactic assertions

The default suite is now `all`, adding the 60 Tactics Lab assertions to seeded
games and lip sweeps. `--suite tactics` runs only these contracts; `--suite both`
keeps game/lip coverage alone. Successful moves and expected-miss controls save
replays under `tactics/`, with explicit metrics and `tactic-failed` findings for
contract violations. See [Tactics Lab](tactics-lab-spec.md) for geometry, exact
observations, fixed-step timing and the short-Shatz scope.

The initial strict tactic run reports four Shatz failures: those shots bounce
off the receiver before entering its inlane. The other tactic types pass, including the fast passive heel-feed sweep at
500/1000/1500 units/s and 60/120/240 Hz. See the
[fast-feed contact contract](flipper-feed-spec.md#fast-passive-heel-seam-contacts).
Known failures remain visible in the CLI and replay files.
