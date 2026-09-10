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
Classic and foundation tables continue the inner arc with a solid guide to
30 units outside and 80 above the flipper pivot, bringing the lower sling
post closer while preserving the outer return and lane entry coordinates.

| Tables                                     | Outer radius | Lane width | Bend center above pivot |
| ------------------------------------------ | -----------: | ---------: | ----------------------: |
| All conventional returns                         |          148 |         72 |                     174 |

The shared 148-unit returns preserve outlane clearance beside the cabinet
and shooter walls. The shared assembly defaults `bendRise` to `returnRadius +
20`; authors can override it, but must validate the complete table afterward.
Harlem uses equal 110-unit bats, with the upper-left at (270, 1680),
lower-left at (370, 1800), and right at (630, 1800). Its left return
follows the upper pivot, and direct feeds follow both left pivots. Lane mouths
share y=1480; each sling follows its staggered return exit. Harlem's left return permits a cross-playfield
passive release, and its right return permits lower-playfield entry followed by
a center drain. Both returns still require a catch on their specified held
flipper and a successful release.

## Held contact behavior

The capture region spans 8–58% of flipper length and only its upper face. The
fixed heel cap is excluded. Capture requires an engaged, stationary flipper and
ball speed at or below 1100 board units/second. The previous 420-unit limit was
below ordinary inlane arrival speeds after gravity accelerated these feeds.
Faster impacts and moving-flipper strokes continue through the contact solver.

Once caught, the ball retains tangential motion and rolls downhill toward the
base. Normal impact is absorbed; catches arriving faster than 40 units/second
into the face retain 10% of their tangential speed. Sustained contact uses 5/7
of the gravity projection along the bat, with matching visible rolling spin.
It must not freeze at the initial catch position.

The heel pocket settles the center one ball radius plus one base radius along
the bat from its pivot (at least 8% of length). This bounded 2D approximation
keeps it clear of the stationary cap so lowering the flipper releases it.
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
