# Spinner momentum and revolution scoring

A fast ball passage drives a spinner, which continues rotating after the ball
leaves. Each completed revolution emits a normal `spinner-spin` event with the
authored score. No points are awarded merely for contact. Existing table rules
receive the same event type, so distinct-spinner qualifications and table-specific
values continue to work. This changes spinner scoring across all tables.

## Passage and momentum

The trigger is a non-solid capsule at the authored axle position/angle. Blade
phase does not rotate the trigger across the playfield. Normal ball velocity is
measured relative to table-nudge velocity; tangential grazes and speeds below
60 board units/second add no momentum. Each ball tracks its own overlap state.
Only entry adds angular impulse; remaining in contact, solver substeps, or another
ball's overlap cannot retrigger that passage. Leaving and returning permits a
new impulse. Opposite-direction passages can slow or reverse a rotor.

Angular velocity gains `normalSpeed * impulseGain`, clamped to the total authored
speed cap. Defaults are gain 0.1, cap 120 radians/second, and drag 2 per second.
Just One More uses 0.16, 180, and 1.4 respectively. Other tables use defaults
unless they explicitly author tuning. Layout compilation and board cloning
preserve these fields. Validation rejects nonfinite/negative tuning, zero gain,
and zero speed cap; zero drag deliberately allows indefinite coast. Runtime
falls back to safe defaults for invalid authored tuning.

This is a planar approximation, not a rigid-body energy-transfer simulation.
The spinner does not bounce the ball or reduce its speed. Geometry and approach
corridors are unchanged, and the existing conservative clearance checks remain.

## Rotation and scoring

Integrate exponential drag exactly: `vNext = v * exp(-drag * dt)` and angular
travel `v * (1 - exp(-drag * dt)) / drag`. With zero drag, travel is `v * dt`.
Track signed travel toward the next full 2π turn. Partial reverse oscillations
cancel instead of accumulating free scoring. Emit every full turn, even when
one step contains several, retaining the last driving ball ID. Rotation advances
once per physics substep in play and once per shared display step in the sandbox,
independently of the number of live/injected balls. Wrap visual
phase separately and stop negligible speed below 0.01 radians/second.

Each pulse has the current frame tick and authored spinner index/score. The
rules engine applies table-specific scoring and qualification normally. Continued
coast may qualify newly reset flags; spinning one index repeatedly never counts
as a different spinner. Pause freezes rotation and awards. Physical device resets,
ordinary numbered-ball resets, and replay discard residual spin/progress.

## Presentation and audio

The blade flips about a fixed axle: projected width narrows edge-on, and front
and back use different theme colors. The debug overlay shows the fixed passage
trigger. A short stereo click accompanies each completed turn on every table,
including Just One More, without requiring music or callouts. Audio is bounded
to six clicks per frame while scoring preserves all pulses; mute/volume and
browser audio unlock apply. See [table audio](table-audio-spec.md).

## Validation

Tests cover soft versus hard shots, sustained coast, total speed caps, independent
multiball contacts and cloning, tangent/slow rejection, reverse rotation, partial
oscillation cancellation, multiple turns per step, and equivalent results at
30/60/120/240 Hz. Actual physics/rules integration verifies Just One More's
100-point turns and distinct-spinner PLAY progress. Tests also cover layout tuning
preservation/validation and click scheduling, mute, burst bounds, and cleanup.
Run the full suite, build/lint, all-table deep validation, and Classic playtests
for this shared physics change. Browser review exercises actual sandbox passages
and a temporary production-loop fixture for play scoring/audio and phone layout.

October 10, 2026 acceptance: actual desktop sandbox shots showed repeated turn
pulses after the ball left the axle. A temporary production-loop fixture showed
ARCADE earning 2,000 points from a capped hard shot with only PLAY bit 1 lit;
a later ROAD TRIP shot lit both bits. Pausing during that shot preserved score
2,600 and angular speed −127, including after switching to a 390 × 844 viewport.
Browser error/warning logs were empty. Audio scheduling was tested; sound quality
was not judged by listening. These browser checks use injected shots rather than
human flipper timing, and phone-sized Chrome rather than physical phones.

All seven tables passed deep validation with zero errors/warnings. The Classic
runner completed 76 runs (52 controlled shots and 24 seeded games): 20 games
finished, four reached the 60-second cap, and 15 diagnostic flags reported speed
over 4,000 units/second. Those flags require interpretation and are not failed
route checks; this run is not proof of every shot's playability.
