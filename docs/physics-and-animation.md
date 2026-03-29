# Physics And Animation

This document explains how the current pinball simulation works, and how the
runtime physics state becomes visible animation on the canvas.

## Overview

The game loop is intentionally simple:

1. Read the latest player input.
2. Advance physics for the current frame.
3. Apply rules to the resulting events.
4. Synthesize audio from the before/after state change.
5. Render the updated board and ball state.

The main coordinator is `src/game/game-loop.ts`.

## Frame Pipeline

`GameLoop.onFrame()` uses `requestAnimationFrame` time deltas and advances the
simulation in this order:

1. `stepGameFrame(...)` in `src/game/physics-engine.ts`
2. `applyRulesFrame(...)` in `src/game/rules-engine.ts`
3. `getFrameAudioEvents(...)` in `src/audio/game-audio.ts`
4. `renderer.renderGame(...)` in `src/render/canvas-renderer.ts`

That means rendering is always driven by the same state object that physics just
produced. There is no separate animation timeline layered on top.

## Ball Model

The ball is now treated as a 2D playfield object in `src/game/game-state.ts`.

- `position.x`, `position.y`: the ball center on the table
- `linearVelocity.x`, `linearVelocity.y`: planar velocity
- `angularVelocity.x`, `angularVelocity.y`: rolling spin on the table

There is no third rendered or simulated spatial dimension for the ball. The old
`z`-shaped state was removed because the game is fundamentally a 2D playfield
simulation.

## Simulation States

The physics engine runs in two main modes:

### `waiting-launch`

Handled by `stepWaitingLaunchState(...)` in
`src/game/physics-engine.ts`.

- The ball is pinned to `board.launchPosition`.
- The plunger can charge and release.
- Flippers still animate.
- The state switches to `playing` once the plunger has physically struck the
  ball and the ball has enough upward motion.

### `playing`

Handled by `stepPlayingState(...)`.

- Gravity is applied in screen-space `+y`.
- Ball motion is integrated across one or more substeps.
- Static and moving collisions are resolved.
- Gameplay devices emit events for the rules system.
- A drain resets the ball back to the launch state.

## Why The Engine Substeps

The physics step is capped into slices of at most `1/120s` via
`MAX_SIMULATION_STEP_SECONDS` in `src/game/physics-engine.ts`.

This matters because pinball has:

- fast moving balls
- fast rotating flippers
- narrow contact surfaces

Without substeps, the ball can tunnel through flippers or guides between frames.
Substepping keeps collision checks dense enough for the current solver.

## Motion Integration

Inside each playing substep:

1. Plunger motion advances.
2. Flipper motion advances.
3. Stateful device animation advances.
4. Saucer possession may take over the ball.
5. Gravity updates ball velocity.
6. Velocity updates ball position.
7. Collision and trigger passes run.

The order is important because moving devices need their transient motion solved
before ball contacts are evaluated.

## Flipper Animation And Physics

Flippers do not teleport between rest and active angles.

`advanceFlipper(...)` in `src/game/physics-engine.ts`:

- chooses a target angle from input
- moves the flipper toward that target at
  `board.physics.flipper.swingAngularSpeed`
- computes angular velocity from the actual angle change this frame

Collision handling then samples across the flipper's swept angle using
`getFlipperCollisionAngles(...)`, rather than testing only the final pose.

This is why flipper motion is both:

- visibly animated over time
- physically meaningful to ball contact

The same flipper angle stored in `GameState.flippers[index].angle` is what the
renderer uses in `src/render/canvas-renderer.ts`.

## Contacts And Bounce

Most physical contacts are converted into a `ContactData` structure and resolved
by `resolveBallContact(...)` in `src/game/spin-solver.ts`.

That solver handles:

- positional separation using contact overlap
- normal impulse using restitution
- tangential impulse using static or dynamic friction
- rolling spin transfer
- spin damping based on surface material

Surface response comes from:

- `board.surfaceMaterials`
- defaults in `src/game/physics-defaults.ts`
- material lookups in `src/game/materials.ts`

## Rolling Spin Model

The current spin model is a 2-axis rolling approximation.

When tangential impulse is applied:

- linear velocity changes along the contact tangent
- rolling angular velocity changes in `angularVelocity.x` and
  `angularVelocity.y`

`getSpinSurfaceVelocity(...)` in `src/game/spin-solver.ts` converts that rolling
state back into a surface velocity contribution at the contact patch, so future
contacts see the effect of spin.

This gives the game:

- grippy vs slippery materials
- transfer of spin from flippers, bumpers, posts, and guides
- rolling influence without pretending to simulate full 3D rigid-body motion

## Device Animation

Several table elements animate as a byproduct of gameplay state:

- flippers rotate from live physics state
- spinner reels accumulate `angle` and `angularVelocity`
- drop targets render with a lowered offset when `isDown`
- saucers render occupied vs empty state
- rollovers render lit vs unlit state
- plunger position renders from its live pullback

This work happens in two places:

- state mutation in `src/game/physics-engine.ts`
- drawing in `src/render/canvas-renderer.ts`

There is no duplicate animation model in the renderer.

## Rendering Model

`CanvasRenderer.renderGame(...)` draws in this order:

1. background
2. guides and plunger lane
3. static and stateful devices
4. flippers
5. ball
6. HUD

The renderer does not extrapolate or interpolate state between frames. It
renders the exact solved state from the simulation step. That keeps visuals and
collisions in sync, at the cost of animation smoothness being limited by frame
rate and the amount of motion represented in each frame.

## Rules Integration

Physics does not directly own game logic anymore.

`stepGameFrame(...)` returns:

- the next physical `GameState`
- a list of `GameEvent`s such as bumper hits, saucer captures, drains, and
  spinner spins

`applyRulesFrame(...)` consumes those events and decides how they affect score,
balls remaining, bonus, modes, and other rule state.

That separation keeps:

- physics responsible for "what happened"
- rules responsible for "what it means"

## Editor Relationship

The editor uses the same board schema and renderer, but not the live game loop.

- board geometry comes from the same `BoardDefinition`
- grid and snap behavior are editor-only concerns
- play test runs the same runtime loop as the game route

That means changes made in the builder feed directly into the same physics and
animation systems used in play.

## Current Limits

The current design is intentionally pragmatic, not a full rigid-body simulator.

Known simplifications:

- gravity is 2D screen-space acceleration, not a true table-tilt projection
- the ball is not simulated as a full 3D sphere in space
- there is no render interpolation layer
- contact resolution is impulse-based and local, not a constraint solver
- flipper drive is constant-speed target motion, not an electrical/mechanical
  coil model

These choices keep the code understandable and easy to tune while still
producing believable pinball-like behavior.
