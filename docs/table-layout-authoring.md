# Table Layout Authoring

This project now supports a higher-level layout authoring layer for built-in
tables and future agent-generated tables.

## Why This Exists

Raw `BoardDefinition` JSON is still the runtime format, but it is awkward for
agents to author directly because every element needs final coordinates and
guide geometry.

The layout layer solves that by adding:

- named anchors
- template anchors
- reusable layout primitives
- a compiler that produces ordinary `BoardDefinition`
- validation diagnostics for obviously bad layouts

## Core Files

- `src/boards/layout-schema.ts`: high-level layout types
- `src/boards/layout-templates.ts`: template-provided anchors
- `src/boards/layout-anchors.ts`: anchor resolution
- `src/boards/layout-primitives.ts`: reusable helpers like flipper pairs and pop clusters
- `src/boards/layout-compiler.ts`: compiles a layout into a board definition
- `src/boards/layout-validation.ts`: validates the compiled board

## Authoring Model

A layout definition uses `LayoutPoint` values instead of only final `x/y`
coordinates.

Supported point forms:

- absolute point: `{ x: 450, y: 760 }`
- percent point: `{ kind: 'percent', x: 0.5, y: 0.3 }`
- anchor point: `{ kind: 'anchor', anchor: 'playfield-center', offset: { x: 0, y: -120 } }`

This lets a layout refer to stable structure instead of guessing every pixel.

## Templates

Templates provide a starting set of anchors. The first built-in template is:

- `solid-state-two-flipper`

It adds anchors such as:

- `playfield-center`
- `left-flipper-pivot`
- `right-flipper-pivot`
- `shooter-lane-center`

Layouts can add their own anchors on top of those.

## Primitives

The primitive helpers are intended to reduce repetitive table construction.

Current helpers include:

- `createFlipperPair(...)`
- `createPopTriangle(...)`
- `createMirroredRollovers(...)`
- `createMirroredStandupTargets(...)`
- `createShooterLaneRight(...)`
- `createTopArchLanes(...)`
- `createInlaneOutlanePair(...)`
- `createSlingshotPair(...)`

These return high-level layout objects, not runtime board data.

Lower-playfield authoring is now intentionally split:

- `createInlaneOutlanePair(...)` builds the raised return rails, divider rails,
  and lane-entry posts
- `createSlingshotPair(...)` builds the active lower slings as first-class
  devices with kick behavior

Guides can also now declare a `plane`:

- `playfield`: standard guide geometry, validated against flipper keepouts
- `raised`: return-rail style geometry rendered above flippers and exempt from
  flipper keepout validation

## Compiler Flow

`compileBoardLayout(...)` performs these steps:

1. resolve template and custom anchors
2. resolve all `LayoutPoint` values into concrete positions
3. build a `BoardDefinitionInput`
4. create a runtime `BoardDefinition`
5. optionally snap the result to the editor grid
6. run layout validation

Built-in tables should generally use `compileBuiltInBoardLayout(...)`, which
throws if validation returns any errors.

## Validation

The current validation pass checks for:

- launcher on the wrong side of the table
- flippers outside the board
- flippers too near the drain
- overlapping major features
- features extending past the playfield edge
- custom guide geometry blocking the shooter-lane exit path
- top rollover lanes with no open approach corridor from below
- playfield-level guides intruding into a flipper's swing and feed keepout
- slingshots and other major features overlapping in invalid ways

This is still a heuristic layer, not a full playability proof, but it now aims
to reject the most common "looks plausible but does not actually play" failures
that showed up in DSL-authored tables.

## Current Scope

The classic table now compiles through this layout system. That proves the
compiler and primitives are real, but the editor still works against the
resolved runtime board format.

The next logical steps are:

- add more canonical primitives such as lower-lane packages, target banks, and orbit families
- grow validation from geometric heuristics into shot simulation acceptance checks
- compile more built-in tables through the layout layer
- expose a layout-source view alongside the raw board JSON export
