export interface Point {
  x: number;
  y: number;
}

export interface BallDefinition {
  radius: number;
  mass: number;
}

export type SurfaceMaterialName =
  | 'playfieldWood'
  | 'metalGuide'
  | 'rubberPost'
  | 'flipperRubber';

export interface BumperDefinition extends Point {
  radius: number;
  score: number;
  material: SurfaceMaterialName;
}

export interface FlipperDefinition extends Point {
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
  drainY: number;
  ball: BallDefinition;
  launchPosition: Point;
  materials: {
    playfield: SurfaceMaterialName;
    walls: SurfaceMaterialName;
  };
  bumpers: BumperDefinition[];
  guides: GuideDefinition[];
  flippers: {
    left: FlipperDefinition;
    right: FlipperDefinition;
  };
}
