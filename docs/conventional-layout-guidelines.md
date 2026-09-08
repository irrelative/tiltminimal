# Table layout requirements

This is the shared layout standard for new tables and changes to existing
ones. Table-specific specs describe intentional variations; they must preserve
working feeds, shot entrances, and drain paths. A plausible drawing or a clean
geometry report alone does not establish a playable table.

## Author connected mechanisms

Start with the factories in [board-assemblies.md](board-assemblies.md). They
produce geometry and route contracts together. Use the shared foundation in
`src/boards/tables/table-foundation.ts` when its cabinet and lower third fit.
Classic is a compact complete assembly example; Harlem demonstrates documented,
reference-based asymmetry. Legacy layout primitives remain available for
low-level composition, but do not guarantee working feeds.

Design the lower playfield first, then connect the shooter/arch and major shot
families. Two-flipper tables need active paired slings, inlanes, and outlanes.
Each extra flipper needs an explicit feed and a shot purpose. Place target banks,
spinners, and saucers with approach corridors and return/eject paths. Keep at
least one major objective off the centerline to provide distinct shot choices.

Keep geometry in board definitions and assemblies, contact behavior in shared
physics, and artwork in rendering. Do not compensate for a blocked lane by
adding a table-specific physics exception or changing shared capture limits.

## Clearances and center drain

Measure usable space between collision surfaces, including ball radius, guide
thickness, posts, and tapered flipper rubber. Pivot spacing and visible gaps
between centerlines are insufficient. Use the actual board ball radius and
shared flipper geometry helpers; see [component dimensions](board-component-dimensions.md).

Every main lower flipper arrangement must leave an unobstructed center drain
with the flippers at rest. For opposed lower tips, target horizontal clearance
greater than the ball diameter plus 20 board units at the current table scale.
Compute the tip edges with `getFlipperTipPosition` at `restingAngle` and
`getFlipperTipRadius`. Scale the margin deliberately if changing the table's
coordinate scale. Check the complete ball-sized corridor down to `drainY`, not
just its entrance. A guide, extra flipper, or post must not bridge that corridor.

For staggered flippers, the horizontal tip measurement is only a conservative
screen: inspect every flipper along the descent and prove the path with ball
simulation. Harlem's approximately 57-unit opening for a 32-unit ball is a
working example, not a universal coordinate template.

Add center-drain feed routes at several positions across the usable corridor
and at more than one downward speed. Use a `drain` goal with
`avoidFlippers: true`, starting above the opening. Harlem tests three positions
and two speeds. Keep a dimensional regression assertion as well as these route
checks. Center-drain contracts are an authoring requirement; the lower assembly
does not currently generate them automatically, and the generic validator does
not guarantee their presence.

## Return lanes and cradling

Anchor each return bend, exit, and route destination to its flipper pivot.
Moving a flipper requires reviewing its return, sling clearance, direct feeds,
route references, and center drain together. Use the tested starting dimensions
in [flipper-feed-spec.md](flipper-feed-spec.md), then validate the full table.
Do not copy absolute coordinates between cabinets of different proportions.

A held return must land on the movable upper face and settle in the capture
region. A ball balanced on a rail endpoint or stationary heel, trapped under a
flipper, or wedged between two solids is a failure. Lowering the flipper must
release the ball. Preserve the return arcs' downward exit slopes and enough
room for the ball around the entire flipper sweep. `plane: 'raised'` guides are
skipped by ball collision; they cannot serve as physical feed rails or be used
to hide a collision problem from validation.

Each flipper needs at least one feed route with `cradle: { pivot }`. Inlanes
should exercise the assembly's nine entry velocities: horizontal -40/0/40 and
downward 0/250/500 units per second. Add routes for extra flippers. The validator
raises all flippers on the selected input side, so same-side flippers must also
work together. See the feed spec for exact hold and release thresholds.

Declare the passive outcome separately from the held catch. Conventional
inlanes should feed their own resting flipper. A documented asymmetric return
may instead enter a specific lower-playfield region and drain when unheld, as
Harlem does. Keep its held catch/release checks. Do not widen goals merely to
silence a failure: explain the intended trajectory in the table spec and check
that the route starts outside its goal region. Outlanes must retain their own
unobstructed drain contracts.

## Connected shots and reference tables

Join cabinet, arch, and lane boundaries explicitly without duplicate walls or
endpoint gaps. Keep the shooter's one-way transition into live play. Verify
plunges reach the upper playfield, spinners can turn, target scoring faces are
approachable, and saucer ejects clear nearby solids. Preserve route-bearing
layouts' precision; grid snapping can disconnect joints and route references.

For recreations, record source photographs and which geometry is estimated in
the table spec. Preserve distinctive flipper counts, staggering, mechanisms,
and shot relationships. Document adaptations required by shared 2D physics.
Reference fidelity must still allow ball clearance, a center drain, and usable
feeds. Artwork must not imply a physical lane that the collision model lacks.

## Acceptance workflow

1. Compile through `compileBuiltInBoardLayout` and define routes alongside the
   mechanisms, including center drains and held feeds.
2. Add focused regression coverage for changed geometry or behavior. Review
   failed trajectories before changing contracts.
3. Run the commands below. Shared assembly changes require all-table validation.
4. Inspect the full table and lower third in `/physics` with the physics overlay.
   Drop balls through the center and both inlanes; hold and release each input
   side. Use pause/step to distinguish a cradle from a pinch or endpoint balance.
5. Update the table spec with intentional exceptions and validation evidence.

```sh
make test
make validate-table TABLE='--all --deep-playability --fail-on-warnings'
make build
make lint
```

For Classic changes, also run `make playtest-classic` and review its timing sweep
and seeded-game report. That runner currently covers Classic only. Route and
deep-drop checks sample trajectories; browser play remains necessary for shot
readability, timing, and difficulty. No current check proves all shots playable.
