# Post passes and connected lower slings

A post pass starts from a cradle: briefly release the source flipper, then
raise it again while holding the receiver. The ball rebounds off the nearby
lower sling post and crosses to the receiver using passive rubber, without
an active sling kick, nudge, or scripted velocity.
See [Pinball News's demonstration](https://www.pinballnews.com/learn/skills/index.html).

## Geometry

Each lower sling post mounts at its inner return arc's exit. Moving the
flipper or return therefore moves the sling with it. Conventional returns use
148 outer radius, 72 lane width, 174 bend rise, and 32 heel offset. The inner
radius is 76 and its exit angle offset is 0.15 radians: the lower post sits
43.36 units outward and 98.85 units above its flipper pivot.

From its lower post, the active face extends upward and outward, so its
contact normal points inward and upfield. Its left angle is 1.25 radians;
the right is its reflection, 2π − 1.25. Face length is 144 on Classic and
foundation tables, and 100 on Harlem to keep its upper-left sling below the
common lane-mouth baseline. The body fills the space back to the return wall.
An upper rubber edge joins the lane-mouth post to the upper sling post without
a ledge that could trap a ball.

Rubber radius is max(8, height × 0.28): 14 on conventional tables, 11.2 on
Andromeda's right sling, and 15.68 on Harlem. These are deliberate 2D playability
dimensions, not measurements of original hardware.

SlingshotDefinition.backOutline stores a local back boundary after
the two face endpoints. Connected outlines use their authored angle, without
the legacy nearest-flipper heuristic. Optional rubberEdges identifies
additional passive rubber segments; face edge 0 is always rubber. Collision
resolves the union of the solid body and rounded rubber with one contact,
avoiding separate face/post impulses. Only the front face's interior can fire.

Rendering, physics overlay, spawn exclusion, and analysis share this outline.
Return rails remain at playfield height. Analysis recognizes shared return
boundaries and coincident mounting posts while still warning about a guide
crossing an active face.

## Supported transfers

| Table | Transfers |
| --- | --- |
| Classic, Double Crossed, Mirror Match, Starlight EM | Left ↔ right |
| Harlem Globetrotters | Upper-left → right; right → lower-left |
| Andromeda | Right → left |

Harlem retains both left flippers on the same input, its centered drain, and
level lane mouths. Slings now follow the staggered return flippers rather than
sharing an arbitrary height. The lower-left flipper has no adjacent sling post
and is not promised a post pass. Andromeda keeps its open left field and
separate original left-side sling. Its inlane rollover moves to x=754 to stay
centered between the new return walls.

## Acceptance

The post-passes tests settle a ball with the shared held-flipper solver, then
release/re-flip using ordinary inputs at 120 Hz. Every listed transfer must
touch its source's lower post, fire no sling, and remain caught on the receiver
for 0.5 seconds. Releases of 3, 4, and 5 frames (25–42 ms) must all succeed.
Classic also rejects zero-release and late-release controls. These are
regression samples, not a claim that all human inputs succeed.

Geometry regressions check return-post joins, round-post rebound equivalence,
filled-body collision, independent cloning, and detection of crossing guides.
Existing tests retain all nine inlane feed velocities, held catch/release,
outlanes, and center drains. Required checks are make test, all-table deep
validation with fail-on-warnings, make playtest-classic, make build, and make lint.

Browser review inspects each lower third with the physics overlay, replays
transfers at normal speed, and checks center and inlane drops. Automated
timing sweeps complement that review; they do not prove every possible shot.

## Verification record

The implementation passes 300 tests, production build, lint, and all-table
deep validation with zero errors or warnings. The initial rollout's browser
replays covered transfers, held inlane catches/releases, and center drains on
all six tables. The orientation correction was reviewed with the physics overlay
on Classic and Harlem, with the full transfer and feed regressions rerun.
Classic's 76-run playtest has no non-finite states or bounds escapes;
its remaining speed-threshold observations are recorded in
[classic-playtest.md](classic-playtest.md).

The face-orientation regression explicitly requires an inward horizontal normal
and a negative vertical normal (upfield). This prevents a mirrored-looking
assembly from accidentally kicking downward while its post-pass tests still pass.

The final 300-test run used one worker after parallel worker timeouts; no
repository test thresholds were changed.
