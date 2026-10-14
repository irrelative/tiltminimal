# Flipper resting contacts

Held balls must roll and settle continuously. The engine must not reconstruct a
ball's position from a selected flipper parameter, zero its velocity at a
selected coordinate, or prescribe rolling spin on every frame.

## Contact response

Eligible held-face and live-catch contacts use `resolveBallContact`, the same
normal-impulse, friction, spin and penetration solver used by other surfaces.
Gravity changes velocity before contact resolution. Previous resting contacts
are solved before integrating position; new impacts are solved afterward.
Resting contacts have zero
restitution so support does not add a bounce each frame. Friction transfers
linear motion into spin; the solver's material damping dissipates it.

The existing 2D heel-pocket approximation is retained as a unilateral support
constraint. Its inward-facing normal follows the bat axis. It supports ball
centers within a base radius plus half a ball radius of the pivot (at least 8%
of bat length), leaving sufficient clearance to release without balancing on
the stationary cap. The former full-ball-radius margin held the ball too far
up the bat. It exists only during eligible held contact and only resists inward
velocity. It does not pull a separated ball back into contact or move an
arriving ball uphill to the support boundary. Heel contact always uses zero
position correction; face corrections address only actual rubber overlap.
Both contacts appear through the existing physics contact debug recorder.

Each ball remembers its previous held face in `restingFlipper`. On a stationary
held bat, the engine solves support after gravity updates velocity and before
moving the ball. This prevents repeated gravity penetration without an uphill
position correction. The contact is reevaluated against current geometry and
normal catch eligibility; it is cleared/reestablished during the ordinary
collision pass. Release, separation, invalid contacts and moving bats do not
receive the stationary support pass. Markers belong to individual balls and
survive state cloning without freezing position or prescribing spin.

This is a contact-based version of the existing pocket, not a new visible rail
or a fully modeled 3D flipper shaft/rubber assembly. Removing that approximation
also requires redesigning heel geometry: experiments with the current bat and
return rails alone left balls balanced on the stationary cap and unable to
release. The contact constraint preserves functioning hold/release behavior.

Catch eligibility, speed limits, and the stronger tangential impact absorption
remain unchanged. Impact damping acts only on sufficiently fast incoming
normal motion. Live catches use the end-stop's table-relative velocity for the
absorbing face contact, preventing the final upstroke from relaunching the ball.
Release clears the catch and bypasses both held-contact responses. Subsequent
motion uses ordinary moving-flipper collision resolution.

## Validation and profiling

Regression coverage includes two separate, initially overlapping heel positions
on all 17 flippers. Neither may move more than 0.6 units in one contact solve;
their positions must remain distinct. Heel support must not change their
position along the bat, and 120 gravity/contact steps must never move either
uphill. Long-hold tests require settling in the bottom 8–21% of the bat and
departure by more than one ball radius within a second after release.
The former pose clamp and later uphill correction both fail these checks.
Existing long holds, nine-speed feeds, releases, live/drop catches, dead bounces,
nudges, bump/post passes, multiball and scoring-shot requirements remain intact.
Shot timing samples are remeasured rather than weakening their objective checks.

October 13, 2026 validation: 642 tests pass; all eight tables pass deep validation
with zero errors/warnings; production build and lint pass. Chrome replayed all
17 held trajectories and releases using production physics and rendering.
The updated 120 Hz replay had no uphill motion beyond floating-point noise
(less than 1e-6 board units). Centers settled at 16.6–19.3% of bat length and
speed was below 1 unit/second for every flipper. Release moved each ball
204–273 units in one second. A further 6,000 held frames (50 simulated seconds)
showed zero position drift on every flipper. Temporary review fixtures
and baseline engine copies were removed after inspection.

An alternating before/after benchmark used warmed runs, nine batches, 100
repeats and 60 Hz steps. General physics (384 states) measured 0.012887 ms before
and 0.013115 ms after in Node (+1.8%), with an unchanged position checksum;
Chrome measured 0.007906→0.008010 ms (+1.3%). Contact-heavy physics (68 states,
including a settled contact on every flipper) measured 0.010666→0.011014 ms in
Node (+3.3%) and 0.006588→0.006794 ms in Chrome (+3.1%). The additional support
pass costs less than 0.0004 ms per call in this synthetic comparison; it is not
a performance improvement. Contact-heavy checksums intentionally change with
the corrected resting behavior. Permanent CLI/browser benchmarks now include
the physically settled states so this path remains measurable.

Resting position now depends on the arrival instead of a correction to one
coordinate. Switchyard's left-to-upper-Cargo regression settles an initial
40%-along-the-bat contact rather than the default 30%, then releases for 171
240 Hz frames. It retains an unassisted physical shot and the same first-major-
objective requirement; the right-flipper example remains independently tested.

Classic's 76-run seeded playtest completed with no escape/nonfinite flags and
0.02 seconds maximum unexplained near-rest. Its 24 speed-above-4000 flags remain
diagnostics; maximum speed was 4244.3 units/second. This sampled report does not
establish that every trajectory is catchable or every shot easy.
