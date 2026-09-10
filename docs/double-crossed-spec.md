# Double Crossed Specification

Double Crossed is an original three-ball table emphasizing paired spinner
orbits and two inward-leaning target banks.

## Layout

The 1000 × 1400 cabinet uses the shared assembly foundation in
[board-assemblies.md](board-assemblies.md): gated shooter arch, four open top
lanes, two lower flippers, active slings, and curved inlane returns.

Three pop bumpers occupy the upper center. Left and right spinner corridors
continue into the upper field. Each bank contains two standups followed by a
drop target. The angled backings stop well apart, preserving a ball-width
center return. A center rubber post above the slings adds a rebound risk.

The shooter has persistent walls and a one-way return gate. Lower inlanes feed
their respective flippers; separate outlanes run outside those returns to the
drain. Geometry stays at authored precision rather than snapping joints to a
coarse grid. All visible guide rails are physical playfield rails.

## Rules

Base awards and target indices remain intact, with Cross Lock layered over them:

- Three balls per game; end-of-ball award is bonus × multiplier.
- Bumpers and slings score and add bonus.
- Completing all four top lanes lights the spinners and increases multiplier.
- Completing either two-standup bank lights the spinners.
- Completing both drop targets awards score, bonus, and a multiplier increase.
- Lit spinners score double.

## Cross Lock and two-ball multiball

Complete both two-standup CROSS banks to light lock. Their completion lamps latch
independently of the resetting target masks. The central saucer scores 1,000
unlit; when qualified it scores 5,000 and physically stores one ball. Plunging
the replacement releases that ball immediately, without consuming another turn,
resetting bonus or advancing the ball number.

During multiball, spin each different spinner to light Cross Jackpot at the
saucer. Collections award 10,000, 15,000, then 20,000 maximum. Each collection
clears the two spinner qualification lamps. Unqualified captures score 1,000 and
eject; no ball can be relocked during multiball. Repeated spins on one side do
not qualify the other. Bank hits during multiball still award normal points but
do not prequalify the next lock.

At one ball remaining, clear multiball, jackpot progress and both CROSS bank
masks/completion lamps. The same ball continues and can requalify lock. Only the
last live ball's drain collects bonus and advances the turn. New balls and resets
clear lock qualification. There is no timed ball save or additional release shot.

The connected pocket is centered at (450, 560), with a 28-unit cup, 48-unit outer
wall radius, 35-unit throat, and a 100-unit-deep mouth with 60-unit half-width.
Its 640-unit/s eject points at 1.4 radians, slightly right of vertical. The
capture/return contract checks three approach velocities and exit through the
region x=410–520, y=700–840. The first proposed lower/larger pocket trapped drops
beside the bank; the compact upper placement clears the deep sweep. The central
rebound post stays in place. Normal cradle release/flip sequences on both sides
reach the cup at neighboring timings (92/93 frames at 120 Hz); these are sampled
opportunities, not guaranteed shots from arbitrary feeds.

Playfield inserts show bank completion, spinner qualification, current saucer
award and next-shot instructions. The locked ball stays visible while the
replacement waits in the shooter. Canvas top text remains score and ball number.

## Validation

The table must compile cleanly and pass geometry analysis, declared scoring
and return routes, and the deep dropped-ball sweep without diagnostics.
Scoring tests cover lock qualification, repeated switches, actual capture and
replacement plunges, capped/repeat jackpots, one-ball and simultaneous drains,
last-ball multiball, resets, and the weak replacement-plunge case. Route tests exercise
multiple plunge powers, target approach speeds, and inlane feed velocities.

## Post passes

Lower sling posts now meet the inner return exits. Rounded passive rubber and
connected solid bodies support left-to-right and right-to-left post passes.
Returns use 148-unit outer radius, 72-unit lane width, and 174-unit bend rise.
A connected inner-guide extension places each lower post 30 units outside
and 80 above its flipper pivot. The active faces are 60° from horizontal;
both directions support 50–75 ms release/re-flip regression samples.
Existing feeds, drains, and scoring routes remain required; see
[post-pass geometry and regression contracts](post-pass-spec.md).


The shared solver only re-seats a weak plunge into waiting-launch when one ball
remains. With two balls it keeps simulating both and allows the shooter ball to
be replunged. This prevents a short replacement plunge freezing live multiball;
normal single-ball weak-plunge behavior is preserved.

Cross Lock validation: 374 tests pass, including 12 focused multiball tests;
production build and lint pass. All five tables pass deep validation with zero
errors or warnings. Browser review checked the normal table labels and a temporary
replay harness: physical cup capture, visible locked ball/replacement serve,
plunge-triggered two-ball release on ball 1, lit jackpot inserts and physical
10,000-point jackpot collection. The harness seeded qualification switches and
was removed after review; it is not part of the game.
