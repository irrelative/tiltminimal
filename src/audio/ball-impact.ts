import type { SurfaceMaterialName } from '../types/board-definition';

// Short, damped resonances beneath a filtered contact transient. Inharmonic
// partials keep impacts mechanical instead of sounding like pitched notes.
const profiles = {
  metalGuide: {
    modes: [1650, 2730, 4190],
    decay: 0.024,
    noise: 0.48,
    cutoff: 6500,
  },
  rubberPost: {
    modes: [190, 427, 790],
    decay: 0.012,
    noise: 0.32,
    cutoff: 2400,
  },
  flipperRubber: {
    modes: [145, 338, 640],
    decay: 0.01,
    noise: 0.4,
    cutoff: 2000,
  },
  playfieldWood: {
    modes: [230, 531, 1130],
    decay: 0.016,
    noise: 0.5,
    cutoff: 3200,
  },
} satisfies Record<SurfaceMaterialName, unknown>;

export const synthesizeBallImpact = (
  material: SurfaceMaterialName,
  sampleRate: number,
  variant: number,
): Float32Array => {
  const profile = profiles[material];
  const samples = new Float32Array(Math.ceil(sampleRate * 0.16));
  let seed = (variant + 1) * 7919;
  let filteredNoise = 0;
  const pitch = 0.96 + (variant % 5) * 0.02;
  const smoothing = 1 - Math.exp((-2 * Math.PI * profile.cutoff) / sampleRate);
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    filteredNoise += smoothing * (noise - filteredNoise);
    const transient = filteredNoise * profile.noise * Math.exp(-t / 0.003);
    const body = profile.modes.reduce(
      (sum, frequency, mode) =>
        sum +
        (Math.sin(2 * Math.PI * frequency * pitch * t) *
          Math.exp((-t * (1 + mode * 0.55)) / profile.decay)) /
          (mode + 2),
      0,
    );
    // Fade both endpoints to avoid clicks from buffer boundaries.
    const envelope = Math.min(1, t / 0.0004) * Math.min(1, (0.16 - t) / 0.01);
    samples[i] = (body * 0.65 + transient) * envelope;
  }
  return samples;
};
