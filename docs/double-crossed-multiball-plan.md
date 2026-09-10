# Double Crossed: Cross Lock proposal

Status: proposed design; gameplay and geometry are not implemented yet.

## Player sequence

1. Complete each two-standup CROSS bank once during the current ball. Keep the
   existing bank awards and lit-spinner scoring. Separate completion lamps latch
   each bank's contribution even though its individual target progress resets.
2. Both completion lamps light CROSS LOCK. Shoot a new saucer between the banks,
   below the pop cluster. It scores 5,000 and physically holds one ball. Unlit
   captures score 1,000 and eject normally.
3. A replacement ball appears in the shooter lane. The locked ball remains
   visible. Bonus, progress, ball number and balls remaining are preserved.
4. Plunge the replacement ball to release the lock and start two-ball multiball.
   This uses the ball-launched event, so no additional release target is needed.
5. During multiball, register a spin on each of the two different spinners to
   light CROSS JACKPOT. Repeated revolutions on one spinner cannot complete both
   sides. Shoot the saucer to collect 10,000, then relight via both spinners for
   another collection worth 15,000, then 20,000 maximum for that multiball.
6. At one live ball, multiball and uncollected jackpot progress end. Continue the
   same numbered ball. Recomplete both banks to qualify another lock. Only the
   final live ball's drain collects bonus and advances the turn.

The drop pair and top lanes retain their existing awards and multiplier role.
Spinner qualification is fresh at multiball start and after each jackpot; spins
before multiball cannot preload a jackpot. A jackpot saucer capture ejects normally
and never locks another ball. Multiball bank hits still score normally but do not
prequalify the next lock. New lock qualification begins at multiball end. Award
values are initial tuning values, subject to play review.

## Physical layout

Use a connected saucer-pocket assembly in the open central space around
(450, 590–620), between the angled banks and below the pops. This is a candidate
placement, not a validated coordinate. The central objective complements the
existing left/right orbit shots. Its downward mouth must accept aimed shots from
both flippers and its angled eject must clear the bank backings, center rebound
post and flipper-tip drain line. Tune the eject through simulated trajectories;
do not use a guaranteed catch or teleport to a flipper.

Keep both spinner orbits, lower slings, inlanes, outlanes and the center drain.
Check whether the center rebound post obscures too much of the new shot before
considering moving it. Do not move the lower flippers to accommodate the lock.
Preserve the existing post-pass, bump-pass and catch contracts.

## Presentation

Add two CROSS completion inserts, a LOCK arrow at the saucer, and left/right
spinner jackpot inserts. The saucer legend changes between 1,000, LOCK 5,000,
and the lit jackpot value. While a ball is held, show “Ball locked — plunge for
multiball.” During two-ball play, show which spinner remains or “Shoot Cross
Jackpot.” Keep the top canvas HUD limited to score and ball number; put feature
information in playfield inserts. Update the rule card with the complete sequence.

## Implementation and validation

Reuse `lockCapturedBall`, `releaseLockedBalls`, ball-ball contact, and existing
multiball drain handling. Extract Double Crossed's script into a focused rules
module. Use ball-scoped phase/progress and distinguish bank-completion lamps
from repeatable bank switch masks. Only consume qualification after lockBall
succeeds; only enter multiball after releaseLockedBalls returns one. Enforce one
locked ball and at most two live balls. A reset/new game clears lock and mode.

Add a connected pocket with scoring, approach and eject route contracts. Cover:

- Partial/repeated bank hits, both completion orders, unlit capture/eject and a
  real physics capture/lock rather than a fabricated saucer event alone.
- Visible occupied cup, replacement serve, unchanged ball count/bonus, weak and
  full replacement plunges, exactly one release, and no duplicated balls.
- Independent spinner switches, multiple revolutions, jackpot collection/cap,
  repeat jackpots, occupied-cup collisions and no relock during multiball.
- One-ball loss, simultaneous drains, last-ball multiball, qualification reset,
  reset while locked and reset during multiball. No early bonus collection.
- Full layout and route regressions, all-table deep validation, build/lint/tests,
  and browser play reviewing shot access, lock visibility, eject safety, and
  state-dependent instructions.

Do not require broad physics changes unless integration tests expose a shared
bug. The desired outcome is a readable, repeatable two-ball feature using actual
ball storage and the table's existing paired shot families.
