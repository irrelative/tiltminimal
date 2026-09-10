# Board assemblies and route contracts

Use `src/boards/assemblies/index.ts` to author connected pinball mechanisms.
Assemblies generate both collision geometry and behavioral route definitions.
All five built-in tables use these assemblies alongside table-specific geometry. Classic Table is the smallest
complete working example.

Follow [the shared layout requirements](conventional-layout-guidelines.md) when
composing mechanisms. In particular, add center-drain routes explicitly: the
lower assembly generates inlane and outlane contracts, but no center-drain test.

## Available assemblies

| Factory                        | Geometry and configuration                                                                                                                                                                                                 | Behavioral checks                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `createLowerPlayfieldAssembly` | Two flippers, slings, entry posts, paired inlanes/outlanes, and concentric curved returns. Configure center/pivot spacing, flipper length, lane width, return radius, entry/bend heights, and sling dimensions.            | Both inlanes have nine passive feed and held catch/release samples each. Outlane samples drain without crossing a flipper. |
| `createShooterArchAssembly`    | Shooter position and plunger, tangent extensions, concentric arch, gate, open rollover lanes, and an arch-connected lane stop. Configure arch center/radius, shooter width, gate angle, launch height, lane count/spacing. | Selected charge levels cross a rollover and enter the upper playfield.                                                 |
| `createShotLaneAssembly`       | Continuous inner/outer polylines and a spinner. Configure entrance and approach velocities plus the intended exit region.                                                                                                  | Spinner contact precedes arrival in the exit region.                                                                   |
| `createTargetBankAssembly`     | Spaced, angled standups and/or drop targets with a parallel backing rail. Configure first target, spacing vector, dimensions, backing offset, and return region.                                                           | Each target is approachable from its scoring face and the ball returns downstream.                                     |
| `createSaucerPocketAssembly`   | Cup, rounded pocket, throat, and flared mouth. Configure wall radius, throat/mouth dimensions, capture timing, ejection, and return region.                                                                                | Three approach velocities capture the ball and reach the return region after release.                                  |

Constructors reject basic impossible dimensions such as inlanes too narrow
for the ball/posts, return radii smaller than lane widths, target backing in
front of the scoring faces, or saucer ejection directed away from its mouth.
Full-board geometry and route validation remain required: assemblies can
interfere with one another after composition.

## Composition

Each assembly uses board-space coordinates and a unique `id`. Its generated
route ids use that prefix. `composeAssemblies(...)` merges feature arrays and
routes and rejects duplicate route ids. It returns an explicit flipper array
so it can be spread into a `BoardLayoutDefinition`.

```ts
const parts = composeAssemblies(lower, shooter, orbit, bank, pocket);
const layout: BoardLayoutDefinition = {
  ...parts,
  name: 'My Table',
  width: 900,
  height: 1400,
  drainY: 1425,
  launchPosition: shooter.launchPosition,
  plunger: shooter.plunger,
  materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
};
const board = compileBuiltInBoardLayout(layout);
```

Composition does not infer a cabinet boundary or join arbitrary endpoints.
The shooter arch's left end must connect to the orbit/cabinet wall; lower
outlanes need outer cabinet or shooter walls. Declare those shared boundaries
once. Classic's outer spinner wall joins its arch and extends down the left
edge; the persistent shooter wall bounds the right side.

Route-bearing layouts preserve precision by default. Legacy layouts without
routes keep their existing grid snapping. Explicit `snapToGrid` overrides
remain available, but snapping independent joints or feature references can
break routes. Routes refer to feature positions and flipper pivots rather
than fragile indices in merged feature arrays.

The older helpers in `layout-primitives.ts` remain available for legacy tables
and low-level composition. New tables should use these assemblies for complete
mechanisms instead of assuming a legacy helper guarantees a working feed.

## Route definitions

`BallRouteDefinition` is serializable board metadata, copied independently by
board construction, cloning, and layout snapping. Gameplay does not execute
these tests. They run through `analyzePlayability` and the existing CLI:

```
make validate-table TABLE='classic-table --deep-playability'
```

A route defines:

- A named `id` and timeout in seconds (greater than zero and at most 15).
- A plunge with charge fractions, or a feed point with a set of velocities.
- Ordered goals: a scoring event (optionally tied to a feature position),
  a rectangular region, contact with a particular flipper, or a drain event.
- Optional `avoidFlippers` for intentional drain paths.
- Optional `cradle: { pivot }` for a held catch/release run of each feed sample.

A feed starts as a live ball with the shooter gate closed. A plunge uses the
real pull/release lifecycle. Goals advance in order, and one event cannot
satisfy two successive event goals. Region goals exclude occupied saucers and
waiting-launch positions, so capturing or resetting a ball cannot masquerade
as a successful return.

A failed sample reports its route id, sample number, and unmet goal as a
`route-failed` playability error. It makes CLI validation fail even without
`--fail-on-warnings`. Routes run in both normal and deep modes; deep mode adds
the existing wider passive-drop search.

Classic supplies 11 routes covering 36 samples. Tests deliberately remove
return arcs or the spinner, and delay a saucer's release, to verify that the
contracts detect the resulting failures. Separate flipper-input tests cover
long approaches to Classic's bank and saucer. The assembly bank checks are
local approach/rebound tests, not a guarantee that every flipper can shoot
every target. Browser review and difficulty tuning are still necessary.

## Shared built-in foundation

`src/boards/tables/table-foundation.ts` composes the common 1000-unit cabinet
for Double Crossed, and Starlight EM. It
provides lower returns, shooter geometry, and reusable orbit/bank/pocket
configuration. Each table owns its scoring arrangement and existing rules.
Harlem composes staggered halves of the lower assembly with a custom open
arch and an inline target lane to follow the photographed original.
The right orbit reuses the foundation's shooter wall without duplicating it.

Target banks accept `dropCount` for multiple trailing drops or drop-only banks
(`standupCount: 0`). The older `endDropTarget: true` remains shorthand for one
drop when `dropCount` is omitted. Counts must be nonnegative integers with at
least one target overall. Preserve composition order where rule scripts refer
to feature indices.

All built-in tables are regression-tested against geometry analysis and deep
playability, including their route contracts. The checks sample representative
feeds and drops; they do not guarantee every possible player trajectory.

Lower inlane contracts also declare `cradle: { pivot }`. After validating the
passive route, the validator reruns each velocity with that input side held,
requires a stable catch on the destination flipper, then lowers it and checks
release. See [flipper feed geometry and capture behavior](flipper-feed-spec.md)
for dimensions and acceptance criteria.

## Sling mounting

Omit slingOffset for a connected lower assembly, or set slingAtReturn to true.
The lower sling post shares the inner return exit and the generated solid back
fills the space to the return wall. Use a 1.25-radian left face for the
conventional layout; the right is mirrored automatically. See
[post-pass specification](post-pass-spec.md) for dimensions and transfer tests.

`lowerPostOffset: { x, y }` optionally extends the inner return with a solid
guide to a lower post `x` units outward and `y` units above the flipper pivot.
The connected sling back follows that extension. Classic and foundation tables
use `{ x: 30, y: 80 }` with 60° active faces. Validate feeds, flipper clearance,
and passive post-pass transfers after changing either dimension.
