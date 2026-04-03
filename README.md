# Pinball Browser

A browser based pinball game. Some overall requirements:

* High performance! Should leverage webgl to render the pinball board. Let's start with a 2d layout though.
* Board decoupled from game logic; there should be a way to create a new board layout that plugs into existing game system

## Current scaffold

The repository now includes a small TypeScript + Vite scaffold with:

* a 2D canvas-based playfield
* 2D ball physics with planar position/velocity and 2-axis rolling spin
* a data-driven `classicTable` board definition
* separated game loop, physics, input, and rendering modules
* Vitest and GitHub Actions wiring for basic verification

## Local commands

Use the `Makefile` entrypoints:

* `make install`
* `make dev`
* `make build`
* `make lint`
* `make test`
* `make fmt`

## Structure

* `src/boards/` static board definitions
* `src/game/` runtime state and physics
* `src/render/` canvas rendering
* `src/input/` player controls
* `tests/` unit tests

## Additional docs

* [docs/physics-and-animation.md](docs/physics-and-animation.md) explains how
  the frame loop, physics solver, rolling spin, and renderer fit together
* [docs/table-layout-authoring.md](docs/table-layout-authoring.md) explains the
  higher-level layout DSL, compiler, and validation flow for built-in and
  agent-generated tables
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
* [docs/module-boundary-refactor-spec.md](docs/module-boundary-refactor-spec.md)
  defines the current structural refactor targets and the new shared module
  boundaries for board codecs, physics helpers, and app UI composition

## Static Deployment

* GitHub Pages: https://irrelative.github.io/tiltminimal/
* Deployed routes:
  * Game: `https://irrelative.github.io/tiltminimal/`
  * Editor: `https://irrelative.github.io/tiltminimal/editor`
  * Rules: `https://irrelative.github.io/tiltminimal/rules`
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
