# Andromeda (Game Plan, 1985)

Andromeda is a playable, single-player recreation built from the shared 2D
components and rules engine. It is available in Game and Physics as `andromeda`.
It includes a physical lock, replacement serve, and two-ball multiball.

## References and layout

- [Original flyer](https://www.gameplanpinball.com/flyers/andromeda.jpg)
- [Playfield photographs](https://www.gameplanpinball.com/images/andromeda_pinball.jpg)
- [Rules of play](https://www.gameplanpinball.com/machine-andromeda-rulesofplay.html)
- [Multiball sequence and strategy](https://www.colorado-pinball.com/wp-content/uploads/2018/08/Andromeda.pdf)

The 1000 × 1800 layout preserves two lower flippers, three upper bumpers and a
fourth lower-left bumper, three top rollover lanes, two diagonal three-drop
banks, a separate drop guarding the left lock saucer, a left spinner, yellow
release standup, and two right-side advance lanes. The original has no left
inlane/outlane pair: a curved cabinet boundary feeds the open left lower field.
Only the right side has the conventional inlane/outlane assembly. Do not replace
this asymmetry with the default paired lower assembly.

The lower flippers are 120 units long, with a ball-sized center drain. Both have
nine held catch/release feed samples. The left samples are direct open-playfield
feeds, not an invented inlane. The passive right feed may cross the lower court
when unheld; it is validated against a lower-court region, while holding right
must catch and release every sampled entry speed. This exception is intentional:
there is no left return assembly to rebound passive cross-court feeds back.

The guard and lock form a narrow physical channel. The first straight shot drops
the guard; another reaches the cup. Guard-down state persists while a replacement
ball is served, so the released ball has an unobstructed exit. The ordinary
physics-only saucer still ejects after its dwell; the Game rules convert its
capture into a persistent lock.

Coordinates, cabinet curves, and return shapes are estimates adapted for our
ball size. The warm starfield, orbital linework, inserts, and labels are original
vector artwork rather than scans of the original art or a ROM emulation.

## Player rules

- Shoot the left guard, then the lock saucer. The lock scores 30,000 and serves a
  replacement without consuming a turn or resetting targets/bonus.
- Hit the middle yellow RELEASE target with the replacement ball to eject the
  locked ball. Both balls remain live; playfield awards are doubled until one
  drains. The last live ball's drain collects bonus and ends the turn.
- Top lanes score 3,000 and add 1,000 bonus. Complete A/B/C to advance the bonus
  multiplier up to 10×. Each right-flipper press rotates the collected lights;
  holding the button does not repeatedly rotate them.
- The two three-target banks score 3,000 per drop and advance bonus. Completing
  all six awards 50,000, resets those six physical drops, and raises the spinner
  from 100 to 1,000, then by 1,000 per completion (capped at 10,000).
- Completing the left or right bank lights its respective right-side advance
  lane for 20,000 and three bonus advances. Collecting it clears that lamp.
- Second full-bank completion qualifies an extra ball at the right return;
  third qualifies a special at the right outlane; fourth and later completions
  award a special. Specials award 100,000 points here rather than credits.
- Standups score 1,000 and power the bumpers from 100 to 1,000. Slings score 30.
  The separate guard scores 5,000 and advances bonus.

The HUD shows lock/multiball status, spinner value, and bonus; inserts show the
release target and lane qualifications. The table selector includes the basic
multiball instructions. Reset ball restarts the current turn's features while
keeping the game score and turn number.

## Fidelity limits

This implements the characteristic shot/rule progression, not every operator
setting. The exact original spinner increments and changing guard-target lit
values are not specified by the available rules text; the spinner schedule above
is our explicit implementation, and the guard uses its base award. Bonus caps at
99,000. Extra balls add a playable turn; the displayed ball number remains capped
at three. No multiplayer lock stealing, credit/replay accounting, match sequence,
high-score persistence, tilt/slam electronics, original sounds, or original art
is emulated. A drain while a ball is locked ends the single-player turn and clears
the lock for the next turn. No invented left outlane is used to simplify feeds.

## Acceptance

`tests/andromeda.test.ts` exercises the two-shot guard/lock sequence, replacement
serve, yellow-target release into real multiball, doubled awards, loss of one
ball, lane shifting, physical bank reset, extra-ball qualification, and manual
reset. Shared multiball tests cover ownership, timers, contacts, and final drains.
Route contracts cover launches, both held feeds, right outlane and center drains,
spinner continuation, and each bank target's approach/return. The guarded lock
requires the stateful two-shot test instead of an unguarded capture route.

```sh
make test
make validate-table TABLE='--all --deep-playability --fail-on-warnings'
make build
make lint
```

In the browser, inspect the open left side, full board fit, readable shot labels,
and Game HUD; Physics intentionally omits scoring/lock rules. These sampled tests
do not establish that every incoming trajectory is catchable or every shot easy.
