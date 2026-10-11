# Alien Star (Gottlieb / Mylstar, 1984)

## Reference and scope

A playable reference recreation using the shared 2D solver, not ROM emulation.
Rules were investigated against these sources on October 10, 2026:

- [Original playfield photograph, Daina's archive](https://user.xmission.com/~daina/images/ko/alien_star.html).
- [Interactive Pinball Rules System, Alien Star](https://interactivepinballrules.com/Tables/AlienStar/main): annotated mechanisms, switch values, bonus and awards.
- [Bob Matthews' guide](https://rules.silverballmania.com/rules/G4xwQ-MQpVO): strategy, persistent ALIEN qualification, multiplier selection and spinner scoring.
- [Colorado Pinball notes](https://www.colorado-pinball.com/wp-content/uploads/2018/08/Alien-Star.pdf): STAR eligibility and pop-driven award rotation.
- [Pinballer owner description](https://pinballer.info/buy-sell-trade/the-pinballer-collection/alien-star-gottlieb-1984/): timed left-inlane to right-side bonus shot.
- [Inkochnito instruction card reproduction](https://www.pinballrebel.com/game/pins/instruction/Gottlieb_Alien_Star_instruction_cards.zip): A-23956, including the confirmed five-ball card. Browser play chooses three balls.

The right-side bonus mechanism is a standup target, not a second spinner.
The annotated playfield resolves ambiguous wording in the strategy guide.
No scanned artwork, ROM, or sound recordings are bundled. The constellation
artwork is newly drawn in Canvas, with the reference's black/cyan/orange palette.

## Rules contract

- One spinner, two lower flippers, paired slings and inlane/outlane returns,
  three upper pop bumpers, four STAR lanes, five right ALIEN targets and one
  upper bonus target, and a left lock saucer.
- Uncollected ALIEN letters score 3,000 and add 1,000 bonus. Repeats score 1,000.
  Complete all five to light lock and add one rotating STAR award. The bank
  relights for another completion. Partial letters and a lit lock survive drains.
- The left spinner scores 1,000 per revolution and cycles the selected multiball
  value through 2X, 3X and 5X in single-ball play. Locking freezes that value.
  Saucer scores 10,000; a lit capture locks the ball and serves a replacement.
  Plunging releases two-ball multiball on the same turn. Its multiplier applies
  to playfield switch points, including the lit spinner's 50,000 at 5X.
  Losing one ball returns to single-ball scoring; bonus is paid on the final drain.
- Right inlane temporarily lights 10,000 spinner scoring. Left inlane temporarily
  lights the upper-right bonus shot; hit its target while lit to advance bonus X.
  The target scores 3,000. A lit shot consumes its opportunity.
- STAR lane hits score 1,000, add 1,000 bonus and light their letter. Letter and
  award are separate inserts; both must already be lit when entering to collect.
  S collects bonus, T advances bonus X, A holds bonus, R gives one extra ball per
  turn. Pop hits score 500 and rotate the award mask. Sling hits score 10.
- Bonus starts at 1,000, caps at 29,000; bonus X caps at 5X. Collection resets
  bonus to 1,000 unless Hold Bonus is active. Hold restores its level for the next
  ball; bonus X resets. STAR letters, awards and timed opportunities reset per ball.
- Completing STAR and ALIEN qualifies outlane Special. A lit outlane collects it
  once. Ordinary outlanes score 1,000; inlanes also score 1,000 and advance bonus.

## Explicit adaptations and uncertainty

Coordinates and mechanical dimensions are estimated from photographs, with
ball clearance and catch/release taking precedence over pixel matching. The
shooter has a one-way exit; the saucer ejects down/right through its angled mouth with no
machine-specific kick exception. The browser spinner uses sustained momentum
and full-revolution scoring.

The sources do not establish precise timer durations, original ROM sequencing,
award consumption, extra-ball limits, or credit/score adjustment settings.
This implementation selects five seconds for both timed shots, consumes a
collected STAR award, permits one extra ball per turn, and converts Special to
50,000 points outside playfield multiplication. Those are explicit browser
choices, not claims about factory ROM values. No replay-credit or match system,
original sound package, tilt mechanism or ROM switch debounce is emulated.

## Geometry and validation

The 1,000 × 1,600 cabinet uses connected assembly factories. Flipper returns
are anchored to pivots; each keeps nine passive feed samples and held
catch/release checks. Three center-drain positions each have two downward
speeds and require draining without touching a resting flipper. The shooter,
spinner, each standup and saucer have approach/continuation route contracts.

The lower pivots are (283, 1420) and (617, 1420), with 136-unit bats,
0.28-radian rest angle, 177-unit bend rise and 340-unit return entry rise.
Resting tip clearance exceeds the 32-unit ball diameter plus 20 units.
The slightly wider pivot spacing changes transfer timing: the regression suite
verifies post passes after 6/7 release frames and bump passes at frame 14.
The curved right bonus shot ends beside the top pop rather than traversing the
full width above the pops. This deliberate 2D adaptation avoids crossing the
STAR feeds; its outer guide replaces the inner shooter arc so returning balls
cannot wedge between two overlapping mechanisms.

Final Chrome review covered the full field and lower third, with production
physics in a temporary review fixture: full plunge scored through the upper
lanes; both held return samples settled on their movable bats; lowering each
moved its ball about 172 units in one second; a center feed drained; physical
capture and replacement plunge created two active balls at 5X, and the lit
spinner switch awarded 50,000. The fixture was removed afterward.
A 390 × 844 viewport review confirmed the game controls and lower
field render without horizontal overflow. The existing shared phone layout
places the flippers below the initial viewport until the page is scrolled.
This was a responsive-layout review, not a physical-phone touch playtest.

Acceptance: focused Alien Star rules tests, the full Vitest suite, all-table
validation with `--deep-playability --fail-on-warnings`, production build and
ESLint. Deep validation reports no geometry or playability issues on Alien Star;
these sampled trajectories do not prove every shot or factory timing accurate.

## Lock, left return and repeat-plunge corrections

The lock assembly now rotates its pocket, both mouth walls, approach samples
and eject direction together by −0.62 radians. The resulting mouth points
about 54.5° down/right toward the right flipper; its world-space return region
covers the connected eject path. Diagonal ballistic feeds from the right
flipper area at (490, 1320) capture across 0.35/0.45/0.6-second flight samples.
This is an estimated entrance angle, preserving the shared saucer capture rules.

Below the lock's left side, the cabinet wall curves from (12, 850) around a
91-unit radius centered at (103, 850), then joins the left return at (103, 1080).
Upper feeds beside the lock enter the lower playfield rather than having an
uninterrupted drop into the outlane. Sampled drops at (45, 620) with downward
speeds 0 and 400 settle on a held left flipper and release when it is lowered.
This creates a save opportunity; it does not guarantee every feed survives.
The genuine left outlane retains its independent drain contract.

Shooter gates now use shared directional collision handling: an armed gate
blocks an incoming ball on the playfield side, but an outgoing ball can push
through it from the shooter side. Historical per-ball `launcherExited` remains
set; returning and plunging again does not reset score, qualification or turn.
Regression tests cover outbound crossing with either history state and repeat
plunges after falling back onto the plunger on all eight tables.

Chrome review inspected the changed collision surfaces in `/physics` and used
a temporary production-physics replay fixture. The diagonal right-side shot
captured; the upper-left drop settled for 60 frames on its movable bat; both
inlanes released about 172 units in one second; the center feed drained; a ball
returned down the shooter lane and plunged past the already-armed gate.
The fixture was removed after review. All 595 tests and eight-table deep
validation pass. The Classic runner completed 76 sampled runs with no sustained
near-rest trap; its 14 diagnostic flags were speeds above 4,000 units/second.
