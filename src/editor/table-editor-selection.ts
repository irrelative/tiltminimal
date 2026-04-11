import { getDistanceToFlipperSurface } from '../game/flipper-geometry';
import { getGuideDistance } from '../game/guide-geometry';
import {
  getLauncherGuideDistance,
  getPlungerGuideThickness,
} from '../game/plunger-geometry';
import type { BoardDefinition, Point } from '../types/board-definition';
import type { EditorSelection } from './editor-types';
import {
  distanceToOrientedSegment,
  SELECTION_PADDING,
} from './table-editor-shared';

export const hitTestSelection = (
  board: BoardDefinition,
  point: Point,
): EditorSelection => {
  const launchDistance = Math.hypot(
    point.x - board.launchPosition.x,
    point.y - board.launchPosition.y,
  );

  if (launchDistance <= 28) {
    return { kind: 'launch-position' };
  }

  const plungerDistance =
    distanceToOrientedSegment(
      point,
      board.plunger,
      board.plunger.length,
      Math.PI / 2,
    ) -
    board.plunger.thickness / 2;

  if (
    plungerDistance <= SELECTION_PADDING ||
    getLauncherGuideDistance(board, point) <=
      getPlungerGuideThickness(board.plunger) / 2 + SELECTION_PADDING
  ) {
    return { kind: 'launch-position' };
  }

  for (let index = board.saucers.length - 1; index >= 0; index -= 1) {
    const saucer = board.saucers[index];

    if (
      saucer &&
      Math.hypot(point.x - saucer.x, point.y - saucer.y) <=
        saucer.radius + SELECTION_PADDING
    ) {
      return { kind: 'saucer', index };
    }
  }

  for (let index = board.rollovers.length - 1; index >= 0; index -= 1) {
    const rollover = board.rollovers[index];

    if (
      rollover &&
      Math.hypot(point.x - rollover.x, point.y - rollover.y) <=
        rollover.radius + SELECTION_PADDING
    ) {
      return { kind: 'rollover', index };
    }
  }

  for (let index = board.posts.length - 1; index >= 0; index -= 1) {
    const post = board.posts[index];

    if (
      post &&
      Math.hypot(point.x - post.x, point.y - post.y) <=
        post.radius + SELECTION_PADDING
    ) {
      return { kind: 'post', index };
    }
  }

  for (let index = board.guides.length - 1; index >= 0; index -= 1) {
    const guide = board.guides[index];

    if (!guide) {
      continue;
    }

    if (
      getGuideDistance(point, guide) <=
      guide.thickness / 2 + SELECTION_PADDING
    ) {
      return { kind: 'guide', index };
    }
  }

  for (let index = board.bumpers.length - 1; index >= 0; index -= 1) {
    const bumper = board.bumpers[index];

    if (!bumper) {
      continue;
    }

    if (
      Math.hypot(point.x - bumper.x, point.y - bumper.y) <=
      bumper.radius + SELECTION_PADDING
    ) {
      return { kind: 'bumper', index };
    }
  }

  for (let index = board.standupTargets.length - 1; index >= 0; index -= 1) {
    const target = board.standupTargets[index];

    if (!target) {
      continue;
    }

    if (
      distanceToOrientedSegment(point, target, target.width, target.angle) <=
      target.height / 2 + SELECTION_PADDING
    ) {
      return { kind: 'standup-target', index };
    }
  }

  for (let index = board.dropTargets.length - 1; index >= 0; index -= 1) {
    const target = board.dropTargets[index];

    if (!target) {
      continue;
    }

    if (
      distanceToOrientedSegment(point, target, target.width, target.angle) <=
      target.height / 2 + SELECTION_PADDING
    ) {
      return { kind: 'drop-target', index };
    }
  }

  for (let index = board.spinners.length - 1; index >= 0; index -= 1) {
    const spinner = board.spinners[index];

    if (!spinner) {
      continue;
    }

    if (
      distanceToOrientedSegment(point, spinner, spinner.length, spinner.angle) <=
      spinner.thickness / 2 + SELECTION_PADDING
    ) {
      return { kind: 'spinner', index };
    }
  }

  for (let index = board.slingshots.length - 1; index >= 0; index -= 1) {
    const slingshot = board.slingshots[index];

    if (!slingshot) {
      continue;
    }

    if (
      distanceToOrientedSegment(
        point,
        slingshot,
        slingshot.width,
        slingshot.angle,
      ) <=
      slingshot.height / 2 + SELECTION_PADDING
    ) {
      return { kind: 'slingshot', index };
    }
  }

  for (let index = board.flippers.length - 1; index >= 0; index -= 1) {
    const flipper = board.flippers[index];

    if (!flipper) {
      continue;
    }

    if (getDistanceToFlipperSurface(point, flipper) <= SELECTION_PADDING) {
      return { kind: 'flipper', index };
    }
  }

  return { kind: 'none' };
};
