# Conventional Layout Guidelines

Built-in tables should use recognizable pinball shot structure, not only a
collection of valid collision objects.

## Required Anatomy

- Two-flipper tables need paired slingshots, inlanes, and outlanes around the
  lower playfield.
- A shooter lane must have a one-way transition into live play.
- Target banks and spinners need a readable approach and a return path; avoid
  placing them as isolated objects in open space.
- Extra flippers need a defined feed, protected feature, or upper-playfield
  shot family.
- Keep at least one major objective off the centerline so the player has a
  meaningful left/right shot choice.

## Review

Run `make validate-table TABLE=--all` after layout edits. Geometry validation
is necessary but not sufficient: review launch return warnings, trap warnings,
and whether the table still presents clear shot families.
