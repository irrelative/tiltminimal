# Starlight EM Specification

Starlight EM is an original five-ball celestial table built around an untimed
constellation collection: STAR lanes, COMET and NOVA banks, two separately lit
spinners, and an upper-right observatory saucer. Its navy, cream, copper and teal
artwork uses printed star maps and illuminated inserts inspired by classic
electromechanical playfields. Decorative orbital lines are not physical rails.

## Layout

The 1000 × 1400 cabinet uses the shared assembly foundation in
[board-assemblies.md](board-assemblies.md). Four open top lanes receive gated
plunges. A triangle of three pops occupies the upper center.

The left spinner sits in an orbit that continues to the upper field. The
second spinner occupies a separate center corridor with clear rotation space
and an open upper exit. Its rails end above the two three-standup banks so the
bank backings cannot pinch a descending ball against a spinner wall.

The upper-right saucer has a rounded pocket and open downward capture/ejection
mouth. Two active slings, four lane-entry posts, and solid curved returns feed
the lower flippers. Outlanes remain separate. There is no center drain post.
All guides collide on the playfield; joints retain precise coordinates without
grid snapping.

## Rules

- Five balls per game, with at most one earned extra ball per game.
- Four distinct top lanes spell STAR: 2,000 points, 1,000 bonus, and one
  multiplier advance up to 5×. Lane lamps reset for another completion. The first
  completion lights 1,000-point pops for the remainder of the ball.
- Each three-target bank needs three distinct hits. Completion scores 3,000,
  adds 1,000 bonus and clears its target lamps for another completion. The left
  COMET bank lights the orbit spinner at 500 per spin; the right NOVA bank lights
  the center spinner at 1,000. Unlit spinners score 100.
- Both banks lit qualify the observatory. Collect 10,000, then 15,000, 20,000,
  and 25,000 on subsequent collections; the award stays capped at 25,000. A
  collection adds 3,000 bonus and resets both banks and spinner lights. An
  unqualified saucer scores 3,000 and adds 1,500 bonus without consuming progress.
- Completing STAR before a qualified observatory collection earns one extra
  ball. STAR completion remains valid for the rest of that ball. An extra ball
  adds to the remaining supply; it never interrupts the current ball.
- Bonus is capped at 20,000 and collected × multiplier on drain. Lanes add 250,
  targets 400, pops 100, spinners 50 and slings 100 bonus per event in addition to
  completion awards. All ball lamps, bonus and multiplier reset on the next ball.
  Observatory award progression and the extra-ball-earned flag last the game.
- No countdowns, multiball, locks, automatic transfers, or flipper lane changing.
  The player chooses between milking lit spinners and collecting/rebuilding banks.

Rules live in `starlight-rules.ts`; art and live inserts live in
`starlight-playfield-art.ts`. Inserts show individual lanes/targets, lit spinner
values, the current saucer award, bonus/multiplier and extra-ball qualification.
The rule card describes the same ladder. Existing physical geometry, connected
routes, feeds, drain clearances and advanced moves remain unchanged.

## Validation

The shipped layout must clear geometry checks, every declared ball route,
and deep playability analysis. Tests also verify the five-ball rules, spinner
clearance, and full-plunge access to the upper playfield. Dedicated scoring
tests cover distinct switches, independent spinner lights, collection/reset,
award and bonus caps, one-per-game extra balls, ball transitions and game over.

## Post passes

Lower sling posts now meet the inner return exits. Rounded passive rubber and
connected solid bodies support left-to-right and right-to-left post passes.
Returns use 148-unit outer radius, 72-unit lane width, and 174-unit bend rise.
A connected inner-guide extension places each lower post 30 units outside
and 80 above its flipper pivot. The active faces are 60° from horizontal;
both directions support 50–75 ms release/re-flip regression samples.
Existing feeds, drains, and scoring routes remain required; see
[post-pass geometry and regression contracts](post-pass-spec.md).

## Constellation revision validation

The September 2026 rules/art revision passes 362 tests, production build, lint,
and all-five-table deep validation with zero errors or warnings. Browser review
covered the full Game playfield, live label placement, the Physics overlay and
a center-drain drop. Physical layout was preserved; automated route, held-feed,
post-pass and bump-pass regressions remain green.
