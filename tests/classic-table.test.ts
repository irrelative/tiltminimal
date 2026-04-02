import { describe, expect, it } from 'vitest';

import { classicTable } from '../src/boards/classic-table';

describe('classicTable', () => {
  it('exposes a valid board definition', () => {
    expect(classicTable.width).toBeGreaterThan(0);
    expect(classicTable.height).toBeGreaterThan(0);
    expect(classicTable.ball.radius).toBeGreaterThan(0);
    expect(classicTable.ball.mass).toBeGreaterThan(0);
    expect(classicTable.plunger.length).toBeGreaterThan(0);
    expect(classicTable.plunger.travel).toBeGreaterThan(0);
    expect(classicTable.plunger.guideLength).toBeGreaterThan(0);
    expect(classicTable.materials.playfield).toBe('playfieldWood');
    expect(classicTable.rulesScript).toContain('BALLS_PER_GAME');
    expect(classicTable.bumpers).toHaveLength(3);
    expect(classicTable.standupTargets).toHaveLength(2);
    expect(classicTable.dropTargets).toHaveLength(1);
    expect(classicTable.saucers).toHaveLength(1);
    expect(classicTable.spinners).toHaveLength(1);
    expect(classicTable.slingshots).toHaveLength(2);
    expect(classicTable.rollovers).toHaveLength(3);
    expect(classicTable.guides).toHaveLength(4);
    expect(classicTable.bumpers[0]?.material).toBe('rubberPost');
    expect(classicTable.flippers).toHaveLength(2);
    expect(classicTable.flippers[0]?.length).toBeGreaterThan(0);
    expect(classicTable.flippers[0]?.material).toBe('flipperRubber');
    expect(classicTable.flippers[1]?.side).toBe('right');
  });
});
