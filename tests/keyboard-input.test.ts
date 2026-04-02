// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KeyboardInput, PlayInput } from '../src/input/keyboard-input';

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

describe('PlayInput', () => {
  let canvas: HTMLCanvasElement;
  let input: PlayInput;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 900,
        height: 1400,
        right: 900,
        bottom: 1400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    input = new PlayInput(canvas);
    input.connect();
  });

  afterEach(() => {
    input.disconnect();
  });

  it('maps lower-left and lower-right touches to the flippers', () => {
    dispatchPointer(canvas, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 140,
      clientY: 1200,
    });
    dispatchPointer(canvas, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 760,
      clientY: 1220,
    });

    expect(input.getState()).toMatchObject({
      leftPressed: true,
      rightPressed: true,
      launchPressed: false,
    });

    dispatchPointer(canvas, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 140,
      clientY: 1200,
    });
    dispatchPointer(canvas, 'pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 760,
      clientY: 1220,
    });

    expect(input.getState()).toMatchObject({
      leftPressed: false,
      rightPressed: false,
    });
  });

  it('maps touch swipes to nudge pulses', () => {
    dispatchPointer(canvas, 'pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 420,
      clientY: 700,
    });
    dispatchPointer(canvas, 'pointermove', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 350,
      clientY: 698,
    });

    expect(input.getState()).toMatchObject({
      nudgeLeftPressed: true,
      nudgeRightPressed: false,
      nudgeUpPressed: false,
    });
    expect(input.getState().nudgeLeftPressed).toBe(false);

    dispatchPointer(canvas, 'pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 350,
      clientY: 698,
    });

    dispatchPointer(canvas, 'pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 470,
      clientY: 760,
    });
    dispatchPointer(canvas, 'pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 472,
      clientY: 700,
    });

    expect(input.getState()).toMatchObject({
      nudgeUpPressed: true,
    });
  });

  it('uses a downward swipe on the right side to hold the plunger', () => {
    dispatchPointer(canvas, 'pointerdown', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 760,
      clientY: 720,
    });
    dispatchPointer(canvas, 'pointermove', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 768,
      clientY: 790,
    });

    expect(input.getState()).toMatchObject({
      launchPressed: true,
      rightPressed: false,
    });

    dispatchPointer(canvas, 'pointerup', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 768,
      clientY: 790,
    });

    expect(input.getState().launchPressed).toBe(false);
  });
});

const dispatchPointer = (
  target: EventTarget,
  type: string,
  init: {
    pointerId: number;
    pointerType: string;
    clientX: number;
    clientY: number;
  },
): void => {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as Event & {
    pointerId: number;
    pointerType: string;
    clientX: number;
    clientY: number;
  };

  for (const [key, value] of Object.entries(init)) {
    Object.defineProperty(event, key, {
      configurable: true,
      value,
    });
  }
  target.dispatchEvent(event);
};
