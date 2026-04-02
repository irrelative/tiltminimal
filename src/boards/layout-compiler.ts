import { createBoardDefinition } from '../game/physics-defaults';
import type {
  ArcGuideDefinition,
  BoardDefinition,
  BoardDefinitionInput,
  GuideDefinition,
  Point,
} from '../types/board-definition';
import { snapBoardLayoutToGrid } from './snap-board-layout';
import { resolveLayoutContext, resolveLayoutPoint } from './layout-anchors';
import type {
  BoardLayoutDefinition,
  GuideLayoutDefinition,
  LayoutCompileOptions,
  LayoutPoint,
  ResolvedLayoutContext,
} from './layout-schema';
import {
  validateCompiledBoardLayout,
  type LayoutDiagnostic,
} from './layout-validation';

export interface LayoutCompileResult {
  board: BoardDefinition;
  input: BoardDefinitionInput;
  context: ResolvedLayoutContext;
  diagnostics: LayoutDiagnostic[];
}

export const compileBoardLayout = (
  layout: BoardLayoutDefinition,
  options: LayoutCompileOptions = {},
): LayoutCompileResult => {
  const context = resolveLayoutContext(layout);
  const input: BoardDefinitionInput = {
    name: layout.name,
    themeId: layout.themeId,
    width: layout.width,
    height: layout.height,
    rulesScript: layout.rulesScript,
    gravity: layout.gravity,
    tableAngle: layout.tableAngle,
    drainY: layout.drainY,
    ball: layout.ball,
    launchPosition: resolveLayoutPoint(layout.launchPosition, context),
    plunger: layout.plunger,
    materials: layout.materials,
    surfaceMaterials: layout.surfaceMaterials,
    physics: layout.physics,
    posts: (layout.posts ?? []).map((post) => ({
      ...resolvePositionedElement(post, context),
      radius: post.radius,
      material: post.material,
    })),
    bumpers: (layout.bumpers ?? []).map((bumper) => ({
      ...resolvePositionedElement(bumper, context),
      radius: bumper.radius,
      score: bumper.score,
      material: bumper.material,
    })),
    standupTargets: (layout.standupTargets ?? []).map((target) => ({
      ...resolvePositionedElement(target, context),
      width: target.width,
      height: target.height,
      angle: target.angle,
      score: target.score,
      material: target.material,
    })),
    dropTargets: (layout.dropTargets ?? []).map((target) => ({
      ...resolvePositionedElement(target, context),
      width: target.width,
      height: target.height,
      angle: target.angle,
      score: target.score,
      material: target.material,
    })),
    saucers: (layout.saucers ?? []).map((saucer) => ({
      ...resolvePositionedElement(saucer, context),
      radius: saucer.radius,
      score: saucer.score,
      holdSeconds: saucer.holdSeconds,
      ejectSpeed: saucer.ejectSpeed,
      ejectAngle: saucer.ejectAngle,
      material: saucer.material,
    })),
    spinners: (layout.spinners ?? []).map((spinner) => ({
      ...resolvePositionedElement(spinner, context),
      length: spinner.length,
      thickness: spinner.thickness,
      angle: spinner.angle,
      score: spinner.score,
      material: spinner.material,
    })),
    rollovers: (layout.rollovers ?? []).map((rollover) => ({
      ...resolvePositionedElement(rollover, context),
      radius: rollover.radius,
      score: rollover.score,
    })),
    guides: (layout.guides ?? []).map((guide) =>
      resolveGuideDefinition(guide, context),
    ),
    flippers: layout.flippers.map((flipper) => ({
      ...resolvePositionedElement(flipper, context),
      side: flipper.side,
      length: flipper.length,
      thickness: flipper.thickness,
      restingAngle: flipper.restingAngle,
      activeAngle: flipper.activeAngle,
      material: flipper.material,
    })),
  };

  const compiledBoard = createBoardDefinition(input);
  const board =
    options.snapToGrid === false
      ? compiledBoard
      : snapBoardLayoutToGrid(compiledBoard);
  const diagnostics = validateCompiledBoardLayout(board);

  return {
    board,
    input,
    context,
    diagnostics,
  };
};

export const compileBuiltInBoardLayout = (
  layout: BoardLayoutDefinition,
  options: LayoutCompileOptions = {},
): BoardDefinition => {
  const result = compileBoardLayout(layout, options);
  const errors = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

  if (errors.length > 0) {
    throw new Error(
      `Board layout "${layout.name}" failed validation: ${errors
        .map((error) => error.message)
        .join('; ')}`,
    );
  }

  return result.board;
};

const resolvePositionedElement = (
  element: { position: LayoutPoint },
  context: ResolvedLayoutContext,
): Point => resolveLayoutPoint(element.position, context);

const resolveGuideDefinition = (
  guide: GuideLayoutDefinition,
  context: ResolvedLayoutContext,
): GuideDefinition => {
  if (guide.kind === 'arc') {
    const center = resolveLayoutPoint(guide.center, context);
    const arcGuide: ArcGuideDefinition = {
      kind: 'arc',
      center,
      radius: guide.radius,
      startAngle: guide.startAngle,
      endAngle: guide.endAngle,
      thickness: guide.thickness,
      material: guide.material,
      plane: guide.plane,
    };

    return arcGuide;
  }

  return {
    kind: 'line',
    start: resolveLayoutPoint(guide.start, context),
    end: resolveLayoutPoint(guide.end, context),
    thickness: guide.thickness,
    material: guide.material,
    plane: guide.plane,
  };
};
