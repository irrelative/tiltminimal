// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { renderTableSelection } from '../src/app/table-selection';
import { BUILT_IN_TABLES } from '../src/boards/table-library';

afterEach(() => vi.restoreAllMocks());
it.each([
  ['/arcade/', '/arcade/'],
  ['/arcade/physics?table=missing', '/arcade/physics'],
])(
  'builds table choices at %s with native shareable links',
  (path, expectedPath) => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const host = document.createElement('div');
    renderTableSelection(host, `https://example.com${path}`, '/arcade/');
    const links = [...host.querySelectorAll('a')];
    expect(links).toHaveLength(BUILT_IN_TABLES.length);
    for (const [i, link] of links.entries()) {
      const url = new URL(link.href);
      expect(url.pathname).toBe(expectedPath);
      expect(url.searchParams.get('table')).toBe(BUILT_IN_TABLES[i].id);
      expect(link.textContent).toContain(BUILT_IN_TABLES[i].board.name);
      expect(link.querySelector('canvas')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    }
    expect(host.querySelector('select')).toBeNull();
  },
);
