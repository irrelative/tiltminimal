# Codebase Overview

This document describes how the repository is laid out today, how the major
runtime flows work, and where the implementation is more specific than older
high-level project language might imply.

## Top-Level Structure

The main source tree is under `src/`.

- `src/main.ts`: browser bootstrap, DOM wiring, route boot, and high-level app
  state
- `src/app/`: route and UI helpers that support `main.ts`
- `src/audio/`: frame-to-frame audio event synthesis
- `src/boards/`: shared board authoring, compilation, validation, and board
  library modules
- `src/boards/tables/`: built-in table layouts, compiled built-in boards, and
  table-specific rules scripts
- `src/cli/`: terminal-facing validation and utility entrypoints
- `src/editor/`: table builder state, hit testing, drag handles, mutation, and
  local-storage persistence helpers
- `src/game/`: runtime state, physics stepping, rules execution, materials, and
  geometry helpers
- `src/input/`: keyboard and touch control input handling
- `src/render/`: canvas drawing and theme definitions
- `src/types/`: shared schema types, primarily `BoardDefinition`
- `tests/`: unit tests for physics, layout compilation, persistence, routes,
  rules, and rendering-adjacent behavior

## Routes And App Modes

The application has three routes:

- `/`: play mode
- `/editor`: board editor
- `/rules`: rules script editor

Route parsing and route-path generation live in `src/app/routes.ts`.

`src/main.ts` is still the top-level composition point for all three routes.
It is responsible for:

- reading the active route
- querying DOM elements
- loading persisted tables
- creating shared renderer/audio instances
- booting either play, editor, or rules mode

Supporting app modules currently include:

- `src/app/play-session.ts`: standalone play-session setup and play-route panel
  synchronization
- `src/app/editor-selection-panel.ts`: editor-side form rendering for the
  current selection

`src/main.ts` is still one of the central files in the repo. That is expected
for now. The supporting modules reduce some surface area, but the app bootstrap
has not been fully decomposed yet.

## Boards, Tables, And Layout Authoring

The board system has two layers:

### Shared board infrastructure

Files in `src/boards/` define reusable authoring and runtime support:

- `board-codec.ts`: cloning and normalization of board definitions
- `table-library.ts`: built-in table registration and default element factories
- `layout-schema.ts`: higher-level layout DSL types
- `layout-primitives.ts`: reusable layout-building helpers
- `layout-anchors.ts`: anchor resolution
- `layout-templates.ts`: template-derived defaults and geometry
- `layout-compiler.ts`: compilation from DSL layout to concrete board
- `layout-validation.ts`: playability and structural validation
- `snap-board-layout.ts`: snapping compiled/static board geometry to the editor
  grid

### Built-in tables

Files in `src/boards/tables/` are concrete built-in content:

- self-contained built-in table modules such as `classic-table.ts` and
  `starlight-em-table.ts` that can define:
  - table-specific rules script
  - optional layout DSL source
  - compiled exported board
- direct board-definition tables such as `harlem-globetrotters.ts`

The distinction is intentional:

- `src/boards/` is for reusable board tooling
- `src/boards/tables/` is for built-in table content

The preferred built-in pattern is now one source file per table, so a table's
rules and geometry can be understood and edited together.

## CLI Tooling

The repo now includes a small terminal-facing CLI surface under `src/cli/`.

Current modules:

- `table-validation.ts`: argument parsing, table selection, report generation,
  and exit-code logic
- `validate-table.ts`: command entrypoint used by `npm run validate-table`

The first CLI command validates built-in tables by id and runs both:

- compile-time layout validation from `src/boards/layout-validation.ts`
- editor-style advisory analysis from `src/editor/table-analysis.ts`

## Editor And Persistence

The editor is split into focused modules behind the barrel
`src/editor/table-editor.ts`.

Current editor module roles:

- `table-editor-selection.ts`: hit testing and selection logic
- `table-editor-add.ts`: add-tool element creation
- `table-editor-mutate.ts`: movement, property updates, and deletion
- `table-editor-handles.ts`: drag handles and rotation/guide endpoint behavior
- `table-editor-shared.ts`: shared editor constants/helpers
- `table-analysis.ts`: editor-side analysis passes and warning generation
- `editor-types.ts`: editor-specific state types
- `grid.ts`: grid size, snap behavior, and snap helpers

Persistence lives in `src/editor/table-storage.ts`.

That module is responsible for:

- loading tables from local storage
- merging stored records with built-in tables
- exporting/importing sparse board JSON
- resetting built-in tables back to their shipped definitions
- preserving the active table id

Built-in tables can be overridden in storage and later reset. Custom tables are
stored alongside them.

The editor also includes an analysis panel that can run advisory checks against
the active board. Current checks cover overlaps, out-of-bounds geometry,
shooter lane obstruction, flipper keepout, spinner clearance, saucer eject
clearance, and basic rules-event coverage.

## Runtime Game Flow

The main per-frame runtime pipeline is:

1. input polling
2. physics step
3. rules step
4. audio event derivation
5. render

Important files:

- `src/game/game-loop.ts`: owns the animation frame loop
- `src/game/physics-engine.ts`: public physics-step entrypoint
- `src/game/rules-engine.ts`: rules script execution
- `src/audio/game-audio.ts`: audio event synthesis
- `src/render/canvas-renderer.ts`: renderer façade

`GameLoop` owns the live `GameState` during play. It polls the current
`InputSource`, advances the physics frame, applies rules, plays audio events,
and renders the latest state.

## Physics Layout

Physics is no longer one monolithic file. The public entrypoint is still
`src/game/physics-engine.ts`, but the internal work is split into:

- `physics-engine-state.ts`: waiting-launch and playing state stepping
- `physics-engine-boundaries.ts`: walls, guides, plunger, and shooter lane
- `physics-engine-devices.ts`: bumpers, targets, slingshots, posts, saucers,
  spinners, and rollovers
- `physics-engine-flippers.ts`: flipper sweep collision sampling and passive
  vs active contact behavior
- `physics-engine-types.ts`: shared engine constants and result types
- `physics-motion.ts`: time-based advancement of plunger/flipper/device motion
- `physics-helpers.ts`: shared collision helpers and geometry utilities
- `spin-solver.ts`: contact resolution, friction, and rolling spin transfer

The most important boundary to remember is:

- physics determines what physically happened
- rules determine what that means for score, balls, modes, and stateful
  progression

## Rules System

Rules are script-driven and live on each board definition as a `rulesScript`
string.

Important files:

- `src/game/rules-engine.ts`
- `src/game/rules-types.ts`
- `src/game/rules-defaults.ts`

The rules engine compiles the script with `new Function(...)`, caches the
result, and executes lifecycle hooks such as:

- `onGameStart`
- `onBallStart`
- `onEvent`
- `onTick`

If a custom rules script fails validation, the engine falls back to the default
rules module and exposes the validation error to the rules editor UI.

## Rendering Layout

Rendering is canvas-based, not WebGL.

Current renderer modules:

- `src/render/canvas-renderer.ts`: façade and render coordination
- `src/render/canvas-renderer-board.ts`: playfield and device drawing
- `src/render/canvas-renderer-hud.ts`: play HUD drawing
- `src/render/canvas-renderer-editor.ts`: editor overlays, grid, handles, and
  draft previews
- `src/render/canvas-renderer-shared.ts`: shared drawing constants and geometry
- `src/render/board-themes.ts`: theme palette definitions

The renderer draws the table and devices with the table nudge offset applied,
but the free ball is rendered in world space after the shifted board pass. That
is how the current table-nudge animation makes the cabinet move underneath the
ball rather than teleporting the ball itself.

## Input And Controls

`src/input/keyboard-input.ts` owns both keyboard input and the mobile/touch
gesture mapping used by the play route.

Current control model includes:

- left/right flipper keyboard bindings
- plunger pull/release
- nudge inputs
- mobile lower-playfield hold zones for flippers
- swipe gestures for nudge and plunger

## Current Realities And Notable Disparities

These are worth calling out explicitly:

- The README still describes the project at a high level as something that
  could leverage WebGL later, but the current implementation is a 2D
  canvas-based renderer only.
- `src/main.ts` still owns a large amount of route wiring and DOM integration.
  The repo has helper modules, but this is not yet a fully componentized app.
- Built-in tables are not all authored the same way: some come from the layout
  DSL compiler and some are still direct `BoardDefinition` files.
- Rules are editable as script strings rather than through a typed AST or
  visual rule builder.
- The editor and play views intentionally share the same board schema and
  renderer foundation, so most geometry changes made in the editor flow
  directly into runtime play.

## Where To Start

For common tasks, these are the fastest entry points:

- adding or tuning a built-in table:
  `src/boards/tables/` plus `src/boards/table-library.ts`
- changing table physics:
  `src/game/physics-defaults.ts`, `src/types/board-definition.ts`, and the
  `src/game/physics-engine-*.ts` files
- changing rules behavior:
  `src/game/rules-engine.ts` and the table rules scripts in
  `src/boards/tables/`
- changing editor interactions:
  `src/editor/table-editor.ts` and its leaf modules
- changing play or editor rendering:
  `src/render/canvas-renderer.ts` and the specialized renderer files
- changing route behavior or screen wiring:
  `src/main.ts`, `src/app/routes.ts`, and `src/app/`
