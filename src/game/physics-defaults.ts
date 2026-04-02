import type {
  BallDefinition,
  BoardDefinition,
  BoardDefinitionInput,
  NudgeDirectionDefinition,
  PhysicsDefinition,
  PlungerDefinition,
  SurfaceMaterial,
  SurfaceMaterialName,
} from '../types/board-definition';
import { defaultRulesScript } from './rules-defaults';

export const physicsDefaults = {
  gravity: 1600,
  tableAngle: 6.5,
  ball: {
    radius: 16,
    mass: 0.08,
  } satisfies BallDefinition,
  plunger: {
    length: 72,
    thickness: 24,
    travel: 124,
    guideLength: 640,
    material: 'metalGuide',
  } satisfies Omit<PlungerDefinition, 'x' | 'y'>,
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
    plunger: {
      maxPullSeconds: 1.4,
      minReleaseSpeed: 900,
      maxReleaseSpeed: 1850,
      bodyMass: 0.18,
    },
    flipper: {
      swingAngularSpeed: 30,
      collisionAngleStep: 0.08,
      bodyMass: 0.12,
      restitutionScale: 0.7,
      passiveAngularVelocityThreshold: 1.8,
      passiveRestitutionScale: 1.12,
      passiveFrictionScale: 0.12,
      passiveSpinDampingScale: 0.2,
      passiveSlopeGravityScale: 0.7,
    },
    solver: {
      epsilon: 0.0001,
      staticSlipThreshold: 28,
    },
    nudge: {
      left: {
        displacement: { x: 8, y: 0 },
      },
      right: {
        displacement: { x: -8, y: 0 },
      },
      up: {
        displacement: { x: 0, y: -11 },
      },
      attackSeconds: 0.035,
      settleSeconds: 0.16,
      cooldownSeconds: 0.12,
    },
  } satisfies PhysicsDefinition,
};

export const createBoardDefinition = (
  input: BoardDefinitionInput,
): BoardDefinition => ({
  name: input.name,
  themeId: input.themeId ?? 'classic',
  width: input.width,
  height: input.height,
  rulesScript: input.rulesScript ?? defaultRulesScript,
  gravity: input.gravity ?? physicsDefaults.gravity,
  tableAngle: input.tableAngle ?? physicsDefaults.tableAngle,
  drainY: input.drainY,
  ball: {
    radius: input.ball?.radius ?? physicsDefaults.ball.radius,
    mass: input.ball?.mass ?? physicsDefaults.ball.mass,
  },
  launchPosition: input.launchPosition,
  plunger: resolvePlungerDefinition(input),
  materials: input.materials,
  surfaceMaterials: resolveSurfaceMaterials(input.surfaceMaterials),
  physics: {
    plunger: resolvePlungerPhysics(input),
    flipper: {
      swingAngularSpeed:
        input.physics?.flipper?.swingAngularSpeed ??
        physicsDefaults.tuning.flipper.swingAngularSpeed,
      collisionAngleStep:
        input.physics?.flipper?.collisionAngleStep ??
        physicsDefaults.tuning.flipper.collisionAngleStep,
      bodyMass:
        input.physics?.flipper?.bodyMass ??
        physicsDefaults.tuning.flipper.bodyMass,
      restitutionScale:
        input.physics?.flipper?.restitutionScale ??
        physicsDefaults.tuning.flipper.restitutionScale,
      passiveAngularVelocityThreshold:
        input.physics?.flipper?.passiveAngularVelocityThreshold ??
        physicsDefaults.tuning.flipper.passiveAngularVelocityThreshold,
      passiveRestitutionScale:
        input.physics?.flipper?.passiveRestitutionScale ??
        physicsDefaults.tuning.flipper.passiveRestitutionScale,
      passiveFrictionScale:
        input.physics?.flipper?.passiveFrictionScale ??
        physicsDefaults.tuning.flipper.passiveFrictionScale,
      passiveSpinDampingScale:
        input.physics?.flipper?.passiveSpinDampingScale ??
        physicsDefaults.tuning.flipper.passiveSpinDampingScale,
      passiveSlopeGravityScale:
        input.physics?.flipper?.passiveSlopeGravityScale ??
        physicsDefaults.tuning.flipper.passiveSlopeGravityScale,
    },
    solver: {
      epsilon:
        input.physics?.solver?.epsilon ?? physicsDefaults.tuning.solver.epsilon,
      staticSlipThreshold:
        input.physics?.solver?.staticSlipThreshold ??
        physicsDefaults.tuning.solver.staticSlipThreshold,
    },
    nudge: resolveNudgePhysics(input),
  },
  posts: input.posts ?? [],
  bumpers: input.bumpers,
  standupTargets: input.standupTargets ?? [],
  dropTargets: input.dropTargets ?? [],
  saucers: input.saucers ?? [],
  spinners: input.spinners ?? [],
  slingshots: input.slingshots ?? [],
  rollovers: input.rollovers ?? [],
  guides: input.guides ?? [],
  flippers: input.flippers,
});

const resolveSurfaceMaterials = (
  overrides: BoardDefinitionInput['surfaceMaterials'],
): Record<SurfaceMaterialName, SurfaceMaterial> => ({
  playfieldWood: mergeSurfaceMaterial(
    'playfieldWood',
    overrides?.playfieldWood,
  ),
  metalGuide: mergeSurfaceMaterial('metalGuide', overrides?.metalGuide),
  rubberPost: mergeSurfaceMaterial('rubberPost', overrides?.rubberPost),
  flipperRubber: mergeSurfaceMaterial(
    'flipperRubber',
    overrides?.flipperRubber,
  ),
});

const mergeSurfaceMaterial = (
  name: SurfaceMaterialName,
  overrides: Partial<SurfaceMaterial> | undefined,
): SurfaceMaterial => ({
  ...physicsDefaults.surfaceMaterials[name],
  ...overrides,
  name,
});

const resolvePlungerDefinition = (
  input: BoardDefinitionInput,
): PlungerDefinition => {
  const length = input.plunger?.length ?? physicsDefaults.plunger.length;
  const thickness =
    input.plunger?.thickness ?? physicsDefaults.plunger.thickness;
  const ballRadius = input.ball?.radius ?? physicsDefaults.ball.radius;
  const contactOverlap = 4;

  return {
    x: input.plunger?.x ?? input.launchPosition.x,
    y:
      input.plunger?.y ??
      input.launchPosition.y +
        ballRadius +
        length / 2 +
        thickness / 2 -
        contactOverlap,
    length,
    thickness,
    travel: input.plunger?.travel ?? physicsDefaults.plunger.travel,
    guideLength:
      input.plunger?.guideLength ?? physicsDefaults.plunger.guideLength,
    material: input.plunger?.material ?? physicsDefaults.plunger.material,
  };
};

const resolvePlungerPhysics = (
  input: BoardDefinitionInput,
): PhysicsDefinition['plunger'] => ({
  maxPullSeconds:
    input.physics?.plunger?.maxPullSeconds ??
    input.physics?.launch?.maxChargeSeconds ??
    physicsDefaults.tuning.plunger.maxPullSeconds,
  minReleaseSpeed:
    input.physics?.plunger?.minReleaseSpeed ??
    input.physics?.launch?.minLaunchSpeed ??
    physicsDefaults.tuning.plunger.minReleaseSpeed,
  maxReleaseSpeed:
    input.physics?.plunger?.maxReleaseSpeed ??
    input.physics?.launch?.maxLaunchSpeed ??
    physicsDefaults.tuning.plunger.maxReleaseSpeed,
  bodyMass:
    input.physics?.plunger?.bodyMass ?? physicsDefaults.tuning.plunger.bodyMass,
});

const resolveNudgeDirection = (
  overrides: Partial<NudgeDirectionDefinition> | undefined,
  defaults: NudgeDirectionDefinition,
): NudgeDirectionDefinition => ({
  displacement: {
    x: overrides?.displacement?.x ?? defaults.displacement.x,
    y: overrides?.displacement?.y ?? defaults.displacement.y,
  },
});

const resolveNudgePhysics = (
  input: BoardDefinitionInput,
): PhysicsDefinition['nudge'] => ({
  left: resolveNudgeDirection(
    input.physics?.nudge?.left,
    physicsDefaults.tuning.nudge.left,
  ),
  right: resolveNudgeDirection(
    input.physics?.nudge?.right,
    physicsDefaults.tuning.nudge.right,
  ),
  up: resolveNudgeDirection(
    input.physics?.nudge?.up,
    physicsDefaults.tuning.nudge.up,
  ),
  attackSeconds:
    input.physics?.nudge?.attackSeconds ??
    physicsDefaults.tuning.nudge.attackSeconds,
  settleSeconds:
    input.physics?.nudge?.settleSeconds ??
    physicsDefaults.tuning.nudge.settleSeconds,
  cooldownSeconds:
    input.physics?.nudge?.cooldownSeconds ??
    physicsDefaults.tuning.nudge.cooldownSeconds,
});
