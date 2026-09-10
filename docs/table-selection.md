# Table selection

The root URL without a valid `?table=` parameter opens a “Select a table” landing
page. Five native links show static canvas previews, table names, ball counts,
and short descriptions. The responsive gallery uses three, two, or one column.
No game loop, keyboard gameplay input or audio is started on this page.

Choosing a table navigates to `?table=<id>`. Refreshing that URL starts the same
table; browser Back returns to the gallery. The in-game sidebar has a “Select a
table” link instead of a dropdown. Returning to selection leaves the current game;
partial games do not create high scores. Saved settings and scores remain intact.
Invalid or removed table IDs show the gallery instead of silently choosing a game.

Physics remains hidden from navigation. `/physics` without a valid table shows
the same gallery, whose links retain the Physics route. Direct
`/physics?table=<id>` URLs continue opening the sandbox. All links respect the
configured deployment base path.

`main.ts` selects the view and loads `app/game-app.ts` only for a valid game URL.
`app/table-selection.ts` builds the gallery, using the existing board renderer
for static previews. No playfield geometry, artwork or rules change.
