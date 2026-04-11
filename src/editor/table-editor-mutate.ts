import { isArcGuide } from '../game/guide-geometry';
import type {
  BoardDefinition,
  GuidePlane,
  Point,
} from '../types/board-definition';
import type { EditorSelection } from './editor-types';
import { moveGuideHandle, rotateSelection } from './table-editor-handles';
import {
  clamp,
  clampLauncherPosition,
  clampPoint,
  getFlipperSelectionPadding,
  getOrientedSelectionPadding,
} from './table-editor-shared';

export const moveSelection = (
  board: BoardDefinition,
  selection: EditorSelection,
  point: Point,
): BoardDefinition => {
  if (selection.kind === 'launch-position') {
    const nextLaunchPosition = clampLauncherPosition(board, point);
    const deltaX = nextLaunchPosition.x - board.launchPosition.x;
    const deltaY = nextLaunchPosition.y - board.launchPosition.y;

    return {
      ...board,
      launchPosition: nextLaunchPosition,
      plunger: {
        ...board.plunger,
        x: board.plunger.x + deltaX,
        y: clamp(
          board.plunger.y + deltaY,
          board.plunger.length / 2,
          board.height - board.plunger.length / 2,
        ),
      },
    };
  }

  if (selection.kind === 'bumper' && selection.index !== undefined) {
    return {
      ...board,
      bumpers: board.bumpers.map((bumper, index) =>
        index === selection.index
          ? { ...bumper, ...clampPoint(board, point, bumper.radius) }
          : bumper,
      ),
    };
  }

  if (selection.kind === 'post' && selection.index !== undefined) {
    return {
      ...board,
      posts: board.posts.map((post, index) =>
        index === selection.index
          ? { ...post, ...clampPoint(board, point, post.radius) }
          : post,
      ),
    };
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    return {
      ...board,
      standupTargets: board.standupTargets.map((target, index) =>
        index === selection.index
          ? {
              ...target,
              ...clampPoint(
                board,
                point,
                getOrientedSelectionPadding(target.width, target.height),
              ),
            }
          : target,
      ),
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    return {
      ...board,
      dropTargets: board.dropTargets.map((target, index) =>
        index === selection.index
          ? {
              ...target,
              ...clampPoint(
                board,
                point,
                getOrientedSelectionPadding(target.width, target.height),
              ),
            }
          : target,
      ),
    };
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    return {
      ...board,
      saucers: board.saucers.map((saucer, index) =>
        index === selection.index
          ? { ...saucer, ...clampPoint(board, point, saucer.radius) }
          : saucer,
      ),
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    return {
      ...board,
      spinners: board.spinners.map((spinner, index) =>
        index === selection.index
          ? {
              ...spinner,
              ...clampPoint(
                board,
                point,
                getOrientedSelectionPadding(
                  spinner.length,
                  spinner.thickness,
                ),
              ),
            }
          : spinner,
      ),
    };
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    return {
      ...board,
      slingshots: board.slingshots.map((slingshot, index) =>
        index === selection.index
          ? {
              ...slingshot,
              ...clampPoint(
                board,
                point,
                getOrientedSelectionPadding(
                  slingshot.width,
                  slingshot.height,
                ),
              ),
            }
          : slingshot,
      ),
    };
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    return {
      ...board,
      rollovers: board.rollovers.map((rollover, index) =>
        index === selection.index
          ? { ...rollover, ...clampPoint(board, point, rollover.radius) }
          : rollover,
      ),
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    const guide = board.guides[selection.index];

    if (!guide) {
      return board;
    }

    if (isArcGuide(guide)) {
      return {
        ...board,
        guides: board.guides.map((candidate, index) =>
          index === selection.index
            ? {
                ...candidate,
                center: clampPoint(
                  board,
                  point,
                  guide.radius + guide.thickness / 2,
                ),
              }
            : candidate,
        ),
      };
    }

    const deltaX = point.x - guide.start.x;
    const deltaY = point.y - guide.start.y;
    const clampedStart = clampPoint(board, point, guide.thickness / 2);
    const clampedEnd = clampPoint(
      board,
      { x: guide.end.x + deltaX, y: guide.end.y + deltaY },
      guide.thickness / 2,
    );

    return {
      ...board,
      guides: board.guides.map((candidate, index) =>
        index === selection.index
          ? {
              ...candidate,
              start: clampedStart,
              end: clampedEnd,
            }
          : candidate,
      ),
    };
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    const flipper = board.flippers[selection.index];

    if (!flipper) {
      return board;
    }

    return {
      ...board,
      flippers: board.flippers.map((candidate, index) =>
        index === selection.index
          ? {
              ...candidate,
              ...clampPoint(
                board,
                point,
                getFlipperSelectionPadding(candidate.length, candidate.thickness),
              ),
            }
          : candidate,
      ),
    };
  }

  return board;
};

export const deleteSelection = (
  board: BoardDefinition,
  selection: EditorSelection,
): {
  board: BoardDefinition;
  selection: EditorSelection;
} => {
  if (selection.kind === 'bumper' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        bumpers: board.bumpers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'post' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        posts: board.posts.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        standupTargets: board.standupTargets.filter(
          (_, index) => index !== selection.index,
        ),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        dropTargets: board.dropTargets.filter(
          (_, index) => index !== selection.index,
        ),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        saucers: board.saucers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        spinners: board.spinners.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        slingshots: board.slingshots.filter(
          (_, index) => index !== selection.index,
        ),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        rollovers: board.rollovers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        guides: board.guides.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    return {
      board: {
        ...board,
        flippers: board.flippers.filter((_, index) => index !== selection.index),
      },
      selection: { kind: 'none' },
    };
  }

  return {
    board,
    selection,
  };
};

export const updateSelectedNumericField = (
  board: BoardDefinition,
  selection: EditorSelection,
  field: string,
  value: number,
): BoardDefinition => {
  if (selection.kind === 'launch-position') {
    if (field === 'x' || field === 'y') {
      return moveSelection(board, selection, {
        x: field === 'x' ? value : board.launchPosition.x,
        y: field === 'y' ? value : board.launchPosition.y,
      });
    }

    if (
      field === 'length' ||
      field === 'thickness' ||
      field === 'travel' ||
      field === 'guideLength'
    ) {
      return {
        ...board,
        plunger: {
          ...board.plunger,
          [field]: value,
        },
      };
    }
  }

  if (selection.kind === 'bumper' && selection.index !== undefined) {
    return {
      ...board,
      bumpers: board.bumpers.map((bumper, index) =>
        index === selection.index
          ? {
              ...bumper,
              [field]: value,
            }
          : bumper,
      ),
    };
  }

  if (selection.kind === 'post' && selection.index !== undefined) {
    return {
      ...board,
      posts: board.posts.map((post, index) =>
        index === selection.index ? { ...post, [field]: value } : post,
      ),
    };
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    return {
      ...board,
      standupTargets: board.standupTargets.map((target, index) =>
        index === selection.index ? { ...target, [field]: value } : target,
      ),
    };
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    return {
      ...board,
      dropTargets: board.dropTargets.map((target, index) =>
        index === selection.index ? { ...target, [field]: value } : target,
      ),
    };
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    return {
      ...board,
      saucers: board.saucers.map((saucer, index) =>
        index === selection.index ? { ...saucer, [field]: value } : saucer,
      ),
    };
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    return {
      ...board,
      spinners: board.spinners.map((spinner, index) =>
        index === selection.index ? { ...spinner, [field]: value } : spinner,
      ),
    };
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    return {
      ...board,
      slingshots: board.slingshots.map((slingshot, index) =>
        index === selection.index ? { ...slingshot, [field]: value } : slingshot,
      ),
    };
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    return {
      ...board,
      rollovers: board.rollovers.map((rollover, index) =>
        index === selection.index ? { ...rollover, [field]: value } : rollover,
      ),
    };
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    return {
      ...board,
      guides: board.guides.map((guide, index) =>
        index === selection.index
          ? isArcGuide(guide)
            ? {
                ...guide,
                ...(field === 'centerX'
                  ? { center: { ...guide.center, x: value } }
                  : field === 'centerY'
                    ? { center: { ...guide.center, y: value } }
                    : { [field]: value }),
              }
            : {
                ...guide,
                ...(field === 'startX'
                  ? { start: { ...guide.start, x: value } }
                  : field === 'startY'
                    ? { start: { ...guide.start, y: value } }
                    : field === 'endX'
                      ? { end: { ...guide.end, x: value } }
                      : field === 'endY'
                        ? { end: { ...guide.end, y: value } }
                        : { [field]: value }),
              }
          : guide,
      ),
    };
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    return {
      ...board,
      flippers: board.flippers.map((flipper, index) =>
        index === selection.index
          ? {
              ...flipper,
              [field]: value,
            }
          : flipper,
      ),
    };
  }

  return board;
};

export const updateSelectedGuidePlane = (
  board: BoardDefinition,
  selection: EditorSelection,
  plane: GuidePlane,
): BoardDefinition => {
  if (selection.kind !== 'guide' || selection.index === undefined) {
    return board;
  }

  return {
    ...board,
    guides: board.guides.map((guide, index) =>
      index === selection.index ? { ...guide, plane } : guide,
    ),
  };
};

export { moveGuideHandle, rotateSelection };
