# GPT Table Generation

Agent-authored tables follow the same [layout requirements](conventional-layout-guidelines.md)
as manually authored tables. Read those requirements and the table-specific
spec before changing geometry.

## Required workflow

1. Establish the cabinet, ball size, and intended shot families. For a recreation,
   inspect reference layouts and document the distinctive geometry and 2D adaptations.
2. Build connected mechanisms using `src/boards/assemblies/index.ts`, optionally
   reusing `table-foundation.ts`. Start with the lower playfield and its center
   drain, then connect the shooter arch and scoring shots. The
   `solid-state-two-flipper` template supplies anchors when useful; it is not
   a substitute for connected geometry or a requirement to flatten asymmetric tables.
3. Compose the assembly geometry and routes into a `BoardLayoutDefinition` and
   compile with `compileBuiltInBoardLayout`. Use legacy primitives or custom
   geometry only where a complete assembly does not fit the mechanism.
4. Define passive feed, held catch/release, outlane, center-drain, and scoring
   contracts. Reuse flipper-relative references. Every flipper needs a declared
   cradle feed; extra flippers must not obstruct the main drain.
5. Follow the acceptance commands and browser review in the shared requirements.
   Fix failing geometry before weakening a contract. Record justified passive
   route exceptions and reference adaptations in the table's spec.

See [board assemblies](board-assemblies.md) for factory configuration,
[flipper feeds](flipper-feed-spec.md) for tested return dimensions, and
[table layout authoring](table-layout-authoring.md) for compiler details.
Classic demonstrates a complete connected table. Harlem demonstrates staggered
flippers with explicit drain and catch/release checks.
