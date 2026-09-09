import { describe, expect, it } from 'vitest';
import {
  HighScores,
  createGameScoreRecorder,
  renderHighScores,
} from '../src/app/high-scores';
const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};
describe('per-table high scores', () => {
  it('keeps the five largest completed scores, including ties, across reloads', () => {
    const saved = storage();
    const scores = new HighScores(() => saved);
    [200, 900, 300, 100, 700, 600, 900].forEach((s) =>
      scores.record('harlem', s),
    );
    scores.record('andromeda', 12345);
    const reloaded = new HighScores(() => saved);
    expect(reloaded.get('harlem')).toEqual([900, 900, 700, 600, 300]);
    expect(reloaded.get('andromeda')).toEqual([12345]);
    expect(reloaded.get('classic')).toEqual([]);
  });
  it('sanitizes stored data and ignores invalid and zero scores', () => {
    const saved = storage();
    saved.setItem(
      'pinball.high-scores.v1.test',
      '[50,"900",null,-1,1.5,0,100]',
    );
    const scores = new HighScores(() => saved);
    expect(scores.get('test')).toEqual([100, 50]);
    [NaN, Infinity, -100, 0].forEach((s) => scores.record('test', s));
    expect(scores.get('test')).toEqual([100, 50]);
    saved.setItem('pinball.high-scores.v1.broken', '{');
    expect(scores.get('broken')).toEqual([]);
  });
  it('keeps scores in memory when browser storage is blocked', () => {
    const scores = new HighScores(() => {
      throw new Error('blocked');
    });
    scores.record('a', 100);
    scores.record('a', 200);
    expect(scores.get('a')).toEqual([200, 100]);
  });
  it('records each game over once, never midgame or on a replacement serve', () => {
    const scores: number[] = [];
    const observe = createGameScoreRecorder((s) => scores.push(s));
    observe({ status: 'playing', score: 100 });
    observe({ status: 'waiting-launch', score: 200 });
    observe({ status: 'game-over', score: 300 });
    observe({ status: 'game-over', score: 300 });
    expect(scores).toEqual([300]);
    observe({ status: 'waiting-launch', score: 0 });
    observe({ status: 'game-over', score: 300 });
    expect(scores).toEqual([300, 300]);
  });
  it('replaces the displayed table list and restores its empty state', () => {
    const list = document.createElement('ol'),
      empty = document.createElement('p');
    renderHighScores(list, empty, [900, 500]);
    expect(list.children).toHaveLength(2);
    expect(empty.hidden).toBe(true);
    renderHighScores(list, empty, [100]);
    expect(list.textContent).toBe('100');
    renderHighScores(list, empty, []);
    expect(list.hidden).toBe(true);
    expect(empty.hidden).toBe(false);
  });
});
