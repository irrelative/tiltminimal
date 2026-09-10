# Mirror Match Specification

Mirror Match is a three-ball solid-state table centered on paired left/right
shots and matching target-bank objectives.

## Layout

The 1000 × 1400 cabinet shares the assembly foundation described in
[board-assemblies.md](board-assemblies.md). Main shot devices mirror around
x=450; the separate right shooter lane is intentionally asymmetric.

- Two lower flippers receive balls from solid concentric return rails. Four
  entry posts distinguish inlanes from outlanes; slings leave the feeds clear.
- Two side-orbit spinners lead upward around the pop-bumper triangle.
- Two banks of three standups sit below the centered saucer mouth. Their
  backings leave an open center return instead of forming a closed V.
- The saucer captures through an open lower mouth and ejects downward into
  live play. The pocket ends above the target-bank constriction.
- A gated shooter arch feeds three open rollover lanes. Weak launches can
  reseat; useful charges enter play and cannot fall back into the shooter lane.

## Rules

Completing both three-target banks lights the center saucer. A lit capture
adds 7000 to its 3000 base award and advances the multiplier. Top lanes,
bumpers, spinners, and slings add score and bonus. Three-ball lifecycle,
bank indices, and end-of-ball bonus counting remain unchanged.

## Validation

Tests verify device symmetry, scoring, launches, every assembly route, and
zero layout/geometry/deep-playability diagnostics. Rails use precise
coordinates without grid snapping; no decorative raised rail substitutes for
a collision surface. Shared physics tests cover held-flipper cradle retention.

## Post passes

Lower sling posts now meet the inner return exits. Rounded passive rubber and
connected solid bodies support left-to-right and right-to-left post passes.
Returns use 148-unit outer radius, 72-unit lane width, and 174-unit bend rise.
Existing feeds, drains, and scoring routes remain required; see
[post-pass geometry and regression contracts](post-pass-spec.md).
