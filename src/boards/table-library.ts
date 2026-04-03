import { classicTable } from './classic-table';
import { harlemGlobetrottersTable } from './harlem-globetrotters';
import { starlightEmTable } from './starlight-em-table';
import { normalizeBoardDefinition } from './board-codec';
import { createBoardDefinition } from '../game/physics-defaults';
import type {
  ArcGuideDefinition,
  BoardDefinition,
  DropTargetDefinition,
  FlipperDefinition,
  FlipperSide,
  GuideDefinition,
  PostDefinition,
  RolloverDefinition,
  SaucerDefinition,
  SlingshotDefinition,
  SpinnerDefinition,
  StandupTargetDefinition,
} from '../types/board-definition';

export interface TableRecord {
  id: string;
  board: BoardDefinition;
  builtIn: boolean;
}

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
  {
    id: 'starlight-em',
    board: normalizeBoardDefinition(starlightEmTable),
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
    posts: [],
    bumpers: [],
    standupTargets: [],
    dropTargets: [],
    saucers: [],
    spinners: [],
    slingshots: [],
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
  plane: 'playfield',
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
  plane: 'playfield',
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

export const createDefaultPost = (x: number, y: number): PostDefinition => ({
  x,
  y,
  radius: 18,
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

export const createDefaultSlingshot = (
  x: number,
  y: number,
): SlingshotDefinition => ({
  x,
  y,
  width: 118,
  height: 24,
  angle: -0.42,
  score: 10,
  strength: 560,
  material: 'rubberPost',
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
