# Double Crossed Specification

`Double Crossed` is an original built-in table authored as a single self-contained
layout-and-rules module.

## Design Goals

- keep the playfield symmetric and readable
- support a clean three-ball rule set
- emphasize two mirrored spinner shots and crossed target banks
- use the layout DSL and built-in validator so the shipped table remains
  authorable and machine-checkable

## Layout

The table is defined in `src/boards/tables/double-crossed.ts`.

Major features:

- 2 lower flippers
- 3 upper pop bumpers in a triangle
- 2 mirrored spinner shots
- 4 top rollover lanes
- 4 standup targets arranged as two inward-leaning cross banks
- 2 center drop targets
- 2 lower slingshots
- right shooter lane with a full plunge into the upper field
- standard inlane / outlane returns built from the DSL lane helpers

The table intentionally stays lighter than the more toy-heavy built-ins. It is
meant to play like a straightforward original solid-state game where repeated
lane completion and spinner feeding matter more than deep staged modes.

## Rules

The rules stay intentionally simple:

- 3 balls per game
- bumpers score and add a small amount of bonus
- slingshots score and add a small amount of bonus
- top rollovers score, build bonus, and completing all 4 lanes lights the
  spinners while stepping the bonus multiplier
- each 2-target standup bank scores and lights the spinners when completed
- the 2-drop center bank awards a larger score, more bonus, and a bonus
  multiplier step when completed
- lit spinners score double
- end of ball awards `bonus * bonusMultiplier`

## Validation Expectations

`Double Crossed` should remain valid under the current automated table checks.

The required bar is:

- layout validation from `src/boards/layout-validation.ts`
- rules coverage for the devices it ships with

The editor-style analysis warnings from the validation CLI are still heuristic.
They should stay reviewable and should not indicate blocked launch geometry,
unreachable top lanes, or missing rules coverage.

In practice, the shipped built-in should keep:

- an open shooter lane
- reachable top lanes
- clear spinner rotation envelopes
- no obvious major element overlaps
- rules coverage for every interactive device currently on the table
