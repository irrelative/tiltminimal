import { describe, expect, it } from 'vitest';

import { classicTable } from '../src/boards/classic-table';

describe('classicTable', () => {
  it('exposes a valid board definition', () => {
    expect(classicTable.width).toBeGreaterThan(0);
    expect(classicTable.height).toBeGreaterThan(0);
    expect(classicTable.ball.radius).toBeGreaterThan(0);
    expect(classicTable.ball.mass).toBeGreaterThan(0);
    expect(classicTable.materials.playfield).toBe('playfieldWood');
    expect(classicTable.bumpers).toHaveLength(3);
    expect(classicTable.bumpers[0]?.material).toBe('rubberPost');
    expect(classicTable.flippers.left.length).toBeGreaterThan(0);
    expect(classicTable.flippers.left.material).toBe('flipperRubber');
    expect(classicTable.flippers.right.length).toBeGreaterThan(0);
  });
});
