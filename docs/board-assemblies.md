# Board assemblies and route contracts

Use `src/boards/assemblies/index.ts` to author connected pinball mechanisms.
Assemblies generate both collision geometry and behavioral route definitions.
Classic Table is the complete working example.

## Available assemblies

| Factory                        | Geometry and configuration                                                                                                                                                                                                 | Behavioral checks                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `createLowerPlayfieldAssembly` | Two flippers, slings, entry posts, paired inlanes/outlanes, and concentric curved returns. Configure center/pivot spacing, flipper length, lane width, return radius, entry/bend heights, and sling dimensions.            | Both inlanes feed their own flipper over nine entry velocities each. Outlane samples drain without crossing a flipper. |
| `createShooterArchAssembly`    | Shooter position and plunger, tangent extensions, concentric arch, gate, open rollover lanes, and an arch-connected lane stop. Configure arch center/radius, shooter width, gate angle, launch height, lane count/spacing. | Selected charge levels cross a rollover and enter the upper playfield.                                                 |
| `createShotLaneAssembly`       | Continuous inner/outer polylines and a spinner. Configure entrance and approach velocities plus the intended exit region.                                                                                                  | Spinner contact precedes arrival in the exit region.                                                                   |
| `createTargetBankAssembly`     | Spaced, angled standups, optional end drop target, and a parallel backing rail. Configure first target, spacing vector, dimensions, backing offset, and return region.                                                     | Each target is approachable from its scoring face and the ball returns downstream.                                     |
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
