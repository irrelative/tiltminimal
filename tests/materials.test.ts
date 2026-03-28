import { describe, expect, it } from 'vitest';

import { getSurfaceMaterial } from '../src/game/materials';

describe('surface materials', () => {
  it('gives flipper rubber more grip than metal guides', () => {
    const flipperRubber = getSurfaceMaterial('flipperRubber');
    const metalGuide = getSurfaceMaterial('metalGuide');

    expect(flipperRubber.grip).toBeGreaterThan(metalGuide.grip);
    expect(flipperRubber.staticFriction).toBeGreaterThan(
      metalGuide.staticFriction,
    );
    expect(flipperRubber.dynamicFriction).toBeGreaterThan(
      metalGuide.dynamicFriction,
    );
  });

  it('keeps rubber posts bouncier than the playfield surface', () => {
    const rubberPost = getSurfaceMaterial('rubberPost');
    const playfieldWood = getSurfaceMaterial('playfieldWood');

    expect(rubberPost.restitution).toBeGreaterThan(playfieldWood.restitution);
    expect(rubberPost.compliance).toBeGreaterThan(playfieldWood.compliance);
  });

  it('keeps all default materials below a perfectly elastic bounce', () => {
    const materials = [
      getSurfaceMaterial('playfieldWood'),
      getSurfaceMaterial('metalGuide'),
      getSurfaceMaterial('rubberPost'),
      getSurfaceMaterial('flipperRubber'),
    ];

    for (const material of materials) {
      expect(material.restitution).toBeLessThan(1);
    }
  });
});
