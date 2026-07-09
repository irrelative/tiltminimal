# Mirror Match Specification

`Mirror Match` is a three-ball solid-state built-in table centered on paired
left/right shots and matching target-bank objectives.

## Layout

- two lower flippers, active slingshots, visible inlanes, outlanes, and raised
  return rails form a conventional lower third
- wide raised side rails make the inlane/outlane mouths visually distinct from
  the other built-in tables while preserving the right shooter-lane corridor
- held flippers retain a low-speed ball against the inboard blade, providing a
  controllable cradle on either side
- mirrored standup banks and spinner shots frame a centered pop-bumper cluster
  and center saucer
- a symmetric three-lane top arch feeds the upper playfield
- the right shooter lane and its launch transition are the intentional exception
  to left/right mirror geometry

## Rules

- completing all three targets in both mirrored banks lights the center saucer
- the lit saucer awards an extra score award and advances the bonus multiplier
- top lanes, pop bumpers, spinners, and slingshots add score and bonus
- balls drain through the standard three-ball lifecycle with end-of-ball bonus
  counting

## Validation

`Mirror Match` must compile through the layout DSL, clear layout and geometry
analysis, and pass normal playability validation. Its tests verify device
symmetry, the right-lane launcher exception, full-plunge behavior, and raised
return rails that keep the two flipper cradle regions clear. The shared physics
tests also verify held-flipper cradle retention.
