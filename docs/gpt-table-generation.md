# GPT Table Generation

This document defines the required workflow for agent-generated built-in tables.
The goal is to make generated layouts look like recognizable pinball tables
rather than collections of independent toys on a rectangle.

## Required Workflow

Start with a `BoardLayoutDefinition` that uses the
`solid-state-two-flipper` template. That template provides canonical anatomy
anchors for the lower playfield, shooter lane, top arch, target banks, pop
cluster, and main shot zones.

Use semantic primitives for the table's repeated anatomy:

- `createShooterLaneRight(...)` for the right shooter lane and upper feed
- `createStandardLowerPlayfieldPair(...)` for the canonical lower third
- `createTopArchLanes(...)` for top rollover lanes and separators
- `createPopBumperCluster(...)` for a three-pop bumper group
- `createMirroredTargetBank(...)` for balanced target banks
- `createOrbitLanePair(...)` for left/right orbit guide structures

Use raw guide lines only for table-specific shot shaping that is not covered by
a primitive. Do not hand-place the lower third, shooter lane, top arch, or
target banks from raw coordinates unless a table intentionally breaks the
canonical pattern.

## Anatomy Rules

Every normal two-flipper table should have:

- two lower flippers with a drain gap between them
- active slingshots above the flippers
- inlane and outlane mouths feeding the lower third
- a right-side shooter lane that feeds the upper playfield
- a top arch or rollover area in the upper third
- mid-playfield shots such as target banks, spinners, saucers, or pop bumpers

Keep toys connected to plausible ball paths. Avoid isolated bumpers, targets,
or saucers that float without nearby guides, lane feeds, or shot entrances.

## Validation Expectations

Generated tables should compile with `compileBuiltInBoardLayout(...)` and pass
both layout validation and geometry analysis. At minimum, check for:

- no blocked shooter lane
- full plunges leave the shooter lane horizontally and enter live play
- no unreachable top rollovers
- no flipper keepout errors
- no obstructed spinner envelopes
- no saucer eject obstruction
- no geometry analysis warnings

`Classic Table` and `Starlight EM` are the reference examples for this workflow.
