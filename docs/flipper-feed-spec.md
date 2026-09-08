# Inlane feeds and cradling

Return lanes must deliver the ball onto the movable upper part of a held
flipper. A ball balanced on the stationary heel or wedged between a guide and
the flipper is not a successful cradle. Lowering the flipper must release it.

For center-drain clearance, connected shot structure, and the complete authoring
workflow, follow [the shared layout requirements](conventional-layout-guidelines.md).

## Geometry

All built-in lower returns use flipper-relative anchors. Each return curve's
center sits 32 units outside its flipper pivot. The inner rail ends 0.15 radians
before a full quarter turn; the outer rail ends 0.005 radians before it. These
small downward slopes prevent balls balancing on horizontal endpoint caps.

| Tables                                     | Outer radius | Lane width | Bend center above pivot |
| ------------------------------------------ | -----------: | ---------: | ----------------------: |
| Classic and Harlem                         |          148 |         72 |                     174 |
| Double Crossed, Mirror Match, Starlight EM |          160 |         64 |                     180 |

The smaller Classic/Harlem returns preserve outlane clearance beside the cabinet
and shooter walls. The shared assembly defaults `bendRise` to `returnRadius +
20`; authors can override it, but must validate the complete table afterward.
Harlem uses equal 110-unit bats, with the upper-left at (270, 1680),
lower-left at (370, 1800), and right at (630, 1800). Its left return
follows the upper pivot, and direct feeds follow both left pivots. Lane mouths
share y=1480; the slings share y=1490 and mirror around x=500 independently
of the staggered return exits. Harlem's left return permits a cross-playfield
passive release, and its right return permits lower-playfield entry followed by
a center drain. Both returns still require a catch on their specified held
flipper and a successful release.

## Held contact behavior

The capture region spans 8–58% of flipper length and only its upper face. The
fixed heel cap is excluded. Capture requires an engaged, stationary flipper and
ball speed at or below 1100 board units/second. The previous 420-unit limit was
below ordinary inlane arrival speeds after gravity accelerated these feeds.
Faster impacts and moving-flipper strokes continue through the contact solver.

Once caught, static friction cancels the small tangential displacement introduced
by each gravity integration step, as well as velocity. This prevents a held
ball from slowly creeping onto the fixed heel. Regression tests verify a
10-second hold stays within one unit and that a 1600-unit/s impact is not caught.

## Validation

An optional route `cradle: { pivot }` adds a second run for every feed velocity.
The original passive route remains required. For the second run, all flippers
on the destination's input side start raised and remain held. The ball must
settle on the specified flipper's upper capture region below 5 units/second for
0.5 continuous seconds. Lowering the flippers must then move it more than one
ball radius within a second. Validation rejects fixed-heel or guide pinches.

Ten inlanes across all five tables each exercise nine velocities: horizontal
-40, 0, or 40 and downward 0, 250, or 500 units/second. Four additional cases
cover Harlem's direct feeds to its two left flippers. Outlane drain contracts,
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
