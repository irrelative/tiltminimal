import type { TableAudioCue } from './table-audio-profiles';

/** A single retriggerable, decaying electronic voice, like early Bally hardware. */
export class TableTonePlayer {
  private sources = new Set<OscillatorNode>();
  private output: GainNode | null = null;
  private busyUntil = 0;
  private priority = 0;
  private lastTrigger = -Infinity;

  play(
    context: AudioContext,
    cue: TableAudioCue,
    destination: AudioNode = context.destination,
  ): void {
    const now = context.currentTime;
    if (now < this.busyUntil && cue.priority < this.priority) return;
    if (now - this.lastTrigger < 0.035 && cue.priority <= this.priority) return;
    this.stop();
    this.lastTrigger = now;
    this.priority = cue.priority;
    const output = context.createGain();
    output.gain.value = 0.1;
    output.connect(destination);
    this.output = output;
    // A filtered divider-like waveform, not a modern sweep or sampled chime.
    const real = new Float32Array(9);
    const imag = new Float32Array([
      0, 1, 0.28, 0.35, 0.12, 0.16, 0.06, 0.08, 0.03,
    ]);
    const wave = context.createPeriodicWave(real, imag);
    let start = now;
    for (const note of cue.notes) {
      const length = note.beats * cue.beatSeconds;
      const oscillator = context.createOscillator();
      oscillator.setPeriodicWave(wave);
      oscillator.frequency.value = 440 * 2 ** ((note.midi - 69) / 12);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.75, start + 0.002);
      // Approximate the documented 90%-per-20ms decay of the -32/-50 voice.
      gain.gain.setTargetAtTime(0, start + 0.002, 0.19);
      gain.gain.setTargetAtTime(0, start + length - 0.006, 0.0015);
      gain.gain.setValueAtTime(0, start + length);
      oscillator.connect(gain);
      gain.connect(output);
      this.sources.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.sources.delete(oscillator);
        if (!this.sources.size && this.output === output) {
          output.disconnect();
          this.output = null;
        }
      };
      oscillator.start(start);
      oscillator.stop(start + length);
      start += length;
    }
    this.busyUntil = start;
  }

  stop(): void {
    this.output?.disconnect();
    this.output = null;
    for (const source of this.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.sources.clear();
    this.busyUntil = 0;
    this.priority = 0;
    this.lastTrigger = -Infinity;
  }
}
