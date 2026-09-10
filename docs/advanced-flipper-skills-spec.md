# Advanced flipper skills

Every built-in table must provide the core control skills below through ordinary
flipper and nudge inputs. These are physical opportunities from suitable incoming
balls, not a command that performs a move, a guaranteed save, or an assertion that
every feed works. The same contact solver runs in Game and the Physics sandbox.

## Required skills

| Skill | Player action and expected outcome | Coverage |
| --- | --- | --- |
| Cradle / hold catch | Hold the flipper; a suitable return loses normal speed, rolls to the heel, and stays controllable. | Every flipper; all declared held feeds and release checks. |
| Controlled release shot | Lower a cradled flipper, let the ball advance, then flip. Release timing changes the outgoing shot. | Two different shot timings on every flipper reach 220 units upfield without an active sling kick. |
| Dead bounce / dead flip / bounce pass | Leave the source flipper down and let its rubber rebound send the ball toward an opposite flipper. | Every flipper, two incoming speeds, no flipper or nudge input and no powered sling. |
| Post pass | Briefly release and re-flip a cradle into the passive lower sling post, transferring to a held receiver. | At least one transfer on every table; existing multi-timing post-contact and stable-catch tests. |
| Live catch | Raise the flipper so a descending ball meets the end of the upstroke; absorb the impact and roll into a cradle. | Every flipper, three incoming speeds, early/late controls, stable catch and release. |
| Drop catch | Release a raised flipper as the descending ball arrives; the retreating surface reduces the rebound and leaves a slower ball to play. | Every flipper, three incoming speeds; compare with releasing too early. A drop catch is not an automatic held cradle. |
| Slap save | Time a lateral nudge and flip near a lower tip to return a marginal center-drain ball upfield. | Every table: the same feed drains without input and with the selected flip alone, but is saved by the timed nudge/flip. |

The distinction between a held catch and a live catch matters. An early raised
flipper may eventually cradle a ball, but that does not establish that its
end-of-stroke timing can kill an impact. Live-catch tests require first-contact
speed below 100 units/s, followed by a stable 0.5-second cradle; early and late
controls have substantially more residual speed.

## Table coverage and geometry

| Table | Cradles, shots, dead bounces, live and drop catches | Post-pass routes | Slap-save sample |
| --- | --- | --- | --- |
| Classic | Both flippers | Left ↔ right | Left lower tip |
| Double Crossed | Both flippers | Left ↔ right | Left lower tip |
| Mirror Match | Both flippers | Left ↔ right | Left lower tip |
| Starlight EM | Both flippers | Left ↔ right | Left lower tip |
| Harlem Globetrotters | All three flippers | Upper-left → right; right → lower-left | Lower-left tip |
| Andromeda | Both flippers | Right → left | Left lower tip |

Harlem's two left flippers share the left input. Dead bounces can reach a
different opposite-side receiver as incoming speed changes. Andromeda has no
conventional left return or adjacent lower-left sling post. Neither table gains
invented posts to make every direction identical. Every table offers the core
moves, with direction and opportunity determined by its actual geometry. See
[post passes](post-pass-spec.md) for the exact transfer timings and limitations.

## Shared live-catch contact model

The previous solver supported stationary held catches but could launch a ball
that arrived during the last part of the upstroke. Even a momentarily softened
impact could be kicked away by the remaining bat travel.

A live catch now requires all of the following:

- An engaged flipper still completing an upstroke, within 0.08 radians (4.6°)
  of its active stop; contact must also occur in that final angular region.
- Top-face contact between 15% and 85% of flipper length.
- Incoming normal speed over 200 units/s toward the bat, measured against the
  table, and total ball speed no greater than the existing 1100-unit/s limit.
  An outgoing shot or a slow cradle tap does not qualify.

The existing rolling-contact response absorbs normal speed and damps the
incoming tangential motion. A per-ball `liveCatchFlipper` contact marker lets
that ball follow the final bat motion and continue rolling toward the heel.
The marker does not steer a free ball: release, separation by more than four
units beyond contact, leaving the supported face, an underside contact, or
excessive speed clears it. It is independent for each multiball ball and is
preserved by normal state cloning. It does not lock the flipper or the ball.

This is a bounded 2D approximation of rubber/end-stop absorption. Ordinary
shots, passive restitution, nudge strength, and table geometry are unchanged.
Drop catches use the existing moving-surface solver; dead bounces use passive
flipper rubber. Neither receives a skill-specific impulse or velocity override.

## Additional techniques

Tap/flick passes, ski/rollover passes, alley passes (Shatzing), loop passes,
post catches, and multiball cradle separation are useful further techniques,
but are not universal acceptance requirements in this change. Their complete
outcomes depend on lane mouths, return momentum, particular posts or orbits,
and/or multiple balls. They should receive named trajectory tests before being
advertised as supported on a particular table. A successful post pass is not
used as proof of an unrelated tap pass. Airborne moves require a vertical ball
model that this 2D game does not have; death saves and bangbacks are outside the
core control contract.

## Regression scenarios and review

`tests/flipper-skills.test.ts` exercises full built-in board geometry. Falling
feeds start 65 units above the nominated face, clear of solids, with no spin:

- Dead bounce: 40% along the resting bat, at 400 and 600 units/s.
- Live catch: 65% along the raised bat, at 575, 600, and 625 units/s. Press after
  eight 120 Hz frames, or seven on Harlem's longer stroke. Compare zero-frame
  and 13-frame presses using the same feed.
- Drop catch: 20% along the raised bat, the same three speeds, release after
  ten frames. First contact must occur while the bat is retreating or reaching
  its lower stop, within three frames; residual speed is compared with an
  early-release control. The following 0.1 seconds must include speed below
  300 units/s, rather than counting an unrelated later rebound.
- Slap save: start 20 units inward of the resting tip and 80 above it at
  600 units/s. Nudge at frame six, flip at frame 12 (10 for Harlem's lower-left).

`tests/live-catch-contact.test.ts` checks release/separation/underside/fast-ball
rejection and per-ball ownership. Existing post-pass, inlane, center-drain,
underside-collision, multiball, and scoring-route regressions remain required.
Run `make test`, `make build`, `make lint`, all-table deep validation with
`--fail-on-warnings`, and `make playtest-classic` after shared contact changes.
Browser review must replay representative incoming feeds with the actual
renderer and input transitions. Automated trajectories establish those samples,
not a universal human timing window.

## Sources

[Jack Danger's Dead Flip tutorials](https://www.deadflip.com/tutorials/) identify
and demonstrate the major control techniques. [Pinball News, Skill Shots](https://www.pinballnews.com/learn/skills/index.html)
explains bounce passes, post passes, and drop catches. [Part two](https://www.pinballnews.com/learn/skills/index2.html)
describes raising the flipper into a timed catch and momentum-dependent flipper
passes. These are technique references, not numerical calibration data for our
solver thresholds.

## Verification record

All 368 tests pass with the normal `make test` command; production build and
lint also pass. All six tables pass
layout, geometry, and deep-playability validation without errors or warnings.
Browser review replayed live catches and releases on all 13 flippers, plus
representative dead bounces and drop catches on each table, using a temporary
harness with the actual renderer, collision overlay, and normal input changes.
The harness is not included in the shipped application.

The 76-run Classic playtest has no non-finite states, bounds escapes, or
unexplained near-rest beyond 0.02 seconds. It records 15 speed-review flags;
see [the playtest report](classic-playtest.md) for the remaining tuning limits.
