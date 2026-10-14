# Inlane feeds and cradling

Return lanes must deliver the ball onto the movable upper part of a held
flipper. A ball balanced on the stationary heel or wedged between a guide and
the flipper is not a successful cradle. Lowering the flipper must release it.

For center-drain clearance, connected shot structure, and the complete authoring
workflow, follow [the shared layout requirements](conventional-layout-guidelines.md).

## Geometry

Built-in lower returns use flipper-relative anchors. Their centers sit 32 units
outside the pivot. Inner arcs exit at 0.15 radians before a quarter turn;
conventional outer arcs now exit at 0.3 radians, then join the fixed heel with
a sloped inset rail. Andromeda/Harlem retain 0.005-radian outer exits and pivot
joins. See [flipper profiles](flipper-profiles-spec.md) for body dimensions and
authoring settings.

| Tables                              | Outer radius | Lane width | Bend center above pivot |
| ----------------------------------- | -----------: | ---------: | ----------------------: |
| Conventional foundation and Classic |          148 |         72 |                     177 |
| Alien Star                          |          148 |         72 |                     182 |
| Andromeda and Harlem                |          148 |         72 |                     174 |

The shared assembly defaults bend rise to radius +29. Each different return
configuration still requires complete feed validation; the 160-radius/64-wide
regression assembly uses a 0.25-radian exit.
Harlem uses equal 110-unit bats, with the upper-left at (270, 1680),
lower-left at (370, 1800), and right at (630, 1800). Its left return
follows the upper pivot, and direct feeds follow both left pivots. Lane mouths
share y=1480; each sling follows its staggered return exit. Harlem's left return permits a cross-playfield
passive release, and its right return permits lower-playfield entry followed by
a center drain. Both returns still require a catch on their specified held
flipper and a successful release.

## Heel connection

A four-unit metal rail connects each outer arc to the stationary heel. The
conventional endpoint lies inside the fixed circular disc at 37.5% of its base
radius, along the exit normal. This prevents the wider heel from forming a slow
ball groove while keeping the rail off the playable moving face. Reference
returns can select the original pivot endpoint. Layout validators recognize
only thin descending/outward joins terminating within the invariant inner heel core;
rails ending on the moving bat still receive keepout checks.
Slow-feed regressions
start 12, 20, and 28 units outside every inlane pivot, 65 units above it, at
0 and 80 units/second, and require escape without input within three seconds.
Existing passive/held routes, releases, outlanes and advanced moves remain tested.

## Held contact behavior

The capture region spans 8–58% of flipper length and only its upper face. The
fixed heel cap is excluded. Capture requires an engaged, stationary flipper and
ball speed at or below 1100 board units/second. The previous 420-unit limit was
below ordinary inlane arrival speeds after gravity accelerated these feeds.
Faster impacts and moving-flipper strokes continue through the contact solver.

A timed live catch during the final upstroke can establish rolling contact
farther along the bat (15–85% of length). Its per-ball contact marker preserves
the catch through the remaining motion and clears when contact is lost or the
flipper is released. Ordinary held-feed capture remains 8–58%; see
[advanced flipper skills](advanced-flipper-skills-spec.md) for exact conditions.

Once caught, gravity and ordinary friction/spin contact impulses roll the ball
toward the base. Normal impact is absorbed; catches arriving faster than 40
units/second into the face retain 10% of their post-contact tangential speed.
Spin follows contact torque rather than a prescribed rolling velocity.
It must not freeze at the initial catch position or snap to a resting pose.

The heel pocket uses a unilateral support contact one base radius along the bat
from its pivot (with a ball-sized clearance and at least 8% of length). This
bounded 2D approximation keeps it clear of the stationary cap so lowering the
flipper releases it. Support impulses and small penetration corrections settle
the ball; see [resting contact behavior](flipper-resting-contact-spec.md).
Regression tests cover gradual rolling and settling on every built-in flipper,
long holds, all declared catch/release feeds, and rejection of fast impacts.

## Validation

An optional route `cradle: { pivot }` adds a second run for every feed velocity.
The original passive route remains required. For the second run, all flippers
on the destination's input side start raised and remain held. The ball must
settle on the specified flipper's upper capture region below 5 units/second for
0.5 continuous seconds. Lowering the flippers must then move it more than one
ball radius within a second. Validation rejects fixed-heel or guide pinches.

The original five tables’ ten inlanes each exercise nine velocities: horizontal
-40, 0, or 40 and downward 0, 250, or 500 units/second. Four additional cases
cover Harlem's direct feeds to its two left flippers. Andromeda adds nine right-inlane and nine direct open-left feed cases, with
120-unit flippers and no left inlane/outlane pair. Its passive right feed may
cross the court; held catches remain required. See [Andromeda](andromeda-spec.md).
Outlane drain contracts,
passive feeds, scoring routes, and deep trap detection remain enabled.

Run:

```sh
make test
make validate-table TABLE='--all --deep-playability --fail-on-warnings'
```

The browser Physics sandbox can reproduce these feeds: hold the appropriate
flipper before releasing the injected ball into the inlane. Cradling is a
bounded 2D approximation; the tests establish behavior for the sampled feeds,
not a guarantee that every possible incoming ball can be caught.

The slings now join these exits with rounded passive posts. See
[post passes](post-pass-spec.md) for supported transfers and timing regressions.

The heel-connection revision passes 488 tests and all-seven-table deep validation
with zero errors or warnings. Starlight browser checks cover slow drops at both
heels, held inlane catches/releases, and the center drain. Classic's 76-run
playtest recorded a longest unexplained near-rest of 0.02 seconds; its 15
remaining diagnostic flags concern speeds above 4,000 units/second, not stalls.
