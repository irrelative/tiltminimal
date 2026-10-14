# Performance meter

Settings → Performance meter enables an optional readout on every table in
Game and Physics. It is off by default and saved per browser. Enabling it does
not enable physics debugging or exclude a game from analytics/high scores.

Measurements use actual requestAnimationFrame timestamps before the simulation
clamps or scales elapsed time. The rolling window is two seconds and the display
updates twice per second. Table changes, toggling the meter and visibility changes
reset the window, so background-tab suspension is not counted as a gameplay stall.

- **FPS**: 1,000 divided by mean frame interval, not the physics tick rate.
- **ms/frame**: mean interval between animation callbacks.
- **P95**: 95% of sampled intervals were this short or shorter.
- **Max**: longest interval in the window.
- **>50 ms**: number of intervals longer than 50 ms in the window. These are long
  gaps, not an estimate of dropped frames; the display refresh rate is unknown.
- **Update**: average JavaScript time before rendering, including physics,
  rules, input and audio processing (sandbox includes its state updates).
- **Draw**: average JavaScript time submitting canvas drawing commands.

Update/Draw do not include GPU execution/presentation, browser compositing, or
all DOM callbacks after drawing. RAF cadence is an observable scheduling rate,
not proof that every submitted frame was physically displayed. A steady 30 FPS
with low Update/Draw times can indicate browser, power or display scheduling;
it does not by itself identify which one. 60 FPS corresponds to 16.7 ms/frame,
120 FPS to 8.3 ms, and 30 FPS to 33.3 ms.

For comparisons, keep the table, browser, window size, sound and power mode the
same. Observe the waiting ball, a full plunge, collisions and multiball. Record
FPS, P95, Max, Update and Draw while the choppiness is visible. Compare local and
production builds under the same conditions. Avoid concurrent builds/tests or
background profiling while measuring. A static page can establish whether the
same browser is delivering low RAF cadence independent of game code.

The meter collects no remote telemetry and adds no extra animation loop. Timing
calls and sample aggregation are disabled when it is off. Tests use controlled
clocks to cover 30/60/120 FPS, spikes, percentiles, window expiry and visibility.

## Repeatable engine profiling

Run `make profile-performance` for a warmed physics benchmark across all eight
built-in tables. Each table has 48 fixed positions with fast balls and a mixture
of single-ball and two-ball states; each call advances 1/60 second. Seven timed
batches follow a warmup. Results give median and minimum milliseconds per call,
plus an aggregate position/event checksum. This isolates engine costs; it does
not represent a full game, rules, audio, or browser presentation.

For CPU sampling, run
`node --cpu-prof --cpu-prof-dir=/tmp node_modules/vite-node/vite-node.mjs src/cli/profile-performance.ts`
and inspect the resulting profile in Chrome DevTools. Collect timings separately
from sampling when comparing small changes.

With `make dev` running, open `/benchmarks/performance.html` for the same physics
workload and warmed CanvasRenderer command-submission timings. Keep browser,
viewport and power settings fixed. Rendering batches include all table themes,
HUD and multiple balls; they exclude initial static-layer construction. These
synchronous batches do not measure RAF cadence or GPU presentation. Use the
in-game meter for those scheduling observations.

### October 13, 2026: guide collision optimization

CPU samples identified translated geometry allocation and exact guide projection
as major costs. Guide collision checks now reject balls outside conservative
bounds before projection and project in table-local coordinates, translating only
actual contact points. Bounds are read from current definitions, including arc
radius and line endpoints, so authoring changes require no cache invalidation.
Collision order, solver, substep frequency and return-gate rules are preserved.

Node median milliseconds per physics call (untraced runs):

| Table                | Before |  After | Reduction |
| -------------------- | -----: | -----: | --------: |
| Alien Star           | 0.0443 | 0.0218 |       51% |
| Just One More        | 0.0347 | 0.0192 |       45% |
| Classic              | 0.0324 | 0.0173 |       47% |
| Andromeda            | 0.0306 | 0.0194 |       36% |
| Double Crossed       | 0.0369 | 0.0200 |       46% |
| Harlem Globetrotters | 0.0348 | 0.0217 |       38% |
| Starlight            | 0.0366 | 0.0193 |       47% |
| Switchyard           | 0.0477 | 0.0199 |       58% |

Independent untraced Chrome runs confirmed physics reductions of 33–55% across
all tables (0.0171–0.0263 ms before, 0.0102–0.0148 ms after). Checksums matched
in both runtimes. All-table regression tests compare the optimized collision
resolver against the former exact resolver at guide endpoints, line midpoints,
arc samples and nearby positions with a moving/nudged table. The full suite
passed 603 tests. These figures describe this local synthetic workload, not a
claim of equivalent FPS improvement or mobile performance.
