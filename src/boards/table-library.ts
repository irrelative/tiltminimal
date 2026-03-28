import { classicTable } from './classic-table';
import { createBoardDefinition } from '../game/physics-defaults';
import type {
  BoardDefinition,
  DropTargetDefinition,
  FlipperDefinition,
  FlipperSide,
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

interface LegacyBoardDefinition
  extends Omit<
    Partial<BoardDefinition>,
    'flippers' | 'surfaceMaterials' | 'physics' | 'guides'
  > {
  guides?: BoardDefinition['guides'];
  standupTargets?: BoardDefinition['standupTargets'];
  dropTargets?: BoardDefinition['dropTargets'];
  saucers?: BoardDefinition['saucers'];
  spinners?: BoardDefinition['spinners'];
  rollovers?: BoardDefinition['rollovers'];
  surfaceMaterials?: Partial<Record<SurfaceMaterialName, Partial<SurfaceMaterial>>>;
  physics?: Partial<BoardDefinition['physics']>;
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
  materials: { ...board.materials },
  surfaceMaterials: cloneSurfaceMaterials(board.surfaceMaterials),
  physics: {
    launch: { ...board.physics.launch },
    flipper: { ...board.physics.flipper },
    solver: { ...board.physics.solver },
  },
  bumpers: board.bumpers.map((bumper) => ({ ...bumper })),
  standupTargets: board.standupTargets.map((target) => ({ ...target })),
  dropTargets: board.dropTargets.map((target) => ({ ...target })),
  saucers: board.saucers.map((saucer) => ({ ...saucer })),
  spinners: board.spinners.map((spinner) => ({ ...spinner })),
  rollovers: board.rollovers.map((rollover) => ({ ...rollover })),
  guides: board.guides.map((guide) => ({
    ...guide,
    start: { ...guide.start },
    end: { ...guide.end },
  })),
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
    materials:
      source.materials ??
      ({
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      } satisfies BoardDefinition['materials']),
    surfaceMaterials: source.surfaceMaterials,
    physics: {
      launch: source.physics?.launch,
      flipper: source.physics?.flipper,
      solver: source.physics?.solver,
    },
    bumpers: source.bumpers ?? [],
    standupTargets: source.standupTargets ?? [],
    dropTargets: source.dropTargets ?? [],
    saucers: source.saucers ?? [],
    spinners: source.spinners ?? [],
    rollovers: source.rollovers ?? [],
    guides: source.guides ?? [],
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
): FlipperDefinition => {
  const flipper = board.flippers.find((candidate) => candidate.side === side);

  if (!flipper) {
    throw new Error(`Expected ${side} flipper to exist on board ${board.name}.`);
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
