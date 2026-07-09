import { createBoardDefinition } from '../../src/game/physics-defaults';
import type {
  BoardDefinition,
  FlipperSide,
} from '../../src/types/board-definition';

const createFlipper = (
  side: FlipperSide,
  x: number,
): BoardDefinition['flippers'][number] => ({
  side,
  x,
  y: 1220,
  length: 150,
  thickness: 20,
  restingAngle: side === 'left' ? 0.28 : Math.PI - 0.28,
  activeAngle: side === 'left' ? -0.42 : Math.PI + 0.42,
  material: 'flipperRubber',
});

export const createBlankTable = (name = 'Test Table'): BoardDefinition =>
  createBoardDefinition({
    name,
    width: 900,
    height: 1400,
    drainY: 1425,
    launchPosition: { x: 770, y: 1180 },
    materials: { playfield: 'playfieldWood', walls: 'metalGuide' },
    posts: [],
    bumpers: [],
    standupTargets: [],
    dropTargets: [],
    saucers: [],
    spinners: [],
    slingshots: [],
    rollovers: [],
    guides: [],
    flippers: [createFlipper('left', 270), createFlipper('right', 630)],
  });
