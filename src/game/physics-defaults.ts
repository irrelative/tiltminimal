import type {
  BallDefinition,
  BoardDefinition,
  BoardDefinitionInput,
  PhysicsDefinition,
  SurfaceMaterial,
  SurfaceMaterialName,
} from '../types/board-definition';

export const physicsDefaults = {
  gravity: 1600,
  tableAngle: 6.5,
  ball: {
    radius: 16,
    mass: 0.08,
  } satisfies BallDefinition,
  surfaceMaterials: {
    playfieldWood: {
      name: 'playfieldWood',
      restitution: 0.52,
      staticFriction: 0.42,
      dynamicFriction: 0.3,
      rollingResistance: 0.018,
      spinDamping: 0.08,
      compliance: 0.04,
      grip: 0.35,
    },
    metalGuide: {
      name: 'metalGuide',
      restitution: 0.62,
      staticFriction: 0.24,
      dynamicFriction: 0.16,
      rollingResistance: 0.01,
      spinDamping: 0.04,
      compliance: 0.02,
      grip: 0.12,
    },
    rubberPost: {
      name: 'rubberPost',
      restitution: 0.82,
      staticFriction: 0.74,
      dynamicFriction: 0.58,
      rollingResistance: 0.024,
      spinDamping: 0.12,
      compliance: 0.22,
      grip: 0.7,
    },
    flipperRubber: {
      name: 'flipperRubber',
      restitution: 0.76,
      staticFriction: 0.96,
      dynamicFriction: 0.82,
      rollingResistance: 0.03,
      spinDamping: 0.16,
      compliance: 0.18,
      grip: 0.9,
    },
  } satisfies Record<SurfaceMaterialName, SurfaceMaterial>,
  tuning: {
    launch: {
      maxChargeSeconds: 1.4,
      minLaunchSpeed: 900,
      maxLaunchSpeed: 1850,
      minLaunchDrift: -70,
      maxLaunchDrift: -260,
    },
    flipper: {
      swingAngularSpeed: 30,
      collisionAngleStep: 0.08,
    },
    solver: {
      epsilon: 0.0001,
      staticSlipThreshold: 28,
    },
  } satisfies PhysicsDefinition,
};

export const createBoardDefinition = (
  input: BoardDefinitionInput,
): BoardDefinition => ({
  name: input.name,
  width: input.width,
  height: input.height,
  gravity: input.gravity ?? physicsDefaults.gravity,
  tableAngle: input.tableAngle ?? physicsDefaults.tableAngle,
  drainY: input.drainY,
  ball: {
    radius: input.ball?.radius ?? physicsDefaults.ball.radius,
    mass: input.ball?.mass ?? physicsDefaults.ball.mass,
  },
  launchPosition: input.launchPosition,
  materials: input.materials,
  surfaceMaterials: resolveSurfaceMaterials(input.surfaceMaterials),
  physics: {
    launch: {
      maxChargeSeconds:
        input.physics?.launch?.maxChargeSeconds ??
        physicsDefaults.tuning.launch.maxChargeSeconds,
      minLaunchSpeed:
        input.physics?.launch?.minLaunchSpeed ??
        physicsDefaults.tuning.launch.minLaunchSpeed,
      maxLaunchSpeed:
        input.physics?.launch?.maxLaunchSpeed ??
        physicsDefaults.tuning.launch.maxLaunchSpeed,
      minLaunchDrift:
        input.physics?.launch?.minLaunchDrift ??
        physicsDefaults.tuning.launch.minLaunchDrift,
      maxLaunchDrift:
        input.physics?.launch?.maxLaunchDrift ??
        physicsDefaults.tuning.launch.maxLaunchDrift,
    },
    flipper: {
      swingAngularSpeed:
        input.physics?.flipper?.swingAngularSpeed ??
        physicsDefaults.tuning.flipper.swingAngularSpeed,
      collisionAngleStep:
        input.physics?.flipper?.collisionAngleStep ??
        physicsDefaults.tuning.flipper.collisionAngleStep,
    },
    solver: {
      epsilon:
        input.physics?.solver?.epsilon ?? physicsDefaults.tuning.solver.epsilon,
      staticSlipThreshold:
        input.physics?.solver?.staticSlipThreshold ??
        physicsDefaults.tuning.solver.staticSlipThreshold,
    },
  },
  bumpers: input.bumpers,
  guides: input.guides ?? [],
  flippers: input.flippers,
});

const resolveSurfaceMaterials = (
  overrides: BoardDefinitionInput['surfaceMaterials'],
): Record<SurfaceMaterialName, SurfaceMaterial> => ({
  playfieldWood: mergeSurfaceMaterial('playfieldWood', overrides?.playfieldWood),
  metalGuide: mergeSurfaceMaterial('metalGuide', overrides?.metalGuide),
  rubberPost: mergeSurfaceMaterial('rubberPost', overrides?.rubberPost),
  flipperRubber: mergeSurfaceMaterial('flipperRubber', overrides?.flipperRubber),
});

const mergeSurfaceMaterial = (
  name: SurfaceMaterialName,
  overrides: Partial<SurfaceMaterial> | undefined,
): SurfaceMaterial => ({
  ...physicsDefaults.surfaceMaterials[name],
  ...overrides,
  name,
});
