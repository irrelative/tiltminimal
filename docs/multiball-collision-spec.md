# Multiball Collision Spec

This document defines the first staged implementation of multiple-ball
collision support.

## Scope

The current multiball collision implementation is intentionally limited to the
physics sandbox route at `/physics`.

It does not yet change normal gameplay, rules progression, or balls-per-game
handling on `/`.

That staged scope is deliberate. The current gameplay engine still models the
main game lifecycle around a single active ball, while the sandbox is the right
place to harden the lower-level collision behavior first.

## Goals

The first implementation must provide:

- active sandbox balls that collide with each other
- stable overlap correction when balls are spawned or converge into the same
  space
- plausible momentum transfer for head-on and glancing hits
- bounded cost suitable for the current sandbox ball counts
- no behavior change for single-ball normal play

## Non-Goals For This Stage

This stage does not yet provide:

- rules-aware gameplay multiball
- multiball drain handling on the main game route
- multi-ball saucer stacking behavior beyond the existing one-ball-per-state
  sandbox model
- swept time-of-impact solving for fast ball-ball contacts

## Runtime Model

Sandbox multiball keeps the existing split between:

- shared table/device motion
- per-ball state for position, velocity, and spin

Each sandbox ball still resolves against the full table geometry and device
set. After the per-ball world step, active free balls are then resolved against
each other.

Balls currently held in a saucer are excluded from ball-ball collision passes.

## Collision Model

Ball-ball collisions are resolved as circle-circle contacts.

Each contact pass performs:

1. narrow-phase overlap detection using ball centers and radii
2. positional separation
3. normal impulse solve with a steel-ball-like restitution
4. tangential friction impulse with the current 2-axis rolling-spin model

The solver uses multiple pair-resolution iterations per frame to reduce
persistent overlap and improve stability when more than two balls cluster
together.

## Spawn Rules

When the physics sandbox is in `Add ball` mode, click-to-spawn is rejected if
the requested point overlaps:

- table geometry
- plunger lane body
- saucer pocket
- an already active sandbox ball

The spawn point is not auto-adjusted.

## Determinism And Ordering

The current implementation uses a pairwise iterative solver over the active
ball list.

That means:

- ordering is deterministic for a given ball list order
- results are stable enough for current sandbox use
- results are still an approximation rather than a global simultaneous solve

This is acceptable for the current stage.

## Future Phases

The intended follow-on phases are:

1. migrate more runtime internals from `state.ball` assumptions to shared
   table state plus `balls[]`
2. enable the same collision model in gameplay routes when rules/gameplay are
   ready
3. define device semantics for true gameplay multiball
4. add swept collision if fast ball-ball tunneling becomes an observed issue
