import { describe, expect, it } from 'vitest';

import {
  BOARD_THEMES,
  DEFAULT_BOARD_THEME_ID,
  getBoardTheme,
} from '../src/render/board-themes';

describe('board themes', () => {
  it('includes four selectable built-in themes', () => {
    expect(Object.keys(BOARD_THEMES)).toEqual([
      'classic',
      'midnight',
      'sunburst',
      'grayscale',
    ]);
  });

  it('defaults to the classic theme when requested directly', () => {
    expect(DEFAULT_BOARD_THEME_ID).toBe('classic');
    expect(getBoardTheme('grayscale').label).toBe('Grayscale');
  });
});
