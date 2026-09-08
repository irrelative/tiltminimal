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

- Two staggered, left-operated flippers occupy the lower left. A single
  right-operated flipper faces them. The inter-flipper gap remains open.
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
- Staggered lower returns, slingshots, outlanes, and four representative
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
the staggered flipper positions remain unchanged.
