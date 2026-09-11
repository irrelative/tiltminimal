# Switchyard

Switchyard is an original three-ball, single-plane table with five fan shots,
short combos and a one-ball lock for two-ball multiball. Select it from the gallery
or directly at `?table=switchyard`. It uses the shared settings, local high scores,
mechanical audio and rule-card UI.

## Physical layout

The 1000 × 1400 cabinet uses the foundation's two flippers, connected slings,
close post-pass posts, and paired inlane/outlane returns. No pop cluster, extra
flipper, central rebound post, low target bank, ramp, tunnel or overpass is used.
All guides are physical playfield guides. The open shot area above the slings
has no added scoring obstacles; lane entrance posts remain at the sides.

Switchyard owns its assembly composition in `src/boards/tables/switchyard.ts`.
Just One More continues to use `open-fan-table.ts`; its complete compiled board
and rules script are protected by a pre-redesign SHA-256 regression baseline.
The foundation, launcher, gate relief and lower assemblies retain their prior
geometry. The redesign changes the upper shots, not shared physics.

- **West Express:** a long outer orbit with the only spinner, at (145,690).
  Its inner left quadrant retains center (450,506), radius 260. Sixteen connected
  quadratic-curve segments extend the top to (840,506), then a vertical and
  diagonal return join the East outer wall at (760,690). This gives West a
  separate right-side return outside East's loop. The upper-right rail must
  remain clear of the cabinet deflector; an earlier narrow return wedged balls.
- **East Express:** a compact horseshoe at (650,430), with outer radius 110 and
  inner radius 50. Its right entrance lies between x=700 and x=760; the inner
  mouth flares toward (650,750). Its left leg exits between x=540 and x=600 at
  y=620. Both ends return to the right half of the open field. Completing the
  loop in either direction counts the same East route. There is no East spinner.
- **Cargo:** three drop targets at (260,560), (295,620), (330,680), set along a
  roughly 60-degree bank with a continuous backing. Individual targets stay
  down until all three are hit, then the bank resets. This is the lower bank.
- **Signal:** two standups at (490,490) and (500,555), along a steeper roughly
  81-degree bank beside the loop. Keeping the targets outside the horseshoe's
  center avoids an enclosed pocket above a target backing. Signal sits higher
  and farther right than Cargo.
- **Dispatch:** recessed left of center at (360,360), with a 28-unit cup,
  48-unit pocket, 35-unit throat, and 100-unit-deep mouth flaring to 80 units
  either side. Shots approach diagonally from the open field. The 640-unit/s
  eject at 1.25 radians clears the pocket into x=380–500, y=510–660.

West switches are (140,550), (450,170), and (863,550), indices 0/1/2.
East uses (730,610), (650,350), and (570,570), indices 5/6/7. The skill-shot
switches retain indices 3/4. These non-solid switches are hidden in normal
artwork and visible with the physics overlay; labeled inserts identify the
full orbit, short loop, three drops and two standups.

The lower assembly retains 320-unit pivot spacing and 136-unit flippers. Its
resting tip-edge clearance is 42.75 units for a 32-unit ball, a deliberate
10.75-unit margin. Center-drain routes at x=445/450/455 exercise two downward
speeds without flipper contact. No scoring obstacle extends below y=760.

## Rules

- Three balls. Network qualification, bank progress and bonus reset each ball.
- A complete West orbit or East loop scores 2,000 and connects its route. Drop
  all three Cargo targets or hit both distinct Signal standups to connect that
  bank and score an extra 3,000; individual target hits score 500. Ordinary Dispatch captures score 2,000
  and connect Dispatch. Spinner pulses score 100.
- All five connected routes light Dispatch lock. A subsequent capture locks the
  ball. Dispatch completing the fifth route ejects normally; it does not also lock.
- Plunge the replacement to release the lock and start two-ball multiball on the
  same ball number, preserving bonus. No extra release shot or timed ball save.
- During multiball, each Express completion and any target in each bank award
  that shot's 10,000 jackpot once, in addition to ordinary shot scoring. All four
  collected light a 50,000 Super Jackpot at Dispatch. Super collection clears
  the four jackpot flags and raises the Cargo drops so each can be collected again.
  Cargo also resets when multiball starts and when all three drops are down. Unlit Dispatch pays
  2,000; it cannot relock during multiball.
- Outside multiball, completing a different Express orbit or target bank within
  four simulation seconds awards a 2,000 combo. Each completed orbit/bank starts
  a fresh window; repeating the same shot does not award a combo. Dispatch and
  drains clear it. Pausing freezes simulation time.
- Completed orbits/banks and ordinary Dispatch captures add 500 bonus; in
  multiball, bank hits also add 500. Bonus caps at 20,000 and pays at 1× only on
  the final live-ball drain. No extra-ball or multiplier ladder.
- One live ball remaining ends multiball and clears network/bank/jackpot progress.
  The remaining ball continues. Simultaneous drains pay bonus and advance once.
  Reset clears locks, mode state and qualification.

## Event identity and orbit recognition

Physical switch events now include an optional `ballId`, assigned from the
responsible ball in the shared physics loop. Each live ball keeps its identity
through cloning, lock/release and promotion after another ball drains. New
replacement balls receive a distinct ID. Older scripts can ignore this metadata.

West requires 0 → 1 → 2; East requires 5 → 6 → 7 or 7 → 6 → 5.
Each complete sequence must occur within five
simulation seconds, all from the same ball. Spins, repeated entrances, missing
top crossings, expired sequences and interleaved partial sequences from two
balls do not qualify. Captures and turn/multiball transitions clear tracking.
The rules deliberately do not infer identity for switch events without ball IDs.

A rollover can declare `approachAngle` for geometry validation (radians, default
upward). The top orbit switch approaches horizontally; this avoids assuming all
top rollovers are shot from below. Optional `approachDistance` sets a local
straight tangent sample for a curved lane: 60 units at East’s crown and 50 at
the skill exit. It must be finite and at least one ball diameter. Full simulated
route contracts still verify traversal of the curves. Neither annotation changes
collision or scoring, and a blocking guide across the sample still fails validation.

## Validation and shot samples

`tests/switchyard-layout.test.ts` uses actual held cradles and release/re-flip
inputs. At a fixed 240 Hz step, release/re-flip samples demonstrate:

| Objective            | Source flipper | Release frames               |
| -------------------- | -------------- | ---------------------------- |
| Cargo lower drop     | Left           | 128, 129                     |
| Cargo middle drop    | Left           | 130, 131                     |
| Cargo upper drop     | Right          | 104, 105                     |
| Signal upper standup | Left           | 192, 193                     |
| Signal lower standup | Left           | 196, 197                     |
| Dispatch             | Left / right   | 189, 190 / 195, 196          |
| West Express         | Right          | 217, 218                     |
| East Express         | Left           | 214 (reverse), 218 (forward) |

The expected shot must be the first major scoring objective reached. These are
reproducible opportunities, not auto-aim or promises for every frame rate/feed.
East remains a tight precision shot, with separate tested timings for its two
entrances. Local routes additionally check West and both East directions at
2,000/2,200/2,400 units/s. West and forward East must return to x=180–720,
y=800–1130. Reverse East spills farther right, into x=620–780, y=720–850
above the inlane/sling, and can produce a fast, risky rebound. Its contract
checks that distinct open-field exit; it does not promise a catch or safe drain.

Rules tests cover false orbit rejection, identity, timers, distinct targets,
physical lock/replacement launch, jackpots, Super relight, individual/simultaneous
drains, bounded bonus, reset and game over. Shared all-table tests cover passive
and held feeds, post/bump passes, dead bounces, live/drop catches and slap saves.
Run the complete suite, build, lint, and all-table deep validation. Browser review
must include desktop/mobile, rule cards, and the physics overlay; simulation
sampling is not a complete proof of every shot or a difficulty assessment.

## Plunge-gate relief opening

Switchyard retains the fan layout's 410-unit inner shooter arch stops 0.14 radians before
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

## September 2026 redesign verification

All 525 tests pass, including real cradle shots, Cargo reset/qualification,
East traversal identity, lock/multiball, skill shots, the Just One More baseline,
and all-table advanced-move regressions. Build and ESLint pass. All seven
built-in tables pass deep CLI validation with zero errors or warnings.
Browser review covered desktop and 390 × 844 mobile artwork and the rule card.
In the physics sandbox, a center drop drained; the left and right inlane drops
settled at approximately (301,1184) and (599,1184), with zero velocity while
held, and moved off their flippers when released. These samples establish
working opportunities, not a guarantee against every possible pinball trap.
