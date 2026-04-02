# Mobile Controls Specification

This document defines the touch interaction model for the standalone play view
on phones and tablets.

## Goals

- make the game playable without any on-screen button chrome
- keep the flipper controls in the natural lower corners of the table
- map gestures to nudging and plunging without conflicting with flipper holds
- preserve keyboard support alongside touch support

## Control Mapping

Touch interaction is active on the playfield canvas in the standalone play
route and in editor play-test mode.

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

The mobile touch layer is intentionally play-only. The editor keeps its own
pointer interactions for selecting and moving table elements.
