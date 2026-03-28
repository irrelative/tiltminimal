export interface Point {
  x: number;
  y: number;
}

export type FlipperSide = 'left' | 'right';

export interface BallDefinition {
  radius: number;
  mass: number;
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

export interface LaunchPhysicsDefinition {
  maxChargeSeconds: number;
  minLaunchSpeed: number;
  maxLaunchSpeed: number;
  minLaunchDrift: number;
  maxLaunchDrift: number;
}

export interface FlipperPhysicsDefinition {
  swingAngularSpeed: number;
  collisionAngleStep: number;
}

export interface SolverPhysicsDefinition {
  epsilon: number;
  staticSlipThreshold: number;
}

export interface PhysicsDefinition {
  launch: LaunchPhysicsDefinition;
  flipper: FlipperPhysicsDefinition;
  solver: SolverPhysicsDefinition;
}

export interface BumperDefinition extends Point {
  radius: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface FlipperDefinition extends Point {
  side: FlipperSide;
  length: number;
  thickness: number;
  restingAngle: number;
  activeAngle: number;
  material: SurfaceMaterialName;
}

export interface GuideDefinition {
  start: Point;
  end: Point;
  thickness: number;
  material: SurfaceMaterialName;
}

export interface BoardDefinition {
  name: string;
  width: number;
  height: number;
  gravity: number;
  tableAngle: number;
  drainY: number;
  ball: BallDefinition;
  launchPosition: Point;
  materials: {
    playfield: SurfaceMaterialName;
    walls: SurfaceMaterialName;
  };
  surfaceMaterials: Record<SurfaceMaterialName, SurfaceMaterial>;
  physics: PhysicsDefinition;
  bumpers: BumperDefinition[];
  guides: GuideDefinition[];
  flippers: FlipperDefinition[];
}

export interface BoardDefinitionInput {
  name: string;
  width: number;
  height: number;
  gravity?: number;
  tableAngle?: number;
  drainY: number;
  ball?: Partial<BallDefinition>;
  launchPosition: Point;
  materials: {
    playfield: SurfaceMaterialName;
    walls: SurfaceMaterialName;
  };
  surfaceMaterials?: Partial<Record<SurfaceMaterialName, Partial<SurfaceMaterial>>>;
  physics?: {
    launch?: Partial<LaunchPhysicsDefinition>;
    flipper?: Partial<FlipperPhysicsDefinition>;
    solver?: Partial<SolverPhysicsDefinition>;
  };
  bumpers: BumperDefinition[];
  guides?: GuideDefinition[];
  flippers: FlipperDefinition[];
}
