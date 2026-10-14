# Tactics Lab

Tactics Lab is selectable in Game and Physics Sandbox (`?table=tactics-lab`).
Its open upper field has no bumpers, standups, drop targets, spinners, saucers,
rollovers or powered slings. It retains two flippers, a shooter, cabinet walls,
connected inlanes/outlanes and passive rubber posts. This is an intentional
exception to the conventional active-sling and scoring-objective requirements.
It uses ordinary shared physics and three-ball rules, with no scoring goals.

## Geometry

The 900 × 1400 cabinet has a flat upper roof and a sloped shooter exit. The
return gate slopes toward the field so slow returning balls do not balance on
it. Lower pivots are (244, 1220) and (564, 1220), with Classic's validated
136-unit tapered bats and explicit upper heel joins. Returns have 148/76-unit
outer/inner radii, 177-unit bend rise and 320-unit entry rise. Each inlane keeps
its nine-speed passive feed, held catch/release and outlane/center drain routes.
The plunge route requires entry into the empty upper field.

Lower passive posts sit 30 units outward and 80 above each pivot, at the inner
return extension. They have radius 8. A 14-unit post at this location leaves
less than a ball diameter between it and the outer return near the bottom
entrance. The smaller post permits a short Shatz lob and still supports physical
post passes. Tests prove these moves with normal controls; no tactic receives
special impulses, changes to physics parameters, or a ball reposition after
simulation starts.

## Running the contracts

```sh
make playtest ARGS='--suite tactics --output playtest-results/tactics'
make playtest ARGS='--table tactics-lab'
make validate-table TABLE='tactics-lab --deep-playability --fail-on-warnings'
```

The default `make playtest` suite is now `all`: seeded games and lip sweeps on
all tables, plus the Tactics Lab contracts. `--suite both` preserves the former
game-plus-lip behavior. `--suite tactics` runs only the lab; other explicit table
IDs are rejected because these calibrated tactic contracts belong to this
fixture, not every table. The existing full-table skill regressions remain.

The fixed 120 Hz tactic suite contains 60 cases: 34 intended successful move samples and
26 expected-miss controls, in both directions. Passing a control means the
selected timing correctly fails to perform the move. These bounded recipes
establish physical opportunities, not broad timing windows, human ease of play,
or success from arbitrary incoming balls. Deep presets expand games/lip feeds;
they do not change the fixed tactic contracts.

| Tactic          | Required observation                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dead bounce     | Two incoming speeds reach the opposite flipper without pressing a flipper or nudging; no lower-post contact.                                                                                                                                                                                                                                                |
| Held catch      | Three incoming speeds settle on the held upper face for at least 0.5 seconds, then depart without a nudge on release.                                                                                                                                                                                                                                       |
| Live catch      | Three incoming speeds meet the timed upstroke, set the live-contact marker and drop below 100 units/s at first contact; supported catch and release follow. Early/late timing controls retain fast impacts without a live catch.                                                                                                                            |
| Drop catch      | Three incoming speeds contact the retreating bat within three 120 Hz frames of release, first contact below 400 units/s and subsequent minimum below 300; no live-contact marker. Early release keeps a fast impact.                                                                                                                                        |
| Post pass       | Release/re-flip a settled cradle for 12 or 13 frames, make a measured normal impulse on the source's passive post, then hold the receiver for 0.5 seconds and release. Zero- and 20-frame controls do not make the required post-assisted transfer.                                                                                                         |
| Bump pass       | Release the source and apply one forward nudge after 27 or 29 frames. No source re-flip or lower-post contact; supported receiver catch and release. The unnudged control must miss.                                                                                                                                                                        |
| Short Shatz lob | From a physically settled cradle, release for 46 or 47 frames and tap for two frames. Require an actual powered source contact, upward and downward crossings of the opposite curved inlane, no lower-post contact, receiving-flipper rebound or upper-wall assistance before entry, and a supported receiver catch/release. The no-flip control must fail. |

The Shatz check is explicitly a **short lob into the lower curved return**. It
crosses a ball-clear corridor 60 units above the receiver pivot, with bounds
computed from the post and outer return surface. It does not prove a shot up a
full-height inlane or through a rollover. Upper-wall bank shots and direct
cross-flipper transfers cannot satisfy this contract.

Falling-ball samples start in valid free flight. Transfer samples begin from
cradles settled by two seconds of production physics; their initial overlap
with supporting rubber is legitimate. The runner uses `advanceGameFrame`,
observes contacts through optional physics tracing, and validates catch support
with the same profile helpers as the existing skill tests. Automatic release
probes are included in the recorded inputs. Rules reset after a drain cannot
be mistaken for a receiver catch; a drain during the release probe counts as
successful departure.

## Results and replay

Each case appears in `report.json` and `report.md`, with metrics, assertion
failures and a local replay path. All 60 success/control/failure artifacts are
saved under `tactics/`; this bounded set is separate from the clustered issue
artifact limit. A missed positive contract or a successful negative control
produces a confirmed `tactic-failed` finding and a nonzero command exit.

Open `/benchmarks/playtest-review.html` and load local tactic JSON files. They
include the expected move/control, observed metrics and pass/fail result, plus
exact initial state, board, input timings and final hash. The viewer shows those
metrics alongside contact identities and motion. Replay verifies exact stepping;
rerun `--suite tactics` to evaluate the current engine's tactic assertions.
Reports establish recorded outcomes, not import-time revalidation of a label.

The direct-inlane distinction follows [Fun With Bonus’s description of a Shatz
pass](https://funwithbonus.com/new-pinball-dictionary-alley-pass-shatz-the-inlane/):
a controlled shot travels beneath the opposite sling toward its inlane switch.
The lab omits switches and asserts entry into the lower return instead.

## Known Shatz failure

The direct-inlane Shatz assertion currently fails on all four positive samples.
The ball hits the receiving flipper before entering its inlane, then bounces
upward. A check limited to inlane crossings and the eventual catch initially
misclassified these trajectories. The stricter observer records
`receiverBeforeEntry` and reports the failure instead of certifying a different
transfer. One saved trace contacts the receiver at frame 219 and crosses upward
into its inlane at frame 234. The same mistake cannot be hidden by changing a
pass/fail label or by successful no-input controls.

The 60-case suite has **56 passes and four confirmed Shatz failures**; its CLI
exit status is 1. Other six tactic types and the expected-miss controls pass.
The four positive Shatz expectations use explicit Vitest `it.fails` annotations,
so an unexpected success forces removal of the known-failure marker. A separate
observer regression confirms this specific receiving-flipper rebound. This does
not suppress the headless findings. Finding or repairing a direct Shatz trajectory needs further work; the lab preserves the production engine parameters.

All 753 Vitest tests (including the four expected failures), nine-table deep
layout/feed validation, production build and lint pass. The lab was reviewed in
the browser and its Shatz, post-pass and live-catch replays were inspected. Older
route validation passing does not override the failed tactic assertions.

The final isolated run executes 60 cases and 100.9 simulated seconds in 0.29
seconds locally, including JSON serialization and exact replay verification.
Timing is a local measurement, not a performance guarantee.
