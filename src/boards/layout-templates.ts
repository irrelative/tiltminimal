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
        id: 'top-arch-center',
        point: { kind: 'percent', x: 0.5, y: 0.1257142857 },
      },
      {
        id: 'top-arch-left-shoulder',
        point: { kind: 'percent', x: 0.22, y: 0.1871428571 },
      },
      {
        id: 'top-arch-right-shoulder',
        point: { kind: 'percent', x: 0.78, y: 0.1871428571 },
      },
      {
        id: 'pop-cluster-top',
        point: { kind: 'percent', x: 0.5, y: 0.23 },
      },
      {
        id: 'left-target-bank-center',
        point: { kind: 'percent', x: 0.22, y: 0.5428571429 },
      },
      {
        id: 'right-target-bank-center',
        point: { kind: 'percent', x: 0.78, y: 0.5428571429 },
      },
      {
        id: 'target-bank-center',
        point: { kind: 'percent', x: 0.5, y: 0.5428571429 },
      },
      {
        id: 'center-shot',
        point: { kind: 'percent', x: 0.5, y: 0.5857142857 },
      },
      {
        id: 'left-orbit-entry',
        point: { kind: 'percent', x: 0.145, y: 0.64 },
      },
      {
        id: 'right-orbit-entry',
        point: { kind: 'percent', x: 0.855, y: 0.64 },
      },
      {
        id: 'left-inlane-mouth',
        point: { kind: 'percent', x: 0.25, y: 0.6557142857 },
      },
      {
        id: 'right-inlane-mouth',
        point: { kind: 'percent', x: 0.75, y: 0.6557142857 },
      },
      {
        id: 'left-outlane-mouth',
        point: { kind: 'percent', x: 0.1333333333, y: 0.5828571429 },
      },
      {
        id: 'right-outlane-mouth',
        point: { kind: 'percent', x: 0.8666666667, y: 0.5828571429 },
      },
      {
        id: 'left-slingshot-center',
        point: { kind: 'percent', x: 0.32, y: 0.7728571429 },
      },
      {
        id: 'right-slingshot-center',
        point: { kind: 'percent', x: 0.68, y: 0.7728571429 },
      },
      {
        id: 'shooter-lane-center',
        point: { kind: 'percent', x: 0.8555555556, y: 0.8428571429 },
      },
      {
        id: 'drain-center',
        point: { kind: 'percent', x: 0.5, y: 1 },
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
