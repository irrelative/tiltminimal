export interface Point {
  x: number;
  y: number;
}

export type GuidePlane = 'playfield' | 'raised';

export type BoardThemeId = 'classic' | 'midnight' | 'sunburst' | 'grayscale';

export type FlipperSide = 'left' | 'right';

export interface BallDefinition {
  // Rendered and physical ball radius in board units/pixels.
  radius: number;
  // Relative physical mass used by the solver.
  mass: number;
}

export interface PlungerDefinition extends Point {
  // Body length measured along the plunger's long axis.
  length: number;
  // Body width measured across the plunger.
  thickness: number;
  // Maximum pullback distance.
  travel: number;
  // Vertical shooter-lane guide span above the launch position.
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
  passiveAngularVelocityThreshold: number;
  passiveRestitutionScale: number;
  passiveFrictionScale: number;
  passiveSpinDampingScale: number;
  passiveSlopeGravityScale: number;
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
  // Circular radius from center to outer edge.
  radius: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface PostDefinition extends Point {
  // Circular radius from center to outer edge.
  radius: number;
  material: SurfaceMaterialName;
}

export interface StandupTargetDefinition extends Point {
  // Extent along the local horizontal axis before rotation.
  width: number;
  // Extent along the local vertical axis before rotation.
  height: number;
  // Rotation in radians around the target center.
  angle: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface DropTargetDefinition extends Point {
  // Extent along the local horizontal axis before rotation.
  width: number;
  // Extent along the local vertical axis before rotation.
  height: number;
  // Rotation in radians around the target center.
  angle: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface SaucerDefinition extends Point {
  // Capture cup radius from center to outer edge.
  radius: number;
  score: number;
  holdSeconds: number;
  ejectSpeed: number;
  ejectAngle: number;
  material: SurfaceMaterialName;
}

export interface SpinnerDefinition extends Point {
  // Tip-to-tip blade span.
  length: number;
  // Blade width / hub thickness across the narrow axis.
  thickness: number;
  // Resting blade rotation in radians around the spinner center.
  angle: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface SlingshotDefinition extends Point {
  // Base span across the sling face.
  width: number;
  // Depth from base toward the pointed tip.
  height: number;
  // Rotation in radians around the slingshot center.
  angle: number;
  score: number;
  strength: number;
  material: SurfaceMaterialName;
}

export interface RolloverDefinition extends Point {
  // Circular trigger radius from center to outer edge.
  radius: number;
  score: number;
}

export interface FlipperDefinition extends Point {
  side: FlipperSide;
  // Pivot-to-tip body length along the flipper axis.
  length: number;
  // Base body width at the pivot end.
  thickness: number;
  // Resting angle in radians around the pivot point.
  restingAngle: number;
  // Fully energized angle in radians around the pivot point.
  activeAngle: number;
  material: SurfaceMaterialName;
}

export interface LineGuideDefinition {
  kind?: 'line';
  // Segment start point along the guide centerline.
  start: Point;
  // Segment end point along the guide centerline.
  end: Point;
  // Full guide diameter / rendered stroke width.
  thickness: number;
  material: SurfaceMaterialName;
  plane?: GuidePlane;
}

export interface ArcGuideDefinition {
  kind: 'arc';
  // Arc center point.
  center: Point;
  // Centerline radius of the arc.
  radius: number;
  // Start angle in radians.
  startAngle: number;
  // End angle in radians.
  endAngle: number;
  // Full guide diameter / rendered stroke width.
  thickness: number;
  material: SurfaceMaterialName;
  plane?: GuidePlane;
}

export type GuideDefinition = LineGuideDefinition | ArcGuideDefinition;

export interface BoardDefinition {
  name: string;
  themeId: BoardThemeId;
  // Playfield width in board units/pixels.
  width: number;
  // Playfield height in board units/pixels.
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
  slingshots: SlingshotDefinition[];
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
  slingshots?: SlingshotDefinition[];
  rollovers?: RolloverDefinition[];
  guides?: GuideDefinition[];
  flippers: FlipperDefinition[];
}
