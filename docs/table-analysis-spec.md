# Table Analysis Specification

This document defines the current editor-side table analysis workflow.

## Goal

Table analysis is intended to catch potentially problematic geometry before a
table is play-tested or shipped as a built-in board.

The first implemented check is overlap detection.

## Editor Workflow

The analysis UI lives on the `/editor` route in its own `Analysis` panel.

Current behavior:

- the user clicks `Analyze table`
- the editor runs the analysis pass against the active board
- the editor shows a list of warnings
- after analysis has been run once, subsequent board edits automatically update
  the warning list because the panel re-analyzes the current board on render

The analysis panel is advisory only. It does not block saving, exporting, or
play testing.

## Warning Shape

Each analysis result is currently a warning with:

- a machine-readable code
- human-readable message text
- references to the overlapping elements

Current warning code:

- `element-overlap`

## Initial Overlap Check

The current overlap analysis checks for potential overlap between playfield
elements by approximating each element as one or more sample circles and then
looking for circle-circle penetration beyond a small threshold.

This is intentionally conservative. It is designed to identify likely layout
mistakes, not to act as an exact constructive-geometry solver.

### Covered elements

The initial pass analyzes:

- bumpers
- posts
- saucers
- rollovers
- standup targets
- drop targets
- spinners
- slingshots
- flippers
- playfield-level guides

### Exclusions

Raised guides are excluded from overlap warnings in the initial pass.

Reason:

- raised rails are often intentionally authored over lower playfield geometry
- flagging those as overlaps would produce noisy warnings for valid return-lane
  and overpass style geometry

## Thresholding

The overlap pass uses a small minimum penetration threshold rather than
issuing a warning on every exact tangent or visually insignificant near-touch.

This reduces false positives where two elements are merely close or intended to
kiss at a boundary.

## Intended Expansion

This analysis system is expected to grow to cover more checks over time, such
as:

- unreachable lanes
- blocked plunge paths
- out-of-bounds geometry
- flipper keepout violations
- suspicious saucer or spinner placement

Those checks should reuse the same editor-facing warning model so the analysis
panel remains a single place to review issues.
