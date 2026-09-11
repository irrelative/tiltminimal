# Hosting and analytics

Production is served at https://tiltminimal.com (also www.tiltminimal.com) by
Cloudflare Worker `tiltminimal`, with Vite's static `dist/` assets served directly.
The API and private dashboard run on the same origin. GitHub Pages remains an
independent deployment; its host and local development do not send game analytics.

## Deploy

Wrangler is a project development dependency. Authenticate with
`npx wrangler login`, then run `make deploy`. This builds for `/`, applies remote
D1 migrations, and publishes the Worker and static assets, including custom-domain
routes. `wrangler.jsonc` contains public resource IDs only. Keep the Free plan;
static assets bypass the Worker, and analytics failures do not stop play.

`make preview-cloudflare` builds, migrates local D1, and starts a local preview.
Use a local `.dev.vars` file with `ADMIN_TOKEN=<local-test-key-at-least-32-chars>`.
The compatibility date is pinned to 2026-05-03, supported by the installed
Wrangler runtime. No paid services or automatic plan upgrades are required.

This deployment is manual with `make deploy`. The existing GitHub Actions Pages
workflow still publishes the GitHub Pages mirror; it does not update Cloudflare.

## Views and game records

Cloudflare Web Analytics is enabled for tiltminimal.com through its dashboard
with automatic beacon injection. It provides traffic, referrals and performance
reports. The app also sends lightweight same-origin events to `/api/events`,
backed by D1 database `pinball-stats`, for table-specific views and game counts:

- `view`: one page-load event for gallery or selected table, aggregated per UTC
  day/table. These count loads, not unique people. Physics pages are excluded.
- `start`: first plunge into play; new UUID per game, never a persistent visitor
  ID. Ball changes and lock/replacement plunges do not create another game.
- `finish`: once at game over, with score and active playing milliseconds.
  Time is accumulated only while playing, excluding pauses/hidden tabs and
  capping each frame's contribution at 250ms. This is approximate active time.
- `exclude`: reset ball or physics overlay during a game disqualifies that game
  from completed-score reporting. It remains visible as an excluded start.

Started games without a finish may be abandoned, in progress, or have lost their
final request. No unload event is assumed reliable. Requests are serialized and
briefly retried; starts and finishes are idempotent. View counts may include a
retry if the acknowledgement is lost. No game state depends on request success.
No IP address, player name, account, cookie, or persistent visitor identifier
is stored in the analytics database. Cloudflare processes IPs for hosting and
rate limiting. Anonymous data is retained for historical comparison. The public
`/privacy` page explains this, linked from the game.

Requests require same-origin JSON, bounded bodies and valid table/event fields.
The Worker limits an IP to 60 API requests/minute per Cloudflare location.
Scores are client-reported, not anti-cheat verified. The backend rejects repeated
finishes and excluded games. Increment `RULES_VERSION` in `src/app/analytics.ts`
when scoring changes so records from different rules can be distinguished.

## Private dashboard

Visit https://tiltminimal.com/stats and enter the dashboard key. The key is stored
as Worker secret `ADMIN_TOKEN`; the initial deployment's local copy is in
`.cloudflare-admin-token` (ignored by Git, permissions 0600). Move it to your
password manager. It is never compiled into the frontend or put in a URL.
The dashboard keeps its input in memory only. `/api/stats` checks the bearer key
before querying D1 and sends `Cache-Control: no-store`.

The dashboard shows 30 days of views, starts/completions/exclusions by table,
average active duration, and all-time top-five completed scores for each table
and rules version. It does not replace the players' local high-score lists.

Rotate the key with `npx wrangler secret put ADMIN_TOKEN`, or pipe a newly generated
key file into that command. Never commit the key, `.dev.vars`, or Wrangler state.
To inspect data directly, use D1 Studio in Cloudflare's dashboard or
`npx wrangler d1 execute pinball-stats --remote --command '<read-only SQL>'`.

## Validation

Unit coverage checks game lifecycle accounting, reset/debug exclusions, event
validation, unknown tables, origin checks, body size limits, authentication and
rate limiting. Local Worker/D1 smoke tests additionally verify real SQL, duplicate
start/finish handling, exclusions, static assets and authenticated reports.

Initial acceptance: 480 tests, production build, and lint passed. The deployed
Worker served static pages, rejected unauthenticated statistics requests, and
stored a temporary start/finish score that was removed after verification.
Both custom domains served HTTPS successfully at their public DNS addresses;
HTTP redirects to HTTPS. Cloudflare's automatic analytics beacon was verified
in a browser-style HTML request. Local resolvers may briefly retain NXDOMAIN
from before the new domain records existed.
