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

The existing rule script and target indices are preserved:

- Three balls per game; end-of-ball award is bonus × multiplier.
- Bumpers and slings score and add bonus.
- Completing all four top lanes lights the spinners and increases multiplier.
- Completing either two-standup bank lights the spinners.
- Completing both drop targets awards score, bonus, and a multiplier increase.
- Lit spinners score double.

## Validation

The table must compile cleanly and pass geometry analysis, declared scoring
and return routes, and the deep dropped-ball sweep without diagnostics.
Scoring tests cover the retained lane and spinner rules. Route tests exercise
multiple plunge powers, target approach speeds, and inlane feed velocities.

## Post passes

Lower sling posts now meet the inner return exits. Rounded passive rubber and
connected solid bodies support left-to-right and right-to-left post passes.
Returns use 148-unit outer radius, 72-unit lane width, and 174-unit bend rise.
Existing feeds, drains, and scoring routes remain required; see
[post-pass geometry and regression contracts](post-pass-spec.md).
