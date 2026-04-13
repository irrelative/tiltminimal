# Table Analysis Specification

This document defines the current editor-side table analysis workflow.

## Goal

Table analysis is intended to catch potentially problematic geometry before a
table is play-tested or shipped as a built-in board.

The current implementation focuses on pragmatic editor-time warnings for
geometry and rule coverage issues that commonly make a table frustrating or
obviously broken.

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
- `element-out-of-bounds`
- `launcher-blocked`
- `flipper-keepout`
- `spinner-obstructed`
- `saucer-eject-obstructed`
- `rules-event-unhandled`

## Implemented Checks

### Overlap detection

The current overlap analysis checks for potential overlap between playfield
elements by approximating each element as one or more sample circles and then
looking for circle-circle penetration beyond a small threshold.

This is intentionally conservative. It is designed to identify likely layout
mistakes, not to act as an exact constructive-geometry solver.

### Covered elements

The initial pass analyzes:

- the plunger lane body
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

The overlap pass also ignores two intentional playfield authoring patterns:

- guide-to-guide joins and connected rail chains
- saucers sitting inside guide-defined pocket lips

Those combinations are common in authored tables and were producing noisy
warnings that did not correspond to actionable defects.

### Out-of-bounds geometry

The analyzer warns when an element's sampled geometry extends beyond the table
bounds.

This is advisory rather than fatal because authors may still be in the middle
of dragging a part back into place.

### Shooter lane obstruction

The analyzer checks the initial launch corridor above the plunger lane and warns
if sampled playfield geometry blocks the ball's centerline path out of the
shooter lane.

Separately from the centerline launch-path check, the overlap pass also treats
the plunger lane body as its own sampled geometry. That means posts, targets,
guides, or other devices placed inside the shooter lane will now surface as
regular `element-overlap` warnings against `Plunger Lane`.

This plunger-lane intrusion check is stricter than the general overlap pass:
raised guides are still excluded from ordinary overlap noise, but they are
explicitly checked against the shooter lane because a rail that crosses the
lane body is still a launcher-layout defect.

### Flipper keepout

The analyzer warns when guides, posts, targets, or slingshot geometry intrude
into a flipper's sweep/feed area.

This is a geometric heuristic based on sampled distance to the flipper across
its motion range.

### Spinner envelope obstruction

The analyzer warns when nearby guide or post geometry intrudes into the
rotational envelope of a spinner.

### Saucer eject obstruction

The analyzer traces the early segment of each saucer eject path and warns when
it appears to immediately feed into other playfield geometry.

### Rules coverage

The analyzer warns when the table contains event-producing devices but the rules
script does not appear to reference their event types.

This check is intentionally heuristic:

- explicit references to event names count as handled
- scripts using the default-style generic `score` handling are treated as
  broadly score-aware
- the warning is advisory and does not attempt full script understanding

## Thresholding

The overlap pass uses a small minimum penetration threshold rather than
issuing a warning on every exact tangent or visually insignificant near-touch.

This reduces false positives where two elements are merely close or intended to
kiss at a boundary.

## Intended Expansion

This analysis system is expected to grow further, for example into:

- unreachable lanes
- drain harshness / lower-third flow checks
- trapped-ball or livelock pocket detection
- more exact rules-to-device consistency checks

New checks should continue to reuse the same editor-facing warning model so the
analysis panel remains a single place to review issues.
