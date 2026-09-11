# Pinball Browser

A TypeScript browser pinball game with seven built-in tables, a 2D canvas
playfield, keyboard and touch controls, and synthesized audio. Shared physics,
rendering, and reusable board assemblies support table-specific layouts and rules,
including ball locks and two-ball multiball.

[Play in your browser](https://irrelative.github.io/tiltminimal/).

## Tables

| Table                | Balls | What to shoot for                                                                                  |
| -------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| Just One More        | 3     | Play both spinners, fix four targets, and collect a pin for two-ball multiball.                    |
| Classic              | 3     | Complete the top lanes, build bonus, and shoot the saucer.                                         |
| Andromeda            | 3     | Clear the guard, lock a ball, then hit RELEASE for two-ball multiball.                             |
| Double Crossed       | 3     | Complete both CROSS banks, lock a ball, and plunge for multiball. Both spinners light the jackpot. |
| Harlem Globetrotters | 3     | Use three flippers to reach sweeping lanes and high-value upper saucers.                           |
| Starlight            | 5     | Spell STAR, light COMET and NOVA, and collect rising observatory awards.                           |
| Switchyard           | 3     | Connect five fan shots, lock at Dispatch, and collect multiball jackpots.                          |

The gallery shows Just One More, Classic, Double Crossed, Starlight and Switchyard. Andromeda
and Harlem are hidden from selection but remain playable through direct
`?table=andromeda` and `?table=harlem-globetrotters` URLs.

Andromeda and Harlem are reference-based adaptations. Harlem currently uses
simplified direct scoring, and its synthesized early Bally-style sound is an
approximation rather than ROM emulation. Each table's **Rule card** describes
the rules implemented in this game.

## Playing

The home page opens a **Select a table** preview gallery. Choosing a table puts
its ID in the URL, for example `?table=double-crossed`, so refreshing starts the
same table. Missing, invalid, or removed IDs show the gallery. Use the sidebar's
**Select a table** link to return; leaving or refreshing does not save an in-progress
game.

The canvas shows score and current ball number. The sidebar contains the table
name, its top-five high scores, a compact **Reset ball** action, **Rule card**,
and **Settings**. Opening the rule card pauses play; closing it resumes play.
Keyboard hints appear on the playfield only before the ball is plunged.

| Action             | Keyboard                       | Touch                                             |
| ------------------ | ------------------------------ | ------------------------------------------------- |
| Left flipper       | Left Shift, Left Arrow, or A   | Hold the lower-left playfield                     |
| Right flipper      | Right Shift, Right Arrow, or D | Hold the lower-right playfield                    |
| Plunger            | Hold Up Arrow, then release    | Swipe down on the right side, hold, then lift     |
| Left / right nudge | Z / slash                      | Swipe left / right outside the flipper hold zones |
| Forward nudge      | Space                          | Swipe up outside the flipper hold zones           |

Touch supports simultaneous flipper holds. Long presses on the playfield suppress
browser text selection and touch callouts. See [mobile controls](docs/mobile-controls-spec.md).

All tables have regression coverage for cradles, controlled release shots, dead
bounces, post passes, bump passes, live catches, drop catches, and timed slap saves.
These moves depend on ball position, speed, and timing; transfer directions vary
with table geometry. See [advanced flipper skills](docs/advanced-flipper-skills-spec.md)
for techniques and verified scenarios.

### Settings, scores, and sound

**Settings** provides sound on/off, volume, the ball's spin marker, and motion
trails. Sound, markers, and trails default to on. Preferences apply across tables
and persist in this browser. **Physics overlay**, also inside Settings, reveals
physics diagnostics and pause, step, and slow-motion controls.

Each table saves its five highest positive completed-game scores in browser local
storage. Partial games and sandbox sessions do not submit scores. Scores and
preferences are local to the browser, with no account or cross-device sync; if
storage is unavailable, changes last only for the current page session.

Just One More is an r/pinball tribute with shared mechanical sounds and no music
or callouts. Its simple
PLAY / FIX / COLLECT progression uses the same tested open fan geometry as Switchyard.
See [Just One More rules and layout](docs/just-one-more-spec.md).

A pointer or keyboard interaction unlocks audio. Tables share mechanical sounds;
Harlem adds electronic scoring cues and a synthesized Sweet Georgia Brown opening
phrase. See [audio behavior and fidelity limits](docs/table-audio-spec.md) and
[user settings](docs/user-settings.md).

## Local development

Use Node.js 22 (the version used in CI), npm, and Make:

```sh
make install
make dev
```

Open the local URL printed by Vite. The project uses TypeScript, Vite, ESLint,
Prettier, and Vitest; rendering uses Canvas 2D.

| Command                                   | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `make build`                              | Type-check and build production assets into `dist/` |
| `make lint`                               | Run ESLint                                          |
| `make test`                               | Run the Vitest suite                                |
| `make fmt`                                | Format the repository with Prettier                 |
| `make validate-table TABLE=classic-table` | Validate a built-in table                           |
| `make playtest-classic`                   | Run Classic timing sweeps and seeded games          |
| `make cloc`                               | Count source lines; requires `cloc` installed       |
| `make clean`                              | Remove generated build and coverage output          |

CI runs lint, build, and tests on pull requests and pushes to `main`.

### Physics and playtesting

The separate `/physics?table=classic-table` route opens a click-to-spawn physics
sandbox outside the normal scoring and ball lifecycle. It is intentionally absent
from the player navigation. Without a valid table ID, `/physics` shows the gallery.
The sandbox is silent and does not record high scores.

Use **Settings → Physics overlay** for collision outlines, contact normals, ball
state, recent triggers, and simulation controls. See the
[debugging guide](docs/physics-debug-overlay.md) and
[sandbox specification](docs/physics-sandbox-spec.md).

`make playtest-classic` writes a Markdown report and replayable simulation JSON
under `playtest-results/`. This is developer tooling; recording and replaying a
live game is not currently a player-facing feature. See
[Classic playtests](docs/classic-playtest.md).

## Code organization and table authoring

| Path                 | Responsibility                                                           |
| -------------------- | ------------------------------------------------------------------------ |
| `src/app/`           | Gallery, game and sandbox sessions, routes, rule cards, scores, settings |
| `src/boards/`        | Board schema helpers, layout compiler, assemblies, and table library     |
| `src/boards/tables/` | Built-in layouts and table-specific rules                                |
| `src/game/`          | Runtime state, game loop, physics, and shared rules systems              |
| `src/render/`        | Canvas rendering and table artwork                                       |
| `src/input/`         | Keyboard and touch controls                                              |
| `src/audio/`         | Synthesized mechanical sounds and table audio profiles                   |
| `src/validation/`    | Geometry analysis and simulated playability checks                       |
| `src/playtest/`      | Simulation, scenarios, and replay tooling                                |
| `src/cli/`           | Validation and playtest entrypoints                                      |
| `tests/`             | Automated regression tests                                               |
| `docs/`              | Behavior specifications and authoring guides                             |

Before changing a layout, read the
[conventional layout guidelines](docs/conventional-layout-guidelines.md) and its
table-specific spec. Use connected assemblies, preserve a ball-sized center
drain, and verify inlane feeds and held-flipper catch/release behavior. Follow the
guide's regression tests and browser review workflow, including all-table validation:

```sh
make validate-table TABLE='--all --deep-playability --fail-on-warnings'
```

Start with the [codebase overview](docs/codebase-overview.md),
[layout authoring guide](docs/table-layout-authoring.md),
[reusable assemblies](docs/board-assemblies.md), and
[validation CLI](docs/table-validation-cli.md). The
[component dimensions](docs/board-component-dimensions.md),
[physics and animation](docs/physics-and-animation.md), and
[multiball specification](docs/multiball-spec.md) cover the shared systems.

Table specs: [Classic](docs/classic-table-spec.md),
[Andromeda](docs/andromeda-spec.md), [Double Crossed](docs/double-crossed-spec.md),
[Harlem Globetrotters](docs/harlem-globetrotters-spec.md), and
[Starlight](docs/starlight-em-spec.md), and [Switchyard](docs/switchyard-spec.md).

## Deployment

[GitHub Pages](https://irrelative.github.io/tiltminimal/) hosts the static game.
The [deployment workflow](.github/workflows/deploy-pages.yml) runs on pushes to
`main` or manual dispatch, verifies the project, builds with the Pages-provided
base path, and publishes `dist/` with a `404.html` fallback for direct routes.

For another static host, build with `VITE_BASE_PATH` set to the deployment subpath
when needed, serve `dist/`, and configure an index-page fallback for `/physics`.
