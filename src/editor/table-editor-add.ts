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
import type { BoardDefinition, FlipperSide, Point } from '../types/board-definition';
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
