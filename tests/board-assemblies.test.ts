import { describe, expect, it } from 'vitest';
import { createLowerPlayfieldAssembly } from '../src/boards/assemblies/lower-playfield';
import { composeAssemblies } from '../src/boards/assemblies/shared';
import { compileBoardLayout } from '../src/boards/layout-compiler';
import { createBlankTable } from './helpers/board-fixture';
import { createBoardDefinition } from '../src/game/physics-defaults';
import { validateBallRoutes } from '../src/validation/ball-routes';
import { harlemGlobetrottersTable } from '../src/boards/tables/harlem-globetrotters';
import { classicTable } from '../src/boards/tables/classic-table';
import { cloneBoardDefinition } from '../src/boards/board-codec';
import {
  validateTableRecord,
  shouldFailValidation,
} from '../src/cli/table-validation';

const lowerOptions = {
  id: 'test-lower',
  center: { x: 504, y: 1320 },
  pivotSpacing: 320,
  flipperLength: 136,
  laneWidth: 64,
  returnRadius: 160,
  entryRise: 320,
  heelOffset: 32,
  slingOffset: { x: 144, y: 190 },
  slingWidth: 144,
  slingHeight: 50,
  slingAngle: 0.65,
};
describe('reusable board assemblies', () => {
  it('feeds both flippers after moving the lower assembly to another table', () => {
    const assembly = createLowerPlayfieldAssembly(lowerOptions);
    const layout = compileBoardLayout({
      ...composeAssemblies(assembly),
      name: 'Translated lower assembly',
      width: 1100,
      height: 1500,
      launchPosition: { x: 1020, y: 1280 },
      drainY: 1525,
      materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
    });
    expect(layout.diagnostics).toEqual([]);
    expect(validateBallRoutes(layout.board)).toEqual([]);
    expect(layout.board.flippers[0].x).toBe(344);
  });

  it('supports alternate return dimensions while keeping its flipper feed working', () => {
    const assembly = createLowerPlayfieldAssembly({
      ...lowerOptions,
      laneWidth: 72,
      returnRadius: 148,
      bendRise: 174,
    });
    const layout = compileBoardLayout({
      ...composeAssemblies(assembly),
      name: 'Narrow lower assembly',
      width: 1100,
      height: 1500,
      launchPosition: { x: 1020, y: 1280 },
      drainY: 1525,
      materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
    });
    expect(validateBallRoutes(layout.board)).toEqual([]);
  });

  it('rejects an inlane too narrow for the ball and its entry posts', () => {
    expect(() =>
      createLowerPlayfieldAssembly({ ...lowerOptions, laneWidth: 48 }),
    ).toThrow('Inlane width');
  });
  it('rejects duplicate route names when composing assemblies', () => {
    const lower = createLowerPlayfieldAssembly(lowerOptions);
    expect(() => composeAssemblies(lower, lower)).toThrow('unique');
  });
  it('keeps route definitions isolated across board construction and cloning', () => {
    const board = createBoardDefinition({
      ...createBlankTable(),
      routes: classicTable.routes,
    });
    const copy = cloneBoardDefinition(board);
    copy.routes![0].goals.length = 0;
    board.routes![1].goals.length = 0;
    expect(classicTable.routes![0].goals.length).toBeGreaterThan(0);
    expect(classicTable.routes![1].goals.length).toBeGreaterThan(0);
  });
});

describe('assembly route validation', () => {
  it('checks every switch in a drop-only bank', () => {
    const board = cloneBoardDefinition(harlemGlobetrottersTable);
    board.dropTargets.splice(2, 1);
    expect(
      validateBallRoutes(board).some(
        (issue) =>
          issue.message.includes('harlem-drop-bank/target-2') &&
          issue.message.includes('goal 1'),
      ),
    ).toBe(true);
  });
  it('detects a missing staggered upper-left flipper', () => {
    const board = cloneBoardDefinition(harlemGlobetrottersTable);
    board.flippers.splice(0, 1);
    expect(
      validateBallRoutes(board).some(
        (issue) =>
          issue.message.includes('harlem-upper-left-feed') &&
          issue.message.includes('goal 1'),
      ),
    ).toBe(true);
  });
  it('checks all declared Classic assembly routes', () => {
    expect(classicTable.routes).toHaveLength(11);
    expect(validateBallRoutes(classicTable)).toEqual([]);
  });
  it('detects missing return rails even though the ball can still drain', () => {
    const board = cloneBoardDefinition(classicTable);
    board.guides = board.guides.filter(
      (guide) => guide.kind !== 'arc' || guide.center.y < 1000,
    );
    expect(
      validateBallRoutes(board).some((issue) =>
        issue.message.includes('inlane'),
      ),
    ).toBe(true);
  });
  it('reports a removed spinner through the CLI as an error', () => {
    const board = cloneBoardDefinition(classicTable);
    board.spinners = [];
    const report = validateTableRecord({ id: 'broken-spinner', board });
    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'route-failed' &&
          issue.message.includes('classic-orbit'),
      ),
    ).toBe(true);
    expect(shouldFailValidation([report], { failOnWarnings: false })).toBe(
      true,
    );
  });
  it('detects a saucer that fails to return the ball within the route timeout', () => {
    const board = cloneBoardDefinition(classicTable);
    board.saucers[0].ejectSpeed = 0;
    board.saucers[0].holdSeconds = 20;
    const issues = validateBallRoutes(board);
    expect(
      issues.some(
        (issue) =>
          issue.message.includes('classic-saucer') &&
          issue.message.includes('goal 2'),
      ),
    ).toBe(true);
  });
  it('rejects empty route goals rather than counting them as success', () => {
    const board = cloneBoardDefinition(classicTable);
    board.routes![0].goals = [];
    expect(validateBallRoutes(board)[0].code).toBe('route-failed');
  });
});
