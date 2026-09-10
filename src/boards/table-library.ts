import { andromedaTable } from './tables/andromeda';
import { classicTable } from './tables/classic-table';
import { doubleCrossedTable } from './tables/double-crossed';
import { harlemGlobetrottersTable } from './tables/harlem-globetrotters';
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
      'Clear the left guard, then shoot the saucer to lock a ball. Plunge again and hit the yellow RELEASE target for two-ball multiball and 2× scoring. Right flipper shifts the top lanes; complete all six drops to raise spinner value.',
  },
  {
    id: 'double-crossed',
    board: doubleCrossedTable,
    description:
      'Complete both CROSS banks, lock a ball, then plunge for two-ball multiball. Both spinners light Cross Jackpot.',
  },
  {
    id: 'harlem-globetrotters',
    board: harlemGlobetrottersTable,
  },
  {
    id: 'starlight-em',
    board: starlightEmTable,
    description:
      'Spell STAR, light COMET and NOVA spinners, then collect the observatory constellation award.',
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
