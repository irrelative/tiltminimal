import { afterEach, expect, it, vi } from 'vitest';
import { PlayControls } from '../src/app/play-controls';
import { RuleCard } from '../src/app/rule-card';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { createInitialGameState } from '../src/game/game-state';
import type { GameLoop } from '../src/game/game-loop';

afterEach(() => document.body.replaceChildren());
const fixture = () => {
  const host = document.createElement('div');
  document.body.append(host);
  const ruleHost = document.createElement('div');
  document.body.append(ruleHost);
  const card = new RuleCard(ruleHost, (open) => controls.setRuleCardOpen(open));
  const controls = new PlayControls(host, () => card.close());
  card.setTable(BUILT_IN_TABLES[0]);
  const state = createInitialGameState(BUILT_IN_TABLES[0].board);
  const loop = {
    suspended: false,
    debug: { paused: false },
    restartGame: vi.fn(),
  };
  controls.observe(state, loop as unknown as GameLoop);
  return {
    host,
    ruleHost,
    controls,
    state,
    loop,
    pause: host.querySelector<HTMLButtonElement>('.play-pause')!,
  };
};

it('shows launch guidance between balls, hides it during charging and live play', () => {
  const f = fixture();
  const panel = f.host.querySelector<HTMLElement>('.play-status')!;
  expect(panel.hidden).toBe(false);
  expect(panel.textContent).toContain('Keyboard: hold ↑');
  expect(panel.textContent).toContain('Touch: swipe down');
  f.state.plunger.pullback = 10;
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  expect(panel.hidden).toBe(true);
  f.state.status = 'playing';
  f.state.plunger.pullback = 0;
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  expect(panel.hidden).toBe(true);
  f.state.status = 'waiting-launch';
  f.state.rules.currentBall = 2;
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  expect(panel.hidden).toBe(false);
  expect(panel.textContent).toContain('Ball 2 of');
});

it('preserves an explicit pause when the rule card closes and resumes from either pause', () => {
  const f = fixture();
  const toggle = f.ruleHost.querySelector('summary')!;
  f.pause.click();
  expect(f.loop.suspended).toBe(true);
  toggle.click();
  toggle.click();
  expect(f.loop.suspended).toBe(true);
  expect(f.pause.textContent).toBe('Resume');
  f.pause.click();
  expect(f.loop.suspended).toBe(false);
  toggle.click();
  expect(f.loop.suspended).toBe(true);
  f.pause.click();
  expect(f.loop.suspended).toBe(false);
  expect(f.ruleHost.querySelector('details')!.open).toBe(false);
  f.loop.debug.paused = true;
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  f.pause.click();
  expect(f.loop.debug.paused).toBe(false);
});

it('dismisses launch guidance until another ball needs launching', () => {
  const f = fixture();
  const panel = f.host.querySelector<HTMLElement>('.play-status')!;
  panel.querySelector('h2')!.click();
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  expect(panel.hidden).toBe(true);
  f.pause.click();
  expect(panel.hidden).toBe(false);
  panel.click();
  expect(panel.hidden).toBe(false);
  f.pause.click();
  expect(panel.hidden).toBe(true);
  f.state.rules.currentBall = 2;
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  expect(panel.hidden).toBe(false);
  expect(panel.getAttribute('role')).toBe('button');
  panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(panel.hidden).toBe(true);
  f.state.status = 'playing';
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  f.state.status = 'waiting-launch';
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  expect(panel.hidden).toBe(false);
  panel.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
  expect(panel.hidden).toBe(true);
});

it('keeps dismissal across cloned physics frames and restores guidance on reset', () => {
  const f = fixture();
  const panel = f.host.querySelector<HTMLElement>('.play-status')!;
  panel.click();
  const nextFrame = {
    ...f.state,
    ball: { ...f.state.ball },
    tick: f.state.tick + 1,
  };
  f.controls.observe(nextFrame, f.loop as unknown as GameLoop);
  expect(panel.hidden).toBe(true);
  f.controls.observe(
    { ...nextFrame, ball: { ...nextFrame.ball } },
    f.loop as unknown as GameLoop,
  );
  expect(panel.hidden).toBe(false);
});

it('offers final score and replay only after game over, with usable focus after replay', () => {
  const f = fixture();
  const replay = f.host.querySelector<HTMLButtonElement>(
    '.play-status button',
  )!;
  expect(replay.hidden).toBe(true);
  replay.click();
  expect(f.loop.restartGame).not.toHaveBeenCalled();
  f.state.status = 'game-over';
  f.state.score = 12345;
  f.controls.observe(f.state, f.loop as unknown as GameLoop);
  expect(replay.hidden).toBe(false);
  expect(f.host.textContent).toContain('Final score: 12,345');
  replay.click();
  expect(f.loop.restartGame).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(f.pause);
});

it.each(['blur', 'pagehide', 'orientationchange'])(
  'pauses on %s and requires an explicit Resume after returning',
  (event) => {
    const f = fixture();
    f.state.status = 'playing';
    window.dispatchEvent(new Event(event));
    expect(f.loop.suspended).toBe(true);
    expect(f.pause.textContent).toBe('Resume');
    window.dispatchEvent(new Event('focus'));
    f.controls.observe(f.state, f.loop as unknown as GameLoop);
    expect(f.loop.suspended).toBe(true);
    f.pause.click();
    expect(f.loop.suspended).toBe(false);
  },
);

it('pauses when the document is hidden and stays paused when visible again', () => {
  const f = fixture();
  const hidden = vi.spyOn(document, 'hidden', 'get');
  hidden.mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(f.loop.suspended).toBe(true);
  hidden.mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(f.loop.suspended).toBe(true);
  f.pause.click();
  expect(f.loop.suspended).toBe(false);
  hidden.mockRestore();
});
