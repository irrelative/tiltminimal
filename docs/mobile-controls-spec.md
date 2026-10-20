# Mobile Controls Specification

This document defines the touch interaction model for the standalone play view
on phones and tablets.

## Goals

- keep flipper and plunge controls on the playfield, with visible Pause / Resume
  and Play again actions
- keep the flipper controls in the natural lower corners of the table
- map gestures to nudging and plunging without conflicting with flipper holds
- preserve keyboard support alongside touch support

## Control Mapping

Touch interaction is active on the playfield canvas in the standalone play
route.

### Flippers

- touching and holding the lower-left control zone engages the left flipper
- touching and holding the lower-right control zone engages the right flipper
- releasing the touch releases that flipper

The lower flipper zones occupy the bottom portion of the canvas and are split at
the centerline.

### Nudging

Outside the lower flipper hold zones, directional swipes trigger cabinet nudges:

- swipe left: left nudge
- swipe right: right nudge
- swipe up: forward / up-table nudge

Nudges are edge-triggered gesture pulses rather than held states.

### Plunger

- a dominant downward swipe that starts on the right side of the playfield
  engages the plunger
- the plunger remains held while the touch remains active
- lifting the touch releases the plunger

This keeps the gesture close to the real shooter lane side of the table.

## Input Merge Rules

Touch and keyboard controls are merged into one runtime input state.

- keyboard controls remain active
- touch flipper holds combine with keyboard flipper holds
- touch plunge hold combines with keyboard plunger hold
- touch nudge gestures queue one-frame nudge pulses
- active touch pointers are captured by the canvas and reset on blur or when
  the document becomes hidden, so a flipper or plunger cannot remain held after
  the pointer leaves the playfield

## Launch guidance and session controls

Brief keyboard and touch guidance appears over the playfield between balls,
including the initial launch. It passes pointer events through to the canvas and
disappears once the plunger starts pulling. Pause / Resume remains reachable on
the playfield; the game-over panel offers a touch-sized Play again button.

Pausing and resuming clear held keyboard/touch input and queued nudges. Pausing
cancels a partial plunger pull, avoiding an accidental launch on resume. Release
and press again to operate controls. Blur and hiding the document clear both
keyboard and touch input. See [first-game experience](first-game-experience-spec.md).

## Non-Goals

This touch scheme does not currently model:

- analog plunge strength from drag distance
- editable touch zones per table
- haptic feedback
- multi-stage gesture hints or tutorials

## Implementation Notes

- Source input module: `src/input/keyboard-input.ts`
- Runtime consumer: `src/game/game-loop.ts`
- Play route wiring: `src/main.ts`

The mobile touch layer is intentionally play-only.

## Interruptions and Safari audio

Lost pointer capture and pointer cancellation release only the affected finger;
other held flippers remain engaged. Rotating clears all held input. A plunge
must start on the right side; crossing into it during a central swipe does not
engage the plunger.

Blur, page hiding (including screen lock/app switching), page navigation into
the back/forward cache, and orientation changes pause standalone play until
Resume is tapped. This cancels a partial pull and prevents a ball from moving
while the player returns to the game. Closing a rule card does not clear this
pause. The physics sandbox retains its separate diagnostic pause behavior.

Audio unlock is attempted on pointer release as well as pointer press and
keyboard input, allowing touch browsers to resume audio within their activation
gesture. Muted settings remain respected.
