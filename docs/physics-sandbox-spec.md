# Physics Sandbox Spec

This document defines the dedicated physics sandbox route and the expected
behavior of its runtime, UI, and integration points.

## Route And Scope

The physics sandbox lives at `/physics`.

It is a developer-facing route that reuses the normal table renderer and
physics stepping, but it does not participate in the normal gameplay lifecycle.

The sandbox intentionally bypasses:

- score accumulation
- rules script progression
- balls-per-game tracking
- waiting-launch state
- automatic next-ball handling after a drain

The sandbox still uses the same:

- board geometry
- flipper motion
- nudge motion
- materials
- collision response
- plunger and shooter-lane geometry

## Board Selection

The route uses the same table-selection model as the play route.

Available boards include:

- built-in tables
- locally edited or custom tables loaded from storage

Changing the selected board resets the sandbox session for that board.

## Spawn Model

The sandbox owns the current spawn configuration:

- `vx`
- `vy`
- `wx`
- `wy`
- spawn mode: `replace` or `add`

All four numeric inputs use raw engine units:

- linear velocity is in board units per second
- spin uses the current 2-axis rolling-spin units used by the ball model

Default values:

- `vx = 0`
- `vy = 0`
- `wx = 0`
- `wy = 0`
- spawn mode defaults to `replace`

Clicking the playfield attempts to spawn a ball at the clicked board-space
coordinate.

### Replace mode

- clears existing sandbox balls
- spawns one new ball with the configured vectors

### Add mode

- preserves existing sandbox balls
- appends one additional sandbox ball

Sandbox multi-ball is scoped to this route only. It does not imply normal
gameplay multi-ball support elsewhere in the engine.

## Spawn Rejection

The sandbox must reject invalid spawn points explicitly. It must not silently
adjust the clicked point.

A spawn is blocked when the clicked point would place the ball:

- outside the playable table bounds
- inside the plunger lane body
- inside a saucer pocket
- overlapping an already active sandbox ball
- overlapping solid geometry such as guides, posts, bumpers, targets,
  spinners, slingshots, plunger guides, or flippers

Blocked spawns must produce a visible status message in the side panel.

## Runtime State

The sandbox owns dedicated ephemeral state separate from normal `GameLoop`
play:

- display/device state for flippers, nudges, plunger, and animated devices
- active sandbox balls
- selected or last-spawned ball id for debug readout
- paused flag
- spawn parameters
- spawn mode
- transient status message

The state is not persisted into board JSON, local table storage, or rules
definitions.

## Frame Behavior

Each frame on `/physics`:

1. poll shared play input
2. advance sandbox-only device state
3. advance every active sandbox ball through the existing collision/material
   logic
4. resolve active free balls against each other with iterative pairwise
   ball-ball collision passes
5. remove sandbox balls that drain below the table
6. render the board plus every active sandbox ball

The sandbox remains active even when zero balls remain.

## Controls

The route side panel must expose:

- board selection
- spawn mode selector
- `vx`, `vy`, `wx`, `wy` numeric inputs
- `Pause` / `Resume`
- `Clear balls`
- `Reset sandbox`
- instructional copy describing click-to-spawn and active flipper/nudge input

The route keeps the existing play input mapping for flippers and nudges.

Launch input remains connected through the shared input model, but it does not
start a waiting-launch lifecycle on this route.

## Debug Readout

The sandbox debug panel reports the selected or last-spawned live ball.

It must show:

- active ball count
- position
- linear velocity
- angular velocity

If no live balls remain, vector fields must show placeholders instead of stale
values.

## Rendering

The sandbox route reuses the normal board renderer and static-layer caching.

Renderer-specific requirements:

- dynamic board devices still animate
- every active sandbox ball is rendered, not just one
- the table nudge visual shift still moves the table underneath the balls

## Testing Expectations

Coverage for this feature should include:

- route parsing and route-path generation for `/physics`
- valid spawn creation with exact configured vectors
- `replace` vs `add` spawn semantics
- blocked spawn rejection
- drain removal without resetting the sandbox route
- continued flipper/nudge interaction
- unchanged behavior on `/`, `/editor`, and `/rules`
