// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuleCard } from '../src/app/rule-card';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { TABLE_RULE_CARDS } from '../src/boards/table-rule-cards';

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('table rule cards', () => {
  it('provides distinct scoring instructions for every selectable table', () => {
    expect(Object.keys(TABLE_RULE_CARDS).sort()).toEqual(
      BUILT_IN_TABLES.map((t) => t.id).sort(),
    );
    expect(
      new Set(Object.values(TABLE_RULE_CARDS).map((c) => c.objective)).size,
    ).toBe(BUILT_IN_TABLES.length);
  });

  it('toggles suspension, closes with Escape, and resets content on table changes', () => {
    document.body.innerHTML =
      '<aside><div id="rules"></div></aside><canvas></canvas>';
    const pause = vi.fn();
    const ui = new RuleCard(document.querySelector('#rules')!, pause);
    ui.setTable(BUILT_IN_TABLES[0]);
    const button = document.querySelector('summary')!;
    const card = document.querySelector<HTMLElement>('#table-rule-card')!;
    expect(document.querySelector('aside')!.contains(card)).toBe(true);
    expect(document.querySelector('canvas')!.children).toHaveLength(0);
    expect(card.hidden).toBe(true);
    button.click();
    expect(card.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('details')!.open).toBe(true);
    expect(button.textContent).toBe('Rule card');
    expect(pause).toHaveBeenLastCalledWith(true);
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(card.hidden).toBe(true);
    expect(pause).toHaveBeenLastCalledWith(false);
    button.click();
    ui.setTable(BUILT_IN_TABLES.find((t) => t.id === 'starlight-em')!);
    expect(card.hidden).toBe(true);
    expect(card.textContent).toContain('5 balls');
    expect(card.textContent).toContain('Keyboard controls');
    expect(card.textContent).toContain('Left Shift, Left Arrow, or A');
    expect(card.textContent).toContain('hold Up Arrow to pull back');
    expect(card.textContent).toContain('Space for forward');
    expect(pause).toHaveBeenLastCalledWith(false);
  });
});
