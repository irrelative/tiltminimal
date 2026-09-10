import { describe, expect, it } from 'vitest';
import { synthesizeBallImpact } from '../src/audio/ball-impact';
import type { SurfaceMaterialName } from '../src/types/board-definition';

const materials: SurfaceMaterialName[] = [
  'metalGuide',
  'rubberPost',
  'flipperRubber',
  'playfieldWood',
];
describe('ball impact audio', () => {
  for (const sampleRate of [44100, 48000]) {
    it(`produces bounded, decaying impacts at ${sampleRate} Hz`, () => {
      for (const material of materials) {
        const samples = synthesizeBallImpact(material, sampleRate, 0);
        expect(samples.every(Number.isFinite)).toBe(true);
        const peak = Math.max(...samples.map(Math.abs));
        expect(peak).toBeGreaterThan(0.1);
        expect(peak).toBeLessThan(1);
        expect(Math.abs(samples[0])).toBe(0);
        const energy = (from: number, to: number) =>
          samples
            .slice(from, to)
            .reduce((sum, value) => sum + value * value, 0);
        expect(energy(samples.length - 480, samples.length)).toBeLessThan(
          energy(0, 480) * 0.001,
        );
      }
    });
  }
  it('varies repeated impacts and distinguishes surfaces reproducibly', () => {
    const rubber = synthesizeBallImpact('rubberPost', 48000, 0);
    expect(synthesizeBallImpact('rubberPost', 48000, 0)).toEqual(rubber);
    expect(synthesizeBallImpact('rubberPost', 48000, 1)).not.toEqual(rubber);
    for (const material of materials.filter(
      (value) => value !== 'rubberPost',
    )) {
      expect(synthesizeBallImpact(material, 48000, 0)).not.toEqual(rubber);
    }
  });
});
