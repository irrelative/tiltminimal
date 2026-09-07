# Pinball Browser

A browser based pinball game. Some overall requirements:

* High performance. The current implementation uses a 2D canvas renderer; WebGL remains future-facing rather than implemented today.
* Board decoupled from game logic; there should be a way to create a new board layout that plugs into existing game system

## Current scaffold

The repository now includes a TypeScript + Vite browser game with:

* a 2D canvas-based playfield
* 2D ball physics with planar position/velocity and 2-axis rolling spin
* multiple built-in, code-authored tables
* separated game loop, physics, input, and rendering modules
* Vitest and GitHub Actions wiring for basic verification

## Local commands

Use the `Makefile` entrypoints:

* `make install`
* `make dev`
* `make build`
* `make lint`
* `make test`
* `make cloc`
* `make validate-table TABLE=classic-table`
* `make fmt`

## Structure

* `src/boards/` shared board authoring, codec, and library modules
* `src/boards/tables/` built-in table implementations and rules scripts
* `src/cli/` terminal entrypoints for validation and other repo tooling
* `src/validation/` simulation-based table analysis and playability checks
* `src/game/` runtime state and physics
* `src/render/` canvas rendering
* `src/input/` player controls
* `tests/` unit tests

## Additional docs

* [docs/board-assemblies.md](docs/board-assemblies.md) describes reusable
  mechanisms, their configuration, and automatic ball-route validation

* [docs/classic-table-spec.md](docs/classic-table-spec.md) defines Classic’s
  connected lanes, scoring shots, shooter gate, and route verification
* [docs/codebase-overview.md](docs/codebase-overview.md) explains the current
  folder layout, runtime flow, route responsibilities, and important module
  boundaries
* [docs/table-validation-cli.md](docs/table-validation-cli.md) defines the
  terminal entrypoint for validating built-in table implementations
* [docs/physics-sandbox-spec.md](docs/physics-sandbox-spec.md) defines the
  dedicated `/physics` route for click-to-spawn physics testing outside the
  normal game/rules lifecycle
* [docs/board-component-dimensions.md](docs/board-component-dimensions.md)
  defines the dimensional meaning of every board component field
* [docs/table-analysis-spec.md](docs/table-analysis-spec.md) defines the CLI
  geometry analysis workflow and the current warning set for overlap, bounds,
  shooter-lane, flipper, spinner, saucer-eject, and rules-coverage issues
* [docs/physics-and-animation.md](docs/physics-and-animation.md) explains how
  the frame loop, physics solver, rolling spin, and renderer fit together
* [docs/table-layout-authoring.md](docs/table-layout-authoring.md) explains the
  higher-level layout DSL, compiler, and validation flow for built-in and
  agent-generated tables
* [docs/conventional-layout-guidelines.md](docs/conventional-layout-guidelines.md)
  defines the minimum shot anatomy expected from built-in playfields
* [docs/gpt-table-generation.md](docs/gpt-table-generation.md) defines the
  required anatomy-first workflow for GPT-authored table layouts
* [docs/layout-playability-spec.md](docs/layout-playability-spec.md) defines
  the semantic shooter-lane and top-arch primitives plus the current
  playability validation guarantees for DSL-authored tables
* [docs/mobile-controls-spec.md](docs/mobile-controls-spec.md) defines the
  touch control scheme for playing on phones and tablets
* [docs/slingshot-layout-spec.md](docs/slingshot-layout-spec.md) defines the
  active slingshot component and the lower-lane DSL patterns used to build
  playable lower thirds
* [docs/starlight-em-spec.md](docs/starlight-em-spec.md) defines the behavior
  and layout goals for the built-in 1970s EM-style table
* [docs/mirror-match-spec.md](docs/mirror-match-spec.md) defines the symmetric
  solid-state layout and rules goals for `Mirror Match`
* [docs/double-crossed-spec.md](docs/double-crossed-spec.md) defines the
  behavior and validation goals for the built-in `Double Crossed` table

## Static Deployment

* GitHub Pages: https://irrelative.github.io/tiltminimal/
* Deployed routes:
  * Game: `https://irrelative.github.io/tiltminimal/`
* Physics Sandbox: `https://irrelative.github.io/tiltminimal/physics`
* Deployment is handled by `.github/workflows/deploy-pages.yml`, which builds with the Pages-provided base path and publishes the `dist/` output.

## Play Controls

* `Left Shift` / `Left Arrow`: left flipper
* `Right Shift` / `Right Arrow`: right flipper
* `Arrow Up`: plunger
* `Z`: left nudge
* `/`: right nudge
* `Space`: forward/up nudge
* Touch lower-left playfield: hold left flipper
* Touch lower-right playfield: hold right flipper
* Touch swipe left/right/up on the playfield: nudge
* Touch swipe down on the right side: plunger pull/release
