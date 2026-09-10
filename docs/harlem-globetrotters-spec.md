# Harlem Globetrotters On Tour: reference-based layout

The table follows the photographed arrangement of Bally's 1979 machine.
Coordinates are estimated from perspective photographs, not measured CAD.

## References

- [Full populated playfield photograph, Vintage Arcade](https://vintagearcade.net/wp-content/uploads/2023/10/1000087565-scaled.jpg)
  establishes the relative placement of the devices, court, star, and striping.
- [Restoration photographs and original flyer excerpt, Schmitronic](https://www.csprojects.eu/flippers/harlem_4_restauration.htm)
  document the two left flippers, their drain gap, five left targets, dunk
  target, and four targets arranged in line. The aftermarket post between the
  left flippers shown in this restoration is deliberately omitted.
- [Playfield photograph, J. Weiss](https://users.cis.fiu.edu/~jweiss/globetrotters/playfield.JPG)
  provides another view of the lower flippers, paired center spinners, and art.
- [Player's guide, Pinball for Mortals](https://www.pinballformortals.com/2019/06/12/harlem-globetrotters-on-tour-pinball-mini-guide/)
  confirms that successive shots clear the inline targets and expose a
  25,000-point saucer which ejects toward the top saucer area.

## Physical arrangement

The 1000 × 2000 coordinate space approximates the original's long playfield.

- Two equal-length, left-operated flippers form a diagonal tip-to-heel pair
  on the lower left, as shown in the original flyer. The lower-left and right
  pivots share a baseline. Both the left inter-flipper and center gaps stay open.
- Three pop bumpers form a downward-pointing triangle below the top-center
  GLOBE basket. The shooter arch is open, with no invented top rollover bank.
- A left spinner feeds the upper field. Two more spinners sit side by side
  below the pop cluster, instead of occupying three separate side orbits.
- Four horizontal drop-target faces lie one behind another in the upper-right
  Free Throw lane. The front target must fall before a shot can reach the next.
  Once all four are down, a shot can reach the saucer behind them.
- The Free Throw saucer ejects left toward the GLOBE area. Pocket walls leave
  that exit clear rather than forcing the ball back through the target row.
- Five standups run down the left edge. The sixth is recessed in the right-side
  Dunk Shot pocket. The center remains open for cross-court shots.
- Staggered lower returns and outlanes, return-mounted slingshots, and four representative
  rollover switches complete the layout. Painted GLOBE letters and bonus
  inserts are decoration, not invented rollover collision switches.

## Rendering

The `harlem` palette uses cream/yellow flippers, red targets, silver guides,
and basketball-colored spinner caps. `harlem-playfield-art.ts` draws an original
vector interpretation of the wood court, red-white-blue striping, central
star, GLOBE letters, numbered bonus stars, and shot labels beneath the devices.
No reference photograph is bundled or used as a collision map.

## Verification and limits

Tests establish target sequencing with five shots from the same lane entrance:
one target falls per shot, then the fifth shot reaches the exposed saucer.
Additional contracts check both saucer exits, spinner continuation, target
approach faces, the right return, and feeds to both left flippers. The staggered
left return's contract permits its cross-playfield release; it does not promise
that every passive feed lands on the upper-left flipper. All tables must still
pass deep dropped-ball and geometry analysis.

This is a layout and visual recreation using the shared 2D physics, not a ROM
emulation. It retains the application's basic three-ball scoring. The original
scanning GLOBE lamps, advancing spinner values, super bonus, specials/extra-ball
logic, and powered right-outlane detour gate are not implemented. The shooter's
one-way gate and return curves are adaptations for reliable 2D play. Dimensions,
plastics, portrait art, and switch positions remain approximations.

The return lanes now use the heel-relative dimensions in
[the flipper feed specification](flipper-feed-spec.md). Both side returns and
the direct feeds to both left flippers include held catch/release contracts;
the upper-left pivot is (270, 1680) and the lower-left is (370, 1800).
All three flippers are 110 units long. Both left resting angles are 0.55
radians, mirrored by the right flipper at (630, 1800). The upper-left tip lies
at approximately (364, 1737), just above the lower-left heel rather than far
to its right. Their rubber surfaces leave about 44 units of clearance for the
32-unit ball. The lower pair leaves about 57 units of horizontal tip clearance.
Center-drain routes at x=490, 500, and 510 exercise that opening at two speeds.

The [original flyer detail](https://www.csprojects.eu/_images/flippers/1125f2.jpg)
and [full playfield photo](https://users.cis.fiu.edu/~jweiss/globetrotters/playfield.JPG)
show equal left bats with the lower heel beneath the upper tip, and a level
bottom pair. These relative relationships replace the previous unequal
136/110-unit bats and overly separated (350, 1860) lower pivot. Coordinates
remain estimates adapted to our ball size, not measured original dimensions.
The side returns and direct feed contracts move with their destination pivots.
Regression coverage checks equal lengths, tip-to-heel alignment, both gaps,
and catch/release behavior.

The passive right-return contract now checks entry into the lower playfield:
an unheld feed may drain through the center instead of rebounding off the
lower-left flipper. Its nine held catch/release cases remain required.

## Plunge return into live play

The open outer arch previously guided medium and full launches down the left
cabinet wall, outside the target bank and directly into the left outlane.
The old route checked only arrival at the top of the arch, so it accepted this
path without any interaction in the playfield.

A short angled metal guide now joins the upper arch at x=220 (y approximately 118) and ends at (270, 200), turning its runoff inward toward the bumper and
Free Throw area. This is a documented 2D feed adaptation, not a claim that the
original machine has this exact rail. The open arch, device counts, outlane
openings, center drain, and held-flipper returns remain intact.

The plunge contract samples 51 charges from 50% through 100% in 1% increments.
Each must reach the upper arch region and then the live upper field
(x=240–840, y=250–700) within six seconds. The latter includes both the bumper
area and Free Throw approach while excluding the left wall/outlane corridor
and the shooter lane. A regression removes the deflector and requires all 51
samples to fail on the previously untested continuation. Normal play can still
drain after rebounds; these checks prevent the direct arch-to-outlane launch
path and do not guarantee every plunge survives subsequent play.

## Centered drain and level slingshots

The lower arrangement is translated 20 units left so the lower flipper tips'
rubber edges center on x=500, half the table width. Return guides, lane entries,
and held-feed destinations move with their flippers. The diagonal left pair
and approximately 57-unit drain clearance are preserved.

The former equal-height sling placement has been replaced by the connected
post-pass assembly described below. Drain centering and the diagonal flipper
pair remain intact.

## Whole-board alignment baselines

Lane entry posts now share y=1480 on both sides, and all inlane/outlane feed
contracts start at y=1510. The left lane's straight entrance is shortened to
meet this baseline. The curved returns stay at their heel-relative heights:
the left feeds the upper-left flipper and the right feeds the bottom-right.
Their different lengths and horizontal positions are intentional consequences
of the three-flipper arrangement, not disconnected or mismatched lane mouths.

The board definition names the lower centerline, lane entry height, sling height,
and three pivot anchors. Sling mounts, lane lengths, direct feeds, and center
routes derive from these anchors so moving a component cannot silently leave
its route destination behind. The central court badge, bonus ladder, and bottom
stripe apex now share the x=500 drain/sling centerline; the bottom stripe corners
share a height. Upper scoring mechanisms retain their distinct shot positions.
The bonus ladder is raised 60 units to clear the repositioned slings.

Extending the right lane to the former left entry height was rejected because
three fast feed samples drained before cradling. The common y=1480 entry passes
all nine held catch/release samples on each side, both outlanes, all center
routes, all-table deep validation without warnings, and the full 226-test suite.
Browser overlay review checks the full table and matching-height lane drops as
well as the center drain. Build and lint pass.

## Audio

The Game route layers a table-specific early Bally-style electronic voice over
shared mechanical sounds, including a synthesized Sweet Georgia Brown startup
phrase and event-driven spinner, target, sling, bumper, and saucer cues.
See [table audio](table-audio-spec.md) for event mappings, browser lifecycle,
references, and the distinction between this synthesis and ROM-exact sound.

## Connected slings and post passes

Each lower sling post now mounts at its return exit: the left follows the
upper-left flipper and the right follows the bottom-right. Faces are 100 units
long with 16.8-unit rubber radii. Shorter faces and a smooth upper rubber edge
prevent a pocket behind the upper-left sling. This replaces the former
equal-height sling adaptation.

Post passes are tested from upper-left to right and from right to lower-left.
Both left flippers still move together; no post is added between them.
The center drain, lane-mouth baseline, catches/releases, and outlane contracts
remain required. See [post-pass specification](post-pass-spec.md).
