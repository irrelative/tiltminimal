import { classicTable } from './tables/classic-table';
import { doubleCrossedTable } from './tables/double-crossed';
import { harlemGlobetrottersTable } from './tables/harlem-globetrotters';
import { mirrorMatchTable } from './tables/mirror-match';
import { starlightEmTable } from './tables/starlight-em-table';
import type {
  BoardDefinition,
  FlipperDefinition,
  FlipperSide,
} from '../types/board-definition';

export interface BuiltInTable {
  id: string;
  board: BoardDefinition;
}

export const BUILT_IN_TABLES: BuiltInTable[] = [
  {
    id: 'classic-table',
    board: classicTable,
  },
  {
    id: 'double-crossed',
    board: doubleCrossedTable,
  },
  {
    id: 'harlem-globetrotters',
    board: harlemGlobetrottersTable,
  },
  {
    id: 'mirror-match',
    board: mirrorMatchTable,
  },
  {
    id: 'starlight-em',
    board: starlightEmTable,
  },
];

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
