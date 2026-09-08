import { andromedaTable } from './tables/andromeda';
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
  description?: string;
}

export const BUILT_IN_TABLES: BuiltInTable[] = [
  {
    id: 'classic-table',
    board: classicTable,
  },
  {
    id: 'andromeda',
    board: andromedaTable,
    description:
      'Clear the left guard, then shoot the saucer to lock a ball. Plunge again and hit the yellow RELEASE target for two-ball multiball and 2× scoring. Right flipper shifts the top lanes; complete both drop banks to raise spinner value.',
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
