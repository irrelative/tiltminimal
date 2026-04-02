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

This is still a 2D approximation, but it is materially more accurate than the
previous approach where a slingshot region was just another diagonal guide.

## DSL Primitives

The lower playfield is now intended to be built from two separate primitives:

- `createInlaneOutlanePair(...)`
- `createSlingshotPair(...)`

`createInlaneOutlanePair(...)` is responsible for:

- raised outer return rail
- raised inner divider rail
- optional entry posts

It should not be relied on to create the active slingshot itself.

`createSlingshotPair(...)` is responsible for:

- left and right slingshot placement
- shared geometry defaults
- score and kick strength defaults
- mirrored lower-playfield slings aligned to the flipper area

## Authoring Guidance

For DSL-authored solid-state and EM-style tables:

- build the return rails and lane dividers with `createInlaneOutlanePair(...)`
- build the active lower slings with `createSlingshotPair(...)`
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
