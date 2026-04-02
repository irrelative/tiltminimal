// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KeyboardInput } from '../src/input/keyboard-input';

describe('KeyboardInput', () => {
  let input: KeyboardInput;

  beforeEach(() => {
    input = new KeyboardInput();
    input.connect();
  });

  afterEach(() => {
    input.disconnect();
  });

  it('maps left and right shift to the flippers', () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft' }),
    );
    expect(input.getState().leftPressed).toBe(true);
    expect(input.getState().rightPressed).toBe(false);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftRight' }),
    );
    expect(input.getState().leftPressed).toBe(true);
    expect(input.getState().rightPressed).toBe(true);

    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft' }),
    );
    expect(input.getState().leftPressed).toBe(false);
    expect(input.getState().rightPressed).toBe(true);

    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftRight' }),
    );
    expect(input.getState().rightPressed).toBe(false);
  });

  it('keeps arrow keys mapped to the same flippers', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

    expect(input.getState()).toMatchObject({
      leftPressed: true,
      rightPressed: true,
      launchPressed: true,
    });
  });

  it('maps z, slash, and space to left, right, and up nudges', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(input.getState()).toMatchObject({
      nudgeLeftPressed: true,
      nudgeRightPressed: true,
      nudgeUpPressed: true,
      launchPressed: false,
    });

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: '/' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));

    expect(input.getState()).toMatchObject({
      nudgeLeftPressed: false,
      nudgeRightPressed: false,
      nudgeUpPressed: false,
    });
  });
});
