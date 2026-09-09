# User settings

Open Settings in the left sidebar. Changes apply immediately without restarting
the game or changing its score or physics.

- Sound defaults on. Turning it off silences mechanical effects and table music,
  including queued notes. Turning it back on allows subsequent sounds.
- Volume defaults to 100% and controls all game audio. Muting preserves the chosen
  volume. Browser autoplay rules still require a user gesture before audio starts.
- Ball spin marker and ball motion trail default on. Each can be hidden independently
  in Game and Physics modes, including multiball and locked balls. The physics
  overlay remains a separate diagnostic control.

Preferences apply to every table and persist across refreshes in this browser's
local storage under `pinball.settings.v1`. Invalid saved values fall back to
defaults. If storage is unavailable, controls still work for the current page.
