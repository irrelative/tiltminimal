import {
  createDefaultCurvedGuide,
  createDefaultGuide,
  createDefaultDropTarget,
  createDefaultFlipper,
  createDefaultPost,
  createDefaultRollover,
  createDefaultSaucer,
  createDefaultSlingshot,
  createDefaultSpinner,
  createDefaultStandupTarget,
} from '../boards/table-library';
import { resolveLayoutPoint } from '../boards/layout-anchors';
import {
  absolutePoint,
  createStandardLowerPlayfieldPair,
} from '../boards/layout-primitives';
import type {
  BoardDefinition,
  FlipperSide,
  GuideDefinition,
  Point,
} from '../types/board-definition';
import type { EditorSelection } from './editor-types';

interface AddResult {
  board: BoardDefinition;
  selection: EditorSelection;
}

export const addBumper = (board: BoardDefinition, point: Point): AddResult => {
  const nextBumper = {
    x: point.x,
    y: point.y,
    radius: 44,
    score: 100,
    material: 'rubberPost' as const,
  };
  const nextBoard = {
    ...board,
    bumpers: [...board.bumpers, nextBumper],
  };

  return {
    board: nextBoard,
    selection: { kind: 'bumper', index: nextBoard.bumpers.length - 1 },
  };
};

export const addPost = (board: BoardDefinition, point: Point): AddResult => {
  const nextPost = createDefaultPost(point.x, point.y);
  const nextBoard = {
    ...board,
    posts: [...board.posts, nextPost],
  };

  return {
    board: nextBoard,
    selection: { kind: 'post', index: nextBoard.posts.length - 1 },
  };
};

export const addGuide = (board: BoardDefinition, point: Point): AddResult => {
  const nextGuide = createDefaultGuide(point.x, point.y);
  const nextBoard = {
    ...board,
    guides: [...board.guides, nextGuide],
  };

  return {
    board: nextBoard,
    selection: { kind: 'guide', index: nextBoard.guides.length - 1 },
  };
};

export const addCurvedGuide = (
  board: BoardDefinition,
  point: Point,
): AddResult => {
  const nextGuide = createDefaultCurvedGuide(point.x, point.y);
  const nextBoard = {
    ...board,
    guides: [...board.guides, nextGuide],
  };

  return {
    board: nextBoard,
    selection: { kind: 'guide', index: nextBoard.guides.length - 1 },
  };
};

export const addStandupTarget = (
  board: BoardDefinition,
  point: Point,
): AddResult => {
  const nextTarget = createDefaultStandupTarget(point.x, point.y);
  const nextBoard = {
    ...board,
    standupTargets: [...board.standupTargets, nextTarget],
  };

  return {
    board: nextBoard,
    selection: {
      kind: 'standup-target',
      index: nextBoard.standupTargets.length - 1,
    },
  };
};

export const addDropTarget = (
  board: BoardDefinition,
  point: Point,
): AddResult => {
  const nextTarget = createDefaultDropTarget(point.x, point.y);
  const nextBoard = {
    ...board,
    dropTargets: [...board.dropTargets, nextTarget],
  };

  return {
    board: nextBoard,
    selection: {
      kind: 'drop-target',
      index: nextBoard.dropTargets.length - 1,
    },
  };
};

export const addSaucer = (board: BoardDefinition, point: Point): AddResult => {
  const nextSaucer = createDefaultSaucer(point.x, point.y);
  const nextBoard = {
    ...board,
    saucers: [...board.saucers, nextSaucer],
  };

  return {
    board: nextBoard,
    selection: { kind: 'saucer', index: nextBoard.saucers.length - 1 },
  };
};

export const addSpinner = (board: BoardDefinition, point: Point): AddResult => {
  const nextSpinner = createDefaultSpinner(point.x, point.y);
  const nextBoard = {
    ...board,
    spinners: [...board.spinners, nextSpinner],
  };

  return {
    board: nextBoard,
    selection: { kind: 'spinner', index: nextBoard.spinners.length - 1 },
  };
};

export const addSlingshot = (
  board: BoardDefinition,
  point: Point,
): AddResult => {
  const nextSlingshot = createDefaultSlingshot(point.x, point.y);
  const nextBoard = {
    ...board,
    slingshots: [...board.slingshots, nextSlingshot],
  };

  return {
    board: nextBoard,
    selection: { kind: 'slingshot', index: nextBoard.slingshots.length - 1 },
  };
};

export const addRollover = (
  board: BoardDefinition,
  point: Point,
): AddResult => {
  const nextRollover = createDefaultRollover(point.x, point.y);
  const nextBoard = {
    ...board,
    rollovers: [...board.rollovers, nextRollover],
  };

  return {
    board: nextBoard,
    selection: { kind: 'rollover', index: nextBoard.rollovers.length - 1 },
  };
};

export const addFlipper = (
  board: BoardDefinition,
  side: FlipperSide,
  point: Point,
): AddResult => {
  const nextFlipper = createDefaultFlipper(side, point.x, point.y);
  const nextBoard = {
    ...board,
    flippers: [...board.flippers, nextFlipper],
  };

  return {
    board: nextBoard,
    selection: { kind: 'flipper', index: nextBoard.flippers.length - 1 },
  };
};

export const addLowerPlayfield = (
  board: BoardDefinition,
  point: Point,
): AddResult => {
  const center = {
    x: clamp(point.x, 220, board.width - 220),
    y: clamp(point.y, 760, board.height - 100),
  };
  const leftPivot = { x: center.x - 180, y: center.y };
  const rightPivot = { x: center.x + 180, y: center.y };
  const fragment = createStandardLowerPlayfieldPair({
    leftFlipperPivot: absolutePoint(leftPivot.x, leftPivot.y),
    rightFlipperPivot: absolutePoint(rightPivot.x, rightPivot.y),
    flippers: {
      leftX: leftPivot.x,
      rightX: rightPivot.x,
      y: center.y,
      length: 150,
      thickness: 20,
      restingAngleOffset: 0.28,
      activeAngleOffset: -0.42,
      material: 'flipperRubber',
    },
  });
  const context = {
    width: board.width,
    height: board.height,
    anchors: {},
  };
  const firstSlingshotIndex = board.slingshots.length;
  const nextBoard = {
    ...board,
    posts: [
      ...board.posts,
      ...fragment.posts.map((post) => ({
        ...resolveLayoutPoint(post.position, context),
        radius: post.radius,
        material: post.material,
      })),
    ],
    guides: [
      ...board.guides,
      ...fragment.guides.map((guide): GuideDefinition => {
        if (guide.kind === 'arc') {
          return {
            kind: 'arc',
            center: resolveLayoutPoint(guide.center, context),
            radius: guide.radius,
            startAngle: guide.startAngle,
            endAngle: guide.endAngle,
            thickness: guide.thickness,
            material: guide.material,
            plane: guide.plane,
          };
        }

        return {
          kind: 'line',
          start: resolveLayoutPoint(guide.start, context),
          end: resolveLayoutPoint(guide.end, context),
          thickness: guide.thickness,
          material: guide.material,
          plane: guide.plane,
        };
      }),
    ],
    slingshots: [
      ...board.slingshots,
      ...fragment.slingshots.map((slingshot) => ({
        ...resolveLayoutPoint(slingshot.position, context),
        width: slingshot.width,
        height: slingshot.height,
        angle: slingshot.angle,
        score: slingshot.score,
        strength: slingshot.strength,
        material: slingshot.material,
      })),
    ],
    flippers: [
      ...board.flippers,
      ...fragment.flippers.map((flipper) => ({
        side: flipper.side,
        ...resolveLayoutPoint(flipper.position, context),
        length: flipper.length,
        thickness: flipper.thickness,
        restingAngle: flipper.restingAngle,
        activeAngle: flipper.activeAngle,
        material: flipper.material,
      })),
    ],
  };

  return {
    board: nextBoard,
    selection: { kind: 'slingshot', index: firstSlingshotIndex },
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
