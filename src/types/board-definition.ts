export interface Point {
  x: number;
  y: number;
}

export type GuidePlane = 'playfield' | 'raised';

export type BoardThemeId = 'classic' | 'midnight' | 'sunburst' | 'grayscale';

export type FlipperSide = 'left' | 'right';

export interface BallDefinition {
  radius: number;
  mass: number;
}

export interface PlungerDefinition extends Point {
  length: number;
  thickness: number;
  travel: number;
  guideLength: number;
  material: SurfaceMaterialName;
}

export interface SurfaceMaterial {
  name: SurfaceMaterialName;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  rollingResistance: number;
  spinDamping: number;
  compliance: number;
  grip: number;
}

export type SurfaceMaterialName =
  | 'playfieldWood'
  | 'metalGuide'
  | 'rubberPost'
  | 'flipperRubber';

export interface LegacyLaunchPhysicsDefinition {
  maxChargeSeconds: number;
  minLaunchSpeed: number;
  maxLaunchSpeed: number;
  minLaunchDrift: number;
  maxLaunchDrift: number;
}

export interface PlungerPhysicsDefinition {
  maxPullSeconds: number;
  minReleaseSpeed: number;
  maxReleaseSpeed: number;
  bodyMass: number;
}

export interface FlipperPhysicsDefinition {
  swingAngularSpeed: number;
  collisionAngleStep: number;
  bodyMass: number;
  restitutionScale: number;
}

export interface SolverPhysicsDefinition {
  epsilon: number;
  staticSlipThreshold: number;
}

export interface NudgeDirectionDefinition {
  displacement: Point;
}

export interface NudgePhysicsDefinition {
  left: NudgeDirectionDefinition;
  right: NudgeDirectionDefinition;
  up: NudgeDirectionDefinition;
  attackSeconds: number;
  settleSeconds: number;
  cooldownSeconds: number;
}

export interface PhysicsDefinition {
  plunger: PlungerPhysicsDefinition;
  flipper: FlipperPhysicsDefinition;
  solver: SolverPhysicsDefinition;
  nudge: NudgePhysicsDefinition;
}

export interface BumperDefinition extends Point {
  radius: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface PostDefinition extends Point {
  radius: number;
  material: SurfaceMaterialName;
}

export interface StandupTargetDefinition extends Point {
  width: number;
  height: number;
  angle: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface DropTargetDefinition extends Point {
  width: number;
  height: number;
  angle: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface SaucerDefinition extends Point {
  radius: number;
  score: number;
  holdSeconds: number;
  ejectSpeed: number;
  ejectAngle: number;
  material: SurfaceMaterialName;
}

export interface SpinnerDefinition extends Point {
  length: number;
  thickness: number;
  angle: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface RolloverDefinition extends Point {
  radius: number;
  score: number;
}

export interface FlipperDefinition extends Point {
  side: FlipperSide;
  length: number;
  thickness: number;
  restingAngle: number;
  activeAngle: number;
  material: SurfaceMaterialName;
}

export interface LineGuideDefinition {
  kind?: 'line';
  start: Point;
  end: Point;
  thickness: number;
  material: SurfaceMaterialName;
  plane?: GuidePlane;
}

export interface ArcGuideDefinition {
  kind: 'arc';
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  thickness: number;
  material: SurfaceMaterialName;
  plane?: GuidePlane;
}

export type GuideDefinition = LineGuideDefinition | ArcGuideDefinition;

export interface BoardDefinition {
  name: string;
  themeId: BoardThemeId;
  width: number;
  height: number;
  rulesScript: string;
  gravity: number;
  tableAngle: number;
  drainY: number;
  ball: BallDefinition;
  launchPosition: Point;
  plunger: PlungerDefinition;
  materials: {
    playfield: SurfaceMaterialName;
    walls: SurfaceMaterialName;
  };
  surfaceMaterials: Record<SurfaceMaterialName, SurfaceMaterial>;
  physics: PhysicsDefinition;
  posts: PostDefinition[];
  bumpers: BumperDefinition[];
  standupTargets: StandupTargetDefinition[];
  dropTargets: DropTargetDefinition[];
  saucers: SaucerDefinition[];
  spinners: SpinnerDefinition[];
  rollovers: RolloverDefinition[];
  guides: GuideDefinition[];
  flippers: FlipperDefinition[];
}

export interface BoardDefinitionInput {
  name: string;
  themeId?: BoardThemeId;
  width: number;
  height: number;
  rulesScript?: string;
  gravity?: number;
  tableAngle?: number;
  drainY: number;
  ball?: Partial<BallDefinition>;
  launchPosition: Point;
  plunger?: Partial<PlungerDefinition>;
  materials: {
    playfield: SurfaceMaterialName;
    walls: SurfaceMaterialName;
  };
  surfaceMaterials?: Partial<
    Record<SurfaceMaterialName, Partial<SurfaceMaterial>>
  >;
  physics?: {
    launch?: Partial<LegacyLaunchPhysicsDefinition>;
    plunger?: Partial<PlungerPhysicsDefinition>;
    flipper?: Partial<FlipperPhysicsDefinition>;
    solver?: Partial<SolverPhysicsDefinition>;
    nudge?: {
      left?: Partial<NudgeDirectionDefinition>;
      right?: Partial<NudgeDirectionDefinition>;
      up?: Partial<NudgeDirectionDefinition>;
      attackSeconds?: number;
      settleSeconds?: number;
      cooldownSeconds?: number;
    };
  };
  posts?: PostDefinition[];
  bumpers: BumperDefinition[];
  standupTargets?: StandupTargetDefinition[];
  dropTargets?: DropTargetDefinition[];
  saucers?: SaucerDefinition[];
  spinners?: SpinnerDefinition[];
  rollovers?: RolloverDefinition[];
  guides?: GuideDefinition[];
  flippers: FlipperDefinition[];
}
