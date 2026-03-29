import {
  EDITOR_GRID_SIZE,
  snapPointToGrid,
  snapValueToGrid,
} from '../editor/grid';
import type { BoardDefinition } from '../types/board-definition';

export const snapBoardLayoutToGrid = (
  board: BoardDefinition,
  gridSize = EDITOR_GRID_SIZE,
): BoardDefinition => {
  const snapped: BoardDefinition = {
    ...board,
    ball: { ...board.ball },
    launchPosition: { ...board.launchPosition },
    plunger: { ...board.plunger },
    materials: { ...board.materials },
    surfaceMaterials: {
      playfieldWood: { ...board.surfaceMaterials.playfieldWood },
      metalGuide: { ...board.surfaceMaterials.metalGuide },
      rubberPost: { ...board.surfaceMaterials.rubberPost },
      flipperRubber: { ...board.surfaceMaterials.flipperRubber },
    },
    physics: {
      plunger: { ...board.physics.plunger },
      flipper: { ...board.physics.flipper },
      solver: { ...board.physics.solver },
    },
    posts: board.posts.map((post) => ({ ...post })),
    bumpers: board.bumpers.map((bumper) => ({ ...bumper })),
    standupTargets: board.standupTargets.map((target) => ({ ...target })),
    dropTargets: board.dropTargets.map((target) => ({ ...target })),
    saucers: board.saucers.map((saucer) => ({ ...saucer })),
    spinners: board.spinners.map((spinner) => ({ ...spinner })),
    rollovers: board.rollovers.map((rollover) => ({ ...rollover })),
    guides: board.guides.map((guide) =>
      guide.kind === 'arc'
        ? {
            ...guide,
            center: { ...guide.center },
          }
        : {
            ...guide,
            start: { ...guide.start },
            end: { ...guide.end },
          },
    ),
    flippers: board.flippers.map((flipper) => ({ ...flipper })),
  };

  snapped.launchPosition = {
    ...snapped.launchPosition,
    x: snapValueToGrid(snapped.launchPosition.x, gridSize),
  };
  snapped.plunger = {
    ...snapped.plunger,
    ...snapPointToGrid(snapped.plunger, gridSize),
  };
  snapped.posts = snapped.posts.map((post) => ({
    ...post,
    ...snapPointToGrid(post, gridSize),
  }));
  snapped.bumpers = snapped.bumpers.map((bumper) => ({
    ...bumper,
    ...snapPointToGrid(bumper, gridSize),
  }));
  snapped.standupTargets = snapped.standupTargets.map((target) => ({
    ...target,
    ...snapPointToGrid(target, gridSize),
  }));
  snapped.dropTargets = snapped.dropTargets.map((target) => ({
    ...target,
    ...snapPointToGrid(target, gridSize),
  }));
  snapped.saucers = snapped.saucers.map((saucer) => ({
    ...saucer,
    ...snapPointToGrid(saucer, gridSize),
  }));
  snapped.spinners = snapped.spinners.map((spinner) => ({
    ...spinner,
    ...snapPointToGrid(spinner, gridSize),
  }));
  snapped.rollovers = snapped.rollovers.map((rollover) => ({
    ...rollover,
    ...snapPointToGrid(rollover, gridSize),
  }));
  snapped.guides = snapped.guides.map((guide) =>
    guide.kind === 'arc'
      ? {
          ...guide,
          center: snapPointToGrid(guide.center, gridSize),
        }
      : {
          ...guide,
          start: snapPointToGrid(guide.start, gridSize),
          end: snapPointToGrid(guide.end, gridSize),
        },
  );
  snapped.flippers = snapped.flippers.map((flipper) => ({
    ...flipper,
    ...snapPointToGrid(flipper, gridSize),
  }));

  return snapped;
};
