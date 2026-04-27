# Slingshot And Lower-Lane Layout Specification

This document defines the current slingshot component and the DSL patterns used
to build lower inlane / outlane areas without falling back to passive rubber
guide hacks.

## Goals

- model lower slings as active kick devices, not just diagonal rubber rails
- keep lower-lane geometry tied to flipper-relative anchors
- make common lower-third layouts reusable for future DSL-authored tables
- keep the runtime/editor board model explicit enough that tables can still be
  fine-tuned by hand after compilation

## Slingshot Component

Runtime slingshots are first-class board elements with:

- `x`, `y`: center position
- `width`: rubber face length
- `height`: body depth
- `angle`: rubber face orientation
- `score`: points awarded on hit
- `strength`: kick speed added along the contact normal
- `material`: impact material, normally `rubberPost`

The current physics model treats the slingshot as:

1. an oriented rubber contact face
2. normal collision resolution using the surface material
3. a one-shot kick impulse when the ball arrives with enough inward speed
4. a short re-arm cooldown
5. a compression animation for rendering/editor feedback

For lower-playfield tables, the rendered slingshot body is oriented toward the
nearest flipper tip so mirrored left/right slings visually point into the
flipper area instead of drawing the same wedge handedness on both sides.

The renderer now draws the slingshot as:

- a triangular body behind the active face
- a distinct front rubber face
- small end-post cues at the face endpoints

This keeps the collision model simple while making the lower third read much
closer to a real table sling assembly.

This is still a 2D approximation, but it is materially more accurate than the
previous approach where a slingshot region was just another diagonal guide.

## DSL Primitives

The lower playfield can be built from two separate primitives:

- `createInlaneOutlanePair(...)`
- `createSlingshotPair(...)`

`createInlaneOutlanePair(...)` is responsible for:

- playfield-level lane mouths
- optional segmented lower return rails
- raised outer return rail
- raised inner divider rail
- optional sling-approach rubber guide
- optional entry posts

It should not be relied on to create the active slingshot itself.

When a lane helper uses `outerGuideBreakOffset` or `innerGuideBreakOffset`, the
primitive emits:

- an upper `playfield` mouth guide from the start offset to the break offset
- a lower return guide from the break offset to the end offset

This makes it possible to author canonical inlane / outlane mouths without
giving up the raised lower return rails that need to visually cross the flipper
area.

`createSlingshotPair(...)` is responsible for:

- left and right slingshot placement
- shared geometry defaults
- score and kick strength defaults
- mirrored lower-playfield slings aligned to the flipper area

For full lower-third packages, prefer `createLowerPlayfieldPair(...)`. It
composes:

- left and right inlane / outlane geometry
- active left and right slingshots
- the lower flipper pair

The helper returns a layout fragment containing `guides`, `posts`,
`slingshots`, and `flippers`. Tables still spread those arrays into the normal
flat `BoardLayoutDefinition` fields, so the compiler, runtime board model, and
editor continue to work with explicit board elements.

## Authoring Guidance

For DSL-authored solid-state and EM-style tables:

- build the return rails and lane dividers with `createInlaneOutlanePair(...)`
- prefer segmented lane mouths over one long raised guide when the table needs
  a readable inlane / outlane package
- use the optional sling-approach rubber guide to visually tie the lane mouth
  into the active sling body
- build the active lower slings with `createSlingshotPair(...)`
- use `createLowerPlayfieldPair(...)` when the lanes, active slings, and
  lower flippers are meant to move as one reusable lower-third pattern
- keep the slingshot faces clear of raised rails and flipper keepout zones
- prefer flipper-relative anchor offsets over hardcoded absolute lower-third
  coordinates

## Validation Expectations

The current validation layer does not yet prove perfect lower-playfield
playability, but lower-third layouts should at minimum satisfy:

- no guide blocks the flipper keepout zone at playfield level
- no major feature overlaps a slingshot body
- lower return rails intended to cross above the flippers should be marked
  `plane: 'raised'`

Future validation should extend this with explicit lower shot-corridor checks.
