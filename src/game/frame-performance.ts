export interface FrameStats {
  fps: number;
  frameMs: number;
  p95Ms: number;
  maxMs: number;
  slowFrames: number;
  updateMs: number;
  renderMs: number;
  samples: number;
}
interface Sample {
  time: number;
  interval: number;
  update: number;
  render: number;
}

/** Measures actual RAF cadence, independently of clamped/scaled simulation time. */
export class FramePerformance {
  enabled = false;
  onReport?: (stats: FrameStats) => void;
  private samples: Sample[] = [];
  private previous: number | undefined;
  private time = 0;
  private started = 0;
  private renderStarted = 0;
  private lastReport = 0;
  private measuring = false;
  constructor(private readonly clock = () => performance.now()) {}

  reset(): void {
    this.samples = [];
    this.previous = undefined;
    this.lastReport = 0;
    this.measuring = false;
  }
  begin(time: number, hidden = false): void {
    if (!this.enabled || hidden) {
      this.reset();
      return;
    }
    this.time = time;
    this.started = this.clock();
    this.renderStarted = this.started;
    this.measuring = true;
  }
  rendering(): void {
    if (this.measuring) this.renderStarted = this.clock();
  }
  end(): void {
    if (!this.measuring) return;
    this.measuring = false;
    const ended = this.clock();
    if (this.previous !== undefined && this.time > this.previous) {
      this.samples.push({
        time: this.time,
        interval: this.time - this.previous,
        update: this.renderStarted - this.started,
        render: ended - this.renderStarted,
      });
    }
    this.previous = this.time;
    this.samples = this.samples.filter((s) => s.time > this.time - 2000);
    if (this.time - this.lastReport >= 500 && this.samples.length) {
      this.lastReport = this.time;
      this.onReport?.(this.snapshot()!);
    }
  }
  snapshot(): FrameStats | null {
    if (!this.samples.length) return null;
    const intervals = this.samples.map((s) => s.interval).sort((a, b) => a - b);
    const average = (values: number[]) =>
      values.reduce((a, b) => a + b, 0) / values.length;
    const frameMs = average(intervals);
    return {
      fps: 1000 / frameMs,
      frameMs,
      p95Ms: intervals[Math.ceil(intervals.length * 0.95) - 1],
      maxMs: intervals[intervals.length - 1],
      slowFrames: intervals.filter((t) => t > 50).length,
      updateMs: average(this.samples.map((s) => s.update)),
      renderMs: average(this.samples.map((s) => s.render)),
      samples: intervals.length,
    };
  }
}
