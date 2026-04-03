import { cloneGuide, normalizeGuide } from '../game/guide-geometry';
import { createBoardDefinition } from '../game/physics-defaults';
import type {
  BoardDefinition,
  LegacyLaunchPhysicsDefinition,
  SurfaceMaterial,
  SurfaceMaterialName,
} from '../types/board-definition';

type LegacyBoardDefinition = Omit<
  Partial<BoardDefinition>,
  'flippers' | 'surfaceMaterials' | 'physics' | 'guides'
> & {
  guides?: BoardDefinition['guides'];
  standupTargets?: BoardDefinition['standupTargets'];
  dropTargets?: BoardDefinition['dropTargets'];
  saucers?: BoardDefinition['saucers'];
  spinners?: BoardDefinition['spinners'];
  slingshots?: BoardDefinition['slingshots'];
  rollovers?: BoardDefinition['rollovers'];
  surfaceMaterials?: Partial<
    Record<SurfaceMaterialName, Partial<SurfaceMaterial>>
  >;
  physics?: {
    launch?: Partial<LegacyLaunchPhysicsDefinition>;
    plunger?: Partial<BoardDefinition['physics']['plunger']>;
    flipper?: Partial<BoardDefinition['physics']['flipper']>;
    solver?: Partial<BoardDefinition['physics']['solver']>;
    nudge?: Partial<BoardDefinition['physics']['nudge']>;
  };
  flippers:
    | BoardDefinition['flippers']
    | {
        left: Omit<BoardDefinition['flippers'][number], 'side'>;
        right: Omit<BoardDefinition['flippers'][number], 'side'>;
      };
};

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
    themeId: source.themeId,
    width: source.width ?? 900,
    height: source.height ?? 1400,
    rulesScript: source.rulesScript,
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
    plunger: source.plunger,
    materials:
      source.materials ??
      ({
        playfield: 'playfieldWood',
        walls: 'metalGuide',
      } satisfies BoardDefinition['materials']),
    surfaceMaterials: source.surfaceMaterials,
    physics: {
      launch: source.physics?.launch,
      plunger: source.physics?.plunger,
      flipper: source.physics?.flipper,
      solver: source.physics?.solver,
      nudge: source.physics?.nudge,
    },
    posts: source.posts ?? [],
    bumpers: source.bumpers ?? [],
    standupTargets: source.standupTargets ?? [],
    dropTargets: source.dropTargets ?? [],
    saucers: source.saucers ?? [],
    spinners: source.spinners ?? [],
    slingshots: source.slingshots ?? [],
    rollovers: source.rollovers ?? [],
    guides: (source.guides ?? []).map(normalizeGuide),
    flippers: flippers.map((flipper) => ({
      ...flipper,
      side: flipper.side === 'right' ? 'right' : 'left',
    })),
  });
};

const cloneSurfaceMaterials = (
  materials: BoardDefinition['surfaceMaterials'],
): BoardDefinition['surfaceMaterials'] => ({
  playfieldWood: { ...materials.playfieldWood },
  metalGuide: { ...materials.metalGuide },
  rubberPost: { ...materials.rubberPost },
  flipperRubber: { ...materials.flipperRubber },
});
