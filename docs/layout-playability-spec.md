# Layout Playability Specification

This document defines the current behavior expectations for DSL-authored table
layouts that rely on the higher-level playability helpers.

## Scope

The goal is to prevent a class of layout bugs where a table compiles cleanly
but still fails basic playability:

- the plunge path is blocked
- the shooter lane exits into a wall
- top rollover lanes are sealed off by continuous guide geometry
- playfield guides intrude into flipper swing and feed space
- guide geometry occupies a spinner's rotation envelope
- important geometry shifts under grid snapping and collapses onto the ball path

## Shooter Lane Primitive

`createShooterLaneRight(...)` is the canonical helper for a right-side launcher
feed.

It is responsible for:

- setting the launcher `launchPosition`
- setting the launcher `plunger` overrides used by runtime plunger geometry
- generating upper continuation guides that feed the shooter lane into the
  upper playfield

Behavior requirements:

- the launch position must remain centered inside the plunger lane
- the post-lane exit path above the plunger guides must stay open
- generated geometry must remain valid after grid snapping
- table-specific plunger tuning may be overridden when a layout needs a harder
  full plunge

## Lower Inlane/Outlane Primitive

`createInlaneOutlanePair(...)` is the canonical helper for the lower-lane
package around a flipper.

It is responsible for bundling:

- the outer return/outlane rail
- the inner inlane divider rail
- the sling-style guide leading into the flipper
- optional entry posts near the lane mouth

Behavior requirements:

- return rails that visually pass over the flipper area should be marked
  `plane: 'raised'`
- sling guides that represent playfield-level rubber or wood should remain
  `plane: 'playfield'`
- the packaged geometry should stay anchored relative to the flipper pivot so
  lane spacing survives board edits more reliably than hand-placed guide lines

## Guide Planes

Guides can now be authored on two visual/playability planes:

- `playfield`: normal guide geometry that participates in flipper keepout
  validation
- `raised`: guide geometry intended to represent elevated rails or returns;
  these render above flippers and are exempt from flipper keepout validation

This is still a 2D physics model. `raised` changes validation and rendering, not
full 3D collision behavior.

## Top Arch Primitive

`createTopArchLanes(...)` is the canonical helper for a top rollover bank.

It is responsible for:

- generating evenly spaced rollover positions
- generating a roof and separator structure for the lane bank
- leaving open lane mouths below the rollovers so the bank can be entered from
  live play

Behavior requirements:

- each top rollover lane must have at least one open approach from below
- lane separators should divide adjacent lanes without sealing the whole bank
- outer shoulders should connect naturally to orbit or shooter-lane feed guides

## Validation Guarantees

`validateCompiledBoardLayout(...)` currently enforces:

- launcher remains on the right half of the table
- flipper pivots stay within bounds
- major features do not obviously overlap
- major circular features do not extend past the board edge
- no custom guide geometry blocks the shooter-lane exit corridor
- each top rollover near the upper playfield has at least one clear approach
  path from below
- no playfield-level guide intrudes into a flipper swing/feed keepout zone
- no guide intrudes into a spinner's rotation envelope

These checks are geometric heuristics. They do not replace shot simulation, but
they are intended to fail fast on layouts that are visibly unplayable.

Separate from this compile-time validation, the `/editor` route also exposes an
analysis panel that can run advisory checks against built-in or custom boards.
That editor analysis currently covers:

- overlapping elements
- out-of-bounds geometry
- shooter lane obstruction
- flipper keepout violations
- spinner envelope obstruction
- saucer eject obstruction
- basic rules-event coverage heuristics

## Grid-Snapping Rule

Built-in tables are snapped to the editor grid after compilation. Any primitive
used for built-in tables should therefore be authored so its critical guide
positions remain valid after snapping.

This means:

- keep launcher-center geometry aligned to the grid when possible
- avoid placing inner shooter guides so close to the launch centerline that
  snapping can collapse them into the ball path
- verify approach lanes survive snapped coordinates, not only authored ones

## Current Reference Table

`Starlight EM` is the reference layout for this behavior. It uses the shooter
lane, top arch, and lower-lane primitives and is covered by tests that require:

- no `launcher-blocked` validation error
- no `rollover-unreachable` validation error
- no `flipper-keepout` validation error
- no `spinner-obstructed` validation error
- a full plunge that reaches the upper playfield
