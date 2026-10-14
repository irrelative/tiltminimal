# Flipper proportions investigation

October 13, 2026. This document records the pre-change investigation and archived
candidate comparison. The recommendation is now implemented; see
[flipper profiles](flipper-profiles-spec.md) for the validated production values.

## Findings from the original implementation

Before the change, all eight tables used 22-unit base width and 15.84-unit tip width, while all balls
are 32 units across. The shared lower assembly defaults to thickness 22; even
Harlem's separately authored third flipper explicitly uses 22. The tip is always
72% of the base width, with no per-table tip-width setting.

| Tables                                                                    | Pivot-to-tip length | Base / tip width | Rest from horizontal | Edge taper angle |
| ------------------------------------------------------------------------- | ------------------: | ---------------: | -------------------: | ---------------: |
| Alien Star, Just One More, Classic, Double Crossed, Starlight, Switchyard |                 136 |       22 / 15.84 |               16.04° |            1.30° |
| Andromeda                                                                 |                 120 |       22 / 15.84 |               16.04° |            1.47° |
| Harlem Globetrotters (three bats)                                         |                 110 |       22 / 15.84 |               31.51° |            1.60° |

The base is only 69% of a ball diameter; the tip is about 50%. The typical base
width is 16% of the pivot-to-tip length. Those proportions make the bats look
long and narrow and leave little visible wedge taper.

`getFlipperBaseRadius`, `getFlipperTipRadius` and `getFlipperRadiusAt` supply
physics, drawing and validation. The renderer draws that tapered outline; its
four-unit centered border adds a little visible width but does not create the
underlying thinness. Drawing fatter bats alone would misrepresent collision
surfaces. The contact model samples a radius along the axis; it is a shared 2D
approximation, not an exact tangent-sided manufactured bat.

## Reference evidence and limits

[Kevin Orme's Alien Star playfield photograph](https://user.xmission.com/~daina/images/ko/alien_star_pf.jpg)
shows rounded, fuller pivot ends and a more pronounced resting V than the
current representation. Its oblique perspective does not support a precise
factory width or angle measurement. Fuller heels and a steeper V are visual
inferences; numeric candidates below are authoring estimates.

[Action Pinball's early Bally three-inch bat](https://www.actionpinball.com/parts.php?item=A-3994-8)
and [Gottlieb's three-inch replacement bat listing](https://www.pinballspareparts.com.au/parts-by-machine/13150.html)
identify distinct replacement families. They do not establish a universal base
or tip width. The [Mission Pinball 515-5133 CAD listing](https://hardware.missionpinball.org/cad_models/flipper-bat-3-inch-515-5133.html)
explicitly marks its models unverified, so it is not treated as dimensional
authority. Neither the 3/8-inch rubber ring height nor shaft diameter is a
plan-view bat width. Avoid deriving base thickness from those measurements.

The game is not uniformly calibrated to physical inches. A typical rendered
bat spans about 155.9 units including its rounded ends, versus a 32-unit ball.
That approximately 4.87:1 ratio also contributes to the slender impression.
Reducing bat length to literal physical scale would require redesigning the
lower playfield, rather than a cosmetic adjustment.

## Candidate direction investigated

Treat two changes independently:

1. Fuller taper: start comparisons with base width 30–32 and tip width 16–18.
   A 32/18 profile at length 136 has about 2.95° edge taper, versus 1.30° now.
   Author tip width independently so different hardware families can retain
   their own profile instead of imposing one universal ratio.
2. Resting V: evaluate around 24° for conventional lower pairs, keeping
   reference-specific exceptions such as Harlem's 31.5° arrangement. This is
   an estimated comparison setting, not a universal factory alignment.

The interactive comparison uses base/tip widths 32/18 and either the existing
16.04° rest angle or a 24° candidate. It uses the game's existing outline
construction at the same scale, includes a 32-unit ball, and is not a physics
simulation or a live view of the production implementation.

## Clearance and behavioral implications

Five 320-spacing/136-length tables currently have about 42.75 units of
horizontal resting tip-edge clearance. This admits a 32-unit ball but is below
the shared authoring guideline's diameter-plus-20 margin (52 units). Alien Star
has 56.75, Andromeda 73.51, and Harlem's lower pair about 56.60 units. These are
horizontal screens, not proof of a complete drain corridor.

Simply scaling thickness to 32 while retaining the global 72% tip ratio makes
the tips 23.04 wide and cuts the common resting gap to about 35.55 units. That
is a poor way to make bats fuller. A 32/18 profile at 24° instead leaves about
53.52 units on the common 320-spacing lower pair. This geometric result does
not establish playable feeds, post passes or shot timing.

Implementation must change the shared board schema, compilation/cloning,
flipper geometry and rendering together, then revalidate return catches and
releases, heel clearance, center drains, post/bump passes, advanced skills and
actual shot regressions, including Alien Star's right-flipper spinner shot.
Changing the resting angle also changes stroke travel and release timing even
if the energized angle stays fixed. Preserve behavioral contracts and inspect
failed trajectories before updating timing expectations. Run all-table deep
validation and Classic playtests, plus full/lower-field browser review, before
adopting any profile.
