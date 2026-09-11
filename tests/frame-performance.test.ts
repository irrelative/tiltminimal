import { describe, expect, it, vi } from 'vitest';
import { FramePerformance } from '../src/game/frame-performance';

describe('frame performance measurements', () => {
  const setup = () => {
    let cpu = 0;
    const clock = vi.fn(() => cpu);
    const meter = new FramePerformance(clock);
    meter.enabled = true;
    const frame = (time: number, update = 2, draw = 1, hidden = false) => {
      meter.begin(time, hidden);
      cpu += update;
      meter.rendering();
      cpu += draw;
      meter.end();
    };
    return { meter, frame, clock };
  };
  it.each([30, 60, 120])(
    'measures %i FPS independently of simulation step size',
    (fps) => {
      const { meter, frame } = setup();
      for (let i = 0; i <= fps; i++) frame((i * 1000) / fps);
      expect(meter.snapshot()?.fps).toBeCloseTo(fps);
      expect(meter.snapshot()?.updateMs).toBe(2);
      expect(meter.snapshot()?.renderMs).toBe(1);
    },
  );
  it('retains real stalls and calculates frame percentiles and long gaps', () => {
    const { meter, frame } = setup();
    frame(0);
    for (let i = 1; i <= 19; i++) frame(i * 10);
    frame(290);
    const stats = meter.snapshot()!;
    expect(stats.samples).toBe(20);
    expect(stats.p95Ms).toBe(10);
    expect(stats.maxMs).toBe(100);
    expect(stats.slowFrames).toBe(1);
    expect(stats.fps).toBeCloseTo(1000 / 14.5);
  });
  it('ages out old spikes and reports at most twice per second', () => {
    const { meter, frame } = setup();
    meter.onReport = vi.fn();
    frame(0);
    frame(100);
    for (let time = 110; time <= 2500; time += 10) frame(time);
    expect(meter.snapshot()?.maxMs).toBe(10);
    expect(meter.onReport).toHaveBeenCalledTimes(5);
  });
  it('resets across hidden-tab gaps and does no timing work while disabled', () => {
    const { meter, frame, clock } = setup();
    frame(0);
    frame(16);
    frame(10000, 2, 1, true);
    frame(20000);
    frame(20016);
    expect(meter.snapshot()?.maxMs).toBe(16);
    meter.enabled = false;
    clock.mockClear();
    frame(21000);
    expect(clock).not.toHaveBeenCalled();
    expect(meter.snapshot()).toBeNull();
  });
});
