import { cloneGuide } from '../game/guide-geometry';
import type { BoardDefinition } from '../types/board-definition';

export const cloneBoardDefinition = (
  board: BoardDefinition,
): BoardDefinition => ({
  ...board,
  rulesScript: board.rulesScript,
  ball: { ...board.ball },
  launchPosition: { ...board.launchPosition },
  plunger: { ...board.plunger },
  materials: { ...board.materials },
  surfaceMaterials: cloneSurfaceMaterials(board.surfaceMaterials),
  physics: {
    plunger: { ...board.physics.plunger },
    flipper: { ...board.physics.flipper },
    solver: { ...board.physics.solver },
    nudge: {
      left: {
        displacement: { ...board.physics.nudge.left.displacement },
      },
      right: {
        displacement: { ...board.physics.nudge.right.displacement },
      },
      up: {
        displacement: { ...board.physics.nudge.up.displacement },
      },
      attackSeconds: board.physics.nudge.attackSeconds,
      settleSeconds: board.physics.nudge.settleSeconds,
      cooldownSeconds: board.physics.nudge.cooldownSeconds,
    },
  },
  posts: board.posts.map((post) => ({ ...post })),
  bumpers: board.bumpers.map((bumper) => ({ ...bumper })),
  standupTargets: board.standupTargets.map((target) => ({ ...target })),
  dropTargets: board.dropTargets.map((target) => ({ ...target })),
  saucers: board.saucers.map((saucer) => ({ ...saucer })),
  spinners: board.spinners.map((spinner) => ({ ...spinner })),
  slingshots: board.slingshots.map((slingshot) => ({ ...slingshot })),
  rollovers: board.rollovers.map((rollover) => ({ ...rollover })),
  guides: board.guides.map(cloneGuide),
  flippers: board.flippers.map((flipper) => ({ ...flipper })),
});

const cloneSurfaceMaterials = (
  materials: BoardDefinition['surfaceMaterials'],
): BoardDefinition['surfaceMaterials'] => ({
  playfieldWood: { ...materials.playfieldWood },
  metalGuide: { ...materials.metalGuide },
  rubberPost: { ...materials.rubberPost },
  flipperRubber: { ...materials.flipperRubber },
});
