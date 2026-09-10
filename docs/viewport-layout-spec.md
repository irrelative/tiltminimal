# Board viewport layout

Game (`/`) and Physics (`/physics`) share the same stage layout. Desktop space
is reserved for the complete table, with navigation and controls beside it.

## Desktop sizing

Above 1080 CSS pixels wide, the workspace is a two-column grid with a 320-pixel sidebar and 12-pixel gap, bounded to
`100dvh` minus an 8-pixel outer inset on each side. The sidebar scrolls
independently; expanding debugging controls must not shrink the playfield or
make the entire page taller. Game/Physics navigation belongs in the sidebar.
Do not add a toolbar row above the canvas.

The stage and playfield frame have no internal padding and occupy the full
workspace height. Their borders leave approximately 9 pixels between each
vertical window edge and a height-limited board. The frame centers the canvas.
Empty horizontal space is expected for a portrait table on a wide display.

`CanvasRenderer.syncDisplaySize` fits the actual board width and height into
its parent using the smaller width/height scale. It preserves the table's
aspect ratio, changes display size on resize or table selection, and keeps
board coordinates unchanged. There is no fixed Classic aspect ratio in the
base canvas CSS. A width-constrained window may leave vertical space; fitting
the complete board takes priority over stretching or cropping it.

Keep the canvas parent padding-free: its measured `clientWidth` and
`clientHeight` include padding. Adding padding without subtracting it in the
renderer can oversize and clip the canvas. Flippers, the bottom of the board,
and the shooter must remain visible together.

## Narrow windows

At 1080 CSS pixels or below, controls and stage stack and the document may
scroll. The stage has a bounded height of `80svh`; the same renderer fits each
table within that area. This avoids an intrinsic canvas-size feedback loop in
an auto-height container. Navigation remains accessible in the controls.
Touch input continues to map through the displayed canvas rectangle.

## Review

After changing the shell or canvas sizing:

- Check both Game and Physics on desktop, including a short window.
- Switch between Classic (900 × 1400) and Harlem (1000 × 2000); both must fit
  without stretching or clipping their lower edge.
- Expand the physics overlay controls and scroll the sidebar; the stage size
  must stay fixed.
- Check a narrow window for accessible controls and a bounded, proportional
  board. Width-limited letterboxing is acceptable.
- Run `make build` and `make lint`.

The September 2026 change moved navigation into the sidebar, removed nested
stage padding, and verified full-height Classic and Harlem in the browser,
including the Physics route. Table geometry and physics are unaffected.


## HTML shell styling

The table surround, sidebar, controls and rule-card containers use square corners.
A flat dark surface and thin separators replace nested translucent cards,
gradients and large shadows. The sidebar uses compact headings, restrained reset
buttons and tabular score/debug numbers. Game/Physics navigation marks the current
page with `aria-current`, a contrasting fill and a cyan underline. Focus outlines
remain visible on controls, links and settings disclosure.

Sidebar typography is independent of the canvas fonts. This styling revision
changes no table artwork, geometry, scoring or physics. Canvas sizing remains
proportional and the parent stays padding-free. Numeric sandbox fields remain in
two columns on narrow screens. Review covered Game and Physics, Classic and
Harlem, expanded settings/debug controls, a short desktop window and a 390-pixel
mobile viewport including the rule card. Build and lint pass.
