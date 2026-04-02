# Starlight EM Specification

`Starlight EM` is an original built-in table intended to evoke late-1960s to
1970s electromechanical pinball rather than a solid-state or modern rules-heavy
machine.

## Design Goals

- keep the playfield readable and symmetric
- favor simple repeatable scoring over mode stacking
- emphasize lanes, spinners, standup banks, pops, and a single saucer
- use a five-ball rule set with straightforward end-of-ball bonus counting

## Layout

The table is authored through the layout DSL, not raw resolved board geometry.

Major features:

- 2 lower flippers
- 3 pop bumpers in an upper-center triangle
- 2 spinners
- 1 upper-right saucer
- 2 lower slingshots
- 6 standup targets in mirrored left/right banks of 3
- 4 top rollover lanes
- 1 center post and additional lane posts
- classic inlane / outlane lower guides
- a right shooter lane that full-plunges into the upper field
- a 4-lane top arch with open entries rather than sealed rollover circles
- lower inlane/outlane packages built relative to the flipper pivots
- active lower slings generated separately from the lane rails so the lower
  third behaves like a real EM/solid-state slingshot area instead of a passive
  rubber guide
- metal triangle rails above each sling so the lower inlane flow forms the
  classic triangular pocket around the slingshot face rather than leaving the
  sling isolated under the return rails
- raised lower return rails so the return hardware can visually cross the
  flipper region without being modeled as a flat playfield blocker
- upper left and upper right lane loops feeding back to the pops and saucer
- spinner lanes that leave visible clearance around the spinner rotation
  envelope rather than running a continuous guide through the spinner sweep

## Rules

The rules are intentionally EM-simple:

- 5 balls per game
- pop bumpers score and add a small amount of bonus
- spinners score per spin and add small bonus
- standup targets score and build bonus
- completing either 3-target bank awards a larger score, bonus, and bonus multiplier step
- completing all 4 top lanes awards a larger score and bonus multiplier step
- the saucer awards a larger value and bonus multiplier step
- drain awards `bonus * bonusMultiplier`
- no timed modes, multiball, locks, or persistent modern feature ladders

## Table Feel

This table should feel closer to a reel-score electromechanical game:

- more about repeating dependable shots
- less about stacked features or toy interactions
- a ruleset that can be understood from basic inserts and lane completion

## Implementation Notes

- Source layout: `src/boards/starlight-em-layout.ts`
- Compiled built-in board: `src/boards/starlight-em-table.ts`
- Rules script: `src/boards/starlight-em-rules-script.ts`
- Registered in: `src/boards/table-library.ts`
- The layout now uses `createShooterLaneRight(...)`,
  `createTopArchLanes(...)`, `createInlaneOutlanePair(...)`, and
  `createSlingshotPair(...)`, plus `createSlingshotTriangleGuides(...)`, so the
  launcher feed, top rollover bank, lower lanes, lower slings, and triangular
  sling closure rails are generated from semantic primitives rather than
  hand-placed guide fragments.
