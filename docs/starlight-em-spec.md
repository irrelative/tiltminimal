# Starlight EM Specification

Starlight EM is an original five-ball table with simple repeatable scoring,
standup banks, pop bumpers, and a single upper-right saucer.

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

The existing rule script and bank indices remain unchanged:

- Five balls per game.
- Pops and spinners score and add bonus.
- Standups score and build bonus; completing either bank adds an award and
  advances the multiplier.
- Completing four top lanes or capturing the saucer advances the multiplier.
- Drains award bonus × multiplier.
- No timed modes, multiball, locks, or persistent feature ladders.

## Validation

The shipped layout must clear geometry checks, every declared ball route,
and deep playability analysis. Tests also verify the five-ball rules, spinner
clearance, and full-plunge access to the upper playfield.

## Post passes

Lower sling posts now meet the inner return exits. Rounded passive rubber and
connected solid bodies support left-to-right and right-to-left post passes.
Returns use 148-unit outer radius, 72-unit lane width, and 174-unit bend rise.
A connected inner-guide extension places each lower post 30 units outside
and 80 above its flipper pivot. The active faces are 60° from horizontal;
both directions support 50–75 ms release/re-flip regression samples.
Existing feeds, drains, and scoring routes remain required; see
[post-pass geometry and regression contracts](post-pass-spec.md).
