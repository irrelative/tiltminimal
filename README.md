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

## Play Controls

* `Left Shift` / `Left Arrow`: left flipper
* `Right Shift` / `Right Arrow`: right flipper
* `Arrow Up`: plunger
* `Z`: left nudge
* `/`: right nudge
* `Space`: forward/up nudge
