# Module Boundary Refactor

## Goal

Keep the game behavior stable while reducing the number of files that mix
bootstrap, rendering, persistence, and simulation concerns in a single module.

This refactor is structural. It does not intentionally change gameplay rules,
physics tuning, or editor behavior.

## Boundary Changes

### Board codec

Board cloning and normalization now live in
`src/boards/board-codec.ts`.

This module is the shared place for:

- deep-cloning runtime board definitions
- normalizing built-in and legacy board input into `BoardDefinition`
- keeping storage and board-library hydration behavior consistent

`src/boards/table-library.ts` remains responsible for:

- built-in table registration
- blank/default element factories
- table id helpers

`src/editor/table-storage.ts` remains responsible for:

- local storage persistence
- sparse export/import shape
- active table bookkeeping

### Physics helpers and motion

Low-level physics helpers now live in:

- `src/game/physics-helpers.ts`
- `src/game/physics-motion.ts`

`physics-helpers.ts` owns:

- contact helper construction
- shared geometry offset helpers
- oriented segment collision tests
- small numeric helpers used across simulation code

`physics-motion.ts` owns:

- cloning the mutable playing-state frame snapshot
- plunger motion advancement
- flipper motion advancement
- nudge animation state
- device cooldown/animation state progression
- occupied saucer hold/eject progression

`src/game/physics-engine.ts` remains the orchestration layer for:

- the `waiting-launch` and `playing` state machines
- collision ordering
- event emission
- interaction between the frame loop and the extracted helpers

### App UI composition

Route/bootstrap logic remains in `src/main.ts`, but route-specific UI helpers are
being peeled out.

Current extracted UI modules:

- `src/app/editor-selection-panel.ts`
- `src/app/play-session.ts`

`editor-selection-panel.ts` owns selection form rendering and field creation for
editor-side property editing.

`play-session.ts` owns standalone play-session startup plus the play-route table
picker/debug panel sync behavior.

`src/main.ts` should continue trending toward:

- app bootstrap
- shared state wiring
- high-level route orchestration

and away from:

- detailed panel rendering
- play-session construction details
- large route-specific UI switch trees

### Editor module split

The editor module at `src/editor/table-editor.ts` is now a barrel rather than a
single implementation file.

Current split:

- `src/editor/table-editor-selection.ts`
- `src/editor/table-editor-add.ts`
- `src/editor/table-editor-mutate.ts`
- `src/editor/table-editor-handles.ts`
- `src/editor/table-editor-shared.ts`

The intended boundaries are:

- selection and hit testing
- element creation helpers
- mutation/update/delete behavior
- handle geometry and drag behavior
- shared constants and geometry helpers

Consumers should continue importing from `src/editor/table-editor.ts`, not the
individual leaf files, unless they are extending the editor internals directly.

### Renderer module split

`src/render/canvas-renderer.ts` is now a narrow façade around specialized
renderer modules instead of a single large implementation file.

Current split:

- `src/render/canvas-renderer-shared.ts`
- `src/render/canvas-renderer-board.ts`
- `src/render/canvas-renderer-hud.ts`
- `src/render/canvas-renderer-editor.ts`

The intended boundaries are:

- shared render geometry helpers, constants, and device path tracing
- playfield and device drawing for live play and editor base rendering
- game HUD drawing
- editor-only overlays such as grid, selection chrome, and draft previews

`src/render/canvas-renderer.ts` should remain responsible only for:

- acquiring and sizing the canvas context
- coordinating render order
- delegating to the specialized renderer modules

## Follow-up Direction

The next refactor pass should target:

1. editor pointer/tool controllers
2. route-specific setup for `/editor`, `/`, and `/rules`

## Constraints

- Preserve existing public board schema and local-storage compatibility.
- Preserve current route behavior.
- Preserve current physics ordering and tests.
- Prefer extracting cohesive helpers over large inheritance-style abstractions.
