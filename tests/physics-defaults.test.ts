import { describe, expect, it } from 'vitest';

import { createBoardDefinition, physicsDefaults } from '../src/game/physics-defaults';

describe('createBoardDefinition', () => {
  it('fills in omitted physics values from the defaults', () => {
    const board = createTestBoard();

    expect(board.gravity).toBe(physicsDefaults.gravity);
    expect(board.tableAngle).toBe(physicsDefaults.tableAngle);
    expect(board.ball).toEqual(physicsDefaults.ball);
    expect(board.physics.launch).toEqual(physicsDefaults.tuning.launch);
    expect(board.physics.flipper).toEqual(physicsDefaults.tuning.flipper);
    expect(board.physics.solver).toEqual(physicsDefaults.tuning.solver);
    expect(board.surfaceMaterials.flipperRubber).toEqual(
      physicsDefaults.surfaceMaterials.flipperRubber,
    );
  });

  it('lets board definitions override nested physics and material defaults', () => {
    const board = createTestBoard({
      gravity: 1725,
      tableAngle: 7.1,
      ball: {
        radius: 18,
      },
      physics: {
        launch: {
          maxChargeSeconds: 2.2,
        },
        flipper: {
          swingAngularSpeed: 4.1,
          bodyMass: 0.15,
        },
        solver: {
          epsilon: 0.0025,
        },
      },
      surfaceMaterials: {
        flipperRubber: {
          grip: 1,
          restitution: 0.98,
        },
      },
    });

    expect(board.gravity).toBe(1725);
    expect(board.tableAngle).toBe(7.1);
    expect(board.ball.radius).toBe(18);
    expect(board.ball.mass).toBe(physicsDefaults.ball.mass);
    expect(board.physics.launch.maxChargeSeconds).toBe(2.2);
    expect(board.physics.launch.maxLaunchSpeed).toBe(
      physicsDefaults.tuning.launch.maxLaunchSpeed,
    );
    expect(board.physics.flipper.swingAngularSpeed).toBe(4.1);
    expect(board.physics.flipper.collisionAngleStep).toBe(
      physicsDefaults.tuning.flipper.collisionAngleStep,
    );
    expect(board.physics.flipper.bodyMass).toBe(0.15);
    expect(board.physics.flipper.restitutionScale).toBe(
      physicsDefaults.tuning.flipper.restitutionScale,
    );
    expect(board.physics.solver.epsilon).toBe(0.0025);
    expect(board.physics.solver.staticSlipThreshold).toBe(
      physicsDefaults.tuning.solver.staticSlipThreshold,
    );
    expect(board.surfaceMaterials.flipperRubber.grip).toBe(1);
    expect(board.surfaceMaterials.flipperRubber.restitution).toBe(0.98);
    expect(board.surfaceMaterials.flipperRubber.dynamicFriction).toBe(
      physicsDefaults.surfaceMaterials.flipperRubber.dynamicFriction,
    );
  });
});

const createTestBoard = (
  overrides: Partial<Parameters<typeof createBoardDefinition>[0]> = {},
) =>
  createBoardDefinition({
    name: 'Defaults Test',
    width: 800,
    height: 1200,
    drainY: 1220,
    launchPosition: {
      x: 720,
      y: 1020,
    },
    materials: {
      playfield: 'playfieldWood',
      walls: 'metalGuide',
    },
    bumpers: [],
    guides: [],
    flippers: [
      {
        side: 'left',
        x: 240,
        y: 1040,
        length: 140,
        thickness: 20,
        restingAngle: 0.3,
        activeAngle: -0.36,
        material: 'flipperRubber',
      },
      {
        side: 'right',
        x: 560,
        y: 1040,
        length: 140,
        thickness: 20,
        restingAngle: Math.PI - 0.3,
        activeAngle: Math.PI + 0.36,
        material: 'flipperRubber',
      },
    ],
    ...overrides,
  });
