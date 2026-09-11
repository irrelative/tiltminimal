import { switchyardTable } from './tables/switchyard';
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
  hiddenFromSelection?: boolean;
}

export const BUILT_IN_TABLES: BuiltInTable[] = [
  {
    id: 'classic-table',
    board: classicTable,
    description:
      'A classic mix of bumpers, targets and a saucer. Build your bonus and keep the ball alive.',
  },
  {
    id: 'andromeda',
    hiddenFromSelection: true,
    board: andromedaTable,
    description:
      'Clear the guard, lock a ball and launch into two-ball multiball. Drop banks and a rising spinner award reward accurate shooting.',
  },
  {
    id: 'double-crossed',
    board: doubleCrossedTable,
    description:
      'Complete both CROSS banks, lock a ball, then plunge for two-ball multiball. Both spinners light Cross Jackpot.',
  },
  {
    id: 'harlem-globetrotters',
    hiddenFromSelection: true,
    board: harlemGlobetrottersTable,
    description:
      'Three flippers, sweeping lanes and big saucer shots on a basketball classic.',
  },
  {
    id: 'starlight-em',
    board: starlightEmTable,
    description:
      'Spell STAR, light COMET and NOVA spinners, then collect the observatory constellation award.',
  },
  {
    id: 'switchyard',
    board: switchyardTable,
    description:
      'Five open fan shots. Connect the network, lock at Dispatch, and collect two-ball multiball jackpots.',
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
