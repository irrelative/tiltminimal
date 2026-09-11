# Just One More

An original, unofficial r/pinball tribute at `?table=just-one-more`, visible in
the gallery. Three balls, two flippers, a single-ball lock and two-ball multiball.
This version uses shared mechanical audio, with no music or callouts.
No timed modes, extra balls, bonus ladder or callouts.

## Theme and layout

The collector joke “there is room if you move the couch” supplies the central
PLAY / FIX / COLLECT loop. Orange upvote inserts, a crossed-out couch floor plan,
ARCADE / ROAD TRIP spinners, four repair targets and a NEW PIN DAY saucer identify
the objectives. Art and progress inserts live in their own renderer module.
NEW PIN DAY and its subtitle center between the target-bank guides (x=455),
while r/pinball centers above the offset saucer (x=480). Paired bank captions
and spinner labels use symmetric anchors; each text draw sets its own centered
alignment and baseline.

The community references come from discussions of
[machines multiplying](https://www.reddit.com/r/pinball/comments/1d8udpo/),
[Pinball Map trips](https://www.reddit.com/r/pinball/comments/1at2vwr/), and
[“just a fuse” repairs](https://www.reddit.com/r/pinball/comments/127r97i/).
Mode names and rules are original adaptations of those themes.

To keep the first implementation simple, it shares Switchyard's physical layout
through `open-fan-table.ts`, instantiated separately with its own rules and theme.
See [Switchyard's physical spec](switchyard-spec.md) for exact measurements,
connected mechanisms and shot timing samples. Switchyard's geometry and rules
remain unchanged. No ramps, raised guides or obstacles were added to the lower
middle. The off-center saucer is at (480,380); four standups sit above y=610;
spinners sit at (145,690) and (755,690).

The foundation retains its intentional 42.75-unit resting tip clearance for a
32-unit ball, rather than the preferred diameter-plus-20 margin, preserving
working catches and post passes. Center-drain routes sample x=445/450/455 at
300/650 downward speed. Both returns retain passive and held catch/release
contracts. Directed orbit sensors are retained for physical route validation,
but do not score or qualify anything here: a spinner pulse is sufficient.

## Rules

- PLAY: register at least one pulse from each different spinner, 100 per pulse.
- FIX: hit all four different standups, 500 per hit. Completing the four adds
  2,000 once per qualification. Repeat hits do not advance progress. PLAY and
  FIX can be completed in any order across balls. Partial spinner/target progress
  and the lit COLLECT lock persist through ordinary drains.
- COLLECT: when PLAY and FIX are complete, NEW PIN DAY locks one ball and scores
  5,000 total. Unqualified captures score 1,000 and eject normally.
- Plunging the replacement releases the lock for two-ball multiball, retaining
  the ball number. There is no additional release shot or ball save.
- During multiball, both different spinners light NEW PIN DAY for 10,000 total.
  Collection clears the spinner flags so both must be spun again. Unlit captures
  score 1,000. Repair hits remain 500 each, without completion awards or relocking.
- Losing one ball ends multiball and clears all qualification/jackpot flags.
  The remaining ball continues and may qualify another multiball.
- Final drain advances the turn once, including simultaneous drains. Three
  completed turns end the game. No drain bonus. Reset ball clears physical locks
  and multiball state but preserves qualification; a new game clears everything.
- Slings score their authored values. The shared local top-five scoreboard and
  settings apply, including sound on/off and volume for mechanical effects.

## Verification

Focused rules tests cover distinct switches, one-time repair awards, actual
physical lock/replacement launch, repeated jackpots, single/simultaneous drains,
cross-ball qualification, reset and game over. The open fan geometry regression suite runs for both
Switchyard and Just One More, including actual cradle-to-shot timing samples.
All-table suites exercise feeds, center drains, post/bump passes and catches.
A game-loop test verifies shared mechanical audio forwarding and the absence of
a music/callout profile.

Acceptance results: all 466 tests passed; build and lint passed; all seven tables
passed deep CLI validation with zero warnings/errors. Browser review covered the
rule card, gallery link, desktop artwork and 390×844 mobile viewport. Stepped
physics checks drained the center ball, settled both held inlane feeds at zero
velocity (301,1184 and 599,1184), then released both into moving play.

Qualification is stored in player-scoped values and mirrored into ball-scoped
values for the inserts. Ball start restores these lights. Multiball end clears
both scopes for a fresh cycle; ordinary drains do not clear qualification.

## Plunge-gate relief opening

The shared fan layout's 410-unit inner shooter arch stops 0.14 radians before
its closed gate (end angle 2π − 0.94; gate angle −0.8). This leaves about
57 units between centerline endpoints, about 45 after guide thickness, for the
32-unit ball to roll into the upper orbit. Previously the continuous rail and
gate formed a pocket that held slow returning balls. The gate remains one-way,
and the existing plunge and ordered orbit scoring routes remain required.
Slow-return tests sample four positions across every built-in gate at zero
and 80 units/second, requiring clearance without a nudge within three seconds.

## Soft-plunge skill shot

At the start of each numbered ball, light a 5,000-point SKILL SHOT insert at the
plunge-gate relief. A real plunge arms it. A non-solid rollover at (738,225),
radius 18, awards it when the ball drops through the opening. An overshoot
rollover at (677,116), radius 18, cancels it when the ball continues around the
upper arch; its approach follows the arch tangent. These are indices 3 and 4,
after the existing three orbit switches. They neither advance orbit sequences
nor score independently. Ordinary playfield scoring switches also cancel an
uncollected opportunity, preventing a later return from collecting it.

Only one award is available per numbered ball. A weak plunge that settles back
at the plunger without leaving the shooter can be retried. Multiball replacement
plunges and multiball ending do not relight it; the next numbered ball does.
The insert is lit while ready or armed, dims when missed, and shows “5,000 MADE”
after collection. No music or callout is added. Shared rules live in
`soft-plunge-rules.ts`; rule tests include actual 68–70-frame soft plunges,
71-frame overshoots, weak-plunge retries, and duplicate prevention at 120 Hz.
