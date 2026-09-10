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

* [docs/andromeda-spec.md](docs/andromeda-spec.md) describes Andromeda's reference
  layout, guarded lock, two-ball multiball, rules, and fidelity limits
* [docs/multiball-spec.md](docs/multiball-spec.md) defines shared ball ownership,
  lock/serve/release behavior, rules APIs, and final-drain handling

* [docs/viewport-layout-spec.md](docs/viewport-layout-spec.md) defines full-height
  desktop board sizing, sidebar scrolling, and narrow-window behavior

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
  defines the shared layout standard: connected mechanisms, center-drain
  clearance, flipper-relative feeds, cradling, and acceptance checks
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
* [docs/harlem-globetrotters-spec.md](docs/harlem-globetrotters-spec.md) describes
  the reference-based court layout, inline target lane, and staggered left flippers
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

On-canvas control hints appear only while a ball is waiting to be plunged.
They disappear during play; game-over and multiball status remain visible.

Every table supports cradles, controlled release shots, dead bounces, post
passes, live catches, drop catches, and timed slap saves. These require suitable
ball position, speed, and timing; post-pass directions follow each table's
geometry. See [advanced flipper skills](docs/advanced-flipper-skills-spec.md)
for techniques, per-table coverage, and regression scenarios.

See [physical contact behavior](docs/physics-contact-spec.md) for flipper, sling,
bumper, and rollover collision rules and regression coverage.

Enable **Physics overlay** in Game or Physics for collision outlines, contact
normals, ball speed, recent triggers, and pause/step/slow-motion controls.
See [the debugging guide](docs/physics-debug-overlay.md).

Run `make playtest-classic` for a focused Classic timing sweep and seeded game
batch. It saves a Markdown report and replayable JSON under `playtest-results/`.
See [Classic playtest scenarios and baseline findings](docs/classic-playtest.md).

All tables validate their intended passive inlane paths and held-flipper
catch/release. See [the flipper feed specification](docs/flipper-feed-spec.md).

Harlem has table-specific early Bally-style electronic scoring sounds and a
synthesized Sweet Georgia Brown startup phrase. Click or press a key in Game
to unlock audio. See [table audio and fidelity limits](docs/table-audio-spec.md).

The selected table is stored in the URL as `?table=harlem-globetrotters` (using
its built-in table ID). Refreshing or switching between Game and Physics keeps
that selection. Missing or invalid IDs fall back to the first table. Changing
tables updates the current URL without adding browser history entries; other
query parameters and the URL fragment are preserved.

Every table shows the current ball number beside the score on the playfield HUD
(e.g. `Ball 2 of 3`), including when Physics overlay is off. The canvas header
shows score and ball; the table name appears in the left sidebar.

Each table has a top-five high-score list beneath its name in the left sidebar.
Positive final scores are recorded once when a game ends and saved in this
browser's local storage. Refreshes preserve the list; changing tables shows that
table's scores. Tied scores from separate games occupy separate places. Partial
games and Physics sandbox play do not submit scores. If storage is unavailable,
scores remain available for the current page session only.

User preferences are available under **Settings** in the left sidebar: sound,
volume, ball spin markers, and motion trails. They apply immediately across tables
and are saved in this browser. See [User settings](docs/user-settings.md).

Post passes use a quick release/re-flip from a cradle while holding the receiver.
Connected lower slings now provide passive rebound posts. See
[supported transfers and geometry](docs/post-pass-spec.md).

Click **Rule card** beneath the table selector to read its scoring rules in the
sidebar. Feature counts and table descriptions are replaced by this card.
Click **Close rules** (or press Escape while focused there) to resume. Cards pause
both Game and Physics without changing debug pause/speed settings. Switching or
restarting a table closes its card. The cards describe the browser game's current
rules; Harlem's card identifies its simplified scoring.
See [rule-card behavior and authoring](docs/rule-cards.md).

Bump passes are verified on every table: release a cradle, hold the opposite
flipper, and tap Space to nudge the rolling ball across. See the
[verified timings and coverage](docs/advanced-flipper-skills-spec.md#verified-bump-passes).
