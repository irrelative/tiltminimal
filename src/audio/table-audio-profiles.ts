import type { GameEvent } from '../game/rules-types';
import type { BoardDefinition } from '../types/board-definition';

export interface ToneNote {
  midi: number;
  beats: number;
}
export interface TableAudioCue {
  notes: readonly ToneNote[];
  beatSeconds: number;
  priority: number;
}
export interface TableAudioProfile {
  id: string;
  start: TableAudioCue;
  cueForEvents(events: readonly GameEvent[]): TableAudioCue | null;
}
const notes = (pitches: number[], beats = 1): ToneNote[] =>
  pitches.map((midi) => ({ midi, beats }));
const cue = (
  pitches: number[],
  beatSeconds: number,
  priority = 1,
): TableAudioCue => ({
  notes: notes(pitches),
  beatSeconds,
  priority,
});

// Opening phrase of the 1925 melody, freshly synthesized. This is not a
// transcription of the game's ROM timing or the Brother Bones recording.
const sweetGeorgiaBrown: TableAudioCue = {
  notes: [
    ...[64, 66, 68, 64, 71, 68, 73, 71, 76, 71, 68, 64].map((midi, i) => ({
      midi,
      beats: [1, 1, 1.5, 0.5, 1, 1, 1.5, 0.5, 2, 1, 1, 4][i],
    })),
    ...[64, 66, 67, 64, 71, 67, 73, 69, 76, 73, 71, 69].map((midi, i) => ({
      midi,
      beats: [1, 1, 1.5, 0.5, 1, 1, 1.5, 0.5, 2, 1, 1, 4][i],
    })),
  ],
  beatSeconds: 0.16,
  priority: 3,
};

export const harlemAudioProfile: TableAudioProfile = {
  id: 'harlem',
  start: sweetGeorgiaBrown,
  cueForEvents(events) {
    let selected: TableAudioCue | null = null;
    const spins = events.filter((e) => e.type === 'spinner-spin').length;
    for (const event of events) {
      let next: TableAudioCue | null = null;
      switch (event.type) {
        case 'bumper-hit':
          next = cue([76], 0.18);
          break;
        case 'slingshot-hit':
          next = cue([64], 0.13);
          break;
        case 'rollover-hit':
          next = cue([71], 0.15);
          break;
        case 'standup-target-hit':
          next = cue([68, 71, 76], 0.075, 2);
          break;
        case 'drop-target-hit':
          next = cue([69, 73, 76, 81], 0.075, 2);
          break;
        case 'saucer-captured':
          next =
            event.index === 1
              ? cue([76, 73, 69, 73, 76, 81], 0.1, 3)
              : cue([71, 76, 80, 83], 0.12, 3);
          break;
        case 'spinner-spin':
          next = cue(Array(Math.min(spins, 6)).fill(79), 0.055);
          break;
      }
      if (next && (!selected || next.priority > selected.priority))
        selected = next;
    }
    return selected;
  },
};

// The existing theme identifies built-in table families; unknown/custom themes
// retain the generic mechanical audio. No sound state enters physics or rules.
export const getTableAudioProfile = (
  board: Pick<BoardDefinition, 'themeId'>,
): TableAudioProfile | null =>
  board.themeId === 'harlem' ? harlemAudioProfile : null;
