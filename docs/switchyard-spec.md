# Switchyard

Switchyard is an original three-ball, single-plane table with five fan shots,
short combos and a one-ball lock for two-ball multiball. It adds a sixth gallery
entry (`?table=switchyard`) and uses the shared settings, local high scores,
mechanical audio and rule-card UI.

## Physical layout

The 1000 × 1400 cabinet uses the foundation's two flippers, connected slings,
close post-pass posts, and paired inlane/outlane returns. No pop cluster, extra
flipper, central rebound post, low target bank, ramp, tunnel or overpass is used.
All guides are physical playfield guides. The open shot area above the slings
has no added scoring obstacles; lane entrance posts remain at the sides.

Left to right: West Express, the two-target Cargo bank, Dispatch saucer, the
two-target Signal bank, East Express. The banks start at (270,550) and (640,550)
with their second targets 40 units inward and 60 downward. Their short backings
remain above the open field. Dispatch is recessed at (480,380), above both banks,
with a 28-unit cup, 48-unit pocket, 35-unit throat and 100-unit flared mouth.
It ejects at 640 units/s at 1.75 radians into the region left of its mouth.

The Express entrances open into one continuous upper U-shaped orbit. Its inner
arc has center (450,506), radius 260; the outer boundary follows the shooter's
410-unit inner arch. Flares end at (280,740) and (620,740). The launch ball travels
outside the orbit's outer boundary before joining its left return. A short
connected divider keeps orbit shots inside that boundary, so they cannot enter
the shooter channel and bounce off the closed one-way gate. Deflectors on both
sides turn downward returns back toward the open playfield. No wall crossing or
raised-guide exemption supplies these connections.

Surface switches at (140,550), (450,170), and (800,550) detect ordered orbit travel.
Their trigger circles are hidden in normal artwork, visible in the physics
overlay; printed arrows and labels identify shots. Spinners at (145,690) and
(755,690) provide scoring contact but do not themselves count a completed orbit.

### Deliberate refinements from the plan

The saucer moved higher to remove passive traps beside its backing. The orbit
mouths were widened and the launcher return connected with a deflector, rather
than accepting a full plunge that immediately followed the outlane to a drain.
The lower assembly retains its established 320-unit pivot spacing and 136-unit
flippers to preserve its feeds and advanced transfers. Its measured resting
tip-edge clearance is 42.75 units for a 32-unit ball, a 10.75-unit margin rather
than the plan's preferred 20-unit margin. This intentional exception retains an
unobstructed ball-sized drain, verified at x=445/450/455 and two downward speeds.
The central open area is between the existing lower assemblies (approximately
x=240–660), not through the right inlane post at x=718 as the initial envelope
would have implied. No new lower-middle obstacles were added.

## Rules

- Three balls. Network qualification, bank progress and bonus reset each ball.
- A complete directed Express orbit scores 2,000 and connects its route. Hit both
  distinct standups in Cargo or Signal to connect that route and score an extra
  3,000; individual standups score 500. Ordinary Dispatch captures score 2,000
  and connect Dispatch. Spinner pulses score 100.
- All five connected routes light Dispatch lock. A subsequent capture locks the
  ball. Dispatch completing the fifth route ejects normally; it does not also lock.
- Plunge the replacement to release the lock and start two-ball multiball on the
  same ball number, preserving bonus. No extra release shot or timed ball save.
- During multiball, each Express completion and either target in each bank award
  that shot's 10,000 jackpot once, in addition to ordinary shot scoring. All four
  collected light a 50,000 Super Jackpot at Dispatch. Super collection clears
  the four jackpot flags so each can be collected again. Unlit Dispatch pays
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

Switchyard requires entrance → top → opposite exit, in that order, within five
simulation seconds, all from the same ball. Spins, repeated entrances, missing
top crossings, expired sequences and interleaved partial sequences from two
balls do not qualify. Captures and turn/multiball transitions clear tracking.
The rules deliberately do not infer identity for switch events without ball IDs.

A rollover can declare `approachAngle` for geometry validation (radians, default
upward). The top orbit switch approaches horizontally; this avoids assuming all
top rollovers are shot from below. It does not change collision or scoring
behavior, and blocking guide paths still fail validation.

## Validation and shot samples

`tests/switchyard-layout.test.ts` uses actual held cradles and release/re-flip
inputs. At a fixed 240 Hz step, neighboring release timings demonstrate:

| Objective           | Source flipper | Release frames      |
| ------------------- | -------------- | ------------------- |
| Cargo lower target  | Left           | 129, 130            |
| Cargo upper target  | Right          | 172, 173            |
| Signal lower target | Left           | 121, 122            |
| Signal upper target | Right          | 155, 156            |
| Dispatch            | Left / right   | 192, 193 / 183, 184 |
| East Express        | Left           | 217, 218            |
| West Express        | Right          | 217, 218            |

The expected shot must be the first major scoring objective reached. These are
reproducible opportunities, not auto-aim or promises for every frame rate/feed.
The Express shots are deliberately late-release precision shots. Local orbit
routes additionally test both directions at 2,000/2,200/2,400 units/s and require
an ordered traversal followed by return to the open lower playfield.

Rules tests cover false orbit rejection, identity, timers, distinct targets,
physical lock/replacement launch, jackpots, Super relight, individual/simultaneous
drains, bounded bonus, reset and game over. Shared all-table tests cover passive
and held feeds, post/bump passes, dead bounces, live/drop catches and slap saves.
Run the complete suite, build, lint, and all-table deep validation. Browser review
must include desktop/mobile, rule cards, and the physics overlay; simulation
sampling is not a complete proof of every shot or a difficulty assessment.

Final verification: 428 tests passed, production build and ESLint passed, and
all six tables passed deep CLI validation with zero errors or warnings. Browser
review covered the six-table gallery, direct Switchyard selection, rule-card
content, desktop artwork, the 390 × 844 mobile breakpoint, and a stepped center
drain with the physics overlay. Feed/held-release and advanced-skill verification
uses the shared simulation regression suites described above.
