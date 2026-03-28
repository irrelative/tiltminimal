# Pinball Browser

A browser based pinball game. Some overall requirements:

* High performance! Should leverage webgl to render the pinball board. Let's start with a 2d layout though.
* Board decoupled from game logic; there should be a way to create a new board layout that plugs into existing game system

## Current scaffold

The repository now includes a small TypeScript + Vite scaffold with:

* a 2D canvas-based playfield
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
