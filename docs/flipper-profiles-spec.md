# Flipper profiles and resting alignment

Implemented October 13, 2026, following the [proportions investigation](flipper-proportions-investigation.md).
These are estimated browser-play dimensions, not measured factory replacements.

## Profile contract

`FlipperDefinition.thickness` is the full pivot-end width.
Optional `tipThickness` is the independently authored full tip width. It must
be finite, positive and no greater than the base width. Omitting it preserves
the former 72% taper for imported and legacy definitions. Layout primitives,
compilation and isolated board cloning preserve the optional value.

Physics contact profiles, drawn outlines, the debug overlay, spawn exclusion
and layout analysis consume the same base and tip radius helpers. There is no
render-only enlargement. The shared axis/radius contact approximation and
rubber/impulse tuning remain unchanged.

| Tables                                                        | Length | Base / tip | Rest from horizontal | Active offset |
| ------------------------------------------------------------- | -----: | ---------: | -------------------: | ------------: |
| Classic, Just One More, Double Crossed, Starlight, Switchyard |    136 |    32 / 18 |                  24° |      −0.5 rad |
| Alien Star                                                    |    136 |    30 / 18 |                  24° |      −0.5 rad |
| Andromeda                                                     |    120 |    30 / 16 |                  24° |      −0.5 rad |
| Harlem Globetrotters (all three)                              |    110 |    28 / 18 |    0.55 rad (31.51°) |      −0.5 rad |

Angles mirror for right-side bats. Harlem retains its reference-specific
stagger and steeper resting V. The conventional edge taper grows from about
1.30° to 2.95°. Short/reference profiles differ deliberately; Alien Star uses
30/18 after validating its taller return feeds and the lock-bypass save.

At rest, horizontal tip-edge gaps are about 53.52 units on the common
320-spacing lower pair, 67.52 on Alien Star, 84.75 on Andromeda and 54.44 on
Harlem's lower pair. Each exceeds the 32-unit ball diameter plus 20 units.
The route checks additionally prove sampled drain paths; dimensional clearance
alone is insufficient.

## Connected returns

The wider heel needs a new rail connection; changing width alone can leave a
slow ball in a groove between the metal return and the fixed cap. Conventional
148-radius/72-wide returns now use 177-unit bend rise and a 0.3-radian outer
arc exit offset. A four-unit heel rail continues into the fixed circular heel,
ending at 37.5% of its base radius along that exit normal. This inset joins the
static disc, without extending onto the playable moving face. Both slow feeds
and full inlane feeds must pass. This is an authored sloped join, not a claim
of a mathematically exact tangent between the two surfaces.

Alien Star uses 182-unit bend rise, the same exit angle, and a lower sling post
30 units outward/84 above its pivot. Its 340-unit entry rise and upper-left
bypass remain connected. Andromeda and Harlem retain their validated
174-unit bends, 0.005-radian outer exits and pivot-ending heel rails through
`heelJoin: 'pivot'`. Other authoring dimensions may require their own exit;
the 160-radius/64-wide regression assembly uses 0.25 radians.

The lower assembly defaults to 32/18 widths and a 24° rest angle. It now also
generates three center-drain feeds at center x ±10/0, y=pivot+40, with downward
speeds 300/650 and `avoidFlippers: true`. Reference layouts with their own
staggered/open-field checks can set `centerDrainRoutes: false` and retain those
explicit routes. Duplicate Alien Star/open-fan center contracts were removed.

## Timing and compatibility

Changing base width and rest angle changes contact position, stroke travel,
release trajectory and aim. Test input windows were remeasured using production
physics, retaining the same objectives and negative controls rather than
loosening capture limits or adding shot assistance:

- Conventional post passes: releases at 7 and 9 frames; Alien Star 7/8/9;
  Andromeda right→left 1/2/3; Harlem upper-left→right 2/5/7 and right→lower-left
  8/9. All touch the passive post, fire no sling and settle on the receiver.
- Double Crossed lock shots: releases at 71/72 frames at 120 Hz, with the lock
  the first scoring objective. Its bump passes work at 12/14; frame 16 misses.
- Alien Star's direct spinner regression retains its falling ball at
  (490,1360), downward speed 800 and no intervening scoring device, but now
  presses the right flipper at frame 10 instead of 15.
- Classic's direct drop-target and saucer samples use frames 38 and 27.
  Switchyard/Just One More timing maps were resampled at 240 Hz. Switchyard's
  middle Cargo target is now checked from the right bat; the upper target has
  independent left/right samples. Every objective remains reachable.
- Harlem lower-left controlled shots use 26/27 frames. Its marginal slap-save
  feed starts 23 units beyond the tip and flips at frame 9: it drains without
  the nudge or with that flip alone, and survives the timed nudge/flip.

These are reproducible opportunities, not guaranteed human timing windows.
No table-specific physics exception, restitution change, nudge assistance or
widened capture region was introduced.

## Verification

Unit regressions cover tip compilation/cloning, omitted-field compatibility,
invalid tips, drawn/contact radii, fixed-heel guide recognition, all-table
profiles and center-drain margin. Existing suites cover passive and held feeds,
slow heel escape, drains, post/bump passes, live/drop catches, dead bounces,
controlled aim and actual scoring shots.

Chrome production-physics review covered all eight lower fields with the
collision overlay. Each of the 17 flippers settled its feed for 60 frames and
released more than 270 units within one second; all three center drops on each
table drained. Full plunges reached the upper field on every table. Alien Star's
updated right-flipper replay contacted the spinner on frame 43, scored its first
revolution on frame 48 and produced 12 revolutions in one second. The temporary
review canvas and state were removed afterward.

Classic's 76-run timing/seeded playtest found no sustained near-rest trap
(longest unexplained near-rest 0.02 s), non-finite state or escape. Its 21
remaining diagnostic flags were speeds above 4,000 units/s (maximum 4,215.4).
Those speed diagnostics remain visible; they are not used to alter shot physics.
Acceptance passed: all 632 tests, eight-table deep validation with
`--fail-on-warnings`, `make playtest-classic`, `make build` and `make lint`.
