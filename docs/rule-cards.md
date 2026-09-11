# Table rule cards

Every built-in table has a Rule card toggle in the game sidebar
on Game and Physics. It replaces feature counts and table-description metadata.
It uses the same native details/summary disclosure arrow, typography and focus
style as Settings; its label remains “Rule card” when expanded.
The card expands inline in the sidebar, which scrolls independently on desktop;
there is no button or overlay on the canvas. Escape closes the card when focus
is on its button or content. The button exposes its expanded state and controls
the labelled card region. Switching tables closes it and replaces its contents.

Cards describe implemented scoring, ball counts, objectives and bonus collection.
Content lives in `src/boards/table-rule-cards.ts`, separate from physical board
geometry and runtime rules. Update it alongside scoring changes. Harlem currently
uses default direct scoring, so its card explicitly identifies that limitation.
Every selectable table must have a distinct card; tests enforce table coverage.

The card uses normal document flow and inherits the borderless sidebar styling.
It does not measure or resize the canvas. Its interactions cannot spawn a sandbox
ball or trigger the canvas touch controls.

Opening the card suspends simulation through the loop's `suspended` flag. Frames
continue rendering and updating their timestamps, so closing does not fast-forward.
This suspension is separate from debug pause, speed and pending single steps;
closing the card preserves those settings. Rule-card keydown events do not reach
game controls; keyup events remain available to clear already-held controls.

Validation: content/toggle tests, full test suite, build and lint; browser review
of all five cards, mobile Harlem layout, and Escape closing on Game and Physics.

## Scoring audit — September 10, 2026

The five cards were compared with the registered board definitions, active rules
scripts, shared rules lifecycle, and existing scoring/multiball regression tests.
They are largely accurate summaries of this implementation, not complete rulebooks
or claims of original-machine fidelity.

| Table          | Result                                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classic        | Lane completion award, bonus additions, ball count and drain payout match. The drop target has a lower-cap quirk described below.                                                                                                                         |
| Andromeda      | Guard/lock/release sequence, 2× multiball scoring, lane shifting, 10× multiplier cap, bank awards and 80,000 bonus cap match. Clarified collection of the lit extra ball in the right inlane and the 100,000-point special in the right outlane.          |
| Double Crossed | Both-bank qualification, 5,000 lock, replacement plunge, distinct-spinner jackpot qualification, 10,000–20,000 jackpots and final-drain handling match. Top-lane multiplier has the lower-cap quirk below. Jackpot progression resets for each multiball. |
| Harlem         | Three balls, saucer values, drop and standup values, and direct-scoring limitation match the default rules and board values.                                                                                                                              |
| Starlight      | Five balls, STAR awards, spinner values, rising observatory awards, bonus cap and once-per-game extra ball match. Clarified STAR must be completed during the same ball as collection.                                                                    |

Known gameplay discrepancy: `increaseBonusMultiplier` clamps the result to the
caller's cap even if the current multiplier is already higher. Thus Classic's
drop target reduces 4× or 5× to 3×, and Double Crossed's top-lane completion reduces
3× to 2×. The cards now explicitly disclose this instead of promising an increase.
This audit does not change gameplay. A future gameplay fix should preserve the
higher multiplier and update the cards and characterization tests together.

`tests/rule-card-scoring.test.ts` checks all advertised starting ball counts,
Harlem's direct awards, and both lower-cap discrepancies. Existing Andromeda,
Starlight and Double Crossed multiball tests cover their main feature sequences.
This audit does not prove every possible event ordering or physical shot.

Switchyard adds the sixth card. It describes directed orbits, five-route lock
qualification, different-shot combos and four jackpots leading to a Super.
See [Switchyard](switchyard-spec.md) and its rules/layout regression tests.

## Keyboard controls

Every rule card includes the same keyboard controls below its table rules:
left/right flipper alternatives, hold/release Up Arrow to plunge (or start a
new game), and Z / slash / Space nudges. The canvas no longer shows keyboard
instructions; plunger strength and game-status feedback remain on the canvas.
