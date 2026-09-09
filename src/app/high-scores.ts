import type { GameState } from '../game/game-state';

const keyFor = (tableId: string) => `pinball.high-scores.v1.${tableId}`;
const rank = (values: unknown): number[] =>
  Array.isArray(values)
    ? values
        .filter(
          (score): score is number =>
            typeof score === 'number' &&
            Number.isSafeInteger(score) &&
            score > 0,
        )
        .sort((a, b) => b - a)
        .slice(0, 5)
    : [];

/** Storage failures leave a usable leaderboard in memory for this page. */
export class HighScores {
  private readonly scores = new Map<string, number[]>();
  constructor(
    private readonly storage: () => Pick<Storage, 'getItem' | 'setItem'> = () =>
      window.localStorage,
  ) {}

  get(tableId: string): number[] {
    if (!this.scores.has(tableId)) {
      let scores: number[] = [];
      try {
        scores = rank(
          JSON.parse(this.storage().getItem(keyFor(tableId)) ?? '[]'),
        );
      } catch {
        /* Unavailable or malformed storage starts an empty list. */
      }
      this.scores.set(tableId, scores);
    }
    return [...this.scores.get(tableId)!];
  }

  record(tableId: string, score: number): number[] {
    const scores = rank([...this.get(tableId), score]);
    this.scores.set(tableId, scores);
    try {
      this.storage().setItem(keyFor(tableId), JSON.stringify(scores));
    } catch {
      /* Keep the session's scores even if persistence is unavailable. */
    }
    return [...scores];
  }
}

export const createGameScoreRecorder = (record: (score: number) => void) => {
  let recorded = false;
  return (state: Pick<GameState, 'status' | 'score'>): void => {
    if (state.status !== 'game-over') {
      recorded = false;
      return;
    }
    if (!recorded) {
      recorded = true;
      record(state.score);
    }
  };
};

export const renderHighScores = (
  list: HTMLOListElement,
  empty: HTMLElement,
  scores: number[],
): void => {
  list.replaceChildren(
    ...scores.map((score) => {
      const item = document.createElement('li');
      item.textContent = score.toLocaleString();
      return item;
    }),
  );
  list.hidden = scores.length === 0;
  empty.hidden = scores.length !== 0;
};
