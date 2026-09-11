# Table audio

Game audio has two layers: shared mechanical contacts/flipper triggers and a
table-specific electronic voice. `getTableAudioProfile` resolves the built-in
board's `themeId`; Harlem opts in, while unregistered themes keep the existing
mechanical sounds. Add another profile to this resolver to give another game
its own cue vocabulary. Audio is not stored in physics or rules state.

The game loop sends the actual `GameEvent[]` from each physics frame to audio
once. This preserves spinner triggers and target hits which cannot reliably be
inferred from a change in score or ball velocity. The existing velocity/contact
heuristic remains responsible only for mechanical bounce sounds.

## Harlem Globetrotters

Harlem uses an original Web Audio synthesis approximation of the early Bally
AS-2518-50 sound board: a mono harmonic tone with quick attack and exponential
decay, short electronic note sequences, and mechanical clicks underneath.
There is no continuous backing music or voice commentary.

| Trigger                                                      | Electronic response                               |
| ------------------------------------------------------------ | ------------------------------------------------- |
| New game / first unlocked interaction after selecting Harlem | Short opening phrase of Sweet Georgia Brown       |
| Pop bumper                                                   | High decaying tone                                |
| Slingshot                                                    | Low decaying tone                                 |
| Rollover                                                     | Midrange tone                                     |
| Spinner                                                      | Short repeated high pulses, at most six per frame |
| Standup / Dunk                                               | Three-note rising response                        |
| Inline drop target                                           | Four-note rising response                         |
| GLOBE saucer                                                 | Rising award phrase                               |
| Free Throw saucer                                            | Distinct six-note award phrase                    |

The startup cue is about 5.1 seconds and plays once per game, not once per ball.
A new game requested after game over retriggers it. Ordinary drains do not
invent a bonus-count sequence: the current Harlem rules do not implement the
original bonus countdown. Per-switch pitches, cue rhythms, and startup tempo
are estimates, not decoded ROM commands. The melody is freshly synthesized
from the 1925 composition, not sampled from a commercial recording.

A single electronic voice prevents overlapping chords. Within a frame, saucers
win over targets, and targets win over ordinary scoring. Lower-priority scoring
cannot interrupt a startup/award phrase; equal or higher priority can retrigger
the voice. A 35ms minimum retrigger interval bounds repeated same-priority
commands. These arbitration rules are application adaptations, not a claim
about exact ROM behavior.

## Browser lifecycle

Pointer or keyboard input unlocks Web Audio. Suspended contexts skip live scoring
rather than queue stale hits; the one pending startup plays when unlocking
succeeds. A failed resume can be retried by a later gesture. Switching tables or
stopping the game disconnects the electronic output and stops all scheduled
notes. An unlock that finishes after a session ends cannot start an old tune.
Unknown themes and browsers without Web Audio remain playable. The existing
Physics sandbox remains silent; audio is part of the Game session.

## References and fidelity

- [Oliver Kaegi's sound-board repair measurements](https://www.pinball4you.ch/okaegi/rep_soundold.html)
  identify Harlem's AS-2518-50 family and document its programmable tone,
  counter, trigger, and sustain circuits.
- [PinMAME's early Bally sound implementation](https://github.com/vpinball/pinmame/blob/master/src/wpc/by35snd.c)
  describes a single voice, pitch divider and 90%-per-20ms decay. The synthesis
  follows that decay scale; it does not copy PinMAME's waveform data or bundle ROMs.
- [Harlem restoration account](https://www.thepinballfix.com/harlemglobe/index_hg.html)
  documents Sweet Georgia Brown as the startup tune.
- [Melody notation](https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fmirror%2Fhome.quicknet.nl%2Fengland%2F6378)
  supplies the opening melodic phrase used for the new synthesis.

This captures the machine's electronic sound character but is not a
recording-verified or ROM-exact reproduction. Original PROM pitches, switch
command assignments, and machine-specific pitch/sustain potentiometer settings
would be needed for exact matching.

## Validation

Tests cover profile fallback, cue priority, bounded spinner bursts, event
forwarding from an actual bumper collision, startup/restart behavior, delayed
unlock, table switching, and scheduled-node cleanup. A browser OfflineAudioContext
render of the startup produces nonzero audio, a peak below 0.08 full scale, and
a silent tail after the phrase. Browser gesture playback verifies a running
AudioContext. Run `make test`, `make build`, and `make lint`.

## Ball impact texture

All tables use short synthesized impact buffers for mechanical ball bounces.
Metal guides have bright, inharmonic ticks; rubber posts have a damped low knock;
flipper rubber has a shorter, deeper contact; wood has a hollow body. Filtered
noise supplies the initial contact, with decaying resonances underneath instead
of a swept electronic tone. Five cached variations per material avoid identical
repeated hits. Impact strength controls both loudness and brightness, and ball
position controls stereo placement. Buffers fade at their boundaries and playback
nodes disconnect after completion. Existing collision detection and the 45 ms
bounce limiter remain unchanged. These are designed textures, not sampled machine
recordings. Signal tests cover common sample rates, finite bounded output, decay,
and variation.

## Just One More

Just One More uses the shared ball-impact and flipper sounds. It has no table
tone profile, music or callouts. Global sound on/off and volume settings apply.
