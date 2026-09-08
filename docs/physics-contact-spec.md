# Physical contact behavior

The game uses a 2D contact solver. These rules distinguish solid surfaces,
active kick devices, and non-solid switches.

## Flippers

Contact normals follow the actual side of the flipper struck by the ball.
Balls approaching from below bounce below the flipper. Held-flipper cradling
and passive top-surface carry apply only to the upper face.

## Slingshots

Rendering, collisions, sandbox placement, and playability seed exclusion use
the same wedge polygon and orientation from `slingshot-geometry.ts`.
The front face midpoint is the component origin; body depth extends behind it.
Only incoming front-face contacts trigger a powered kick and score. Side and
rear contacts resolve passively. Table nudge translates the whole shape.

Classic and the shared table foundation place slings 40 board units higher to
keep the solid bodies clear of the inner return curves. Custom Harlem geometry
retains its placement. Deep playability checks cover all built-in tables.

## Bumpers

An incoming contact adds 560 board units/second along the outward normal after
passive material resolution. Each firing scores once and starts a 0.14-second
cooldown. The ball must separate by more than 2 units before a new contact can
fire; continuous overlap cannot repeatedly award points. Passive collision
resolution remains enabled during cooldown. Contact state resets with the ball.

## Rollover switches

Occupancy is independent of the lit indicator. Entering an unoccupied switch
emits a hit and lights it; staying inside emits no further hits. Moving more
than 2 units beyond the trigger radius rearms it, even while lit. This permits
Classic to complete its top-lane bank repeatedly during one ball.

Sandbox occupancy and bumper contact latches belong to each ball, while device
cooldowns and visible indicators are shared.

## Regression coverage

`tests/physics-regressions.test.ts` checks idle and held flipper underside
contacts, sling geometry and active-face behavior, bumper impulse and rearming,
rollover reentry, and two Classic lane completions in one ball.

Held flippers capture normal return feeds on the movable upper face (8–58% of
length, up to 1100 units/s). Static friction cancels gravity's tangential
position drift during a hold; the fixed heel cannot latch a ball. See
[the flipper feed specification](flipper-feed-spec.md) for catch/release checks.
