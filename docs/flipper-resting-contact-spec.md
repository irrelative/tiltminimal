# Flipper resting contacts

Held balls must roll and settle continuously. The engine must not reconstruct a
ball's position from a selected flipper parameter, zero its velocity at a
selected coordinate, or prescribe rolling spin on every frame.

## Contact response

Eligible held-face and live-catch contacts use `resolveBallContact`, the same
normal-impulse, friction, spin and penetration solver used by other surfaces.
Gravity is integrated before contact resolution. Resting contacts have zero
restitution so support does not add a bounce each frame. Friction transfers
linear motion into spin; the solver's material damping dissipates it.

The existing 2D heel-pocket approximation is retained as a unilateral support
constraint. Its inward-facing normal follows the bat axis; its boundary is one
base radius from the pivot, keeping a ball-sized center clear of the stationary
cap. It exists only during eligible held contact and only resists penetration
or motion into the heel. It does not pull a separated ball back into contact.
Normal impulses provide support instead of assigning a resting velocity.
Heel penetration correction is capped at 0.5 board units per substep, before
material compliance, so even a ball initially inside the support boundary
cannot jump to its edge. Face corrections address only actual rubber overlap.
Both contacts appear through the existing physics contact debug recorder.

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
their positions must remain distinct. The former pose clamp fails this check.
Existing long holds, nine-speed feeds, releases, live/drop catches, dead bounces,
nudges, bump/post passes, multiball and scoring-shot requirements remain intact.
Shot timing samples are remeasured rather than weakening their objective checks.

October 13, 2026 validation: 642 tests pass; all eight tables pass deep validation
with zero errors/warnings; production build and lint pass. Chrome replayed all
17 held trajectories and releases using production physics and rendering.
Maximum displacement beyond integrated incoming velocity was 0.368 board units
per 120 Hz frame; settled speed was below 1 unit/second for every flipper.
Release moved each ball 253–533 units in one second. Temporary review fixtures
and baseline engine copies were removed after inspection.

An alternating before/after benchmark measured 51 identical contact-heavy states
(three positions on every flipper), warmed runs, nine batches, 200 repeats, and
120 Hz steps. Node medians were 0.005440 ms before and 0.005523 ms after (+1.5%);
Chrome medians were 0.003882 ms before and 0.003843 ms after (-1.0%). These small
differences do not establish a speed improvement. The general physics workload
had an unchanged checksum and -0.3% aggregate median time, also within noise.
The permanent `make profile-performance` and browser benchmarks now include
held-flipper states at their standard 60 Hz step for future comparisons.

Classic's 76-run seeded playtest completed with no escape/nonfinite flags and
0.02 seconds maximum unexplained near-rest. Its 24 speed-above-4000 flags remain
diagnostics; maximum speed was 4215.4 units/second. This sampled report does not
establish that every trajectory is catchable or every shot easy.
