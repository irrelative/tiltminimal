import { classicTable } from './classic-table';
import type {
  BoardDefinition,
  FlipperDefinition,
  FlipperSide,
} from '../types/board-definition';

export interface TableRecord {
  id: string;
  board: BoardDefinition;
  builtIn: boolean;
}

interface LegacyBoardDefinition extends Omit<BoardDefinition, 'flippers'> {
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
  bumpers: board.bumpers.map((bumper) => ({ ...bumper })),
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

  return {
    ...source,
    ball: { ...source.ball },
    launchPosition: { ...source.launchPosition },
    materials: { ...source.materials },
    bumpers: source.bumpers.map((bumper) => ({ ...bumper })),
    flippers: flippers.map((flipper) => ({
      ...flipper,
      side: flipper.side === 'right' ? 'right' : 'left',
    })),
  };
};

export const BUILT_IN_TABLES: TableRecord[] = [
  {
    id: 'classic-table',
    board: normalizeBoardDefinition(classicTable),
    builtIn: true,
  },
];

export const createBlankTable = (name = 'Custom Table'): BoardDefinition => ({
  name,
  width: 900,
  height: 1400,
  gravity: 1600,
  drainY: 1425,
  ball: {
    radius: 16,
    mass: 0.08,
  },
  launchPosition: {
    x: 770,
    y: 1180,
  },
  materials: {
    playfield: 'playfieldWood',
    walls: 'metalGuide',
  },
  bumpers: [],
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

export const createTableId = (): string =>
  `table-${Math.random().toString(36).slice(2, 10)}`;
