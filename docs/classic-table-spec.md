# Classic Table

Classic is a two-flipper table organized around physical ball routes. Its
layout lives in `src/boards/tables/classic-table.ts`; other built-in tables
continue to use their existing layouts.

## Lower playfield

The usable lower playfield runs between the left boundary and the persistent
inner shooter wall. Flipper pivots are symmetric about x=404. Each side has
an outlane, an inlane, and a slingshot. The inlane walls use tangent circular
returns above the flipper heels. Every return guide collides at playfield
height; there are no raised rails masquerading as ball guides.

Balls entering the inlanes at x=120 or x=688, y=930 must reach their own
flipper. Tests cover horizontal entry velocities -40, 0, and 40 and downward
velocities 0, 250, and 500. Outlane entries must drain without crossing either
flipper. These tests check ball paths, not just component counts.

## Launch and upper playfield

The shooter is centered at x=824. Its walls continue into concentric arcs
which turn the launch toward the open entrances of three top rollover lanes.
A left lane wall meets the arch, directing plunges down through the lane area
instead of allowing them to bypass it down the left perimeter. Three compact
pop bumpers sit beneath those lanes.

Classic opts into `plunger.returnGate`, a segment across the arch exit.
The segment normal `(dy, -dx)` points into live play. The gate remains open
until the whole ball passes onto that side, then closes behind the ball.
Shooter walls remain solid throughout play. The renderer shows the gate leaf
open or closed using the same endpoints as collision handling.

A weak plunge that never crosses the gate can fall back onto the plunger.
Once it settles, the game re-seats the same ball in `waiting-launch`, without
a drain event, ball-count change, or rules reset. It can then be pulled again.
Tables without a return gate retain their existing launcher behavior.

## Scoring shots

- The left spinner sits in a guide-bounded orbit with an open upper exit.
  An upward pass must reach the upper playfield after spinning the blade.
- Three standups and a drop target form an angled bank in the left middle
  playfield. Their broad faces point toward the lower shooting area; a
  parallel backing rail frames the bank. The central/right approach remains
  open to the upper objectives.
- The upper-right saucer has a rounded pocket and flared mouth. Its kickout
  runs down and slightly left through that mouth, toward the lower playfield.
  Capture and return are checked across several approach velocities.

Rules remain three balls, feature scoring, bonus, top-lane completion, and
bonus multipliers. The standup count changes from six isolated targets to
three targets in one bank; the drop target remains the multiplier objective.

## Precision and physics

Classic compiles with `snapToGrid: false`. A 40-unit grid is larger than the
32-unit ball diameter, so rounding individual joints can break lane widths,
arc tangency, or flipper clearances. Coordinates and gate endpoints retain
their authored precision.

Both game and sandbox collision stepping limit linear travel to one ball
radius per substep, with the existing 1/120-second maximum. This prevents
fast plunges from crossing a thin rail's centerline between samples and
being resolved onto its far side. This shared solver correction also applies
to other tables; it does not change their authored geometry.

## Verification

Run `make test`, `make build`, `make lint`, and
`make validate-table TABLE='--all --deep-playability'` after changes.
Classic must have no layout, geometry, or deep-playability diagnostics.
Tests additionally cover plunge-to-rollover feeds, inlane and outlane routes,
direct flipper shots at the target bank and saucer, spinner continuation,
saucer kickout clearance, and the gate's outbound, return, and re-plunge paths.
Review the actual table in the browser as well: validation alone does not
establish shot quality or difficulty balance.
