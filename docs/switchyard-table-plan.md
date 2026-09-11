# Switchyard — modern flat fan-shot table plan

Status: implemented. See [the final specification](switchyard-spec.md) for
measured geometry, deliberate refinements and regression evidence. This document
retains the original design proposal.

## Design intent

Add a sixth original table, working title **Switchyard**, built around choosing
shots and linking them together. A transit-control theme gives each shot a clear
name and makes illuminated route lines useful artwork. The defining change from
existing tables is an open lower middle with five visible entrances fanning out
across the upper half. All ball travel remains on the playfield plane.

Use the shared 1000 × 1400 cabinet scale and conventional two-flipper lower
assembly. Keep paired active slings, close passive post-pass posts, inlanes,
outlanes, and the right shooter lane. Do not add an upper flipper, central rebound
post, lower target bank, ramps, tunnels, overpasses, teleporting returns, or
collision-skipping raised guides. Omit pop bumpers in the first version: they
would consume the upper space needed for clear fan shots.

This is an original design, not a recreation of a particular real machine.

## Proposed shot map

Positions below are layout envelopes, not approved collision coordinates. Resolve
final positions from the foundation's usable cabinet boundaries, shooter wall,
ball radius, and real flipper shot trajectories.

| Left-to-right shot | Approximate entrance | Mechanism                                                                     | Intended return                                                 |
| ------------------ | -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| West Express       | x=140–220, y=600–720 | Left entrance of a continuous outer orbit, with spinner                       | Around the upper arch and down the right side to the open field |
| Cargo              | x=280–360, y=540–660 | Two short standups with backing above/behind their scoring faces              | Angled rebound toward the right flipper region                  |
| Dispatch           | x=480–580, y=480–600 | Recessed saucer, slightly right of center                                     | Visible, timed eject biased toward the left flipper region      |
| Signal             | x=660–740, y=540–660 | Two short standups with backing above/behind their scoring faces              | Angled rebound toward the left flipper region                   |
| East Express       | x=800–870, y=600–720 | Right entrance of the same outer orbit, with spinner, inside the shooter wall | Around the upper arch and down the left side to the open field  |

The two orbit entrances share one physical U-shaped corridor behind the banks
and saucer; they are not two crossing loops. Reserve its entire footprint before
placing the pockets. Shooter entry joins this upper system through its one-way
gate, with no duplicate walls. Only surface rollovers and the two spinners occupy
the through lane. Add a top-center rollover to identify completed orbit travel.

Use broad, flared entrances rather than long dividers extending toward the
flippers. Start with 64–80 units of usable orbit width at the existing 32-unit
ball diameter; measure clear space between collision surfaces. Target-bank
width and pocket flares must fit without narrowing adjacent shots. If space is
tight, shorten the banks or move them upward before narrowing the orbit.

### Open lower field

Reserve a central shot area approximately x=240–760, y=760–1080, above the
lower assembly. No solid scoring components or freestanding posts belong here;
flat artwork/inserts are allowed. Extend this into five ball-sized approach
corridors from actual release points on the flippers to the shot entrances.
The rectangle alone is not proof of open shots: check the complete corridors,
including the sling tops and pocket lips.

Keep the lower assembly's tested geometry initially. Preserve the unobstructed
resting center drain with tip-edge clearance greater than ball diameter plus
20 units. The lower sling posts remain close enough for post passes. “Open” must
not mean deleting the slings, sealing outlanes, or making every return safe.

### Shot access and risk

The right flipper should have clear primary access to West Express and Cargo;
the left should have East Express and Signal. Dispatch should be reachable from
both, with one easier primary approach. Require reproducible adjacent release/
flip timing samples for every major shot, not only balls spawned near entrances.

Successful orbit shots should travel through and return; weak shots may fall
back through the entrance. Target banks should create recoverable lateral
rebounds while misses retain natural drain risk. Dispatch's eject must not be a
routine straight-down-center drain or an automatic cradle. Check its return at
multiple approach speeds and with flippers both resting and held.

## Proposed rules

Three balls per game. Modern character comes from lit shot objectives, combos,
and a short multiball progression, without a complicated mode menu.

### Connect the network

- West/East Express: a completed directed orbit marks that route.
- Cargo/Signal: hit both distinct standups to mark that route.
- Dispatch: an ordinary saucer capture marks its route and ejects.
- Mark all five routes, in any order, to light Dispatch lock. Lamps latch for the
  ball; repeating a completed route scores but does not advance qualification.
- The next Dispatch capture locks one ball. If Dispatch completes the fifth
  route, eject normally and require a subsequent capture for lock.
- Plunging the replacement ball releases the stored ball for two-ball multiball,
  using the existing lock/serve/release lifecycle and the same current ball number.

### Multiball

West Express, Cargo, Signal and East Express each light a 10,000-point jackpot.
Collect each once: directed orbit completion for Express shots, either standup
in the corresponding bank for Cargo/Signal. Collect all four to light a
50,000-point Super Jackpot at Dispatch. Super collection relights all four.
An unlit Dispatch capture scores its ordinary value and ejects; no relocking.

One remaining live ball ends multiball and clears network/jackpot qualification.
Play continues on that ball. Only the final live ball's drain awards bonus and
advances the turn. Starting a new ball clears shot progress and combo state.

### Combos and base scoring

Initial tuning values: standups 500, spinner pulses 100, completed orbit 2,000,
unlit Dispatch 2,000, and completed target bank 3,000 additional points.
Complete a different Express route or target bank within four simulation seconds
of the preceding route/bank completion for a 2,000-point combo. Each qualifying
completion restarts the window; repeating the same shot does not award a combo.
Disable combos during multiball and clear the window on saucer capture, lock,
and drain. Pausing freezes it. Spinner pulses alone cannot advance combos.

Add 500 bonus per completed orbit/bank and ordinary Dispatch capture, capped at
20,000; collect 1× on final drain. Keep multiplier ladders and extra balls out of
this first version so the five-route objective stays readable. Values are initial
balance choices, not verified difficulty or game-length targets.

### Correctly identifying an orbit

A spinner pulse is not a made orbit: the ball can rattle or return through the
same entrance. Track entrance → top-center rollover → opposite exit in order,
with a bounded simulation-time window, separately for each ball. Award only on
completion, then require a fresh entrance. Clear tracking on capture/drain.

Current switch events carry tick/index/score but no stable ball ID. Add that
metadata in shared event generation and expose it to rules;
do not combine crossings from two different balls during multiball. Existing
tables must retain their behavior. A test must interleave two balls' incomplete
sequences and show that neither earns a completed orbit.

## Artwork and integration

Use restrained dark playfield art, five large readable shot arrows, and distinct
route colors backed by labels/shapes. Show qualification, lock, jackpots and
Super Jackpot with inserts close to the corresponding mouths. Keep the central
shot area visually quiet. Artwork must match actual lanes and not imply ramps.
Keep score and ball at the canvas top; no additional table title there.

Register `switchyard` in the table library and gallery, add its theme/art renderer
and accurate rule card, and use existing URL selection, settings, high scores,
and shared mechanical audio. Any new electronic cues are optional later work.
Keep layout, rules, and rendering in separate modules. Update README table counts
and documentation that currently says five tables when the table ships.

## Implementation sequence

1. **Geometry prototype:** compose lower assembly and shooter; reserve the outer
   orbit; place high banks and Dispatch. Add local approach/return routes,
   explicit center-drain routes, and both passive and held inlane contracts.
2. **Prove the fan:** run real cradle/release timing sweeps from both flippers.
   Record made shots and returns; adjust geometry before adding feature rules.
   Reject shots needing extreme bespoke input, hidden walls, or physics exceptions.
3. **Scoring:** implement per-ball orbit detection and the network/lock/multiball
   state machine, then combos and bounded bonus. Add event-sequence regression tests.
4. **Presentation:** add art, inserts, gallery entry, and rule card. Browser-review
   full table and close-up lower field, desktop and mobile, with overlay on/off.
5. **Tune and validate:** tune return speed, entrance width and awards from play;
   record measured shot windows and intentional asymmetries in the final table spec.

## Acceptance criteria

- Every major shot is reachable by ordinary player input, with recorded timing
  samples; both flippers have multiple useful choices.
- No solid obstacles in the reserved central shot area; five clear approaches.
- Orbit traversals work in both directions without crossing another physical lane;
  weak shots remain playable and shooter entry cannot bypass the one-way gate.
- Every target scores and rebounds; Dispatch captures/ejects without trapping balls.
- Both inlanes pass nine feed velocities with resting and held/released flippers;
  outlane drains and multiple center-drain positions/speeds pass explicit routes.
- Extend all-table advanced-skill coverage to the sixth table: post/bump passes,
  dead bounces, catches, controlled releases and slap saves.
- Rules tests cover distinct-shot qualification, no false orbit/combos, combo
  expiry/pause, real lock and replacement plunge, both individual/simultaneous
  multiball drains, jackpot relighting, final bonus, resets and game over.
- Run `make test`, `make build`, `make lint`, and
  `make validate-table TABLE='--all --deep-playability --fail-on-warnings'`.
- Inspect live play and `/physics` on desktop/mobile. Passing geometry heuristics
  and sampled routes alone does not establish shot quality or difficulty.

Follow [conventional layout guidelines](conventional-layout-guidelines.md),
[board assemblies](board-assemblies.md), and
[advanced skill contracts](advanced-flipper-skills-spec.md). This plan intentionally
omits a pop cluster and upper flipper to prioritize open, readable shots.
