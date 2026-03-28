# Repository Guidelines

## Project Structure & Module Organization
This repository is a TypeScript browser game scaffold. The root contains the core project config plus [README.md](/Users/justin/code/pball-web/README.md) and this guide.

Keep the layout predictable:
- `src/boards/` for static table definitions
- `src/game/` for runtime state and physics
- `src/render/` for drawing code
- `src/input/` for controls
- `tests/` for automated tests
- `public/` for static assets if they are added later

Keep rendering, physics, and board definitions in separate modules so new table layouts can plug into shared game systems.

## Build, Test, and Development Commands
Use the `Makefile` as the main entrypoint:
- `make install` to install dependencies
- `make dev` to start the Vite dev server
- `make build` to type-check and build production assets
- `make lint` to run ESLint
- `make test` to run Vitest
- `make fmt` to format the repository with Prettier

The underlying npm scripts remain in `package.json`, but contributor docs and automation should prefer `make` targets.

## Coding Style & Naming Conventions
Use 2-space indentation for web-facing source files unless an adopted formatter enforces otherwise. Name files by responsibility: `board-loader.js`, `physics-engine.ts`, `render-webgl.ts`.

Prefer:
- `camelCase` for variables and functions
- `PascalCase` for classes
- `kebab-case` for filenames

Keep modules small and focused. Avoid coupling board layout data directly to rendering or gameplay rules.

## Testing Guidelines
Vitest is configured for unit tests. Add tests under `tests/` with names such as `physics-engine.test.ts` and keep coverage focused on board loading, state transitions, and collision behavior.

Test names should describe behavior, for example: `loads bonus lane from board definition` or `applies flipper impulse once per input`.

## Commit Guidelines
There is no existing commit history yet, so use short imperative commit messages such as `Add board schema` or `Separate renderer from game state`. Keep each commit scoped to one logical change so history stays easy to review and revert.

## Commit Workflow
After each completed logical change, stage the relevant files and create a git commit unless the user explicitly asks not to commit yet.
Run tests relevant to the change before committing when feasible.
Use one commit per logical change.
