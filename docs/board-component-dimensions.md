# Board Component Dimensions

This document defines the size semantics for every runtime board component.

All geometry values use the same board-space units that the canvas renderer and
physics engine use. In the current implementation, those units map directly to
playfield pixels.

## Global Board Space

- `board.width`: full playfield width
- `board.height`: full playfield height
- `x`, `y` positions are expressed in board coordinates
- angles are in radians

Unless noted otherwise, component `x` and `y` values refer to the component's
center point. The main exceptions are:

- flippers: `x`, `y` are the pivot point
- plunger: `x`, `y` are the center of the plunger body at rest
- line guides: geometry is defined by `start` and `end`, not a center point
- arc guides: geometry is defined by `center` plus radius and angles

## Ball

`BallDefinition`

- `radius`: ball radius from center to outer edge
- `mass`: relative physical mass used by the solver

## Plunger

`PlungerDefinition`

- `x`, `y`: center of the plunger body at rest
- `length`: body length along the plunger's long axis
- `thickness`: body width across the plunger
- `travel`: maximum pullback distance
- `guideLength`: vertical shooter-lane guide span above the launch position

The plunger is currently constrained to the right side of the table.

## Bumpers

`BumperDefinition`

- `x`, `y`: bumper center
- `radius`: circular radius from center to outer edge

## Posts

`PostDefinition`

- `x`, `y`: post center
- `radius`: circular radius from center to outer edge

## Standup Targets

`StandupTargetDefinition`

- `x`, `y`: target center
- `width`: unrotated extent along the local horizontal axis
- `height`: unrotated extent along the local vertical axis
- `angle`: rotation around the center

The runtime and renderer treat these as oriented rounded rectangles.

## Drop Targets

`DropTargetDefinition`

- `x`, `y`: target center
- `width`: unrotated extent along the local horizontal axis
- `height`: unrotated extent along the local vertical axis
- `angle`: rotation around the center

The same shape semantics as standup targets apply.

## Saucers

`SaucerDefinition`

- `x`, `y`: saucer center
- `radius`: capture cup radius from center to outer edge

## Spinners

`SpinnerDefinition`

- `x`, `y`: spinner center
- `length`: blade span from tip to tip
- `thickness`: blade width across the narrow axis
- `angle`: resting blade angle around the center

For clearance purposes, the spinner's rotation envelope is approximately:

- `length / 2 + thickness / 2`

from the center.

## Slingshots

`SlingshotDefinition`

- `x`, `y`: slingshot center
- `width`: base span across the sling face
- `height`: depth from the base toward the pointed tip
- `angle`: rotation around the center

The active slingshot device is not a rectangle in play; it is rendered and
treated as a triangle-like wedge, but `width` and `height` still define that
wedge's overall bounding dimensions.

## Rollovers

`RolloverDefinition`

- `x`, `y`: rollover center
- `radius`: circular trigger radius from center to outer edge

## Flippers

`FlipperDefinition`

- `x`, `y`: flipper pivot point
- `length`: pivot-to-tip body length along the flipper axis
- `thickness`: base body width at the pivot end
- `restingAngle`: at-rest angle around the pivot
- `activeAngle`: energized angle around the pivot

The flipper is not modeled as a pure capsule or rounded rectangle. It tapers
toward the tip, so:

- `thickness` defines the base width
- the tip width is derived from the base width in flipper geometry code

## Guides

### Line guides

`LineGuideDefinition`

- `start`: start point of the guide centerline
- `end`: end point of the guide centerline
- `thickness`: full guide diameter / rendered stroke width

### Arc guides

`ArcGuideDefinition`

- `center`: arc center point
- `radius`: centerline radius
- `startAngle`: start of the arc sweep
- `endAngle`: end of the arc sweep
- `thickness`: full guide diameter / rendered stroke width

### Guide planes

Both line and arc guides also support:

- `plane: 'playfield'`
- `plane: 'raised'`

This changes rendering and some validation behavior, not the dimensional
meaning of the geometry values.

## Defaults

Default dimensions for newly added editor elements live primarily in:

- `src/boards/table-library.ts`

Examples:

- default flipper length/thickness
- default target width/height
- default post and bumper radii
- default spinner length/thickness
- default slingshot width/height
- default guide thickness and default curved-guide radius

## Practical Authoring Rule

When authoring or editing boards:

- use `radius` for circular parts
- use `width` and `height` for centered oriented plates or wedge-like devices
- use `length` and `thickness` for long narrow rotating devices
- use `start`/`end` or `center`/`radius` for guides

If a component rotates, its size fields are defined before rotation. The angle
then rotates that shape in board space.
