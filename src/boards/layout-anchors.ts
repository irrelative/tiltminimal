import type { Point } from '../types/board-definition';
import type {
  BoardLayoutDefinition,
  LayoutAnchorDefinition,
  LayoutPoint,
  ResolvedLayoutContext,
} from './layout-schema';
import { getTemplateAnchors } from './layout-templates';

export const resolveLayoutContext = (
  layout: BoardLayoutDefinition,
): ResolvedLayoutContext => {
  const anchorDefinitions = [
    ...getTemplateAnchors(layout.template),
    ...(layout.anchors ?? []),
  ];
  const definitionsById = new Map<string, LayoutAnchorDefinition>();

  for (const anchor of anchorDefinitions) {
    definitionsById.set(anchor.id, anchor);
  }

  const cache = new Map<string, Point>();
  const anchors: Record<string, Point> = {};

  for (const anchor of anchorDefinitions) {
    anchors[anchor.id] = resolveAnchorPoint(
      anchor.id,
      definitionsById,
      cache,
      layout.width,
      layout.height,
      new Set<string>(),
    );
  }

  return {
    width: layout.width,
    height: layout.height,
    anchors,
  };
};

export const resolveLayoutPoint = (
  point: LayoutPoint,
  context: ResolvedLayoutContext,
): Point => {
  if ('anchor' in point && point.kind === 'anchor') {
    const anchorPoint = context.anchors[point.anchor];

    if (!anchorPoint) {
      throw new Error(`Unknown layout anchor "${point.anchor}".`);
    }

    return {
      x: anchorPoint.x + (point.offset?.x ?? 0),
      y: anchorPoint.y + (point.offset?.y ?? 0),
    };
  }

  if ('kind' in point && point.kind === 'percent') {
    return {
      x: context.width * point.x + (point.offset?.x ?? 0),
      y: context.height * point.y + (point.offset?.y ?? 0),
    };
  }

  return {
    x: point.x,
    y: point.y,
  };
};

const resolveAnchorPoint = (
  id: string,
  definitionsById: Map<string, LayoutAnchorDefinition>,
  cache: Map<string, Point>,
  width: number,
  height: number,
  stack: Set<string>,
): Point => {
  const cached = cache.get(id);

  if (cached) {
    return cached;
  }

  const definition = definitionsById.get(id);

  if (!definition) {
    throw new Error(`Missing layout anchor "${id}".`);
  }

  if (stack.has(id)) {
    throw new Error(`Layout anchors contain a cycle at "${id}".`);
  }

  stack.add(id);
  const point = resolveLayoutPointWithDefinitions(
    definition.point,
    definitionsById,
    cache,
    width,
    height,
    stack,
  );
  stack.delete(id);
  cache.set(id, point);
  return point;
};

const resolveLayoutPointWithDefinitions = (
  point: LayoutPoint,
  definitionsById: Map<string, LayoutAnchorDefinition>,
  cache: Map<string, Point>,
  width: number,
  height: number,
  stack: Set<string>,
): Point => {
  if ('anchor' in point && point.kind === 'anchor') {
    const anchorPoint = resolveAnchorPoint(
      point.anchor,
      definitionsById,
      cache,
      width,
      height,
      stack,
    );

    return {
      x: anchorPoint.x + (point.offset?.x ?? 0),
      y: anchorPoint.y + (point.offset?.y ?? 0),
    };
  }

  if ('kind' in point && point.kind === 'percent') {
    return {
      x: width * point.x + (point.offset?.x ?? 0),
      y: height * point.y + (point.offset?.y ?? 0),
    };
  }

  return {
    x: point.x,
    y: point.y,
  };
};
