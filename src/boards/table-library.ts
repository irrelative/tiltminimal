import { classicTable } from './classic-table';
import { harlemGlobetrottersTable } from './harlem-globetrotters';
import { cloneGuide, normalizeGuide } from '../game/guide-geometry';
import { createBoardDefinition } from '../game/physics-defaults';
import type {
  ArcGuideDefinition,
  BoardDefinition,
  DropTargetDefinition,
  FlipperDefinition,
  FlipperSide,
  GuideDefinition,
  LegacyLaunchPhysicsDefinition,
  RolloverDefinition,
  SaucerDefinition,
  SpinnerDefinition,
  StandupTargetDefinition,
  SurfaceMaterial,
  SurfaceMaterialName,
} from '../types/board-definition';

export interface TableRecord {
  id: string;
  board: BoardDefinition;
  builtIn: boolean;
}

interface LegacyBoardDefinition extends Omit<
  Partial<BoardDefinition>,
  'flippers' | 'surfaceMaterials' | 'physics' | 'guides'
> {
  guides?: BoardDefinition['guides'];
  standupTargets?: BoardDefinition['standupTargets'];
  dropTargets?: BoardDefinition['dropTargets'];
  saucers?: BoardDefinition['saucers'];
  spinners?: BoardDefinition['spinners'];
  rollovers?: BoardDefinition['rollovers'];
  surfaceMaterials?: Partial<
    Record<SurfaceMaterialName, Partial<SurfaceMaterial>>
  >;
  physics?: {
    launch?: Partial<LegacyLaunchPhysicsDefinition>;
    plunger?: Partial<BoardDefinition['physics']['plunger']>;
    flipper?: Partial<BoardDefinition['physics']['flipper']>;
    solver?: Partial<BoardDefinition['physics']['solver']>;
  };
  flippers:
    | BoardDefinition['flippers']
    | {
        left: Omit<FlipperDefinition, 'side'>;
        right: Omit<FlipperDefinition, 'side'>;
      };
}

export const cloneBoardDefinition = (
  board: BoardDefinition,
): BoardDefinition => ({
  ...board,
  ball: { ...board.ball },
  launchPosition: { ...board.launchPosition },
  plunger: { ...board.plunger },
  materials: { ...board.materials },
  surfaceMaterials: cloneSurfaceMaterials(board.surfaceMaterials),
  physics: {
    plunger: { ...board.physics.plunger },
    flipper: { ...board.physics.flipper },
    solver: { ...board.physics.solver },
  },
  bumpers: board.bumpers.map((bumper) => ({ ...bumper })),
  standupTargets: board.standupTargets.map((target) => ({ ...target })),
  dropTargets: board.dropTargets.map((target) => ({ ...target })),
  saucers: board.saucers.map((saucer) => ({ ...saucer })),
  spinners: board.spinners.map((spinner) => ({ ...spinner })),
  rollovers: board.rollovers.map((rollover) => ({ ...rollover })),
  guides: board.guides.map(cloneGuide),
  flippers: board.flippers.map((flipper) => ({ ...flipper })),
});

export const normalizeBoardDefinition = (
  board: BoardDefinition | LegacyBoardDefinition,
): BoardDefinition => {
  const source = board as LegacyBoardDefinition;
  const flippers = Array.isArray(source.flippers)
    ? source.flippers
    : [
        { side: 'left' as const, ...source.flippers.left },
        { side: 'right' as const, ...source.flippers.right },
      ];

  return createBoardDefinition({
    name: source.name ?? 'Untitled Table',
    width: source.width ?? 900,
    height: source.height ?? 1400,
    gravity: source.gravity,
    tableAngle: source.tableAngle,
    drainY: source.drainY ?? 1425,
    ball: source.ball,
    launchPosition:
      source.launchPosition ??
      ({
        x: 770,
        y: 1180,
      } satisfies BoardDefinition['launchPosition']),
    plunger: source.plunger,
    materials:
      source.materials ??
      ({
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      } satisfies BoardDefinition['materials']),
    surfaceMaterials: source.surfaceMaterials,
    physics: {
      launch: source.physics?.launch,
      plunger: source.physics?.plunger,
      flipper: source.physics?.flipper,
      solver: source.physics?.solver,
    },
    bumpers: source.bumpers ?? [],
    standupTargets: source.standupTargets ?? [],
    dropTargets: source.dropTargets ?? [],
    saucers: source.saucers ?? [],
    spinners: source.spinners ?? [],
    rollovers: source.rollovers ?? [],
    guides: (source.guides ?? []).map(normalizeGuide),
    flippers: flippers.map((flipper) => ({
      ...flipper,
      side: flipper.side === 'right' ? 'right' : 'left',
    })),
  });
};

export const BUILT_IN_TABLES: TableRecord[] = [
  {
    id: 'classic-table',
    board: normalizeBoardDefinition(classicTable),
    builtIn: true,
  },
  {
    id: 'harlem-globetrotters',
    board: normalizeBoardDefinition(harlemGlobetrottersTable),
    builtIn: true,
  },
];

export const createBlankTable = (name = 'Custom Table'): BoardDefinition =>
  createBoardDefinition({
    name,
    width: 900,
    height: 1400,
    drainY: 1425,
    launchPosition: {
      x: 770,
      y: 1180,
    },
    materials: {
      playfield: 'playfieldWood',
      walls: 'metalGuide',
    },
    bumpers: [],
    standupTargets: [],
    dropTargets: [],
    saucers: [],
    spinners: [],
    rollovers: [],
    guides: [],
    flippers: [
      createDefaultFlipper('left', 270, 1220),
      createDefaultFlipper('right', 630, 1220),
    ],
  });

export const createDefaultFlipper = (
  side: FlipperSide,
  x: number,
  y: number,
): FlipperDefinition => ({
  side,
  x,
  y,
  length: 150,
  thickness: 20,
  restingAngle: side === 'left' ? 0.28 : Math.PI - 0.28,
  activeAngle: side === 'left' ? -0.42 : Math.PI + 0.42,
  material: 'flipperRubber',
});

export const createDefaultGuide = (x: number, y: number): GuideDefinition => ({
  kind: 'line',
  start: { x: x - 60, y },
  end: { x: x + 60, y },
  thickness: 18,
  material: 'metalGuide',
});

export const createDefaultCurvedGuide = (
  x: number,
  y: number,
): ArcGuideDefinition => ({
  kind: 'arc',
  center: { x, y },
  radius: 80,
  startAngle: Math.PI * 0.85,
  endAngle: Math.PI * 1.85,
  thickness: 18,
  material: 'metalGuide',
});

export const createDefaultStandupTarget = (
  x: number,
  y: number,
): StandupTargetDefinition => ({
  x,
  y,
  width: 56,
  height: 16,
  angle: -Math.PI / 2,
  score: 50,
  material: 'rubberPost',
});

export const createDefaultDropTarget = (
  x: number,
  y: number,
): DropTargetDefinition => ({
  x,
  y,
  width: 54,
  height: 16,
  angle: -Math.PI / 2,
  score: 100,
  material: 'rubberPost',
});

export const createDefaultSaucer = (
  x: number,
  y: number,
): SaucerDefinition => ({
  x,
  y,
  radius: 28,
  score: 500,
  holdSeconds: 0.45,
  ejectSpeed: 950,
  ejectAngle: -Math.PI / 2,
  material: 'metalGuide',
});

export const createDefaultSpinner = (
  x: number,
  y: number,
): SpinnerDefinition => ({
  x,
  y,
  length: 86,
  thickness: 10,
  angle: -Math.PI / 2,
  score: 10,
  material: 'metalGuide',
});

export const createDefaultRollover = (
  x: number,
  y: number,
): RolloverDefinition => ({
  x,
  y,
  radius: 22,
  score: 25,
});

export const createTableId = (): string =>
  `table-${Math.random().toString(36).slice(2, 10)}`;

export const getFlipperBySide = (
  board: BoardDefinition,
  side: FlipperSide,
  occurrence = 0,
): FlipperDefinition => {
  const flipper = board.flippers.filter((candidate) => candidate.side === side)[
    occurrence
  ];

  if (!flipper) {
    throw new Error(
      `Expected ${side} flipper #${occurrence + 1} to exist on board ${board.name}.`,
    );
  }

  return flipper;
};

const cloneSurfaceMaterials = (
  materials: Record<SurfaceMaterialName, SurfaceMaterial>,
): Record<SurfaceMaterialName, SurfaceMaterial> => ({
  playfieldWood: { ...materials.playfieldWood },
  metalGuide: { ...materials.metalGuide },
  rubberPost: { ...materials.rubberPost },
  flipperRubber: { ...materials.flipperRubber },
});
