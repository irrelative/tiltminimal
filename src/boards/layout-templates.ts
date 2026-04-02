import type { LayoutAnchorDefinition, LayoutTemplateId } from './layout-schema';

export const getTemplateAnchors = (
  template: LayoutTemplateId | undefined,
): LayoutAnchorDefinition[] => {
  const shared = createSharedAnchors();

  if (template === 'solid-state-two-flipper') {
    return [
      ...shared,
      {
        id: 'left-flipper-pivot',
        point: { kind: 'percent', x: 0.3, y: 0.8714285714 },
      },
      {
        id: 'right-flipper-pivot',
        point: { kind: 'percent', x: 0.7, y: 0.8714285714 },
      },
      {
        id: 'upper-playfield-center',
        point: { kind: 'percent', x: 0.5, y: 0.3 },
      },
      {
        id: 'shooter-lane-center',
        point: { kind: 'percent', x: 0.8555555556, y: 0.8428571429 },
      },
    ];
  }

  return shared;
};

const createSharedAnchors = (): LayoutAnchorDefinition[] => [
  { id: 'top-left', point: { x: 0, y: 0 } },
  { id: 'top-center', point: { kind: 'percent', x: 0.5, y: 0 } },
  { id: 'top-right', point: { kind: 'percent', x: 1, y: 0 } },
  { id: 'center-left', point: { kind: 'percent', x: 0, y: 0.5 } },
  { id: 'playfield-center', point: { kind: 'percent', x: 0.5, y: 0.5 } },
  { id: 'center-right', point: { kind: 'percent', x: 1, y: 0.5 } },
  { id: 'bottom-left', point: { kind: 'percent', x: 0, y: 1 } },
  { id: 'bottom-center', point: { kind: 'percent', x: 0.5, y: 1 } },
  { id: 'bottom-right', point: { kind: 'percent', x: 1, y: 1 } },
];
