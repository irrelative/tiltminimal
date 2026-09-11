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
