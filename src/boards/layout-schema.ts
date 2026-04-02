import type {
  BumperDefinition,
  BallDefinition,
  BoardThemeId,
  DropTargetDefinition,
  FlipperDefinition,
  GuideDefinition,
  LegacyLaunchPhysicsDefinition,
  PhysicsDefinition,
  PlungerDefinition,
  Point,
  PostDefinition,
  RolloverDefinition,
  SaucerDefinition,
  SpinnerDefinition,
  StandupTargetDefinition,
  SurfaceMaterial,
  SurfaceMaterialName,
} from '../types/board-definition';

export type LayoutTemplateId = 'solid-state-two-flipper';

export interface AbsoluteLayoutPoint extends Point {
  kind?: 'absolute';
}

export interface PercentLayoutPoint {
  kind: 'percent';
  x: number;
  y: number;
  offset?: Point;
}

export interface AnchorLayoutPoint {
  kind: 'anchor';
  anchor: string;
  offset?: Point;
}

export type LayoutPoint =
  | AbsoluteLayoutPoint
  | PercentLayoutPoint
  | AnchorLayoutPoint;

export interface LayoutAnchorDefinition {
  id: string;
  point: LayoutPoint;
}

interface PositionedLayoutElement {
  position: LayoutPoint;
}

export interface BumperLayoutDefinition
  extends Omit<BumperDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface PostLayoutDefinition
  extends Omit<PostDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface StandupTargetLayoutDefinition
  extends Omit<StandupTargetDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface DropTargetLayoutDefinition
  extends Omit<DropTargetDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface SaucerLayoutDefinition
  extends Omit<SaucerDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface SpinnerLayoutDefinition
  extends Omit<SpinnerDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface RolloverLayoutDefinition
  extends Omit<RolloverDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface FlipperLayoutDefinition
  extends Omit<FlipperDefinition, 'x' | 'y'>,
    PositionedLayoutElement {}

export interface LineGuideLayoutDefinition {
  kind?: 'line';
  start: LayoutPoint;
  end: LayoutPoint;
  thickness: number;
  material: SurfaceMaterialName;
}

export interface ArcGuideLayoutDefinition {
  kind: 'arc';
  center: LayoutPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
  thickness: number;
  material: SurfaceMaterialName;
}

export type GuideLayoutDefinition =
  | LineGuideLayoutDefinition
  | ArcGuideLayoutDefinition;

export interface BoardLayoutDefinition {
  name: string;
  themeId?: BoardThemeId;
  template?: LayoutTemplateId;
  width: number;
  height: number;
  rulesScript?: string;
  gravity?: number;
  tableAngle?: number;
  drainY: number;
  ball?: Partial<BallDefinition>;
  launchPosition: LayoutPoint;
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
    plunger?: Partial<PhysicsDefinition['plunger']>;
    flipper?: Partial<PhysicsDefinition['flipper']>;
    solver?: Partial<PhysicsDefinition['solver']>;
    nudge?: Partial<PhysicsDefinition['nudge']>;
  };
  anchors?: LayoutAnchorDefinition[];
  posts?: PostLayoutDefinition[];
  bumpers?: BumperLayoutDefinition[];
  standupTargets?: StandupTargetLayoutDefinition[];
  dropTargets?: DropTargetLayoutDefinition[];
  saucers?: SaucerLayoutDefinition[];
  spinners?: SpinnerLayoutDefinition[];
  rollovers?: RolloverLayoutDefinition[];
  guides?: GuideLayoutDefinition[];
  flippers: FlipperLayoutDefinition[];
}

export interface LayoutCompileOptions {
  snapToGrid?: boolean;
}

export interface ResolvedLayoutContext {
  width: number;
  height: number;
  anchors: Record<string, Point>;
}

export type CompiledGuideDefinition = GuideDefinition;
