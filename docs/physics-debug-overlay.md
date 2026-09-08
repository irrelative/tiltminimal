# Physics debugging overlay

Enable **Physics overlay** in the sidebar on either Game or Physics. It starts
off and does not persist across page reloads. Selecting another table clears the
trace and resumes the simulation, retaining the overlay and speed selection.

## Inspection

- Cyan outlines show solid collision geometry, including the moving flippers,
  slings, plunger, posts, bumpers, targets, and playfield guides. Raised guides
  are excluded; down drop targets disappear. Flippers show their tapered profile
  at the current angle, not the intermediate positions swept during a step.
- Yellow dashed shapes show rollover, saucer, and spinner trigger regions.
  Yellow solid lines identify the active sling faces. Triggering also depends
  on each device's speed, occupancy, and cooldown rules.
- Green circles show the ball radius. Velocity lines show 0.12 seconds of current
  velocity, without predicting gravity or collisions. Speed labels use board
  units per second.
- Pink lines show actual solver contact normals, pointing outward from the
  contact surface. Up to 80 contacts remain for 0.4 seconds of simulation time.
- Recent triggers lists the last eight physics events with simulation time and
  one-based device index. Sandbox events are combined across balls.

Table geometry moves with nudge; contact marks retain the world positions where
they occurred. Sandbox gate outlines use the shared display state's launcher
status. Per-ball gate eligibility may differ. Normals represent solver contacts,
not non-contact assists or trigger impulses.

## Time controls

Pause freezes physics, device timers, scoring timers, and trace aging. Rendering
continues so the table stays visible and resizes normally. Step pauses the game
and advances 1/120 second using the current held inputs. Speed offers normal,
half, quarter, or one-tenth time. Resuming does not replay elapsed paused time.
Disabling the overlay resumes normal speed. Resetting clears the trace.

The existing sandbox Pause button and overlay pause state are synchronized.
For a controlled experiment, open Physics, pause, inject a ball, choose velocity,
then step or resume at reduced speed.

## Implementation and checks

`PhysicsDebug` scopes observation to synchronous simulation calls and restores
its previous observer with `finally`. `resolveBallContact` records copied points
and normals only when observation is enabled. Debug data stays outside game
state and cannot influence contact resolution. Game and sandbox loops apply the
same time scaling to the whole simulation.

Tests compare traced and untraced simulation results, exercise actual wall
contact capture, verify pause/step/slow-resume timing, and check sandbox stepping.
