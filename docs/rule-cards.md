# Table rule cards

Every built-in table has a bottom-left Rule card button on Game and Physics.
The compact toggle has a 24-pixel minimum height, 10-pixel text and narrow padding
to leave the lower playfield visible. It toggles a readable, scrollable card above it. Escape closes the card
when focus is on the button or card. The button exposes its expanded state and
controls the labelled card region; the card can receive keyboard focus to scroll.
Switching tables closes the card and replaces its contents.

Cards describe implemented scoring, ball counts, objectives and bonus collection.
Content lives in `src/boards/table-rule-cards.ts`, separate from physical board
geometry and runtime rules. Update it alongside scoring changes. Harlem currently
uses default direct scoring, so its card explicitly identifies that limitation.
Every selectable table must have a distinct card; tests enforce table coverage.

The DOM overlay tracks the displayed canvas with ResizeObserver. It is centered
in the same frame and anchored inside the actual table bounds, including when the
table is letterboxed. Only the card and button intercept pointer events; clicking
them cannot plunge, flip, or spawn a sandbox ball. Narrow cards scroll vertically.

Opening the card suspends simulation through the loop's `suspended` flag. Frames
continue rendering and updating their timestamps, so closing does not fast-forward.
This suspension is separate from debug pause, speed and pending single steps;
closing the card preserves those settings. Rule-card keydown events do not reach
game controls; keyup events remain available to clear already-held controls.

Validation: content/toggle tests, full test suite, build and lint; browser review
of all five cards, mobile Harlem layout, and Escape closing on Game and Physics.
