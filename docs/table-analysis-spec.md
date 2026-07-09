# Table Analysis Specification

This document defines the current table analysis workflow.

## Goal

Table analysis is intended to catch potentially problematic geometry before a
table is play-tested or shipped as a built-in board.

The current implementation focuses on pragmatic authoring-time warnings for
geometry and rule coverage issues that commonly make a table frustrating or
obviously broken.

## CLI Workflow

The analysis runs from the validation CLI against code-authored built-in boards.
It is advisory by default and reports warnings alongside hard layout errors.

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
- `ball-trap-risk`
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

The overlap pass also ignores a few intentional playfield authoring patterns:

- guide-to-guide joins and connected rail chains
- saucers sitting inside guide-defined pocket lips
- guide endpoints that intentionally terminate at a post
- rubber sling-approach guides that intentionally meet a slingshot body

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

### Passive trap risk

The analyzer now also looks for pockets where a passively moving ball can
settle and fail to drain.

This pass is intentionally simulation-based rather than pure geometry:

- the analyzer seeds stationary balls on a coarse lower/mid playfield grid
- each candidate point is skipped if it already lies inside authored geometry,
  the plunger lane, or a saucer cup
- each remaining seed runs through a short no-input physics simulation
- if the ball neither drains nor meaningfully escapes its local area, the
  analyzer emits `ball-trap-risk`

This is still heuristic, but it catches real dead pockets that are difficult to
identify from overlap checks alone.

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

New checks should continue to reuse the same warning model so CLI output remains
a single place to review issues.

## Playability Simulation

The CLI also runs `analyzePlayability(...)` from
`src/validation/table-playability.ts`.
and focuses on dynamic scenarios that static geometry cannot prove:

- multiple plunger strengths must enter live play instead of staying in the
  shooter lane
- seeded dropped balls should drain, remain active, rest near a flipper, or
  enter intentional captures
- passive traps and narrow lane livelocks are reported as playability warnings

Normal mode keeps sampling coarse enough for routine validation. The CLI's
`--deep-playability` mode uses denser dropped-ball sampling for manual table
authoring review.
