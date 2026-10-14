# First-game experience

All playable tables share screen-space launch guidance, Pause / Resume, and a
game-over panel. Physics retains its own sandbox controls. Table geometry,
scoring rules, and keyboard/touch mappings remain table-independent.

## Launching

When waiting to launch, show the current ball count and two brief instructions:
hold/release Up Arrow with left/right flipper keys; swipe down on the right,
hold/lift with lower-corner flipper holds. A locked ball gets a replacement-ball
message. Full controls, including nudges, remain in the rule card.

Clicking the launch panel dismisses it for the current ball; it also supports
Enter or Space when focused. Dismissal persists through pause/resume and plunger
charging. Hide it during a plunger pull and live play. Show it again when the
next ball needs launching, including a locked-ball replacement or reset. It is
positioned over the fitted table frame without changing canvas measurements,
aspect ratio, or the existing desktop/phone shell layout.

## Pausing

A button with a minimum 44-pixel height stays in the upper-right playfield frame.
Pause freezes physics, scoring, rule timers, and active analytics time while
rendering continues. The button changes to Resume and exposes its pressed state;
a central panel confirms the paused state.

Explicit pause and rule-card suspension compose. Closing a card preserves an
explicit pause. Resume clears explicit and debug pause and closes an open rule
card. Debug speed remains unchanged. The sandbox is unaffected.

Pause/resume clears held inputs, pointer captures, and queued touch nudges. A
partial plunger pull is canceled when pausing so releasing controls cannot fire
the ball on resume. Held key repeats cannot re-engage cleared controls until a
fresh press. Other game state is preserved. Input is also cleared on blur or
when the document becomes hidden; this does not itself pause the game.

## Game over and replay

Game over displays the final score, a Play again button (minimum 44-pixel height),
and the existing Up Arrow restart alternative. Play again starts a fresh game
on the same table: reset score, ball count, physical state, and rules progress.
Ignore replay requests during an active game. Clear held input for button replay,
emit the waiting-launch state immediately, and focus the Pause button so focus
does not remain on a hidden replay action. Keyboard restart preserves its existing
hold-to-charge behavior. Each restart starts game audio once.

High scores record the finished game once. Analytics sees the new waiting-launch
state before play starts, allowing the next game to be recorded separately.
Ordinary pause and replay do not exclude a game from analytics.

## Validation

Behavioral tests cover guidance visibility, pause/card composition, debug resume,
replay eligibility and focus, paused simulation, partial-pull cancellation, and
fresh-game reset. Existing keyboard, touch, audio, analytics, and score-recorder
regressions run with the full suite. Review launch/pause/replay on desktop and
phone-sized Chrome viewports, including short windows and the Physics route.
Responsive browser review is not a physical iOS/Android device test.

Launch dismissal survives the engine's per-frame ball clones; only a new launch
or an explicit reset restores it. Regression coverage includes cloned frames.
Browser review on October 13, 2026 verified that clicking Alien Star's launch
card keeps it hidden during simulation and Reset ball restores it.

Browser review on October 10, 2026 covered the actual Just One More launch/pause
view on desktop and at 390 × 844. A temporary fixture using production controls,
input, rendering, and the game loop covered Switchyard touch plunge, game over,
replay, and restored focus at 390 × 844, 844 × 390, and desktop size. The actual
Harlem Physics route retained its own controls and hid the play overlay. Replay
state-reset tests cover all seven registered tables.
