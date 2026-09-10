# Table rule cards

Every built-in table has a Rule card toggle directly beneath the table selector
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
